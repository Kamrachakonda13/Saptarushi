/* ============================================================================
   Saptarushi · Text Editor
   ----------------------------------------------------------------------------
   Provides rich text editing controls for book pages and audio metadata:
     – Edit mode toggle (pencil icon)
     – Bold / Italic / Underline / Font size controls
     – Language switching (English · తెలుగు · संस्कृतम्)
     – Transliteration buttons (IAST → Telugu / Devanagari)
     – Save / Cancel buttons
     – Works with the admin API to persist changes
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

  var EDITOR_STORAGE_KEY = 'saptarushi-editor-mode';
  var isAdmin = function () { return !!localStorage.getItem('saptarushi-admin-token'); };

  /* ---------- toolbar builder ---------- */
  function buildToolbar(container, opts) {
    opts = opts || {};
    var editLabel = opts.editLabel || 'Edit';
    var doneLabel = opts.doneLabel || 'Done';
    var bar = document.createElement('div');
    bar.className = 'text-editor-toolbar';

    // Edit toggle
    var editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'te-btn te-edit-toggle';
    editBtn.innerHTML = '\u270F\uFE0F <span>' + editLabel + '</span>';
    editBtn.title = 'Toggle edit mode';
    bar.appendChild(editBtn);

    // Formatting group
    var fmtGroup = document.createElement('div');
    fmtGroup.className = 'te-group';
    fmtGroup.style.display = 'none';

    var boldBtn = document.createElement('button');
    boldBtn.type = 'button';
    boldBtn.className = 'te-btn';
    boldBtn.innerHTML = '<b>B</b>';
    boldBtn.title = 'Bold';
    boldBtn.dataset.cmd = 'bold';
    fmtGroup.appendChild(boldBtn);

    var italicBtn = document.createElement('button');
    italicBtn.type = 'button';
    italicBtn.className = 'te-btn';
    italicBtn.innerHTML = '<i>I</i>';
    italicBtn.title = 'Italic';
    italicBtn.dataset.cmd = 'italic';
    fmtGroup.appendChild(italicBtn);

    var underlineBtn = document.createElement('button');
    underlineBtn.type = 'button';
    underlineBtn.className = 'te-btn';
    underlineBtn.innerHTML = '<u>U</u>';
    underlineBtn.title = 'Underline';
    underlineBtn.dataset.cmd = 'underline';
    fmtGroup.appendChild(underlineBtn);

    // Font size
    var sizeSelect = document.createElement('select');
    sizeSelect.className = 'te-select';
    sizeSelect.title = 'Font size';
    ['1', '1.25', '1.5', '1.75', '2'].forEach(function (s) {
      var o = document.createElement('option');
      o.value = s;
      o.textContent = s + '\u00D7';
      sizeSelect.appendChild(o);
    });
    sizeSelect.value = '1';
    sizeSelect.addEventListener('change', function () {
      if (opts.onFontSize) opts.onFontSize(sizeSelect.value);
    });
    fmtGroup.appendChild(sizeSelect);

    // Language switch
    var langGroup = document.createElement('div');
    langGroup.className = 'te-group te-lang-group';
    langGroup.style.display = 'none';
    ['en', 'te'].forEach(function (l) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'te-lang-btn' + (l === (opts.lang || 'en') ? ' active' : '');
      b.dataset.lang = l;
      b.textContent = l === 'en' ? 'EN' : 'తె';
      b.title = l === 'en' ? 'English' : 'తెలుగు';
      b.addEventListener('click', function () {
        $$('.te-lang-btn', langGroup).forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        if (opts.onLang) opts.onLang(l);
      });
      langGroup.appendChild(b);
    });
    fmtGroup.appendChild(langGroup);

    // Transliterate buttons
    var transGroup = document.createElement('div');
    transGroup.className = 'te-group';
    transGroup.style.display = 'none';
    var toTe = document.createElement('button');
    toTe.type = 'button';
    toTe.className = 'te-btn';
    toTe.textContent = '\u2192 \u0C24\u0C46\u0C32\u0C41\u0C17\u0C41';
    toTe.title = 'Transliterate to Telugu';
    toTe.addEventListener('click', function () {
      if (opts.onTransliterate) opts.onTransliterate('te');
    });
    transGroup.appendChild(toTe);

    var toSa = document.createElement('button');
    toSa.type = 'button';
    toSa.className = 'te-btn';
    toSa.textContent = '\u2192 \u0926\u0947\u0935\u0928\u093E\u0917\u0930\u0940';
    toSa.title = 'Transliterate to Devanagari';
    toSa.addEventListener('click', function () {
      if (opts.onTransliterate) opts.onTransliterate('sa');
    });
    transGroup.appendChild(toSa);

    // Save / Cancel
    var actionGroup = document.createElement('div');
    actionGroup.className = 'te-group te-actions';
    actionGroup.style.display = 'none';

    var saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'te-btn te-save';
    saveBtn.textContent = '\uD83D\uDCBE Save';
    saveBtn.addEventListener('click', function () {
      if (opts.onSave) opts.onSave();
    });
    actionGroup.appendChild(saveBtn);

    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'te-btn te-cancel';
    cancelBtn.textContent = '\u2715 Cancel';
    cancelBtn.addEventListener('click', function () {
      if (opts.onCancel) opts.onCancel();
    });
    actionGroup.appendChild(cancelBtn);

    bar.appendChild(fmtGroup);
    bar.appendChild(langGroup);
    bar.appendChild(transGroup);
    bar.appendChild(actionGroup);

    // Edit toggle behavior
    var editing = false;
    editBtn.addEventListener('click', function () {
      editing = !editing;
      editBtn.classList.toggle('active', editing);
      editBtn.innerHTML = editing ? '\u270F\uFE0F <span>' + doneLabel + '</span>' : '\u270F\uFE0F <span>' + editLabel + '</span>';
      fmtGroup.style.display = editing ? 'flex' : 'none';
      langGroup.style.display = editing ? 'flex' : 'none';
      transGroup.style.display = editing ? 'flex' : 'none';
      actionGroup.style.display = editing ? 'flex' : 'none';
      if (opts.onToggle) opts.onToggle(editing);
    });

    // Formatting commands
    fmtGroup.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-cmd]');
      if (!btn) return;
      e.preventDefault();
      document.execCommand(btn.dataset.cmd, false, null);
      if (opts.onFormat) opts.onFormat(btn.dataset.cmd);
    });

    container.appendChild(bar);
    return {
      bar: bar,
      editBtn: editBtn,
      fmtGroup: fmtGroup,
      langGroup: langGroup,
      transGroup: transGroup,
      actionGroup: actionGroup,
      setEditing: function (on) {
        editing = on;
        editBtn.classList.toggle('active', on);
        editBtn.innerHTML = on ? '\u270F\uFE0F <span>' + doneLabel + '</span>' : '\u270F\uFE0F <span>' + editLabel + '</span>';
        fmtGroup.style.display = on ? 'flex' : 'none';
        langGroup.style.display = on ? 'flex' : 'none';
        transGroup.style.display = on ? 'flex' : 'none';
        actionGroup.style.display = on ? 'flex' : 'none';
      },
      isEditing: function () { return editing; }
    };
  }

  /* ---------- make a text element editable ---------- */
  function makeEditable(el, opts) {
    opts = opts || {};
    var wrapper = document.createElement('div');
    wrapper.className = 'text-editor-wrap';
    el.parentNode.insertBefore(wrapper, el);
    wrapper.appendChild(el);

    var toolbar = buildToolbar(wrapper, {
      lang: opts.lang || 'en',
      onToggle: function (on) {
        el.contentEditable = on ? 'true' : 'false';
        el.classList.toggle('editing', on);
        if (on) el.focus();
      },
      onLang: function (l) {
        if (opts.onLang) opts.onLang(l);
      },
      onTransliterate: function (target) {
        if (opts.onTransliterate) opts.onTransliterate(target);
      },
      onSave: function () {
        if (opts.onSave) opts.onSave();
      },
      onCancel: function () {
        if (opts.onCancel) opts.onCancel();
      },
      onFontSize: function (size) {
        el.style.fontSize = (parseFloat(size) * 1.02) + 'rem';
      },
      onFormat: function (cmd) {
        if (opts.onFormat) opts.onFormat(cmd);
      }
    });

    // If admin, show edit button; otherwise hide it
    if (!isAdmin() && !opts.forceShow) {
      toolbar.bar.style.display = 'none';
    }

    return {
      wrapper: wrapper,
      toolbar: toolbar,
      el: el,
      getText: function () { return el.textContent; },
      setText: function (t) { el.textContent = t; },
      getHTML: function () { return el.innerHTML; },
      setHTML: function (h) { el.innerHTML = h; }
    };
  }

  /* ---------- single page-level editor ----------
     One toolbar that controls every editable region on a book page at once
     (title, cover note, body text / chapters) instead of a separate
     toolbar per element. Also carries the Upload PDF / Upload mp3 buttons.
     Rendered as a small tile pinned to the top-right of `opts.mount`. */
  function createPageEditor(opts) {
    opts = opts || {};
    var editableEls = (opts.editableEls || []).filter(Boolean);
    var mount = opts.mount;
    if (!mount || !editableEls.length) return null;

    var wrap = document.createElement('div');
    wrap.className = 'page-editor-toolbar-wrap' + (opts.corner === false ? '' : ' page-editor-toolbar--corner');

    var toolbar = buildToolbar(wrap, {
      lang: opts.lang || 'en',
      editLabel: 'Edit page text',
      doneLabel: 'Done editing',
      onToggle: function (on) {
        editableEls.forEach(function (el) {
          el.contentEditable = on ? 'true' : 'false';
          el.classList.toggle('editing', on);
        });
        uploadGroup.style.display = on ? 'flex' : 'none';
        if (on && editableEls[0]) editableEls[0].focus();
        if (opts.onToggle) opts.onToggle(on);
      },
      onLang: function (l) { if (opts.onLang) opts.onLang(l); },
      onTransliterate: function (target) { if (opts.onTransliterate) opts.onTransliterate(target); },
      onSave: function () { if (opts.onSave) opts.onSave(); },
      onCancel: function () { if (opts.onCancel) opts.onCancel(); },
      onFontSize: function (size) {
        editableEls.forEach(function (el) { el.style.fontSize = (parseFloat(size) * 1.02) + 'rem'; });
      },
      onFormat: function (cmd) { if (opts.onFormat) opts.onFormat(cmd); }
    });

    // ---- Upload PDF / Upload mp3, shown only while editing ----
    var uploadGroup = document.createElement('div');
    uploadGroup.className = 'te-group te-upload-group';
    uploadGroup.style.display = 'none';

    var pdfInput = document.createElement('input');
    pdfInput.type = 'file';
    pdfInput.accept = 'application/pdf';
    pdfInput.style.display = 'none';
    var pdfBtn = document.createElement('button');
    pdfBtn.type = 'button';
    pdfBtn.className = 'te-btn te-upload-pdf';
    pdfBtn.innerHTML = '\uD83D\uDCC4 <span>Upload PDF</span>';
    pdfBtn.title = 'Upload a PDF — its text is extracted and shown as clean, reflowable text, not a PDF viewer';
    pdfBtn.addEventListener('click', function () { pdfInput.click(); });
    pdfInput.addEventListener('change', function () {
      if (pdfInput.files && pdfInput.files[0] && opts.onUploadPdf) opts.onUploadPdf(pdfInput.files[0]);
      pdfInput.value = '';
    });

    var mp3Input = document.createElement('input');
    mp3Input.type = 'file';
    mp3Input.accept = 'audio/*';
    mp3Input.style.display = 'none';
    var mp3Btn = document.createElement('button');
    mp3Btn.type = 'button';
    mp3Btn.className = 'te-btn te-upload-mp3';
    mp3Btn.innerHTML = '\uD83C\uDFB5 <span>Upload mp3</span>';
    mp3Btn.title = 'Upload narration audio for this page';
    mp3Btn.addEventListener('click', function () { mp3Input.click(); });
    mp3Input.addEventListener('change', function () {
      if (mp3Input.files && mp3Input.files[0] && opts.onUploadMp3) opts.onUploadMp3(mp3Input.files[0]);
      mp3Input.value = '';
    });

    uploadGroup.appendChild(pdfBtn);
    uploadGroup.appendChild(pdfInput);
    uploadGroup.appendChild(mp3Btn);
    uploadGroup.appendChild(mp3Input);
    toolbar.bar.appendChild(uploadGroup);

    mount.appendChild(wrap);

    if (!isAdmin() && !opts.forceShow) {
      wrap.style.display = 'none';
    }

    return {
      wrap: wrap,
      toolbar: toolbar,
      setEditing: toolbar.setEditing,
      isEditing: toolbar.isEditing
    };
  }

  /* ---------- audio metadata editor ---------- */
  function makeAudioEditable(row, track, opts) {
    opts = opts || {};
    var titleEl = $('.mp-row-title', row);
    if (!titleEl) return null;

    var wrapper = document.createElement('div');
    wrapper.className = 'text-editor-wrap te-audio-wrap';
    titleEl.parentNode.insertBefore(wrapper, titleEl);
    wrapper.appendChild(titleEl);

    var toolbar = buildToolbar(wrapper, {
      lang: 'en',
      onToggle: function (on) {
        titleEl.contentEditable = on ? 'true' : 'false';
        titleEl.classList.toggle('editing', on);
        if (on) titleEl.focus();
      },
      onSave: function () {
        if (opts.onSave) opts.onSave(titleEl.textContent);
      },
      onCancel: function () {
        titleEl.textContent = track.name || track.file || '';
        titleEl.contentEditable = 'false';
        titleEl.classList.remove('editing');
        toolbar.setEditing(false);
      }
    });

    if (!isAdmin() && !opts.forceShow) {
      toolbar.bar.style.display = 'none';
    }

    return {
      wrapper: wrapper,
      toolbar: toolbar,
      el: titleEl,
      getText: function () { return titleEl.textContent; },
      setText: function (t) { titleEl.textContent = t; }
    };
  }

  /* ---------- expose ---------- */
  window.TextEditor = {
    makeEditable: makeEditable,
    makeAudioEditable: makeAudioEditable,
    createPageEditor: createPageEditor,
    isAdmin: isAdmin,
    esc: esc
  };
})();