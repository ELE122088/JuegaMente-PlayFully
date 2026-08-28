const mongoose = require('mongoose');

const DEFAULT_MONGO_URI = 'mongodb+srv://markarvar1988_db_user:Kieb2xUgmg5MOhoH@cluster0.mrvmafh.mongodb.net/Banco_preguntas?retryWrites=true&w=majority';

const connectDB = async () => {
  const uri = process.env.MONGO_URI || DEFAULT_MONGO_URI;

  const attemptConnect = async () => {
    try {
      const conn = await mongoose.connect(uri, {
        family: 4,
        serverSelectionTimeoutMS: 8000,
      });
      console.log(`✅ MongoDB conectado exitosamente: ${conn.connection.host}`);

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
      } catch (migError) {
        console.error('⚠️ Error al ejecutar la migración automática de usuarios:', migError.message);
      }
    } catch (error) {
      console.error(`❌ Error de conexión a MongoDB: ${error.message}`);
      console.log('🔄 Reintentando conectar a MongoDB en 5 segundos...');
      setTimeout(attemptConnect, 5000);
    }
  };

  attemptConnect();
};

module.exports = connectDB;
