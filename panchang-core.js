/* Saptarushi · Panchangam — shared core
   Pure calculation + transliteration helpers used by both the Panchangam
   page (panchang-app.js) and the home-page quick Saṅkalpam card
   (sankalpam-quick.js), so the liturgical text and the astronomy never
   drift between the two views. The engine itself is NOT imported here —
   callers pass it in (panchang-core stays headless-testable).

   Import from anywhere:  import { sankalpamText, computeFor } from './panchang-core.js';
   ============================================================ */

import { SRISAILAM } from './panchang-places.js';

/* Sanskrit → Telugu transcriptions for the तिथि (with the "…తిథౌ"
   ending already declined as in the traditional saṅkalpam text). */
export const TITHI_YAM = {
  Prathama: 'ప్రథమాయాం', Dwitiya: 'ద్వితీయాయాం', Tritiya: 'తృతీయాయాం',
  Chaturthi: 'చతుర్థ్యాం', Panchami: 'పంచమ్యాం', Shashthi: 'షష్ఠ్యాం',
  Saptami: 'సప్తమ్యాం', Ashtami: 'అష్టమ్యాం', Navami: 'నవమ్యాం',
  Dashami: 'దశమ్యాం', Ekadashi: 'ఏకాదశ్యాం', Dwadashi: 'ద్వాదశ్యాం',
  Trayodashi: 'త్రయోదశ్యాం', Chaturdashi: 'చతుర్దశ్యాం',
  Purnima: 'పూర్ణిమాయాం', Amavasya: 'అమావాస్యాయాం',
};
export const VARA_SA = {
  Sunday: 'భానువాసర', Monday: 'సోమవాసర', Tuesday: 'మంగళవాసర',
  Wednesday: 'బుధవాసర', Thursday: 'గురువాసర', Friday: 'శుక్రవాసర',
  Saturday: 'శనివాసర',
};
export const NAK_SA = {
  Ashwini: 'అశ్విని', Bharani: 'భరణి', Krittika: 'కృత్తిక', Rohini: 'రోహిణి',
  Mrigashira: 'మృగశిర', Ardra: 'ఆరుద్ర', Punarvasu: 'పునర్వసు', Pushya: 'పుష్యమి',
  Ashlesha: 'ఆశ్లేష', Magha: 'మఘ', 'Purva Phalguni': 'పూర్వఫల్గుణి',
  'Uttara Phalguni': 'ఉత్తరఫల్గుణి', Hasta: 'హస్త', Chitra: 'చిత్త',
  Swati: 'స్వాతి', Vishakha: 'విశాఖ', Anuradha: 'అనూరాధ', Jyeshtha: 'జ్యేష్ఠ',
  Mula: 'మూల', 'Purva Ashadha': 'పూర్వాషాఢ', 'Uttara Ashadha': 'ఉత్తరాషాఢ',
  Shravana: 'శ్రవణం', Dhanishta: 'ధనిష్ఠ', Shatabhisha: 'శతభిషం',
  'Purva Bhadrapada': 'పూర్వాభాద్ర', 'Uttara Bhadrapada': 'ఉత్తరాభాద్ర',
  Revati: 'రేవతి',
};
export const MASA_SA = {
  Chaitra: 'చైత్ర', Vaishakha: 'వైశాఖ', Jyeshtha: 'జ్యేష్ఠ', Ashadha: 'ఆషాఢ',
  Shravana: 'శ్రావణ', Bhadrapada: 'భాద్రపద', Ashwina: 'ఆశ్వయుజ', Kartika: 'కార్తీక',
  Margashirsha: 'మార్గశిర', Pausha: 'పుష్య', Magha: 'మాఘ', Phalguna: 'ఫాల్గుణ',
};
export const TELUGU_MASA = {
  Chaitra: 'చైత్రం', Vaishakha: 'వైశాఖం', Jyeshtha: 'జ్యేష్ఠం', Ashadha: 'ఆషాఢం',
  Shravana: 'శ్రావణం', Bhadrapada: 'భాద్రపదం', Ashwina: 'ఆశ్వయుజం', Kartika: 'కార్తీకం',
  Margashirsha: 'మార్గశిరం', Pushya: 'పుష్యం', Magha: 'మాఘం', Phalguna: 'ఫాల్గుణం',
};
export const VARA_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const PAKSHA_SA = { Krishna: 'కృష్ణ', Shukla: 'శుక్ల' };

export const DIR_NS = { north: 'ఉత్తర', south: 'దక్షిణ' };
export const DIR_EW = { east: 'పూర్వ', west: 'పశ్చిమ' };

function tzOffsetMs(tz, date) {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const parts = Object.fromEntries(dtf.formatToParts(date).map(p => [p.type, p.value]));
    const hrs = parts.hour === '24' ? 0 : +parts.hour;
    const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, hrs, +parts.minute, +parts.second);
    return asUTC - date.getTime();
  } catch (_) { return 0; }
}

