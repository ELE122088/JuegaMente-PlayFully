const mongoose = require('mongoose');

const ATLAS_URI = process.env.MONGO_ATLAS_URI || process.env.MONGO_URI || 'mongodb+srv://markarvar1988_db_user:Kieb2xUgmg5MOhoH@cluster0.mrvmafh.mongodb.net/Banco_preguntas?retryWrites=true&w=majority';

const connectDB = async () => {
  const attemptConnect = async () => {
    try {
      console.log('🔌 Conectando ÚNICAMENTE a MongoDB Atlas (cluster0.mrvmafh.mongodb.net)...');
      const conn = await mongoose.connect(ATLAS_URI, {
        serverSelectionTimeoutMS: 20000,
        family: 4,
        retryWrites: true,
        w: 'majority',
      });

      console.log(`✅ Conectado exitosamente a MongoDB Atlas: ${conn.connection.host}`);
      global.lastDbError = null;

      // Migración automática de usuarios antiguos usando la colección nativa
      try {
        const userCollection = mongoose.connection.db.collection('users');

        // 1. Usuarios que deberían ser admin pero tienen rol 'user' (o no tienen rol)
        const adminsToMigrate = await userCollection.find({
          $or: [ { isAdmin: true }, { isAdmin: "true" } ],
          role: { $ne: 'admin' }
        }).toArray();

        if (adminsToMigrate.length > 0) {
          console.log(`⚠️ Se encontraron ${adminsToMigrate.length} usuarios con isAdmin=true pero sin rol admin. Migrando a 'admin'...`);
          for (const userDoc of adminsToMigrate) {
            await userCollection.updateOne(
              { _id: userDoc._id },
              { 
                $set: { role: 'admin' },
                $unset: { isAdmin: "" } 
              }
            );
            console.log(`  🔹 Migrado usuario "${userDoc.username}" a rol "admin" (se eliminó isAdmin).`);
          }
        }

        // 2. Usuarios que no tienen el campo 'role' (y no son admins según el paso anterior)
        const usersWithoutRole = await userCollection.find({ role: { $exists: false } }).toArray();
        if (usersWithoutRole.length > 0) {
          console.log(`⚠️ Se encontraron ${usersWithoutRole.length} usuarios sin campo 'role'. Asignando rol 'user'...`);
          for (const userDoc of usersWithoutRole) {
            await userCollection.updateOne(
              { _id: userDoc._id },
              { 
                $set: { role: 'user' },
                $unset: { isAdmin: "" } 
              }
            );
            console.log(`  🔹 Asignado rol "user" al usuario "${userDoc.username}".`);
          }
        }

        // 3. Limpieza: Eliminar isAdmin de cualquier otro usuario que lo tenga (por limpieza)
        const usersWithIsAdminField = await userCollection.find({ isAdmin: { $exists: true } }).toArray();
        if (usersWithIsAdminField.length > 0) {
          console.log(`🧹 Limpiando campo legado 'isAdmin' de ${usersWithIsAdminField.length} usuarios...`);
          for (const userDoc of usersWithIsAdminField) {
            await userCollection.updateOne(
              { _id: userDoc._id },
              { $unset: { isAdmin: "" } }
            );
          }
          console.log('🎉 Limpieza de campo legado completada.');
        }

        // 4. Auto-seed inicial si la base de datos es nueva (0 categorías)
        const Category = require('../models/Category');
        const Question = require('../models/Question');
        const User = require('../models/User');
        const bcrypt = require('bcryptjs');

        const catCount = await Category.countDocuments();
        if (catCount === 0) {
          console.log('🌱 Base de datos nueva detectada. Ejecutando auto-seed inicial...');

          let superAdmin = await User.findOne({ username: 'SuperAdmin' });
          if (!superAdmin) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);
            superAdmin = await User.create({
              username: 'SuperAdmin',
              password: hashedPassword,
              role: 'admin',
              isSuperAdmin: true,
              adminPin: '1234',
            });
            console.log('👑 Usuario SuperAdmin creado automáticamente.');
          }

          const seedCategories = [
            { name: 'Matemáticas', description: 'Preguntas de aritmética, álgebra y geometría básica', icon: '🔢', color: '#6C63FF', isPublic: true, gameMode: 'practice', initialLives: 5, roomCode: null, createdBy: superAdmin._id },
            { name: 'Historia', description: 'Preguntas sobre eventos históricos importantes', icon: '🏛️', color: '#FF6B6B', isPublic: true, gameMode: 'practice', initialLives: 5, roomCode: null, createdBy: superAdmin._id },
            { name: 'Ciencias', description: 'Preguntas sobre biología, química y física', icon: '🔬', color: '#4ECDC4', isPublic: true, gameMode: 'practice', initialLives: 5, roomCode: null, createdBy: superAdmin._id },
            { name: 'Ciencia y Tecnología', description: 'Preguntas sobre informática, internet, robótica e innovación', icon: '💻', color: '#FFD166', isPublic: true, gameMode: 'practice', initialLives: 5, roomCode: null, createdBy: superAdmin._id },
            { name: 'Música', description: 'Preguntas sobre teoría musical, instrumentos e historia de la música', icon: '🎵', color: '#DDA0DD', isPublic: true, gameMode: 'practice', initialLives: 5, roomCode: null, createdBy: superAdmin._id },
          ];

          const createdCats = await Category.insertMany(seedCategories);
          console.log(`📁 ${createdCats.length} categorías oficiales creadas.`);

          const questionsByCat = {
            'Matemáticas': [
              { text: '¿Cuánto es 15 × 8?', options: ['110', '120', '130', '140'], correctAnswer: 1 },
              { text: '¿Cuál es la raíz cuadrada de 144?', options: ['10', '11', '12', '14'], correctAnswer: 2 },
              { text: '¿Cuánto es 2³ (2 al cubo)?', options: ['4', '6', '8', '16'], correctAnswer: 2 },
              { text: '¿Cuántos grados tiene un triángulo?', options: ['90°', '180°', '270°', '360°'], correctAnswer: 1 },
              { text: 'Si x + 5 = 12, ¿cuánto vale x?', options: ['5', '6', '7', '8'], correctAnswer: 2 },
            ],
            'Historia': [
              { text: '¿En qué año llegó Cristóbal Colón a América?', options: ['1400', '1450', '1492', '1500'], correctAnswer: 2 },
              { text: '¿Quién fue el primer presidente de los Estados Unidos?', options: ['Thomas Jefferson', 'George Washington', 'Abraham Lincoln', 'John Adams'], correctAnswer: 1 },
              { text: '¿En qué país se originaron los Juegos Olímpicos antiguos?', options: ['Italia', 'Egipto', 'Grecia', 'Francia'], correctAnswer: 2 },
              { text: '¿Qué civilización construyó las pirámides de Giza?', options: ['Mayas', 'Romanos', 'Egipcios', 'Incas'], correctAnswer: 2 },
              { text: '¿En qué año terminó la Segunda Guerra Mundial?', options: ['1943', '1944', '1945', '1946'], correctAnswer: 2 },
            ],
            'Ciencias': [
              { text: '¿Cuál es el planeta más cercano al Sol?', options: ['Venus', 'Marte', 'Mercurio', 'Tierra'], correctAnswer: 2 },
              { text: '¿Cuál es el símbolo químico del agua?', options: ['HO', 'H2O', 'O2H', 'OH2'], correctAnswer: 1 },
              { text: '¿Cuántos huesos tiene el cuerpo humano adulto?', options: ['186', '196', '206', '216'], correctAnswer: 2 },
              { text: '¿Qué gas es esencial para la respiración humana?', options: ['Nitrógeno', 'Oxígeno', 'Dióxido de carbono', 'Hidrógeno'], correctAnswer: 1 },
              { text: '¿Cuál es la velocidad de la luz en km/s (aproximada)?', options: ['100,000 km/s', '200,000 km/s', '300,000 km/s', '400,000 km/s'], correctAnswer: 2 },
            ],
            'Ciencia y Tecnología': [
              { text: '¿Qué significa la sigla "CPU" en informática?', options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Power Unit', 'Core Processing Utility'], correctAnswer: 0 },
              { text: '¿Quién es considerado el padre de la computación teórica y pionero de la IA?', options: ['Nikola Tesla', 'Alan Turing', 'Thomas Edison', 'Steve Jobs'], correctAnswer: 1 },
              { text: '¿Qué lenguaje es el estándar para estructurar páginas web en internet?', options: ['Python', 'C++', 'HTML', 'Java'], correctAnswer: 2 },
              { text: '¿Qué tecnología inalámbrica de corto alcance conecta auriculares y periféricos?', options: ['Wi-Fi', 'Infrarrojo', 'Bluetooth', 'Satélite'], correctAnswer: 2 },
              { text: '¿En qué año se lanzó el primer iPhone transformando la industria móvil?', options: ['2005', '2007', '2009', '2011'], correctAnswer: 1 },
            ],
            'Música': [
              { text: '¿Cuántas notas musicales naturales existen en la escala diatónica básica?', options: ['5 notas', '7 notas', '8 notas', '12 notas'], correctAnswer: 1 },
              { text: '¿Qué instrumento de viento-madera utiliza una lengüeta doble?', options: ['Flauta traversa', 'Clarinete', 'Oboe', 'Saxofón'], correctAnswer: 2 },
              { text: '¿Quién compuso la famosa "Quinta Sinfonía" y "Para Elisa"?', options: ['Wolfgang Amadeus Mozart', 'Ludwig van Beethoven', 'Johann Sebastian Bach', 'Frédéric Chopin'], correctAnswer: 1 },
              { text: '¿Qué símbolo musical al inicio del pentagrama indica la altura de las notas?', options: ['Clave', 'Compás', 'Silencio', 'Calderón'], correctAnswer: 0 },
              { text: '¿A qué familia de instrumentos pertenece el piano?', options: ['Viento', 'Cuerda percutida', 'Percusión simple', 'Cuerda frotada'], correctAnswer: 1 },
            ],
          };

          for (const cat of createdCats) {
            const list = questionsByCat[cat.name] || [];
            const qDocs = list.map(q => ({ ...q, category: cat._id, createdBy: superAdmin._id }));
            if (qDocs.length > 0) {
              await Question.insertMany(qDocs);
            }
          }
          console.log('🎉 Auto-seed completado: categorías y preguntas listas.');
        }
      } catch (migError) {
        console.error('⚠️ Error al ejecutar la migración automática de usuarios:', migError.message);
      }
      global.lastDbError = null;

      // 🔄 Inicializar Sincronización Dual con MongoDB Atlas en paralelo
      try {
        const syncService = require('../services/syncService');
        syncService.init();
      } catch (syncErr) {
        console.warn('⚠️ No se pudo inicializar syncService:', syncErr.message);
      }
    } catch (error) {
      global.lastDbError = error.message;
      console.error(`❌ Error de conexión a MongoDB: ${error.message}`);
      console.log('🔄 Reintentando conectar a MongoDB en 5 segundos...');
      setTimeout(attemptConnect, 5000);
    }
  };

  attemptConnect();
};

module.exports = connectDB;
