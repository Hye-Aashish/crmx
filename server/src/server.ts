import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './config/database';
import { connectMongoDB } from './config/mongodb';
import apiRouter from './routes/api';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';

function resolveCorsOrigin(): boolean | string | string[] {
  const raw = process.env.CLIENT_URL?.trim();
  if (raw) {
    const list = raw.split(',').map((s) => s.trim()).filter(Boolean);
    return list.length === 1 ? list[0] : list;
  }
  if (isProd) {
    console.warn('⚠️  CLIENT_URL is not set — CORS will deny browser origins in production.');
    return false;
  }
  // Local dev defaults
  return ['http://localhost:5173', 'http://127.0.0.1:5173'];
}

app.use(
  cors({
    origin: resolveCorsOrigin(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(express.json({ limit: '100kb' }));

initDatabase();

connectMongoDB().catch((err) => {
  console.error('MongoDB startup error:', err);
});

app.use('/api', apiRouter);

app.listen(PORT, () => {
  console.log(`🚀 CRM Backend Server running at http://localhost:${PORT}`);
});
