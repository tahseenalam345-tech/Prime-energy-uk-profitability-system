import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const db = new Database(path.resolve(__dirname, 'prime_energy.db'));

console.log('=== DATABASE VERIFICATION AUDIT SCRIPT ===');

// 1. Baseline vs New Products
const allAshps = db.prepare(`
  SELECT 
    p.id, p.brand, p.manufacturer, p.product_family, p.model, p.sku,
    COALESCE(p.marketing_nominal_kw, p.nominal_capacity) as marketing_kw,
    COALESCE(p.rated_output_kw, p.rated_output_at_design) as rated_output_kw,
    COALESCE(p.rated_output_condition, p.design_condition) as condition,
    p.mcs_status, p.mcs_product_reference, p.mcs_directory_url, p.mcs_verification_date,
    p.ofgem_pel_status, p.ofgem_source_url, p.bus_product_eligibility_status,
    p.manual_review_required, p.created_at,
    pr.price_ex_vat, pr.price_inc_vat, pr.price_basis, pr.source_type, pr.supplier,
    pr.source_url, pr.date_collected, pr.confidence
  FROM products p
  LEFT JOIN product_prices pr ON p.id = pr.product_id AND pr.is_current = 1
  WHERE p.family = 'ASHP'
  ORDER BY COALESCE(p.brand, p.manufacturer), COALESCE(p.marketing_nominal_kw, p.nominal_capacity, 0)
`).all() as any[];

console.log(`Total ASHP products in DB: ${allAshps.length}`);

// Baseline products check (id starts with ashp_ecogenica or ashp_trianco from original seed)
const baseline = allAshps.filter(p => p.id.startsWith('ashp_ecogenica') || p.id.startsWith('ashp_trianco'));
const newlyImported = allAshps.filter(p => !p.id.startsWith('ashp_ecogenica') && !p.id.startsWith('ashp_trianco'));

console.log(`Baseline products: ${baseline.length}`);
console.log(`Newly imported products: ${newlyImported.length}`);

// 2. Duplicates check
const duplicateModels = db.prepare(`
  SELECT model, COUNT(*) as count 
  FROM products 
  WHERE family = 'ASHP' 
  GROUP BY model 
  HAVING count > 1
`).all();

const duplicateSkus = db.prepare(`
  SELECT sku, COUNT(*) as count 
  FROM products 
  WHERE family = 'ASHP' AND sku IS NOT NULL
  GROUP BY sku 
  HAVING count > 1
`).all();

console.log('Duplicate models:', duplicateModels);
console.log('Duplicate SKUs:', duplicateSkus);

// 3. Price Audit
const pricedProducts = allAshps.filter(p => p.price_ex_vat !== null && p.price_ex_vat !== undefined);
const unpricedProducts = allAshps.filter(p => p.price_ex_vat === null || p.price_ex_vat === undefined);
const cpPriced = allAshps.filter(p => p.source_type === 'CITY_PLUMBING' && p.price_ex_vat !== null);

console.log(`Priced products: ${pricedProducts.length}`);
console.log(`Unpriced products: ${unpricedProducts.length}`);
console.log(`City Plumbing priced products: ${cpPriced.length}`);

// Total price records in product_prices
const totalPriceRecords = db.prepare('SELECT COUNT(*) as c FROM product_prices').get() as any;
const currentCpPriceRecords = db.prepare("SELECT COUNT(*) as c FROM product_prices WHERE source_type = 'CITY_PLUMBING' AND is_current = 1").get() as any;
console.log(`Total price records: ${totalPriceRecords.c}`);
console.log(`Current CP price records: ${currentCpPriceRecords.c}`);

// 4. Capacity Audit
const distinctCapacities = db.prepare(`
  SELECT DISTINCT COALESCE(marketing_nominal_kw, nominal_capacity) as cap
  FROM products
  WHERE family = 'ASHP' AND COALESCE(marketing_nominal_kw, nominal_capacity) IS NOT NULL
  ORDER BY cap ASC
`).all().map((r: any) => r.cap);

console.log('Distinct capacities array:', distinctCapacities);
console.log(`Distinct capacities count: ${distinctCapacities.length}`);

const capacityCounts = db.prepare(`
  SELECT COALESCE(marketing_nominal_kw, nominal_capacity) as cap, COUNT(*) as count
  FROM products
  WHERE family = 'ASHP'
  GROUP BY cap
  ORDER BY cap ASC
`).all();
console.log('Capacity -> Product count:', capacityCounts);

// 5. Brand Audit
const brandAudit = db.prepare(`
  SELECT 
    COALESCE(brand, manufacturer) as brand_name,
    COUNT(*) as product_count,
    SUM(CASE WHEN pr.price_ex_vat IS NOT NULL THEN 1 ELSE 0 END) as priced_count,
    SUM(CASE WHEN p.mcs_status = 'MCS_CERTIFIED' THEN 1 ELSE 0 END) as mcs_certified_count,
    SUM(CASE WHEN p.ofgem_pel_status = 'PEL_LISTED' THEN 1 ELSE 0 END) as pel_listed_count,
    SUM(CASE WHEN p.manual_review_required = 1 OR p.bus_product_eligibility_status = 'MANUAL_REVIEW' THEN 1 ELSE 0 END) as manual_review_count
  FROM products p
  LEFT JOIN product_prices pr ON p.id = pr.product_id AND pr.is_current = 1
  WHERE p.family = 'ASHP'
  GROUP BY brand_name
  ORDER BY brand_name ASC
`).all();
console.log('Brand Audit Table:');
console.table(brandAudit);

// 6. MCS Audit
const mcsMissingRef = allAshps.filter(p => p.mcs_status === 'MCS_CERTIFIED' && (!p.mcs_product_reference || !p.mcs_directory_url || !p.mcs_verification_date));
console.log(`MCS_CERTIFIED missing ref/url/date: ${mcsMissingRef.length}`);
if (mcsMissingRef.length > 0) {
  console.log('Items missing MCS fields:', mcsMissingRef.map(p => ({ id: p.id, model: p.model, mcs_ref: p.mcs_product_reference })));
}

// 7. Ofgem PEL Audit
const pelMissingUrl = allAshps.filter(p => p.ofgem_pel_status === 'PEL_LISTED' && !p.ofgem_source_url);
console.log(`PEL_LISTED missing source url: ${pelMissingUrl.length}`);

// 8. URL check
const urlAudit = allAshps.map(p => {
  if (!p.source_url) {
    return { id: p.id, model: p.model, status: 'CITY_PLUMBING_URL_MISSING', url: null };
  }
  const isCP = p.source_url.includes('cityplumbing.co.uk');
  if (!isCP) {
    return { id: p.id, model: p.model, status: 'NOT_CITY_PLUMBING_URL', url: p.source_url };
  }
  return { id: p.id, model: p.model, status: 'CITY_PLUMBING_URL_OK', url: p.source_url };
});
console.log('URL status breakdown:', {
  OK: urlAudit.filter(u => u.status === 'CITY_PLUMBING_URL_OK').length,
  MISSING: urlAudit.filter(u => u.status === 'CITY_PLUMBING_URL_MISSING').length,
  OTHER: urlAudit.filter(u => u.status === 'NOT_CITY_PLUMBING_URL').length,
});
