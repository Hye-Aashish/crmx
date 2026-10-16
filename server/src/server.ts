import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './config/database';
import { connectMongoDB, getMongoStatus } from './config/mongodb';
import apiRouter from './routes/api';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Initialize Database & Seed data
initDatabase();

// Connect MongoDB Atlas
connectMongoDB().catch(err => {
  console.error('MongoDB startup error:', err);
});

// Mount API routes
app.use('/api', apiRouter);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const mongo = await getMongoStatus();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: {
      sqlite: 'connected (crm.sqlite)',
      mongodb: mongo.status === 'connected' ? `connected (${mongo.host}/${mongo.database})` : mongo.status,
      mongodbDetails: mongo
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 CRM Backend Server running at http://localhost:${PORT}`);
});
