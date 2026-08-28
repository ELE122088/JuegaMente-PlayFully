# 🚀 Guía Paso a Paso para Pruebas en Postman (Banco de Preguntas)

Esta guía te guiará para importar y probar la API del **Banco de Preguntas** de manera secuencial y automática utilizando Postman. Todas las peticiones coinciden **exactamente 1 a 1** con la colección `Banco_de_Preguntas.postman_collection.json`.

---

## 🛠️ Requisitos Previos

1. **Servidor Backend Corriendo**:
   Asegúrate de que tu servidor backend esté encendido desde la carpeta `backend`:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   *Deberías ver el mensaje:* `🚀 Servidor corriendo con WebSockets en http://localhost:5000` y `✅ Conectado a MongoDB`.

2. **Tener Postman Instalado** (Escritorio o Web).

---

## 📥 Paso 1: Importar la Colección en Postman

1. Abre **Postman**.
2. Haz clic en el botón **Import** (esquina superior izquierda).
3. Arrastra o selecciona el archivo:
   `Banco_de_Preguntas.postman_collection.json` (ubicado en la raíz de este proyecto).
4. Confirma la importación. Verás la colección **"Banco de Preguntas API"** con sus 3 carpetas principales.

---

## ⚙️ Variables de Colección Automatizadas

La colección incluye scripts que capturan y reúsan automáticamente los datos dinámicos:
* `{{baseUrl}}`: URL base de la API (`http://localhost:5000/api`).
* `{{authToken}}`: Token JWT del usuario (se guarda **automáticamente** al hacer Login).
* `{{userId}}`: ID del usuario obtenido al hacer login o listar usuarios.
* `{{categoryId}}`: ID de la materia creada (se guarda **automáticamente** en `2.3 Create Category`).
* `{{roomCode}}`: Código PIN de 6 dígitos autogenerado para salas de examen (se guarda **automáticamente**).
* `{{questionId}}`: ID de la pregunta creada (se guarda **automáticamente** en `3.4 Create Question`).
* `{{scoreId}}`: ID del intento académico en el perfil (se guarda **automáticamente** en `1.6 Save Score`).
* `{{historyId}}`: ID de la nota del estudiante en el ranking (se guarda **automáticamente** en `2.7 Get Category Ranking`).

---

## 🔄 Secuencia de Pruebas 1 a 1 Paso a Paso

---

### 📄 Petición Directa: `0. Test Connection`
* **Método y URL:** `GET http://localhost:5000/`
* **Descripción:** Verifica que el servidor Express y WebSockets estén encendidos y respondiendo.
* **Resultado Esperado:** Código `200 OK` con el mensaje de bienvenida y estado del servicio.

---

### 📁 Carpeta 1: `1. Authentication & Users`

#### 1.1 `Register User (Registrar Estudiante)`
* **Método y URL:** `POST {{baseUrl}}/auth/register`
* **Body (JSON):**
  ```json
  {
    "username": "estudiante_prueba",
    "password": "password123"
  }
  ```
* **Resultado Esperado:** Código `201 Created`. El usuario se registra como estudiante (`role: "user"`) y `adminPin: null`.

#### 1.2 `Login User (Iniciar Sesión)`
* **Método y URL:** `POST {{baseUrl}}/auth/login`
* **Body (JSON):**
  ```json
  {
    "username": "SuperAdmin",
    "password": "admin123"
  }
  ```
* **Resultado Esperado:** Código `200 OK`. El script guarda el token JWT en `{{authToken}}` y el ID del admin en `{{userId}}`.

#### 1.3 `Get Profile (Obtener Perfil)`
* **Método y URL:** `GET {{baseUrl}}/auth/profile` *(Protegido con Token)*
* **Resultado Esperado:** Código `200 OK`. Retorna los datos del usuario autenticado y su historial de partidas.

#### 1.4 `Update Profile (Editar Nombre de Usuario)`
* **Método y URL:** `PUT {{baseUrl}}/auth/profile` *(Protegido con Token)*
* **Body (JSON):**
  ```json
  {
    "username": "SuperAdmin"
  }
  ```
* **Resultado Esperado:** Código `200 OK`. Actualiza el nombre de usuario y devuelve el perfil con un nuevo token JWT renovado.

#### 1.5 `Change Password (Cambiar Contraseña)`
* **Método y URL:** `PUT {{baseUrl}}/auth/change-password` *(Protegido con Token)*
* **Body (JSON):**
  ```json
  {
    "currentPassword": "admin123",
    "newPassword": "admin123"
  }
  ```
* **Resultado Esperado:** Código `200 OK` confirmando la actualización de la contraseña.

#### 1.6 `Upload Profile Image (Subir Foto de Perfil)`
* **Método y URL:** `POST {{baseUrl}}/auth/profile/image` *(Protegido con Token)*
* **Pestaña Body:** Selecciona `form-data`, clave `profileImage`, tipo `File`, selecciona una imagen y haz clic en **Send**.
* **Resultado Esperado:** Código `200 OK` retornando la ruta física del archivo en `/uploads`.

