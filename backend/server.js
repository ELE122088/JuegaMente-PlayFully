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

// Hacer la instancia de io accesible en todos los controladores de Express
app.set('io', io);
global.io = io;

io.on('connection', (socket) => {
  console.log(`⚡ Cliente conectado a WebSockets: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`🔌 Cliente desconectado: ${socket.id}`);
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
