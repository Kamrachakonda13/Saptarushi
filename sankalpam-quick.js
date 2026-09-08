/* Saptarushi · Home page — quick Saṅkalpam card
   Computes today's traditional vyāvahārika saṅkalpam for Bengaluru
   (the site's default town) with the vendored Swiss-Ephemeris engine,
   and fills the card next to the hero. Shares its text and maths with
   the full almanac via panchang-core.js, so the two can never drift.
   ============================================================ */

import { PLACES } from './panchang-places.js';
import { computeFor, n0, sankalpamText } from './panchang-core.js';

const ENGINE_URL = './assets/vendor/panchangam.js';

const $ = (id) => document.getElementById(id);

async function main() {
  const card = $('sankalpamQuick');
  if (!card) return;
  // admin-published sankalpam wins over the computed one
  try {
    const r = await fetch('./api/content');
    if (r.ok) {
      const store = await r.json();
      const custom = store && store.home && store.home.sankalpam;
      if (custom && custom.trim()) {
        $('sankalpamQText').textContent = custom;
        $('sankalpamQMeta').textContent = 'అడ్మిన్ నుండి · curated from the admin portal';
        return;
      }
    }
  } catch (_) { /* keep computing */ }
  try {
    const lib = await import(ENGINE_URL);
    const place = PLACES.find(p => p.n === 'Bengaluru' && p.co === 'India');
    const d = new Date();
    const C = computeFor(lib, d, place);
    $('sankalpamQText').textContent = sankalpamText(C);
    const tithi = n0('name', C.panchang.tithis, C);
    const metaDate = C.date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    $('sankalpamQMeta').textContent =
      metaDate + ' · ' + place.n + ', ' + place.co +
      (tithi ? ' · ' + tithi.name : '');
  } catch (_) {
    card.classList.add('muted');
    const t = $('sankalpamQText');
    if (t) t.textContent = 'The panchanga engine could not load — please refresh, or open the full almanac.';
  }
}

main();