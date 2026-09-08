// tools/fetch-deity-images.mjs
// Downloads a fresh "actual deity" photo for every temple from Wikimedia
// Commons (1000px thumbs), overwriting assets/temples/<category>/<id>-deity.jpg,
// and records photographer + license into temples.json under `deityImage`.
//
// Each candidate is textually verified against a per-temple whitelist (title +
// image description + categories must mention the expected deity/temple), so
// look-alike shrines elsewhere in India are rejected.
//
//   node tools/fetch-deity-images.mjs              # all temples
//   node tools/fetch-deity-images.mjs somnath kamakshi   # just these ids
//
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'temples.json');
const API = 'https://commons.wikimedia.org/w/api.php';
const OUT = path.join(ROOT, 'assets', 'temples');

const UA = 'Saptarushi-temple-index/1.0 (Telugu devotional static site; contact: local)';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const db = JSON.parse(fs.readFileSync(DATA, 'utf8'));

const RUN = process.argv.slice(2);
const only = new Set(RUN);

// Curated queries per temple, most-specific first.
const QUERIES = {
  shankari: ['Koneswaram temple Trincomalee', 'Shankari Devi Trincomalee', 'Trincomalee Koneswaram Kali'],
  kamakshi: ['Kamakshi Amman idol Kanchipuram', 'Kamakshi Amman goddess Kanchi', 'Kamakshi Amman Kanchipuram statue'],
  chamundeshwari: ['Chamundeshwari Devi statue', 'Chamundeshwari Temple Chamundi Hill', 'Chamundeshwari goddess Mysore'],
  jogulamba: ['Jogulamba temple Alampur', 'Jogulamba Devi', 'Alampur Jogulamba goddess'],
  bhramaramba: ['Bhramaramba Srisailam goddess', 'Bhramaramba Devi', 'Bhramaramba temple'],
  'mahalakshmi-kolhapur': ['Mahalakshmi Temple Kolhapur', 'Ambabai Mahalakshmi', 'Mahalakshmi Kolhapur deity'],
  'mahakali-ujjain': ['Harsiddhi Temple Ujjain', 'Mahakali Ujjain Harsiddhi', 'Harsiddhi Mata'],
  puruhutika: ['Puruhutika Devi temple Pithapuram', 'Puruhutika Devi', 'Pithapuram Puruhutika'],
  biraja: ['Biraja Temple Jajpur', 'Maa Biraja', 'Biraja Devi'],
  manikyamba: ['Manikyamba Temples Rajahmundry', 'Manikyamba Devi', 'Manikyamba Ammavari'],
  kamakhya: ['Kamakhya temple goddess', 'Kamakhya Devi', 'Kamakhya temple Guwahati'],
  madhaveshwari: ['Alopi Devi Temple Prayagraj', 'Alopi Mata', 'Madhaveshwari Alopi temple'],
  jwalamukhi: ['Jwalamukhi temple goddess', 'Jwala Devi Kangra', 'Jwalamukhi Devi'],
  'mangala-gauri': ['Mangla Gauri temple Gaya', 'Mangala Gauri Devi', 'Mangla Gauri goddess'],
  vishalakshi: ['Vishalakshi Temple Varanasi', 'Vishalakshi Devi Varanasi', 'Vishalakshi Gauri temple'],
  'tara-tarapith': ['Tara temple Tarapith', 'Maa Tara Tarapith', 'Tarapith Tara Devi'],
  'vimala-puri': ['Vimala temple Puri', 'Vimala Devi', 'Vimala Shakti Peetha'],
  ambaji: ['Ambaji temple Amba Mata', 'Amba Mata Ambaji', 'Ambaji Devi'],

  somnath: ['Somnath jyotirlinga Gujarat', 'Somnath temple shiva linga', 'Somnath Prabhas Patan'],
  mallikarjuna: ['Mallikarjuna Srisailam linga', 'Srisailam Mallikarjuna jyotirlinga', 'Mallikarjuna lingam'],
  mahakaleshwar: ['Mahakaleshwar Ujjain jyotirlinga', 'Mahakal Ujjain temple', 'Mahakaleshwar lingam Ujjain'],
  omkareshwar: ['Omkareshwar jyotirlinga', 'Omkareshwar Mandhata', 'Omkareshwar linga Narmada'],
  baidyanath: ['Baidyanath Jyotirlinga Deoghar', 'Baidyanath temple deity', 'Vaidyanath Deoghar'],
  bhimashankar: ['Bhimashankar jyotirlinga Maharashtra', 'Bhimashankar temple linga', 'Bhimashankar Pune'],
  rameshwaram: ['Ramanathaswamy temple lingam', 'Rameshwaram jyotirlinga', 'Ramanathaswamy Rameswaram'],
  nageshwar: ['Nageshwar jyotirlinga Dwarka', 'Nageshwar temple Gujarat', 'Nagnath Darukavana'],
  'kashi-vishwanath': ['Kashi Vishwanath Varanasi linga', 'Kashi Vishwanath jyotirlinga', 'Vishwanath temple Varanasi'],
  trimbakeshwar: ['Trimbakeshwar Jyotirlinga temple', 'Trimbakeshwar shiva linga', 'Tryambakeshwar Nasik'],
  kedarnath: ['Kedarnath jyotirlinga', 'Kedarnath shiva linga', 'Kedarnath temple deity'],
  grishneshwar: ['Grishneshwar jyotirlinga temple', 'Grishneshwar Shivalaya', 'Ghrishneshwar lingam'],

  amararama: ['Amaralingeswara Amaravati', 'Amararama linga', 'Amaralingeswara swamy temple'],
  draksharama: ['Draksharama temple Bhimeswara', 'Draksharama lingam', 'Daksharamam temple'],
  somarama: ['Somarama Bhimavaram Someswara', 'Somarama linga', 'Someswara temple Bhimavaram'],
  ksheerarama: ['Ksheerarama Palakollu Ramalingeswara', 'Ksheera Ramalingeswara', 'Palakollu temple'],
  kumararama: ['Kumararama Samalkota Kumara Bhimeswara', 'Kumararama linga', 'Samalkota temple'],

  'badrinath-dham': ['Badrinath temple deity Vishnu', 'Badrinath murti', 'Badrinath shrine image'],
  'dwarka-dham': ['Dwarkadhish temple deity', 'Dwarkadhish idol Krishna', 'Dwarkadhish murti'],
  'jagannath-dham': ['Jagannath Balabhadra Subhadra idol', 'Jagannath temple Puri deities', 'Jagannath murti'],
  'rameswaram-dham': ['Ramanathaswamy Rameswaram lingam', 'Rameshwaram jyotirlinga', 'Ramanathaswamy temple deity'],

  ekambareswarar: ['Ekambareswarar Prithvi linga Kanchipuram', 'Ekambareswarar Kanchipuram', 'Ekambaranathar deity'],
  jambukeswarar: ['Jambukeswarar temple Thiruvanaikaval', 'Jambukeswarar Thiruvanaikaval', 'Akilandeswari Jambukeswarar'],
  arunachaleswarar: ['Arunachaleswarar Annamalai linga', 'Arunachala Shiva lingam', 'Annamalaiyar temple'],
  kalahasti: ['Srikalahasti temple linga', 'Srikalahasteeswara temple', 'Kalahasti Bhairava'],
  chidambaram: ['Chidambaram Nataraja idol', 'Nataraja bronze Chola', 'Thillai Nataraja murti'],
};

