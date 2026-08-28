const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

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

// Middleware de diagnóstico para depurar req.body
app.use((req, res, next) => {
  console.log(`\n--- 📥 Petición Recibida ---`);
  console.log(`Método: ${req.method}`);
  console.log(`Ruta: ${req.url}`);
  console.log(`Content-Type: ${req.headers['content-type']}`);
  console.log(`Body parseado:`, req.body);
  console.log(`---------------------------\n`);
  next();
});

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({
    message: '🧠 API JuegaMente (Playfully) funcionando correctamente con WebSockets',
    endpoints: {
      categories: '/api/categories',
      questions: '/api/questions',
      auth: '/api/auth',
    },
  });
});

// Rutas de la API
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/questions', require('./routes/questionRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

// Iniciar servidor con soporte WebSocket
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo con WebSockets en http://localhost:${PORT}`);
});
