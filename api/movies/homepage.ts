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
  timeout: 10000,
});

// Backend: Read Access Token for Bearer authentication
const TMDB_READ_ACCESS_TOKEN = process.env.TMDB_READ_ACCESS_TOKEN || process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Number of items per category to fetch full details for (visible on initial render)
const ITEMS_TO_ENRICH = 6;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // HTTP Caching - cache at edge for 5 mins, serve stale for 10 mins while revalidating
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!TMDB_READ_ACCESS_TOKEN) {
    return res.status(500).json({
      error: 'TMDB Read Access Token not configured',
      message: 'Please set TMDB_READ_ACCESS_TOKEN in environment variables'
    });
  }

  try {
    log('🚀 Fetching aggregated homepage data (optimized)...');

    const requests = {
      trending: '/trending/all/week?language=en-US',
      topRated: '/movie/top_rated?language=en-US',
      action: '/discover/movie?with_genres=28',
      comedy: '/discover/movie?with_genres=35',
      horror: '/discover/movie?with_genres=27',
      romance: '/discover/movie?with_genres=10749',
      documentaries: '/discover/movie?with_genres=99',
      upcomingMovies: '/movie/upcoming?language=en-US',
      upcomingTV: '/tv/on_the_air?language=en-US',
      // Multi-language content
      hindiMovies: '/discover/movie?with_original_language=hi&sort_by=popularity.desc',
    };

    const listPromises = Object.entries(requests).map(async ([key, url]) => {
      try {
        const response = await axios.get(`${TMDB_BASE_URL}${url}`, {
          headers: { Authorization: `Bearer ${TMDB_READ_ACCESS_TOKEN}` },
          httpsAgent: tmdbAgent,
          timeout: 8000
        });
        log(`✅ ${key}: fetched ${response.data.results?.length || 0} items`);
        return { key, results: response.data.results || [] };
      } catch (e: any) {
        logError(`❌ Failed to fetch list ${key}:`, e.message);
        return { key, results: [] };
      }
    });

    const listsResults = await Promise.all(listPromises);
    const listsMap: Record<string, any[]> = {};
    listsResults.forEach(({ key, results }) => { listsMap[key] = results; });

    const itemsToEnrich = new Map<number, { id: number; type: 'tv' | 'movie' }>();
    
    Object.values(listsMap).forEach(list => {
      list.slice(0, ITEMS_TO_ENRICH).forEach(item => {
        if (!itemsToEnrich.has(item.id)) {
          const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
          itemsToEnrich.set(item.id, { id: item.id, type });
        }
      });
    });

    log(`📊 Enriching ${itemsToEnrich.size} items (first ${ITEMS_TO_ENRICH} per category)`);

    const detailPromises = Array.from(itemsToEnrich.values()).map(async ({ id, type }) => {
      try {
        const endpoint = type === 'tv' ? `/tv/${id}` : `/movie/${id}`;
        const response = await axios.get(`${TMDB_BASE_URL}${endpoint}?append_to_response=images`, {
          headers: { Authorization: `Bearer ${TMDB_READ_ACCESS_TOKEN}` },
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

    // Combine upcoming movies and TV into a single "upcoming" list
    finalData.upcoming = [
      ...(finalData.upcomingMovies || []),
      ...(finalData.upcomingTV || [])
    ].sort(() => Math.random() - 0.5); // Shuffle mixed content

    // Combine language-specific content
    finalData.hindi = [
      ...(finalData.hindiMovies || []),
      ...(finalData.hindiTV || [])
    ].sort(() => Math.random() - 0.5);

    finalData.korean = [
      ...(finalData.koreanMovies || []),
      ...(finalData.koreanTV || [])
    ].sort(() => Math.random() - 0.5);

    finalData.japanese = [
      ...(finalData.japaneseMovies || []),
      ...(finalData.japaneseTV || [])
    ].sort(() => Math.random() - 0.5);

    log('✅ Homepage data ready (optimized)');
    return res.status(200).json(finalData);
  } catch (error: any) {
    logError('Homepage Error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch homepage data' });
  }
}