// Per-temple terms the file title/description/categories must mention.
const WHITELIST = {
  shankari: ['shankari', 'koneswaram', 'koneshwaram', 'trincomalee'],
  kamakshi: ['kamakshi'],
  chamundeshwari: ['chamundesh', 'chamundi'],
  jogulamba: ['jogulamba', 'alampur'],
  bhramaramba: ['bhramaramba', 'srisailam', 'sri sailam'],
  'mahalakshmi-kolhapur': ['mahalakshmi', 'ambabai', 'kolhap'],
  'mahakali-ujjain': ['harsiddhi', 'mahakali', 'ujjain'],
  puruhutika: ['puruhutika', 'pithapur'],
  biraja: ['biraja'],
  manikyamba: ['manikyamba', 'manikyam'],
  kamakhya: ['kamakhya', 'kamakhaya'],
  madhaveshwari: ['alopi', 'madhaveshwari', 'prayag', 'allahabad'],
  jwalamukhi: ['jwal', 'jvala'],
  'mangala-gauri': ['mangla gauri', 'mangala gauri', 'gaya'],
  vishalakshi: ['vishalakshi', 'visalakshi'],
  'tara-tarapith': ['tarapith', 'maa tara', 'ma tara'],
  'vimala-puri': ['vimala'],
  ambaji: ['ambaji', 'amba'],

  somnath: ['somnath'],
  mallikarjuna: ['mallikarjuna', 'srisailam'],
  mahakaleshwar: ['mahakalesh'],
  omkareshwar: ['omkareshwar', 'omkaresh'],
  baidyanath: ['baidyanath', 'vaidyanath', 'deoghar'],
  bhimashankar: ['bhimashankar', 'bhima shankar', 'bhimaśankar', 'bhimashankar'],
  rameshwaram: ['ramanathaswamy', 'rameshwaram', 'rameswaram', 'ramesvaram'],
  nageshwar: ['nageshwar', 'nageswar', 'nagnath', 'darukavana'],
  'kashi-vishwanath': ['kashi', 'varanasi', 'vishwanath', 'vishvanath', 'kasi vishwanath'],
  trimbakeshwar: ['trimbakeshwar', 'trimbakeshvar', 'tryambakeshwar', 'nasik', 'nashik'],
  kedarnath: ['kedar'],
  grishneshwar: ['grishneshwar', 'grishneshvar', 'ghrishneshwar', 'ghrushneshwar', 'grisneshwar'],

  amararama: ['amaralinges', 'amararama', 'amaravati'],
  draksharama: ['drakshara', 'draksarama', 'daksharamam', 'bhimeswara', 'draksharamam'],
  somarama: ['somarama', 'bhimavaram', 'someswar'],
  ksheerarama: ['ksheerarama', 'ksheera', 'palakollu', 'ramalingeswara', 'ramalingesvara'],
  kumararama: ['kumararama', 'samalkota', 'kumara bhimeswara', 'kumararama'],

  'badrinath-dham': ['badrinath', 'badri'],
  'dwarka-dham': ['dwarkadhish', 'dwarka', 'dwarakadhis', 'rukmini'],
  'jagannath-dham': ['jagannath', 'jaganath', 'jaganntha', 'puri'],
  'rameswaram-dham': ['ramanathaswamy', 'rameshwaram', 'rameswaram', 'ramesvaram'],

  ekambareswarar: ['ekambareswarar', 'ekambaranathar', 'ekambaresvara', 'kanchipuram'],
  jambukeswarar: ['jambukeswarar', 'jambukesvara', 'thiruvanaikaval', 'tiruvanaikaval', 'akilandeswari', 'thillai'],
  arunachaleswarar: ['arunachaleswar', 'arunachalesvara', 'arunachala', 'annamalaiyar', 'annamalai'],
  kalahasti: ['kalahasti', 'srikalahast', 'kalahastees', 'kalahastis'],
  chidambaram: ['chidambaram', 'nataraja', 'thillai', 'koothan', 'kutthan', 'sabhanayaka'],
};

