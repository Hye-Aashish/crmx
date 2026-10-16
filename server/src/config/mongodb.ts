import dns from 'dns';
import mongoose from 'mongoose';
import { db } from './database';

// Configure public DNS servers to resolve MongoDB SRV records reliably
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore in environments where setting DNS servers is not allowed
}

export const ALL_TABLES = [
  'lead_sources',
  'funnel_stages',
  'customers',
  'leads',
  'lead_activities',
  'follow_ups',
  'orders',
  'order_tracking',
  'audit_logs',
  'users',
  'roles',
  'role_permissions',
  'web_forms'
];

interface MongoState {
  isConnected: boolean;
  cluster: string;
  database: string;
  lastSyncTime: string | null;
  syncedTables: Record<string, number>;
  error: string | null;
}

export const mongoState: MongoState = {
  isConnected: false,
  cluster: '',
  database: '',
  lastSyncTime: null,
  syncedTables: {},
  error: null
};

// Generic Mongoose models for each collection
const models: Record<string, mongoose.Model<any>> = {};

function getOrCreateModel(tableName: string): mongoose.Model<any> {
  if (models[tableName]) {
    return models[tableName];
  }
  const schema = new mongoose.Schema({}, { strict: false, timestamps: false, versionKey: false });
  models[tableName] = mongoose.models[tableName] || mongoose.model(tableName, schema, tableName);
  return models[tableName];
}

/**
 * Connect to MongoDB Atlas using MONGODB_URI environment variable
 */
export async function connectMongoDB(): Promise<boolean> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('ℹ️ MONGODB_URI is not defined in environment variables. Running in local SQLite mode.');
    return false;
  }

  try {
    console.log('🔄 Connecting to MongoDB Atlas...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000
    });

    const dbName = mongoose.connection.name || 'crmx';
    const host = mongoose.connection.host || 'cluster0';

    mongoState.isConnected = true;
    mongoState.database = dbName;
    mongoState.cluster = host;
    mongoState.error = null;

    console.log(`✅ MongoDB Atlas connected successfully! (Database: "${dbName}", Host: ${host})`);

    // Initial sync between SQLite and MongoDB
    await initialBidirectionalSync();

    return true;
  } catch (err: any) {
    mongoState.isConnected = false;
    mongoState.error = err.message || String(err);
    console.error('❌ Failed to connect to MongoDB Atlas:', mongoState.error);
    return false;
  }
}

/**
 * Handle initial sync on server boot:
 * 1. If SQLite is fresh/empty but MongoDB has data, populate SQLite from MongoDB.
 * 2. If SQLite has data, mirror and upsert all records into MongoDB Atlas.
 */
async function initialBidirectionalSync() {
  if (!mongoState.isConnected) return;

  try {
    // Check if SQLite users table has records
    const sqliteUserCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any)?.count || 0;
    const mongoUserCol = mongoose.connection.collection('users');
    const mongoUserCount = await mongoUserCol.countDocuments();

    if (sqliteUserCount === 0 && mongoUserCount > 0) {
      console.log('📥 Local SQLite is empty. Restoring data from MongoDB Atlas into SQLite...');
      await syncAllFromMongo();
    } else {
      console.log('📤 Synchronizing CRM data from SQLite into MongoDB Atlas...');
      await syncAllToMongo();
    }
  } catch (syncErr: any) {
    console.error('Initial sync error:', syncErr.message);
  }
}

/**
 * Sync all SQLite tables to MongoDB Atlas
 */
