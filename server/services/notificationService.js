/**
 * Notification Service
 * Central hub: saves to DB + delivers real-time via Socket.IO if user is online.
 * Call setIO(io) once at startup.
 */
const db     = require('./dbService');
const logger = require('../utils/logger');

let _io = null;
let _onlinePlayers = null; // lazy-loaded from onlineStore

function setIO(io) { _io = io; }

function getOnline() {
  if (!_onlinePlayers) {
    try { _onlinePlayers = require('../socket/onlineStore').onlinePlayers; } catch(_) {}
  }
  return _onlinePlayers;
}

// ── Core delivery ─────────────────────────────────────────────────────────────
async function notify(userId, { type = 'info', title, msg, icon = '🔔', data = {} } = {}) {
  if (!userId || !title) return;

  const notif = {
    id:     `notif_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    userId,
    type,
    title:  String(title).slice(0, 200),
    msg:    String(msg   || '').slice(0, 500),
    icon,
    ts:     Date.now(),
    ...data,
  };

  // 1) Persist to DB
  if (db.isReady()) {
    await db.saveNotification(notif).catch(() => {});
  }

  // 2) Real-time delivery if user is online
  if (_io) {
    const online = getOnline();
    const player = online && Array.from(online.values()).find(p => p.userId === userId);
    if (player?.socketId) {
      const sock = _io.sockets.sockets.get(player.socketId);
      if (sock) {
        sock.emit('notification', { ...notif, realtime: true });
      }
    }
  }
}

// Batch notify many users at once
async function notifyMany(userIds, notifOpts) {
  await Promise.all(userIds.map(uid => notify(uid, notifOpts)));
}

// Broadcast to all connected sockets (no DB persist — transient)
function broadcast(notifOpts) {
  if (!_io) return;
  const payload = { ...notifOpts, ts: Date.now(), id: `bcast_${Date.now()}` };
  _io.emit('notification', payload);
}

// ── Typed notification builders ───────────────────────────────────────────────
async function notifyFriendRequest(targetUserId, fromUsername) {
  return notify(targetUserId, {
    type:  'friend_request',
    title: 'Arkadaşlık İsteği',
    msg:   `${fromUsername} sizi arkadaşlığa davet etti.`,
    icon:  '👥',
    data:  { fromUsername },
  });
}

async function notifyFriendAccepted(targetUserId, fromUsername) {
  return notify(targetUserId, {
    type:  'friend_accepted',
    title: 'Arkadaşlık Kabul Edildi',
    msg:   `${fromUsername} arkadaşlık isteğinizi kabul etti!`,
    icon:  '🤝',
    data:  { fromUsername },
  });
}

async function notifyDM(receiverId, fromUsername, preview) {
  return notify(receiverId, {
    type:  'dm',
    title: `${fromUsername} mesaj gönderdi`,
    msg:   String(preview || '').slice(0, 80) + (preview?.length > 80 ? '…' : ''),
    icon:  '💬',
    data:  { fromUsername },
  });
}

async function notifyTransferReceived(receiverId, fromUsername, amount) {
  return notify(receiverId, {
    type:  'transfer_received',
    title: 'Para Transferi Alındı',
    msg:   `${fromUsername} size ${Number(amount).toLocaleString('tr-TR')}₺ gönderdi.`,
    icon:  '💸',
    data:  { fromUsername, amount },
  });
}

async function notifyMarketplaceSold(sellerId, buyerUsername, itemName, price) {
  return notify(sellerId, {
    type:  'marketplace_sold',
    title: 'İlanınız Satıldı!',
    msg:   `"${itemName}" ${buyerUsername} tarafından ${Number(price).toLocaleString('tr-TR')}₺ fiyatına satın alındı.`,
    icon:  '🏪',
    data:  { buyerUsername, itemName, price },
  });
}

async function notifyLoanOverdue(userId, amountDue) {
  return notify(userId, {
    type:  'loan_overdue',
    title: '⚠️ Kredi Vade Aşımı',
    msg:   `${Number(amountDue).toLocaleString('tr-TR')}₺ tutarındaki kredinizin vadesi doldu. Kredi skorunuz düşürüldü.`,
    icon:  '🏦',
    data:  { amountDue },
  });
}

async function notifyLoanDueSoon(userId, amountDue, daysLeft) {
  return notify(userId, {
    type:  'loan_due_soon',
    title: 'Kredi Vadesi Yaklaşıyor',
    msg:   `${daysLeft} gün içinde ${Number(amountDue).toLocaleString('tr-TR')}₺ kredinizin vadesi doluyor.`,
    icon:  '⏰',
    data:  { amountDue, daysLeft },
  });
}

async function notifyParliamentResult(proposerId, billTitle, passed) {
  return notify(proposerId, {
    type:  passed ? 'bill_passed' : 'bill_rejected',
    title: passed ? '✅ Yasa Kabul Edildi' : '❌ Yasa Reddedildi',
    msg:   `"${billTitle}" başlıklı yasanız ${passed ? 'parlamentodan geçti' : 'reddedildi'}.`,
    icon:  passed ? '🏛️' : '📋',
    data:  { billTitle, passed },
  });
}

async function notifyParliamentVote(proposerId, voterUsername, billTitle, vote) {
  return notify(proposerId, {
    type:  'bill_vote',
    title: 'Teklifinize Oy Verildi',
    msg:   `${voterUsername} "${billTitle}" teklifinize "${vote === 'for' ? 'Lehte' : vote === 'against' ? 'Aleyhte' : 'Çekimser'}" oy kullandı.`,
    icon:  '🗳️',
    data:  { voterUsername, billTitle, vote },
  });
}

async function notifyAccountFrozen(userId, reason) {
  return notify(userId, {
    type:  'account_frozen',
    title: '🔒 Hesabınız Donduruldu',
    msg:   reason || 'Hesabınız güvenlik nedeniyle donduruldu. Destek ile iletişime geçin.',
    icon:  '🔒',
  });
}

async function notifyEventStart(userId, eventTitle, eventType) {
  return notify(userId, {
    type:  'event_start',
    title: '🎯 Etkinlik Başladı!',
    msg:   `"${eventTitle}" etkinliği başladı. Katılmak için acele edin!`,
    icon:  '🎯',
    data:  { eventTitle, eventType },
  });
}

async function notifyDiplomacyProposal(userId, fromAlliance, actionType) {
  const actionNames = {
    war_declaration: '⚔️ Savaş İlanı',
    ceasefire:       '🕊️ Ateşkes Teklifi',
    trade_treaty:    '🤝 Ticaret Antlaşması',
    territory_deal:  '🗺️ Toprak Anlaşması',
    non_aggression:  '🛡️ Saldırmazlık Paktı',
  };
  return notify(userId, {
    type:  'diplomacy_proposal',
    title: actionNames[actionType] || 'Diplomatik Teklif',
    msg:   `"${fromAlliance}" ittifakından ${actionNames[actionType] || actionType} teklifi aldınız.`,
    icon:  '🌐',
    data:  { fromAlliance, actionType },
  });
}

async function notifyReferralBonus(userId, referredUsername) {
  return notify(userId, {
    type:  'referral_bonus',
    title: '🎁 Referans Bonusu!',
    msg:   `${referredUsername} referans kodunuzu kullandı. Hesabınıza 5.000₺ eklendi!`,
    icon:  '🎁',
    data:  { referredUsername },
  });
}

module.exports = {
  setIO,
  notify,
  notifyMany,
  broadcast,
  notifyFriendRequest,
  notifyFriendAccepted,
  notifyDM,
  notifyTransferReceived,
  notifyMarketplaceSold,
  notifyLoanOverdue,
  notifyLoanDueSoon,
  notifyParliamentResult,
  notifyParliamentVote,
  notifyAccountFrozen,
  notifyEventStart,
  notifyDiplomacyProposal,
  notifyReferralBonus,
};
