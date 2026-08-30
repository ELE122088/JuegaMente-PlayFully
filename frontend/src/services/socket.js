import { io } from 'socket.io-client';
import { getBaseUrl } from './api';
import storage from './storage';

let socket = null;

// Enviar identificación del usuario autenticado actual al backend
export const identifySocketUser = (userOverride) => {
  if (!socket) return;
  try {
    const username = userOverride?.username || storage.getItem('username') || 'Invitado/Anónimo';
    const isAdmin = userOverride?.isAdmin !== undefined 
      ? userOverride.isAdmin 
      : storage.getItem('isAdmin') === 'true';
    const role = isAdmin ? 'Administrador' : 'Estudiante';
    socket.emit('user:identify', { username, role, isAdmin });
  } catch (e) {
    console.warn('Error al identificar usuario en socket:', e);
  }
};

// Obtener o inicializar el socket singleton conectado al backend
export const getSocket = () => {
  const url = getBaseUrl();
  if (!socket) {
    const username = storage.getItem('username') || 'Invitado/Anónimo';
    const isAdmin = storage.getItem('isAdmin') === 'true';
    const role = isAdmin ? 'Administrador' : 'Estudiante';

    console.log(`🔌 Conectando Socket.io a ${url} como ${username} (${role})...`);

    socket = io(url, {
      transports: ['polling', 'websocket'],
      auth: {
        username,
        role,
      },
      query: {
        username,
        role,
      },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log(`✅ Conectado a WebSockets del Servidor (ID: ${socket.id})`);
      identifySocketUser();
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
