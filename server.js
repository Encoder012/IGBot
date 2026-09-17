import http from 'http';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';
import { getYouTubeVideoLinks } from './extract_youtube_video.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function sanitizeFilename(name, ext = '.mp4') {
  if (!name) return `video${ext}`;
  let clean = name.replace(/[^\w\s.-]/gi, '').replace(/\s+/g, '_').trim();
  if (!clean.toLowerCase().endsWith(ext.toLowerCase())) {
    clean += ext;
  }
  return clean || `video${ext}`;
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = reqUrl.pathname;

  // Log incoming requests for immediate debugging
  const rangeHeader = req.headers.range ? ` Range: ${req.headers.range}` : '';
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${req.method} ${pathname}${rangeHeader}`);

  // Permissive CORS & Media headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API: Extract Links
  if (pathname === '/api/extract') {
    const targetUrl = reqUrl.searchParams.get('url') || reqUrl.searchParams.get('v') || reqUrl.searchParams.get('videoId');
    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing YouTube URL or video ID parameter.' }));
      return;
    }

    try {
      const data = await getYouTubeVideoLinks(targetUrl);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message || 'Failed to extract video links' }));
    }
    return;
  }

  // API: Verify Stream Health & Exact Size
  if (pathname === '/api/verify') {
    const videoId = reqUrl.searchParams.get('v') || reqUrl.searchParams.get('videoId');
    const targetUrl = reqUrl.searchParams.get('url');
    const expBytes = parseInt(reqUrl.searchParams.get('expectedBytes') || '0', 10);

    try {
      let checkUrl = targetUrl;
      let expected = expBytes;
      if (videoId && !checkUrl) {
        const info = await getYouTubeVideoLinks(videoId);
        checkUrl = info.primaryMuxedLink;
        expected = info.exactBytes || expBytes;
      }

      if (!checkUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing v or url parameter' }));
        return;
      }

      const { verifyStreamHealth } = await import('./extract_youtube_video.js');
      const result = await verifyStreamHealth(checkUrl, expected);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API: Stream & Download Proxy
  if (pathname === '/api/stream' || pathname === '/api/download') {
    let videoUrl = reqUrl.searchParams.get('url');
    const videoId = reqUrl.searchParams.get('v') || reqUrl.searchParams.get('videoId');
    const mediaType = reqUrl.searchParams.get('type'); // 'audio' or undefined
    const isDownload = pathname === '/api/download' || reqUrl.searchParams.get('download') === 'true';
    let filename = reqUrl.searchParams.get('filename');
    let knownTotalBytes = 0;

    try {
      // Dynamic resolution via Video ID ensures unexpired stream tokens
      if (videoId && !videoUrl) {
        const info = await getYouTubeVideoLinks(videoId);
        if (!filename) {
          filename = `${info.title}.mp4`;
        }
        videoUrl = info.primaryMuxedLink;
        knownTotalBytes = info.exactBytes || 30645270;
      }

      if (!videoUrl) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing url or v parameter');
        return;
      }

      const isAudioOnly = mediaType === 'audio';
      const defaultExt = isAudioOnly ? '.m4a' : '.mp4';
      const safeFilename = sanitizeFilename(filename || `youtube_media${defaultExt}`, defaultExt);

      const upstreamHeaders = {
        'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      };

      // Forward client Range header if present
      if (req.headers.range) {
        upstreamHeaders['Range'] = req.headers.range;
      }

      // Handle Safari & Chrome HEAD pre-flight probes cleanly
      if (req.method === 'HEAD') {
        const headHeaders = { ...upstreamHeaders };
        if (!headHeaders['Range']) {
          headHeaders['Range'] = 'bytes=0-1';
        }

        const headRes = await fetch(videoUrl, {
          method: 'GET',
          headers: headHeaders,
        });

        let totalLength = knownTotalBytes;
        const cr = headRes.headers.get('content-range');
        if (cr) {
          const parts = cr.split('/');
          if (parts[1] && !isNaN(parseInt(parts[1], 10))) {
            totalLength = parseInt(parts[1], 10);
          }
        }

        const contentType = isAudioOnly ? 'audio/mp4' : (headRes.headers.get('content-type') || 'video/mp4');
        const respHeaders = {
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
        };
        if (totalLength > 0) {
          respHeaders['Content-Length'] = totalLength;
        }
        if (isDownload) {
          respHeaders['Content-Disposition'] = `attachment; filename="${safeFilename}"`;
        }
        res.writeHead(200, respHeaders);
        res.end();
        return;
      }

      let streamRes = await fetch(videoUrl, { headers: upstreamHeaders });

      // If upstream rejects with 403 on unbounded range, retry with initial chunk
      if (streamRes.status === 403 && !upstreamHeaders['Range']) {
        upstreamHeaders['Range'] = 'bytes=0-1048575';
        streamRes = await fetch(videoUrl, { headers: upstreamHeaders });
      }

      if (!streamRes.ok) {
        console.warn(`Upstream error for ${videoUrl.slice(0, 60)}: HTTP ${streamRes.status}`);
        res.writeHead(streamRes.status, { 'Content-Type': 'text/plain' });
        res.end(`Upstream CDN Error: HTTP ${streamRes.status}`);
        return;
      }

      const contentType = isAudioOnly ? 'audio/mp4' : (streamRes.headers.get('content-type') || 'video/mp4');
      const respHeaders = {
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      };

      if (isDownload) {
        respHeaders['Content-Disposition'] = `attachment; filename="${safeFilename}"`;
      }

      if (streamRes.headers.get('content-length')) {
        respHeaders['Content-Length'] = streamRes.headers.get('content-length');
      }
      if (streamRes.headers.get('content-range')) {
        respHeaders['Content-Range'] = streamRes.headers.get('content-range');
      }

      res.writeHead(streamRes.status, respHeaders);

      const nodeStream = Readable.fromWeb(streamRes.body);
      nodeStream.pipe(res);

      nodeStream.on('error', (err) => {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Streaming error');
        }
      });

      req.on('close', () => {
        nodeStream.destroy();
      });
    } catch (err) {
      console.error('Proxy exception:', err.message);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Error: ${err.message}`);
      }
    }
    return;
  }

  // Serve static files
  let safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n==============================================`);
  console.log(`🚀 YouTube Extractor WebUI is running!`);
  console.log(`👉 Local: http://localhost:${PORT}`);
  console.log(`==============================================\n`);
});
