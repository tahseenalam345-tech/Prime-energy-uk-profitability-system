import fs from 'fs';
import { REQUESTED_SIZES } from './fetch_cp_radiators.js';

const cpItems = JSON.parse(fs.readFileSync('./city_plumbing_all_radiators.json', 'utf8'));

// Inspect matches for a few sizes with >3 matches
function inspectMatches(specId) {
  console.log(`\n=== Inspecting matches for ${specId} ===`);
  const spec = REQUESTED_SIZES.find(s => s.id === specId);
  const matched = [];

  for (const item of cpItems) {
    const t = item.title;
    // Check type
    let matchesType = false;
    if (spec.type === 'K1' && /\b(k1|type\s*11)\b/i.test(t)) matchesType = true;
    if (spec.type === 'P+' && /\b(p\+|type\s*21|p\s*plus)\b/i.test(t)) matchesType = true;
    if (spec.type === 'K2' && /\b(k2|type\s*22)\b/i.test(t)) matchesType = true;
    if (!matchesType) continue;

    // Check dimensions
    const dim = t.match(/(\d{3,4})\s*(?:mm)?\s*[xX*\/]\s*(\d{3,4})\s*(?:mm)?/);
    if (!dim) continue;
    const d1 = parseInt(dim[1], 10);
    const d2 = parseInt(dim[2], 10);
    if ((d1 === spec.height_mm && d2 === spec.length_mm) || (d2 === spec.height_mm && d1 === spec.length_mm)) {
      matched.push(item);
    }
  }

  console.log(`Found ${matched.length} matches:`);
  for (const m of matched) {
    console.log(`- ${m.title} | Price: £${m.price} | SKU: ${m.sku}`);
  }
}

inspectMatches('rad_k1_600x1000');
inspectMatches('rad_k2_600x1000');
inspectMatches('rad_p_plus_600x1000');
inspectMatches('rad_k1_300x400');
inspectMatches('rad_k2_450x1000');
