import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const db = new Database(path.resolve(__dirname, 'prime_energy.db'));

console.log('========================================================');
console.log('PRIME ENERGY UK - ASHP DATABASE COMPREHENSIVE VERIFICATION AUDIT');
console.log('========================================================');

// --- SECTION 2: PRICE AUDIT ---
const totalAshp = db.prepare(`SELECT COUNT(*) as count FROM products WHERE family = 'ASHP'`).get() as any;
const totalWithCpPrice = db.prepare(`
  SELECT COUNT(DISTINCT p.id) as count 
  FROM products p 
  JOIN product_prices pr ON p.id = pr.product_id 
  WHERE p.family = 'ASHP' AND pr.source_type = 'CITY_PLUMBING' AND pr.is_current = 1 AND pr.price_ex_vat IS NOT NULL
`).get() as any;

const totalWithoutPrice = db.prepare(`
  SELECT COUNT(DISTINCT p.id) as count 
  FROM products p 
  LEFT JOIN product_prices pr ON p.id = pr.product_id AND pr.source_type = 'CITY_PLUMBING' AND pr.is_current = 1
  WHERE p.family = 'ASHP' AND (pr.price_ex_vat IS NULL OR pr.id IS NULL)
`).get() as any;

const totalCurrentCpPrices = db.prepare(`
  SELECT COUNT(*) as count 
  FROM product_prices 
  WHERE source_type = 'CITY_PLUMBING' AND is_current = 1
`).get() as any;

