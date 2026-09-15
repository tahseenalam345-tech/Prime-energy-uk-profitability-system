import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const db = new Database(path.resolve(__dirname, 'prime_energy.db'));

const rows = db.prepare(`
  SELECT id, brand, manufacturer, product_family, model, sku, 
         COALESCE(marketing_nominal_kw, nominal_capacity) as marketing_kw,
         COALESCE(rated_output_kw, rated_output_at_design) as rated_output_kw,
         product_source, created_at
  FROM products
  WHERE family = 'ASHP'
  ORDER BY id ASC
`).all();

console.log('Total ASHP rows:', rows.length);

const baseline = rows.filter((r: any) => r.id.startsWith('ashp_ecogenica') || r.id.startsWith('ashp_trianco'));
const imported = rows.filter((r: any) => !r.id.startsWith('ashp_ecogenica') && !r.id.startsWith('ashp_trianco'));

console.log(`Baseline (${baseline.length}):`);
baseline.forEach((r: any) => console.log(`  - ${r.id} | ${r.manufacturer} | ${r.model} | ${r.marketing_kw}kW`));

console.log(`Imported (${imported.length}):`);
imported.forEach((r: any) => console.log(`  - ${r.id} | ${r.brand || r.manufacturer} | ${r.model} | ${r.marketing_kw}kW`));
