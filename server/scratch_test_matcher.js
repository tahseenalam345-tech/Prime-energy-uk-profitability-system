import fs from 'fs';
import { REQUESTED_SIZES } from './fetch_cp_radiators.js';

const cpItems = JSON.parse(fs.readFileSync('./city_plumbing_all_radiators.json', 'utf8'));

export function matchSpecToCP(spec, items) {
  const matches = [];

  for (const item of items) {
    const t = item.title;

    // 1. Dimension matching
    // Look for pattern like 600 x 1000, 600x1000, 600mm x 1000mm, 600mmX1000mm
    const dimMatch = t.match(/(\d{3,4})\s*(?:mm)?\s*[xX*\/]\s*(\d{3,4})\s*(?:mm)?/);
    if (!dimMatch) continue;

    const d1 = parseInt(dimMatch[1], 10);
    const d2 = parseInt(dimMatch[2], 10);
    const isDimMatch = (d1 === spec.height_mm && d2 === spec.length_mm) || (d2 === spec.height_mm && d1 === spec.length_mm);
    if (!isDimMatch) continue;

    // 2. Type matching
    let itemType = null;
    if (/(?:^|\W)(?:p\+|type\s*21|p\s*plus)(?:\W|$)/i.test(t)) {
      itemType = 'P+';
    } else if (/(?:^|\W)(?:k2|type\s*22|double\s*convector)(?:\W|$)/i.test(t)) {
      itemType = 'K2';
    } else if (/(?:^|\W)(?:k1|type\s*11|single\s*convector)(?:\W|$)/i.test(t)) {
      itemType = 'K1';
    }

    if (itemType === spec.type) {
      matches.push(item);
    }
  }

  return matches;
}

// Test matching stats
let found = 0;
let missing = 0;
let threeSources = 0;
let oneOrTwo = 0;
let moreThanThree = 0;

for (const s of REQUESTED_SIZES) {
  const m = matchSpecToCP(s, cpItems);
  if (m.length > 0) {
    found++;
    if (m.length === 3) threeSources++;
    else if (m.length === 1 || m.length === 2) oneOrTwo++;
    else moreThanThree++;
  } else {
    missing++;
  }
}

console.log(`With fixed P+ regex: Found = ${found}, Missing (SOURCE_REQUIRED) = ${missing}`);
console.log(`Exactly 3 matches (arithmetic mean) = ${threeSources}, 1 or 2 = ${oneOrTwo}, >3 = ${moreThanThree}`);
