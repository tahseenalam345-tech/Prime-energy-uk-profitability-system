import fs from 'fs';
import { REQUESTED_RADIATOR_SIZES } from './src/db/seedRadiators.js';

const cpItems = JSON.parse(fs.readFileSync('./city_plumbing_all_radiators.json', 'utf8'));

console.log(`Starting detailed audit of ${REQUESTED_RADIATOR_SIZES.length} specifications...`);

interface AuditResult {
  spec: { id: string; type: string; height_mm: number; length_mm: number };
  exactOrderMatches: any[];
  reversedMatches: any[];
  vertexMatches: any[];
  allMatches: any[];
}

const auditResults: AuditResult[] = [];

for (const spec of REQUESTED_RADIATOR_SIZES) {
  const exactOrderMatches: any[] = [];
  const reversedMatches: any[] = [];
  const vertexMatches: any[] = [];

  for (const item of cpItems) {
    const t = item.title;

    // Check type matching
    let itemType = null;
    if (/(?:^|\W)(?:p\+|type\s*21|p\s*plus)(?:\W|$)/i.test(t)) {
      itemType = 'P+';
    } else if (/(?:^|\W)(?:k2|type\s*22|double\s*convector)(?:\W|$)/i.test(t)) {
      itemType = 'K2';
    } else if (/(?:^|\W)(?:k1|type\s*11|single\s*convector)(?:\W|$)/i.test(t)) {
      itemType = 'K1';
    }

    if (itemType !== spec.type) continue;

    // Check dimension matches
    const dimMatch = t.match(/(\d{3,4})\s*(?:mm)?\s*[xX*\/]\s*(\d{3,4})\s*(?:mm)?/);
    if (!dimMatch) continue;

    const d1 = parseInt(dimMatch[1], 10);
    const d2 = parseInt(dimMatch[2], 10);

    const isVertex = /vertex/i.test(t);

    if (d1 === spec.height_mm && d2 === spec.length_mm) {
      if (isVertex) {
        vertexMatches.push({ ...item, d1, d2, order: 'EXACT_ORDER_VERTEX' });
      } else {
        exactOrderMatches.push({ ...item, d1, d2, order: 'EXACT_TITLE_ORDER' });
      }
    } else if (d2 === spec.height_mm && d1 === spec.length_mm) {
      if (isVertex) {
        vertexMatches.push({ ...item, d1, d2, order: 'REVERSED_VERTEX' });
      } else {
        reversedMatches.push({ ...item, d1, d2, order: 'REVERSED_TITLE_ORDER' });
      }
    }
  }

  auditResults.push({
    spec,
    exactOrderMatches,
    reversedMatches,
    vertexMatches,
    allMatches: [...exactOrderMatches, ...reversedMatches, ...vertexMatches]
  });
}

// Summary stats
let onlyExact = 0;
let onlyReversed = 0;
let both = 0;
let onlyVertex = 0;
let none = 0;

for (const r of auditResults) {
  const hasExact = r.exactOrderMatches.length > 0;
  const hasReversed = r.reversedMatches.length > 0;
  const hasVertex = r.vertexMatches.length > 0;

  if (hasExact && !hasReversed && !hasVertex) onlyExact++;
  else if (hasExact && hasReversed) both++;
  else if (!hasExact && hasReversed) onlyReversed++;
  else if (!hasExact && !hasReversed && hasVertex) onlyVertex++;
  else if (!hasExact && !hasReversed && !hasVertex) none++;
}

console.log('--- AUDIT DIMENSION MATCH BREAKDOWN ---');
console.log('Total specifications:', auditResults.length);
console.log('Specifications with ONLY exact title order (Height x Length):', onlyExact);
console.log('Specifications with BOTH exact and reversed listings:', both);
console.log('Specifications with ONLY reversed listings (e.g. Length x Height):', onlyReversed);
console.log('Specifications with ONLY Vertex vertical listings:', onlyVertex);
console.log('Specifications with ZERO listings:', none);

// Print any with only reversed or only vertex
if (onlyReversed > 0) {
  console.log('\n--- ONLY REVERSED SPECIFICATIONS ---');
  for (const r of auditResults.filter(r => r.exactOrderMatches.length === 0 && r.reversedMatches.length > 0)) {
    console.log(`- ${r.spec.type} ${r.spec.height_mm}x${r.spec.length_mm} -> Matched reversed titles:`, r.reversedMatches.map(m => m.title));
  }
}

if (onlyVertex > 0) {
  console.log('\n--- ONLY VERTICAL / VERTEX SPECIFICATIONS ---');
  for (const r of auditResults.filter(r => r.exactOrderMatches.length === 0 && r.reversedMatches.length === 0 && r.vertexMatches.length > 0)) {
    console.log(`- ${r.spec.type} ${r.spec.height_mm}x${r.spec.length_mm} -> Matched Vertex titles:`, r.vertexMatches.map(m => m.title));
  }
}