#### 1.7 `Save Score (Guardar Puntuación)`
* **Método y URL:** `POST {{baseUrl}}/auth/score` *(Protegido con Token)*
* **Body (JSON):**
  ```json
  {
    "categoryName": "Programación Web",
    "categoryId": "{{categoryId}}",
    "roomCode": "{{roomCode}}",
    "score": 9,
    "total": 10,
    "percentage": 90,
    "lives": 3,
    "questions": []
  }
  ```
* **Resultado Esperado:** Código `200 OK`. Guarda la partida y almacena el ID del intento en `{{scoreId}}`.

#### 1.8 `Delete Score Item (Eliminar Registro de Historial)`
* **Método y URL:** `DELETE {{baseUrl}}/auth/history/{{scoreId}}` *(Protegido con Token)*
* **Resultado Esperado:** Código `200 OK`. Elimina el registro del historial del usuario autenticado.

#### 1.9 `Verify Admin PIN (Verificar PIN de Docente)`
* **Método y URL:** `POST {{baseUrl}}/auth/verify-pin` *(Protegido con Token)*
* **Body (JSON):** `{"pin": "1234"}`
* **Resultado Esperado:** Código `200 OK` si el usuario tiene rol `admin` y el PIN coincide; si es estudiante, rechaza con `403 Forbidden`.

#### 1.10 `Get All Users (Listar Usuarios - Solo SuperAdmin)`
* **Método y URL:** `GET {{baseUrl}}/auth/users` *(Protegido con Token - Solo SuperAdmin)*
* **Resultado Esperado:** Código `200 OK` con el listado de usuarios gestionables (excluye al SuperAdmin principal).

#### 1.11 `Update User Role (Actualizar Rol / Ascender a Docente)`
* **Método y URL:** `PUT {{baseUrl}}/auth/users/{{userId}}/role` *(Protegido con Token - Solo SuperAdmin)*
* **Body (JSON):**
  ```json
  {
    "role": "admin",
    "adminPin": "1234"
  }
  ```
* **Resultado Esperado:** Código `200 OK`. Asciende al estudiante a Docente / Administrador.

#### 1.12 `Delete User (Eliminar Usuario - Solo SuperAdmin)`
* **Método y URL:** `DELETE {{baseUrl}}/auth/users/{{userId}}` *(Protegido con Token - Solo SuperAdmin)*
* **Resultado Esperado:** Código `200 OK`. Elimina al usuario de la base de datos.

---

### 📁 Carpeta 2: `2. Categories`

#### 2.1 `Get Categories (Obtener Todas las Categorías)`
* **Método y URL:** `GET {{baseUrl}}/categories`
* **Resultado Esperado:** Código `200 OK` con todas las categorías activas.

#### 2.2 `Get My Categories (Obtener Mis Categorías - Solo Admin)`
* **Método y URL:** `GET {{baseUrl}}/categories/mine` *(Protegido con Token - Solo Admin)*
* **Resultado Esperado:** Código `200 OK` con las materias creadas por el docente autenticado.

#### 2.3 `Create Category (Crear Categoría / Examen)`
* **Método y URL:** `POST {{baseUrl}}/categories` *(Protegido con Token - Solo Admin)*
* **Body (JSON):**
  ```json
  {
    "name": "Examen de Programación Web",
    "description": "Evaluación oficial sobre React, Node.js y MongoDB",
    "icon": "💻",
    "color": "#6C63FF",
    "isPublic": false,
    "isActive": true,
    "timePerQuestion": 30
  }
  ```
* **Resultado Esperado:** Código `201 Created`. Guarda `{{categoryId}}` y el PIN generado en `{{roomCode}}`. Emite notificación WebSockets.

#### 2.4 `Get Category By ID (Obtener Categoría por ID)`
* **Método y URL:** `GET {{baseUrl}}/categories/{{categoryId}}`
* **Resultado Esperado:** Código `200 OK` con el detalle de la materia.

#### 2.5 `Get Category By Room Code (Buscar por PIN de Sala)`
* **Método y URL:** `GET {{baseUrl}}/categories/room/{{roomCode}}`
* **Resultado Esperado:** Código `200 OK` si el examen está abierto (`isActive: true`); si está cerrado (`isActive: false`), devuelve `403 Forbidden`.

#### 2.6 `Update Category (Actualizar / Bloquear Examen)`
* **Método y URL:** `PUT {{baseUrl}}/categories/{{categoryId}}` *(Protegido con Token - Solo Admin)*
* **Body (JSON):**
  ```json
  {
    "name": "Examen de Programación Web (Cerrado)",
    "description": "Evaluación final de desarrollo web",
    "icon": "🔒",
    "color": "#10B981",
    "isActive": false,
    "timePerQuestion": 30
  }
  ```
