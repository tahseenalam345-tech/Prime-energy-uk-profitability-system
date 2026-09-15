import { db, initDatabase } from './src/db/connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

initDatabase();

const rows = db.prepare(`
  SELECT 
    id, radiator_type, height_mm, length_mm, product_name,
    source_sku_1, source_url_1, source_price_1,
    source_sku_2, source_url_2, source_price_2,
    source_sku_3, source_url_3, source_price_3,
    source_price, normalized_ex_vat_price
  FROM radiator_catalogue
  WHERE is_three_source_averaged = 1
  ORDER BY radiator_type, height_mm, length_mm
`).all() as any[];

console.log(`Auditing ${rows.length} three-source averaged radiator specifications...`);

let md = '# Exactly 3-Source Average Audit Report (17 Specifications)\n\n';
md += '| Radiator Specification | Source 1 SKU | Source 1 URL | Source 1 Price | Source 2 SKU | Source 2 URL | Source 2 Price | Source 3 SKU | Source 3 URL | Source 3 Price | Calc Arithmetic Mean | Stored Average | Difference | VAT-Normalized EX VAT | PASS/FAIL |\n';
md += '| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n';

let allPass = true;

for (const r of rows) {
  const p1 = r.source_price_1;
  const p2 = r.source_price_2;
  const p3 = r.source_price_3;
  const calculatedMean = Math.round(((p1 + p2 + p3) / 3) * 100) / 100;
  const storedAvg = r.source_price;
  const diff = Math.abs(calculatedMean - storedAvg);
  const pass = diff < 0.001;
  if (!pass) allPass = false;

  const spec = `${r.radiator_type} ${r.height_mm}x${r.length_mm}mm`;

  md += `| ${spec} | ${r.source_sku_1} | [Link](${r.source_url_1}) | £${p1.toFixed(2)} | ${r.source_sku_2} | [Link](${r.source_url_2}) | £${p2.toFixed(2)} | ${r.source_sku_3} | [Link](${r.source_url_3}) | £${p3.toFixed(2)} | £${calculatedMean.toFixed(2)} | £${storedAvg.toFixed(2)} | £${diff.toFixed(2)} | £${r.normalized_ex_vat_price.toFixed(2)} | ${pass ? 'PASS' : 'FAIL'} |\n`;
}

console.log(`All 17 specifications pass arithmetic mean test: ${allPass}`);

const outPath = path.resolve(__dirname, 'three_source_audit_report.md');
fs.writeFileSync(outPath, md);
console.log(`Saved audit table to ${outPath}`);
