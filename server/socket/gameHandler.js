const logger = require('../utils/logger');
const monitoring = require('../services/monitoringService');
const { SOCKET_EVENT_RATE_LIMIT, SOCKET_EVENT_RATE_WINDOW, MAX_SOCKET_PAYLOAD_BYTES } = require('../config/constants');
const db = require('../services/dbService');
const { onlinePlayers } = require('./onlineStore');
const HEARTBEAT_TIMEOUT = 45 * 1000; // 45s yanıt gelmezse çevrimdışı say

// ── Stale presence temizleyici — her 30 saniyede çalışır ─────────────────────
let _io = null; // initSocket sonrası set edilecek
setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const [sid, player] of onlinePlayers) {
    const last = player.lastHeartbeat || player.joinedAt || 0;
    if (now - last > HEARTBEAT_TIMEOUT) {
      onlinePlayers.delete(sid);
      changed = true;
      logger.debug(`[Presence] Stale oyuncu temizlendi: ${player.username}`);
    }
  }
  if (changed && _io) {
    const list = Array.from(onlinePlayers.values());
    _io.emit('onlinePlayers', list);
    _io.emit('onlineCount', list.length);
  }
}, 30 * 1000);

// ── Rate limiter ──────────────────────────────────────────────────────────────
const socketEventRates = new Map();
function checkEventRate(socketId) {
  const now = Date.now();
  const r = socketEventRates.get(socketId) || { count: 0, windowStart: now };
  if (now - r.windowStart > SOCKET_EVENT_RATE_WINDOW) { r.count = 1; r.windowStart = now; }
  else r.count++;
  socketEventRates.set(socketId, r);
  return r.count <= SOCKET_EVENT_RATE_LIMIT;
}

function isPayloadSafe(data) {
  try { return Buffer.byteLength(JSON.stringify(data), 'utf8') <= MAX_SOCKET_PAYLOAD_BYTES; }
  catch { return false; }
}

// ── stateUpdate key whitelist ─────────────────────────────────────────────────
const ALLOWED_STATE_KEYS = new Set(['key','value','userId','timestamp','type','city','position','level','xp','hp','party','gang','job','action']);
const NUMERIC_STATE_BOUNDS = {
  level: { min: 1,   max: 999  },
  xp:    { min: 0,   max: 1e12 },
  hp:    { min: 0,   max: 100  },
};
function sanitizeStateUpdate(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  if (!data.key || typeof data.key !== 'string' || data.key.length > 64) return null;
  const safe = {};
  for (const k of ALLOWED_STATE_KEYS) {
    if (data[k] === undefined) continue;
    if (k in NUMERIC_STATE_BOUNDS) {
      const n = Number(data[k]);
      if (isNaN(n)) continue;
      const { min, max } = NUMERIC_STATE_BOUNDS[k];
      safe[k] = Math.max(min, Math.min(max, n));
    } else {
      safe[k] = data[k];
    }
  }
  return safe;
}

// ── Server-side party influence cooldown (userId → lastTs) ───────────────────
const _partyCdMap = new Map(); // key: `${userId}_${partyId}` → timestamp
const PARTY_INFLUENCE_CD_MS = 60 * 1000; // 60 saniye

// ── Initial state push (on connect) ──────────────────────────────────────────
async function pushInitialState(socket) {
  try {
    const state = await db.getFullGameState();
    const onlineList = Array.from(onlinePlayers.values());
    const lobiler = db.isReady()
      ? (await db.getGameState('lobiler').catch(() => null)) || []
      : [];
    const payload = {
      gangs:            state.gangs           || [],
      parties:          state.parties         || [],
      alliances:        state.alliances       || [],
      elections:        state.elections       || { phase:'idle', candidates:[], votes:{} },
      elections_multi:  state.elections_multi || {},
      laws:             state.laws            || [],
      announcements:    state.announcements   || [],
      cabinet:          state.cabinet         || {},
      gangTerritories:  state.gangTerritories || {},
      lobiAnlasmalari:  lobiler,
      onlinePlayers:    onlineList,
      onlineCount:      onlineList.length,
    };
    socket.emit('gameStateInit', payload);
  } catch (err) {
    logger.warn('[GameHandler] pushInitialState:', err.message);
  }
}

// ── Notification helper ───────────────────────────────────────────────────────
function sendNotification(io, targetUserId, notif) {
  const target = Array.from(onlinePlayers.values()).find(p => p.userId === targetUserId);
  const payload = { ...notif, ts: Date.now() };
  if (target) {
    io.to(target.socketId).emit('notification', payload);
  }
  // Persist (best-effort)
  if (db.isReady()) {
    db.saveNotification({ ...payload, userId: targetUserId }).catch(() => {});
  }
}

