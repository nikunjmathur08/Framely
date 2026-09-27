import { Request, Response } from 'express';

interface Channel {
  id: string;
  channelName: string;
  logoUrl?: string;
  category?: string;
  status?: string;
}

const PROVIDER = 'https://daddylive.mov';

let cachedChannels: Channel[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export async function liveScheduleHandler(req: Request, res: Response) {
  // Add aggressive cache headers for any proxy/browser
  res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=86400');

  if (cachedChannels && Date.now() - lastCacheTime < CACHE_TTL) {
    return res.json(cachedChannels);
  }

  const providerUrl = process.env.VITE_STREAM_PROVIDER_URL || PROVIDER;

  try {
    const response = await fetch(`${providerUrl}/api/channels`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`Provider returned ${response.status}`);
    }

    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid data format received from provider');
    }

    const channels: Channel[] = data
      .filter((item: any) => item.channel_name && item.url)
      .map((item: any) => {
        // Extract the ID from the URL (e.g. ?id=521 or ?id=stream-144)
        // If we can't parse it easily, fallback to the full URL encoded or a hash.
        let id = '';
        const idMatch = item.url.match(/id=([^&]+)/);
        if (idMatch) {
            id = idMatch[1];
        } else {
            // fallback, generate from name
            id = encodeURIComponent(item.channel_name.toLowerCase().replace(/\s+/g, '-'));
        }
        
        return {
          id: String(id),
          channelName: item.channel_name,
        };
      });

    if (channels.length === 0) {
      throw new Error('No channels parsed from provider');
    }

    cachedChannels = channels;
    lastCacheTime = Date.now();

    return res.json(channels);
  } catch (err: any) {
    console.error('[live-schedule] Fetch failed:', err.message);
    return res.status(502).json({ error: 'Failed to fetch channels from provider', details: err.message });
  }
}
