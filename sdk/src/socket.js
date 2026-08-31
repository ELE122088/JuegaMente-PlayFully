class SocketModule {
  constructor(client) {
    this.client = client;
    this.socket = null;
  }

  connect(options = {}) {
    try {
      const io = require('socket.io-client');
      this.socket = io(this.client.baseUrl, {
        transports: ['websocket', 'polling'],
        ...options
      });
      return this.socket;
    } catch (err) {
      console.warn('[JuegaMente SDK] socket.io-client no disponible.');
      return null;
    }
  }

  joinRoom(categoryId) {
    if (this.socket) {
      this.socket.emit('joinRoom', { categoryId });
    }
  }

  onRankingUpdate(callback) {
    if (this.socket) {
      this.socket.on('rankingUpdated', callback);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

module.exports = SocketModule;
