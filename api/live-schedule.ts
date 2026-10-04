import { VercelRequest, VercelResponse } from '@vercel/node';
import channelData from '../channels.json';

interface Channel {
  id: string;
  channelName: string;
  logoUrl?: string;
  category?: string;
  status?: string;
}

const LOGO_BASE = 'https://cinevid.st';

// Channel list is bundled from channels.json (cinevid.st blocks server-side requests).
const channels: Channel[] = (channelData.channels as any[])
  .filter((item) => item.id && item.name && item.status !== 'offline')
  .map((item) => ({
    id: String(item.id),
    channelName: item.name,
    logoUrl: item.logo ? new URL(item.logo, LOGO_BASE).toString() : undefined,
    category: item.category,
    status: item.status,
  }));

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=86400');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  return res.status(200).json(channels);
}
