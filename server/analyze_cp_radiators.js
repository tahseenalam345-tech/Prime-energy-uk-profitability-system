import fs from 'fs';
import { REQUESTED_SIZES } from './fetch_cp_radiators.js';

const cpItems = JSON.parse(fs.readFileSync('./city_plumbing_all_radiators.json', 'utf8'));
console.log(`Loaded ${cpItems.length} items from City Plumbing.`);

// Normalize and extract radiator specs from title / URL
function parseItem(item) {
  const title = item.title;
  const titleLower = title.toLowerCase();

  // 1. Determine Type
  let radType = null;
  // Look for K1 / Type 11
  const isK1 = /\b(k1|type\s*11|single\s*panel\s*single\s*convector)\b/i.test(title);
  // Look for P+ / Type 21
  const isPPlus = /\b(p\+|type\s*21|double\s*panel\s*single\s*convector|p\s*plus)\b/i.test(title);
  // Look for K2 / Type 22
  const isK2 = /\b(k2|type\s*22|double\s*panel\s*double\s*convector|double\s*convector)\b/i.test(title);

  // Disambiguation
  if (isPPlus && !isK1 && !isK2) {
    radType = 'P+';
  } else if (isK2 && !isK1 && !isPPlus) {
    radType = 'K2';
  } else if (isK1 && !isK2 && !isPPlus) {
    radType = 'K1';
  } else if (/\btype\s*21\b/i.test(title)) {
    radType = 'P+';
  } else if (/\btype\s*22\b/i.test(title)) {
    radType = 'K2';
  } else if (/\btype\s*11\b/i.test(title)) {
    radType = 'K1';
  } else if (/\bk2\b/i.test(title)) {
    radType = 'K2';
  } else if (/\bk1\b/i.test(title)) {
    radType = 'K1';
  }

  if (!radType) return null;

  // 2. Determine Height and Length
  // Patterns like 600 x 1000, 600x1000, 600mm x 1000mm, 600mmX1000mm
  let height = null;
  let length = null;

  const dimMatch = title.match(/(\d{3,4})\s*(?:mm)?\s*[xX*\/]\s*(\d{3,4})\s*(?:mm)?/);
  if (dimMatch) {
    const d1 = parseInt(dimMatch[1], 10);
    const d2 = parseInt(dimMatch[2], 10);
    // Usually height is smaller or standard radiator heights: 300, 400, 450, 500, 600, 700, 900
    const validHeights = [300, 400, 450, 500, 600, 700, 900];
    if (validHeights.includes(d1)) {
      height = d1;
      length = d2;
    } else if (validHeights.includes(d2)) {
      height = d2;
      length = d1;
    } else {
      // assume first is height
      height = d1;
      length = d2;
    }
  }

  // Also check BTU
  let btu = null;
  const btuMatch = title.match(/(\d{3,5})\s*BTU/i);
  if (btuMatch) {
    btu = parseInt(btuMatch[1], 10);
  }

  // Manufacturer
  let mfg = 'Stelrad';
  if (/purmo/i.test(title)) mfg = 'Purmo';
  if (/myson/i.test(title)) mfg = 'Myson';
  if (/henrad/i.test(title)) mfg = 'Henrad';
  if (/kudox/i.test(title)) mfg = 'Kudox';

  return {
    ...item,
    radType,
    height,
    length,
    btu,
    mfg
  };
}

const parsed = [];
for (const item of cpItems) {
  const p = parseItem(item);
  if (p && p.height && p.length) {
    parsed.push(p);
  }
}

console.log(`Successfully parsed dimensions and type for ${parsed.length} radiators.`);

// Now match against REQUESTED_SIZES
const matchesBySpec = new Map();
for (const s of REQUESTED_SIZES) {
  matchesBySpec.set(s.id, []);
}

for (const p of parsed) {
  const specId = `rad_${p.radType === 'P+' ? 'p_plus' : p.radType.toLowerCase()}_${p.height}x${p.length}`;
  if (matchesBySpec.has(specId)) {
    matchesBySpec.get(specId).push(p);
  }
}

let verifiedCount = 0;
let threeSourceCount = 0;
let singleOrDoubleSourceCount = 0;
let moreThanThreeSourceCount = 0;
let sourceRequiredCount = 0;

for (const s of REQUESTED_SIZES) {
  const matches = matchesBySpec.get(s.id);
  if (matches.length === 0) {
    sourceRequiredCount++;
  } else if (matches.length === 3) {
    verifiedCount++;
    threeSourceCount++;
  } else if (matches.length === 1 || matches.length === 2) {
    verifiedCount++;
    singleOrDoubleSourceCount++;
  } else {
    // more than 3
    verifiedCount++;
    moreThanThreeSourceCount++;
  }
}

console.log('\n--- MATCHING SUMMARY ---');
console.log('Total requested sizes:', REQUESTED_SIZES.length);
console.log('Sizes with at least 1 match on City Plumbing:', verifiedCount);
console.log('Sizes with exactly 3 matches (arithmetic mean candidates):', threeSourceCount);
console.log('Sizes with 1 or 2 matches:', singleOrDoubleSourceCount);
console.log('Sizes with >3 matches:', moreThanThreeSourceCount);
console.log('Sizes NOT found on City Plumbing (SOURCE_REQUIRED):', sourceRequiredCount);
