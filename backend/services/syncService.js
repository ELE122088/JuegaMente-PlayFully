const mongoose = require('mongoose');

const ATLAS_DEFAULT_URI = 'mongodb+srv://markarvar1988_db_user:Kieb2xUgmg5MOhoH@cluster0.mrvmafh.mongodb.net/Banco_preguntas?retryWrites=true&w=majority';

class SyncService {
  constructor() {
    this.atlasConn = null;
    this.isAtlasConnected = false;
    this.lastSyncTime = null;
    this.syncStats = {
      usersSynced: 0,
      categoriesSynced: 0,
      questionsSynced: 0,
      lastError: null,
    };
  }

  async init() {
    const atlasUri = process.env.MONGO_ATLAS_URI || process.env.ATLAS_URI || ATLAS_DEFAULT_URI;
    const currentPrimaryHost = (mongoose.connection.host || '').toLowerCase();

    // Si la conexión primaria ya está conectada al clúster de Atlas, no necesitamos duplicarla
    if (currentPrimaryHost.includes('cluster0') || currentPrimaryHost.includes('mongodb.net')) {
      console.log('ℹ️ La base de datos primaria ya está conectada a MongoDB Atlas. Modo Dual en standby.');
      this.isAtlasConnected = true;
      return;
    }

    try {
      console.log('🔄 Inicializando conexión secundaria con MongoDB Atlas...');
      this.atlasConn = mongoose.createConnection(atlasUri, {
        serverSelectionTimeoutMS: 8000,
        tls: true,
        tlsAllowInvalidCertificates: true,
        tlsAllowInvalidHostnames: true,
        family: 4, // Forzar IPv4
      });

      this.atlasConn.on('connected', () => {
        this.isAtlasConnected = true;
        console.log('☁️ [Dual DB] Conexión secundaria a MongoDB Atlas ESTABLECIDA con éxito.');
        // Ejecutar sincronización inicial en segundo plano
        setTimeout(() => this.fullSyncBiDirectional(), 2000);
      });

      this.atlasConn.on('error', (err) => {
        this.isAtlasConnected = false;
        this.syncStats.lastError = err.message;
        console.warn('⚠️ [Dual DB] MongoDB Atlas no disponible en este momento. La app seguirá funcionando con Railway MongoDB.');
      });

      this.atlasConn.on('disconnected', () => {
        this.isAtlasConnected = false;
        console.warn('⚠️ [Dual DB] Conexión con MongoDB Atlas perdida. Intentando reconectar...');
      });
    } catch (error) {
      this.isAtlasConnected = false;
      this.syncStats.lastError = error.message;
      console.warn('⚠️ [Dual DB] No se pudo inicializar conexión con MongoDB Atlas:', error.message);
    }
  }

  // Réplica individual en tiempo real de cualquier documento creado/modificado
  async syncDocument(collectionName, operation, filter, docData) {
    if (!this.isAtlasConnected || !this.atlasConn) {
      return; // Fallback silencioso si Atlas está desconectado
    }

    try {
      const atlasCollection = this.atlasConn.collection(collectionName);

      if (operation === 'insert' || operation === 'create') {
        await atlasCollection.updateOne(
          { _id: docData._id },
          { $set: docData },
          { upsert: true }
        );
      } else if (operation === 'update') {
        await atlasCollection.updateOne(filter, docData, { upsert: true });
      } else if (operation === 'delete') {
        await atlasCollection.deleteOne(filter);
      } else if (operation === 'deleteMany') {
        await atlasCollection.deleteMany(filter);
      }
      console.log(`📡 [Dual DB Sync] Operación "${operation}" replicada a Atlas en "${collectionName}".`);
    } catch (err) {
      console.warn(`⚠️ [Dual DB Sync] Falló réplica a Atlas en "${collectionName}":`, err.message);
    }
  }

  // Sincronización completa bidireccional entre la base primaria (Railway) y Atlas
  async fullSyncBiDirectional() {
    if (!this.isAtlasConnected || !this.atlasConn || !mongoose.connection.readyState) {
      return { success: false, message: 'Atlas o la base primaria no están conectadas' };
    }

    console.log('🔄 [Dual DB] Iniciando sincronización bidireccional completa...');
    const results = { users: 0, categories: 0, questions: 0 };

    try {
      const primaryDB = mongoose.connection.db;
      const atlasDB = this.atlasConn.db;

      const collections = ['users', 'categories', 'questions'];

      for (const colName of collections) {
        const primaryCol = primaryDB.collection(colName);
        const atlasCol = atlasDB.collection(colName);

        // 1. Obtener todos los documentos de ambas bases
        const [primaryDocs, atlasDocs] = await Promise.all([
          primaryCol.find({}).toArray(),
          atlasCol.find({}).toArray(),
        ]);

        const primaryMap = new Map(primaryDocs.map(d => [String(d._id), d]));
        const atlasMap = new Map(atlasDocs.map(d => [String(d._id), d]));

        // 2. Replicar de Primary -> Atlas (los que falten en Atlas)
        for (const pDoc of primaryDocs) {
          await atlasCol.updateOne(
            { _id: pDoc._id },
            { $set: pDoc },
            { upsert: true }
          );
        }

        // 3. Replicar de Atlas -> Primary (los que falten en Primary)
        for (const aDoc of atlasDocs) {
          if (!primaryMap.has(String(aDoc._id))) {
            await primaryCol.updateOne(
              { _id: aDoc._id },
              { $set: aDoc },
              { upsert: true }
            );
          }
        }

        results[colName] = Math.max(primaryDocs.length, atlasDocs.length);
      }

      this.lastSyncTime = new Date();
      this.syncStats.usersSynced = results.users;
      this.syncStats.categoriesSynced = results.categories;
      this.syncStats.questionsSynced = results.questions;

      console.log('✅ [Dual DB] Sincronización completa finalizada:', results);
      return { success: true, results, lastSyncTime: this.lastSyncTime };
    } catch (err) {
      console.error('❌ [Dual DB] Error durante sincronización bidireccional:', err);
      this.syncStats.lastError = err.message;
      return { success: false, error: err.message };
    }
  }

  // Obtener estado en vivo de ambas bases de datos para el panel admin
  async getStatus() {
    let primaryHost = 'Desconocido';
    let primaryCounts = { users: 0, categories: 0, questions: 0 };
    let atlasCounts = { users: 0, categories: 0, questions: 0 };

    if (mongoose.connection.readyState === 1) {
      primaryHost = mongoose.connection.host;
      try {
        const db = mongoose.connection.db;
        primaryCounts.users = await db.collection('users').countDocuments();
        primaryCounts.categories = await db.collection('categories').countDocuments();
        primaryCounts.questions = await db.collection('questions').countDocuments();
      } catch (e) {}
    }

    if (this.isAtlasConnected && this.atlasConn && this.atlasConn.readyState === 1) {
      try {
        const db = this.atlasConn.db;
        atlasCounts.users = await db.collection('users').countDocuments();
        atlasCounts.categories = await db.collection('categories').countDocuments();
        atlasCounts.questions = await db.collection('questions').countDocuments();
      } catch (e) {}
    }

    return {
      primary: {
        connected: mongoose.connection.readyState === 1,
        host: primaryHost,
        counts: primaryCounts,
      },
      atlas: {
        connected: this.isAtlasConnected,
        host: 'cluster0.mrvmafh.mongodb.net (MongoDB Atlas)',
        counts: atlasCounts,
      },
      lastSyncTime: this.lastSyncTime,
      stats: this.syncStats,
    };
  }
}

const syncService = new SyncService();
module.exports = syncService;
