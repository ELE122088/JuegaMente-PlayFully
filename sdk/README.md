# 🎮 JuegaMente SDK (JavaScript / Node.js)

SDK oficial para conectar aplicaciones, plataformas externas, bots y servicios educativos con el ecosistema de **JuegaMente (PlayFully)**.

---

## 🚀 Instalacion

`ash
npm install juegamente-sdk
`

O simplemente importa la carpeta sdk/ en tu proyecto.

---

## 💡 Inicio Rapido

`javascript
const JuegaMenteSDK = require('juegamente-sdk');

const sdk = new JuegaMenteSDK({
  baseUrl: 'http://192.168.1.3:5000' // O tu URL de produccion
});

async function run() {
  // 1. Iniciar Sesion
  const user = await sdk.auth.login('estudiante1', '123456');
  console.log('Bienvenido:', user.username);

  // 2. Obtener Materias
  const categories = await sdk.categories.getAll();
  console.log('Materias activas:', categories);

  // 3. Entrar a una sala de examen por PIN
  const room = await sdk.categories.joinByPin('849201');
  console.log('Sala encontrada:', room.name);

  // 4. Guardar Partida y Puntaje
  await sdk.scores.saveResult({
    category: room._id,
    score: 5,
    totalQuestions: 5,
    percentage: 100,
    timeSpent: 45
  });

  // 5. Ver Ranking en Vivo
  const ranking = await sdk.scores.getRanking(room._id);
  console.log('Top Jugadores:', ranking);
}

run();
`

---

## 📦 Modulos Incluidos

* **sdk.auth**: Autenticacion JWT, registro, perfil, avatar y cambio de contrasena.
* **sdk.categories**: Obtener, crear, editar, eliminar y unirse a salas con PIN.
* **sdk.questions**: Obtener preguntas por materia, creacion individual y carga masiva JSON.
* **sdk.scores**: Registro de partidas, rankings en tiempo real y vaciado de puntajes.
* **sdk.socket**: Conexion a WebSockets en tiempo real para eventos de examen y ranking en vivo.
