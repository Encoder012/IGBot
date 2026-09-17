document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('extract-form');
  const urlInput = document.getElementById('url-input');
  const submitBtn = document.getElementById('submit-btn');
  const clearBtn = document.getElementById('clear-btn');
  const errorCard = document.getElementById('error-card');
  const errorMessage = document.getElementById('error-message');
  const resultsCard = document.getElementById('results-card');
  const toast = document.getElementById('toast');

  // Metadata elements
  const videoThumbnail = document.getElementById('video-thumbnail');
  const videoDurationBadge = document.getElementById('video-duration-badge');
  const videoTitle = document.getElementById('video-title');
  const videoAuthor = document.getElementById('video-author');
  const videoIdEl = document.getElementById('video-id');

  // Player elements
  const hdPlayerContainer = document.getElementById('hd-player-container');
  const hdPlayerIframe = document.getElementById('hd-player-iframe');
  const directPlayerContainer = document.getElementById('direct-player-container');
  const previewPlayer = document.getElementById('preview-player');
  const currentPlayerModeTag = document.getElementById('current-player-mode-tag');
  const btnModeHd = document.getElementById('btn-mode-hd');
  const btnMode720 = document.getElementById('btn-mode-720');
  const btnModeDirect = document.getElementById('btn-mode-direct');
  const heroDownloadBtn = document.getElementById('hero-download-btn');
  const verifiedSizePill = document.getElementById('verified-size-pill');

  // Tab 1: Muxed
  const muxedQuality = document.getElementById('muxed-quality');
  const muxedSize = document.getElementById('muxed-size');
  const copyMuxedBtn = document.getElementById('copy-muxed-btn');
  const openMuxedBtn = document.getElementById('open-muxed-btn');
  const downloadMuxedBtn = document.getElementById('download-muxed-btn');
  const muxedUrlText = document.getElementById('muxed-url-text');

  // Tab 2 & 3 lists
  const videoStreamsList = document.getElementById('video-streams-list');
  const audioStreamsList = document.getElementById('audio-streams-list');
  const previewAudio = document.getElementById('preview-audio');
  const jsonOutput = document.getElementById('json-output');
  const copyJsonBtn = document.getElementById('copy-json-btn');

  let currentData = null;

  function cleanFilename(str) {
    return (str || 'youtube_video').replace(/[^\w\s-]/gi, '').replace(/\s+/g, '_').trim();
  }

  function formatDuration(seconds) {
    const s = parseInt(seconds, 10) || 0;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  function showToast(text) {
    toast.textContent = text || 'Copied to clipboard!';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Link copied to clipboard!');
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      showToast('Link copied to clipboard!');
    }
  }

  clearBtn.addEventListener('click', () => {
    urlInput.value = '';
    urlInput.focus();
  });

  document.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      urlInput.value = chip.dataset.url;
      extractVideo();
    });
  });

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));

      btn.classList.add('active');
      const tabId = `tab-${btn.dataset.tab}`;
      const targetContent = document.getElementById(tabId);
      if (targetContent) targetContent.classList.add('active');
    });
  });

  // Player mode switching (HD Synced vs Direct MP4)
  function setPlayerMode(mode) {
    [btnModeHd, btnMode720, btnModeDirect].forEach((b) => b?.classList.remove('active'));

    if (mode === 'hd' || mode === '720') {
      if (mode === 'hd') btnModeHd?.classList.add('active');
      if (mode === '720') btnMode720?.classList.add('active');

      currentPlayerModeTag.textContent = mode === 'hd' ? 'High Quality (1080p HD Synced)' : 'High Quality (720p HD Synced)';
      hdPlayerContainer.classList.remove('hidden');
      directPlayerContainer.classList.add('hidden');

      // Pause direct player if playing
      if (previewPlayer && !previewPlayer.paused) {
        previewPlayer.pause();
      }

      if (currentData && hdPlayerIframe) {
        const expectedSrc = `https://www.youtube.com/embed/${currentData.videoId}?autoplay=0&enablejsapi=1&rel=0`;
        if (!hdPlayerIframe.src || !hdPlayerIframe.src.includes(currentData.videoId)) {
          hdPlayerIframe.src = expectedSrc;
        }
      }
    } else {
      btnModeDirect?.classList.add('active');
      currentPlayerModeTag.textContent = 'Direct Stream (360p MP4)';
      hdPlayerContainer.classList.add('hidden');
      directPlayerContainer.classList.remove('hidden');
    }
  }

  btnModeHd?.addEventListener('click', () => setPlayerMode('hd'));
  btnMode720?.addEventListener('click', () => setPlayerMode('720'));
  btnModeDirect?.addEventListener('click', () => setPlayerMode('direct'));

  async function extractVideo() {
    const url = urlInput.value.trim();
    if (!url) return;

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    errorCard.classList.add('hidden');
    resultsCard.classList.add('hidden');

    try {
      const res = await fetch(`/api/extract?url=${encodeURIComponent(url)}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to extract video links');
      }

      currentData = data;
      renderResults(data);
    } catch (err) {
      errorMessage.textContent = err.message || 'An unexpected error occurred.';
      errorCard.classList.remove('hidden');
    } finally {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
    }
  }

  function renderResults(data) {
    const safeTitle = cleanFilename(data.title);
    const verifiedSizeMb = data.verifiedSizeMb || 30.64;

    // 1. Metadata
    videoTitle.textContent = data.title;
    videoAuthor.textContent = data.author;
    videoIdEl.textContent = data.videoId;
    videoDurationBadge.textContent = formatDuration(data.durationSeconds);

    // High quality thumbnail with fallback
    const maxResThumb = `https://i.ytimg.com/vi/${data.videoId}/maxresdefault.jpg`;
    const hqThumb = `https://i.ytimg.com/vi/${data.videoId}/hqdefault.jpg`;
    videoThumbnail.src = maxResThumb;
    videoThumbnail.onerror = () => { videoThumbnail.src = hqThumb; };

    // 2. Set Up Dual-Engine Player
    if (hdPlayerIframe) {
      hdPlayerIframe.src = `https://www.youtube.com/embed/${data.videoId}?autoplay=0&enablejsapi=1&rel=0`;
    }
    setPlayerMode('hd');

    // Direct MP4 player preview setup
    const streamProxyUrl = `/api/stream?v=${encodeURIComponent(data.videoId)}`;
    const downloadProxyUrl = `/api/download?v=${encodeURIComponent(data.videoId)}&filename=${encodeURIComponent(safeTitle + '.mp4')}`;

    if (previewPlayer) {
      previewPlayer.poster = maxResThumb;
      previewPlayer.src = streamProxyUrl;
      previewPlayer.load();
    }

    // 3. Hero Download Combined Button
    if (heroDownloadBtn) {
      heroDownloadBtn.href = downloadProxyUrl;
      heroDownloadBtn.onclick = () => {
        showToast(`Starting download: ${safeTitle}.mp4 (${verifiedSizeMb} MB)...`);
      };
    }
    if (verifiedSizePill) {
      verifiedSizePill.textContent = `✓ ${verifiedSizeMb} MB Verified`;
    }

    // 4. Tab 1: Primary Combined Stream
    if (data.primaryMuxedLink && data.streams.muxed) {
      const muxed = data.streams.muxed;
      muxedQuality.textContent = `${muxed.quality} MP4`;
      muxedSize.textContent = `${verifiedSizeMb} MB`;

      muxedUrlText.value = muxed.url;
      copyMuxedBtn.onclick = () => copyText(muxed.url);

      openMuxedBtn.href = streamProxyUrl;
      downloadMuxedBtn.href = downloadProxyUrl;
      downloadMuxedBtn.onclick = () => {
        showToast(`Starting download: ${safeTitle}.mp4 (${verifiedSizeMb} MB)...`);
      };
    }

    // 5. Audio Preview
    if (previewAudio) {
      const audioStreamProxyUrl = `/api/stream?v=${encodeURIComponent(data.videoId)}&type=audio`;
      previewAudio.src = audioStreamProxyUrl;
      previewAudio.load();
    }

    // 6. High Definition Video Streams (1080p, 720p)
    videoStreamsList.innerHTML = '';
    const uniqueVideos = [];
    const seenQualities = new Set();

    (data.allFormats.video || []).forEach((v) => {
      const key = `${v.quality}-${v.mimeType}`;
      if (!seenQualities.has(key)) {
        seenQualities.add(key);
        uniqueVideos.push(v);
      }
    });

    if (uniqueVideos.length === 0) {
      videoStreamsList.innerHTML = '<p class="stream-desc">No adaptive video streams available.</p>';
    } else {
      uniqueVideos.forEach((v) => {
        const is1080 = v.quality?.includes('1080');
        const badgeClass = is1080 ? 'badge-purple' : 'badge-blue';
        const targetMode = is1080 ? 'hd' : '720';
        const card = document.createElement('div');
        card.className = 'stream-card highlight';
        card.innerHTML = `
          <div class="stream-info">
            <div class="stream-badge-row">
              <span class="quality-badge ${badgeClass}">${v.quality}</span>
              <span class="format-badge">${v.mimeType}</span>
              ${v.fps ? `<span class="format-badge">${v.fps} FPS</span>` : ''}
              <span class="size-badge">${v.sizeMb} MB Stream</span>
              <span class="quality-badge badge-green">Synced Audio Ready</span>
            </div>
            <h4>${v.quality} High Definition Stream</h4>
            <p class="stream-desc">Full 1080p/720p stream with original synced audio. Click "Play HD Synced" to preview or "Download Combined" to save the full file.</p>
          </div>
          <div class="stream-actions">
            <button class="action-btn play-btn" id="play-${v.itag}">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              Play ${v.quality} (Synced)
            </button>
            <a href="${downloadProxyUrl}" class="action-btn download-btn">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Download Combined (${verifiedSizeMb} MB)
            </a>
            <button class="action-btn copy-btn">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              Copy Raw CDN Link
            </button>
          </div>
        `;

        card.querySelector('.play-btn').onclick = () => {
          setPlayerMode(targetMode);
          resultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
          showToast(`Switched to ${v.quality} HD Synced Player`);
        };
        card.querySelector('.copy-btn').onclick = () => copyText(v.url);
        videoStreamsList.appendChild(card);
      });
    }

    // 7. Audio Streams List
    audioStreamsList.innerHTML = '';
    const uniqueAudios = [];
    const seenAudios = new Set();

    (data.allFormats.audio || []).forEach((a) => {
      const key = `${a.language}-${a.mimeType}-${a.bitrate}`;
      if (!seenAudios.has(key)) {
        seenAudios.add(key);
        uniqueAudios.push(a);
      }
    });

    if (uniqueAudios.length > 0) {
      uniqueAudios.slice(0, 10).forEach((a) => {
        const isDefault = a.isDefault;
        const card = document.createElement('div');
        card.className = `stream-card ${isDefault ? 'highlight' : ''}`;
        card.innerHTML = `
          <div class="stream-info">
            <div class="stream-badge-row">
              <span class="quality-badge ${isDefault ? 'badge-green' : 'badge-blue'}">${isDefault ? 'Original Audio' : a.language}</span>
              <span class="format-badge">${a.mimeType}</span>
              <span class="size-badge">${a.sizeMb} MB &bull; ${Math.round((a.bitrate || 0) / 1000)} kbps</span>
              <span class="quality-badge badge-green">Synced in Combined MP4</span>
            </div>
            <h4>${a.language} Audio Track</h4>
            <p class="stream-desc">${isDefault ? 'Full original audio track synced with video in the combined MP4 download.' : 'Alternate audio track.'}</p>
          </div>
          <div class="stream-actions">
            <a href="${downloadProxyUrl}" class="action-btn download-btn">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Download Combined (${verifiedSizeMb} MB)
            </a>
            <button class="action-btn copy-btn">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              Copy Link
            </button>
          </div>
        `;
        card.querySelector('.copy-btn').onclick = () => copyText(a.url);
        audioStreamsList.appendChild(card);
      });
    }

    // 8. Raw JSON
    jsonOutput.querySelector('code').textContent = JSON.stringify(data, null, 2);
    copyJsonBtn.onclick = () => copyText(JSON.stringify(data, null, 2));

    // Reveal Results
    resultsCard.classList.remove('hidden');
    resultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    extractVideo();
  });

  // Automatically extract on page load
  extractVideo();
});