const duplicateProducts = db.prepare(`
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

const unpricedList = db.prepare(`
  SELECT p.id, COALESCE(p.brand, p.manufacturer) as brand, p.model, p.sku, pr.source_url, pr.confidence
  FROM products p
  LEFT JOIN product_prices pr ON p.id = pr.product_id AND pr.source_type = 'CITY_PLUMBING' AND pr.is_current = 1
  WHERE p.family = 'ASHP' AND (pr.price_ex_vat IS NULL OR pr.id IS NULL)
`).all();

console.log('\n--- SECTION 2: PRICE AUDIT METRICS ---');
console.log(`Total ASHP products: ${totalAshp.count}`);
console.log(`Total products with City Plumbing price: ${totalWithCpPrice.count}`);
console.log(`Total products without price: ${totalWithoutPrice.count}`);
console.log(`Total current City Plumbing price records: ${totalCurrentCpPrices.count}`);
console.log(`Duplicate models: ${duplicateProducts.length}`);
console.log(`Duplicate SKUs: ${duplicateSkus.length}`);
console.log('Unpriced products:', unpricedList);

// --- SECTION 3: MCS AUDIT ---
const mcsCertifiedMissing = db.prepare(`
  SELECT id, COALESCE(brand, manufacturer) as brand, model, mcs_product_reference, mcs_directory_url, mcs_verification_date
  FROM products
  WHERE family = 'ASHP' AND mcs_status = 'MCS_CERTIFIED' AND (
    mcs_product_reference IS NULL OR TRIM(mcs_product_reference) = '' OR
    mcs_directory_url IS NULL OR TRIM(mcs_directory_url) = '' OR
    mcs_verification_date IS NULL OR TRIM(mcs_verification_date) = ''
  )
`).all();
const totalMcsCertified = db.prepare(`SELECT COUNT(*) as count FROM products WHERE family = 'ASHP' AND mcs_status = 'MCS_CERTIFIED'`).get() as any;

console.log('\n--- SECTION 3: MCS AUDIT ---');
console.log(`Total MCS_CERTIFIED products: ${totalMcsCertified.count}`);
console.log(`MCS_CERTIFIED missing ref, url, or date: ${mcsCertifiedMissing.length}`);

// --- SECTION 4: OFGEM / BUS AUDIT ---
const pelListedMissing = db.prepare(`
  SELECT id, COALESCE(brand, manufacturer) as brand, model, ofgem_source_url
  FROM products
  WHERE family = 'ASHP' AND ofgem_pel_status = 'PEL_LISTED' AND (
    ofgem_source_url IS NULL OR TRIM(ofgem_source_url) = ''
  )
`).all();
const totalPelListed = db.prepare(`SELECT COUNT(*) as count FROM products WHERE family = 'ASHP' AND ofgem_pel_status = 'PEL_LISTED'`).get() as any;

console.log('\n--- SECTION 4: OFGEM/BUS AUDIT ---');
console.log(`Total PEL_LISTED products: ${totalPelListed.count}`);
console.log(`PEL_LISTED missing source URL: ${pelListedMissing.length}`);

// --- SECTION 6: CITY PLUMBING URL CHECK ---
const allCpRecords = db.prepare(`
  SELECT p.id, COALESCE(p.brand, p.manufacturer) as brand, p.model, p.sku, pr.source_url
  FROM products p
  JOIN product_prices pr ON p.id = pr.product_id AND pr.source_type = 'CITY_PLUMBING' AND pr.is_current = 1
  WHERE p.family = 'ASHP'
`).all() as any[];

let urlOk = 0;
let urlMismatch = 0;
let urlMissing = 0;
const mismatchList: any[] = [];
const missingList: any[] = [];

for (const r of allCpRecords) {
  if (!r.source_url || r.source_url.trim() === '') {
    urlMissing++;
    missingList.push(r);
  } else if (!r.source_url.startsWith('https://www.cityplumbing.co.uk/')) {
    urlMismatch++;
    mismatchList.push(r);
  } else {
    urlOk++;
  }
}

console.log('\n--- SECTION 6: CITY PLUMBING URL CHECK ---');
console.log(`CITY_PLUMBING_URL_OK: ${urlOk}`);
console.log(`CITY_PLUMBING_URL_MISMATCH: ${urlMismatch}`);
console.log(`CITY_PLUMBING_URL_MISSING: ${urlMissing}`);
console.log('Mismatches (e.g. baseline benchmark records pointing to primeenergy catalogue):', mismatchList.map(m => `${m.brand} ${m.model} -> ${m.source_url}`));

// --- SECTION 8 & 10: CAPACITY AUDIT & DISCREPANCY ---
const distinctCaps = db.prepare(`
  SELECT DISTINCT COALESCE(marketing_nominal_kw, nominal_capacity) as cap
  FROM products
  WHERE family = 'ASHP' AND COALESCE(marketing_nominal_kw, nominal_capacity) IS NOT NULL
  ORDER BY cap ASC
`).all().map((r: any) => r.cap);

const capDistribution = db.prepare(`
  SELECT COALESCE(marketing_nominal_kw, nominal_capacity) as cap, COUNT(*) as count
  FROM products
  WHERE family = 'ASHP'
  GROUP BY cap
  ORDER BY cap ASC
`).all();

console.log('\n--- SECTION 8 & 10: CAPACITY AUDIT ---');
console.log('Distinct capacities array:', distinctCaps);
console.log(`Exact SQL Distinct capacities count: ${distinctCaps.length}`);
console.log('Capacity distribution:');
console.table(capDistribution);

// --- SECTION 9: BRAND AUDIT ---
const brandAudit = db.prepare(`
  SELECT 
    COALESCE(brand, manufacturer) as Brand,
    COUNT(*) as Product_Count,
    SUM(CASE WHEN pr.price_ex_vat IS NOT NULL THEN 1 ELSE 0 END) as Priced_Count,
    SUM(CASE WHEN p.mcs_status = 'MCS_CERTIFIED' THEN 1 ELSE 0 END) as MCS_Verified_Count,
    SUM(CASE WHEN p.ofgem_pel_status = 'PEL_LISTED' THEN 1 ELSE 0 END) as PEL_Listed_Count,
    SUM(CASE WHEN p.manual_review_required = 1 THEN 1 ELSE 0 END) as Manual_Review_Count
  FROM products p
  LEFT JOIN product_prices pr ON p.id = pr.product_id AND pr.source_type = 'CITY_PLUMBING' AND pr.is_current = 1
  WHERE p.family = 'ASHP'
  GROUP BY Brand
  ORDER BY Brand ASC
`).all();

console.log('\n--- SECTION 9: BRAND AUDIT TABLE ---');
console.table(brandAudit);

// --- SECTION 11: BASELINE VS NEW IMPORT CHECK ---
const baselineProducts = db.prepare(`
  SELECT id, COALESCE(brand, manufacturer) as brand, model, sku, COALESCE(marketing_nominal_kw, nominal_capacity) as kw
  FROM products
  WHERE family = 'ASHP' AND (id LIKE 'ashp_ecogenica%' OR id LIKE 'ashp_trianco%')
  ORDER BY id ASC
`).all();

const newlyImportedProducts = db.prepare(`
  SELECT id, COALESCE(brand, manufacturer) as brand, model, sku, COALESCE(marketing_nominal_kw, nominal_capacity) as kw
  FROM products
  WHERE family = 'ASHP' AND id NOT LIKE 'ashp_ecogenica%' AND id NOT LIKE 'ashp_trianco%'
  ORDER BY brand ASC, kw ASC
`).all();

console.log('\n--- SECTION 11: PRODUCT COUNT AUDIT ---');
console.log(`Baseline products count: ${baselineProducts.length}`);
console.log(`Newly imported products count: ${newlyImportedProducts.length}`);
console.log(`Total count: ${baselineProducts.length + newlyImportedProducts.length}`);

// --- SECTION 12: RECOMMENDATION ENGINE TEST (7.2 kW) ---
import { selectRecommendedASHP } from './src/engine/ashpSelector.js';
const testDemand = 7.2;
const recommendation = selectRecommendedASHP(testDemand);

console.log('\n--- SECTION 12: RECOMMENDATION ENGINE TEST (Demand = 7.2 kW) ---');
console.log('Selected Recommended Model:', recommendation.recommendedProduct?.brand, recommendation.recommendedProduct?.model);
console.log('Marketing Model Nominal Capacity:', recommendation.recommendedProduct?.nominalCapacity, 'kW');
console.log('Design Rated Output at -2°C/45°C:', recommendation.recommendedProduct?.ratedOutputAtDesign, 'kW');
console.log('Status:', recommendation.status);
console.log('Alternatives count:', recommendation.alternatives.length);
console.log('First 5 Alternatives:');
recommendation.alternatives.slice(0, 5).forEach((alt, i) => {
  console.log(` ${i + 1}. [${alt.brand}] ${alt.model} | Nominal: ${alt.nominalCapacity}kW | Rated Output: ${alt.ratedOutputAtDesign}kW | Price: £${alt.priceExVat}`);
});
