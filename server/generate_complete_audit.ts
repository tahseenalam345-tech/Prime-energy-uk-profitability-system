import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const db = new Database(path.resolve(__dirname, 'prime_energy.db'));

// 1. Get all 70 products
const products = db.prepare(`
  SELECT 
    p.id,
    COALESCE(p.brand, p.manufacturer) as brand,
    p.model,
    p.sku,
    p.family as product_family,
    COALESCE(p.marketing_nominal_kw, p.nominal_capacity) as marketing_kw,
    COALESCE(p.rated_output_kw, p.rated_output_at_design) as rated_output_kw,
    COALESCE(p.rated_output_condition, p.design_condition, '-2°C / 45°C flow') as rated_condition,
    p.mcs_status,
    p.mcs_product_reference,
    p.mcs_directory_url,
    p.mcs_verification_date,
    p.ofgem_pel_status,
    p.ofgem_source_url,
    p.bus_product_eligibility_status,
    p.source_date,
    p.manual_review_required,
    p.data_confidence,
    pr.price_ex_vat as cp_price_ex_vat,
    pr.price_basis,
    pr.source_url as cp_source_url,
    pr.source_type,
    pr.confidence as price_confidence,
    pr.date_collected
  FROM products p
  LEFT JOIN product_prices pr ON p.id = pr.product_id AND pr.source_type = 'CITY_PLUMBING' AND pr.is_current = 1
  WHERE p.family = 'ASHP'
  ORDER BY COALESCE(p.brand, p.manufacturer) ASC, COALESCE(p.marketing_nominal_kw, p.nominal_capacity, 0) ASC
`).all() as any[];

console.log(`TOTAL_PRODUCTS_FOUND=${products.length}`);

// Write JSON for analysis
import fs from 'fs';
fs.writeFileSync(path.resolve(__dirname, 'audit_output.json'), JSON.stringify(products, null, 2));
console.log('Saved audit_output.json');
