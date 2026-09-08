// Per-deity image via page-image filename + Commons Special:FilePath (throttled).
import fs from 'fs';
import path from 'path';

const outDir = 'assets/deities';
fs.mkdirSync(outDir, { recursive: true });

const bySlug = {
  venkateswara: 'Venkateswara',
  shiva: 'Shiva',
  rama: 'Rama',
  krishna: 'Krishna',
  ganesha: 'Ganesha',
  hanuman: 'Hanuman',
  durga: 'Durga',
  lakshmi: 'Lakshmi',
  saibaba: 'Sai Baba of Shirdi',
  ayyappa: 'Ayyappan',
  subrahmanya: 'Murugan',
  navagraha: 'Navagraha',
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const UA = { 'User-Agent': 'SaptarushiDevSite/1.0 (local static site; education)' };
const api = (u) => fetch(u, { headers: UA });

async function apiGet(u, attempt = 0) {
  const r = await api(u);
  if (r.status === 429 && attempt < 4) { await sleep(5000 * (attempt + 1)); return apiGet(u, attempt + 1); }
  if (!r.ok) throw new Error('API ' + r.status);
  return r.json();
}

async function pageImageName(title) {
  const j = await apiGet('https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages&piprop=name&titles=' + encodeURIComponent(title));
  const pages = Object.values(j.query.pages || {});
  const img = pages[0] && pages[0].pageimage;
  return img || null;
}

async function commonsSearch(term) {
  const j = await apiGet('https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=intitle:' + encodeURIComponent(term) + ' filetype:bitmap&gsrnamespace=6&gsrlimit=6&prop=imageinfo&iiprop=url&iiurlwidth=640');
  const pages = (j.query && j.query.pages) || {};
  const list = Object.values(pages)
    .filter(p => /\.(jpg|jpeg|png)$/i.test(p.title))
    .map(p => ({ title: p.title, url: (p.imageinfo && p.imageinfo[0] && (p.imageinfo[0].thumburl || p.imageinfo[0].url)) || null }))
    .filter(p => p.url);
  return list[0] || null;
}

async function dl(fileName, slug) {
  const ext = fileName.includes('.') ? fileName.split('.').pop().split(/[?#]/)[0].toLowerCase() : 'jpg';
  if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) throw new Error('bad ext ' + ext);
  const u = 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(fileName) + '?width=640';
  const r = await fetch(u, { headers: UA, redirect: 'follow' });
  if (!r.ok) throw new Error('dl ' + r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 3000) throw new Error('tiny file');
  fs.writeFileSync(path.join(outDir, slug + '.' + ext), buf);
  return `${slug}.${ext}`;
}

const results = {};
let i = 0;
for (const [slug, title] of Object.entries(bySlug)) {
  try {
    let name = await pageImageName(title);
    if (!name) name = (await commonsSearch(title))?.title?.replace(/^File:/, '');
    if (!name || !name.startsWith('File:') && !/\.(?:jpg|jpeg|png)$/i.test(name)) {
      // pageimage gives bare name; resolver fills File:
    }
    const ext = (name.split('.').pop() || '').toLowerCase();
    const out = ext.startsWith('svg') ? 'jpg' : ext;
    const fileName = name.startsWith('File:') ? name : (name || '') ? 'File:' + name : null;
    if (!fileName) throw new Error('no name');
    const saved = await dl(fileName, slug);
    const finalName = fileName.startsWith('File:') ? fileName.slice(5) : fileName;
    results[slug] = { file: `deities/` + saved, src: finalName };
    console.log('OK', slug, '->', `deities/` + saved, '|', finalName);
  } catch (e) {
    console.log('FAIL', slug, e.message);
  }
  i++; if (i < Object.keys(bySlug).length) await sleep(1100);
}
await fs.promises.writeFile('tools/deities-map.json', JSON.stringify(results, null, 2));
console.log('done');