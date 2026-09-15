import { db } from './connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rows = db.prepare('SELECT * FROM radiator_catalogue ORDER BY radiator_type, height_mm, length_mm').all() as any[];

let md = '# Audited City Plumbing Radiator Catalogue & VAT Evidence Registry (199 Specifications)\n\n';
md += '| Type | Requested HxL (mm) | Source Title Dims | Norm HxL (mm) | Dim Valid | Product Name & SKU | Source Price | VAT Basis | Evidenced VAT Rate % | Captured VAT Payload / Wording | Normalized Price EX VAT | Verification Status | Commercial Review |\n';
md += '| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n';

for (const r of rows) {
  const review = r.commercial_review_required ? 'FLAGGED: ' + r.commercial_review_reason : 'None';
  const exVatPrice = r.normalized_ex_vat_price !== null ? `£${r.normalized_ex_vat_price.toFixed(2)}` : 'NULL';
  const sourcePrice = r.source_price !== null ? `£${r.source_price.toFixed(2)}` : 'NULL';
  const vatRate = r.vat_rate_percent !== null ? `${r.vat_rate_percent}%` : 'UNKNOWN';
  const wording = r.captured_vat_wording ? `\`${r.captured_vat_wording}\`` : 'None (HTTP 404 / Missing)';
  const dimsRequested = `${r.requested_height_mm} x ${r.requested_length_mm}`;
  const dimsNormalized = `${r.normalized_height_mm} x ${r.normalized_length_mm}`;
  
  md += `| ${r.radiator_type} | ${dimsRequested} | ${r.source_title_dimensions} | ${dimsNormalized} | ${r.dimension_validation_status} | ${r.product_name} (SKU: ${r.sku || 'N/A'}) | ${sourcePrice} | ${r.source_vat_basis} | ${vatRate} | ${wording} | ${exVatPrice} | ${r.verification_status} (${r.supplier_verification_status}) | ${review} |\n`;
}

const targetPath = path.resolve(__dirname, '../../radiator_table.md');
fs.writeFileSync(targetPath, md);
console.log(`Successfully wrote ${rows.length} records to ${targetPath}`);
