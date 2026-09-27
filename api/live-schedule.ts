import { VercelRequest, VercelResponse } from '@vercel/node';

interface Channel {
  id: string;
  channelName: string;
  logoUrl?: string;
  category?: string;
  status?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=86400');
  
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const providerUrl = process.env.VITE_STREAM_PROVIDER_URL || 'https://daddylive.mov';

  try {
    const response = await fetch(`${providerUrl}/api/channels`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) throw new Error(`Provider returned ${response.status}`);

    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid data format received from provider');
    }

    const channels: Channel[] = data
      .filter((item: any) => item.channel_name && item.url)
      .map((item: any) => {
        let id = '';
        const idMatch = item.url.match(/id=([^&]+)/);
        if (idMatch) {
            id = idMatch[1];
        } else {
            id = encodeURIComponent(item.channel_name.toLowerCase().replace(/\s+/g, '-'));
        }
        
        return {
          id: String(id),
          channelName: item.channel_name,
        };
      });

    if (channels.length === 0) throw new Error('No channels parsed');

    return res.status(200).json(channels);
  } catch (err: any) {
    console.error('[live-schedule]', err.message);
    return res.status(502).json({ error: 'Failed to fetch channels', details: err.message });
  }
}
