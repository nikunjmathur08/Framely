import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_ORIGINS = ['https://cinevid.st', 'https://vidcdn.vip'];

// Headers that cause frame-blocking or break the proxied response
const HEADERS_TO_STRIP = new Set([
  'x-frame-options',
  'content-security-policy',
  'content-security-policy-report-only',
  'cross-origin-embedder-policy',
  'cross-origin-opener-policy',
  'cross-origin-resource-policy',
  // Node fetch auto-decompresses — forwarding these causes ERR_CONTENT_DECODING_FAILED
  'content-encoding',
  'content-length',
  'transfer-encoding',
]);

/**
 * Injected into every proxied HTML page.
 * Monkey-patches fetch + XHR + iframe.src so all requests (relative and absolute)
 * made by the player JS or embedded iframes route through /api/proxy instead
 * of hitting cinevid.st directly from the browser (which would be CORS/frame-blocked).
 */
const INTERCEPTOR_SCRIPT = `<script>
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url } = req.query;
  const requestId = Math.random().toString(36).slice(2, 8);

  console.log(`[proxy:${requestId}] Incoming request`, {
    method: req.method,
    rawUrl: url,
    referer: req.headers['referer'],
  });

  if (!url || typeof url !== 'string') {
    console.warn(`[proxy:${requestId}] Rejected — missing ?url=`);
    return res.status(400).send('Missing ?url= parameter');
  }

  let target: URL;
  try {
    target = new URL(url);
    console.log(`[proxy:${requestId}] Target`, { origin: target.origin, href: target.href });
  } catch {
    console.warn(`[proxy:${requestId}] Invalid URL: ${url}`);
    return res.status(400).send('Invalid URL');
  }

  if (!ALLOWED_ORIGINS.some(o => target.origin === o)) {
    console.warn(`[proxy:${requestId}] Rejected — not in allowlist: ${target.origin}`);
    return res.status(403).send('Origin not allowed');
  }

  try {
    console.log(`[proxy:${requestId}] Fetching upstream: ${target}`);
    const t0 = Date.now();

    // Forward request body for POST/PUT etc.
    const method = req.method || 'GET';
    let body: Buffer | undefined;
    if (method !== 'GET' && method !== 'HEAD') {
      // Vercel populates req.body; for raw pass-through we need the raw buffer
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        (req as any).on('data', (c: Buffer) => chunks.push(c));
        (req as any).on('end', resolve);
        (req as any).on('error', reject);
      });
      if (chunks.length) body = Buffer.concat(chunks);
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

    console.log(`[proxy:${requestId}] Upstream responded`, {
      status: upstream.status,
      ms: Date.now() - t0,
      contentType: upstream.headers.get('content-type'),
      url: upstream.url,
    });

    // Log all upstream headers
    const upstreamHeaders: Record<string, string> = {};
    upstream.headers.forEach((v, k) => { upstreamHeaders[k] = v; });
    console.log(`[proxy:${requestId}] Upstream headers:`, upstreamHeaders);

    res.status(upstream.status);

    const stripped: string[] = [];
    upstream.headers.forEach((value, key) => {
      if (HEADERS_TO_STRIP.has(key.toLowerCase())) {
        stripped.push(key);
      } else {
        try { res.setHeader(key, value); } catch (e: any) {
          console.warn(`[proxy:${requestId}] Could not set header "${key}": ${e.message}`);
        }
      }
    });
    console.log(`[proxy:${requestId}] Stripped:`, stripped);

    // Allow embedding from our own origin
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
    res.setHeader('Access-Control-Allow-Origin', '*');

    const contentType = upstream.headers.get('content-type') || '';

    if (contentType.includes('text/html')) {
      let html = await upstream.text();
      console.log(`[proxy:${requestId}] HTML length: ${html.length}`);

      // 1. Inject <base> so relative asset paths resolve to cinevid.st
      if (/<head/i.test(html)) {
        html = html.replace(/(<head[^>]*>)/i, `$1<base href="${target.origin}/">`);
      } else {
        html = `<base href="${target.origin}/">${html}`;
      }

      // 2. Inject interceptor as the very first script so it runs before
      //    any player JS that makes network requests
      if (/<head/i.test(html)) {
        html = html.replace(/(<head[^>]*>(?:<base[^>]*>)?)/i, `$1${INTERCEPTOR_SCRIPT}`);
      } else {
        html = INTERCEPTOR_SCRIPT + html;
      }

      console.log(`[proxy:${requestId}] Injected interceptor script`);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    }

    const buf = await upstream.arrayBuffer();
    console.log(`[proxy:${requestId}] Binary ${buf.byteLength} bytes, type: ${contentType}`);
    return res.send(Buffer.from(buf));
  } catch (err: any) {
    console.error(`[proxy:${requestId}] Fetch failed:`, {
      message: err.message,
      cause: err.cause?.message ?? err.cause,
    });
    return res.status(502).send('Failed to fetch upstream resource');
  }
}
