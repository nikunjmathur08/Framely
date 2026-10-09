#!/usr/bin/env node
/**
 * Fetches the channel list from cinevid.st, writes channels.json and regenerates
 * the inlined data in api/live-schedule.ts.
 *
 * If the network fetch fails (e.g. Cloudflare block), it falls back to the
 * existing channels.json on disk — so you can also use this script purely as a
 * codegen tool after replacing channels.json manually.
 *
 * Optional env: CF_CLEARANCE (cookie value) if Cloudflare challenges the request.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = process.env.CHANNELS_SOURCE_URL || 'https://cinevid.st/api/channels';
const MIN_CHANNELS = 100;
const channelsPath = path.join(root, 'channels.json');

const headers = {
  accept: '*/*',
  referer: 'https://cinevid.st/iptv/',
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};
if (process.env.CF_CLEARANCE) headers.cookie = `cf_clearance=${process.env.CF_CLEARANCE}`;

let data;
let fetched = false;

try {
  const res = await fetch(SOURCE, { headers, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json?.channels)) throw new Error('Response missing channels array');
  data = json;
  fetched = true;
} catch (err) {
  console.warn(`Network fetch failed (${err.message}). Falling back to local channels.json.`);
  if (!fs.existsSync(channelsPath)) {
    console.error('No local channels.json found. Cannot continue.');
    process.exit(1);
  }
  data = JSON.parse(fs.readFileSync(channelsPath, 'utf-8'));
}

if (!Array.isArray(data?.channels) || data.channels.length < MIN_CHANNELS) {
  console.error(`Unexpected data: ${data?.channels?.length ?? 0} channels, expected >= ${MIN_CHANNELS}.`);
  process.exit(1);
}

const rows = data.channels
  .filter((c) => c.id && c.name && c.status !== 'offline')
  .map((c) => [String(c.id), c.name, c.logo || '', c.category || '']);

// Write channels.json only if we fetched fresh data
if (fetched) {
  const nextJson = JSON.stringify(data);
  if (!fs.existsSync(channelsPath) || fs.readFileSync(channelsPath, 'utf8') !== nextJson) {
    fs.writeFileSync(channelsPath, nextJson);
  }
  // Keep public/channels.json in sync (served directly to the browser)
  const publicPath = path.join(root, 'public', 'channels.json');
  fs.writeFileSync(publicPath, nextJson);
}

// Regenerate api/live-schedule.ts
const handler = `import type { VercelRequest, VercelResponse } from '@vercel/node';

interface Channel {
  id: string;
  channelName: string;
  logoUrl?: string;
  category?: string;
  status?: string;
}

const LOGO_BASE = 'https://cinevid.st';

// [id, name, logo, category] — generated from channels.json (cinevid.st blocks server-side requests).
// Regenerated automatically by scripts/update-channels.mjs.
const RAW: [string, string, string, string][] = ${JSON.stringify(rows)};

const channels: Channel[] = RAW.map(([id, channelName, logo, category]) => ({
  id,
  channelName,
  logoUrl: logo ? LOGO_BASE + logo : undefined,
  category: category || undefined,
  status: 'online',
}));

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=86400');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  res.status(200).json(channels);
}
`;
fs.writeFileSync(path.join(root, 'api', 'live-schedule.ts'), handler);

console.log(`Updated: ${rows.length} online channels (of ${data.channels.length})${fetched ? '' : ' [from local file]'}.`);