function broadcastNotification(io, notif) {
  const payload = { ...notif, ts: Date.now() };
  io.emit('notification', payload);
  if (db.isReady()) {
    db.saveNotification(payload).catch(() => {});
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
function registerGameHandlers(io, socket) {
  _io = io; // stale cleaner için referans
  // Market + economy snapshot on connect
  try {
    const { getMarketSnapshot, getEconomyState } = require('../services/gameEngine');
    setTimeout(() => {
      socket.emit('marketSnapshot', getMarketSnapshot());
      socket.emit('economyUpdate', getEconomyState());
    }, 500);
  } catch(e) {}

  // Push full game state to connecting client
  setTimeout(() => pushInitialState(socket), 800);

  // ── Presence ──────────────────────────────────────────────────────────────
  socket.on('playerJoin', (data) => {
    if (!data || !data.userId) return;
    const now = Date.now();
    const player = {
      socketId:      socket.id,
      userId:        data.userId,
      username:      typeof data.username === 'string' ? data.username.slice(0, 20) : 'Oyuncu',
      level:         Number(data.level) || 1,
      city:          typeof data.city === 'string' ? data.city.slice(0, 30) : '',
      gender:        data.gender || 'erkek',
      party:         data.party  || null,
      gang:          data.gang   || null,
      avatar:        data.avatar || null,
      joinedAt:      now,
      lastHeartbeat: now,
      lastSeen:      now,
    };
    onlinePlayers.set(socket.id, player);
    socket.userId   = data.userId;
    socket.username = player.username;

    // ── Oyuncuyu şehir bazlı odaya ekle ──────────────────────────────────
    try {
      const { rooms, createRoom, joinRoom, leaveRoom, getPlayerRoom } = require('../rooms/roomManager');
      const cityName  = player.city ? String(player.city).slice(0, 30) : 'Ana Dünya';
      const roomLabel = `${cityName} - Şehir`;

      // Önce oyuncunun başka bir odada olup olmadığını kontrol et ve çıkar
      const prevRoom = getPlayerRoom(socket.id);
      if (prevRoom && prevRoom.name !== roomLabel) {
        leaveRoom(prevRoom.roomId, socket.id);
        socket.leave(`room_${prevRoom.roomId}`);
        // Eski şehir odası adından şehir adını çıkar (format: "ŞEHİR - Şehir")
        const prevCity = prevRoom.name.replace(' - Şehir', '');
        socket.leave(`city_${prevCity}`);
        logger.info(`[Room] ${player.username} eski odadan çıkarıldı: ${prevRoom.name}`);
      }

      // BUG FIX: alreadyIn kontrolü artık socket.id üzerinden yapılıyor.
      // Eski kod userId ile arıyordu; ancak oda players Map'i socketId'yi anahtar kullanır.
      // Reconnect sonrası yeni socketId ile gelen oyuncu eski userId'yi map'te buluyor
      // ve odaya hiç katılmıyordu. Şimdi doğrudan socketId kontrolü yapılıyor.
      let cityRoom = Array.from(rooms.values()).find(r => r.name === roomLabel && r.isActive !== false);
      if (!cityRoom) {
        cityRoom = createRoom(roomLabel, 'system', 500);
      }

      const alreadyIn = cityRoom.players?.has(socket.id);
      if (!alreadyIn) {
        joinRoom(cityRoom.roomId, {
          socketId: socket.id,
          userId:   data.userId,
          username: player.username,
        });
        socket.join(`room_${cityRoom.roomId}`);
        socket.join(`city_${cityName}`);
        io.to(`room_${cityRoom.roomId}`).emit('playerJoined', {
          socketId: socket.id,
          username: player.username,
          city:     cityName,
          roomId:   cityRoom.roomId,
        });
        socket.emit('roomAssigned', { roomId: cityRoom.roomId, roomName: cityRoom.name, city: cityName });
        logger.info(`[Room] ${player.username} → ${roomLabel} (${cityRoom.roomId})`);
      }
    } catch (e) {
      logger.warn('[Room] Şehir odası katılımı başarısız:', e.message);
    }
    // ──────────────────────────────────────────────────────────────────────

    const list = Array.from(onlinePlayers.values());
    io.emit('onlinePlayers', list);
    io.emit('onlineCount', list.length);
    logger.socket('playerJoin', socket.id, `user=${player.username} city=${player.city}`);
  });

  socket.on('requestOnlinePlayers', () => {
    const list = Array.from(onlinePlayers.values());
    socket.emit('onlinePlayers', list);
    socket.emit('onlineCount', list.length);
  });

  // ── Heartbeat — client her 15s'de bir ping atar ───────────────────────────
  socket.on('heartbeat', (data) => {
    const player = onlinePlayers.get(socket.id);
    const now = Date.now();
    if (player) {
      player.lastHeartbeat = now;
      player.lastSeen      = now;
      // Profil güncellemesi gelirse uygula
      if (data?.level !== undefined) player.level = Number(data.level) || player.level;
      if (data?.party !== undefined) player.party = data.party;
      if (data?.gang  !== undefined) player.gang  = data.gang;
      if (data?.city  !== undefined) player.city  = String(data.city).slice(0, 30);
    }
    // Pong — istemci bağlantının sağlıklı olduğunu anlasın
    socket.emit('heartbeatAck', { ts: now });
  });

  // ── Şehir odası geçiş yardımcısı ─────────────────────────────────────────
  function _migrateCityRoom(newCity) {
    try {
      const { rooms, createRoom, joinRoom, leaveRoom, getPlayerRoom } = require('../rooms/roomManager');
      const cityName  = newCity ? String(newCity).slice(0, 30) : 'Ana Dünya';
      const roomLabel = `${cityName} - Şehir`;
      const prevRoom  = getPlayerRoom(socket.id);
      if (prevRoom && prevRoom.name === roomLabel) return;
      if (prevRoom) {
        leaveRoom(prevRoom.roomId, socket.id);
        socket.leave(`room_${prevRoom.roomId}`);
        const prevCity = prevRoom.name.replace(' - Şehir', '');
        socket.leave(`city_${prevCity}`);
      }
      let cityRoom = Array.from(rooms.values()).find(r => r.name === roomLabel && r.isActive !== false);
      if (!cityRoom) cityRoom = createRoom(roomLabel, 'system', 500);
      joinRoom(cityRoom.roomId, { socketId: socket.id, userId: socket.userId, username: socket.username });
      socket.join(`room_${cityRoom.roomId}`);
      socket.join(`city_${cityName}`);
      socket.emit('roomAssigned', { roomId: cityRoom.roomId, roomName: cityRoom.name, city: cityName });
    } catch (e) {
      require('../utils/logger').warn('[Room] Şehir geçişi başarısız:', e.message);
    }
  }

  socket.on('updatePresence', (data) => {
    if (!data || !checkEventRate(socket.id)) return;
    const player = onlinePlayers.get(socket.id);
    if (player) {
      if (data.level !== undefined) player.level = Number(data.level) || player.level;
      if (data.party !== undefined) player.party = data.party;
      if (data.gang  !== undefined) player.gang  = data.gang;
      if (data.city  !== undefined) {
        const newCity = String(data.city).slice(0, 30);
        if (player.city !== newCity) {
          player.city = newCity;
          _migrateCityRoom(newCity);
        }
      }
      io.emit('onlinePlayers', Array.from(onlinePlayers.values()));
    }
  });

  // ── Generic relay ─────────────────────────────────────────────────────────
  socket.on('stateUpdate', (data) => {
    if (!checkEventRate(socket.id) || !isPayloadSafe(data)) return;
    const safe = sanitizeStateUpdate(data);
    if (!safe) return;
    socket.broadcast.emit('stateUpdate', safe);
  });

  // ── emitGameEvent: oyundan gelen olayları tüm clientlara yayınla ──────────
  socket.on('emitGameEvent', (data) => {
    if (!data || !checkEventRate(socket.id) || !isPayloadSafe(data)) return;
    if (!socket.userId) return; // sadece auth kullanıcılar yayınlayabilir
    const safe = {
      id:       typeof data.id==='string'   ? data.id.slice(0,64)     : `evt_${Date.now()}`,
      type:     typeof data.type==='string' ? data.type.slice(0,40)   : 'generic',
      category: typeof data.category==='string' ? data.category.slice(0,30) : 'genel',
      title:    typeof data.title==='string'? data.title.slice(0,120)  : 'Oyun Olayı',
      desc:     typeof data.desc==='string' ? data.desc.slice(0,300)   : '',
      icon:     typeof data.icon==='string' ? data.icon.slice(0,8)     : '📢',
      username: socket.username || 'Sistem',
      ts:       Date.now(),
    };
    io.emit('gameEvent', safe);
    logger.debug(`[GameEvent] ${safe.category}:${safe.type} by ${safe.username} — "${safe.title}"`);
    monitoring.increment('playerUpdates');
  });

  socket.on('gameEvent', (data) => {
    if (!data || !checkEventRate(socket.id) || !isPayloadSafe(data)) return;
    io.emit('gameEvent', { type: typeof data.type==='string'?data.type.slice(0,40):'generic', payload: data.payload, fromSocket: socket.id, timestamp: Date.now() });
    monitoring.increment('playerUpdates');
  });

  // ── GANG sync ─────────────────────────────────────────────────────────────
  socket.on('gang:sync', async (data) => {
    if (!data || !checkEventRate(socket.id) || !isPayloadSafe(data)) return;
    if (!socket.userId) return;
    const gangs = Array.isArray(data.gangs) ? data.gangs : null;
    if (!gangs) return;
    if (db.isReady()) await db.setGangs(gangs).catch(() => {});
    socket.broadcast.emit('gangUpdate', { gangs, updatedBy: socket.username, ts: Date.now() });
    logger.debug(`[Gang] sync by ${socket.username} — ${gangs.length} çete`);
  });

  socket.on('gang:create', async (data) => {
    if (!data || !checkEventRate(socket.id)) return;
    if (!socket.userId || !data.gang?.id) return;
    if (db.isReady()) await db.upsertGang(data.gang).catch(() => {});
    const gangs = db.isReady() ? await db.getGangs().catch(() => []) : [];
    io.emit('gangUpdate', { gangs, action: 'create', gang: data.gang, ts: Date.now() });
    // Legacy gameAction relay (client listens for newGang type)
    io.emit('gameAction', { type: 'newGang', username: socket.username, payload: data.gang.name, ts: Date.now() });
    // Bildirim
    broadcastNotification(io, {
      id: `notif_gang_create_${Date.now()}`,
      type: 'gang',
      icon: data.gang.type === 'family' ? '👨‍👩‍👧‍👦' : '⚔️',
      title: `Yeni ${data.gang.type === 'family' ? 'Aile' : 'Çete'} Kuruldu`,
      msg: `${socket.username} "${data.gang.name}" ${data.gang.type === 'family' ? 'ailesini' : 'çetesini'} kurdu!`,
    });
    logger.info(`[Gang] create "${data.gang.name}" by ${socket.username}`);
  });

  socket.on('gang:join', async (data) => {
    if (!data || !checkEventRate(socket.id)) return;
    if (!socket.userId || !data.gangId) return;
    if (db.isReady()) {
      const gangs = await db.getGangs().catch(() => []);
      const updated = gangs.map(g => g.id === data.gangId
        ? { ...g, members: [...new Set([...(g.members||[]), socket.userId])], memberCount: Math.max((g.memberCount||0)+1, (g.members?.length||0)+1) }
        : g
      );
      await db.setGangs(updated).catch(() => {});
      socket.broadcast.emit('gangUpdate', { gangs: updated, action: 'join', gangId: data.gangId, userId: socket.userId, username: socket.username, ts: Date.now() });
    }
  });

  socket.on('gang:leave', async (data) => {
    if (!data || !checkEventRate(socket.id)) return;
    if (!socket.userId || !data.gangId) return;
    if (db.isReady()) {
      const gangs = await db.getGangs().catch(() => []);
      const updated = gangs.map(g => g.id === data.gangId
        ? { ...g, members: (g.members||[]).filter(m => m !== socket.userId), memberCount: Math.max(0,(g.memberCount||1)-1) }
        : g
      );
      await db.setGangs(updated).catch(() => {});
      socket.broadcast.emit('gangUpdate', { gangs: updated, action: 'leave', gangId: data.gangId, userId: socket.userId, ts: Date.now() });
    }
  });

  socket.on('gang:disband', async (data) => {
    if (!data || !checkEventRate(socket.id)) return;
    if (!socket.userId || !data.gangId) return;
    if (db.isReady()) await db.deleteGang(data.gangId).catch(() => {});
    const gangs = db.isReady() ? await db.getGangs().catch(() => []) : [];
    io.emit('gangUpdate', { gangs, action: 'disband', gangId: data.gangId, ts: Date.now() });
  });

  socket.on('gang:war', async (data) => {
    if (!data || !checkEventRate(socket.id) || !isPayloadSafe(data)) return;
    if (!socket.userId) return;
    io.emit('mafiaWarUpdate', { ...data, initiator: socket.username, ts: Date.now() });
    broadcastNotification(io, {
      id: `notif_war_${Date.now()}`,
      type: 'war',
      icon: '⚔️',
      title: 'Savaş İlanı!',
      msg: `${socket.username}: "${data.attackerName}" — "${data.defenderName}" savaşı başladı!`,
    });
    // #19 Gang war log
    if (db.isReady()) {
      db.query(
        `INSERT INTO gang_war_logs (attacker_gang, defender_gang, attacker_user_id, action, damage_dealt, metadata)
         VALUES ($1,$2,$3,'war_declaration',$4,$5)`,
        [data.attackerName || '', data.defenderName || '', socket.userId || null,
         data.damage || 0, JSON.stringify({ initiator: socket.username, ...data })]
      ).catch(() => {});
    }
  });

  socket.on('gang:attackAsset', (data) => {
    if (!data || !socket.userId) return;
    try {
      if (Buffer.byteLength(JSON.stringify(data), 'utf8') > 4096) return;
    } catch { return; }
    if (typeof data.assetId !== 'string') return;
    const payload = {
      attackId:   `atk_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      assetId:    String(data.assetId).slice(0,64),
      assetName:  String(data.assetName||'').slice(0,80),
      assetType:  String(data.assetType||'asset').slice(0,20),
      familyId:   String(data.familyId||'').slice(0,64),
      familyName: String(data.familyName||'').slice(0,80),
      gangId:     String(data.gangId||'').slice(0,64),
      gangName:   String(data.gangName||'').slice(0,80),
      attacker:   socket.username || 'Bilinmeyen',
      timestamp:  Date.now(),
    };
    io.emit('gang:assetAttacked', payload);
    sendNotification(io, data.familyOwnerId, {
      id: `notif_attack_${Date.now()}`,
      type: 'attack',
      icon: '🔥',
      title: 'Varlığınıza Saldırı!',
      msg: `"${payload.gangName}" çetesi "${payload.assetName}" varlığınıza saldırdı!`,
    });
    logger.info(`[Attack] ${socket.username} → "${payload.assetName}"`);
    // #19 Gang war log
    if (db.isReady()) {
      db.query(
        `INSERT INTO gang_war_logs (attacker_gang, defender_gang, attacker_user_id, action, damage_dealt, territory, metadata)
         VALUES ($1,$2,$3,'asset_attack',$4,$5,$6)`,
        [payload.gangName, payload.familyName, socket.userId || null,
         data.damage || 0, payload.assetName, JSON.stringify(payload)]
      ).catch(() => {});
    }
  });

  // ── PARTY sync ────────────────────────────────────────────────────────────
  socket.on('party:sync', async (data) => {
    if (!data || !checkEventRate(socket.id) || !isPayloadSafe(data)) return;
    if (!socket.userId) return;
    const parties = Array.isArray(data.parties) ? data.parties : null;
    if (!parties) return;
    if (db.isReady()) await db.setParties(parties).catch(() => {});
    socket.broadcast.emit('partyUpdate', { parties, updatedBy: socket.username, ts: Date.now() });
    logger.debug(`[Party] sync by ${socket.username} — ${parties.length} parti`);
  });

  // ── PARTY influence — atomic single-party update (CD enforced server-side) ──
  socket.on('party:updateInfluence', async (data) => {
    if (!data || !checkEventRate(socket.id)) return;
    if (!socket.userId || !data.partyId || typeof data.delta !== 'number') return;
    // Clamp delta to reasonable range
    const delta = Math.max(-10000, Math.min(10000, Math.round(data.delta)));
    if (delta === 0) return;

    // Server-side cooldown check
    const cdKey = `${socket.userId}_${data.partyId}`;
    const lastTs = _partyCdMap.get(cdKey) || 0;
    const now = Date.now();
    if (now - lastTs < PARTY_INFLUENCE_CD_MS) {
      const remaining = Math.ceil((PARTY_INFLUENCE_CD_MS - (now - lastTs)) / 1000);
      socket.emit('party:influenceError', { error: 'CD', remainingSecs: remaining });
      return;
    }
    _partyCdMap.set(cdKey, now);

    // Atomic DB update on the single party row
    if (db.isReady()) {
      try {
        await db.query(
          `UPDATE parties SET influence_points = GREATEST(0, influence_points + $1), updated_at = NOW() WHERE id = $2`,
          [delta, data.partyId]
        );
        // Re-fetch the single updated party and broadcast
        const all = await db.getParties().catch(() => []);
        io.emit('partyUpdate', { parties: all, action: 'influenceChange', partyId: data.partyId, delta, updatedBy: socket.username, ts: now });
        logger.debug(`[Party] influenceUpdate "${data.partyId}" delta=${delta} by ${socket.username}`);
      } catch (err) {
        logger.warn('[Party] updateInfluence error:', err.message);
      }
    }
  });

  socket.on('party:create', async (data) => {
    if (!data || !checkEventRate(socket.id)) return;
    if (!socket.userId || !data.party?.id) return;
    if (db.isReady()) await db.upsertParty(data.party).catch(() => {});
    const parties = db.isReady() ? await db.getParties().catch(() => []) : [];
    io.emit('partyUpdate', { parties, action: 'create', party: data.party, ts: Date.now() });
    // Legacy gameAction relay (client listens for newParty type)
    io.emit('gameAction', { type: 'newParty', username: socket.username, payload: data.party.name, ts: Date.now() });
    broadcastNotification(io, {
      id: `notif_party_create_${Date.now()}`,
      type: 'party',
      icon: '🏛️',
      title: 'Yeni Parti Kuruldu',
      msg: `${socket.username} "${data.party.name}" partisini kurdu!`,
    });
    logger.info(`[Party] create "${data.party.name}" by ${socket.username}`);
  });

  socket.on('party:join', async (data) => {
    if (!data || !checkEventRate(socket.id)) return;
    if (!socket.userId || !data.partyId) return;
    if (db.isReady()) {
      const parties = await db.getParties().catch(() => []);
      const updated = parties.map(p => p.id === data.partyId
        ? { ...p, members: [...new Set([...(p.members||[]), socket.userId])], memberCount: (p.memberCount||0)+1 }
        : p
      );
      await db.setParties(updated).catch(() => {});
      socket.broadcast.emit('partyUpdate', { parties: updated, action: 'join', partyId: data.partyId, userId: socket.userId, username: socket.username, ts: Date.now() });
    }
  });

  socket.on('party:leave', async (data) => {
    if (!data || !checkEventRate(socket.id)) return;
    if (!socket.userId || !data.partyId) return;
    if (db.isReady()) {
      const parties = await db.getParties().catch(() => []);
      const updated = parties.map(p => p.id === data.partyId
        ? { ...p, members: (p.members||[]).filter(m => m !== socket.userId), memberCount: Math.max(0,(p.memberCount||1)-1) }
        : p
      );
      await db.setParties(updated).catch(() => {});
      socket.broadcast.emit('partyUpdate', { parties: updated, action: 'leave', partyId: data.partyId, userId: socket.userId, ts: Date.now() });
    }
  });

  // ── ELECTION sync ─────────────────────────────────────────────────────────
  socket.on('election:sync', async (data) => {
    if (!data || !checkEventRate(socket.id)) return;
    if (!socket.userId) return;
    if (data.elections !== undefined && db.isReady()) {
      await db.setElections(data.elections).catch(() => {});
    }
    if (data.elections_multi !== undefined && db.isReady()) {
      await db.setElectionsMulti(data.elections_multi).catch(() => {});
    }
    socket.broadcast.emit('electionUpdate', { ...data, updatedBy: socket.username, ts: Date.now() });
  });

  socket.on('electionUpdate', (data) => {
    if (!data || !checkEventRate(socket.id)) return;
    if (db.isReady()) db.setElections(data).catch(() => {});
    io.emit('electionUpdate', { ...data, ts: Date.now() });
    if (data.phase === 'active') {
      broadcastNotification(io, {
        id: `notif_election_start_${Date.now()}`,
        type: 'election',
        icon: '🗳️',
        title: 'Seçim Başladı!',
        msg: 'Oy kullanmayı unutma! Seçimler başladı.',
      });
    } else if (data.phase === 'finished' && data.winner) {
      broadcastNotification(io, {
        id: `notif_election_end_${Date.now()}`,
        type: 'election',
        icon: '🏆',
        title: 'Seçim Sonuçlandı!',
        msg: `${data.winner.username} Devlet Başkanı seçildi!`,
      });
    }
  });

  socket.on('electionResult', (data) => {
    if (!data || !checkEventRate(socket.id)) return;
    io.emit('electionResult', { ...data, ts: Date.now() });
  });

  // ── LAW sync ──────────────────────────────────────────────────────────────
  socket.on('law:sync', async (data) => {
    if (!data || !checkEventRate(socket.id) || !isPayloadSafe(data)) return;
    if (!socket.userId) return;
    const laws = Array.isArray(data.laws) ? data.laws : null;
    if (!laws) return;
    if (db.isReady()) await db.setLaws(laws).catch(() => {});
    socket.broadcast.emit('lawUpdate', { laws, updatedBy: socket.username, ts: Date.now() });
  });

  socket.on('law:propose', async (data) => {
    if (!data || !checkEventRate(socket.id)) return;
    if (!socket.userId || !data.law?.id) return;
    if (db.isReady()) {
      const laws = await db.getLaws().catch(() => []);
      laws.unshift({ ...data.law, proposer: socket.username, ts: Date.now() });
      await db.setLaws(laws.slice(0, 100)).catch(() => {});
      socket.broadcast.emit('lawUpdate', { laws, action: 'propose', law: data.law, ts: Date.now() });
    }
    broadcastNotification(io, {
      id: `notif_law_${Date.now()}`,
      type: 'law',
      icon: '⚖️',
      title: 'Yeni Yasa Önerildi',
      msg: `${socket.username} "${data.law.title}" yasasını önerdi.`,
    });
  });

  // ── ANNOUNCEMENT sync ─────────────────────────────────────────────────────
  socket.on('announcement:sync', async (data) => {
    if (!data || !checkEventRate(socket.id) || !isPayloadSafe(data)) return;
    if (!socket.userId) return;
    const anns = Array.isArray(data.announcements) ? data.announcements : null;
    if (!anns) return;
    if (db.isReady()) await db.setAnnouncements(anns).catch(() => {});
    socket.broadcast.emit('announcementUpdate', { announcements: anns, updatedBy: socket.username, ts: Date.now() });
  });

  socket.on('announcement:new', async (data) => {
    if (!data || !checkEventRate(socket.id)) return;
    if (!socket.userId || !data.announcement) return;
    if (db.isReady()) {
      const anns = await db.getAnnouncements().catch(() => []);
      anns.unshift({ ...data.announcement, author: socket.username, ts: Date.now() });
      await db.setAnnouncements(anns.slice(0, 50)).catch(() => {});
      io.emit('announcementUpdate', { announcements: anns, action: 'new', announcement: data.announcement, ts: Date.now() });
    }
    broadcastNotification(io, {
      id: `notif_ann_${Date.now()}`,
      type: 'announcement',
      icon: '📢',
      title: 'Yeni Duyuru',
      msg: data.announcement.title || data.announcement.content?.slice(0, 60) || 'Yeni duyuru yayınlandı',
    });
  });

  // ── LOBI (lobby deals) sync ───────────────────────────────────────────────
  socket.on('lobi:sync', async (data) => {
    if (!data || !checkEventRate(socket.id) || !isPayloadSafe(data)) return;
    if (!socket.userId) return;
    const lobiler = Array.isArray(data.lobiler) ? data.lobiler : null;
    if (!lobiler) return;
    // Sanitize each entry
    const safe = lobiler.slice(0, 200).map(l => ({
      id:              typeof l.id === 'string'              ? l.id.slice(0, 64)   : '',
      partyId:         typeof l.partyId === 'string'         ? l.partyId.slice(0, 64) : '',
      partyName:       typeof l.partyName === 'string'       ? l.partyName.slice(0, 80) : '',
      partyLeaderName: typeof l.partyLeaderName === 'string' ? l.partyLeaderName.slice(0, 40) : '',
      familyId:        typeof l.familyId === 'string'        ? l.familyId.slice(0, 64) : '',
      familyName:      typeof l.familyName === 'string'      ? l.familyName.slice(0, 80) : '',
      status:          ['pending','active','rejected'].includes(l.status) ? l.status : 'pending',
      totalDonated:    Number(l.totalDonated) || 0,
      totalInf:        Number(l.totalInf) || 0,
      ts:              Number(l.ts) || Date.now(),
    })).filter(l => l.id && l.partyId && l.familyId);
    if (db.isReady()) await db.setGameState('lobiler', safe).catch(() => {});
    socket.broadcast.emit('lobiUpdate', { lobiAnlasmalari: safe, updatedBy: socket.username, ts: Date.now() });
    logger.debug(`[Lobi] sync by ${socket.username} — ${safe.length} anlaşma`);
  });

  // ── ALLIANCE sync ─────────────────────────────────────────────────────────
  socket.on('alliance:sync', async (data) => {
    if (!data || !checkEventRate(socket.id) || !isPayloadSafe(data)) return;
    if (!socket.userId) return;
    const alliances = Array.isArray(data.alliances) ? data.alliances : null;
    if (!alliances) return;
    if (db.isReady()) await db.setAlliances(alliances).catch(() => {});
    socket.broadcast.emit('allianceUpdate', { alliances, updatedBy: socket.username, ts: Date.now() });
  });

  // ── CABINET sync ──────────────────────────────────────────────────────────
  socket.on('cabinet:sync', async (data) => {
    if (!data || !checkEventRate(socket.id)) return;
    if (!socket.userId) return;
    if (data.cabinet && db.isReady()) await db.setCabinet(data.cabinet).catch(() => {});
    socket.broadcast.emit('cabinetUpdate', { cabinet: data.cabinet, updatedBy: socket.username, ts: Date.now() });
    if (data.newRole) {
      sendNotification(io, data.targetUserId, {
        id: `notif_cabinet_${Date.now()}`,
        type: 'cabinet',
        icon: '🏛️',
        title: 'Kabineye Atandınız!',
        msg: `${socket.username} sizi "${data.newRole}" görevine atadı.`,
      });
    }
  });

  // ── TERRITORY sync ───────────────────────────────────────────────────────
  socket.on('territory:sync', async (data) => {
    if (!data || !checkEventRate(socket.id)) return;
    if (!socket.userId || !data.territories) return;
    if (db.isReady()) await db.setGangTerritories(data.territories).catch(() => {});
    socket.broadcast.emit('territoryUpdate', { territories: data.territories, ts: Date.now() });
  });

  // ── TERRITORY capture — atomik tek bölge güncelleme ──────────────────────
  socket.on('gang:updateTerritory', async (data) => {
    if (!data || !checkEventRate(socket.id)) return;
    if (!socket.userId || !data.provinceId) return;

    const provinceId  = String(data.provinceId).slice(0, 64);
    const gangId      = data.gangId   ? String(data.gangId).slice(0, 64)   : null;
    const gangName    = data.gangName ? String(data.gangName).slice(0, 80)  : null;
    const color       = data.color    ? String(data.color).slice(0, 20)     : null;
    const action      = ['capture','release'].includes(data.action) ? data.action : 'capture';

    try {
      if (db.isReady()) {
        // Mevcut territory haritasını çek, tek satırı güncelle, geri yaz
        const current = (await db.getGangTerritories().catch(() => ({}))) || {};
        if (action === 'release') {
          delete current[provinceId];
        } else {
          current[provinceId] = { gangId, gangName, color, capturedAt: Date.now(), capturedBy: socket.username };
        }
        await db.setGangTerritories(current).catch(() => {});

        // Tüm clientlara bildir
        io.emit('territoryUpdate', {
          territories: current,
          action,
          provinceId,
          gangId,
          gangName,
          updatedBy: socket.username,
          ts: Date.now(),
        });

        // Savaş logu
        if (action === 'capture' && gangId) {
          const prev = current[provinceId];
          const prevGangId = prev?.gangId || null;
          if (prevGangId && prevGangId !== gangId) {
            await db.query(
              `INSERT INTO gang_war_logs (attacker_id, defender_id, province_id, result, ts)
               VALUES ($1, $2, $3, 'capture', NOW()) ON CONFLICT DO NOTHING`,
              [gangId, prevGangId, provinceId]
            ).catch(() => {});
            // Yenilen çeteye bildirim
            sendNotification(io, data.defenderLeaderId || null, {
              id: `notif_territory_${Date.now()}`,
              type: 'territory',
              icon: '⚔️',
              title: 'Bölge Kaybettiniz!',
              msg: `${gangName || socket.username} ${provinceId} bölgesini ele geçirdi.`,
            });
          }
          broadcastNotification(io, {
            id: `notif_territory_cap_${Date.now()}`,
            type: 'territory',
            icon: '🏴',
            title: 'Bölge Ele Geçirildi',
            msg: `${gangName || socket.username} ${provinceId} bölgesini fethetti!`,
          });
        }
        logger.debug(`[Territory] ${action} "${provinceId}" by ${socket.username} (gang:${gangId})`);
      } else {
        // DB yokken sadece broadcast
        io.emit('territoryUpdate', { territories: {}, action, provinceId, gangId, gangName, ts: Date.now() });
      }
    } catch (err) {
      logger.warn('[Territory] gang:updateTerritory error:', err.message);
    }
  });

  // ── NOTIFICATION targeted ────────────────────────────────────────────────
  socket.on('notification:send', (data) => {
    if (!data || !data.targetUserId || !checkEventRate(socket.id)) return;
    sendNotification(io, data.targetUserId, {
      id: data.id || `notif_${Date.now()}`,
      type: data.type || 'info',
      icon: data.icon || '🔔',
      title: data.title || '',
      msg: String(data.msg || '').slice(0, 200),
      fromUserId: socket.userId,
      fromUsername: socket.username,
    });
  });

  // ── CITY ownership ────────────────────────────────────────────────────────
  socket.on('cityOwnershipUpdate', (data) => {
    if (!data || !checkEventRate(socket.id)) return;
    io.emit('cityOwnershipUpdate', { ...data, ts: Date.now() });
  });

  // ── COMBAT ────────────────────────────────────────────────────────────────
  socket.on('combatResult', (data) => {
    if (!data || !checkEventRate(socket.id)) return;
    io.emit('combatResult', { ...data, ts: Date.now() });
    if (data.loserUserId) {
      sendNotification(io, data.loserUserId, {
        id: `notif_combat_${Date.now()}`,
        type: 'combat',
        icon: '💥',
        title: 'Savaşı Kaybettiniz!',
        msg: `${socket.username} size karşı savaşı kazandı.`,
      });
    }
  });

  // ── MARKET relay ────────────────────────────────────────────────────────
  socket.on('economyUpdate',  (data) => { if (!data || !checkEventRate(socket.id)) return; socket.broadcast.emit('economyUpdate', data); });
  socket.on('marketUpdate',   (data) => { if (!data || !checkEventRate(socket.id) || !isPayloadSafe(data)) return; io.emit('marketUpdate', data); });
  socket.on('marketSnapshot', (data) => { if (!data || !checkEventRate(socket.id)) return; socket.broadcast.emit('marketSnapshot', data); });

  // ── TRADE ────────────────────────────────────────────────────────────────
  socket.on('tradeOffer', (data) => {
    if (!data || !data.targetUserId || !checkEventRate(socket.id) || !isPayloadSafe(data)) return;
    const t = Array.from(onlinePlayers.values()).find(p => p.userId === data.targetUserId);
    if (t) {
      io.to(t.socketId).emit('tradeOffer', { ...data, fromSocketId: socket.id });
      sendNotification(io, data.targetUserId, {
        id: `notif_trade_${Date.now()}`,
        type: 'trade',
        icon: '🤝',
        title: 'Ticaret Teklifi!',
        msg: `${socket.username || data.fromUsername} size ticaret teklif etti.`,
      });
    }
  });

  socket.on('tradeResponse', (data) => {
    if (!data || !data.targetSocketId) return;
    io.to(data.targetSocketId).emit('tradeResponse', data);
  });

  // ── DM ───────────────────────────────────────────────────────────────────
  socket.on('dm', (data) => {
    if (!data || !data.targetUserId || !checkEventRate(socket.id)) return;
    if (!data.message || typeof data.message !== 'string') return;
    const t = Array.from(onlinePlayers.values()).find(p => p.userId === data.targetUserId);
    if (t) {
      io.to(t.socketId).emit('dm', {
        message:      data.message.slice(0, 500),
        fromSocketId: socket.id,
        fromUsername: socket.username || data.fromUsername,
        fromUserId:   socket.userId,
        toUserId:     data.targetUserId,
        text:         data.message.slice(0, 500),
        timestamp:    Date.now(),
      });
    }
  });

  // ── Broadcast (generic) ───────────────────────────────────────────────────
  socket.on('broadcast', (data) => {
    if (!data || !checkEventRate(socket.id) || !isPayloadSafe(data)) return;
    socket.broadcast.emit('broadcast', data);
  });

  socket.on('serverAction', (data) => {
    if (!data || !checkEventRate(socket.id)) return;
    io.emit('serverAction', data);
  });

  socket.on('inventoryUpdate', (data) => {
    if (!data || !checkEventRate(socket.id)) return;
    if (data.targetUserId) {
      const t = Array.from(onlinePlayers.values()).find(p => p.userId === data.targetUserId);
      if (t) io.to(t.socketId).emit('inventoryUpdate', data);
    } else { socket.broadcast.emit('inventoryUpdate', data); }
  });

  socket.on('mafiaWarUpdate', (data) => { if (!data || !checkEventRate(socket.id)) return; io.emit('mafiaWarUpdate', data); });

  // ── MONEY TRANSFER — gerçek zamanlı bakiye bildirimi ─────────────────────
  socket.on('money:transfer', (data) => {
    if (!data || !checkEventRate(socket.id)) return;
    if (!socket.userId || !data.toId || typeof data.amount !== 'number') return;
    const amount = Math.max(0, Math.round(data.amount));
    if (amount === 0) return;
    sendNotification(io, data.toId, {
      id: `notif_transfer_${Date.now()}`,
      type: 'transfer',
      icon: '💸',
      title: 'Para Aldınız!',
      msg: `${socket.username} size ₺${amount.toLocaleString('tr-TR')} gönderdi.`,
    });
    const target = Array.from(onlinePlayers.values()).find(p => p.userId === data.toId);
    if (target) {
      io.to(target.socketId).emit('moneyUpdate', {
        delta:     amount,
        reason:    `${socket.username} transferi`,
        from:      socket.username,
        fromId:    socket.userId,
        timestamp: Date.now(),
      });
    }
    logger.debug(`[Transfer] ${socket.username} → userId:${data.toId} ₺${amount}`);
  });

  // ── PARTNERSHIP OFFER relay ───────────────────────────────────────────────
  socket.on('partnershipOffer', (data) => {
    if (!data || !data.targetUserId || !checkEventRate(socket.id) || !isPayloadSafe(data)) return;
    const t = Array.from(onlinePlayers.values()).find(p => p.userId === data.targetUserId);
    if (t) {
      io.to(t.socketId).emit('partnershipOffer', {
        ...data,
        fromSocketId: socket.id,
        fromUserId:   socket.userId,
        fromUsername: socket.username,
      });
      sendNotification(io, data.targetUserId, {
        id: `notif_partner_${Date.now()}`,
        type: 'partnership',
        icon: '🏢',
        title: 'Ortaklık Teklifi!',
        msg: `${socket.username} size şirket ortaklığı teklif etti.`,
      });
    }
  });
}

// ── Cleanup ───────────────────────────────────────────────────────────────────
function removeGamePlayer(socketId, io) {
  onlinePlayers.delete(socketId);
  socketEventRates.delete(socketId);
  const list = Array.from(onlinePlayers.values());
  io.emit('onlinePlayers', list);
  io.emit('onlineCount', list.length);
}

function getOnlineGamePlayers() { return Array.from(onlinePlayers.values()); }

module.exports = { registerGameHandlers, removeGamePlayer, getOnlineGamePlayers, sendNotification, broadcastNotification };