function fmtHM(utcMs, offsetMin) {
  const d = new Date(utcMs + offsetMin * 60000);
  let h = d.getUTCHours(), m = d.getUTCMinutes();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + String(m).padStart(2, '0') + ' ' + ap;
}

function fmtOffset(offMin) {
  const sign = offMin >= 0 ? '+' : '−';
  const abs = Math.abs(offMin);
  return sign + Math.floor(abs / 60) + ':' + String(abs % 60).padStart(2, '0');
}

function within(iso, dayStart, dayEnd) {
  const t = new Date(iso).getTime();
  return t >= dayStart && t < dayEnd;
}

/* Compute the whole day for one place. `lib` is the vendored
   panchangam module ({ Observer, getPanchangam, … }). The place uses
   the new dataset's field names: n, co, lat, lng, tz, e. */
function computeFor(lib, date, place) {
  const noonGuess = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12));
  const offMs = tzOffsetMs(place.tz, noonGuess);
  const offMin = Math.round(offMs / 60000 / 30) * 30;
  const localNoon = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12) - offMin * 60000);
  const observer = new lib.Observer(place.lat, place.lng, place.e || place.elev || 50);
  const panchang = lib.getPanchangam(localNoon, observer, { timezoneOffset: offMin });
  return {
    panchang, offMin,
    dayStart: Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - offMin * 60000,
    dayEnd: Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - offMin * 60000 + 86400000,
    date, place,
  };
}

/* The sunrise (udaya) item of a named array (tithis, nakshatras, …). */
function n0(nameField, arr, C) {
  const list = (arr || []).filter(x => within(x.startTime, C.dayStart, C.dayEnd));
  const item = list[0] || (arr && arr[0]);
  return item ? { name: item[nameField], start: item.startTime, end: item.endTime } : null;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/* Which way of Śrīśailam the place lies — used in the saṅkalpam's
   "శ్రీశైలస్య {దిశ} దిగ్భాగే" clause. Returns { dir, near }.
   Within ~60 km of the kṣetra we call it Ṥrīśailam itself. */
function directionOf(place) {
  const dist = haversineKm(SRISAILAM.lat, SRISAILAM.lng, place.lat, place.lng);
  if (dist < 60) return { dir: '', near: true };
  const ns = place.lat > SRISAILAM.lat ? DIR_NS.north : (place.lat < SRISAILAM.lat ? DIR_NS.south : '');
  const ew = place.lng > SRISAILAM.lng ? DIR_EW.east : (place.lng < SRISAILAM.lng ? DIR_EW.west : '');
  return { dir: [ns, ew].filter(Boolean).join('-'), near: false };
}

/* The full traditional vyāvahārika saṅkalpam, with the computed māsa,
   pakṣa, tithi, vara, nakṣatra and the relative direction filled in.
   Fixed, hand-verified liturgical text — never derived from GPS phrases. */
function sankalpamText(C) {
  const p = C.panchang;
  const tithi = n0('name', p.tithis, C);
  const nak = n0('name', p.nakshatras, C);
  const tithiYam = tithi ? (TITHI_YAM[tithi.name] || tithi.name) : '—';
  const varaYukta = VARA_SA[VARA_NAMES[p.vara]] || VARA_NAMES[p.vara] || '—';
  const nakYukta = nak ? (NAK_SA[nak.name] || nak.name) : '—';
  const masaSa = (p.masa.isAdhika ? 'అధిక ' : '') + (MASA_SA[p.masa.name] || p.masa.name);
  const pakshaTe = PAKSHA_SA[p.paksha] || p.paksha || '—';
  const { dir, near } = directionOf(C.place);
  const ksetraClause = near
    ? 'శ్రీశైలస్య సన్నిధౌ,'
    : 'శ్రీశైలస్య ' + (dir || 'దక్షిణ') + ' దిగ్భాగే,';
  return (
    'శ్రీమతోః ఆద్యబ్రహ్మణః ద్వితీయ పరార్థే, శ్వేతవరాహకల్పే, ' +
    'వైవస్వత మన్వంతరే, కలియుగే ప్రథమపాదే, జంబూద్వీపే, భరతవర్షే, భరతఖండే, ' +
    'మేరోః దక్షిణ దిగ్భాగే, ' + ksetraClause + ' ' +
    'అస్మిన్ వర్తమానే వ్యావహారిక చాంద్రమానేన ' +
    'శ్రీ ' + masaSa + ' మాసే, ' + pakshaTe + ' పక్షే, ' + tithiYam + ' శుభతిథౌ, ' +
    varaYukta + ' యుక్తాయాం, ' + nakYukta + ' నక్షత్ర యుక్తాయాం, ' +
    'శుభయోగ శుభకరణ ఏవంగుణ విశేషణ విశిష్టాయాం అస్యాం ' + tithiYam + ' శుభతిథౌ.'
  );
}

export {
  tzOffsetMs, fmtHM, fmtOffset, within,
  computeFor, n0, haversineKm, directionOf, sankalpamText,
};