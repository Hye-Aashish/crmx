import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './config/database';
import apiRouter from './routes/api';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Initialize Database & Seed data
initDatabase();

// Mount API routes
app.use('/api', apiRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 CRM Backend Server running at http://localhost:${PORT}`);
});
