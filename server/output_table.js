import { db, initDatabase } from './src/db/connection.js';
import fs from 'fs';

initDatabase();

const rows = db.prepare(`
  SELECT radiator_type, height_mm, length_mm, product_name, normalized_ex_vat_price, source_count, verification_status
  FROM radiator_catalogue
  ORDER BY radiator_type ASC, height_mm ASC, length_mm ASC
`).all();

let md = '| Type | Height | Length | Product | City Plumbing Price EX VAT | Source Count | Status |\n';
md += '| :--- | -----: | -----: | :------ | --------------------------: | -----------: | :----- |\n';

for (const r of rows) {
  const priceStr = r.normalized_ex_vat_price !== null ? `£${r.normalized_ex_vat_price.toFixed(2)}` : 'SOURCE_REQUIRED';
  md += `| ${r.radiator_type} | ${r.height_mm}mm | ${r.length_mm}mm | ${r.product_name} | ${priceStr} | ${r.source_count} | ${r.verification_status} |\n`;
}

fs.writeFileSync('./radiator_table.md', md);
console.log('Successfully wrote radiator_table.md, lines:', rows.length);
