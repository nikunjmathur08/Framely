import { Request, Response } from 'express';

interface Channel {
  id: string;
  channelName: string;
  logoUrl?: string;
}

const PROVIDER = 'https://dlive.sx';

export async function liveScheduleHandler(req: Request, res: Response) {
  const providerUrl = process.env.VITE_STREAM_PROVIDER_URL || PROVIDER;

  try {
    const response = await fetch(`${providerUrl}/24-7-channels.php`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`Provider returned ${response.status}`);
    }

    const html = await response.text();
    const channels: Channel[] = [];
    const seenIds = new Set<string>();

    // The page renders channel cards as anchor tags. Each card contains:
    //   <a href="/watch.php?id=302">
    //     <img src="logos/abc_usa.png" ...>
    //     <span>ABC USA</span>
    //     <span>ID: 302</span>
    //   </a>
    //
    // We match the full anchor block, then extract id, logo, and name from within it.
    const cardRegex = /<a[^>]+href=["'](?:[^"']*)?\/watch\.php\?id=(\d+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;

    while ((match = cardRegex.exec(html)) !== null) {
      const id = match[1];
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      const innerHtml = match[2];

      // Try to extract a logo <img src="...">
      let logoUrl: string | undefined;
      const imgMatch = innerHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch) {
        const src = imgMatch[1];
        // Resolve relative paths to absolute
        logoUrl = src.startsWith('http') ? src : `${providerUrl}/${src.replace(/^\//, '')}`;
      }

      // Extract text content (strip all HTML tags)
      const rawText = innerHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      // Text is typically: "Channel Name ID: 302" — take the part before "ID:"
      const channelName = rawText.split(/\s+ID:/i)[0].trim();
      if (!channelName) continue;

      channels.push({ id, channelName, ...(logoUrl ? { logoUrl } : {}) });
    }

    if (channels.length === 0) {
      throw new Error('No channels found — page structure may have changed');
    }

    return res.json(channels);
  } catch (err: any) {
    console.error('[live-schedule] Scrape failed:', err.message);
    return res.status(502).json({ error: 'Failed to fetch channels from provider', details: err.message });
  }
}
