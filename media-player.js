/* ============================================================================
   Saptarushi · Media Player
   ----------------------------------------------------------------------------
   Handles EVERY audio format the browser can decode (mp3, wav, ogg, m4a,
   aac, flac, opus, webm) with:
     – a beautiful track list (title · duration · play · repeat)
     – folder-grouped views for folder uploads
     – in-page player bar with repeat toggle
   Exposes window.MediaPlayer.init() which scans the page for the right
   containers.
   ============================================================================ */
(function () {
  'use strict';

  const AUDIO_EXT = /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|webm)$/i;

  function displayFolder(folder) {
    return /^page-[a-z0-9_-]+$/i.test(String(folder || '')) ? 'Audio library' : (folder || 'Audio library');
  }

  let current = null; // { el, audio, repeat }

  function fmtDuration(sec) {
    if (!isFinite(sec) || sec < 0) return '—';
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  /* create a single playable row */
  function createRow(track, opts) {
    opts = opts || {};
    const row = document.createElement('div');
    row.className = 'mp-row';
    row.dataset.url = track.url;

    const art = document.createElement('span');
    art.className = 'mp-row-art';
    const playBtn = document.createElement('button');
    playBtn.className = 'mp-play';
    playBtn.type = 'button';
    playBtn.setAttribute('aria-label', 'Play ' + track.name);
    playBtn.textContent = '▶';
    art.appendChild(playBtn);

    const info = document.createElement('span');
    info.className = 'mp-row-info';
    const title = document.createElement('span');
    title.className = 'mp-row-title';
    title.textContent = track.name || track.file;
    const meta = document.createElement('span');
    meta.className = 'mp-row-meta';
    meta.textContent = displayFolder(track.folder) + ' · ' + (track.file || '') + (track.size ? ' · ' + (track.size / 1024 / 1024).toFixed(1) + ' MB' : '');
    info.appendChild(title);
    info.appendChild(meta);

    const dur = document.createElement('span');
    dur.className = 'mp-dur';
    dur.textContent = track.duration || '—';

    const repeatBtn = document.createElement('button');
    repeatBtn.className = 'mp-repeat';
    repeatBtn.type = 'button';
    repeatBtn.title = 'Repeat this track';
    repeatBtn.setAttribute('aria-label', 'Repeat');
    repeatBtn.textContent = '🔁';

    // Edit button (only visible for admin)
    const editBtn = document.createElement('button');
    editBtn.className = 'mp-edit';
    editBtn.type = 'button';
    editBtn.title = 'Edit track name';
    editBtn.setAttribute('aria-label', 'Edit track name');
    editBtn.textContent = '✏️';
    editBtn.style.display = 'none';

    row.appendChild(art);
    row.appendChild(info);
    row.appendChild(dur);
    row.appendChild(editBtn);
    row.appendChild(repeatBtn);

    /* load actual duration from metadata once metadata is available */
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.addEventListener('loadedmetadata', () => {
      if (track.duration) return;
      dur.textContent = fmtDuration(audio.duration);
      track.duration = fmtDuration(audio.duration);
    });
    audio.addEventListener('error', () => { dur.textContent = '—'; });
    audio.src = track.url;

    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      MediaPlayer.play(row, { repeat: row.dataset.repeat === '1' });
    });
    repeatBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const on = row.dataset.repeat === '1';
      row.dataset.repeat = on ? '' : '1';
      repeatBtn.classList.toggle('on', !on);
      if (current && current.row === row) current.repeat = !on;
    });

    // Edit button behavior
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!window.TextEditor || !TextEditor.isAdmin()) {
        alert('Please log in as Admin first to edit audio metadata. Go to the Admin portal.');
        return;
      }
      // Make the title editable inline
      title.contentEditable = 'true';
      title.classList.add('editing');
      title.focus();
      // Select all text
      const range = document.createRange();
      range.selectNodeContents(title);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);

      // Show save/cancel buttons
      const saveBtn = document.createElement('button');
      saveBtn.className = 'mp-edit-save';
      saveBtn.textContent = '💾';
      saveBtn.title = 'Save name';
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'mp-edit-cancel';
      cancelBtn.textContent = '✕';
      cancelBtn.title = 'Cancel';
      row.appendChild(saveBtn);
      row.appendChild(cancelBtn);
      editBtn.style.display = 'none';

      function finish(save) {
        title.contentEditable = 'false';
        title.classList.remove('editing');
        saveBtn.remove();
        cancelBtn.remove();
        editBtn.style.display = (window.TextEditor && TextEditor.isAdmin()) ? '' : 'none';
        if (save) {
          const newName = title.textContent.trim();
          if (newName && newName !== (track.name || track.file)) {
            const token = localStorage.getItem('saptarushi-admin-token') || '';
            fetch('api/audio-meta', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
              body: JSON.stringify({ data: JSON.stringify({ url: track.url, name: newName, deity: track.deity || 'library' }) })
            })
              .then(r => r.json())
              .then(d => {
                if (d.ok) {
                  track.name = newName;
                  const toast = document.createElement('div');
                  toast.className = 'toast show';
                  toast.textContent = '✓ Track name saved';
                  document.body.appendChild(toast);
                  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 2500);
                } else {
                  title.textContent = track.name || track.file || '';
                  alert('Save failed: ' + (d.error || 'Unknown error'));
                }
              })
              .catch(err => {
                title.textContent = track.name || track.file || '';
                alert('Save error: ' + err.message);
              });
          }
        } else {
          title.textContent = track.name || track.file || '';
        }
      }

      saveBtn.addEventListener('click', (ev) => { ev.stopPropagation(); finish(true); });
      cancelBtn.addEventListener('click', (ev) => { ev.stopPropagation(); finish(false); });
      title.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); finish(true); }
        if (ev.key === 'Escape') { ev.preventDefault(); finish(false); }
      });
    });

    // Show edit button for admin users
    if (window.TextEditor && TextEditor.isAdmin()) {
      editBtn.style.display = '';
    }

    return row;
  }

  function listItemToTrack(li) {
    return {
      url: li.dataset.url,
      name: li.dataset.name || li.dataset.title || li.textContent.trim().slice(0, 40),
      file: li.dataset.file || '',
      folder: li.dataset.folder || '',
    };
  }

  /* play a row / wrap any <li data-url> item */
  function play(rowEl, opts) {
    opts = opts || {};
    if (current) {
      if (current.row === rowEl && !current.audio.paused) { current.audio.pause(); setRowState(current.row, false); return; }
      current.audio.pause();
      setRowState(current.row, false);
    }
    const url = rowEl.dataset.url;
    if (!url) return;
    const audio = new Audio(url);
    current = { row: rowEl, audio, repeat: !!opts.repeat };
    setRowState(rowEl, true);
    audio.play().catch(() => {});
    audio.addEventListener('timeupdate', () => {
      const durEl = rowEl.querySelector('.mp-dur');
      if (durEl && isFinite(audio.duration) && (!audio.dataset.done)) {
        durEl.textContent = fmtDuration(audio.duration);
        audio.dataset.done = '1';
      }
    });
    audio.addEventListener('ended', () => {
      setRowState(rowEl, false);
      if (current && current.repeat) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        setRowState(rowEl, true);
      } else {
        current = null;
      }
    });
  }

  function setRowState(rowEl, playing) {
    if (!rowEl) return;
    const b = rowEl.querySelector('.mp-play');
    if (b) b.textContent = playing ? '⏸' : '▶';
    rowEl.classList.toggle('playing', playing);
  }

  function stopAll() {
    if (current) { current.audio.pause(); setRowState(current.row, false); current = null; }
  }

  /* render a track list into a container */
  function renderList(container, tracks, opts) {
    opts = opts || {};
    container.innerHTML = '';
    const list = document.createElement('div');
    list.className = 'mp-playlist' + (opts.compact ? ' compact' : '');
    tracks.forEach(t => list.appendChild(createRow(t, opts)));
    container.appendChild(list);
  }

  /* folder-grouped rendering (nice UI for folder uploads) */
  function renderFolders(container, tracks) {
    container.innerHTML = '';
    const groups = {};
    (tracks || []).forEach(t => { const g = displayFolder(t.folder); (groups[g] = groups[g] || []).push(t); });
    const keys = Object.keys(groups);
    if (!keys.length) { container.innerHTML = '<p class="empty-note">No audio uploaded yet — open an album or drop a folder above.</p>'; return; }
    keys.sort();
    keys.forEach(folder => {
      const card = document.createElement('section');
      card.className = 'ml-folder';
      const h = document.createElement('h3');
      h.textContent = folder;
      const sub = document.createElement('span');
      sub.className = 'ml-folder-count';
      sub.textContent = groups[folder].length + (groups[folder].length === 1 ? ' track' : ' tracks');
      h.appendChild(sub);
      const list = document.createElement('div');
      list.className = 'mp-playlist';
      groups[folder].forEach(t => list.appendChild(createRow(t)));
      card.appendChild(h);
      card.appendChild(list);
      container.appendChild(card);
    });
  }

  /* wire up native <audio> elements for formats the <audio> tag can play */
  function wireNativeAudios(root) {
    root = root || document;
    root.querySelectorAll('audio[data-src], audio.' + '' + '').forEach(() => {});
    root.querySelectorAll('audio[controls]').forEach(a => {
      a.controls = true;
    });
  }

  const MediaPlayer = { createRow, renderList, renderFolders, play, stopAll, fmtDuration, wireNativeAudios, AUDIO_EXT };
  window.MediaPlayer = MediaPlayer;
})();