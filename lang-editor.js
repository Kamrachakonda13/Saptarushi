/* ============================================================================
   Saptarushi · Language libraries
   ----------------------------------------------------------------------------
   Provides faithful in-browser transliteration for
     English (Latin)  ·  Telugu  ·  Deva‧āgarī (Sanskrit)
   plus script detection and font helpers.

   Public API:
     LangLib.detect(text)      -> 'en' | 'te' | 'sa'
     LangLib.toDevanagari(iast) -> Sanskrit text (IAST input → देवनागरी)
     LangLib.toTelugu(iast)     -> Sanskrit text (IAST input → తెలుగు)
     LangLib.transliterate(text, from, to)
     LangLib.scriptName(lang)
     LangLib.applyFont(el, lang)  -> sets the correct web font class
   ============================================================================ */
(function () {
  'use strict';

  /* ---------------------- IAST → देवनागरी (Sanskrit) ---------------------- */

  // single-char vowel matras used AFTER a consonant (replacing inherent -a)
  const VA = { a: '', ā: 'ा', i: 'ि', ī: 'ी', u: 'ु', ū: 'ू', e: 'े', ai: 'ै', o: 'ो', au: 'ौ', ṛ: 'ृ', ṝ: 'ॄ', ḷ: 'ृ', ḹ: 'ॄ', aṃ: 'ं', aṁ: 'ं', aḥ: 'ः', ah: 'ः' };
  const CONS = {
    k: 'क', kh: 'ख', g: 'ग', gh: 'घ', ṅ: 'ङ',
    c: 'च', ch: 'छ', j: 'ज', jh: 'झ', ñ: 'ञ',
    ṭ: 'ट', ṭh: 'ठ', ḍ: 'ड', ḍh: 'ढ', ṇ: 'ण',
    t: 'त', th: 'थ', d: 'द', dh: 'ध', n: 'न',
    p: 'प', ph: 'फ', b: 'ब', bh: 'भ', m: 'म',
    y: 'य', r: 'र', l: 'ल', v: 'व', ś: 'श', ṣ: 'ष', s: 'स', h: 'ह', ḻ: 'ळ', ṟ: 'र'
  };
  const INDEPENDENT = { a: 'अ', ā: 'आ', i: 'इ', ī: 'ई', u: 'उ', ū: 'ऊ', e: 'ए', ai: 'ऐ', o: 'ओ', au: 'औ', ṛ: 'ऋ', ṝ: 'ॠ', ḷ: 'ऌ', ḹ: 'ॡ' };
  const ANUSVARA = { 'ं': 'ं', 'ँ': 'ँ' };
  const VIRAMA = '्';

  // common two-consonant conjuncts handled implicitly via virama, but a few
  // frequently used ones get their proper ligature glyphs:
  const CONJUNCTS = { 'kṣ': 'क्ष', 'jñ': 'ज्ञ', 'jña': 'ज्ञ', 'śr': 'श्र', 'kṛ': 'कृ', 'tv': 'त्व' };

  /* ---------------------- IAST → తెలుగు (Sanskrit law) ---------------------- */
  const VA_TE = { a: '', ā: 'ా', i: 'ి', ī: 'ీ', u: 'ు', ū: 'ూ', e: 'ే', ai: 'ై', o: 'ో', au: 'ౌ', ṛ: 'ృ', ṝ: 'ౄ', ḷ: 'ృ', ḹ: 'ౄ', aṃ: 'ం', aṁ: 'ం', aḥ: 'ః', ah: 'ః' };
  const CONS_TE = {
    k: 'క', kh: 'ఖ', g: 'గ', gh: 'ఘ', ṅ: 'ఙ',
    c: 'చ', ch: 'ఛ', j: 'జ', jh: 'ఝ', ñ: 'ఞ',
    ṭ: 'ట', ṭh: 'ఠ', ḍ: 'డ', ḍh: 'ఢ', ṇ: 'ణ',
    t: 'త', th: 'థ', d: 'ద', dh: 'ధ', n: 'న',
    p: 'ప', ph: 'ఫ', b: 'బ', bh: 'భ', m: 'మ',
    y: 'య', r: 'ర', l: 'ల', v: 'వ', ś: 'శ', ṣ: 'ష', s: 'స', h: 'హ', ḻ: 'ళ', ṟ: 'ర'
  };
  const INDEP_TE = { a: 'అ', ā: 'ఆ', i: 'ఇ', ī: 'ఈ', u: 'ఉ', ū: 'ఊ', e: 'ఏ', ai: 'ఐ', o: 'ఓ', au: 'ఔ', ṛ: 'ఋ', ṝ: 'ౠ', ḷ: 'ఌ', ḹ: 'ౡ' };

  /* ---------------------------- IAST scanner ---------------------------- */

  // Build a syllable stream from IAST:
  //   - independent vowel → glyph (explicit)
  //   - consonant (+ vowel) → base glyph + matra
  //   - consonant cluster  → base + virama
  function toIndic(iast, CONS_MAP, VA_MAP, IND_MAP, CONJ_MAP) {
    let s = String(iast || '')
      .normalize('NFC')
      .replace(/w/g, 'v')
      .replace(/kṣ/g, 'kṣ')
      // word-level maps first (before the generic sh→ś step)
      .replace(/shivaya/g, 'śivāya')
      .replace(/shivaaya/g, 'śivāya')
      .replace(/ganeshaya/g, 'gaṇeśāya')
      .replace(/shri/g, 'śrī').replace(/shree/g, 'śrī').replace(/sri/g, 'śrī')
      .replace(/lakshmi/g, 'lakṣmī').replace(/laxmi/g, 'lakṣmī').replace(/mahalaxmi/g, 'mahālakṣmī')
      .replace(/krishna/g, 'kṛṣṇa').replace(/krishn/g, 'kṛṣṇ')
      .replace(/mandalate/i, 'maṇḍalate')
      .replace(/Sh/g, 'ṣ').replace(/sh/g, 'ś')
      .replace(/aa/g, 'ā').replace(/ii/g, 'ī').replace(/uu/g, 'ū')
      .replace(/chch/g, 'cch').replace(/ṅg/g, 'ṅ')
      .replace(/ee/g, 'ī').replace(/oo/g, 'ū')
      .replace(/\.m/g, 'ṃ').replace(/\.n/g, 'ṃ')
      .replace(/ah\b/g, 'aḥ')
      .replace(/ri(?=[bcdfghjklmnprstvyszऋ])/g, 'ṛ')
      .replace(/ri(?=ś|ṣ)/g, 'ṛ');

    const out = [];
    const isVowel = (t) => VA_MAP[t] !== undefined || IND_MAP[t] !== undefined;

    // matra helper: returns [glyph, advance] for the vowel starting at s[i],
    // or for explicit anusvara/visarga; else null.
    function vowelSign(i) {
      const c = s[i];
      if (c === 'ṃ' || c === 'ṁ') return ['ं', 1];
      if (c === 'ḥ') return ['ः', 1];
      if (VA_MAP[c] !== undefined) return [VA_MAP[c], 1];
      if (IND_MAP[c] !== undefined) return [IND_MAP[c], 1]; // rare: independent vowel as sign
      return null;
    }

    let i = 0;
    while (i < s.length) {
      const two = s.slice(i, i + 2);

      // independent vowel (word boundary, after space/hyphen, or after a vowel)
      const prev = i === 0 ? '' : s[i - 1];
      const prevIsCons = prev !== '' && CONS_MAP[prev] !== undefined;
      const IND = IND_MAP[two] !== undefined ? two : (IND_MAP[s[i]] !== undefined ? s[i] : null);
      if (IND && !prevIsCons && !/^[a-z]$/i.test(prev)) {
        // a standalone a/ā/i/etc.
        const len = two in IND_MAP ? 2 : 1;
        out.push(IND_MAP[IND]);
        i += len;
        continue;
      }

      // consonant digraph (kh, ṭh, ..., kṣ)
      if (CONS_MAP[two] !== undefined) {
        let base = CONS_MAP[two];
        const lig = CONJ_MAP[two];
        if (lig) base = lig;
        const sign = vowelSign(i + 2);
        out.push(sign ? base + sign[0] : base + VIRAMA);
        i += 2 + (sign ? sign[1] : 0);
        continue;
      }

      // single consonant
      if (CONS_MAP[s[i]] !== undefined) {
        const sign = vowelSign(i + 1);
        out.push(CONS_MAP[s[i]] + (sign ? sign[0] : VIRAMA));
        i += 1 + (sign ? sign[1] : 0);
        continue;
      }

      // standalone anusvara / visarga glyphs
      if (s[i] === 'ṃ' || s[i] === 'ṁ') { out.push('ं'); i += 1; continue; }
      if (s[i] === 'ḥ') { out.push('ः'); i += 1; continue; }

      out.push(s[i]);
      i += 1;
    }

    return out.join('');
  }

  /* ----------------------------- public helper ---------------------------- */

  const CONJUNCTS_SA = { 'kṣ': 'क्ष', 'jñ': 'ज्ञ', 'śr': 'श्र', 'kṛ': 'कृ', 'tv': 'त्व' };
  const CONJUNCTS_TE = { 'kṣ': 'క్ష', 'jñ': 'జ్ఞ', 'śr': 'శ్ర', 'kṛ': 'కృ', 'tv': 'త్వ' };

  function toDevanagari(iast) {
    return toIndic(iast, CONS, VA, INDEPENDENT, CONJUNCTS_SA);
  }

  function toTelugu(iast) {
    return toIndic(iast, CONS_TE, VA_TE, INDEP_TE, CONJUNCTS_TE);
  }

  function detect(text) {
    const s = String(text || '');
    if (!s.trim()) return 'en';
    let te = 0, dev = 0;
    for (const ch of s) {
      const cp = ch.codePointAt(0);
      if (cp >= 0x0C00 && cp <= 0x0C7F) te++;
      else if (cp >= 0x0900 && cp <= 0x097F) dev++;
    }
    if (te > dev && te > 0) return 'te';
    if (dev > 0) return 'sa';
    return 'en';
  }

  function scriptName(lang) {
    return { en: 'English (Latin)', te: 'తెలుగు (Telugu)', sa: 'संस्कृतम् (Devanagari Sanskrit)' }[lang] || lang;
  }

  function applyFont(el, lang) {
    if (!el) return;
    el.classList.remove('font-sa', 'font-te', 'font-en');
    if (lang === 'sa') el.classList.add('font-sa');
    else if (lang === 'te') el.classList.add('font-te');
    else el.classList.add('font-en');
  }

  /* transliterate mixed line using real script text */
  function transliterate(text, to) {
    const from = detect(text);
    if (from === to) return text;
    if (from === 'en') {
      return to === 'sa' ? toDevanagari(text) : toTelugu(text);
    }
    if (from === 'sa') {
      // devanagari → Telugu map only (skip reverse for brevity)
      if (to === 'te') {
        const map = {};
        for (const k of Object.keys(CONS)) map[CONS[k]] = CONS_TE[k];
        for (const k of Object.keys(INDEPENDENT)) map[INDEPENDENT[k]] = INDEP_TE[k];
        return String(text).replace(/[अ-हॉ-ॿ]/g, c => map[c] || c);
      }
      return text;
    }
    return text;
  }

  window.LangLib = { detect, scriptName, applyFont, toDevanagari, toTelugu, transliterate };
})();