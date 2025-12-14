import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import https from 'https';

const tmdbAgent = new https.Agent({
  keepAlive: true,
  family: 4,
  timeout: 10000,
});

const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!TMDB_API_KEY) {
    return res.status(500).json({
      error: 'TMDB API key not configured'
    });
  }

  try {
    // Extract the TMDB path from the request
    // For /api/tmdb/trending/all/week, we want everything after /api/tmdb/
    const tmdbPath = (req.url || '').replace('/api/tmdb/', '');
    
    const response = await axios.get(`${TMDB_BASE_URL}/${tmdbPath}`, {
      params: req.query,
      headers: {
        Authorization: `Bearer ${TMDB_API_KEY}`,
        'Content-Type': 'application/json;charset=utf-8'
      },
      httpsAgent: tmdbAgent,
      timeout: 10000
    });

    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error('TMDB API Error:', error.message);
    
    if (error.response) {
      return res.status(error.response.status).json({
        error: 'TMDB API Error',
        message: error.response.data?.status_message || error.message,
      });
    }
    
    return res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch data from TMDB API'
    });
  }
}
