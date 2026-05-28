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

export function initSocket(serverUrl) {
  if (socket) return socket;
  const url = serverUrl || _resolveServerUrl();

  socket = io(url, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    transports: ['websocket', 'polling']
  });

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
  });

  socket.on('chat', (data) => {
    try {
      const channel = data.channel || 'globalChat';
      let current = JSON.parse(localStorage.getItem('rep_' + channel) || '[]');
      if (!Array.isArray(current)) current = [];
      if (!current.find(m => m.id === data.id)) {
        current.push({
          id: data.id || Math.random().toString(36).slice(2),
          sender: data.sender,
          message: data.message,
          timestamp: data.timestamp || Date.now(),
          channel
        });
        localStorage.setItem('rep_' + channel, JSON.stringify(current));
        window.dispatchEvent(new CustomEvent('fb-sync', { detail: { key: channel, value: current } }));
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

export function getSocket() { return socket; }
export function isConnected() { return socketConnected && socket?.connected; }

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
