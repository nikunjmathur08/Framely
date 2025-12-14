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
      error: 'TMDB API key not configured',
      message: 'Please set TMDB_API_KEY or VITE_TMDB_API_KEY in environment variables'
    });
  }

  try {
    console.log('🚀 Fetching aggregated homepage data...');

    const requests = {
      trending: '/trending/all/week?language=en-US',
      topRated: '/movie/top_rated?language=en-US',
      action: '/discover/movie?with_genres=28',
      comedy: '/discover/movie?with_genres=35',
      horror: '/discover/movie?with_genres=27',
      romance: '/discover/movie?with_genres=10749',
      documentaries: '/discover/movie?with_genres=99',
    };

    const listPromises = Object.entries(requests).map(async ([key, url]) => {
      try {
        const response = await axios.get(`${TMDB_BASE_URL}${url}`, {
          headers: { Authorization: `Bearer ${TMDB_API_KEY}` },
          httpsAgent: tmdbAgent,
          timeout: 8000
        });
        return { key, results: response.data.results || [] };
      } catch (e: any) {
        console.error(`Failed to fetch list ${key}:`, e.message);
        return { key, results: [] };
      }
    });

    const listsResults = await Promise.all(listPromises);
    const listsMap: Record<string, any[]> = {};
    listsResults.forEach(({ key, results }) => { listsMap[key] = results; });

    const allItems = Object.values(listsMap).flat();
    const uniqueItemsMap = new Map();

    allItems.forEach(item => {
      if (!uniqueItemsMap.has(item.id)) {
        const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
        uniqueItemsMap.set(item.id, { id: item.id, type });
      }
    });

    const detailPromises = Array.from(uniqueItemsMap.values()).map(async ({ id, type }) => {
      try {
        const endpoint = type === 'tv' ? `/tv/${id}` : `/movie/${id}`;
        const response = await axios.get(`${TMDB_BASE_URL}${endpoint}?append_to_response=images,videos,credits,recommendations`, {
          headers: { Authorization: `Bearer ${TMDB_API_KEY}` },
          httpsAgent: tmdbAgent,
          timeout: 8000
        });
        return response.data;
      } catch (e: any) {
        return null;
      }
    });

    const detailsResults = await Promise.all(detailPromises);
    const detailsMap = new Map();
    detailsResults.forEach(detail => {
      if (detail) detailsMap.set(detail.id, detail);
    });

    const finalData: any = {};
    Object.keys(listsMap).forEach(key => {
      finalData[key] = listsMap[key].map((item: any) => detailsMap.get(item.id) || item);
    });

    return res.status(200).json(finalData);
  } catch (error: any) {
    console.error('Homepage Error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch homepage data' });
  }
}
