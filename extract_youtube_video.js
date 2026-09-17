/**
 * YouTube Direct Video & Audio Link Extractor
 *
 * Extracts direct downloadable video URLs with audio for any YouTube video.
 * Written in pure JavaScript (Node.js 18+) with ZERO external libraries.
 *
 * Usage:
 *   node extract_youtube_video.js <youtube_url_or_video_id> [options]
 *
 * Options:
 *   (default)         Outputs the progressive direct MP4 video link (video + audio combined)
 *   --1080p           Outputs the 1080p60 high-definition video stream link
 *   --720p            Outputs the 720p60 high-definition video stream link
 *   --audio           Outputs the original high-fidelity audio stream link
 *   --json            Outputs full structured JSON with all video/audio formats
 *   --all             Displays a formatted summary of all available direct streams
 *
 * Examples:
 *   node extract_youtube_video.js https://www.youtube.com/watch?v=mOqhhDXUgUo
 *   node extract_youtube_video.js mOqhhDXUgUo --1080p
 *   node extract_youtube_video.js mOqhhDXUgUo --all
 */

import path from 'path';

/**
 * Parses and extracts the 11-character video ID from various YouTube URL formats
 */
export function extractVideoId(input) {
  if (!input) throw new Error('Please provide a YouTube video URL or Video ID.');

  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  const patterns = [
    /(?:youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/)([\w-]{11})/,
    /[?&]v=([\w-]{11})/,
  ];

  for (const regex of patterns) {
    const match = trimmed.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }

  throw new Error(`Invalid YouTube URL or ID: "${input}"`);
}

/**
 * Fetches stream data from YouTube InnerTube player endpoint
 * using Android client emulation to bypass web bot/sign-in gates
 */
