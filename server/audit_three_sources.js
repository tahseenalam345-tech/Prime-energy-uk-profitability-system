import fs from 'fs';
import { REQUESTED_SIZES } from './fetch_cp_radiators.js';

const cpItems = JSON.parse(fs.readFileSync('./city_plumbing_all_radiators.json', 'utf8'));

const threeSourceSpecs = [];

for (const spec of REQUESTED_SIZES) {
  const matches = [];
  for (const item of cpItems) {
    const t = item.title;
    let itemType = null;
    if (/(?:^|\W)(?:p\+|type\s*21|p\s*plus)(?:\W|$)/i.test(t)) itemType = 'P+';
    else if (/(?:^|\W)(?:k2|type\s*22|double\s*convector)(?:\W|$)/i.test(t)) itemType = 'K2';
    else if (/(?:^|\W)(?:k1|type\s*11|single\s*convector)(?:\W|$)/i.test(t)) itemType = 'K1';
    if (itemType !== spec.type) continue;

    const dim = t.match(/(\d{3,4})\s*(?:mm)?\s*[xX*\/]\s*(\d{3,4})\s*(?:mm)?/);
    if (!dim) continue;
    const d1 = parseInt(dim[1], 10);
    const d2 = parseInt(dim[2], 10);

    // Exact order only, exclude Vertex vertical radiators
    if (d1 === spec.height_mm && d2 === spec.length_mm && !/vertex/i.test(t)) {
      matches.push(item);
    }
  }

  if (matches.length === 3) {
    threeSourceSpecs.push({ spec, matches });
  }
}

console.log('Total specifications with exactly 3 exact-order standard matches:', threeSourceSpecs.length);
for (const s of threeSourceSpecs) {
  console.log(`- ${s.spec.id}:`);
  for (const m of s.matches) {
    console.log(`    ${m.title} (£${m.price}, SKU: ${m.sku})`);
  }
}
