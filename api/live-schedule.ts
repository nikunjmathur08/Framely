import { VercelRequest, VercelResponse } from '@vercel/node';

interface Channel {
  id: string;
  channelName: string;
  logoUrl?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const providerUrl = process.env.VITE_STREAM_PROVIDER_URL || 'https://dlive.sx';

  try {
    const response = await fetch(`${providerUrl}/24-7-channels.php`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) throw new Error(`Provider returned ${response.status}`);

    const html = await response.text();
    const channels: Channel[] = [];
    const seenIds = new Set<string>();

    const cardRegex = /<a[^>]+href=["'](?:[^"']*)?\/watch\.php\?id=(\d+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;

    while ((match = cardRegex.exec(html)) !== null) {
      const id = match[1];
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      const innerHtml = match[2];

      let logoUrl: string | undefined;
      const imgMatch = innerHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch) {
        const src = imgMatch[1];
        logoUrl = src.startsWith('http') ? src : `${providerUrl}/${src.replace(/^\//, '')}`;
      }

      const rawText = innerHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      const channelName = rawText.split(/\s+ID:/i)[0].trim();
      if (!channelName) continue;

      channels.push({ id, channelName, ...(logoUrl ? { logoUrl } : {}) });
    }

    if (channels.length === 0) throw new Error('No channels parsed');

    return res.status(200).json(channels);
  } catch (err: any) {
    console.error('[live-schedule]', err.message);
    return res.status(502).json({ error: 'Failed to fetch channels', details: err.message });
  }
}
