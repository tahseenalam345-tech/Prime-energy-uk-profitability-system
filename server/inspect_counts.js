import fs from 'fs';
import { REQUESTED_SIZES } from './fetch_cp_radiators.js';

const cpItems = JSON.parse(fs.readFileSync('./city_plumbing_all_radiators.json', 'utf8'));

// Function to find matches for a given specification
function getMatchesForSpec(spec) {
  const matches = [];
  for (const item of cpItems) {
    const t = item.title;
    
    // Check type matching
    let matchesType = false;
    if (spec.type === 'K1') {
      // Must have K1 or Type 11 and NOT K2 or Type 22 or Type 21 or P+
      if (/\b(k1|type\s*11)\b/i.test(t) && !/\b(k2|type\s*22|type\s*21|p\+|p\s*plus)\b/i.test(t)) {
        matchesType = true;
      }
    } else if (spec.type === 'P+') {
      // Must have P+ or Type 21 or P Plus and NOT Type 11
      if (/\b(p\+|type\s*21|p\s*plus)\b/i.test(t) && !/\b(type\s*11|k1)\b/i.test(t)) {
        matchesType = true;
      }
    } else if (spec.type === 'K2') {
      // Must have K2 or Type 22 and NOT Type 11 or Type 21 or P+
      if (/\b(k2|type\s*22)\b/i.test(t) && !/\b(type\s*11|type\s*21|p\+|p\s*plus)\b/i.test(t)) {
        matchesType = true;
      }
    }

    if (!matchesType) continue;

    // Check dimensions
    const dim = t.match(/(\d{3,4})\s*(?:mm)?\s*[xX*\/]\s*(\d{3,4})\s*(?:mm)?/);
    if (!dim) continue;
    const d1 = parseInt(dim[1], 10);
    const d2 = parseInt(dim[2], 10);

    if ((d1 === spec.height_mm && d2 === spec.length_mm) || (d2 === spec.height_mm && d1 === spec.length_mm)) {
      matches.push(item);
    }
  }
  return matches;
}

const breakdown = {
  zero: [],
  one: [],
  two: [],
  three: [],
  moreThanThree: []
};

for (const spec of REQUESTED_SIZES) {
  const matches = getMatchesForSpec(spec);
  if (matches.length === 0) {
    breakdown.zero.push(spec);
  } else if (matches.length === 1) {
    breakdown.one.push({ spec, matches });
  } else if (matches.length === 2) {
    breakdown.two.push({ spec, matches });
  } else if (matches.length === 3) {
    breakdown.three.push({ spec, matches });
  } else {
    breakdown.moreThanThree.push({ spec, matches });
  }
}

console.log('=== SPECIFICATION MATCH COUNTS ===');
console.log('Total:', REQUESTED_SIZES.length);
console.log('Zero matches (SOURCE_REQUIRED):', breakdown.zero.length);
console.log('1 match:', breakdown.one.length);
console.log('2 matches:', breakdown.two.length);
console.log('3 matches (exact 3-price average):', breakdown.three.length);
console.log('>3 matches:', breakdown.moreThanThree.length);

console.log('\nZero match specs (sample 10):');
console.log(breakdown.zero.slice(0, 10).map(s => `${s.type} ${s.height_mm}x${s.length_mm}`).join(', '));

console.log('\nThree match specs:');
for (const item of breakdown.three) {
  console.log(`- ${item.spec.type} ${item.spec.height_mm}x${item.spec.length_mm}: prices = [${item.matches.map(m => m.price).join(', ')}]`);
}
