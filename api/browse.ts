import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import https from 'https';

// Inline logger to avoid external import bundling issues on Vercel
const isDev = process.env.NODE_ENV === 'development';
const log = (...args: unknown[]) => { if (isDev) console.log(...args); };
const logError = (...args: unknown[]) => { console.error(...args); };

const tmdbAgent = new https.Agent({
  keepAlive: true,
  family: 4,
  timeout: 15000,
});

const TMDB_READ_ACCESS_TOKEN = process.env.TMDB_READ_ACCESS_TOKEN || process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Helper function to enrich items with details (images)
async function enrichWithDetails(items: any[], type: 'tv' | 'movie'): Promise<any[]> {
  const uniqueIds = [...new Set(items.map(item => item.id))];
  
  const detailPromises = uniqueIds.map(async (id) => {
    try {
      const endpoint = type === 'tv' ? `/tv/${id}` : `/movie/${id}`;
      const response = await axios.get(`${TMDB_BASE_URL}${endpoint}?append_to_response=images`, {
        headers: { Authorization: `Bearer ${TMDB_READ_ACCESS_TOKEN}` },
        httpsAgent: tmdbAgent,
        timeout: 10000
      });
      return response.data;
    } catch (e: any) {
      return null;
    }
  });

  const details = await Promise.all(detailPromises);
  const detailsMap = new Map();
  details.forEach(detail => {
    if (detail) detailsMap.set(detail.id, detail);
  });

  return items.map(item => detailsMap.get(item.id) || item);
}

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

  // Determine category from query param
  const { category } = req.query;
  const cat = (category as string) || 'tv';

  try {
    log(`📺 Fetching ${cat} browse data...`);
    
    let requests: Record<string, string> = {};
    let mediaType: 'tv' | 'movie' = 'tv';
    
    if (cat === 'tv') {
      mediaType = 'tv';
      requests = {
        trending: '/trending/tv/week?language=en-US',
        topRated: '/tv/top_rated?language=en-US',
        action: '/discover/tv?with_genres=10759', // Action & Adventure
        comedy: '/discover/tv?with_genres=35',
        horror: '/discover/tv?with_genres=80', // Crime
        romance: '/discover/tv?with_genres=18', // Drama
        documentaries: '/discover/tv?with_genres=10765', // Sci-Fi & Fantasy
      };
    } else if (cat === 'movies') {
      mediaType = 'movie';
      requests = {
        trending: '/trending/movie/week?language=en-US',
        topRated: '/movie/top_rated?language=en-US',
        action: '/discover/movie?with_genres=28',
        comedy: '/discover/movie?with_genres=35',
        horror: '/discover/movie?with_genres=27',
        romance: '/discover/movie?with_genres=10749',
        documentaries: '/discover/movie?with_genres=99',
      };
    } else if (cat === 'popular') {
      // For popular, fetch both movies and TV
      const [popMovies, popTV, trendMovies, trendTV] = await Promise.all([
        axios.get(`${TMDB_BASE_URL}/movie/popular`, {
          headers: { Authorization: `Bearer ${TMDB_READ_ACCESS_TOKEN}` },
          httpsAgent: tmdbAgent, timeout: 10000
        }),
        axios.get(`${TMDB_BASE_URL}/tv/popular`, {
          headers: { Authorization: `Bearer ${TMDB_READ_ACCESS_TOKEN}` },
          httpsAgent: tmdbAgent, timeout: 10000
        }),
        axios.get(`${TMDB_BASE_URL}/trending/movie/week`, {
          headers: { Authorization: `Bearer ${TMDB_READ_ACCESS_TOKEN}` },
          httpsAgent: tmdbAgent, timeout: 10000
        }),
        axios.get(`${TMDB_BASE_URL}/trending/tv/week`, {
          headers: { Authorization: `Bearer ${TMDB_READ_ACCESS_TOKEN}` },
          httpsAgent: tmdbAgent, timeout: 10000
        }),
      ]);

      // Enrich movies and TV separately
      const enrichedPopMovies = await enrichWithDetails(popMovies.data.results || [], 'movie');
      const enrichedPopTV = await enrichWithDetails(popTV.data.results || [], 'tv');
      const enrichedTrendMovies = await enrichWithDetails(trendMovies.data.results || [], 'movie');
      const enrichedTrendTV = await enrichWithDetails(trendTV.data.results || [], 'tv');

      return res.status(200).json({
        trending: enrichedPopMovies,
        topRated: enrichedPopTV,
        action: enrichedTrendMovies,
        comedy: enrichedTrendTV,
        horror: [],
        romance: [],
        documentaries: []
      });
    }

    // Fetch all lists
    const listPromises = Object.entries(requests).map(async ([key, url]) => {
      try {
        const response = await axios.get(`${TMDB_BASE_URL}${url}`, {
          headers: { Authorization: `Bearer ${TMDB_READ_ACCESS_TOKEN}` },
          httpsAgent: tmdbAgent,
          timeout: 10000
        });
        return { key, results: response.data.results || [] };
      } catch (e: any) {
        logError(`Failed to fetch ${cat} list ${key}:`, e.message);
        return { key, results: [] };
      }
    });

    const listsResults = await Promise.all(listPromises);
    const listsMap: Record<string, any[]> = {};
    listsResults.forEach(({ key, results }) => { listsMap[key] = results; });

    // Enrich all items with details (images)
    const allItems = Object.values(listsMap).flat();
    const enrichedItems = await enrichWithDetails(allItems, mediaType);
    const enrichedMap = new Map(enrichedItems.map(item => [item.id, item]));

    // Rebuild lists with enriched data
    const finalData: any = {};
    Object.keys(listsMap).forEach(key => {
      finalData[key] = listsMap[key].map(item => enrichedMap.get(item.id) || item);
    });

    return res.status(200).json(finalData);
  } catch (error: any) {
    logError('Browse Error:', error.message);
    return res.status(500).json({ error: `Failed to fetch ${cat} data` });
  }
}
