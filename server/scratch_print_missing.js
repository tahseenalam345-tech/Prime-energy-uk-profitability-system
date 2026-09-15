import fs from 'fs';
import { REQUESTED_SIZES } from './fetch_cp_radiators.js';
import { matchSpecToCP } from './scratch_test_matcher.js';

const cpItems = JSON.parse(fs.readFileSync('./city_plumbing_all_radiators.json', 'utf8'));

const missing = [];
for (const s of REQUESTED_SIZES) {
  const m = matchSpecToCP(s, cpItems);
  if (m.length === 0) {
    missing.push(s);
  }
}

console.log(`Missing sizes (${missing.length}):`);
for (const m of missing) {
  console.log(`- ${m.type} ${m.height_mm}mm x ${m.length_mm}mm (${m.id})`);
}