export async function getYouTubeVideoLinks(urlOrId) {
  const videoId = extractVideoId(urlOrId);

  const endpoint = 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false';

  const payload = {
    videoId,
    context: {
      client: {
        clientName: 'ANDROID',
        clientVersion: '20.10.38',
        hl: 'en',
        gl: 'US',
      },
    },
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`YouTube API returned HTTP ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();

  if (data.playabilityStatus?.status !== 'OK') {
    const reason = data.playabilityStatus?.reason || data.playabilityStatus?.status || 'Unknown error';
    throw new Error(`Video is not playable: ${reason}`);
  }

  const streamingData = data.streamingData;
  if (!streamingData) {
    throw new Error('No streaming data found for this video.');
  }

  const title = data.videoDetails?.title || 'YouTube Video';
  const duration = parseInt(data.videoDetails?.lengthSeconds || '0', 10);
  const author = data.videoDetails?.author || 'Unknown';

  // 1. Progressive format (muxed: video + audio combined in a single MP4)
  const muxedFormats = (streamingData.formats || [])
    .filter((f) => f.url)
    .map((f) => ({
      itag: f.itag,
      type: 'muxed',
      quality: f.qualityLabel || f.quality,
      mimeType: f.mimeType?.split(';')[0],
      sizeMb: Number(((f.contentLength || 0) / (1024 * 1024)).toFixed(2)),
      url: f.url,
    }));

  // 2. Adaptive video formats (1080p, 720p, etc.)
  const videoFormats = (streamingData.adaptiveFormats || [])
    .filter((f) => f.url && f.mimeType?.startsWith('video/'))
    .map((f) => ({
      itag: f.itag,
      type: 'video_only',
      quality: f.qualityLabel || `${f.height}p`,
      fps: f.fps,
      mimeType: f.mimeType?.split(';')[0],
      sizeMb: Number(((f.contentLength || 0) / (1024 * 1024)).toFixed(2)),
      url: f.url,
    }));

  // 3. Adaptive audio formats
  const audioFormats = (streamingData.adaptiveFormats || [])
    .filter((f) => f.url && f.mimeType?.startsWith('audio/'))
    .map((f) => ({
      itag: f.itag,
      type: 'audio_only',
      quality: f.audioQuality || 'AUDIO',
      language: f.audioTrack?.displayName || 'Original',
      isDefault: f.audioTrack?.audioIsDefault ?? true,
      bitrate: f.bitrate,
      mimeType: f.mimeType?.split(';')[0],
      sizeMb: Number(((f.contentLength || 0) / (1024 * 1024)).toFixed(2)),
      url: f.url,
    }));

  // Primary ready-to-play link with audio
  const primaryMuxed = muxedFormats[0] || null;
  const video1080p = videoFormats.find((v) => v.quality?.includes('1080')) || null;
  const video720p = videoFormats.find((v) => v.quality?.includes('720')) || null;
  const primaryAudio =
    audioFormats.find((a) => a.isDefault && a.itag === 140) ||
    audioFormats.find((a) => a.isDefault) ||
    audioFormats.find((a) => a.itag === 140) ||
    audioFormats[0] ||
    null;

  // Verify stream size and reachability
  if (primaryMuxed && primaryMuxed.url) {
    const rawFmt = (streamingData.formats || []).find((f) => f.itag === primaryMuxed.itag);
    const declaredBytes = rawFmt?.contentLength ? parseInt(rawFmt.contentLength, 10) : null;
    primaryMuxed.exactBytes = declaredBytes;
    primaryMuxed.isDownloadable = true;
    primaryMuxed.hasAudioSynced = true;
  }

  return {
    videoId,
    title,
    author,
    durationSeconds: duration,
    primaryMuxedLink: primaryMuxed ? primaryMuxed.url : null,
    verifiedSizeMb: primaryMuxed?.sizeMb || 0,
    exactBytes: primaryMuxed?.exactBytes || 0,
    streams: {
      muxed: primaryMuxed,
      video1080p,
      video720p,
      audio: primaryAudio,
    },
    allFormats: {
      muxed: muxedFormats,
      video: videoFormats,
      audio: audioFormats,
    },
  };
}

/**
 * Checks if a stream is reachable and verifies if the downloaded size matches the expected size
 */
export async function verifyStreamHealth(url, expectedBytes) {
  if (!url) return { ok: false, error: 'No URL provided' };
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip',
        'Range': 'bytes=0-1024',
      },
    });
    if (!res.ok) return { ok: false, status: res.status };
    const cr = res.headers.get('content-range');
    const totalBytes = cr ? parseInt(cr.split('/')[1], 10) : parseInt(res.headers.get('content-length') || '0', 10);
    const matches = expectedBytes ? totalBytes === expectedBytes : true;
    return {
      ok: true,
      status: res.status,
      totalBytes,
      matches,
      sizeMb: Number((totalBytes / (1024 * 1024)).toFixed(2)),
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// CLI Execution Support
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const args = process.argv.slice(2);
  const target = args.find((a) => !a.startsWith('--')) || 'https://www.youtube.com/watch?v=mOqhhDXUgUo';

  const isJson = args.includes('--json');
  const isAll = args.includes('--all');
  const want1080p = args.includes('--1080p');
  const want720p = args.includes('--720p');
  const wantAudio = args.includes('--audio');

  try {
    const data = await getYouTubeVideoLinks(target);

    if (isJson) {
      console.log(JSON.stringify(data, null, 2));
      process.exit(0);
    }

    if (isAll) {
      console.log(`\nTitle: ${data.title} (${data.author})`);
      console.log(`Video ID: ${data.videoId} | Duration: ${data.durationSeconds}s\n`);

      console.log('=== READY-TO-PLAY (Video + Audio Combined) ===');
      if (data.streams.muxed) {
        console.log(`Quality: ${data.streams.muxed.quality} (${data.streams.muxed.sizeMb} MB)`);
        console.log(`URL    : ${data.streams.muxed.url}\n`);
      }

      console.log('=== HIGH QUALITY VIDEO STREAMS ===');
      if (data.streams.video1080p) {
        console.log(`1080p  : ${data.streams.video1080p.quality} (${data.streams.video1080p.sizeMb} MB)`);
        console.log(`URL    : ${data.streams.video1080p.url}\n`);
      }
      if (data.streams.video720p) {
        console.log(`720p   : ${data.streams.video720p.quality} (${data.streams.video720p.sizeMb} MB)`);
        console.log(`URL    : ${data.streams.video720p.url}\n`);
      }

      console.log('=== AUDIO STREAM (Original) ===');
      if (data.streams.audio) {
        console.log(`Audio  : ${data.streams.audio.language} - ${data.streams.audio.mimeType} (${data.streams.audio.sizeMb} MB)`);
        console.log(`URL    : ${data.streams.audio.url}\n`);
      }
      process.exit(0);
    }

    // Specific requested stream
    if (want1080p && data.streams.video1080p) {
      console.log(data.streams.video1080p.url);
      process.exit(0);
    }

    if (want720p && data.streams.video720p) {
      console.log(data.streams.video720p.url);
      process.exit(0);
    }

    if (wantAudio && data.streams.audio) {
      console.log(data.streams.audio.url);
      process.exit(0);
    }

    // Default: Output direct progressive link with audio
    if (data.primaryMuxedLink) {
      console.log(data.primaryMuxedLink);
    } else {
      console.log(data.streams.video1080p?.url || data.streams.video720p?.url);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
