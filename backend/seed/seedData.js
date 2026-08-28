const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const Category = require('../models/Category');
const Question = require('../models/Question');
const User = require('../models/User');

dotenv.config({ path: require('path').resolve(__dirname, '../.env') });

const categories = [
  {
    name: 'Matemáticas',
    description: 'Preguntas de aritmética, álgebra y geometría básica',
    icon: '🔢',
    color: '#6C63FF',
    isPublic: true,
    gameMode: 'practice',
    initialLives: 5,
    roomCode: null,
  },
  {
    name: 'Historia',
    description: 'Preguntas sobre eventos históricos importantes',
    icon: '🏛️',
    color: '#FF6B6B',
    isPublic: true,
    gameMode: 'practice',
    initialLives: 5,
    roomCode: null,
  },
  {
    name: 'Ciencias',
    description: 'Preguntas sobre biología, química y física',
    icon: '🔬',
    color: '#4ECDC4',
    isPublic: true,
    gameMode: 'practice',
    initialLives: 5,
    roomCode: null,
  },
  {
    name: 'Ciencia y Tecnología',
    description: 'Preguntas sobre informática, internet, robótica e innovación',
    icon: '💻',
    color: '#FFD166',
    isPublic: true,
    gameMode: 'practice',
    initialLives: 5,
    roomCode: null,
  },
  {
    name: 'Música',
    description: 'Preguntas sobre teoría musical, instrumentos, géneros e historia de la música',
    icon: '🎵',
    color: '#DDA0DD',
    isPublic: true,
    gameMode: 'practice',
    initialLives: 5,
    roomCode: null,
  },
];

