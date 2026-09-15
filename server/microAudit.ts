import { db } from './src/db/connection.js';

async function runMicroAudit() {
  console.log('=== FINAL MICRO-AUDIT VERIFICATION ===\n');

  // 1. ALL ACTIVE PRODUCTS & ASHP SPECIFIC CHECKS
  const totalProductsRow = await db.get<{ c: number }>('SELECT count(*) as c FROM products');
  const activeProductsRow = await db.get<{ c: number }>('SELECT count(*) as c FROM products WHERE active = 1');
  const verifiedActiveRow = await db.get<{ c: number }>("SELECT count(*) as c FROM products WHERE active = 1 AND verification_status = 'VERIFIED'");
  const unverifiedActiveRow = await db.get<{ c: number }>("SELECT count(*) as c FROM products WHERE active = 1 AND (verification_status IS NULL OR verification_status != 'VERIFIED' OR manual_review_required = 1)");

  const activeAshpModels = await db.all<any>(`
    SELECT id, brand, manufacturer, model, mcs_status, mcs_product_reference, rated_output_kw, rated_output_condition, verification_status, manual_review_required, active
    FROM products
    WHERE family = 'ASHP' AND active = 1
  `);

  let mcsVerifiedAshpCount = 0;
  let unverifiedAshpCount = 0;

  for (const ashp of activeAshpModels) {
    const isMcsVerified = ashp.mcs_status === 'MCS_CERTIFIED' && ashp.mcs_product_reference;
    if (isMcsVerified) {
      mcsVerifiedAshpCount++;
    }

    const isUnverified = ashp.verification_status !== 'VERIFIED' || ashp.manual_review_required === 1 || !ashp.rated_output_kw || ashp.rated_output_kw <= 0;
    if (isUnverified) {
      unverifiedAshpCount++;
    }
  }

  // Check for any fake/test records in active products
  const fakeTestActiveRow = await db.get<{ c: number }>(`
    SELECT count(*) as c FROM products 
    WHERE active = 1 
      AND (id LIKE '%test%' OR model LIKE '%fake%' OR model LIKE '%demo%' OR brand LIKE '%placeholder%')
  `);

  console.log('--- 1. PRODUCT METRICS ---');
  console.log(`TOTAL PRODUCTS IN DB:      ${totalProductsRow?.c || 0}`);
  console.log(`ACTIVE PRODUCTS:           ${activeProductsRow?.c || 0}`);
  console.log(`VERIFIED ACTIVE PRODUCTS:  ${verifiedActiveRow?.c || 0}`);
  console.log(`UNVERIFIED ACTIVE PRODUCTS:${unverifiedActiveRow?.c || 0}`);
  console.log(`TOTAL ACTIVE ASHPS:        ${activeAshpModels.length}`);
  console.log(`MCS-VERIFIED ASHPS:        ${mcsVerifiedAshpCount}`);
  console.log(`UNVERIFIED ACTIVE ASHPS:   ${unverifiedAshpCount}`);
  console.log(`FAKE/TEST ACTIVE RECORDS:  ${fakeTestActiveRow?.c || 0}`);
  console.log('---------------------------\n');

  console.log('--- 2. ACTIVE ASHP DETAIL SAMPLE ---');
  for (const ashp of activeAshpModels.slice(0, 10)) {
    console.log(`Model: ${ashp.brand} ${ashp.model} | MCS Ref: ${ashp.mcs_product_reference || 'N/A'} | Rated: ${ashp.rated_output_kw}kW (${ashp.rated_output_condition || 'A7/W35'}) | Status: ${ashp.verification_status}`);
  }
  console.log(`... and ${activeAshpModels.length - 10} more active ASHP models.`);
  console.log('-------------------------------------\n');
}

runMicroAudit().catch(console.error);
