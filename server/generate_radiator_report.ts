import { db, initDatabase } from './src/db/connection.js';

initDatabase();

const rows = db.prepare(`
  SELECT radiator_type, height_mm, length_mm, product_name, normalized_ex_vat_price, source_count, verification_status
  FROM radiator_catalogue
  ORDER BY radiator_type ASC, height_mm ASC, length_mm ASC
`).all() as any[];

console.log(`Total rows in radiator_catalogue: ${rows.length}`);

const statusCounts: Record<string, number> = {};
let count3Sources = 0;
for (const r of rows) {
  statusCounts[r.verification_status] = (statusCounts[r.verification_status] || 0) + 1;
  if (r.source_count === 3) count3Sources++;
}

console.log('Status counts:', statusCounts);
console.log('Total 3 sources:', count3Sources);
