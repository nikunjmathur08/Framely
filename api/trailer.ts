import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import https from 'https';

const tmdbAgent = new https.Agent({
  keepAlive: true,
  family: 4,
  timeout: 10000,
});

const TMDB_READ_ACCESS_TOKEN = process.env.TMDB_READ_ACCESS_TOKEN || process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!TMDB_READ_ACCESS_TOKEN) {
    return res.status(500).json({
      error: 'TMDB Read Access Token not configured',
      message: 'Please set TMDB_READ_ACCESS_TOKEN in environment variables'
    });
  }

  // Extract type and id from query or path
  const { type, id } = req.query;

  if (!type || !id) {
    return res.status(400).json({ 
      error: 'Missing parameters', 
      message: 'Both type and id are required' 
    });
  }

  if (!['movie', 'tv'].includes(type as string)) {
    return res.status(400).json({ 
      error: 'Invalid type', 
      message: 'Type must be "movie" or "tv"' 
    });
  }

  try {
    console.log(`🎬 Fetching trailer for ${type}/${id}...`);
    
    const response = await axios.get(`${TMDB_BASE_URL}/${type}/${id}/videos`, {
      params: { language: 'en-US' },
      headers: { Authorization: `Bearer ${TMDB_READ_ACCESS_TOKEN}` },
      httpsAgent: tmdbAgent,
      timeout: 8000
    });

    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Trailer fetch error:', error.message);
    
    if (error.response) {
      return res.status(error.response.status).json({
        error: 'TMDB API Error',
        message: error.response.data?.status_message || error.message
      });
    }
    
    return res.status(500).json({
      error: 'Failed to fetch trailer',
      message: error.message
    });
  }
}
