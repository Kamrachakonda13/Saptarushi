/* Saptarushi · Panchangam
   Real astronomical almanac — Swiss-Ephemeris precision via
   @ishubhamx/panchangam-js (MIT). The engine and its astronomy core are
   vendored locally in assets/vendor/ (see LICENSES there), so the whole
   almanac is computed fully offline. Every tithi, nakshatra, yoga,
   karana and muhurta is *computed*, never hard-coded.

   The shared maths, transliteration and the traditional saṅkalpam text
   live in panchang-core.js; the world city list lives in
   panchang-places.js — both are reused by the home-page quick card.
   ============================================================ */

import { PLACES } from './panchang-places.js';
import {
  computeFor, n0, fmtHM, fmtOffset, within,
  TELUGU_MASA, VARA_NAMES, PAKSHA_SA, sankalpamText,
} from './panchang-core.js';
import { ECLIPSES } from './panchang-eclipses.js';

const ENGINE_URL = './assets/vendor/panchangam.js';
const DEFAULT_PLACE = 'India|Bengaluru';

let lib = null;
let extraFestivals = null;
let festivalsReady = false;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ------------------- computation ------------------- */
function resolvePlace() {
  const raw = ($('panchPlace').value || '').trim();
  if (raw) {
    const sep = raw.indexOf('|');
    const co = sep >= 0 ? raw.slice(0, sep) : '';
    const n = sep >= 0 ? raw.slice(sep + 1) : raw;
    const match = PLACES.find(p => p.co === co && p.n === n);
    if (match) return { place: match, geo: false };
  }
  const lat = parseFloat($('panchLat').value);
  const lng = parseFloat($('panchLng').value);
  if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
    return { place: { n: 'Custom location', co: '', lat, lng, e: 50, tz: 'Asia/Kolkata' }, geo: true };
  }
  return { place: PLACES.find(p => p.co === 'India' && p.n === 'Bengaluru'), geo: false };
}

/* ------------------- rendering ------------------- */
function init() {
  const t = new Date();
  $('panchDate').value = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
  $('panchPlace').value = DEFAULT_PLACE;
  fetch('data/festivals.json')
    .then(r => (r.ok ? r.json() : null))
    .then(j => { extraFestivals = j; festivalsReady = true; tryRender(); })
    .catch(() => { festivalsReady = true; tryRender(); });
  wireEvents();
  loadEngine();
}

function tryRender() { if (lib && festivalsReady) render(); }

function wireEvents() {
  $('panchDate').addEventListener('change', render);
  $('panchPlace').addEventListener('change', () => {
    $('panchLat').value = '';
    $('panchLng').value = '';
    render();
  });
  $('panchToday').addEventListener('click', () => {
    const t = new Date();
    $('panchDate').value = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
    render();
  });
  $('panchLocate').addEventListener('click', () => {
    if (!navigator.geolocation) { setStatus('Geolocation is not available in this browser — choose a city from the list.'); return; }
    setStatus('Locating…');
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      $('panchPlace').value = '';
      $('panchLat').value = latitude.toFixed(4);
      $('panchLng').value = longitude.toFixed(4);
      setStatus('Using your device location. For a traditional Saṅkalpam, pick a city from the list.');
      render();
    }, () => {
      setStatus('Could not get your location — pick a city from the list instead.');
    }, { timeout: 10000 });
  });
  $('panchCopy').addEventListener('click', async () => {
    const text = $('sankalpamText').textContent;
    try {
      await navigator.clipboard.writeText(text);
      $('panchCopy').textContent = 'Copied ✓';
    } catch (_) { $('panchCopy').textContent = 'Copy failed'; }
    setTimeout(() => { $('panchCopy').textContent = 'Copy'; }, 1800);
  });
}

async function loadEngine() {
  setStatus('Initialising the panchanga engine…');
  try {
    lib = await import(ENGINE_URL);
  } catch (err) {
    setStatus('The panchanga engine could not load. Please refresh the page and try again.');
    $('results').classList.add('muted');
    return;
  }
  setStatus('');
  tryRender();
}

