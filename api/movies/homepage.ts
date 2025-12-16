import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import https from 'https';

const tmdbAgent = new https.Agent({
  keepAlive: true,
  family: 4,
  timeout: 10000,
});

// Backend: Read Access Token for Bearer authentication
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

  try {
    console.log('🚀 Fetching aggregated homepage data...');
    console.log('Read Access Token source:', 
      process.env.TMDB_READ_ACCESS_TOKEN ? 'TMDB_READ_ACCESS_TOKEN' : 
      process.env.TMDB_API_KEY ? 'TMDB_API_KEY (fallback)' : 'VITE_TMDB_API_KEY (fallback)');
    console.log('Token exists:', !!TMDB_READ_ACCESS_TOKEN);
    console.log('Token prefix:', TMDB_READ_ACCESS_TOKEN ? TMDB_READ_ACCESS_TOKEN.substring(0, 10) : 'N/A');

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
      hindiTV: '/discover/tv?with_original_language=hi&sort_by=popularity.desc',
      koreanMovies: '/discover/movie?with_original_language=ko&sort_by=popularity.desc',
      koreanTV: '/discover/tv?with_original_language=ko&sort_by=popularity.desc',
      japaneseMovies: '/discover/movie?with_original_language=ja&sort_by=popularity.desc',
      japaneseTV: '/discover/tv?with_original_language=ja&sort_by=popularity.desc',
    };

    const listPromises = Object.entries(requests).map(async ([key, url]) => {
      try {
        const response = await axios.get(`${TMDB_BASE_URL}${url}`, {
          headers: { Authorization: `Bearer ${TMDB_READ_ACCESS_TOKEN}` },
          httpsAgent: tmdbAgent,
          timeout: 8000
        });
        console.log(`✅ ${key}: fetched ${response.data.results?.length || 0} items`);
        return { key, results: response.data.results || [] };
      } catch (e: any) {
        console.error(`❌ Failed to fetch list ${key}:`, e.message);
        console.error(`   Status: ${e.response?.status}, Data:`, e.response?.data);
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

    return res.status(200).json(finalData);
  } catch (error: any) {
    console.error('Homepage Error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch homepage data' });
  }
}
