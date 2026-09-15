import fs from 'fs';
import { REQUESTED_SIZES } from './fetch_cp_radiators.js';
import { matchSpecToCP } from './scratch_test_matcher.js';

const cpItems = JSON.parse(fs.readFileSync('./city_plumbing_all_radiators.json', 'utf8'));

console.log('Validating matches for all 199 specifications...');

let suspicious = [];

for (const s of REQUESTED_SIZES) {
  const matches = matchSpecToCP(s, cpItems);
  if (matches.length === 0) {
    suspicious.push({ spec: s, issue: 'No matches found' });
    continue;
  }

  for (const m of matches) {
    const t = m.title;
    // Verify that height and length are explicitly mentioned in title or URL
    const hasHeight = new RegExp(`\\b${s.height_mm}\\b`).test(t) || m.url.includes(`${s.height_mm}`);
    const hasLength = new RegExp(`\\b${s.length_mm}\\b`).test(t) || m.url.includes(`${s.length_mm}`);

    if (!hasHeight || !hasLength) {
      suspicious.push({ spec: s, match: m, issue: 'Dimension discrepancy' });
    }
  }
}

console.log(`Validation complete. Suspicious / flagged items: ${suspicious.length}`);
if (suspicious.length > 0) {
  console.log(suspicious.slice(0, 10));
}
