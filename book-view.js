/* ============================================================================
   Saptarushi · Book Reader
   ----------------------------------------------------------------------------
   Loaded on every book page. Enhances the reader with:
     – English / తెలుగు / संस्कृतम् tabs (from admin content)
     – clean, re-flowable text rendering (PDF text comes in as text, never as a
       scanned image)
     – narration audio player with repeat button
     – inline text editing with rich text controls (bold, italic, underline,
       font size, language switching, transliteration)
   Falls back silently to the static chapter markup when no admin content
   exists for the page.
   ============================================================================ */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.from((r || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      if (c === '&') return String.fromCharCode(38) + 'amp;';
      if (c === '<') return String.fromCharCode(38) + 'lt;';
      if (c === '>') return String.fromCharCode(38) + 'gt;';
      if (c === '"') return String.fromCharCode(38) + 'quot;';
      return String.fromCharCode(38) + '#39;';
    });
  };

  function slugFromPage() {
    var m = location.pathname.match(/([^/]+)\.html$/);
    var base = m ? m[1] : '';
    return base.replace(/\.html$/, '');
  }

  var baseDir = location.pathname.indexOf('/books/') >= 0 ? '../' : './';

  function detectLang(text) {
    if (!text) return 'en';
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
    if (/[\u0900-\u097F]/.test(text)) return 'sa';
    return 'en';
  }

  function fontClass(lang) { return lang === 'sa' ? 'font-sa' : lang === 'te' ? 'font-te' : 'font-en'; }

  /* ---------- rich text: `![caption](url)` lines render as captioned photos ---------- */
  function escUrl(u) { return esc(u).replace(/&#39;/g, '%27'); }
  function figureHtml(url, caption) {
    return '<figure class="book-content-figure"><img class="book-content-img" src="' + escUrl(url) + '" alt="' + esc(caption || 'Book image') + '" loading="lazy"/>' +
      (caption ? '<figcaption>' + esc(caption) + '</figcaption>' : '') + '</figure>';
  }
  function richHtml(raw) {
    var lines = String(raw == null ? '' : raw).split('\n');
    var out = [], buf = [];
    function flush() {
      // drop trailing blank lines but keep intentional spacing via <br>
      while (buf.length && !buf[buf.length - 1].trim()) buf.pop();
      while (buf.length && !buf[0].trim()) buf.shift();
      if (!buf.length) return;
      out.push('<div class="book-rich-text">' + esc(buf.join('\n')).replace(/\n/g, '<br>') + '</div>');
      buf = [];
    }
    lines.forEach(function (ln) {
      var m = ln.match(/^\s*!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)\s*$/);
      if (m) { flush(); out.push(figureHtml(m[2], m[1])); return; }
      var bare = ln.trim().match(/^((?:\/media\/|media\/|uploads\/|content\/|assets\/|https?:\/\/)\S+\.(?:jpe?g|png|webp|gif))(\?\S*)?$/i);
      if (bare) { flush(); out.push(figureHtml(bare[1] + (bare[2] || ''), '')); return; }
      buf.push(ln);
    });
    flush();
    return out.join('');
  }
  function renderRich(el, raw) { el.innerHTML = richHtml(raw); }
  function updateCoverImage(layout, book) {
    var url = book && (book.imageUrl || book.coverUrl);
    if (!url) return;
    var img = $('.book-cover-fig img', layout) || $('.book-aside img', layout);
    if (img && img.getAttribute('src') !== url) img.setAttribute('src', url);
  }

  /* ---------- shared upload helpers (used by both the admin-JSON book
     reader and the static-HTML book reader) ---------- */
  function showToast(msg) {
    var toast = document.createElement('div');
    toast.className = 'toast show';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function () { toast.classList.remove('show'); setTimeout(function () { toast.remove(); }, 400); }, 3200);
  }

  // Uploads a PDF and returns its extracted TEXT — never rendered as a PDF
  // embed/viewer, always as plain reflowable text the reader can style.
  function extractPdfToText(file, onText) {
    var token = localStorage.getItem('saptarushi-admin-token') || '';
    if (!token) { alert('Please log in as Admin first to upload a PDF. Go to the Admin portal.'); return; }
    var fd = new FormData();
    fd.append('file', file, file.name);
    fetch(baseDir + 'api/extract-pdf', { method: 'POST', headers: { 'X-Admin-Token': token }, body: fd })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.ok) { alert('Could not read that PDF: ' + (d.error || 'unknown error')); return; }
        onText(d.text, d.wordCount);
        showToast('✓ PDF text loaded (' + d.wordCount + ' words) — review, then Save');
      })
      .catch(function (e) { alert('PDF upload failed: ' + e.message); });
  }

  function uploadNarrationAudio(file, folder, onUrl) {
    var fd = new FormData();
    fd.append('folder', folder || 'library');
    fd.append('file', file, file.name);
    fetch(baseDir + 'api/upload', { method: 'POST', body: fd })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.ok || !d.saved || !d.saved[0]) { alert('Audio upload failed.'); return; }
        onUrl(d.saved[0].url);
        showToast('✓ Audio uploaded — review, then Save');
      })
      .catch(function (e) { alert('Audio upload failed: ' + e.message); });
  }

  // Creates the cover-note element only — no toolbar of its own. It's
  // wired into the single page-level editor's `editableEls` by the caller,
  // so editing/saving/cancelling it goes through that one shared toolbar.
  function addCoverNote(book, layout) {
    var aside = $('.book-aside', layout);
    var figure = $('.book-cover-fig', aside);
    if (!aside || !figure || (!book.coverText && !(window.TextEditor && TextEditor.isAdmin()))) return null;
    var note = document.createElement('div');
    note.className = 'book-cover-note';
    note.textContent = book.coverText || '';
    figure.insertAdjacentElement('afterend', note);
    return note;
  }

  /* ---------- narration audio row ---------- */
  function buildPlayer(url, name) {
    var wrap = document.createElement('div');
    wrap.className = 'mp-row';
    wrap.dataset.url = url;
    wrap.innerHTML =
      '<span class="mp-row-art"><button class="mp-play" type="button" aria-label="Play">▶</button></span>' +
      '<span class="mp-row-info"><span class="mp-row-title">' + esc(name || 'Narration audio') + '</span><span class="mp-row-meta">Listen while you read</span></span>' +
      '<span class="mp-dur">—</span>' +
      '<button class="mp-repeat" type="button" title="Repeat" aria-label="Repeat">🔁</button>';
    var play = $('.mp-play', wrap);
    var rep = $('.mp-repeat', wrap);
    var dur = $('.mp-dur', wrap);
    play.addEventListener('click', function () { MediaPlayer.play(wrap, { repeat: wrap.dataset.repeat === '1' }); });
    rep.addEventListener('click', function () {
      var on = wrap.dataset.repeat === '1';
      wrap.dataset.repeat = on ? '' : '1';
      rep.classList.toggle('on', !on);
    });
    var a = new Audio();
    a.preload = 'metadata';
    a.onloadedmetadata = function () { dur.textContent = MediaPlayer.fmtDuration(a.duration); };
    a.src = url;
    return wrap;
  }

  /* ---------- render admin book content ---------- */
  function renderBook(book) {
    var layout = $('.book-layout');
    if (!layout) return false;

    // Reader container
    var existing = $('#saptarishiReader');
    if (existing) existing.remove();
    var reader = document.createElement('div');
    reader.id = 'saptarishiReader';
    reader.className = 'book-reader-container';
    reader.style.cssText = 'margin-top:1.5rem;border-top:1px solid var(--line-12);padding-top:1.5rem';

    var titleEl = $('#saptarishiReaderTitle');
    if (!titleEl) {
      titleEl = document.createElement('h2');
      titleEl.id = 'saptarishiReaderTitle';
      titleEl.className = 'book-h1';
      layout.prepend(titleEl);
    }
    titleEl.innerHTML = esc(book.title || book.en || '');
    var coverNote = addCoverNote(book, layout);
    updateCoverImage(layout, book);

    // language tabs
    var tabs = document.createElement('div');
    tabs.className = 'lang-switch';
    tabs.style.marginTop = '1rem';
    ['en', 'te', 'sa'].forEach(function (l) {
      var b = document.createElement('button');
      b.className = 'lang-btn' + (l === (book.lang || 'en') ? ' active' : '');
      b.dataset.lang = l;
      b.textContent = l === 'en' ? 'English' : l === 'te' ? 'తెలుగు' : 'संस्कृतम्';
      b.addEventListener('click', function () {
        $$('.lang-btn', tabs).forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        showLang(l);
      });
      tabs.appendChild(b);
    });

    // narration player
    var audioWrap = document.createElement('div');
    if (book.audioUrl) audioWrap.appendChild(buildPlayer(book.audioUrl, book.title));
    else { audioWrap.style.cssText = 'display:none'; }

    // text
    var textEl = document.createElement('div');
    textEl.className = 'sankalpam-text book-editable-box';
    textEl.style.cssText = 'max-width:unset;margin-top:1rem;white-space:pre-wrap;word-wrap:break-word';

    // Track current language for editing
    var currentLang = book.lang || 'en';
    var originalTexts = {
      en: book.textEn || book.text || '',
      te: book.textTe || (detectLang(book.text || '') === 'te' ? book.text : ''),
      sa: book.textSa || (detectLang(book.text || '') === 'sa' ? book.text : '')
    };
    if (!originalTexts.en && !originalTexts.te && !originalTexts.sa && book.text) originalTexts.en = book.text;

    function showLang(l) {
      currentLang = l;
      var txt = l === 'en' ? (originalTexts.en || book.text || '') : l === 'te' ? (originalTexts.te || book.text || '') : (originalTexts.sa || book.text || '');
      // choose text: prefer the per-language field; else use main text IF its script matches
      if (!txt && l !== 'en') {
        var mainLang = detectLang(book.text || '');
        txt = (mainLang === l) ? (book.text || '') : (book.textEn || book.text || '');
      }
      if (!txt) txt = (l === 'en' ? 'No English text yet. Add it from the admin Books page.' : (l === 'te' ? 'తెలుగు పాఠం ఇంకా చేర్చలేదు — అడ్మిన్ పేజీ నుండి జోడించండి.' : 'संस्कृत पाठ अभी तक नहीं जोड़ा गया।'));
      renderRich(textEl, txt);
      // keep the raw markdown for editing (image markers survive edit cycles)
      textEl.dataset.raw = txt;
      textEl.className = 'sankalpam-text ' + fontClass(l === 'en' ? (detectLang(txt)) : l);
    }
    function rawOfTextEl() {
      // While editing the element holds plain editable text; otherwise use the stored raw.
      if (textEl.isContentEditable) return textEl.textContent;
      return (typeof textEl.dataset.raw === 'string') ? textEl.dataset.raw : textEl.textContent;
    }

    reader.appendChild(tabs);
    reader.appendChild(audioWrap);
    reader.appendChild(textEl);
    layout.appendChild(reader);
    showLang(book.lang || 'en');

    // ---------- inline text editing — ONE toolbar for title + cover + body ----------
    if (window.TextEditor) {
      var pageEditableEls = [titleEl, textEl];
      if (coverNote) pageEditableEls.push(coverNote);
      TextEditor.createPageEditor({
        mount: layout,
        editableEls: pageEditableEls,
        lang: currentLang,
        forceShow: false,
        onLang: function (l) {
          // Save current text to originalTexts before switching
          originalTexts[currentLang] = rawOfTextEl();
          showLang(l);
        },
        onTransliterate: function (target) {
          var txt = rawOfTextEl();
          if (target === 'te' && window.LangLib) {
            txt = LangLib.toTelugu(txt);
            originalTexts[currentLang] = txt;
            textEl.dataset.raw = txt;
            textEl.textContent = txt;
            textEl.className = 'sankalpam-text font-te';
          } else if (target === 'sa' && window.LangLib) {
            txt = LangLib.toDevanagari(txt);
            originalTexts[currentLang] = txt;
            textEl.dataset.raw = txt;
            textEl.textContent = txt;
            textEl.className = 'sankalpam-text font-sa';
          }
        },
        onToggle: function (editing) {
          // Swap between rendered photos and raw markdown so image markers
          // (`![caption](url)`) survive edit cycles instead of being lost.
          // Note: originalTexts is only updated on Save / language switch,
          // so Cancel still restores the pre-edit text.
          if (editing) {
            textEl.textContent = rawOfTextEl();
          } else if (!textEl.isContentEditable) {
            textEl.dataset.raw = textEl.textContent;
            renderRich(textEl, textEl.dataset.raw);
          }
        },
        onSave: function () {
          originalTexts[currentLang] = rawOfTextEl();
          textEl.dataset.raw = originalTexts[currentLang];
          saveBookEdits();
        },
        onCancel: function () {
          // Restore original text/title/cover
          renderRich(textEl, originalTexts[currentLang] || '');
          textEl.dataset.raw = originalTexts[currentLang] || '';
          textEl.className = 'sankalpam-text ' + fontClass(currentLang === 'en' ? detectLang(originalTexts[currentLang] || '') : currentLang);
          titleEl.innerHTML = esc(book.title || book.en || '');
          if (coverNote) coverNote.textContent = book.coverText || '';
        },
        onUploadPdf: function (file) {
          // Extracted text is inserted as plain text into the language tab
          // it's actually written in, never shown as an embedded PDF.
          extractPdfToText(file, function (text) {
            var lang = detectLang(text) || currentLang;
            originalTexts[lang] = text;
            var langBtn = $('.lang-btn[data-lang="' + lang + '"]', tabs);
            if (langBtn && !langBtn.classList.contains('active')) {
              $$('.lang-btn', tabs).forEach(function (x) { x.classList.remove('active'); });
              langBtn.classList.add('active');
            }
            showLang(lang);
            // keep editing the raw text (not the rendered photos)
            textEl.textContent = originalTexts[lang] || text;
            textEl.contentEditable = 'true';
            textEl.classList.add('editing');
          });
        },
        onUploadMp3: function (file) {
          uploadNarrationAudio(file, book.slug || slugFromPage(), function (url) {
            book.audioUrl = url;
            audioWrap.innerHTML = '';
            audioWrap.style.cssText = '';
            audioWrap.appendChild(buildPlayer(url, book.title));
            saveBookEdits();
          });
        }
      });
    }

    function saveBookEdits() {
      var token = localStorage.getItem('saptarushi-admin-token') || '';
      if (!token) {
        alert('Please log in as Admin first to save edits. Go to the Admin portal.');
        return;
      }
      var payload = Object.assign({}, book, {
        title: titleEl.textContent.trim() || book.title,
        textEn: originalTexts.en || '',
        textTe: originalTexts.te || '',
        textSa: originalTexts.sa || '',
        text: originalTexts[currentLang] || originalTexts.en || originalTexts.te || originalTexts.sa || book.text || '',
        coverText: coverNote ? coverNote.textContent.trim() : book.coverText || '',
        lang: currentLang,
        updated: new Date().toISOString()
      });
      fetch(baseDir + 'api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
        body: JSON.stringify({ data: JSON.stringify(payload) })
      })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d.ok) {
            var toast = document.createElement('div');
            toast.className = 'toast show';
            toast.textContent = '✓ Book saved';
            document.body.appendChild(toast);
            setTimeout(function () { toast.classList.remove('show'); setTimeout(function () { toast.remove(); }, 400); }, 2500);
          } else {
            alert('Save failed: ' + (d.error || 'Unknown error'));
          }
        })
        .catch(function (e) { alert('Save error: ' + e.message); });
    }

    return true;
  }

  function staticBookData(chapters) {
    return {
      chapters: chapters.map(function (chapter) {
        return {
          title: $('.reading-h', chapter) ? $('.reading-h', chapter).textContent : '',
          paragraphs: $$('.reading-p', chapter).map(function (p) { return p.textContent; })
        };
      })
    };
  }

  function applyStaticBookData(book, chapters) {
    if (!book || !Array.isArray(book.chapters)) return;
    book.chapters.forEach(function (saved, i) {
      var chapter = chapters[i];
      if (!chapter) return;
      var heading = $('.reading-h', chapter);
      if (heading && saved.title) heading.textContent = saved.title;
      var paragraphs = $$('.reading-p', chapter);
      (saved.paragraphs || []).forEach(function (text, j) {
        if (paragraphs[j]) paragraphs[j].textContent = text;
      });
    });
  }

  function enhanceStaticBook(savedBook) {
    var layout = $('.book-layout');
    // Only bail if the page has no book layout at all — a page with no
    // chapters yet (e.g. a "coming soon" book) still gets the edit tool,
    // via the freeform block created below, instead of silently getting none.
    if (!layout || !window.TextEditor) return;

    var chapters = $$('.chapter-body', layout);
    var readingCol = $('.reading-column', layout);
    var freeform = null;

    if (!chapters.length && readingCol) {
      // No chapters exist yet — give the admin one freeform editable block
      // (replacing the static "coming soon" note) instead of no edit tool.
      freeform = document.createElement('div');
      freeform.className = 'sankalpam-text book-editable-box';
      freeform.style.cssText = 'white-space:pre-wrap;word-wrap:break-word';
      freeform.dataset.raw = (savedBook && savedBook.text) || '';
      renderRich(freeform, freeform.dataset.raw);
      readingCol.innerHTML = '';
      readingCol.appendChild(freeform);
    }

    updateCoverImage(layout, savedBook);
    applyStaticBookData(savedBook, chapters);
    var original = staticBookData(chapters);
    var titleEl = $('.book-aside .book-h1', layout);
    if (titleEl && savedBook && savedBook.title) titleEl.textContent = savedBook.title;
    var originalTitle = titleEl ? titleEl.textContent : '';
    var coverNote = addCoverNote(savedBook || {}, layout);
    var originalCoverText = coverNote ? coverNote.textContent : '';
    var originalFreeform = freeform ? (freeform.dataset.raw || freeform.textContent) : '';
    var slug = slugFromPage();
    var currentAudioUrl = (savedBook && savedBook.audioUrl) || '';
    var currentImageUrl = (savedBook && (savedBook.imageUrl || savedBook.coverUrl)) || '';

    function freeformRaw() {
      if (!freeform) return '';
      if (freeform.isContentEditable) return freeform.textContent;
      return (typeof freeform.dataset.raw === 'string') ? freeform.dataset.raw : freeform.textContent;
    }

    function save() {
      var token = localStorage.getItem('saptarushi-admin-token') || '';
      if (!token) {
        alert('Please log in as Admin first to save edits. Go to the Admin portal.');
        return;
      }
      var current = staticBookData(chapters);
      var payload = {
        slug: slug,
        title: titleEl ? titleEl.textContent.trim() : slug,
        chapters: current.chapters,
        text: freeform ? freeformRaw().trim() : undefined,
        audioUrl: currentAudioUrl || undefined,
        imageUrl: currentImageUrl || undefined,
        coverText: coverNote ? coverNote.textContent.trim() : '',
        updated: new Date().toISOString()
      };
      fetch('../api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
        body: JSON.stringify({ data: JSON.stringify(payload) })
      }).then(function (r) { return r.json(); }).then(function (result) {
        if (!result.ok) throw new Error(result.error || 'Could not save book');
        original = current;
        originalFreeform = freeform ? freeformRaw() : originalFreeform;
        if (freeform) freeform.dataset.raw = originalFreeform;
        showToast('✓ Book saved');
      }).catch(function (error) { alert('Save error: ' + error.message); });
    }

    function restore() {
      applyStaticBookData(original, chapters);
      if (titleEl) titleEl.textContent = originalTitle;
      if (coverNote) coverNote.textContent = originalCoverText;
      if (freeform) { freeform.dataset.raw = originalFreeform; renderRich(freeform, originalFreeform); }
    }

    // ---------- ONE toolbar for title + cover + body (chapters or freeform) ----------
    var editableEls = [];
    if (titleEl) editableEls.push(titleEl);
    if (coverNote) editableEls.push(coverNote);
    if (freeform) editableEls.push(freeform);
    chapters.forEach(function (chapter) {
      chapter.classList.add('book-editable-box');
      editableEls.push(chapter);
    });
    if (!editableEls.length) return;

    TextEditor.createPageEditor({
      mount: layout,
      editableEls: editableEls,
      lang: 'en',
      forceShow: false,
      onToggle: function (editing) {
        if (!freeform) return;
        if (editing) freeform.textContent = freeformRaw();
        else { freeform.dataset.raw = freeform.textContent; renderRich(freeform, freeform.dataset.raw); }
      },
      onSave: save,
      onCancel: restore,
      onUploadPdf: function (file) {
        extractPdfToText(file, function (text) {
          if (freeform) {
            freeform.textContent = text;
            freeform.contentEditable = 'true';
            freeform.classList.add('editing');
          } else if (chapters.length) {
            // put the extracted text into the first chapter as one block —
            // rendered as plain reflowable text, never an embedded PDF
            chapters[0].textContent = text;
            chapters[0].contentEditable = 'true';
            chapters[0].classList.add('editing');
          }
        });
      },
      onUploadMp3: function (file) {
        uploadNarrationAudio(file, slug, function (url) {
          currentAudioUrl = url;
          var existingPlayer = $('.mp-row', layout);
          if (existingPlayer) existingPlayer.remove();
          var player = buildPlayer(url, titleEl ? titleEl.textContent : slug);
          layout.insertBefore(player, readingCol || layout.lastChild);
          save();
        });
      }
    });
  }

  function init() {
    var slug = slugFromPage();
    if (!slug) return;
    // Opening the reader counts as visiting the tile: clear its NEW flag.
    try {
      var seenKey = 'saptarushi-seen-books';
      var seen = JSON.parse(localStorage.getItem(seenKey) || '[]');
      if (seen.indexOf(slug) < 0) {
        seen.push(slug);
        localStorage.setItem(seenKey, JSON.stringify(seen.slice(-500)));
      }
    } catch (_) {}
    fetch(baseDir + 'api/book/' + slug)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (book) {
        if (book && book.text) renderBook(book);
        else enhanceStaticBook(book);
      })
      .catch(function () { enhanceStaticBook(null); });
  }

  if (window.MediaPlayer) init();
  else {
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      if (window.MediaPlayer || tries > 30) { clearInterval(t); if (window.MediaPlayer) init(); }
    }, 120);
  }
})();