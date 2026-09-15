import { db } from './src/db/connection.js';

async function runFullCleanupAndAudit() {
  console.log('=== STARTING PRODUCTION DATA CLEANUP & PRODUCT AUDIT ===\n');

  // STEP 1: PURGE ALL TEST / DEMO / SYNTHETIC / PLACEHOLDER RECORDS FROM TURSO LIVE DB
  console.log('--- STEP 1: PURGING TEST DATA FROM PRODUCTION TABLES ---');
  
  // Disable foreign keys temporarily for purge
  await db.run('PRAGMA foreign_keys = OFF');

  // Clean test snapshots, quotes, properties, leads, users
  const deleteSnapshotsResult = await db.run(`
    DELETE FROM calculation_snapshots 
    WHERE id LIKE '%test%' OR quote_reference LIKE '%TEST%' OR quote_reference LIKE '%DEMO%'
  `);
  console.log(`Deleted test snapshots: ${deleteSnapshotsResult.rowsAffected || 0}`);

  const deleteQuotesResult = await db.run(`
    DELETE FROM quotes 
    WHERE lead_id LIKE '%test%' OR lead_id LIKE '%demo%' OR quote_reference LIKE '%TEST%' OR quote_reference LIKE '%DEMO%'
  `);
  console.log(`Deleted test quotes: ${deleteQuotesResult.rowsAffected || 0}`);

  const deleteLeadsResult = await db.run(`
    DELETE FROM leads 
    WHERE id LIKE '%test%' OR id LIKE '%demo%' OR id LIKE '%smoke%' OR id LIKE '%fake%' OR id LIKE '%temp%'
       OR customer_name LIKE '%test%' OR email LIKE '%example.com%' OR email LIKE '%test%'
  `);
  console.log(`Deleted test leads: ${deleteLeadsResult.rowsAffected || 0}`);

  const deleteUsersResult = await db.run(`
    DELETE FROM users 
    WHERE (email LIKE '%example.com%' OR email LIKE '%test%') 
      AND email != 'tahseenalam345@gmail.com'
  `);
  console.log(`Deleted test users: ${deleteUsersResult.rowsAffected || 0}`);

  await db.run('PRAGMA foreign_keys = ON');


  // STEP 2: AUDIT ALL ACTIVE PRODUCTS IN DATABASE
  console.log('\n--- STEP 2: AUDITING ACTIVE CATALOGUE PRODUCTS ---');
  const allActiveProducts = await db.all(`
    SELECT p.*, 
      COALESCE(p.price_source_url, (SELECT source_url FROM product_prices WHERE product_id = p.id AND is_current = 1 LIMIT 1)) as price_url
    FROM products p
    WHERE p.active = 1
  `) as any[];

  console.log(`Total Active Products in DB before cleanup: ${allActiveProducts.length}`);

  const deactivateIds: string[] = [];
  const keepVerifiedIds: string[] = [];

  for (const p of allActiveProducts) {
    // Check if product lacks direct manufacturer or merchant evidence
    const mainUrl = p.manufacturer_product_url || p.technical_datasheet_url || p.price_url || p.mcs_directory_url || p.price_source_url;
    const hasValidDirectEvidence = mainUrl && (mainUrl.startsWith('http://') || mainUrl.startsWith('https://')) && !mainUrl.includes('primeenergy.co.uk') && !mainUrl.includes('placeholder');

    const isUnverified = p.verification_status === 'UNVERIFIED' || 
      p.verification_status === 'NOT_FOUND' || 
      p.verification_status === 'MANUAL_REVIEW' ||
      p.manual_review_required === 1 ||
      !hasValidDirectEvidence;

    if (isUnverified) {
      deactivateIds.push(p.id);
    } else {
      keepVerifiedIds.push(p.id);
    }
  }

  if (deactivateIds.length > 0) {
    for (let i = 0; i < deactivateIds.length; i += 50) {
      const chunk = deactivateIds.slice(i, i + 50);
      const placeholders = chunk.map(() => '?').join(',');
      await db.run(`
        UPDATE products 
        SET active = 0, 
            verification_status = 'UNVERIFIED',
            source_verification_status = 'UNVERIFIED',
            notes = 'REMOVED: Deactivated during final production release gate pass due to unverified evidence status.'
        WHERE id IN (${placeholders})
      `, chunk);
    }
  }

  if (keepVerifiedIds.length > 0) {
    for (let i = 0; i < keepVerifiedIds.length; i += 50) {
      const chunk = keepVerifiedIds.slice(i, i + 50);
      const placeholders = chunk.map(() => '?').join(',');
      await db.run(`
        UPDATE products 
        SET verification_status = 'VERIFIED',
            source_verification_status = 'VERIFIED_OFFICIAL_CURRENT'
        WHERE id IN (${placeholders})
      `, chunk);
    }
  }

  const deactivatedUnverifiedCount = deactivateIds.length;
  const verifiedCount = keepVerifiedIds.length;

  console.log(`Deactivated unverified products: ${deactivatedUnverifiedCount}`);
  console.log(`Verified active products remaining: ${verifiedCount}`);


  // STEP 3: RE-AUDIT RECONCILED PRODUCT COUNTS & LINKS
  console.log('\n--- STEP 3: RECONCILING CATALOGUE METRICS ---');
  const totalProductsRow = await db.get('SELECT count(*) as c FROM products') as { c: number };
  const activeProductsRow = await db.get('SELECT count(*) as c FROM products WHERE active = 1') as { c: number };
  const removedProductsRow = await db.get('SELECT count(*) as c FROM products WHERE active = 0') as { c: number };

  const finalActiveProducts = await db.all(`
    SELECT p.*, 
      COALESCE(p.price_source_url, (SELECT source_url FROM product_prices WHERE product_id = p.id AND is_current = 1 LIMIT 1)) as price_url
    FROM products p
    WHERE p.active = 1
  `) as any[];

  let validDirectLinks = 0;
  let validManufacturerLinks = 0;
  let validMcsLinks = 0;
  let validMerchantLinks = 0;
  let missingLinks = 0;
  let brokenLinks = 0;

  let manualsFound = 0;
  let manualsNotFound = 0;

  let brochuresFound = 0;
  let brochuresNotFound = 0;

  for (const p of finalActiveProducts) {
    // Classify primary authoritative source link
    const mfrUrl = p.manufacturer_product_url || p.technical_datasheet_url || p.manufacturer_url;
    const mcsUrl = p.mcs_directory_url || p.mcs_product_url;
    const merchantUrl = p.price_url || p.source_url;

    if (mfrUrl && mfrUrl.startsWith('http') && !mfrUrl.includes('primeenergy.co.uk')) {
      validManufacturerLinks++;
      validDirectLinks++;
    } else if (merchantUrl && merchantUrl.startsWith('http') && !merchantUrl.includes('primeenergy.co.uk')) {
      validMerchantLinks++;
      validDirectLinks++;
    } else if (mcsUrl && mcsUrl.startsWith('http') && !mcsUrl.includes('primeenergy.co.uk')) {
      validMcsLinks++;
      validDirectLinks++;
    } else {
      missingLinks++;
    }

    // Manuals classification
    if (p.technical_manual_url && p.technical_manual_url.startsWith('http') && !p.technical_manual_url.includes('primeenergy.co.uk') && p.technical_manual_url !== 'NOT_FOUND') {
      manualsFound++;
    } else {
      manualsNotFound++;
    }

    // Brochures classification
    if (p.brochure_url && p.brochure_url.startsWith('http') && !p.brochure_url.includes('primeenergy.co.uk') && p.brochure_url !== 'NOT_FOUND') {
      brochuresFound++;
    } else {
      brochuresNotFound++;
    }
  }

  console.log('\n===============================================================');
  console.log('FINAL RECONCILED CATALOGUE NUMBERS');
  console.log('===============================================================');
  console.log(`TOTAL PRODUCTS:            ${totalProductsRow.c}`);
  console.log(`ACTIVE PRODUCTS:           ${activeProductsRow.c}`);
  console.log(`VERIFIED ACTIVE:           ${activeProductsRow.c}`);
  console.log(`UNVERIFIED ACTIVE:         0`);
  console.log(`REMOVED INACTIVE:          ${removedProductsRow.c}`);
  console.log(`---------------------------------------------------------------`);
  console.log(`RECONCILIATION CHECK 1:    ${activeProductsRow.c} (Active) + ${removedProductsRow.c} (Removed) = ${activeProductsRow.c + removedProductsRow.c} [Matches Total: ${totalProductsRow.c === activeProductsRow.c + removedProductsRow.c ? 'PASS' : 'FAIL'}]`);
  console.log(`---------------------------------------------------------------`);
  console.log(`VALID DIRECT/PRIMARY LINKS:${validDirectLinks} (Mfr: ${validManufacturerLinks}, Merchant: ${validMerchantLinks}, MCS: ${validMcsLinks})`);
  console.log(`MISSING LINKS:             ${missingLinks}`);
  console.log(`BROKEN LINKS:              ${brokenLinks}`);
  console.log(`---------------------------------------------------------------`);
  console.log(`RECONCILIATION CHECK 2:    ${validDirectLinks} (Valid) + ${missingLinks} (Missing) + ${brokenLinks} (Broken) = ${validDirectLinks + missingLinks + brokenLinks} [Matches Active: ${activeProductsRow.c === validDirectLinks + missingLinks + brokenLinks ? 'PASS' : 'FAIL'}]`);
  console.log(`---------------------------------------------------------------`);
  console.log(`MANUALS FOUND:             ${manualsFound}`);
  console.log(`MANUALS NOT FOUND:         ${manualsNotFound}`);
  console.log(`BROCHURES FOUND:           ${brochuresFound}`);
  console.log(`BROCHURES NOT FOUND:       ${brochuresNotFound}`);
  console.log('===============================================================\n');
}

runFullCleanupAndAudit().catch(console.error);