function setStatus(msg) {
  const el = $('panchStatus');
  if (el) el.textContent = msg;
}

function render() {
  if (!lib) return;
  const dateVal = $('panchDate').value;
  const d = dateVal ? new Date(dateVal + 'T00:00:00') : new Date();
  if (isNaN(d.getTime())) return;
  const { place } = resolvePlace();
  const C = computeFor(lib, d, place);
  renderSummary(C);
  renderAngas(C);
  renderCalendar(C);
  renderFestivals(C);
  renderTimings(C);
  renderEclipse(C);
  renderChoghadiya(C);
  renderSankalpam(C);
  const where = place.n + (place.st ? ', ' + place.st : '') + (place.co ? ' · ' + place.co : '');
  $('panchSub').textContent = where + ' · UTC' + fmtOffset(C.offMin);
}

function renderSummary(C) {
  const p = C.panchang;
  const tithi = n0('name', p.tithis, C);
  const nak = n0('name', p.nakshatras, C);
  const masaTelu = TELUGU_MASA[p.masa.name] || p.masa.name;
  const pakshaTelu = PAKSHA_SA[p.paksha] || p.paksha;
  $('panchBig').innerHTML =
    '<span class="panch-big-name">' + esc(tithi ? tithi.name : '—') + '</span>' +
    '<span class="panch-big-sub">' + esc(pakshaTelu) + ' పక్ష · ' + esc(masaTelu) + ' మాసం</span>' +
    '<span class="panch-big-date">' + esc(C.date.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })) + '</span>';
  $('panchNak').textContent = nak ? nak.name + ' — ' + p.nakshatraPada + 'వ పాదం' : '—';
  $('panchMasa').textContent = (p.masa.isAdhika ? 'అధిక ' : '') + masaTelu + ' మాసం';
  $('panchSun').textContent = 'సూర్యోదయం ' + fmtHM(p.sunrise.getTime(), C.offMin) + ' · సూర్యాస్తమయం ' + fmtHM(p.sunset.getTime(), C.offMin);
}

function renderAngas(C) {
  const p = C.panchang;
  const tithi = n0('name', p.tithis, C);
  const nak = n0('name', p.nakshatras, C);
  const yoga = n0('name', p.yogas, C);
  const karana = (p.karanas || []).find(k => within(k.startTime, C.dayStart, C.dayEnd)) || (p.karanas && p.karanas[0]);
  const cards = [
    { k: 'Vara', v: VARA_NAMES[p.vara] || '—', s: 'వారం' },
    { k: 'Tithi', v: tithi ? tithi.name : '—', s: tithi ? fmtHM(tithi.start, C.offMin) + ' – ' + fmtHM(tithi.end, C.offMin) : '' },
    { k: 'Nakshatra', v: nak ? nak.name : '—', s: nak ? fmtHM(nak.start, C.offMin) + ' – ' + fmtHM(nak.end, C.offMin) : '' },
    { k: 'Yoga', v: yoga ? yoga.name : '—', s: yoga ? fmtHM(yoga.start, C.offMin) + ' – ' + fmtHM(yoga.end, C.offMin) : '' },
    { k: 'Karana', v: karana ? karana.name : '—', s: 'కరణం' },
  ];
  $('angaGrid').innerHTML = cards.map(c => `
    <article class="anga-card">
      <span class="anga-k">${esc(c.k)}</span>
      <span class="anga-v">${esc(c.v)}</span>
      <span class="anga-s">${esc(c.s)}</span>
    </article>`).join('\n');
}

