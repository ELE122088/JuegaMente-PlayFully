const express = require('express');
const http = require('http');
const dns = require('dns');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Forzar resolución IPv4 primero para compatibilidad con MongoDB Atlas en Render/Linux
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

// Cargar variables de entorno
dotenv.config();

// Conectar a la base de datos
connectDB();

const app = express();
const server = http.createServer(app);

// Inicializar Socket.io con CORS abierto para web y móviles
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Helper para formatear fecha y hora exacta con segundos [DD/MM/YYYY HH:mm:ss]
const getSocketTimestamp = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const day = pad(now.getDate());
  const month = pad(now.getMonth() + 1);
  const year = now.getFullYear();
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

// Hacer la instancia de io accesible en todos los controladores de Express
app.set('io', io);
global.io = io;

io.on('connection', (socket) => {
  // Extraer datos de usuario enviados en el handshake
  const rawUser = socket.handshake.auth?.username || socket.handshake.query?.username;
  const rawRole = socket.handshake.auth?.role || socket.handshake.query?.role;

  socket.username = (rawUser && rawUser !== 'undefined' && rawUser !== 'null') ? rawUser : 'Invitado/Anónimo';
  socket.role = (rawRole && rawRole !== 'undefined' && rawRole !== 'null') ? rawRole : 'Estudiante';

  console.log(`[${getSocketTimestamp()}][CONECTADO] ${socket.username} (${socket.role}) | Socket ID: ${socket.id}`);

  // Evento cuando el cliente inicia sesión o cambia de nombre
  socket.on('user:identify', (userData) => {
    if (userData?.username) {
      const prevName = socket.username;
      socket.username = userData.username;
      socket.role = userData.isAdmin || userData.role === 'admin' || userData.role === 'Administrador' ? 'Administrador' : 'Estudiante';
      if (prevName !== socket.username) {
        console.log(`[${getSocketTimestamp()}] 🆔 [IDENTIFICADO] ${prevName} -> ${socket.username} (${socket.role}) | Socket ID: ${socket.id}`);
      }
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`[${getSocketTimestamp()}] 🔌 [DESCONECTADO] ${socket.username} (${socket.role}) | Socket ID: ${socket.id} (Motivo: ${reason})`);
  });
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({
    message: '🧠 API JuegaMente (Playfully) funcionando correctamente con WebSockets',
    endpoints: {
      health: '/api/health',
      categories: '/api/categories',
      questions: '/api/questions',
      auth: '/api/auth',
    },
  });
});

// Diagnóstico de salud y conexión a MongoDB Atlas
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  const state = mongoose.connection.readyState;
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({
    databaseStatus: states[state] || 'unknown',
    readyState: state,
    connectedHost: mongoose.connection.host || null,
    lastDbError: global.lastDbError || null,
    uptime: process.uptime(),
  });
});

// Rutas de la API
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/questions', require('./routes/questionRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));

// Compatibilidad silenciosa para clientes o navegadores con caché previa
app.all(['/api/admin/database-status', '/api/admin/sync-databases'], (req, res) => {
  res.json({ success: true, connected: true, host: 'MongoDB Atlas' });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

// Iniciar servidor con soporte WebSocket
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo con WebSockets en puerto ${PORT}`);
});
