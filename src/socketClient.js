// Socket.IO Client - Multiplayer Realtime Sync
let socket = null;
let socketConnected = false;

function _resolveServerUrl(fallback) {
  if (typeof window !== 'undefined') {
    if (window._SOCKET_URL) return window._SOCKET_URL;
    if (window.__ENV__ && window.__ENV__.SOCKET_URL) return window.__ENV__.SOCKET_URL;
    return window.location.origin;
  }
  return fallback || 'http://localhost:5000';
}

export function initSocket(serverUrl, token) {
  // Sync with app.js's window._socket — prevent double init race condition
  if (typeof window !== 'undefined' && window._socket && window._socket.connected) {
    socket = window._socket;
    socketConnected = true;
    return socket;
  }
  if (socket) return socket;
  const url = serverUrl || _resolveServerUrl();
  const jwt = token
    || (typeof window !== 'undefined' && (localStorage.getItem('authToken') || localStorage.getItem('us_jwt') || ''))
    || '';

  socket = io(url, {
    auth: { token: jwt },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    transports: ['websocket', 'polling']
  });

  // Share instance with app.js
  if (typeof window !== 'undefined') window._socket = socket;

  socket.on('connect', () => {
    socketConnected = true;
    console.log('[Socket Bridge] Bağlantı kuruldu ✓', socket.id);
    window.dispatchEvent(new CustomEvent('socket-connected', { detail: { socketId: socket.id } }));
  });

  socket.on('disconnect', () => {
    socketConnected = false;
    console.log('[Socket Bridge] Bağlantı kesildi ✗');
    window.dispatchEvent(new CustomEvent('socket-disconnected'));
  });

  socket.on('reconnect', () => {
    socketConnected = true;
    console.log('[Socket Bridge] Yeniden bağlandı ↻');
    window.dispatchEvent(new CustomEvent('socket-reconnected'));
    try {
      const userId   = localStorage.getItem('rep_userId') || localStorage.getItem('userId');
      const username = localStorage.getItem('rep_username');
      if (userId) {
        const profile = JSON.parse(localStorage.getItem('rep_userProfile') || '{}');
        socket.emit('playerJoin', {
          userId,
          username: username || profile.username || 'Oyuncu',
          level:    profile.level  || 1,
          city:     profile.city   || '',
          gender:   profile.gender || 'erkek',
          party:    profile.party  || null,
          gang:     profile.gang   || null,
          avatar:   profile.avatar || null,
        });
      }
    } catch (e) { console.warn('[Socket Bridge] Reconnect playerJoin hatası:', e); }
  });

  socket.on('chat', (data) => {
    try {
      const rawChannel = data.channel || 'globalChat';
      // globalChat → rep_globalChat (useLs key'i)
      // city_İstanbul → cityChats objesi içinde işlenir
      if (rawChannel.startsWith('city_')) {
        const cityKey = rawChannel.replace('city_', '');
        let cityChats = JSON.parse(localStorage.getItem('rep_cityChats') || '{}');
        if (typeof cityChats !== 'object' || Array.isArray(cityChats)) cityChats = {};
        const cityArr = Array.isArray(cityChats[cityKey]) ? cityChats[cityKey] : [];
        const newMsg = {
          id: data.id || Math.random().toString(36).slice(2),
          userId: data.userId || null,
          username: data.sender || 'Oyuncu',
          text: data.message,
          ts: data.timestamp || Date.now(),
          level: data.level || 1,
          gender: data.gender || null,
          premium: data.premium || false,
          photoUrl: data.photoUrl || null,
        };
        if (!cityArr.find(m => m.id === newMsg.id)) {
          cityChats[cityKey] = [...cityArr.slice(-99), newMsg];
          localStorage.setItem('rep_cityChats', JSON.stringify(cityChats));
          window.dispatchEvent(new CustomEvent('fb-sync', { detail: { key: 'cityChats', value: cityChats } }));
        }
      } else if (rawChannel.startsWith('klan_')) {
        // Klan chat — rep_klanChat'e yaz
        let klanChat = JSON.parse(localStorage.getItem('rep_klanChat') || '[]');
        if (!Array.isArray(klanChat)) klanChat = [];
        const newMsg = {
          id: data.id || Math.random().toString(36).slice(2),
          room: data.room || 'Genel',
          author: data.sender || 'Anonim',
          text: data.message,
          ts: data.timestamp || Date.now(),
          city: data.city || '',
          photoUrl: data.photoUrl || null,
        };
        if (!klanChat.find(m => m.id === newMsg.id)) {
          klanChat = [...klanChat.slice(-199), newMsg];
          localStorage.setItem('rep_klanChat', JSON.stringify(klanChat));
          window.dispatchEvent(new CustomEvent('fb-sync', { detail: { key: 'klanChat', value: klanChat } }));
        }
      } else {
        // globalChat ve diğer kanallar
        const lsKey = rawChannel; // useLs('globalChat') → rep_globalChat
        let current = JSON.parse(localStorage.getItem('rep_' + lsKey) || '[]');
        if (!Array.isArray(current)) current = [];
        const newMsg = {
          id: data.id || Math.random().toString(36).slice(2),
          userId: data.userId || null,
          username: data.sender || 'Oyuncu',
          text: data.message,
          ts: data.timestamp || Date.now(),
          level: data.level || 1,
          gender: data.gender || null,
          premium: data.premium || false,
          photoUrl: data.photoUrl || null,
        };
        if (!current.find(m => m.id === newMsg.id)) {
          current = [...current.slice(-199), newMsg];
          localStorage.setItem('rep_' + lsKey, JSON.stringify(current));
          window.dispatchEvent(new CustomEvent('fb-sync', { detail: { key: lsKey, value: current } }));
        }
      }
    } catch (e) { console.warn('Chat hatası:', e); }
  });

  socket.on('playerUpdate', (data) => {
    try {
      const updates = JSON.parse(localStorage.getItem('rep_playerUpdates') || '{}');
      updates[data.userId] = { ...data, lastUpdate: Date.now() };
      localStorage.setItem('rep_playerUpdates', JSON.stringify(updates));
      window.dispatchEvent(new CustomEvent('player-updated', { detail: { userId: data.userId, data } }));
    } catch (e) { console.warn('Oyuncu güncelleme hatası:', e); }
  });

  socket.on('onlineCount', (count) => {
    localStorage.setItem('rep_onlineCount', JSON.stringify(count));
    window.dispatchEvent(new CustomEvent('fb-sync', { detail: { key: 'onlineCount', value: count } }));
  });

  socket.on('onlinePlayers', (players) => {
    localStorage.setItem('rep_onlinePlayers', JSON.stringify(players));
    window.dispatchEvent(new CustomEvent('online-players-updated', { detail: players }));
  });

  socket.on('broadcast', (data) => {
    window.dispatchEvent(new CustomEvent('socket-broadcast', { detail: data }));
  });

  socket.on('serverAnnouncement', (data) => {
    window.dispatchEvent(new CustomEvent('socket-broadcast', { detail: { ...data, type: 'announcement' } }));
  });

  socket.on('marketSnapshot', (data) => {
    window.dispatchEvent(new CustomEvent('market-update', { detail: data }));
  });

  socket.on('economyUpdate', (data) => {
    window.dispatchEvent(new CustomEvent('economy-update', { detail: data }));
  });

  socket.on('gameEvent', (data) => {
    window.dispatchEvent(new CustomEvent('game-event', { detail: data }));
  });

  return socket;
}

export function getSocket() {
  // Fall back to app.js's shared socket if this module was not yet initialized
  if (!socket && typeof window !== 'undefined' && window._socket) {
    socket = window._socket;
  }
  return socket;
}
export function isConnected() {
  const s = socket || (typeof window !== 'undefined' && window._socket);
  return Boolean(s?.connected);
}

export function sendChat(channel, message, sender) {
  if (!socket) return;
  socket.emit('chat', { id: Math.random().toString(36).slice(2), channel, message, sender, timestamp: Date.now() });
}

export function sendPlayerUpdate(userId, action, data) {
  if (!socket) return;
  socket.emit('playerUpdate', { userId, action, data, timestamp: Date.now() });
}

export function broadcastEvent(eventName, data) {
  if (!socket) return;
  socket.emit('broadcast', { event: eventName, data, timestamp: Date.now() });
}

export function disconnect() {
  if (socket) { socket.disconnect(); socket = null; socketConnected = false; }
}
