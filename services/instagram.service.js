import path from 'path';
import { fileURLToPath } from 'url';

const USER_AGENT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

/**
 * Normalizes input to a full Instagram post/reel URL
 */
function normalizeUrl(input) {
  if (!input || typeof input !== 'string') {
    throw new Error('Please provide an Instagram reel URL or shortcode.');
  }

  const trimmed = input.trim();

  // Extract URL if message contains surrounding text
  const urlMatch = trimmed.match(/https?:\/\/[^\s]+/i);
  if (urlMatch) {
    return urlMatch[0].split('?')[0].replace(/\/+$/, '') + '/';
  }

  // Clean shortcode and build reel URL
  const cleanedCode = trimmed.replace(/[^A-Za-z0-9_-]/g, '');
  if (!cleanedCode) {
    throw new Error('Invalid Instagram URL or shortcode provided.');
  }

  return `https://www.instagram.com/reel/${cleanedCode}/`;
}

/**
 * Cleans extracted URLs from escaped JSON/HTML characters
 */
function cleanUrl(raw) {
  let u = raw
    .replace(/\\u00253D/gi, '=')
    .replace(/\\u0026/gi, '&')
    .replace(/&amp;/gi, '&')
    .replace(/\\u003C/gi, '<')
    .replace(/\\\//gi, '/');

  if (u.includes('<')) {
    u = u.split('<')[0];
  }
  return u.trim().replace(/^["'`\\]+|["'`\\]+$/g, '');
}

/**
 * Extracts the direct progressive MP4 URL for any public Instagram reel or post
 *
 * @param {string} reelUrlOrShortcode
 * @returns {Promise<{ url: string, postUrl: string, sizeMb: number, shortcode: string }>}
 */
export async function getInstagramVideoLink(reelUrlOrShortcode) {
  const pageUrl = normalizeUrl(reelUrlOrShortcode);
  // Match direct post/reel/tv/reels paths (ignore share/reel paths as they contain arbitrary share IDs)
  const initialUrlMatch = pageUrl.match(/\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  let shortcode = initialUrlMatch ? initialUrlMatch[1] : null;

  const response = await fetch(pageUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Instagram page: HTTP ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  // Extract the genuine Instagram shortcode from the page data
  const jsonShortcodeMatch = html.match(/"shortcode":\s*"([A-Za-z0-9_-]+)"/);
  const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']https?:\/\/(?:www\.)?instagram\.com\/(?:[^\/]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
  const ogUrlMatch = html.match(/<meta\s+property=["']og:url["']\s+content=["']https?:\/\/(?:www\.)?instagram\.com\/(?:[^\/]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
  const redirectedMatch = response.url ? response.url.match(/\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/) : null;

  if (jsonShortcodeMatch && jsonShortcodeMatch[1]) {
    shortcode = jsonShortcodeMatch[1];
  } else if (canonicalMatch && canonicalMatch[1]) {
    shortcode = canonicalMatch[1];
  } else if (ogUrlMatch && ogUrlMatch[1]) {
    shortcode = ogUrlMatch[1];
  } else if (redirectedMatch && redirectedMatch[1]) {
    shortcode = redirectedMatch[1];
  }

  if (!shortcode) {
    shortcode = initialUrlMatch ? initialUrlMatch[1] : (reelUrlOrShortcode.match(/([A-Za-z0-9_-]{10,})/)?.[1] || 'video');
  }

  // Find all candidate MP4 links in page preload data
  const regex = /([^\s"<>]*?\.mp4[^\s"<>]*)/g;
  const rawMatches = html.match(regex) || [];

  const candidates = new Set();
  for (const m of rawMatches) {
    const cleaned = cleanUrl(m);
    if (cleaned.startsWith('http') && cleaned.includes('.mp4')) {
      candidates.add(cleaned);
    }
  }

  if (candidates.size === 0) {
    throw new Error(`No video stream found for ${shortcode}. The post may be images-only or private.`);
  }

  // Verify candidate URLs concurrently and pick the progressive video
  const results = await Promise.allSettled(
    Array.from(candidates).map(async (streamUrl) => {
      const headRes = await fetch(streamUrl, { method: 'HEAD' });
      if (headRes.ok) {
        const contentLength = parseInt(headRes.headers.get('content-length') || '0', 10);
        const sizeMb = Number((contentLength / (1024 * 1024)).toFixed(2));
        return { url: streamUrl, contentLength, sizeMb };
      }
      throw new Error('HEAD check failed');
    })
  );

  const validStreams = results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value);

  if (validStreams.length === 0) {
    throw new Error('Failed to retrieve a live playable video stream.');
  }

  // Sort descending by size (highest bitrate/quality first)
  validStreams.sort((a, b) => b.contentLength - a.contentLength);

  // Always use the maximum quality video stream available
  const maxQualityStream = validStreams[0];

  return {
    shortcode,
    url: maxQualityStream.url,
    postUrl: maxQualityStream.url,
    sizeMb: maxQualityStream.sizeMb,
    originalQualityUrl: maxQualityStream.url,
    originalQualitySizeMb: maxQualityStream.sizeMb,
  };
}

/**
 * Service function compatible with webhook controller and callers
 *
 * @param {string} reelUrl - Instagram reel URL or shortcode
 * @param {object} [requestConfig={}] - Optional request config
 * @returns {Promise<{ postUrl: string, url: string, shortcode: string, sizeMb: number }>}
 */
export async function getIGReel(reelUrl, requestConfig = {}) {
  return await getInstagramVideoLink(reelUrl);
}

// CLI Execution support: node services/instagram.service.js <reel_url_or_shortcode>
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const input = process.argv[2] || 'https://www.instagram.com/reel/C_KxmxbyBz6/';

  try {
    const result = await getIGReel(input);
    console.log(result.url);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

export default getIGReel;