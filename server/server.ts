import express, { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';
import https from 'https';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { liveScheduleHandler } from './liveScheduleHandler.js';

// Load .env for local development (not used in Vercel)
// override: true ensures server/.env values take precedence over any root .env
// already loaded by the runtime (e.g. Bun auto-loads root .env on startup).
dotenv.config({ path: 'server/.env', override: true });

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
// ONLY use the JWT Bearer token from server/.env — never fall back to VITE_TMDB_API_KEY
// (which is a v3 API key and cannot be used as a Bearer token).
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const ITEMS_TO_ENRICH = 6;

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
    apiKeyConfigured: !!TMDB_API_KEY,
    // Show first 12 chars of key to verify correct token is loaded (JWT starts with 'eyJ')
    apiKeyPrefix: TMDB_API_KEY ? TMDB_API_KEY.substring(0, 12) + '...' : null,
  });
});

// Endpoint to fetch ALL homepage data in one go
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

    const itemsToEnrich = new Map<number, { id: number; type: 'tv' | 'movie' }>();
    
    Object.values(listsMap).forEach(list => {
      list.slice(0, ITEMS_TO_ENRICH).forEach(item => {
        if (!itemsToEnrich.has(item.id)) {
          const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
          itemsToEnrich.set(item.id, { id: item.id, type });
        }
      });
    });

    logger.log(`📊 Enriching ${itemsToEnrich.size} items (first ${ITEMS_TO_ENRICH} per category)`);

    const detailPromises = Array.from(itemsToEnrich.values()).map(async ({ id, type }) => {
        try {
            const endpoint = type === 'tv' ? `/tv/${id}` : `/movie/${id}`;
            const appendFields = type === 'tv'
              ? 'images,keywords,content_ratings'
              : 'images,keywords,release_dates';
            const response = await retryAxiosRequest(() =>
              axios.get(`${TMDB_BASE_URL}${endpoint}?append_to_response=${appendFields}`, {
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

// Helper function to enrich items with full details (images only - optimized)
async function enrichWithDetails(items: any[], type: 'tv' | 'movie', limit: number = ITEMS_TO_ENRICH): Promise<any[]> {
  // OPTIMIZATION: Only enrich first N items (visible on initial viewport)
  const itemsToEnrich = items.slice(0, limit);
  const uniqueIds = [...new Set(itemsToEnrich.map(item => item.id))];
  
  const detailPromises = uniqueIds.map(async (id) => {
    try {
      const endpoint = type === 'tv' ? `/tv/${id}` : `/movie/${id}`;
      const appendFields = type === 'tv'
        ? 'images,keywords,content_ratings'
        : 'images,keywords,release_dates';
      const response = await retryAxiosRequest(() =>
        axios.get(`${TMDB_BASE_URL}${endpoint}?append_to_response=${appendFields}`, {
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

// ── Live TV Schedule ─────────────────────────────────────────────────────────
app.get('/api/live-schedule', liveScheduleHandler);

// ── Player Proxy (strips X-Frame-Options so cinevid.st can be embedded) ──────
const PROXY_ALLOWED_ORIGINS = ['https://cinevid.st', 'https://vidcdn.vip'];
const PROXY_HEADERS_TO_STRIP = new Set([
  'x-frame-options', 'content-security-policy', 'content-security-policy-report-only',
  'cross-origin-embedder-policy', 'cross-origin-opener-policy', 'cross-origin-resource-policy',
  // Node fetch auto-decompresses — forwarding these causes ERR_CONTENT_DECODING_FAILED
  'content-encoding', 'content-length', 'transfer-encoding',
]);

const PROXY_INTERCEPTOR_SCRIPT = `<script>
(function () {
  var PROXY = '/api/proxy?url=';

  function toProxy(url) {
    if (!url || typeof url !== 'string') return url;
    if (url.indexOf('/api/proxy') !== -1 || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('javascript:')) {
      return url;
    }
    try {
      var resolved = new URL(url, document.baseURI || window.location.href).href;
      if (/^https?:\\/\\/(cinevid\\.st|vidcdn\\.vip)/i.test(resolved)) {
        return PROXY + encodeURIComponent(resolved);
      }
      return url;
    } catch (e) {
      return url;
    }
  }

  /* ── fetch ── */
  if (window.fetch) {
    var _fetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      if (typeof input === 'string') {
        return _fetch(toProxy(input), init);
      }
      if (input instanceof URL) {
        return _fetch(toProxy(input.href), init);
      }
      if (input && input.url) {
        var proxied = toProxy(input.url);
        try {
          return _fetch(new Request(proxied, input), init);
        } catch (e) {
          return _fetch(proxied, init);
        }
      }
      return _fetch(input, init);
    };
  }

  /* ── XMLHttpRequest ── */
  if (window.XMLHttpRequest) {
    var _open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      var rest = Array.prototype.slice.call(arguments, 2);
      if (typeof url === 'string') {
        url = toProxy(url);
      }
      return _open.apply(this, [method, url].concat(rest));
    };
  }

  /* ── iframe.src setter & setAttribute ── */
  try {
    var iframeDesc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
    if (iframeDesc && iframeDesc.set) {
      var origSrcSet = iframeDesc.set;
      Object.defineProperty(HTMLIFrameElement.prototype, 'src', {
        get: iframeDesc.get,
        set: function (val) {
          return origSrcSet.call(this, toProxy(val));
        },
        configurable: true,
        enumerable: true
      });
    }

    var origSetAttr = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name, val) {
      if (this instanceof HTMLIFrameElement && name && name.toLowerCase() === 'src') {
        val = toProxy(val);
      }
      return origSetAttr.call(this, name, val);
    };
  } catch (e) {}

  /* ── navigator.sendBeacon ── */
  if (navigator.sendBeacon) {
    var _beacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function (url, data) {
      return _beacon(toProxy(url), data);
    };
  }
})();
</script>`;

app.all('/api/proxy', async (req: Request, res: Response) => {
  const rawUrl = req.query.url as string | undefined;
  const requestId = Math.random().toString(36).slice(2, 8);

  logger.log(`[proxy:${requestId}] Incoming`, {
    method: req.method,
    rawUrl,
    referer: req.headers.referer,
  });

  if (!rawUrl) {
    logger.warn(`[proxy:${requestId}] Rejected — missing ?url=`);
    return res.status(400).send('Missing ?url= parameter');
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
    logger.log(`[proxy:${requestId}] Target`, { origin: target.origin, href: target.href });
  } catch {
    logger.warn(`[proxy:${requestId}] Rejected — invalid URL`);
    return res.status(400).send('Invalid URL');
  }

  if (!PROXY_ALLOWED_ORIGINS.some(o => target.origin === o)) {
    logger.warn(`[proxy:${requestId}] Rejected — origin not allowed: ${target.origin}`);
    return res.status(403).send('Origin not allowed');
  }

  try {
    logger.log(`[proxy:${requestId}] Fetching upstream: ${target.toString()}`);
    const start = Date.now();

    const method = req.method || 'GET';
    let body: any = undefined;
    if (method !== 'GET' && method !== 'HEAD') {
      if (req.body && Object.keys(req.body).length > 0) {
        body = typeof req.body === 'string' || Buffer.isBuffer(req.body)
          ? req.body
          : JSON.stringify(req.body);
      } else {
        const chunks: Buffer[] = [];
        await new Promise<void>((resolve, reject) => {
          req.on('data', (c: Buffer) => chunks.push(c));
          req.on('end', resolve);
          req.on('error', reject);
        });
        if (chunks.length) body = Buffer.concat(chunks);
      }
    }

    const upstream = await fetch(target.toString(), {
      method,
      headers: {
        'User-Agent': (req.headers['user-agent'] as string) || 'Mozilla/5.0',
        'Accept': (req.headers['accept'] as string) || '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': target.origin + '/',
        ...(req.headers['content-type'] ? { 'Content-Type': req.headers['content-type'] as string } : {}),
      },
      ...(body ? { body } : {}),
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    });

    logger.log(`[proxy:${requestId}] Upstream responded`, {
      status: upstream.status, ms: Date.now() - start,
      contentType: upstream.headers.get('content-type'), url: upstream.url,
    });

    const upstreamHeaders: Record<string, string> = {};
    upstream.headers.forEach((v, k) => { upstreamHeaders[k] = v; });
    logger.log(`[proxy:${requestId}] Upstream headers:`, upstreamHeaders);

    res.status(upstream.status);

    const stripped: string[] = [];
    upstream.headers.forEach((value, key) => {
      if (PROXY_HEADERS_TO_STRIP.has(key.toLowerCase())) {
        stripped.push(key);
      } else {
        try { res.setHeader(key, value); } catch { /* skip */ }
      }
    });
    logger.log(`[proxy:${requestId}] Stripped headers:`, stripped);

    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
    res.setHeader('Access-Control-Allow-Origin', '*');

    const contentType = upstream.headers.get('content-type') || '';

    if (contentType.includes('text/html')) {
      let html = await upstream.text();
      logger.log(`[proxy:${requestId}] HTML length: ${html.length}`);

      // 1. Inject <base> so relative asset paths resolve to target origin
      if (/<head/i.test(html)) {
        html = html.replace(/(<head[^>]*>)/i, `$1<base href="${target.origin}/">`);
      } else {
        html = `<base href="${target.origin}/">${html}`;
      }

      // 2. Inject interceptor as the very first script so it runs before any player JS
      if (/<head/i.test(html)) {
        html = html.replace(/(<head[^>]*>(?:<base[^>]*>)?)/i, `$1${PROXY_INTERCEPTOR_SCRIPT}`);
      } else {
        html = PROXY_INTERCEPTOR_SCRIPT + html;
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      logger.log(`[proxy:${requestId}] Sending HTML`);
      return res.send(html);
    }

    const resBody = await upstream.arrayBuffer();
    logger.log(`[proxy:${requestId}] Sending binary ${resBody.byteLength} bytes`);
    return res.send(Buffer.from(resBody));
  } catch (err: any) {
    logger.error(`[proxy:${requestId}] Fetch failed:`, { message: err.message, cause: err.cause?.message });
    return res.status(502).send('Failed to fetch upstream resource');
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