* **Resultado Esperado:** Código `200 OK`. Al poner `isActive: false`, el examen queda bloqueado para nuevos ingresos.

#### 2.7 `Get Category Ranking (Obtener Calificaciones de la Materia)`
* **Método y URL:** `GET {{baseUrl}}/categories/{{categoryId}}/ranking` *(Protegido con Token - Solo Admin)*
* **Resultado Esperado:** Código `200 OK`. Retorna las notas de los alumnos y guarda la primera en `{{historyId}}`.

#### 2.8 `Delete Ranking Item (Eliminar Intento del Ranking)`
* **Método y URL:** `DELETE {{baseUrl}}/categories/{{categoryId}}/ranking/{{historyId}}` *(Protegido con Token - Solo Admin)*
* **Resultado Esperado:** Código `200 OK`. Elimina la nota individual seleccionada.

#### 2.9 `Clear Category Ranking (Vaciar Ranking de la Materia)`
* **Método y URL:** `DELETE {{baseUrl}}/categories/{{categoryId}}/ranking` *(Protegido con Token - Solo Admin)*
* **Resultado Esperado:** Código `200 OK`. Reinicia todas las calificaciones de la materia.

#### 2.10 `Delete Category (Eliminar Categoría)`
* **Método y URL:** `DELETE {{baseUrl}}/categories/{{categoryId}}` *(Protegido con Token - Solo Admin)*
* **Resultado Esperado:** Código `200 OK`. Elimina la categoría y todas sus preguntas asociadas.

---

### 📁 Carpeta 3: `3. Questions`

#### 3.1 `Get Questions By Category (Obtener Preguntas por Categoría)`
* **Método y URL:** `GET {{baseUrl}}/questions/category/{{categoryId}}`
* **Resultado Esperado:** Código `200 OK` con las preguntas vinculadas a la materia.

#### 3.2 `Get Random Questions (Obtener Preguntas Aleatorias para Quiz)`
* **Método y URL:** `GET {{baseUrl}}/questions/random/{{categoryId}}`
* **Resultado Esperado:** Código `200 OK` con preguntas en orden aleatorio para iniciar una partida.

#### 3.3 `Get My Questions (Obtener Mis Preguntas - Solo Admin)`
* **Método y URL:** `GET {{baseUrl}}/questions/mine` *(Protegido con Token - Solo Admin)*
* **Resultado Esperado:** Código `200 OK` con las preguntas creadas por el docente autenticado.

#### 3.4 `Create Question (Crear Pregunta Individual)`
* **Método y URL:** `POST {{baseUrl}}/questions` *(Protegido con Token - Solo Admin)*
* **Body (JSON):**
  ```json
  {
    "text": "¿Qué función cumple el hook useState en React?",
    "options": [
      "Manejar peticiones HTTP",
      "Gestionar el estado local del componente",
      "Crear rutas de navegación",
      "Conectar con la base de datos"
    ],
    "correctAnswer": 1,
    "category": "{{categoryId}}"
  }
  ```
* **Resultado Esperado:** Código `201 Created`. Guarda el ID de la pregunta en `{{questionId}}`.

#### 3.5 `Bulk Create Questions (Carga Masiva de Preguntas JSON)`
* **Método y URL:** `POST {{baseUrl}}/questions/bulk` *(Protegido con Token - Solo Admin)*
* **Body (JSON):**
  ```json
  {
    "categoryId": "{{categoryId}}",
    "questions": [
      {
        "text": "¿Cuál es la función principal de Express en Node.js?",
        "options": [
          "Renderizar HTML nativo",
          "Crear servidores web y APIs REST",
          "Compilar código C++",
          "Gestionar memoria RAM"
        ],
        "correctAnswer": 1
      },
      {
        "text": "¿Qué comando instala paquetes en Node.js?",
        "options": [
          "pip install",
          "composer require",
          "npm install",
          "gem install"
        ],
        "correctAnswer": 2
      }
    ]
  }
  ```
* **Resultado Esperado:** Código `201 Created`. Importa el arreglo de preguntas en lote mediante `insertMany`.

#### 3.6 `Update Question (Actualizar Pregunta)`
* **Método y URL:** `PUT {{baseUrl}}/questions/{{questionId}}` *(Protegido con Token - Solo Admin)*
* **Body (JSON):**
  ```json
  {
    "text": "¿Qué hook de React se usa para manejar estados locales?",
    "options": [
      "useEffect",
      "useState",
      "useMemo",
      "useCallback"
    ],
    "correctAnswer": 1
  }
  ```
* **Resultado Esperado:** Código `200 OK` con los datos de la pregunta actualizados.

#### 3.7 `Delete Question (Eliminar Pregunta)`
* **Método y URL:** `DELETE {{baseUrl}}/questions/{{questionId}}` *(Protegido con Token - Solo Admin)*
* **Resultado Esperado:** Código `200 OK`. Elimina la pregunta de la base de datos.


