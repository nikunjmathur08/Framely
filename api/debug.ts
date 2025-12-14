// Only for Vercel/Serverless environment debugging
import app from '../server/server';
import { Request, Response } from 'express';

app.get('/api/debug-env', (req: Request, res: Response) => {
  const envCheck = {
    NODE_ENV: process.env.NODE_ENV,
    HAS_TMDB_KEY: !!process.env.TMDB_API_KEY,
    HAS_VITE_TMDB_KEY: !!process.env.VITE_TMDB_API_KEY,
    TMDB_KEY_PREFIX: process.env.TMDB_API_KEY ? process.env.TMDB_API_KEY.substring(0, 5) : 'N/A',
    VITE_TMDB_KEY_PREFIX: process.env.VITE_TMDB_API_KEY ? process.env.VITE_TMDB_API_KEY.substring(0, 5) : 'N/A',
  };
  res.json(envCheck);
});

export default app;
