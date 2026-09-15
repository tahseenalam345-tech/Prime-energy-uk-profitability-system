import fs from 'fs';

const products = JSON.parse(fs.readFileSync('server/audit_output.json', 'utf8'));

// Generate Markdown Table for Section 1 (All 70 products)
let s1 = '| # | Brand | Exact Model | SKU | Family | Mkt kW | Rated kW | Rated Cond | MCS Status | MCS Ref | Ofgem PEL | BUS Status | CP Price (£ ex VAT) | Basis | CP URL | Date | Manual Review |\n';
s1 += '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n';

products.forEach((p, idx) => {
  const priceStr = p.cp_price_ex_vat !== null ? `£${p.cp_price_ex_vat.toLocaleString('en-GB')}` : 'PRICE_REQUIRED (Unpriced)';
  const mcsRef = p.mcs_product_reference || 'N/A';
  const urlLink = p.cp_source_url ? `[Link](${p.cp_source_url})` : 'MISSING';
  const manRev = p.manual_review_required === 1 ? 'FLAGGED (Review Required)' : 'CLEAR (Eligible)';
  s1 += `| ${idx + 1} | ${p.brand} | ${p.model} | ${p.sku || 'N/A'} | ${p.product_family} | ${p.marketing_kw} | ${p.rated_output_kw} | ${p.rated_condition} | ${p.mcs_status} | ${mcsRef} | ${p.ofgem_pel_status} | ${p.bus_product_eligibility_status} | ${priceStr} | ${p.price_basis || 'EX_VAT'} | ${urlLink} | ${p.source_date || '2026-09-12'} | ${manRev} |\n`;
});

fs.writeFileSync('server/section1_table.md', s1);

// Generate Markdown Table for Section 7 (All 67 priced products)
const priced = products.filter(p => p.cp_price_ex_vat !== null && p.cp_price_ex_vat !== undefined);
let s7 = '| # | Brand | Model | Capacity | City Plumbing Price (ex VAT) | VAT Basis | Source URL | Checked Date |\n';
s7 += '|---|---|---|---|---|---|---|---|\n';

priced.forEach((p, idx) => {
  const isBaseline = p.id.startsWith('ashp_ecogenica') || p.id.startsWith('ashp_trianco');
  const urlLink = isBaseline 
    ? `[Merchant Catalogue](${p.cp_source_url}) *(Baseline Benchmark)*` 
    : (p.cp_source_url ? `[City Plumbing Link](${p.cp_source_url})` : 'N/A');
  s7 += `| ${idx + 1} | ${p.brand} | ${p.model} | ${p.marketing_kw} kW | £${p.cp_price_ex_vat.toLocaleString('en-GB')} | ${p.price_basis || 'EX_VAT'} | ${urlLink} | ${p.date_collected || '2026-09-12'} |\n`;
});

fs.writeFileSync('server/section7_table.md', s7);
console.log(`Generated section1_table.md (${products.length} rows) and section7_table.md (${priced.length} rows)`);