const questionsData = {
  Matemáticas: [
    {
      text: '¿Cuánto es 15 × 8?',
      options: ['110', '120', '130', '140'],
      correctAnswer: 1,
    },
    {
      text: '¿Cuál es la raíz cuadrada de 144?',
      options: ['10', '11', '12', '14'],
      correctAnswer: 2,
    },
    {
      text: '¿Cuánto es 2³ (2 al cubo)?',
      options: ['4', '6', '8', '16'],
      correctAnswer: 2,
    },
    {
      text: '¿Cuántos grados tiene un triángulo?',
      options: ['90°', '180°', '270°', '360°'],
      correctAnswer: 1,
    },
    {
      text: 'Si x + 5 = 12, ¿cuánto vale x?',
      options: ['5', '6', '7', '8'],
      correctAnswer: 2,
    },
  ],
  Historia: [
    {
      text: '¿En qué año llegó Cristóbal Colón a América?',
      options: ['1400', '1450', '1492', '1500'],
      correctAnswer: 2,
    },
    {
      text: '¿Quién fue el primer presidente de los Estados Unidos?',
      options: ['Thomas Jefferson', 'George Washington', 'Abraham Lincoln', 'John Adams'],
      correctAnswer: 1,
    },
    {
      text: '¿En qué país se originaron los Juegos Olímpicos antiguos?',
      options: ['Italia', 'Egipto', 'Grecia', 'Francia'],
      correctAnswer: 2,
    },
    {
      text: '¿Qué civilización construyó las pirámides de Giza?',
      options: ['Mayas', 'Romanos', 'Egipcios', 'Incas'],
      correctAnswer: 2,
    },
    {
      text: '¿En qué año terminó la Segunda Guerra Mundial?',
      options: ['1943', '1944', '1945', '1946'],
      correctAnswer: 2,
    },
  ],
  Ciencias: [
    {
      text: '¿Cuál es el planeta más cercano al Sol?',
      options: ['Venus', 'Marte', 'Mercurio', 'Tierra'],
      correctAnswer: 2,
    },
    {
      text: '¿Cuál es el símbolo químico del agua?',
      options: ['HO', 'H2O', 'O2H', 'OH2'],
      correctAnswer: 1,
    },
    {
      text: '¿Cuántos huesos tiene el cuerpo humano adulto?',
      options: ['186', '196', '206', '216'],
      correctAnswer: 2,
    },
    {
      text: '¿Qué gas es esencial para la respiración humana?',
      options: ['Nitrógeno', 'Oxígeno', 'Dióxido de carbono', 'Hidrógeno'],
      correctAnswer: 1,
    },
    {
      text: '¿Cuál es la velocidad de la luz en km/s (aproximada)?',
      options: ['100,000 km/s', '200,000 km/s', '300,000 km/s', '400,000 km/s'],
      correctAnswer: 2,
    },
  ],
  'Ciencia y Tecnología': [
    {
      text: '¿Qué significa la sigla "CPU" en informática?',
      options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Power Unit', 'Core Processing Utility'],
      correctAnswer: 0,
    },
    {
      text: '¿Quién es considerado el padre de la computación teórica y pionero de la IA?',
      options: ['Nikola Tesla', 'Alan Turing', 'Thomas Edison', 'Steve Jobs'],
      correctAnswer: 1,
    },
    {
      text: '¿Qué lenguaje es el estándar para estructurar páginas web en internet?',
      options: ['Python', 'C++', 'HTML', 'Java'],
      correctAnswer: 2,
    },
    {
      text: '¿Qué tecnología inalámbrica de corto alcance conecta auriculares y periféricos?',
      options: ['Wi-Fi', 'Infrarrojo', 'Bluetooth', 'Satélite'],
      correctAnswer: 2,
    },
    {
      text: '¿En qué año se lanzó el primer iPhone transformando la industria móvil?',
      options: ['2005', '2007', '2009', '2011'],
      correctAnswer: 1,
    },
  ],
  Música: [
    {
      text: '¿Cuántas notas musicales naturales existen en la escala diatónica básica?',
      options: ['5 notas', '7 notas', '8 notas', '12 notas'],
      correctAnswer: 1,
    },
    {
      text: '¿Qué instrumento de viento-madera utiliza una lengüeta doble?',
      options: ['Flauta traversa', 'Clarinete', 'Oboe', 'Saxofón'],
      correctAnswer: 2,
    },
    {
      text: '¿Quién compuso la famosa "Quinta Sinfonía" y "Para Elisa"?',
      options: ['Wolfgang Amadeus Mozart', 'Ludwig van Beethoven', 'Johann Sebastian Bach', 'Frédéric Chopin'],
      correctAnswer: 1,
    },
    {
      text: '¿Qué símbolo musical al inicio del pentagrama indica la altura de las notas?',
      options: ['Clave', 'Compás', 'Silencio', 'Calderón'],
      correctAnswer: 0,
    },
    {
      text: '¿A qué familia de instrumentos pertenece el piano?',
      options: ['Viento', 'Cuerda percutida', 'Percusión simple', 'Cuerda frotada'],
      correctAnswer: 1,
    },
  ],
};

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB Atlas');

    // Buscar o crear usuario SuperAdmin
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
      console.log('👑 Usuario SuperAdmin creado exitosamente');
    }

    const adminId = superAdmin._id;

    // Limpiar categorías oficiales por nombre y sus preguntas
    const categoryNames = categories.map((c) => c.name);
    const existingCats = await Category.find({ name: { $in: categoryNames } });
    const existingCatIds = existingCats.map((c) => c._id);

    await Question.deleteMany({ category: { $in: existingCatIds } });
    await Category.deleteMany({ name: { $in: categoryNames } });
    console.log('🗑️  Categorías oficiales anteriores limpiadas');

    // Crear categorías oficiales
    const categoriesWithAdmin = categories.map((cat) => ({ ...cat, createdBy: adminId }));
    const createdCategories = await Category.insertMany(categoriesWithAdmin);
    console.log(`📁 ${createdCategories.length} categorías oficiales creadas`);

    // Crear preguntas para cada categoría
    let totalQuestions = 0;
    for (const cat of createdCategories) {
      const questions = questionsData[cat.name].map((q) => ({
        ...q,
        category: cat._id,
        createdBy: adminId,
      }));
      await Question.insertMany(questions);
      totalQuestions += questions.length;
    }
    console.log(`❓ ${totalQuestions} preguntas oficiales creadas`);

    console.log('\n🎉 ¡Seed del SuperAdmin completado exitosamente!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en el seed:', error.message);
    process.exit(1);
  }
};

seedDatabase();