const DEITY_TERMS = /linga|lingam|idol|murti|deity|devi|goddess|mata|amba|nataraja|shiva|vishnu|krishna|jagannath|durga|kali|tara|image of|murtis|nero|shrine|jyotirlinga/i;
const BUILDING_TERMS = /gopuram|entrance|gate|tower|panorama|exterior|aerial|facade|view of|crowd|visitors|street|queue|years|map|gps|heritage sites|roof|pool|pond|kund|arch|surroundings|stair|garden|path/i;

const EXCLUDES = {
  'kashi-vishwanath': /maheshwar|khargone|omkaresh|khandwa/i,
  mallikarjuna: /heritage sites|gps|historic/i,
  kalahasti: /heritage sites|gps|historic/i,
  somarama: /heritage sites|gps|historic/i,
  amararama: /hanuma/i,
  draksharama: /nataraja|relief/i,
  ekambareswarar: /nataraj/i,
  jambukeswarar: /surroundings|complex|tank/i,
  chidambaram: /roof|golden|gateway|gopuram/i,
  trimbakeshwar: /kund|kusavarta|godavari origin/i,
  baidyanath: /pond|tank|sacred pond/i,
  puruhutika: /arch|entrance/i,
};

async function api(params, tries = 4) {
  const url = new URL(API);
  for (const k of Object.keys(params)) url.searchParams.set(k, params[k]);
  for (let t = 0; t < tries; t++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(45000) });
      if (r.status === 429) { const ra = Number(r.headers.get('retry-after')) || (2 * (t + 1)); await sleep(ra * 1000); continue; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    } catch (e) {
      if (t === tries - 1) throw e;
      await sleep(1400 * (t + 1));
    }
  }
  throw new Error('api failed');
}

function stripHtml(s) { return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }

