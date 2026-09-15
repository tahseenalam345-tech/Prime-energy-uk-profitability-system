import { db, initDatabase } from './src/db/connection.js';

initDatabase();

console.log('Populating VAT normalization tracking fields on product_prices...');

const updateExVat = db.prepare(`
  UPDATE product_prices
  SET 
    source_price = COALESCE(price_ex_vat, price_inc_vat),
    source_vat_basis = 'EX_VAT',
    normalized_ex_vat_price = price_ex_vat,
    normalization_method = 'DIRECT_EX_VAT',
    normalization_confidence = 'HIGH'
  WHERE price_basis = 'EX_VAT' OR price_basis IS NULL
`);

const updateIncVat = db.prepare(`
  UPDATE product_prices
  SET 
    source_price = price_inc_vat,
    source_vat_basis = 'INC_VAT',
    normalized_ex_vat_price = ROUND(price_inc_vat / 1.20, 2),
    normalization_method = 'DIVIDE_BY_1_POINT_20',
    normalization_confidence = 'CONFIRMED_20_PCT_VAT'
  WHERE price_basis = 'INC_VAT'
`);

const updateUnknown = db.prepare(`
  UPDATE product_prices
  SET 
    source_price = COALESCE(price_ex_vat, price_inc_vat),
    source_vat_basis = 'UNKNOWN',
    normalized_ex_vat_price = NULL,
    normalization_method = 'VAT_STATUS_UNVERIFIED',
    normalization_confidence = 'UNVERIFIED'
  WHERE price_basis = 'UNKNOWN'
`);

db.transaction(() => {
  const r1 = updateExVat.run();
  const r2 = updateIncVat.run();
  const r3 = updateUnknown.run();
  console.log(`Updated ${r1.changes} EX_VAT, ${r2.changes} INC_VAT, ${r3.changes} UNKNOWN price records.`);
})();
