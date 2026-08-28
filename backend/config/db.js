const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB conectado: ${conn.connection.host}`);

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
    // Evitar process.exit(1) para mantener el servidor web activo y reportar en los logs
  }
};

module.exports = connectDB;