function renderCalendar(C) {
  const p = C.panchang;
  const masaTelu = (p.masa.isAdhika ? 'అధిక ' : '') + (TELUGU_MASA[p.masa.name] || p.masa.name);
  const rows = [
    ['Samvatsara', esc(p.samvat.samvatsara) + ' · Vikram ' + p.samvat.vikram + ' · Śaka ' + p.samvat.shaka],
    ['Ayana', esc(p.ayana)],
    ['Ritu', esc(p.ritu)],
    ['Masa', esc(masaTelu)],
    ['Paksha', esc(p.paksha)],
  ];
  $('calRows').innerHTML = rows.map(r =>
    `<div class="cal-row"><span class="cal-k">${r[0]}</span><span class="cal-v">${r[1]}</span></div>`).join('\n');
}

function festivalsFor(C) {
  const out = [];
  (C.panchang.festivals || []).forEach(f => {
    out.push({ name: typeof f === 'string' ? f : (f.name || String(f)), who: 'Panchanga engine' });
  });
  const key = C.date.getFullYear() + '-' + String(C.date.getMonth() + 1).padStart(2, '0') + '-' + String(C.date.getDate()).padStart(2, '0');
  const src = extraFestivals;
  if (src) {
    let entries = null;
    if (Array.isArray(src)) entries = src.filter(x => String(x.date || x['Date'] || '').startsWith(key)).map(x => x.festival || x.name || x);
    else if (src[key]) entries = Array.isArray(src[key]) ? src[key] : Object.values(src[key]);
    (entries || []).forEach(f => {
      if (typeof f === 'string') out.push({ name: f, who: 'Community list' });
      else out.push({ name: f.name || (f.festival && f.festival.name) || JSON.stringify(f), who: 'Community list' });
    });
  }
  return out;
}

function renderFestivals(C) {
  const list = festivalsFor(C);
  const uniq = [];
  const seen = new Set();
  list.forEach(f => {
    const n = String(f.name).trim();
    if (n && !seen.has(n)) { seen.add(n); uniq.push(f); }
  });
  $('festList').innerHTML = uniq.length
    ? uniq.map(f => `<li><span class="fest-name">${esc(f.name)}</span> <span class="fest-who">${esc(f.who)}</span></li>`).join('\n')
    : '<li class="fest-none">No major festival falls on this day.</li>';
}

function fmtWin(w, offMin) { return fmtHM(w.startTime, offMin) + ' – ' + fmtHM(w.endTime, offMin); }
function fmtRange(a, b, offMin) { return fmtHM(a.getTime(), offMin) + ' – ' + fmtHM(b.getTime(), offMin); }
function fmtOne(ms, offMin) { return fmtHM(ms.getTime(), offMin); }

function renderTimings(C) {
  const p = C.panchang;
  const row = (label, value, cls) => `<div class="time-row${cls ? ' ' + cls : ''}"><span class="time-k">${label}</span><span class="time-v">${value}</span></div>`;
  const windowsL = (objs) => (objs || [])
    .filter(w => within(w.startTime, C.dayStart, C.dayEnd))
    .map(w => fmtWin(w, C.offMin)).join('; ') || '—';
  const rows = [];
  rows.push(row('🌅 Sunrise', fmtOne(p.sunrise, C.offMin)));
  rows.push(row('🌇 Sunset', fmtOne(p.sunset, C.offMin)));
  rows.push(row('🌙 Moonrise', p.moonrise ? fmtOne(p.moonrise, C.offMin) : '—'));
  rows.push(row('🌑 Moonset', p.moonset ? fmtOne(p.moonset, C.offMin) : '—'));
  rows.push(row('⏳ Rahu Kaalam', fmtRange(p.rahuKalamStart, p.rahuKalamEnd, C.offMin), 'ausp'));
  rows.push(row('🕐 Yamaganda', p.yamagandaKalam ? fmtRange(p.yamagandaKalam.start, p.yamagandaKalam.end, C.offMin) : '—', 'ausp'));
  rows.push(row('🕑 Gulika Kaalam', p.gulikaKalam ? fmtRange(p.gulikaKalam.start, p.gulikaKalam.end, C.offMin) : '—', 'ausp'));
  rows.push(row('⚠ Dur Muhurta', windowsL(p.durMuhurta), 'avoid'));
  rows.push(row('🌌 Varjyam', windowsL(p.varjyam), 'avoid'));
  rows.push(row('✨ Amrit Kaalam', windowsL(p.amritKalam), 'ausp'));
  rows.push(row('🕰 Abhijit Muhurta', p.abhijitMuhurta ? fmtRange(p.abhijitMuhurta.start, p.abhijitMuhurta.end, C.offMin) : '—', 'ausp'));
  rows.push(row('🌄 Brahma Muhurta', p.brahmaMuhurta ? fmtRange(p.brahmaMuhurta.start, p.brahmaMuhurta.end, C.offMin) : '—', 'ausp'));
  rows.push(row('🎉 Govardhan Muhurta', p.govardhanMuhurta ? fmtRange(p.govardhanMuhurta.start, p.govardhanMuhurta.end, C.offMin) : '—', 'ausp'));
  $('timeRows').innerHTML = rows.join('\n');
}

