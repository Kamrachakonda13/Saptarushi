// tools/fetch-temple-images.mjs
// Downloads deity / temple / sanctum photos for every temple from
// Wikimedia Commons (1000px thumbs), records photographer + license
// into temples.json, and honours attribution for public use.
//
//   node tools/fetch-temple-images.mjs
//
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'temples.json');
const API = 'https://commons.wikimedia.org/w/api.php';
const OUT = path.join(ROOT, 'assets', 'temples');
const PLACEHOLDER = 'placeholder.svg';

const db = JSON.parse(fs.readFileSync(DATA, 'utf8'));

const UA = 'Saptarushi-temple-index/1.0 (Telugu devotional static site; contact: local)';

async function api(params, tries = 4) {
  const url = new URL(API);
  for (const k of Object.keys(params)) url.searchParams.set(k, params[k]);
  for (let t = 0; t < tries; t++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(40000) });
      if (r.status === 429) {
        const ra = Number(r.headers.get('retry-after')) || (2 * (t + 1));
        await sleep(ra * 1000);
        continue;
      }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    } catch (e) {
      if (t === tries - 1) throw e;
      await sleep(1200 * (t + 1));
    }
  }
  throw new Error('api failed');
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function stripHtml(s) {
  return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function searchCommons(query, limit = 4) {
  const data = await api({
    action: 'query', generator: 'search', gsrsearch: query, gsrnamespace: 6, gsrlimit: limit,
    prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: 1000, format: 'json',
  });
  const pages = data?.query?.pages || {};
  const rows = Object.values(pages).map(({ title, index, imageinfo }) => ({
    title, index, imageinfo: (imageinfo || [])[0],
  }));
  rows.sort((a, b) => (a.index || 99) - (b.index || 99));
  return rows.filter(p => p.imageinfo && p.imageinfo.thumburl && /^image\/(jpeg|png|webp)/.test(p.imageinfo.mime || ''));
}

function pick(rows) {
  const good = rows.find(r => r.imageinfo.width >= 500 && r.imageinfo.height >= 300);
  return good || rows[0] || null;
}

async function download(url, file) {
  const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(file, buf);
  return buf;
}

function outPaths(item, slot) {
  const dir = path.join(OUT, item.category);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${item.id}-${slot}.jpg`);
}

function relPath(file) {
  return 'temples/' + path.basename(path.dirname(file)) + '/' + path.basename(file);
}

let ok = 0, failed = 0;
function doneMsg(msg) { console.log(msg + (Math.random() < 0.03 ? '' : '')); }

async function fetchOne(item, slot, query, meta) {
  if (!query) return false;
  if (meta[slot] && meta[slot].url && fs.existsSync(path.join(OUT, meta[slot].url))) {
    console.log(`  ${item.id}/${slot}: already present`);
    return true;
  }
  await sleep(360);
  try {
    const rows = await searchCommons(query);
    const best = pick(rows);
    if (!best) { failed++; console.log(`  ${item.id}/${slot}: no result`); return false; }
    const file = outPaths(item, slot);
    const buf = await download(best.imageinfo.thumburl, file);
    if (buf.length < 800) throw new Error('too small');
    const em = best.imageinfo.extmetadata || {};
    meta[slot] = {
      slot,
      url: relPath(file),
      source: 'Wikimedia Commons',
      sourcePage: 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(best.title.replace(/ /g, '_')),
      photographer: stripHtml(em.Artist && em.Artist.value),
      license: stripHtml(em.LicenseShortName && em.LicenseShortName.value),
      attribution: stripHtml(em.Credit && em.Credit.value) || stripHtml(em.Artist && em.Artist.value),
    };
    ok++;
    console.log(`  ${item.id}/${slot}: OK — ${best.title}`);
    return true;
  } catch (e) {
    failed++;
    console.log(`  ${item.id}/${slot}: ${e.message}`);
    return false;
  }
}

const CONCURRENCY = 3;
async function mapLimit(arr, fn, n) {
  const out = new Array(arr.length);
  let i = 0;
  async function worker() {
    while (i < arr.length) {
      const idx = i++;
      out[idx] = await fn(arr[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, arr.length) }, worker));
  return out;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  console.log(`Fetching images for ${db.items.length} temples (1000px thumbs) …`);

  await mapLimit(db.items, async (item) => {
    item.images = item.images || {};
    console.log(item.id + ' →');
    await fetchOne(item, 'deity', item.q && item.q.deity, item.images);
    await fetchOne(item, 'temple', item.q && item.q.temple, item.images);
    const okSanctum = await fetchOne(item, 'sanctum', item.q && item.q.sanctum, item.images);
    if (!okSanctum && item.images.temple) {
      item.images.sanctum = { ...item.images.temple, slot: 'sanctum', reusedTemple: true };
    }
  }, 1);

  fs.writeFileSync(DATA, JSON.stringify(db, null, 2));
  console.log(`\nDone. downloaded=${ok} missing=${failed}. Placeholder: ${PLACEHOLDER}`);
}

main().catch(e => { console.error(e); process.exit(1); });