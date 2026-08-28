import { io } from 'socket.io-client';
import { getBaseUrl } from './api';

let socket = null;

// Obtener o inicializar el socket singleton conectado al backend
export const getSocket = () => {
  const url = getBaseUrl();
  if (!socket) {
    console.log(`🔌 Conectando Socket.io a ${url}...`);

    socket = io(url, {
      transports: ['polling', 'websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log(`✅ Conectado a WebSockets del Servidor (ID: ${socket.id})`);
    });

    socket.on('connect_error', (err) => {
      console.warn('⚠️ Error de conexión WebSocket:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket desconectado (${reason})`);
    });
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

export default getSocket;