export async function syncAllToMongo(): Promise<Record<string, number>> {
  if (!mongoose.connection.readyState) {
    throw new Error('MongoDB is not connected');
  }

  const results: Record<string, number> = {};

  for (const table of ALL_TABLES) {
    try {
      const rows = db.prepare(`SELECT * FROM ${table}`).all() as any[];
      const col = mongoose.connection.collection(table);

      if (rows.length > 0) {
        const ops = rows.map(r => {
          const idVal = r.id || r.name || `${r.role_slug || ''}_${r.permission || ''}` || String(Date.now());
          return {
            updateOne: {
              filter: { _id: idVal },
              update: { $set: { ...r, _id: idVal } },
              upsert: true
            }
          };
        });

        await col.bulkWrite(ops);
      }

      results[table] = rows.length;
    } catch (err: any) {
      console.error(`Error syncing table ${table} to Mongo:`, err.message);
      results[table] = 0;
    }
  }

  mongoState.lastSyncTime = new Date().toISOString();
  mongoState.syncedTables = results;
  console.log('✅ MongoDB Atlas synchronized:', results);
  return results;
}

/**
 * Restore data from MongoDB Atlas into SQLite
 */
export async function syncAllFromMongo(): Promise<Record<string, number>> {
  if (!mongoose.connection.readyState) {
    throw new Error('MongoDB is not connected');
  }

  const results: Record<string, number> = {};

  for (const table of ALL_TABLES) {
    try {
      const col = mongoose.connection.collection(table);
      const docs = await col.find({}).toArray();

      if (docs.length > 0) {
        // Inspect table columns in SQLite
        const colsInfo = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
        const colNames = colsInfo.map(c => c.name);

        const placeholders = colNames.map(() => '?').join(', ');
        const insertStmt = db.prepare(`INSERT OR REPLACE INTO ${table} (${colNames.join(', ')}) VALUES (${placeholders})`);

        const insertMany = db.transaction((items: any[]) => {
          for (const item of items) {
            const values = colNames.map(colName => {
              const val = item[colName];
              if (val === undefined) return null;
              if (typeof val === 'object' && val !== null) return JSON.stringify(val);
              return val;
            });
            insertStmt.run(...values);
          }
        });

        insertMany(docs);
      }

      results[table] = docs.length;
    } catch (err: any) {
      console.error(`Error restoring ${table} from Mongo:`, err.message);
      results[table] = 0;
    }
  }

  mongoState.lastSyncTime = new Date().toISOString();
  mongoState.syncedTables = results;
  return results;
}

/**
 * Non-blocking live sync helper for individual record mutations
 */
export function syncRecordToMongo(tableName: string, record: any): void {
  if (!mongoose.connection.readyState || !record) return;

  setImmediate(async () => {
    try {
      const col = mongoose.connection.collection(tableName);
      const idVal = record.id || record.name || `${record.role_slug || ''}_${record.permission || ''}` || String(Date.now());
      await col.updateOne(
        { _id: idVal as any },
        { $set: { ...record, _id: idVal } },
        { upsert: true }
      );
    } catch (err: any) {
      console.error(`Background Mongo sync error on ${tableName}:`, err.message);
    }
  });
}

/**
 * Non-blocking deletion helper
 */
export function deleteRecordFromMongo(tableName: string, id: string): void {
  if (!mongoose.connection.readyState || !id) return;

  setImmediate(async () => {
    try {
      const col = mongoose.connection.collection(tableName);
      await col.deleteOne({ _id: id as any });
    } catch (err: any) {
      console.error(`Background Mongo delete error on ${tableName}:`, err.message);
    }
  });
}

/**
 * Get MongoDB real-time health and document counts
 */
export async function getMongoStatus(): Promise<any> {
  const readyStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const stateIndex = mongoose.connection.readyState;
  const statusStr = readyStates[stateIndex] || 'unknown';

  const counts: Record<string, number> = {};
  if (stateIndex === 1) {
    for (const table of ALL_TABLES) {
      try {
        counts[table] = await mongoose.connection.collection(table).countDocuments();
      } catch {
        counts[table] = 0;
      }
    }
  }

  return {
    status: statusStr,
    isConnected: stateIndex === 1,
    database: mongoose.connection.name || 'crmx',
    host: mongoose.connection.host || 'cluster0',
    lastSyncTime: mongoState.lastSyncTime,
    counts,
    error: mongoState.error
  };
}