async function searchCommons(query, limit = 10) {
  const data = await api({
    action: 'query', generator: 'search', gsrsearch: query, gsrnamespace: 6, gsrlimit: limit,
    prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata|categories', iicategories: 12,
    iiurlwidth: 1000, format: 'json',
  });
  const pages = data?.query?.pages || {};
  return Object.values(pages).map(({ title, index, imageinfo }) => ({ title, index, info: (imageinfo || [])[0] }));
}

function describes(item, row) {
  const terms = WHITELIST[item.id];
  if (!terms) return true;
  const e = row.info?.extmetadata || {};
  const text = (row.title + ' ' + (e.ImageDescription && e.ImageDescription.value) + ' ' + (e.Categories && e.Categories.value)).toLowerCase();
  return terms.some(t => text.includes(t.toLowerCase()));
}

function score(row, item) {
  if (!row.info) return -99;
  const { width = 0, height = 0, thumburl, mime = '' } = row.info;
  if (!thumburl || !/^image\/(jpeg|png|webp)/.test(mime)) return -99;
  if (width < 560 || height < 420) return -99;
  if (!describes(item, row)) return -99;
  const e = row.info.extmetadata || {};
  const text = (row.title + ' ' + (e.ImageDescription && e.ImageDescription.value)).toLowerCase();
  const excl = EXCLUDES[item.id];
  if (excl && excl.test(text)) return -99;
  let s = 0;
  const ratio = width / height;
  if (ratio < 0.7 || ratio > 2.0) s -= 2;
  if (width >= 900) s += 2;
  if (DEITY_TERMS.test(row.title)) s += 4;
  if (BUILDING_TERMS.test(row.title)) s -= 3;
  return s;
}

function pick(rows, item) {
  const scored = rows.map(r => ({ r, s: score(r, item) })).filter(x => x.s > -99).sort((a, b) => b.s - a.s);
  return (scored[0] && scored[0].r) || null;
}

async function download(url, file) {
  const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(90000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(file, buf);
  return buf;
}

function metaFor(item, best, file) {
  const em = best.info.extmetadata || {};
  return {
    url: 'temples/' + item.category + '/' + path.basename(file),
    source: 'Wikimedia Commons',
    sourcePage: 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(best.title.replace(/ /g, '_')),
    photographer: stripHtml(em.Artist && em.Artist.value),
    license: stripHtml(em.LicenseShortName && em.LicenseShortName.value),
    attribution: stripHtml(em.Credit && em.Credit.value) || stripHtml(em.Artist && em.Artist.value),
  };
}

let ok = 0, failed = [];
const CONCURRENCY = 2;
const mapLimit = async (arr, fn, n) => {
  const out = new Array(arr.length); let i = 0;
  async function worker() { while (i < arr.length) { const idx = i++; out[idx] = await fn(arr[idx], idx); } }
  await Promise.all(Array.from({ length: Math.min(n, arr.length) }, worker));
  return out;
};

function queryList(item) {
  const base = QUERIES[item.id] || [item.temple + ' deity'];
  return [...base, item.temple + ' deity idol', item.temple + ' murti'];
}

async function fetchOne(item) {
  const dir = path.join(OUT, item.category);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${item.id}-deity.jpg`);
  const queries = queryList(item);
  for (const q of queries) {
    await sleep(450);
    try {
      const rows = await searchCommons(q);
      const best = pick(rows, item);
      if (!best) { console.log(`  ${item.id}: "${q}" → no verified deity shot`); continue; }
      const buf = await download(best.info.thumburl, file);
      if (buf.length < 8000) throw new Error('tiny download');
      item.deityImage = metaFor(item, best, file);
      ok++;
      console.log(`  ${item.id}: OK — "${q}" → ${best.title} (${best.info.width}x${best.info.height})`);
      return;
    } catch (e) {
      console.log(`  ${item.id}: "${q}" → ${e.message}`);
    }
  }
  failed.push(item.id);
  console.log(`  ${item.id}: FAILED all queries`);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const items = only.size ? db.items.filter(it => only.has(it.id)) : db.items;
  for (const id of only) if (!db.items.some(it => it.id === id)) console.log('unknown id:', id);
  console.log(`Fetching fresh deity images for ${items.length} temples …`);
  await mapLimit(items, async (item) => { console.log(item.id + ' →'); await fetchOne(item); }, CONCURRENCY);
  fs.writeFileSync(DATA, JSON.stringify(db, null, 2) + '\n');
  console.log('\nDone. downloaded=' + ok + ' failed=' + failed.length + (failed.length ? ' [' + failed.join(', ') + ']' : ''));
}

main().catch(e => { console.error(e); process.exit(1); });