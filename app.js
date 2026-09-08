// Deepam — runtime: text size, tabs, filters, player, "Ask Deepam" chat
(function () {
  'use strict';

  const D = DeepamData;
  if (window.__SN__) {
    D.audio = D.audio.concat(window.__SN__.audio);
    D.books = D.books.concat(window.__SN__.books);
  }
  const currentScript = document.currentScript;
  const base = currentScript && currentScript.getAttribute('data-base') || '';

  /* ---------- merge admin-managed content from the server ---------- */
  fetch(base + 'api/content')
    .then(r => r.ok ? r.json() : null)
    .then(store => {
      if (store && store.audio && store.audio.length) {
        const slugs = new Set(D.audio.map(a => a.slug));
        store.audio.forEach(a => { a.slug = a.slug || ((a.file || a.name || a.url || '').split('/').pop().replace(/\.[^.]+$/, '')); if (!slugs.has(a.slug)) { D.audio.push(a); if (a.deity && !D.deities.find(d => d.slug === a.deity)) D.deities.push({ slug: a.deity, label: a.deity, te: a.te, desc: '', symbol: '✦' }); } });
        attachTrackCards();
      }
      if (store && store.books && store.books.length) {
        const slugs = new Set(D.books.map(b => b.slug));
        store.books.forEach(b => { if (!slugs.has(b.slug)) D.books.push(b); });
      }
      if (store && store.assets) window.SaptarushiAssets = store.assets;
      applyManagedEntityOverrides(store);
      renderManagedSections(store);
      renderAdminHomeAudio(store);
    })
    .catch(() => { /* serverless mode is fine */ });

  /* ---------- asset base for relative pages ---------- */
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s).replace(/[^\p{L}\p{N}]+/gu, ' ').toLowerCase().trim();

  /* ---------- CMS renderer: admin-created entities + page placements ---------- */
  function pageKeyForRuntime() {
    var p = location.pathname.replace(/\/+/g, '/').replace(/\/+$/, '');
    if (!p || p === '') return '/';
    if (p.endsWith('/index.html')) return p.slice(0, -'index.html'.length) || '/';
    return p.startsWith('/') ? p : '/' + p;
  }
  function entityId(type, value) { return type + ':' + (value || '').replace(/^.*\//, '').replace(/\.html$/i, '').replace(/[^a-zA-Z0-9_-]+/g, '-').toLowerCase(); }
  function deityImage(slug) {
    var d = (slug || '').toLowerCase().split(/[^a-z0-9]+/)[0];
    return base + 'assets/deities/' + (d || 'venkateswara') + '.jpg';
  }
  function bookCard(b) {
    var href = base + 'books/' + encodeURIComponent(b.slug) + '.html';
    var img = b.imageUrl || deityImage(b.deity);
    return '<a class="book-card cms-entity" data-entity-id="' + esc(entityId('book', b.slug)) + '" href="' + href + '">' +
      '<img class="book-cover-img" src="' + esc(img) + '" alt="' + esc(b.title || b.en || b.slug) + '" loading="lazy"/>' +
      '<div class="min-w-0 flex-1"><p class="book-en">' + esc(b.title || b.en || b.slug) + '</p>' +
      '<p class="book-te" lang="te">' + esc(b.titleTe || b.te || '') + '</p>' +
      '<p class="book-meta">' + esc(b.sub || b.meta || 'From the library') + '</p></div></a>';
  }
  function audioCard(t) {
    var name = t.name || t.en || t.title || t.file || 'Audio';
    return '<button type="button" class="track-card cms-entity" data-entity-id="' + esc(entityId('audio', t.url || name)) + '" data-slug="' + esc(t.slug || (t.file ? t.file.replace(/\.[^.]+$/, '') : '')) + '" data-url="' + esc(t.url || t.localPath || '') + '">' +
      '<div class="track-art"><img src="' + esc(t.imageUrl || deityImage(t.deity)) + '" alt="' + esc(name) + '" loading="lazy"/><span class="track-play-btn">▶</span></div>' +
      '<div class="track-row"><div><div class="track-te" lang="te">' + esc(t.te || '') + '</div><div class="track-en">' + esc(name) + '</div></div></div></button>';
  }
  function renderOcrAsset(asset) {
    if (!asset || !asset.ocrText) return '';
    var text = String(asset.ocrText).trim();
    var blocks = text.split(/\n{2,}/).map(function(x){ return x.trim(); }).filter(Boolean);
    return '<article class="cms-ocr-card cms-entity" data-entity-id="' + esc(entityId('media', asset.id || asset.url || asset.name)) + '">' +
      '<div class="cms-ocr-kicker">Digitised text</div><div class="cms-ocr-title">' + esc(asset.title || asset.name || 'Scanned document') + '</div>' +
      blocks.map(function(x){ return '<p>' + esc(x).replace(/\n/g,'<br>') + '</p>'; }).join('') + '</article>';
  }

  function applyManagedEntityOverrides(store) {
    if (!store) return;
    (store.books || []).forEach(function(b){
      var links = document.querySelectorAll('a.book-card[href*="books/' + CSS.escape(b.slug) + '.html"]');
      links.forEach(function(a){
        a.setAttribute('data-entity-id', entityId('book',b.slug));
        var img=a.querySelector('img'); if(img && b.imageUrl) img.src=b.imageUrl;
        var en=a.querySelector('.book-en'); if(en && (b.title||b.en)) en.textContent=b.title||b.en;
        var te=a.querySelector('.book-te'); if(te && (b.titleTe||b.te)) te.textContent=b.titleTe||b.te;
        var meta=a.querySelector('.book-meta'); if(meta && (b.sub||b.meta)) meta.textContent=b.sub||b.meta;
      });
    });
    (store.audio || []).forEach(function(t){
      var slug=t.slug || ((t.file||t.name||t.url||'').split('/').pop().replace(/\.[^.]+$/,''));
      document.querySelectorAll('.track-card[data-slug="' + CSS.escape(slug) + '"]').forEach(function(card){
        card.setAttribute('data-entity-id',entityId('audio',t.url||t.name));
        var en=card.querySelector('.track-en'); if(en) en.textContent=t.name||t.en||slug;
        var te=card.querySelector('.track-te'); if(te && t.te) te.textContent=t.te;
        var img=card.querySelector('img'); if(img && t.imageUrl) img.src=t.imageUrl;
      });
    });
  }
  function renderManagedSections(store) {
    if (!store) return;
    var key = pageKeyForRuntime();
    var page = store.pages && store.pages[key];
    var sections = page && Array.isArray(page.sections) ? page.sections : [];
    var books = store.books || [];
    var audio = store.audio || [];
    var assets = store.assets || [];
    if (!sections.length) {
      if (/\/books\.html$/.test(key) && books.length) sections = [{id:'admin-books',type:'books',title:{en:'From the library',te:'మీ గ్రంథాలయం'},items:books.map(function(b){return entityId('book',b.slug);})}];
      if (/\/audio\.html$/.test(key) && audio.length) sections = [{id:'admin-audio',type:'audio',title:{en:'From the library',te:'మీ ఆడియో గ్రంథాలయం'},items:audio.map(function(a){return entityId('audio',a.url || a.name);})}];
    }
    if (!sections.length) return;
    var byId = {};
    books.forEach(function(b){ byId[entityId('book',b.slug)] = {type:'book',value:b}; });
    audio.forEach(function(a){ byId[entityId('audio',a.url || a.name)] = {type:'audio',value:a}; });
    assets.forEach(function(a){ byId[a.id || entityId('media',a.url || a.name)] = {type:'media',value:a}; });
    var host = document.querySelector('.managed-sections');
    if (!host) { host=document.createElement('div'); host.className='managed-sections'; var main=document.querySelector('main'); if(main) main.appendChild(host); }
    host.innerHTML='';
    sections.forEach(function(sec){
      if (sec.published === false) return;
      var items=(sec.items||[]).map(function(id){return byId[id];}).filter(Boolean);
      if(!items.length) return;
      var title=(sec.title && (sec.title[localStorage.getItem('saptarushi-lang') || 'en'] || sec.title.en || sec.title.te)) || sec.title || '';
      var wrap=document.createElement('section'); wrap.className='section-page cms-section';
      wrap.innerHTML='<div class="section-title-row"><h2 class="section-title">'+esc(title)+'</h2><span class="section-count">'+items.length+'</span></div>';
      var grid=document.createElement('div');
      grid.className=sec.type==='books'?'grid-books':sec.type==='audio'?'grid-cards':'cms-rich-grid';
      items.forEach(function(entry){ if(entry.type==='book') grid.insertAdjacentHTML('beforeend',bookCard(entry.value)); else if(entry.type==='audio') grid.insertAdjacentHTML('beforeend',audioCard(entry.value)); else grid.insertAdjacentHTML('beforeend',renderOcrAsset(entry.value)); });
      wrap.appendChild(grid); host.appendChild(wrap);
    });
    if (typeof attachTrackCards === 'function') attachTrackCards();
  }

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const deityBySlug = (slug) => D.deities.find(d => d.slug === slug);
  const audioOfDeity = (slug) => D.audio.filter(a => a.deity === slug);
  const booksOfDeity = (slug) => D.books.filter(b => b.deity === slug);

  /* ---------- Text size ---------- */
  const textBtns = $$('.textsize-btn');
  const sizes = ['base', 'large', 'xlarge'];
  const savedSize = localStorage.getItem('deepam-textsize') || 'base';
  document.documentElement.setAttribute('data-text-size', savedSize);
  textBtns.forEach((btn, i) => {
    if (sizes[i] === savedSize) btn.classList.add('active');
    btn.addEventListener('click', () => {
      document.documentElement.setAttribute('data-text-size', sizes[i]);
      localStorage.setItem('deepam-textsize', sizes[i]);
      textBtns.forEach((b, j) => b.classList.toggle('active', j === i));
    });
  });

  /* ---------- Mobile nav ---------- */
  const menuTrigger = $('.menu-trigger');
  const mobileNav = $('.mobile-nav');
  if (menuTrigger && mobileNav) {
    menuTrigger.addEventListener('click', () => mobileNav.classList.toggle('open'));
    $$('a', mobileNav).forEach(a => a.addEventListener('click', () => mobileNav.classList.remove('open')));
  }

  /* ---------- Player ---------- */
  const player = $('#player');
  let audio = null;
  let currentTrack = null;

  function stopPlayer() {
    if (audio) { audio.pause(); audio.currentTime = 0; audio = null; }
    currentTrack = null;
    if (player) player.classList.remove('show');
  }
  function stopAudioOnly() { if (audio) { audio.pause(); audio = null; } }

  function renderPlayer(track) {
    if (!player) return;
    currentTrack = track;
    $('#mpTe').textContent = track.te;
    $('#mpEn').textContent = track.en + ' · ' + track.tag;
    $('#mpToggle').textContent = '⏸';
    player.classList.add('show');
  }

  function playLocal(track) {
    stopAudioOnly();
    audio = new Audio(track.localPath);
    renderPlayer(track);
    audio.play().catch(() => { toast('Could not play «' + track.en + '» here.'); stopPlayer(); });
    audio.addEventListener('ended', () => { stopPlayer(); toast(track.te + ' finished.'); });
  }

  function togglePlay() {
    if (!audio || !currentTrack) return;
    if (audio.paused) { audio.play(); $('#mpToggle').textContent = '⏸'; }
    else { audio.pause(); $('#mpToggle').textContent = '▶'; }
  }
  if (player) {
    $('#mpToggle').addEventListener('click', togglePlay);
    $('#mpStop').addEventListener('click', stopPlayer);
  }

  /* ---------- Toast ---------- */
  let toastEl = $('#toast');
  let toastTimer;
  function toast(msg, ms = 3200) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.id = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
  }

  /* ---------- Internet links ---------- */
  const yt = (q) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);
  const web = (q) => 'https://www.google.com/search?q=' + encodeURIComponent(q);

  /* ---------- Tiles: play or route to internet ---------- */
  function attachTrackCards() {
    $$('.track-card').forEach(card => {
      if (card.__bound) return;
      card.__bound = true;
      const track = D.audio.find(a => a.slug === card.dataset.slug);
      if (!track || track.comingSoon) return;
      card.addEventListener('click', () => {
        if (window.TextEditor && TextEditor.isAdmin()) {
          const detail = new URL((base || '') + 'audio/' + encodeURIComponent(track.slug) + '.html', location.href);
          detail.searchParams.set('name', track.name || track.en || track.slug);
          detail.searchParams.set('en', track.en || '');
          detail.searchParams.set('te', track.te || '');
          detail.searchParams.set('deity', track.deity || 'library');
          detail.searchParams.set('url', track.url || track.localPath || '');
          location.href = detail.href;
          return;
        }
        if (track.url && !track.localPath) { playLocal({ te: track.te, en: track.en, tag: track.tag, localPath: track.url }); return; }
        if (track.localPath) playLocal(track);
        else {
          const url = track.src || yt(track.te + ' ' + track.en);
          const label = track.src ? 'Listen on Stotra Nidhi \u2197' : 'Open the internet \u2197';
          toast('Not stored here — listen online: <a href="' + url + '" target="_blank" rel="noopener">' + label + '</a>', 5600);
          openChat();
          bot('I don\u2019t have <b>' + esc(track.te) + '</b> saved as audio in the local library, so I can\u2019t play it in-page right now. The chant is published by <b>Stotra Nidhi</b> online — listen there: <a class="msg-link" href="' + url + '" target="_blank" rel="noopener">' + label + '</a>');
        }
      });
    });
  }
  attachTrackCards();

  /* ---------- Audio page filter ---------- */
  const filterRow = $('.filter-row');
  if (filterRow) {
    const grid = $('#audioGrid');
    const items = Array.from($$('.track-card', grid));
    $$('.filter-chip', filterRow).forEach(chip => {
      chip.addEventListener('click', () => {
        $$('.filter-chip', filterRow).forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const f = chip.dataset.filter;
        items.forEach(card => {
          const track = D.audio.find(a => a.slug === card.dataset.slug);
          card.style.display = (f === 'all' || track.deity === f) ? '' : 'none';
        });
      });
    });
  }

  /* ---------- Deity page tabs ---------- */
  const tabs = $('.tabs');
  if (tabs) {
    const panelAudio = $('#panelAudio');
    const panelBooks = $('#panelBooks');
    $$('.tab', tabs).forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.tab', tabs).forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const which = tab.dataset.tab;
        if (panelAudio) panelAudio.style.display = which === 'audio' ? '' : 'none';
        if (panelBooks) panelBooks.style.display = which === 'books' ? '' : 'none';
      });
    });
  }

  /* ---------- Ask Deepam chat ---------- */
  const askbtn = $('#askBtn');
  const panel = $('#chatPanel');
  const msgs = $('#chatMsgs');
  const form = $('#chatForm');
  const input = $('#chatInput');
  const sugg = $('#chatSugg');
  let greeted = false;

  function say(html, who) {
    if (!msgs) return;
    const row = document.createElement('div');
    row.className = 'msg ' + who;
    const b = document.createElement('div');
    b.className = 'msg-bubble';
    b.innerHTML = html;
    row.appendChild(b);
    msgs.appendChild(row);
    msgs.scrollTop = msgs.scrollHeight;
  }
  const bot = (h) => say(h, 'bot');
  const userSay = (h) => say(h, 'user');

  function openChat() {
    if (panel) panel.classList.add('open');
    if (askbtn) askbtn.innerHTML = '<span class="ask-icon">✕</span>Close';
    if (!greeted) {
      greeted = true;
      bot('నమస్తే ✦ I\u2019m <b>Rushi</b>. Ask me to <b>play</b> a bhajan or chant, open a <b>deity</b> or <b>book</b>, or point you to content on the internet. Try: <i>“Play సాయి ఆరతి”</i> or <i>“Books for Shiva”</i>');
      renderSuggestions();
    }
    if (input) input.focus();
  }

  function closeChat() {
    if (panel) panel.classList.remove('open');
    if (askbtn) askbtn.innerHTML = '<span class="ask-icon">✦</span>Ask Rushi';
  }

  if (askbtn) askbtn.addEventListener('click', () => {
    if (panel && panel.classList.contains('open')) closeChat(); else openChat();
  });
  if (form) form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    userSay(esc(text));
    input.value = '';
    handle(text);
  });

  function renderSuggestions() {
    if (!sugg) return;
    sugg.innerHTML = '';
    ['Play శ్రీ వేంకటేశ సుప్రభాతం', 'Play Sai aarti', 'Books for Shiva', 'Open Hanuman', 'help'].forEach(s => {
      const chip = document.createElement('button');
      chip.className = 'sugg-chip';
      chip.textContent = s;
      chip.addEventListener('click', () => { userSay(esc(s)); handle(s); });
      sugg.appendChild(chip);
    });
  }

  function findDeity(q) {
    return D.deities.find(d => q.includes(norm(d.label)) || q.includes(norm(d.te)));
  }
  function findTrack(q) {
    return D.audio.find(a => q.includes(norm(a.te)) || q.includes(norm(a.en))) ||
      D.audio.find(a => q.includes(norm(a.tag)) && q.includes(norm(deityBySlug(a.deity).label)));
  }
  function findBook(q) {
    const byName = D.books.find(b => q.includes(norm(b.en)) || q.includes(norm(b.te)));
    if (byName) return byName;
    const deity = D.deities.find(d => q.includes(norm(d.label)) || q.includes(norm(d.te)));
    if (deity) return booksOfDeity(deity.slug)[0];
    return null;
  }

  function handle(text) {
    const q = norm(text);
    if (!q) return;

    if (/^(hi|hey|hello|నమస్తే|namaste)\b/.test(q) || q === 'hello')
      return bot('నమస్తే ✦ Try: <i>“Play సాయి ఆరతి”</i>, <i>“Open Hanuman”</i>, or <i>“Books for Shiva”</i>.');
    if (/help|what can you/.test(q))
      return bot('I can <b>play</b> recordings stored locally, <b>open</b> deity pages and books, or point you to the internet when a resource isn\u2019t available here yet. Just ask.');
    if (/who are you|what are you/.test(q))
      return bot('I\u2019m <b>Rushi</b> ✦ — a small AI companion for this Telugu bhakti library, your guide to listening and reading here.');

    if (/play|listen|stream|bhajan|chant|aarti|song|song\b|audio/.test(q) || findTrack(q)) {
      const track = findTrack(q);
      if (track) {
        if (track.comingSoon)
          return bot('<b>' + esc(track.te) + '</b> is <b>coming soon</b> to Saptarushi ✦. You can find it on the internet meanwhile: <a class="msg-link" href="' + yt(track.te + ' ' + track.en) + '" target="_blank" rel="noopener">Open on the internet \u2197</a>');
        if (track.localPath) { playLocal(track); return bot('▶ Playing <b>' + esc(track.te) + '</b> right here in-page.'); }
        return bot('I don\u2019t have <b>' + esc(track.te) + '</b> stored locally, so I can\u2019t play it in-page yet. It is available online: <a class="msg-link" href="' + yt(track.te + ' ' + track.en) + '" target="_blank" rel="noopener">Open it on the internet \u2197</a><br><small>Add an mp3 to <code>localPath</code> in data.js and it\u2019ll play here.</small>');
      }
      return bot('I couldn\u2019t find that recording. Try one of these on the internet: <a class="msg-link" href="' + yt(text) + '" target="_blank" rel="noopener">Search YouTube \u2197</a>');
    }

    const book = findTrack(q) ? null : findBook(q);
    if (/book|read|chapter|books/.test(q) && book) {
      if (book.comingSoon)
        return bot('<b>' + esc(book.en) + '</b> is coming soon. Read more on the internet: <a class="msg-link" href="' + web(book.te) + '" target="_blank" rel="noopener">Search \u2197</a>');
      return bot('Opening <b>' + esc(book.en) + '</b> («' + esc(book.te) + '») — <a class="msg-link" href="books/' + book.slug + '.html">Read it here \u2197</a>');
    }

    const deity = findDeity(q);
    if (deity && !book) {
      const aud = audioOfDeity(deity.slug);
      bot('Opening <b>' + esc(deity.label) + '</b> — ' + esc(deity.te) + '.<br><a class="msg-link" href="deity/' + deity.slug + '.html">Go to the page \u2197</a>');
      if (aud.length) {
        const quick = aud.filter(a => !a.comingSoon).slice(0, 3);
        if (quick.length) bot('Play here: ' + quick.map(a => '<button class="sugg-chip play-quick" data-q="' + esc(a.te) + '">▶ ' + esc(a.te) + '</button>').join(' '));
      }
      return;
    }

    bot('I couldn\u2019t find that in the library. Let me look it up: <a class="msg-link" href="' + web(text) + '" target="_blank" rel="noopener">Search the web \u2197</a>. Or try <i>“Play Sai aarti”</i>.');
  }

  if (msgs) msgs.addEventListener('click', (e) => {
    const chip = e.target.closest('.play-quick');
    if (chip) handle('play ' + chip.dataset.q);
  });

  /* ---------- site-wide language switcher ---------- */
  function initSiteLanguages() {
    const supported = ['en', 'te'];
    const labels = { en: 'English', te: 'తెలుగు' };
    const pageKey = location.pathname.replace(/\/+$/, '') || '/';
    const headerRight = document.querySelector('.header-right');
    if (!headerRight || headerRight.querySelector('.site-language-switch')) return;

    const wrap = document.createElement('div');
    wrap.className = 'site-language-switch';
    wrap.setAttribute('aria-label', 'Language');
    wrap.innerHTML = supported.map(function (lang) {
      return '<button type="button" class="site-lang-btn" data-lang="' + lang + '">' + labels[lang] + '</button>';
    }).join('');
    headerRight.insertBefore(wrap, headerRight.firstChild);

    let current = localStorage.getItem('saptarushi-lang');
    if (supported.indexOf(current) < 0) current = 'en';

    function getTargets() {
      return Array.from(document.querySelectorAll([
        'main h1','main h2','main h3','main p','main .section-count','main .see-all',
        'main .hero-eyebrow','main .hero-title','main .hero-desc','main .book-te','main .book-en',
        'main .book-meta','main .book-meta-line','main .reading-h','main .reading-p',
        'main .temple-badge','main .temple-name','main .temple-deity','main .temple-loc',
        'main label'
      ].join(','))).filter(function (el) {
        return el.textContent.trim() && !el.closest('.fab-zone,.player-bar,button,a,.site-editor-panel');
      });
    }

    function applyLanguage(lang, store) {
      current = supported.indexOf(lang) >= 0 ? lang : 'en';
      localStorage.setItem('saptarushi-lang', current);
      document.documentElement.lang = current === 'te' ? 'te' : 'en';
      wrap.querySelectorAll('.site-lang-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.lang === current); });
      const page = store && store.pages && store.pages[pageKey];
      const languageData = page && page.languages && page.languages[current];
      const values = languageData && languageData.values;
      if (Array.isArray(values)) {
        const targets = getTargets();
        targets.forEach(function (el, i) { if (typeof values[i] === 'string') el.textContent = values[i]; });
      }
      // Apply page-level fields saved from the Admin > Pages studio.
      if (languageData) {
        const firstHeading = document.querySelector('main h1');
        const desc = document.querySelector('main .hero-desc') || document.querySelector('main .page-intro') || document.querySelector('main > section p');
        if (languageData.title && firstHeading) firstHeading.textContent = languageData.title;
        if (languageData.description && desc) desc.textContent = languageData.description;
        let managed = document.querySelector('.managed-page-content');
        if (languageData.body) {
          if (!managed) {
            managed = document.createElement('div');
            managed.className = 'managed-page-content reading-p';
            const main = document.querySelector('main');
            if (main) main.appendChild(managed);
          }
          managed.textContent = languageData.body;
          managed.style.display = '';
        } else if (managed) managed.style.display = 'none';
      }
      document.dispatchEvent(new CustomEvent('saptarushi:languagechange', { detail: { lang: current } }));
    }

    wrap.addEventListener('click', function (e) {
      const btn = e.target.closest('.site-lang-btn');
      if (!btn) return;
      fetch(base + 'api/content').then(function (r) { return r.ok ? r.json() : {}; }).then(function (store) {
        applyLanguage(btn.dataset.lang, store);
      }).catch(function () { applyLanguage(btn.dataset.lang, null); });
    });
    fetch(base + 'api/content').then(function (r) { return r.ok ? r.json() : {}; }).then(function (store) { applyLanguage(current, store); }).catch(function () { applyLanguage(current, null); });
  }

  /* ---------- admin page text editor ---------- */
  function initSiteEditor() {
    if (!localStorage.getItem('saptarushi-admin-token')) return;
    const pageKey = location.pathname.replace(/\/+$/, '') || '/';
    const editableSelector = [
      'main h1', 'main h2', 'main h3', 'main p', 'main label',
      'main .section-count', 'main .see-all', 'main .hero-eyebrow',
      'main .hero-title', 'main .hero-desc', 'main .book-te', 'main .book-en',
      'main .book-meta', 'main .book-meta-line', 'main .reading-h', 'main .reading-p',
      'main .temple-badge', 'main .temple-name', 'main .temple-deity', 'main .temple-loc'
    ].join(',');
    let targets = [];
    let savedValues = [];
    let pageStore = {};
    let currentLang = localStorage.getItem('saptarushi-lang') || 'en';
    if (['en','te','sa'].indexOf(currentLang) < 0) currentLang = 'en';

    function collectTargets() {
      targets = Array.from(document.querySelectorAll(editableSelector)).filter(function (element) {
        return element.textContent.trim() && !element.closest('.fab-zone, .player-bar, button, a');
      });
    }

    function setEditable(on) {
      targets.forEach(function (element) {
        element.contentEditable = on ? 'true' : 'false';
        element.classList.toggle('site-editing', on);
      });
    }

    const panel = document.createElement('div');
    panel.className = 'site-editor-panel';
    panel.innerHTML = '<div class="site-editor-lang" aria-label="Edit language"><button type="button" data-lang="en">English</button><button type="button" data-lang="te">తెలుగు</button><button type="button" data-lang="sa">संस्कृतम्</button></div>' +
      '<button type="button" class="site-editor-toggle">Edit page text</button>' +
      '<label class="site-editor-pdf">Upload PDF<input type="file" accept="application/pdf" class="site-editor-pdf-input"/></label>' +
      '<label class="site-editor-audio">Upload MP3<input type="file" accept="audio/mpeg,audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.opus,.webm" multiple class="site-editor-audio-input"/></label>' +
      '<span class="site-editor-status" aria-live="polite"></span>' +
      '<textarea class="site-editor-pdf-output" aria-label="Parsed PDF text" placeholder="Parsed PDF text will appear here"></textarea>' +
      '<div class="site-editor-audio-library" aria-label="Page audio library"></div>';
    const editorHost = document.querySelector('.audio-detail-management') || document.body;
    editorHost.appendChild(panel);
    const toggle = panel.querySelector('.site-editor-toggle');
    const status = panel.querySelector('.site-editor-status');
    const pdfInput = panel.querySelector('.site-editor-pdf-input');
    const audioInput = panel.querySelector('.site-editor-audio-input');
    const pdfOutput = panel.querySelector('.site-editor-pdf-output');
    const audioLibrary = panel.querySelector('.site-editor-audio-library');
    let editing = false;

    function pageAudioFolder() {
      return 'page-' + (pageKey.split('/').filter(Boolean).pop() || 'home').replace(/[^a-z0-9_-]+/gi, '-');
    }

    function renderPageAudio(audioIndex) {
      if (!window.MediaPlayer || !audioLibrary) return;
      const tracks = (audioIndex || []).filter(function (track) { return track.folder === pageAudioFolder(); });
      const inheritedPlayer = document.querySelector('.audio-detail-player');
      if (inheritedPlayer) inheritedPlayer.style.display = tracks.length ? 'none' : '';
      audioLibrary.innerHTML = tracks.length ? '<h3>Page audio</h3>' : '';
      if (tracks.length) MediaPlayer.renderFolders(audioLibrary, tracks);
    }

    fetch(base + 'api/media').then(function (response) { return response.ok ? response.json() : null; }).then(function (media) {
      renderPageAudio(media && media.audio);
    }).catch(function () {});

    pdfInput.addEventListener('change', function () {
      const file = pdfInput.files && pdfInput.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('pdf', file, file.name);
      status.textContent = 'Parsing PDF…';
      fetch(base + 'api/extract-pdf', {
        method: 'POST',
        headers: { 'X-Admin-Token': localStorage.getItem('saptarushi-admin-token') },
        body: formData
      }).then(function (response) { return response.json(); }).then(function (result) {
        if (!result.ok) throw new Error(result.error || 'Could not parse PDF');
        pdfOutput.value = result.text || '';
        pdfOutput.classList.add('show');
        status.textContent = (result.wordCount || 0) + ' words parsed';
      }).catch(function (error) { status.textContent = error.message; });
    });

    audioInput.addEventListener('change', function () {
      const files = Array.from(audioInput.files || []).filter(function (file) {
        return /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|webm)$/i.test(file.name) || file.type.indexOf('audio/') === 0;
      });
      if (!files.length) { status.textContent = 'Choose an audio file'; return; }
      const pageFolder = pageAudioFolder();
      const formData = new FormData();
      formData.append('folder', pageFolder);
      formData.append('dest', 'audio');
      files.forEach(function (file) { formData.append('files', file, file.name); });
      status.textContent = 'Uploading ' + files.length + ' audio file' + (files.length === 1 ? '' : 's') + '…';
      fetch(base + 'api/upload?path=' + encodeURIComponent('audio/' + pageFolder), {
        method: 'POST',
        headers: { 'X-Admin-Token': localStorage.getItem('saptarushi-admin-token') },
        body: formData
      }).then(function (response) { return response.text().then(function (body) { let result; try { result = JSON.parse(body); } catch (_) { throw new Error(body || ('Upload failed (' + response.status + ')')); } if (!response.ok) throw new Error(result.error || ('Upload failed (' + response.status + ')')); return result; }); }).then(function (result) {
        if (!result.ok) throw new Error(result.error || 'Could not upload audio');
        status.textContent = 'Uploaded ' + result.count + ' audio file' + (result.count === 1 ? '' : 's');
        renderPageAudio(result.audioIndex);
        audioInput.value = '';
      }).catch(function (error) { status.textContent = error.message; });
    });

    function finishEdit() {
      editing = false;
      setEditable(false);
      toggle.textContent = 'Edit page text';
      panel.classList.remove('editing');
    }

    function savePage() {
      pageStore[pageKey] = pageStore[pageKey] || { languages: {} };
      pageStore[pageKey].languages = pageStore[pageKey].languages || {};
      pageStore[pageKey].languages[currentLang] = { values: targets.map(function (element) { return element.textContent; }) };
      pageStore[pageKey].updated = new Date().toISOString();
      fetch(base + 'api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': localStorage.getItem('saptarushi-admin-token') },
        body: JSON.stringify({ data: JSON.stringify({ pages: pageStore }) })
      }).then(function (response) { return response.json(); }).then(function (result) {
        if (!result.ok) throw new Error(result.error || 'Could not save page');
        savedValues = pageStore[pageKey].values.slice();
        status.textContent = 'Saved';
        finishEdit();
        setTimeout(function () { status.textContent = ''; }, 2200);
      }).catch(function (error) { status.textContent = error.message; });
    }

    toggle.addEventListener('click', function () {
      if (editing) {
        savePage();
        return;
      }
      collectTargets();
      savedValues = targets.map(function (element) { return element.textContent; });
      editing = true;
      toggle.textContent = 'Save page text';
      panel.classList.add('editing');
      setEditable(true);
    });

    fetch(base + 'api/content').then(function (response) { return response.ok ? response.json() : null; }).then(function (store) {
      pageStore = store && store.pages || {};
      collectTargets();
      function loadEditorLanguage(lang) {
        currentLang = lang;
        localStorage.setItem('saptarushi-lang', lang);
        panel.querySelectorAll('.site-editor-lang button').forEach(function (b) { b.classList.toggle('active', b.dataset.lang === lang); });
        collectTargets();
        const page = pageStore[pageKey] || {};
        const values = page.languages && page.languages[lang] && page.languages[lang].values;
        if (Array.isArray(values)) targets.forEach(function (element, index) { if (typeof values[index] === 'string') element.textContent = values[index]; });
      }
      panel.querySelector('.site-editor-lang').addEventListener('click', function (e) {
        const btn = e.target.closest('button'); if (!btn || editing) return;
        loadEditorLanguage(btn.dataset.lang);
      });
      loadEditorLanguage(currentLang);
    }).catch(function () {});

    window.addEventListener('beforeunload', function () {
      if (!editing) return;
      targets.forEach(function (element, index) { element.textContent = savedValues[index] || element.textContent; });
    });
  }

  function initTempleLanguageExtras() {
    const teluguBlock = document.querySelector('.temple-lang[data-lang="te"]');
    const readingColumn = document.querySelector('.reading-column');
    if (!teluguBlock || !readingColumn) return;

    document.querySelectorAll('.temple-deity-credit').forEach((credit) => credit.remove());
    const englishExtras = [];
    Array.from(readingColumn.children).forEach((element) => {
      if (!element.matches('h2.reading-h')) return;
      const label = element.textContent.trim().toLowerCase();
      if (!label.includes('story') && !label.includes('significance')) return;
      const paragraph = element.nextElementSibling;
      if (!paragraph || !paragraph.matches('p.reading-p')) return;
      englishExtras.push({ type: label.includes('story') ? 'story' : 'significance', heading: element, paragraph });
    });

    const buttons = Array.from(document.querySelectorAll('.lang-switch .lang-btn'));
    let activeLanguage = localStorage.getItem('saptarushi-lang') === 'te' ? 'te' : 'en';
    let teluguExtras = null;
    function applyLanguage(language) {
      activeLanguage = language === 'te' ? 'te' : 'en';
      englishExtras.forEach((item) => {
        item.heading.style.display = activeLanguage === 'en' ? '' : 'none';
        item.paragraph.style.display = activeLanguage === 'en' ? '' : 'none';
      });
      if (teluguExtras) teluguExtras.style.display = activeLanguage === 'te' ? '' : 'none';
    }
    buttons.forEach((button) => button.addEventListener('click', () => applyLanguage(button.dataset.lang)));
    applyLanguage(activeLanguage);

    const slugMatch = location.pathname.match(/([^/]+)\.html$/);
    const slug = slugMatch ? slugMatch[1] : '';
    if (!slug) return;
    fetch(base + 'temples-content.json').then((response) => response.ok ? response.json() : null).then((content) => {
      const record = content && content[slug] && content[slug].te;
      if (!record) return;
      teluguExtras = document.createElement('div');
      teluguExtras.className = 'temple-extra-telugu';
      teluguExtras.innerHTML = '<h2 class="reading-h" lang="te">కథ</h2><p class="reading-p" lang="te">' + esc(record.sthalapuram) + '</p>' +
        '<h2 class="reading-h" lang="te">ప్రాముఖ్యత</h2><p class="reading-p" lang="te">' + esc(record.reverence) + '</p>';
      teluguBlock.appendChild(teluguExtras);
      applyLanguage(activeLanguage);
    }).catch(() => {});
  }

  function renderAdminHomeAudio(store) {
    const grid = document.querySelector('#homeAudioGrid');
    if (!grid || !store || !Array.isArray(store.audio)) return;
    const known = new Set(Array.from(grid.querySelectorAll('[data-slug]')).map((card) => card.dataset.slug));
    const imageByDeity = {
      venkateswara: 'venkateswara.jpg', shiva: 'shiva.jpg', rama: 'rama.jpg', krishna: 'krishna.png',
      ganesha: 'ganesha.jpg', hanuman: 'hanuman.jpg', 'durga / devi': 'durga.jpg', lakshmi: 'lakshmi.jpg',
      saibaba: 'saibaba.jpg', ayyappa: 'ayyappa.jpg', subrahmanya: 'subrahmanya.jpg', navagraha: 'navagraha.jpg'
    };
    store.audio.filter((track) => track && track.slug && !known.has(track.slug)).forEach((track) => {
      const deity = String(track.deity || '').toLowerCase();
      const image = base + 'assets/deities/' + (imageByDeity[deity] || 'venkateswara.jpg');
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'track-card';
      card.dataset.slug = track.slug;
      card.innerHTML = '<div class="track-art"><img src="' + esc(image) + '" alt="" loading="lazy"/><span class="track-play-btn" aria-hidden="true">▶</span></div>' +
        '<div class="track-row"><p class="track-te truncate" lang="te">' + esc(track.te || track.name || track.slug) + '</p></div>' +
        '<p class="track-meta truncate">' + esc(track.en || track.name || 'From the library') + '</p>';
      grid.appendChild(card);
    });
    attachTrackCards();
  }

  initTempleLanguageExtras();
  initSiteLanguages();
  initSiteEditor();

  /* ---------- Book chapter switcher ---------- */
  const chapterNav = $('.chapter-nav');
  if (chapterNav) {
    const bodies = Array.from(document.querySelectorAll('.chapter-body'));
    $$('.chapter-btn', chapterNav).forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.chapter-btn', chapterNav).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const i = +btn.dataset.i;
        bodies.forEach(bd => { bd.style.display = (+bd.dataset.i === i) ? '' : 'none'; });
      });
    });
  }

  /* ---------- Chat close ---------- */
  const chatMin = $('#chatMin');
  if (chatMin) chatMin.addEventListener('click', closeChat);

  /* ---------- Expose ---------- */
  window.DeepamRuntime = { stopPlayer, toast, openChat };
})();