# 🎙️ Guion de Grabación: Explicación de Base de Datos, WebSockets y Pruebas en Postman

Este guion te servirá de guía paso a paso para grabar tu video explicativo del proyecto. Está dividido por secciones indicando **qué mostrar en pantalla** y **qué decir** en voz alta.

---

## ⏱️ Parte 1: Introducción y Stack Tecnológico (0:00 - 0:50)

### 🖥️ Qué mostrar en pantalla:
* Tu editor de código abierto en `backend/server.js` mostrando la inicialización de Express y Socket.io, o la consola de MongoDB Atlas.

### 🗣️ Qué decir:
> *"Hola a todos. En este video voy a explicar el diseño de la base de datos de nuestra aplicación 'Banco de Preguntas', su integración en tiempo real mediante WebSockets, y cómo validamos todo su funcionamiento a través de Postman.
> 
> Para este proyecto, utilizamos **MongoDB Atlas** en la nube como motor de base de datos NoSQL, conectándonos con el ODM **Mongoose** en Node.js (100% JavaScript). Al ser una base de datos documental, almacenamos la información en documentos JSON estructurados.
> 
> Además, implementamos **Socket.io** en nuestro servidor para notificar cambios en tiempo real a las aplicaciones móviles y web conectadas, optimizando la sincronización del juego sin realizar consultas periódicas innecesarias al servidor."*

---

## ⏱️ Parte 2: Arquitectura de Datos y Relaciones (0:50 - 2:30)

### 🖥️ Qué mostrar en pantalla:
* En tu editor de código, coloca lado a lado `backend/models/Category.js` y `backend/models/User.js`.

### 🗣️ Qué decir:
> *"En nuestro esquema de base de datos, implementamos tanto relaciones **Referenciadas** como documentos **Embebidos**, aprovechando lo mejor de ambos mundos en NoSQL.
> 
> **1. Relaciones Referenciadas (Preguntas y Categorías):**
> Si miramos el esquema de Preguntas (`Question.js`), cada pregunta almacena una referencia (`ObjectId`) al modelo `Category`. Elegimos este modelo referenciado porque una categoría puede tener un volumen muy grande de preguntas independientes. Cargar todas las preguntas incrustadas en un solo documento de categoría sobrecargaría el servidor.
> 
> **2. Propiedades Avanzadas en Categorías (`Category.js`):**
> En nuestro modelo de Categoría incorporamos propiedades clave para el control docente:
> * `isPublic: Boolean` y `roomCode: String`: Diferencia entre salas públicas de práctica (5 vidas) y exámenes privados con PIN de 6 dígitos (3 vidas).
> * `isActive: Boolean (default: true)`: Permite al docente **abrir o cerrar/bloquear el examen** con un solo clic. Si un examen está cerrado (`isActive: false`), el backend bloquea automáticamente el acceso impidiendo que los alumnos rindan la prueba fuera de hora.
> * `timePerQuestion: Number (default: 15)`: Configura el tiempo dinámico por pregunta (10s, 15s, 30s, 60s o 0 para tiempo libre sin límite).
> 
> **3. Documentos Embebidos y Control de Usuarios (`User.js`):**
> Si abrimos `User.js`, vemos que el historial de partidas (`history`) es un array **embebido** dentro del propio documento de Usuario.
> Cada partida guardada almacena el puntaje, porcentaje de aciertos, vidas restantes, `categoryId` y `roomCode`. Elegimos un modelo embebido aquí porque el progreso pertenece exclusivamente al perfil del alumno, permitiendo consultar todo su avance con una sola lectura rápida.
> Además, el modelo incluye `role` ('admin' o 'user') y `adminPin` para el control de acceso al panel docente administrado por el SuperAdmin."*

---

## ⏱️ Parte 3: Demostración Práctica en Postman (2:30 - 4:45)

### 🖥️ Qué mostrar en pantalla:
* Abre **Postman** con la colección **"Banco de Preguntas API"**.