function localDateKey(ms, offMin) {
  const d = new Date(ms + offMin * 60000);
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
}

function localMinutes(ms, offMin) {
  const d = new Date(ms + offMin * 60000);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

function eclipseVisible(event, C) {
  const dateKey = C.date.getFullYear() + '-' + String(C.date.getMonth() + 1).padStart(2, '0') + '-' + String(C.date.getDate()).padStart(2, '0');
  const phases = event.phases.map(phase => ({ label: phase[0], time: new Date(phase[1]).getTime() }));
  if (!phases.some(phase => localDateKey(phase.time, C.offMin) === dateKey)) return false;
  if (event.visibility === 'night') {
    const sunset = localMinutes(C.panchang.sunset.getTime(), C.offMin);
    const sunrise = localMinutes(C.panchang.sunrise.getTime(), C.offMin);
    return phases.some(phase => localDateKey(phase.time, C.offMin) === dateKey && (localMinutes(phase.time, C.offMin) >= sunset || localMinutes(phase.time, C.offMin) < sunrise));
  }
  const bounds = event.visibility;
  return C.place.lat >= bounds.minLat && C.place.lat <= bounds.maxLat && C.place.lng >= bounds.minLng && C.place.lng <= bounds.maxLng;
}

function renderEclipse(C) {
  const box = $('eclipseBox');
  if (!box) return;
  const event = ECLIPSES.find(item => eclipseVisible(item, C));
  if (!event) { box.hidden = true; box.innerHTML = ''; return; }
  const rows = event.phases.map(phase => '<div class="eclipse-row"><span class="eclipse-k">' + esc(phase[0]) + '</span><span class="eclipse-v">' + esc(fmtHM(new Date(phase[1]).getTime(), C.offMin)) + '</span></div>').join('');
  box.hidden = false;
  box.innerHTML = '<div class="eclipse-head"><span class="eclipse-icon">' + (event.kind === 'solar' ? '☀' : '☾') + '</span><div><h3>' + esc(event.type) + '</h3><p>Visible from the selected location · local time</p></div></div><div class="eclipse-rows">' + rows + '</div>';
}

function renderChoghadiya(C) {
  const p = C.panchang;
  const chip = (c) => `<span class="chog-chip ${c.rating}">${esc(c.name)}<em>${fmtWin(c, C.offMin)}</em></span>`;
  const dayHtml = ((p.choghadiya && p.choghadiya.day) || []).map(chip).join('');
  const nite = ((p.choghadiya && p.choghadiya.night) || []).map(chip).join('');
  $('chogDay').innerHTML = dayHtml || '<span class="chog-none">—</span>';
  $('chogNight').innerHTML = nite || '<span class="chog-none">—</span>';
}

function renderSankalpam(C) {
  $('sankalpamText').textContent = sankalpamText(C);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();