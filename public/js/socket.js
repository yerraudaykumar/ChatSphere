// ChatSphere Socket.IO Client Wrapper
let socket = null;

function initSocketConnection() {
  if (typeof io === 'undefined') {
    console.error('Socket.IO client library not loaded');
    return null;
  }

  // Connect to Socket.IO server
  socket = io({
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('Connected to Socket.IO server as socket ID:', socket.id);
  });

  socket.on('connect_error', (error) => {
    console.warn('Socket connection error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  return socket;
}

// Automatically initialize socket connection when window loads
window.addEventListener('DOMContentLoaded', () => {
  if (window.CURRENT_USER) {
    initSocketConnection();
  }
});
