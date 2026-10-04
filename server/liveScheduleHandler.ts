import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

interface Channel {
  id: string;
  channelName: string;
  logoUrl?: string;
  category?: string;
  status?: string;
}

const LOGO_BASE = 'https://cinevid.st';

// Channel list is read from channels.json at the project root
// (cinevid.st blocks server-side requests).
const CHANNELS_FILE = path.resolve(__dirname, '..', 'channels.json');
const FALLBACK_FILE = path.resolve(process.cwd(), 'channels.json');

let cachedChannels: Channel[] | null = null;

function loadChannels(): Channel[] {
  if (cachedChannels) return cachedChannels;
  const file = fs.existsSync(CHANNELS_FILE) ? CHANNELS_FILE : FALLBACK_FILE;
  const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
  if (!data || !Array.isArray(data.channels)) {
    throw new Error('Invalid channels.json format');
  }
  cachedChannels = data.channels
    .filter((item: any) => item.id && item.name && item.status !== 'offline')
    .map((item: any) => ({
      id: String(item.id),
      channelName: item.name,
      logoUrl: item.logo ? new URL(item.logo, LOGO_BASE).toString() : undefined,
      category: item.category,
      status: item.status,
    }));
  return cachedChannels!;
}

export async function liveScheduleHandler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=86400');

  try {
    return res.json(loadChannels());
  } catch (err: any) {
    console.error('[live-schedule] Load failed:', err.message);
    return res.status(500).json({ error: 'Failed to load channels', details: err.message });
  }
}
