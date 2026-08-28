# 🧠 JuegaMente (Playfully) - Plataforma Fullstack Gamificada

![React Native](https://img.shields.io/badge/Frontend-React%20Native%20(Expo)-6C63FF?style=for-the-badge&logo=react)
![NodeJS](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-339933?style=for-the-badge&logo=node.js)
![Socket.io](https://img.shields.io/badge/RealTime-Socket.io-010101?style=for-the-badge&logo=socket.io)
![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Atlas-47A248?style=for-the-badge&logo=mongodb)
![JavaScript](https://img.shields.io/badge/Language-100%25%20Pure%20JavaScript-F7DF1E?style=for-the-badge&logo=javascript)

¡Bienvenido a **JuegaMente (Playfully)**! Una solución integral web y móvil diseñada para la evaluación académica interactiva y el aprendizaje gamificado. La plataforma permite a los docentes crear salas de examen privadas con PIN de seguridad, configurar tiempos límite con segundero decreciente, bloquear exámenes cuando finaliza la clase, importar preguntas de forma masiva en formato JSON y exportar calificaciones a Excel/CSV. Los estudiantes disfrutan de una experiencia interactiva con vidas/corazones, retroalimentación táctil (háptica), estadísticas de progreso y 10 temas visuales dinámicos.

El proyecto está desarrollado con una arquitectura desacoplada **100% en JavaScript estándar (`.js`)**, sin dependencias complejas ni tipados rígidos de TypeScript.

---

## 📑 Tabla de Contenidos
1. [📖 Glosario de Siglas y Términos Técnicos](#-glosario-de-siglas-y-términos-técnicos)
2. [🌟 Características Principales](#-características-principales)
3. [🏛️ Arquitectura del Sistema y Tecnologías](#️-arquitectura-del-sistema-y-tecnologías)
4. [👥 Jerarquía de Roles y Seguridad](#-jerarquía-de-roles-y-seguridad)
5. [💾 Modelo de Base de Datos Híbrido (MongoDB)](#-modelo-de-base-de-datos-híbrido-mongodb)
6. [📥 Prerrequisitos de Software](#-prerrequisitos-de-software)
7. [⚙️ Guía de Instalación y Despliegue](#️-guía-de-instalación-y-despliegue)
8. [🌐 Referencia Completa de Endpoints de la API](#-referencia-completa-de-endpoints-de-la-api)
9. [📥 Especificación de Carga Masiva (JSON)](#-especificación-de-carga-masiva-json)
10. [⚡ Sincronización en Tiempo Real (WebSockets)](#-sincronización-en-tiempo-real-websockets)
11. [🧪 Colección y Pruebas Automatizadas en Postman](#-colección-y-pruebas-automatizadas-en-postman)

---

## 📖 Glosario de Siglas y Términos Técnicos

Para facilitar la comprensión y defensa académica del proyecto, a continuación se detallan todas las siglas técnicas utilizadas, con su nombre oficial en inglés, su traducción y su explicación práctica en el sistema:

### 🔐 1. Seguridad y Autenticación
* **JWT (*JSON Web Token* - Token Web en formato JSON):**  
  Estándar abierto (RFC 7519) que define una forma compacta y autónoma de transmitir información segura entre el cliente y el servidor como un objeto JSON firmado digitalmente. En este proyecto se utiliza para mantener las sesiones activas y verificar si el usuario es Estudiante, Docente o SuperAdmin sin consultar la base de datos en cada clic.
* **PIN (*Personal Identification Number* - Número de Identificación Personal):**  
  Clave numérica de seguridad. En la plataforma se emplea en dos niveles: un PIN de 4 dígitos para acceder al panel docente y un PIN de 6 dígitos autogenerado para unirse a salas de examen privadas.
* **Bcrypt (*Blowfish Cryptographic Hash Function* - Función Criptográfica de Hashing):**  
  Algoritmo matemático unidireccional con sal (*salt*) que transforma las contraseñas en cadenas ilegibles antes de guardarlas en MongoDB, protegiendo la información de los usuarios incluso si la base de datos fuera interceptada.

### 🌐 2. Arquitectura Web y Comunicación
* **API (*Application Programming Interface* - Interfaz de Programación de Aplicaciones):**  
  Conjunto de reglas, funciones y endpoints que permiten que la aplicación móvil (React Native) se comunique e intercambie datos con el servidor backend (Node.js/Express).
* **REST (*Representational State Transfer* - Transferencia de Estado Representacional):**  
  Estilo de arquitectura de software para sistemas hipermedia distribuidos. Utiliza los métodos estándar de HTTP (`GET`, `POST`, `PUT`, `DELETE`) para gestionar recursos como usuarios, materias y preguntas de forma predecible y escalable.
* **HTTP / HTTPS (*Hypertext Transfer Protocol / Secure* - Protocolo de Transferencia de Hipertexto Seguro):**  
  Protocolo de comunicación principal de la web que define el formato de las peticiones (*requests*) y respuestas (*responses*) entre cliente y servidor.
* **CORS (*Cross-Origin Resource Sharing* - Intercambio de Recursos de Origen Cruzado):**  
  Mecanismo de seguridad de los navegadores que permite o restringe que aplicaciones alojadas en un dominio/puerto (ej. Expo en el puerto 8081) consuman recursos de otro servidor (ej. Express en el puerto 5000).
* **WebSockets / Socket.io:**  
  Protocolo de comunicación bidireccional y persistente en tiempo real (*full-duplex*). Permite que el servidor envíe notificaciones automáticas a todos los celulares conectados cuando un docente bloquea un examen o crea materias, sin que el alumno tenga que recargar la pantalla.
* **IP (*Internet Protocol* - Protocolo de Internet):**  
  Dirección numérica única que identifica a un dispositivo en una red local o en internet. Permite que la app móvil en tu celular se conecte directamente con el servidor Express corriendo en tu computadora.

### 📄 3. Formatos de Datos y Archivos
* **JSON (*JavaScript Object Notation* - Notación de Objetos de JavaScript):**  
  Formato ligero y legible para humanos utilizado para el intercambio de datos estructurados entre el frontend y el backend, así como para la **Carga Masiva de Preguntas**.
* **CSV (*Comma-Separated Values* - Valores Separados por Comas):**  
  Formato tabular abierto que almacena datos en texto plano separados por comas. Utilizado para exportar los rankings y notas de los alumnos.
* **BOM UTF-8 (*Byte Order Mark - 8-bit Unicode Transformation Format* - Marca de Orden de Bytes en Formato UTF-8):**  
  Firma digital invisible (`\uFEFF`) colocada al inicio del archivo CSV para que programas como Microsoft Excel reconozcan correctamente los acentos, la letra ñ y caracteres en español al abrir las calificaciones.

### 💾 4. Base de Datos y Backend
* **NoSQL (*Not Only SQL* - No Solo SQL / Bases de Datos No Relacionales):**  
  Sistemas de gestión de bases de datos que no utilizan tablas relacionales rígidas ni sentencias SQL tradicionales, sino documentos flexibles en formato BSON/JSON (como MongoDB).
* **ODM (*Object Document Mapper* - Mapeador de Objetos a Documentos):**  
  Herramienta de software (Mongoose) que permite representar y manipular documentos de MongoDB como objetos y modelos de JavaScript en el código del backend con validaciones automáticas.
* **CRUD (*Create, Read, Update, Delete* - Crear, Leer, Actualizar y Eliminar):**  
  Las cuatro operaciones fundamentales y elementales de cualquier sistema de gestión de base de datos.

### 📱 5. Frontend y Experiencia de Usuario
* **SDK (*Software Development Kit* - Kit de Desarrollo de Software):**  
  Conjunto de herramientas, bibliotecas y APIs preconfiguradas que proporciona Expo (SDK 54) para compilar y ejecutar aplicaciones React Native en Android, iOS y Web con acceso al hardware (vibración háptica, almacenamiento local, etc.).
* **UI / UX (*User Interface / User Experience* - Interfaz de Usuario / Experiencia de Usuario):**  
  *UI* corresponde al diseño visual gráfico (botones, colores, tarjetas y 10 temas), mientras que *UX* corresponde a la facilidad, fluidez y satisfacción con la que el estudiante interactúa con la aplicación.

---

## 🌟 Características Principales

### 👨‍🏫 Panel Docente y Administración
* 🔒 **Bloqueo / Cierre de Examen en Vivo:** El docente puede alternar el estado de la sala (`isActive: true/false`) con un solo clic para impedir que alumnos rindan fuera de hora.
* 📥 **Carga Masiva de Preguntas (JSON Bulk Import):** Inserción atómica de decenas de preguntas en un solo paso mediante `Question.insertMany()`.
* 📊 **Ranking en Tiempo Real y Exportación:** Visualización ordenada de notas, descarga directa en archivo `.csv` (compatible con Excel con BOM UTF-8) y botón de copiado de tabla al portapapeles.
* ⏱️ **Segundero Personalizable:** Configuración de tiempo por pregunta (10s, 15s, 30s, 60s o Tiempo Libre) sincronizado en toda la app.
* 👑 **Blindaje de SuperAdmin:** La cuenta maestra del SuperAdmin no puede ser eliminada ni modificada y está excluida del listado visual para evitar errores operativos.
* 🎨 **Galería de más de 55 Íconos Emojis:** Selección categorizada por Ciencias, Deportes, Matemáticas, Arte y Humanidades al crear o editar materias.

### 👨‍🎓 Experiencia del Estudiante (Gamificación)
* ❤️ **Sistema de Vidas y Modos de Juego:** 3 vidas para exámenes formales privados y 5 vidas para salas de práctica libre.
* 📳 **Vibración Háptica en Dispositivos Móviles:** Doble toque ligero al acertar y doble pulso de alerta al fallar o acabarse el tiempo.
* ✏️ **Edición de Perfil:** Permite a los usuarios actualizar su nombre de usuario (`PUT /api/auth/profile`), cambiar su contraseña con Bcrypt y subir su foto de perfil.
* 🎨 **10 Temas Visuales:** Selector interactivo de paletas (*Claro, Oscuro, Esmeralda, Atardecer, Sakura, Océano, Dorado, Púrpura, Neón y Medianoche*).
* 🏷️ **Píldoras de Filtro Rápido:** Filtrado instantáneo en la pantalla de inicio por *Todas*, *Práctica Libre*, *Exámenes con PIN* y *Por Docente*.

---

## 🏛️ Arquitectura del Sistema y Tecnologías

El sistema sigue una arquitectura de tres capas desacopladas con soporte en tiempo real:

```
┌─────────────────────────────────────────────────────────────┐
│                 CLIENTE (Frontend Multiplataforma)          │
│   • React Native + Expo SDK 54 (Android, iOS y Web)         │
│   • Axios con Interceptor de Token JWT                      │
│   • Socket.io Client (Escucha categories:updated)           │
└──────────────────────────────┬──────────────────────────────┘
                               │  HTTP REST / WebSockets
┌──────────────────────────────▼──────────────────────────────┐
│                 SERVIDOR (Backend Node.js / Express)        │
│   • Express Router (/auth, /categories, /questions)         │
│   • Middlewares de Seguridad: protect, adminOnly, superAdmin│
│   • Multer (Almacenamiento físico de imágenes en /uploads)  │
│   • Socket.io Server (Emisión de eventos en vivo)           │
└──────────────────────────────┬──────────────────────────────┘
                               │  Mongoose ODM
┌──────────────────────────────▼──────────────────────────────┐
│                 BASE DE DATOS (MongoDB Atlas en la Nube)    │
│   • Colección Users (Con History embebido)                  │
│   • Colección Categories (Referenciada)                     │
│   • Colección Questions (Referenciada)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 👥 Jerarquía de Roles y Seguridad

| Rol | Registro | Permisos | Acceso a Pantallas |
| :--- | :--- | :--- | :--- |
| **🎓 Estudiante (`user`)** | Libre (`/register`) con `adminPin: null` | Jugar cuestionarios, ingresar a salas por PIN, ver su historial, cambiar foto y nombre de usuario. | Inicio, Quiz, Resultados, Mi Perfil. |
| **👑 Docente (`admin`)** | Promovido por SuperAdmin (se le asigna PIN) | Crear, editar y bloquear exámenes, gestionar banco de preguntas, importar JSON masivo y ver calificaciones. | Inicio, Quiz, Perfil, Panel Docente (`📂 Materias`, `❓ Preguntas`). |
| **🛡️ SuperAdmin** | Cuenta Maestra del Sistema (`isSuperAdmin: true`) | Control total, ascenso de estudiantes a docentes, asignación de PINs, eliminación de cuentas no maestras. | Todas las anteriores + Pestaña `👥 Usuarios`. |

---

## 💾 Modelo de Base de Datos Híbrido (MongoDB)

Aplicamos un **Patrón Híbrido NoSQL**:
1. **Documento Embebido (`History`):** El historial de partidas se incrusta directamente en el documento de `User`. Esto permite que al abrir **Mi Perfil**, todas las notas y estadísticas carguen en **1 sola lectura ultra rápida** sin joins.
2. **Colecciones Referenciadas (`Categories` y `Questions`):** Las preguntas se guardan en su propia colección vinculadas por `category: Category._id`. Esto previene el límite de 16MB de MongoDB y permite la **carga masiva** y selección aleatoria eficiente.

---

## 📥 Prerrequisitos de Software

### 💻 Para la Computadora (Desarrollo)
* **Node.js:** Versión 18 LTS o superior ([Descargar Node.js](https://nodejs.org/)).
* **Git:** Control de versiones ([Descargar Git](https://git-scm.com/)).
* **MongoDB:** Base de datos en la nube (MongoDB Atlas) o local ([MongoDB Community](https://www.mongodb.com/try/download/community)).
* **Postman:** Cliente HTTP para pruebas de API ([Descargar Postman](https://www.postman.com/downloads/)).

### 📱 Para el Celular (Pruebas en Vivo)
* **Android:** [Expo Go en Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent).
* **iOS (iPhone):** [Expo Go en App Store](https://apps.apple.com/es/app/expo-go/id984023095).

---

## ⚙️ Guía de Instalación y Despliegue

### Paso 1: Configurar e Iniciar el Backend

1. Abre una terminal y dirígete a la carpeta `backend`:
   ```bash
   cd backend
   npm install
   ```
2. Crea el archivo `.env` en la raíz de `backend/`:
   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://tu_usuario:tu_password@cluster.mongodb.net/Banco_preguntas?retryWrites=true&w=majority
   JWT_SECRET=secreto_banco_preguntas
   ```
3. Ejecuta la siembra de datos iniciales:
   ```bash
   npm run seed
   ```
4. Inicia el servidor con soporte de WebSockets:
   ```bash
   npm run dev
   ```
   *Salida esperada:* `🚀 Servidor corriendo con WebSockets en http://localhost:5000` y `✅ Conectado a MongoDB`.

---

### Paso 2: Configurar e Iniciar el Frontend

1. Abre una segunda terminal y dirígete a la carpeta `frontend`:
   ```bash
   cd frontend
   npm install
   ```
2. **Detección Automática de IP:**
   * El archivo [`frontend/src/services/api.js`](frontend/src/services/api.js) detecta de forma automática la IP de tu computadora a través del host de Expo Go. Si estás en web, se conecta directamente a `http://localhost:5000`.
3. Inicia la aplicación:
   * **Para Navegador Web:** `npm run web` (Abre en `http://localhost:8081`).
   * **Para Celular:** `npm start` (Escanea el código QR desde la app **Expo Go** conectada a la misma red Wi-Fi).

---

## 🌐 Referencia Completa de Endpoints de la API

### 🔐 1. Autenticación y Usuarios (`/api/auth`)
| Método | Endpoint | Acceso | Descripción |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/auth/register` | Público | Registra un nuevo estudiante (`username`, `password`, `adminPin: null`). |
| `POST` | `/api/auth/login` | Público | Inicia sesión y devuelve token JWT, rol y foto de perfil. |
| `GET` | `/api/auth/profile` | 🔒 Token | Obtiene perfil y el historial embebido del usuario autenticado. |
| `PUT` | `/api/auth/profile` | 🔒 Token | Actualiza el nombre de usuario y devuelve nuevo token renovado. |
| `PUT` | `/api/auth/change-password` | 🔒 Token | Cambia la contraseña verificando la clave actual con Bcrypt. |
| `POST` | `/api/auth/profile/image` | 🔒 Token | Sube foto de perfil física a `/uploads` con Multer. |
| `POST` | `/api/auth/score` | 🔒 Token | Guarda una partida finalizada dentro del arreglo `history` del alumno. |
| `POST` | `/api/auth/verify-pin` | 🔒 Token | Valida el PIN de 4 dígitos para acceder al panel docente. |
| `DELETE` | `/api/auth/history/:scoreId` | 🔒 Token | Elimina una partida individual del historial propio. |
| `GET` | `/api/auth/users` | 🛡️ SuperAdmin | Lista todos los usuarios gestionables (excluye al SuperAdmin principal). |
| `PUT` | `/api/auth/users/:id/role` | 🛡️ SuperAdmin | Asciende a Docente (asigna PIN) o degrada a Estudiante. |
| `DELETE` | `/api/auth/users/:id` | 🛡️ SuperAdmin | Elimina permanentemente a un usuario (protege la cuenta maestra). |

### 📁 2. Categorías y Exámenes (`/api/categories`)
| Método | Endpoint | Acceso | Descripción |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/categories` | 🔒 Token | Lista todas las materias con conteo de preguntas y creador. |
| `GET` | `/api/categories/mine` | 👑 Docente | Lista exclusivamente las materias creadas por el docente autenticado. |
| `GET` | `/api/categories/room/:code` | 🔒 Token | Busca examen por PIN de 6 dígitos (valida `isActive: true`). |
| `GET` | `/api/categories/:id` | 🔒 Token | Obtiene el detalle de una categoría por su ID. |
| `GET` | `/api/categories/:id/ranking` | 👑 Docente | Obtiene el ranking de calificaciones de los alumnos para una materia. |
| `DELETE`| `/api/categories/:id/ranking/:historyId` | 👑 Docente | Elimina un intento individual del ranking de la materia. |
| `DELETE`| `/api/categories/:id/ranking` | 👑 Docente | Vacía por completo la tabla de notas del examen. |
| `POST` | `/api/categories` | 👑 Docente | Crea una materia (`name`, `description`, `icon`, `timePerQuestion`, etc.). |
| `PUT` | `/api/categories/:id` | 👑 Docente | Modifica datos o bloquea/cierra el examen (`isActive: false`). |
| `DELETE`| `/api/categories/:id` | 👑 Docente | Elimina la materia y todas sus preguntas asociadas en cascada. |

### ❓ 3. Banco de Preguntas (`/api/questions`)
| Método | Endpoint | Acceso | Descripción |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/questions` | 🔒 Token | Lista todas las preguntas del sistema. |
| `GET` | `/api/questions/mine` | 👑 Docente | Lista las preguntas creadas por el docente autenticado. |
| `GET` | `/api/questions/category/:categoryId` | 🔒 Token | Obtiene todas las preguntas de una materia específica. |
| `GET` | `/api/questions/random/:categoryId` | 🔒 Token | Obtiene 10 preguntas aleatorias de la materia para iniciar una partida. |
| `POST` | `/api/questions` | 👑 Docente | Registra una pregunta individual con sus 4 opciones y respuesta correcta. |
| `POST` | `/api/questions/bulk` | 👑 Docente | Importa un lote de preguntas masivas en JSON con `insertMany()`. |
| `PUT` | `/api/questions/:id` | 👑 Docente | Actualiza enunciado, opciones o respuesta correcta de una pregunta. |
| `DELETE`| `/api/questions/:id` | 👑 Docente | Elimina una pregunta por su ID. |

---

## 📥 Especificación de Carga Masiva (JSON)

Para utilizar la importación masiva desde la app o vía API (`POST /api/questions/bulk`), el contenido debe ser un arreglo de objetos con exactamente **4 opciones** y el índice de la respuesta correcta (`0, 1, 2 o 3`):

```json
[
  {
    "text": "¿Qué función cumple el hook useState en React?",
    "options": [
      "Manejar peticiones HTTP",
      "Gestionar el estado local del componente",
      "Crear rutas de navegación",
      "Conectar con la base de datos"
    ],
    "correctAnswer": 1
  },
  {
    "text": "¿Cuál es el puerto por defecto en el que corre el servidor backend?",
    "options": [
      "3000",
      "8080",
      "5000",
      "27017"
    ],
    "correctAnswer": 2
  }
]
```

---

## ⚡ Sincronización en Tiempo Real (WebSockets)

El sistema utiliza **Socket.io** para comunicar cambios de forma instantánea:
* **Evento Emitido:** `categories:updated`
* **Cuándo ocurre:** Cuando un docente crea una materia, edita sus datos, presiona **"Cerrar Examen"** (`isActive: false`), elimina una materia o importa preguntas masivas.
* **Comportamiento en Frontend:** Tanto la pantalla principal del estudiante ([`index.js`](frontend/src/app/index.js)) como el panel docente ([`admin.js`](frontend/src/app/admin.js)) escuchan el evento y **recargan su catálogo automáticamente sin necesidad de deslizar la pantalla**.

---

## 🧪 Colección y Pruebas Automatizadas en Postman

El proyecto incluye el archivo **`Banco_de_Preguntas.postman_collection.json`** con las **28 peticiones oficiales** organizadas y con scripts de prueba que encadenan tokens y variables automáticamente:
* `{{baseUrl}}`: URL de la API (`http://localhost:5000/api`).
* `{{authToken}}`: Token JWT guardado automáticamente al hacer login.
* `{{categoryId}}` y `{{roomCode}}`: ID y PIN de sala guardados al crear materias.
* `{{scoreId}}` e `{{historyId}}`: IDs de partidas para pruebas de eliminación.

> 💡 **Guía detallada de pruebas:** Consulta [`POSTMAN_GUIDE.md`](POSTMAN_GUIDE.md) para ver la secuencia completa de pruebas recomendada.
> 💡 **Guía de Exposición:** Consulta [`PRESENTATION_GUIDE.md`](PRESENTATION_GUIDE.md) para ver el guion paso a paso de defensa ante el docente.

---

### 👨‍💻 Créditos y Licencia
Desarrollado como proyecto de evaluación académica de Desarrollo Web Fullstack. Código abierto bajo licencia MIT.


