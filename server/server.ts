import express, { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';
import https from 'https';
import * as dns from 'dns';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';
import Resolver from 'dns-over-http-resolver';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

// Load .env for local development (not used in Vercel)
dotenv.config({ path: 'server/.env' });

// ✨ DNS-over-HTTPS Resolver to bypass ISP DNS blocking
// Uses Cloudflare's 1.1.1.1 DoH service programmatically
const dohResolver = new Resolver();

// Custom DNS lookup function that uses Cloudflare DoH
async function customDnsLookup(hostname: string, options: any, callback: any) {
  try {
    logger.log(`🔍 DNS-over-HTTPS lookup for: ${hostname}`);
    const addresses = await dohResolver.resolve4(hostname);
    
    if (addresses && addresses.length > 0) {
      const ip = addresses[0];
      logger.log(`✅ Resolved ${hostname} -> ${ip} via Cloudflare DoH`);
      callback(null, ip, 4);
    } else {
      logger.warn(`⚠️ No addresses found for ${hostname}, falling back to system DNS`);
      dns.lookup(hostname, options, callback);
    }
  } catch (error: any) {
    logger.error(`❌ DoH lookup failed for ${hostname}:`, error.message);
    // Fallback to system DNS if DoH fails
    dns.lookup(hostname, options, callback);
  }
}

// Optimized HTTPS Agent for TMDB connectivity with DNS-over-HTTPS
const tmdbAgent = new https.Agent({
  keepAlive: true,
  family: 4, 
  timeout: 10000,
  lookup: customDnsLookup as any, // Use our custom DoH lookup
});

// Import mock data with explicit .js extension for ES module compatibility
import { MOCK_MOVIES } from './mockData.js';

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
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
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
            const response = await axios.get(`${TMDB_BASE_URL}${url}`, {
                 headers: { Authorization: `Bearer ${TMDB_API_KEY}` },
                 httpsAgent: tmdbAgent, timeout: 8000
            });
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
            const response = await axios.get(`${TMDB_BASE_URL}${endpoint}?append_to_response=images,videos,credits,recommendations`, {
                headers: { Authorization: `Bearer ${TMDB_API_KEY}` },
                httpsAgent: tmdbAgent, timeout: 8000
            });
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


// Endpoint to fetch trailer for a specific movie/TV show
app.get('/api/trailer/:type/:id', validateApiKey, async (req: Request, res: Response) => {
  try {
    const { type, id } = req.params;
    
    if (!['movie', 'tv'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be "movie" or "tv"' });
    }

    logger.log(`🎬 Fetching trailer for ${type}/${id}...`);
    
    const response = await axios.get(`${TMDB_BASE_URL}/${type}/${id}/videos`, {
      params: { language: 'en-US' },
      headers: { Authorization: `Bearer ${TMDB_API_KEY}` },
      httpsAgent: tmdbAgent,
      timeout: 8000
    });

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
    
    // Make request to TMDB API with optimized Agent
    const response = await axios.get(`${TMDB_BASE_URL}/${tmdbPath}`, {
      params: req.query,  // Forward query params WITHOUT api_key
      headers: {
        Authorization: `Bearer ${TMDB_API_KEY}`,
        'Content-Type': 'application/json;charset=utf-8'
      },
      httpsAgent: tmdbAgent, // Use our optimized network agent
      timeout: 10000         // Request-level timeout (10s)
    });
    
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
