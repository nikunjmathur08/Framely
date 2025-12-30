import express, { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';
import https from 'https';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

// Load .env for local development (not used in Vercel)
dotenv.config({ path: 'server/.env' });

// Optimized HTTPS Agent for TMDB connectivity
const tmdbAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 3000,
  maxSockets: 50,
  maxFreeSockets: 10,
  family: 4,
  timeout: 30000,
});

// Import mock data with explicit .js extension for ES module compatibility
import { MOCK_MOVIES } from './mockData.js';

// Helper function to retry axios requests with exponential backoff
async function retryAxiosRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error: any) {
      lastError = error;
      
      // Only retry on network errors (timeouts, connection issues)
      const isNetworkError = 
        error.code === 'ECONNABORTED' || 
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' ||
        error.message?.includes('timeout') ||
        !error.response;
      
      // Don't retry on final attempt or non-network errors
      if (attempt === maxRetries || !isNetworkError) {
        throw lastError;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);
      logger.log(`⏳ Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

const app = express();
const PORT = process.env.PORT || 3001;
const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for development/proxy flexibility
  crossOriginEmbedderPolicy: false,
}));
app.use(cors());
app.use(express.json());

// Rate Limiting
const isDev = process.env.NODE_ENV !== 'production';
const limiter = rateLimit({
  windowMs: isDev ? 1 * 60 * 1000 : 15 * 60 * 1000, // 1 minute in dev, 15 minutes in prod
  max: isDev ? 5000 : 1000, // 5000 requests per minute in dev
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

app.use('/api/', limiter);

// Validation middleware
const validateApiKey = (req: Request, res: Response, next: Function) => {
  if (!TMDB_API_KEY) {
    return res.status(500).json({ 
      error: 'TMDB API key is not configured on the server',
      message: 'Please set TMDB_API_KEY or VITE_TMDB_API_KEY in your environment variables'
    });
  }
  next();
};

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    apiKeyConfigured: !!TMDB_API_KEY 
  });
});

// Endpoint to fetch ALL homepage data in one go (Fix 2: Clean Architecture)
app.get('/api/movies/homepage', validateApiKey, async (req: Request, res: Response) => {
  try {
    logger.log('🚀 Fetching aggregated homepage data...');
    
    // 1. Fetch all lists in parallel
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
      koreanMovies: '/discover/movie?with_original_language=ko&sort_by=popularity.desc',
      koreanTV: '/discover/tv?with_original_language=ko&sort_by=popularity.desc',
    };

    const listPromises = Object.entries(requests).map(async ([key, url]) => {
        try {
            const response = await retryAxiosRequest(() => 
              axios.get(`${TMDB_BASE_URL}${url}`, {
                headers: { Authorization: `Bearer ${TMDB_API_KEY}` },
                httpsAgent: tmdbAgent,
                timeout: 20000 // Increased to 20s
              })
            );
            return { key, results: response.data.results || [] };
        } catch (e: any) {
            logger.error(`Failed to fetch list ${key}:`, e.message);
            return { key, results: [] };
        }
    });

    const listsResults = await Promise.all(listPromises);
    const listsMap: Record<string, any[]> = {};
    listsResults.forEach(({ key, results }) => { listsMap[key] = results; });

    // 2. Collect unique IDs for detail fetching
    const allItems = Object.values(listsMap).flat();
    const uniqueItemsMap = new Map(); // id -> {id, type}
    
    allItems.forEach(item => {
        if (!uniqueItemsMap.has(item.id)) {
            // Determine type if not explicit
            const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
            uniqueItemsMap.set(item.id, { id: item.id, type });
        }
    });

    // 3. Fetch details for every items in parallel
    // We limit concurrency to avoid hitting rate limits too hard if valid
    const detailPromises = Array.from(uniqueItemsMap.values()).map(async ({ id, type }) => {
        try {
            const endpoint = type === 'tv' ? `/tv/${id}` : `/movie/${id}`;
            const response = await retryAxiosRequest(() =>
              axios.get(`${TMDB_BASE_URL}${endpoint}?append_to_response=images,videos,credits,recommendations`, {
                headers: { Authorization: `Bearer ${TMDB_API_KEY}` },
                httpsAgent: tmdbAgent,
                timeout: 20000 // Increased to 20s
              })
            );
            return response.data;
        } catch (e: any) {
            // If detail fetch fails, return partial data (null) or ignore
            return null;
        }
    });

    // Wait for details (Promise.allSettled is safer but mapping null handles rejection inside)
    const detailsResults = await Promise.all(detailPromises);
    const detailsMap = new Map();
    detailsResults.forEach(detail => {
        if (detail) detailsMap.set(detail.id, detail);
    });

    // 4. Hydrate lists with full details
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
    ].sort(() => Math.random() - 0.5);

    // Cleanup intermediate keys if desired, or keep them. keeping them is fine/safer.
    // We send 'upcomingMovies' and 'upcomingTV' too, but frontend will likely just use 'upcoming'

    res.json(finalData);

  } catch (error: any) {
    logger.error('Aggregated Homepage Error:', error.message);
    const isNetworkError = error.code === 'ECONNABORTED' || error.message.includes('timeout');
    
     if (isNetworkError) {
      logger.log('⚠️ Network blocked/timeout. Serving AGGREGATED MOCK DATA.');
      // Construct fallback mock response matching the shape
      const mockResult = {
          trending: MOCK_MOVIES.results,
          topRated: MOCK_MOVIES.results,
          action: MOCK_MOVIES.results,
          comedy: MOCK_MOVIES.results,
          horror: MOCK_MOVIES.results,
          romance: MOCK_MOVIES.results,
          documentaries: MOCK_MOVIES.results,
          upcoming: MOCK_MOVIES.results // Fallback for new row
      };
      return res.json(mockResult);
    }

    res.status(500).json({ error: 'Failed to fetch homepage data' });
  }
});

// Helper function to enrich items with full details (images, etc.)
async function enrichWithDetails(items: any[], type: 'tv' | 'movie'): Promise<any[]> {
  const uniqueIds = [...new Set(items.map(item => item.id))];
  
  const detailPromises = uniqueIds.map(async (id) => {
    try {
      const endpoint = type === 'tv' ? `/tv/${id}` : `/movie/${id}`;
      const response = await retryAxiosRequest(() =>
        axios.get(`${TMDB_BASE_URL}${endpoint}?append_to_response=images`, {
          headers: { Authorization: `Bearer ${TMDB_API_KEY}` },
          httpsAgent: tmdbAgent,
          timeout: 15000
        })
      );
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

// Endpoint for TV Shows browse page (with logos)
app.get('/api/browse/tv', validateApiKey, async (req: Request, res: Response) => {
  try {
    logger.log('📺 Fetching TV Shows browse data...');
    
    const requests = {
      trending: '/trending/tv/week?language=en-US',
      topRated: '/tv/top_rated?language=en-US',
      action: '/discover/tv?with_genres=10759', // Action & Adventure
      comedy: '/discover/tv?with_genres=35',
      horror: '/discover/tv?with_genres=80', // Crime
      romance: '/discover/tv?with_genres=18', // Drama
      documentaries: '/discover/tv?with_genres=10765', // Sci-Fi & Fantasy
    };

    const listPromises = Object.entries(requests).map(async ([key, url]) => {
      try {
        const response = await retryAxiosRequest(() =>
          axios.get(`${TMDB_BASE_URL}${url}`, {
            headers: { Authorization: `Bearer ${TMDB_API_KEY}` },
            httpsAgent: tmdbAgent,
            timeout: 15000
          })
        );
        return { key, results: response.data.results || [] };
      } catch (e: any) {
        logger.error(`Failed to fetch TV list ${key}:`, e.message);
        return { key, results: [] };
      }
    });

    const listsResults = await Promise.all(listPromises);
    const listsMap: Record<string, any[]> = {};
    listsResults.forEach(({ key, results }) => { listsMap[key] = results; });

    // Enrich all items with details (images)
    const allItems = Object.values(listsMap).flat();
    const enrichedItems = await enrichWithDetails(allItems, 'tv');
    const enrichedMap = new Map(enrichedItems.map(item => [item.id, item]));

    // Rebuild lists with enriched data
    const finalData: any = {};
    Object.keys(listsMap).forEach(key => {
      finalData[key] = listsMap[key].map(item => enrichedMap.get(item.id) || item);
    });

    res.json(finalData);
  } catch (error: any) {
    logger.error('TV Browse Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch TV data' });
  }
});

// Endpoint for Movies browse page (with logos)
app.get('/api/browse/movies', validateApiKey, async (req: Request, res: Response) => {
  try {
    logger.log('🎬 Fetching Movies browse data...');
    
    const requests = {
      trending: '/trending/movie/week?language=en-US',
      topRated: '/movie/top_rated?language=en-US',
      action: '/discover/movie?with_genres=28',
      comedy: '/discover/movie?with_genres=35',
      horror: '/discover/movie?with_genres=27',
      romance: '/discover/movie?with_genres=10749',
      documentaries: '/discover/movie?with_genres=99',
    };

    const listPromises = Object.entries(requests).map(async ([key, url]) => {
      try {
        const response = await retryAxiosRequest(() =>
          axios.get(`${TMDB_BASE_URL}${url}`, {
            headers: { Authorization: `Bearer ${TMDB_API_KEY}` },
            httpsAgent: tmdbAgent,
            timeout: 15000
          })
        );
        return { key, results: response.data.results || [] };
      } catch (e: any) {
        logger.error(`Failed to fetch Movie list ${key}:`, e.message);
        return { key, results: [] };
      }
    });

    const listsResults = await Promise.all(listPromises);
    const listsMap: Record<string, any[]> = {};
    listsResults.forEach(({ key, results }) => { listsMap[key] = results; });

    // Enrich all items with details (images)
    const allItems = Object.values(listsMap).flat();
    const enrichedItems = await enrichWithDetails(allItems, 'movie');
    const enrichedMap = new Map(enrichedItems.map(item => [item.id, item]));

    // Rebuild lists with enriched data
    const finalData: any = {};
    Object.keys(listsMap).forEach(key => {
      finalData[key] = listsMap[key].map(item => enrichedMap.get(item.id) || item);
    });

    res.json(finalData);
  } catch (error: any) {
    logger.error('Movies Browse Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch Movies data' });
  }
});

// Endpoint for New & Popular page
app.get('/api/browse/popular', validateApiKey, async (req: Request, res: Response) => {
  try {
    logger.log('🔥 Fetching Popular browse data...');
    
    const [popMovies, popTV, trendMovies, trendTV] = await Promise.all([
      retryAxiosRequest(() => axios.get(`${TMDB_BASE_URL}/movie/popular`, {
        headers: { Authorization: `Bearer ${TMDB_API_KEY}` },
        httpsAgent: tmdbAgent, timeout: 15000
      })),
      retryAxiosRequest(() => axios.get(`${TMDB_BASE_URL}/tv/popular`, {
        headers: { Authorization: `Bearer ${TMDB_API_KEY}` },
        httpsAgent: tmdbAgent, timeout: 15000
      })),
      retryAxiosRequest(() => axios.get(`${TMDB_BASE_URL}/trending/movie/week`, {
        headers: { Authorization: `Bearer ${TMDB_API_KEY}` },
        httpsAgent: tmdbAgent, timeout: 15000
      })),
      retryAxiosRequest(() => axios.get(`${TMDB_BASE_URL}/trending/tv/week`, {
        headers: { Authorization: `Bearer ${TMDB_API_KEY}` },
        httpsAgent: tmdbAgent, timeout: 15000
      })),
    ]);

    // Enrich movies and TV separately
    const enrichedPopMovies = await enrichWithDetails(popMovies.data.results || [], 'movie');
    const enrichedPopTV = await enrichWithDetails(popTV.data.results || [], 'tv');
    const enrichedTrendMovies = await enrichWithDetails(trendMovies.data.results || [], 'movie');
    const enrichedTrendTV = await enrichWithDetails(trendTV.data.results || [], 'tv');

    res.json({
      trending: enrichedPopMovies,
      topRated: enrichedPopTV,
      action: enrichedTrendMovies,
      comedy: enrichedTrendTV,
      horror: [],
      romance: [],
      documentaries: []
    });
  } catch (error: any) {
    logger.error('Popular Browse Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch Popular data' });
  }
});


// Endpoint to fetch trailer for a specific movie/TV show
app.get('/api/trailer/:type/:id', validateApiKey, async (req: Request, res: Response) => {
  try {
    const { type, id } = req.params;
    
    if (!['movie', 'tv'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be "movie" or "tv"' });
    }

    logger.log(`🎬 Fetching trailer for ${type}/${id}...`);
    
    const response = await retryAxiosRequest(() =>
      axios.get(`${TMDB_BASE_URL}/${type}/${id}/videos`, {
        params: { language: 'en-US' },
        headers: { Authorization: `Bearer ${TMDB_API_KEY}` },
        httpsAgent: tmdbAgent,
        timeout: 20000 // Increased to 20s
      })
    );

    res.json(response.data);
  } catch (error: any) {
    logger.error('Trailer fetch error:', error.message);
    const isNetworkError = error.code === 'ECONNABORTED' || error.message.includes('timeout') || !error.response;
    
    if (isNetworkError) {
      logger.log('⚠️ Network blocked/timeout. Returning empty trailer data.');
      return res.json({ results: [] });
    }
    
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch trailer',
      message: error.message
    });
  }
});


// Generic TMDB proxy endpoint - handles all paths under /api/tmdb/
app.use('/api/tmdb', validateApiKey, async (req: Request, res: Response) => {
  try {
    // Extract the TMDB path from the request path
    // req.path will have the path after /api/tmdb
    const tmdbPath = req.path.substring(1); // Remove leading slash
    
    // Make request to TMDB API with optimized Agent and retry logic
    const response = await retryAxiosRequest(() =>
      axios.get(`${TMDB_BASE_URL}/${tmdbPath}`, {
        params: req.query,  // Forward query params WITHOUT api_key
        headers: {
          Authorization: `Bearer ${TMDB_API_KEY}`,
          'Content-Type': 'application/json;charset=utf-8'
        },
        httpsAgent: tmdbAgent, // Use our optimized network agent
        timeout: 20000         // Request-level timeout (20s)
      })
    );
    
    // Return the TMDB response
    res.json(response.data);
  } catch (error: any) {
    const isNetworkError = error.code === 'ECONNABORTED' || error.message.includes('timeout') || !error.response;
    
    logger.error('TMDB API Error:', {
      url: `${TMDB_BASE_URL}/${req.path.substring(1)}`,
      error: error.message,
      code: error.code,
      usingFallback: isNetworkError
    });

    if (isNetworkError) {
      // ✅ FALLBACK: Return mock data if network is blocked/timeout
      logger.log('⚠️ Network blocked/timeout. Serving MOCK DATA to frontend.');
      return res.json(MOCK_MOVIES);
    }
    
    if (error.response) {
      res.status(error.response.status).json({
        error: 'TMDB API Error',
        message: error.response.data?.status_message || error.message,
      });
    } else {
      res.status(500).json({
        error: 'Server Error',
        message: 'Failed to fetch data from TMDB API'
      });
    }
  }
});

// Start server only if not running in Vercel environment
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    logger.log(`🚀 Backend proxy server running on http://localhost:${PORT}`);
    logger.log(`📡 Proxying TMDB API requests to ${TMDB_BASE_URL}`);
    logger.log(`🔑 API Key configured: ${TMDB_API_KEY ? '✅ Yes' : '❌ No'}`);
    
    if (!TMDB_API_KEY) {
      logger.warn('\n⚠️  WARNING: TMDB_API_KEY environment variable is not set!');
      logger.warn('   Create a .env file in the server directory with:');
      logger.warn('   TMDB_API_KEY=your_api_key_here\n');
    }
  });
}

export default app;