### 🗣️ Qué decir:
> *"Vamos a validar este comportamiento con Postman utilizando nuestra colección automatizada."*

#### Paso A: Autenticación, Subida de Imagen y Cambio de Contraseña (Mostrar en Postman)
* **Qué hacer:** Envía `1.2 Login User (Iniciar Sesión)`. Luego muestra `1.5 Upload Profile Image (Subir Foto de Perfil)` enviando una foto de prueba.
* **Qué decir:** 
  > *"Primero iniciamos sesión para obtener el **Token JWT**, que se guarda automáticamente en la variable `{{authToken}}`.
  > Para mejorar los perfiles de usuario, implementamos `POST /api/auth/profile/image` con Multer. Al enviar la foto en `multipart/form-data`, el backend la almacena físicamente en `/uploads` y actualiza la ruta en MongoDB, borrando la foto anterior automáticamente para ahorrar espacio.
  > También contamos con `1.4 Change Password` (`PUT /api/auth/change-password`) para que los usuarios actualicen su clave verificando la contraseña actual mediante encriptación con Bcrypt."*

#### Paso B: Salas de Examen, Control Activo/Bloqueado y Carga Masiva (Mostrar en Postman)
* **Qué hacer:** 
  1. Envía `2.3 Create Category (Crear Categoría / Examen)` con `"isPublic": false`, `"isActive": true`, `"timePerQuestion": 30` y muestra el `roomCode` generado.
  2. Envía `3.5 Bulk Create Questions (Carga Masiva de Preguntas JSON)` para cargar múltiples preguntas en lote.
  3. Muestra `2.6 Update Category (Actualizar / Bloquear Examen)` cambiando `"isActive": false` y demuestra cómo `2.5 Get Category By Room Code` rechaza el acceso con código `403 Examen Cerrado`.
* **Qué decir:** 
  > *"Creemos una categoría privada de examen. Vean cómo la API genera un PIN de 6 dígitos, asigna 30 segundos por pregunta y la deja en estado activo (`isActive: true`).
  > Para agilizar la creación de cuestionarios, implementamos `POST /api/questions/bulk`, permitiendo importar 10 o 20 preguntas de golpe en un solo arreglo JSON utilizando `insertMany` en Mongoose.
  > Y cuando la hora de evaluación termina, el docente actualiza la materia a `isActive: false`. Al intentar entrar con el PIN, el backend responde con error 403 bloqueando el examen."*

#### Paso C: Guardar Resultados, Rankings y Gestión de Usuarios
* **Qué hacer:** Envía `1.6 Save Score`, luego `2.7 Get Category Ranking` y finalmente `1.9 Get All Users`.
* **Qué decir:** 
  > *"Al completar el quiz, guardamos el resultado con `/api/auth/score`. El docente puede consultar las notas de todos los alumnos ordenadas con `/api/categories/{{categoryId}}/ranking` para descargarlas a Excel.
  > Por último, el SuperAdmin puede gestionar los roles del sistema mediante `1.9 Get All Users` y `1.10 Update User Role` para ascender o degradar profesores con total seguridad."*

---

## ⏱️ Parte 4: WebSockets y Conclusión (4:45 - 5:15)

### 🖥️ Qué mostrar en pantalla:
* Vuelve a tu editor de código o muestra la terminal del backend donde se aprecian los logs de WebSockets (`📡 [WebSocket] Evento emitido`).

### 🗣️ Qué decir:
> *"Finalmente, cada vez que creamos, editamos, cerramos o eliminamos materias, el servidor invoca a Socket.io para emitir el evento `categories:updated` a todos los clientes. Esto permite que los teléfonos celulares y navegadores conectados actualicen la lista de cuestionarios en tiempo real sin tener que recargar la pantalla.
> 
> En resumen, esta arquitectura combina la velocidad de lectura de MongoDB Atlas, la seguridad institucional por roles con JWT, y la reactividad instantánea con WebSockets.
> 
> ¡Muchas gracias por su atención!"*

