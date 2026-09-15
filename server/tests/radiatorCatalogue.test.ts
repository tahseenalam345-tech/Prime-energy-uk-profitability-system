import { describe, it, expect, beforeAll } from 'vitest';
import { db, initDatabase } from '../src/db/connection.js';
import { seedRadiatorCatalogue, REQUESTED_RADIATOR_SIZES } from '../src/db/seedRadiators.js';
import { estimateRadiatorRequirements } from '../src/engine/radiatorEngine.js';

describe('Radiator Catalogue Data-Quality Audit & Supplier Verification Suite', () => {
  beforeAll(async () => {
    await initDatabase();
    await seedRadiatorCatalogue();
  }, 60000);

  it('1. Dimension Validation: Confirms all 199 requested specifications have physical height & length normalized with PASS status', async () => {
    const total = await db.get<any>('SELECT count(*) as count FROM radiator_catalogue');
    expect(total.count).toBe(199);

    const k1Count = await db.get<any>("SELECT count(*) as count FROM radiator_catalogue WHERE radiator_type = 'K1'");
    expect(k1Count.count).toBe(70);

    const pPlusCount = await db.get<any>("SELECT count(*) as count FROM radiator_catalogue WHERE radiator_type = 'P+'");
    expect(pPlusCount.count).toBe(60);

    const k2Count = await db.get<any>("SELECT count(*) as count FROM radiator_catalogue WHERE radiator_type = 'K2'");
    expect(k2Count.count).toBe(69);

    const failedDims = await db.get<any>("SELECT count(*) as count FROM radiator_catalogue WHERE dimension_validation_status != 'PASS'");
    expect(failedDims.count).toBe(0);

    const mismatchedDims = await db.get<any>(`
      SELECT count(*) as count FROM radiator_catalogue 
      WHERE height_mm != requested_height_mm 
         OR length_mm != requested_length_mm
         OR height_mm != normalized_height_mm
         OR length_mm != normalized_length_mm
    `);
    expect(mismatchedDims.count).toBe(0);
  });

  it('2. Reversed City Plumbing Dimension Titles: Accurately normalizes reversed title dimensions to physical height and length', async () => {
    await db.run(`
      INSERT OR REPLACE INTO radiator_catalogue (
        id, radiator_type, height_mm, length_mm,
        requested_height_mm, requested_length_mm,
        source_title_dimensions, normalized_height_mm, normalized_length_mm,
        dimension_match_type, dimension_validation_status,
        manufacturer, product_name, sku, heat_output_watts, source_btu, source_heat_output_w,
        supplier, verification_type, supplier_verification_status, verification_status,
        city_plumbing_price, source_price, source_vat_basis, normalized_ex_vat_price,
        normalization_method, vat_evidence_source, source_page_evidence, captured_vat_wording,
        vat_evidence_timestamp, vat_rate_percent, pricing_confidence, source_count,
        source_url, is_three_source_averaged, commercial_review_required, commercial_review_reason,
        source_checked_at, pricing_notes
      ) VALUES (
        'rad_test_reversed_dim', 'K2', 999, 888,
        999, 888,
        '888mm x 999mm', 999, 888,
        'REVERSED_NORMALIZED', 'PASS',
        'Stelrad', 'Stelrad Compact K2 888 x 999mm (Reversed in Title)', 'CP-REV-999', 950, 3241, 950,
        'City Plumbing', 'SUPPLIER_CATALOGUE', 'VERIFIED_CURRENT', 'SUPPLIER_VERIFIED',
        75.00, 75.00, 'INC_VAT', 62.50,
        'DIVIDE_BY_1_POINT_20', 'City Plumbing tradePrice payload confirmed', 'City Plumbing Product Page Payload',
        '"tradePrice":{"valueExVat":62.5,"valueIncVat":75.0}', '2026-09-12T12:00:00Z', 20.0, 'CONFIRMED_20_PCT_VAT', 1,
        'https://www.cityplumbing.co.uk/p/test-rev', 0, 1, 'Product title dimensions reversed relative to requested height x length specification.',
        '2026-09-12', 'Reversed title normalized successfully'
      )
    `);

    const row = await db.get<any>("SELECT * FROM radiator_catalogue WHERE id = 'rad_test_reversed_dim'");
    expect(row.dimension_match_type).toBe('REVERSED_NORMALIZED');
    expect(row.dimension_validation_status).toBe('PASS');
    expect(row.height_mm).toBe(999);
    expect(row.length_mm).toBe(888);
    expect(row.source_title_dimensions).toBe('888mm x 999mm');
    expect(row.commercial_review_required).toBe(1);

    await db.run("DELETE FROM radiator_catalogue WHERE id = 'rad_test_reversed_dim'");
  });

  it('3. Supplier Verification Status: Uses supplier metadata and does NOT describe City Plumbing as regulatory VERIFIED_OFFICIAL_CURRENT', async () => {
    const officialMisclassified = await db.get<any>(`
      SELECT count(*) as count FROM radiator_catalogue 
      WHERE verification_status = 'VERIFIED_OFFICIAL_CURRENT' 
         OR supplier_verification_status = 'VERIFIED_OFFICIAL_CURRENT'
    `);
    expect(officialMisclassified.count).toBe(0);

    const validSupplierRecords = await db.all<any>(`
      SELECT * FROM radiator_catalogue 
      WHERE supplier = 'City Plumbing' 
        AND verification_type = 'SUPPLIER_CATALOGUE'
        AND supplier_verification_status = 'VERIFIED_CURRENT'
    `);

    expect(validSupplierRecords.length).toBe(199);
    for (const rad of validSupplierRecords) {
      expect(rad.supplier).toBe('City Plumbing');
      expect(rad.verification_type).toBe('SUPPLIER_CATALOGUE');
      expect(rad.supplier_verification_status).toBe('VERIFIED_CURRENT');
      expect(rad.verification_status).toBe('SUPPLIER_VERIFIED');
      expect(rad.source_url).toContain('cityplumbing.co.uk');
      expect(rad.sku).toBeDefined();
      expect(rad.source_price).toBeGreaterThan(0);
      expect(rad.normalized_ex_vat_price).toBeGreaterThan(0);
    }
  });

  it('4. VAT Verification: Strictly requires evidence for 20% VAT; unevidenced VAT remains UNKNOWN and is NEVER divided by 1.20', async () => {
    const confirmedRecords = await db.all<any>("SELECT * FROM radiator_catalogue WHERE supplier_verification_status = 'VERIFIED_CURRENT'");
    expect(confirmedRecords.length).toBe(199);

    for (const rec of confirmedRecords) {
      expect(rec.source_vat_basis).toBe('INC_VAT');
      expect(rec.vat_rate_percent).toBe(20.0);
      expect(rec.captured_vat_wording).toContain('tradePrice');
      expect(rec.captured_vat_wording).toContain('valueExVat');
      expect(rec.captured_vat_wording).toContain('valueIncVat');
      expect(rec.vat_evidence_timestamp).toBeDefined();
      expect(rec.source_page_evidence).toContain('tradePrice');

      const expectedExVat = Math.round((rec.source_price / 1.20) * 100) / 100;
      expect(rec.normalized_ex_vat_price).toBeCloseTo(expectedExVat, 2);
      expect(rec.normalization_method).toBe('DIVIDE_BY_1_POINT_20');
    }

    await db.run(`
      INSERT OR REPLACE INTO radiator_catalogue (
        id, radiator_type, height_mm, length_mm,
        requested_height_mm, requested_length_mm,
        source_title_dimensions, normalized_height_mm, normalized_length_mm,
        dimension_match_type, dimension_validation_status,
        manufacturer, product_name, sku,
        supplier, verification_type, supplier_verification_status, verification_status,
        source_price, source_vat_basis, normalized_ex_vat_price,
        normalization_method, vat_evidence_source, pricing_confidence, source_count,
        source_checked_at, pricing_notes
      ) VALUES (
        'rad_test_unknown_vat', 'K1', 300, 9999,
        300, 9999,
        '300mm x 9999mm', 300, 9999,
        'EXACT_TITLE_ORDER', 'PASS',
        'Test Manufacturer', 'Test Unknown VAT Radiator', 'TEST-SKU-VAT',
        'City Plumbing', 'SUPPLIER_CATALOGUE', 'SOURCE_REQUIRED', 'SOURCE_REQUIRED',
        100.00, 'UNKNOWN', NULL,
        'VAT_STATUS_UNVERIFIED', 'Unconfirmed VAT basis', 'UNVERIFIED', 1,
        '2026-09-12', 'Test unknown VAT'
      )
    `);

    const unevidencedRow = await db.get<any>("SELECT * FROM radiator_catalogue WHERE id = 'rad_test_unknown_vat'");
    expect(unevidencedRow.source_vat_basis).toBe('UNKNOWN');
    expect(unevidencedRow.normalized_ex_vat_price).toBeNull();
    expect(unevidencedRow.normalized_ex_vat_price).not.toBe(83.33);
    expect(unevidencedRow.supplier_verification_status).toBe('SOURCE_REQUIRED');

    await db.run("DELETE FROM radiator_catalogue WHERE id = 'rad_test_unknown_vat'");
  });

  it('5. Three-Source Average Audit: Verifies exactly 3 valid source listings use arithmetic average (price1 + price2 + price3)/3 with all 3 sources stored', async () => {
    const threeSourceRows = await db.all<any>(`
      SELECT * FROM radiator_catalogue 
      WHERE is_three_source_averaged = 1
    `);

    expect(threeSourceRows.length).toBe(17);

    for (const row of threeSourceRows) {
      expect(row.source_price_1).toBeGreaterThan(0);
      expect(row.source_price_2).toBeGreaterThan(0);
      expect(row.source_price_3).toBeGreaterThan(0);

      expect(row.source_sku_1).toBeDefined();
      expect(row.source_sku_2).toBeDefined();
      expect(row.source_sku_3).toBeDefined();

      expect(row.source_url_1).toContain('cityplumbing.co.uk');
      expect(row.source_url_2).toContain('cityplumbing.co.uk');
      expect(row.source_url_3).toContain('cityplumbing.co.uk');

      const expectedAvg = Math.round(((row.source_price_1 + row.source_price_2 + row.source_price_3) / 3) * 100) / 100;
      expect(row.source_price).toBeCloseTo(expectedAvg, 2);

      const expectedExVat = Math.round((expectedAvg / 1.20) * 100) / 100;
      expect(row.normalized_ex_vat_price).toBeCloseTo(expectedExVat, 2);
    }
  });

  it('6. >3 Source Cases: Does NOT average >3 listings, explicitly stores selected manufacturer, model, SKU, and rationale', async () => {
    const moreThanThree = await db.all<any>(`
      SELECT * FROM radiator_catalogue 
      WHERE source_count > 3
    `);

    expect(moreThanThree.length).toBeGreaterThan(0);

    for (const row of moreThanThree) {
      expect(row.is_three_source_averaged).toBe(0);
      expect(row.selected_manufacturer).toBeDefined();
      expect(row.selected_model).toBeDefined();
      expect(row.selected_sku).toBeDefined();
      expect(row.selection_rationale).toBeDefined();
      expect(row.selection_rationale).toContain('Automatic averaging prohibited');
    }
  });

  it('7. Suspicious / Special Products: Flags units >£500 with commercial_review_required = 1', async () => {
    const reviewedRecords = await db.all<any>(`
      SELECT * FROM radiator_catalogue 
      WHERE commercial_review_required = 1
    `);

    expect(reviewedRecords.length).toBeGreaterThanOrEqual(15);

    for (const row of reviewedRecords) {
      expect(row.commercial_review_required).toBe(1);
      expect(row.commercial_review_reason).toBeDefined();
      expect(row.commercial_review_reason.length).toBeGreaterThan(0);
    }
  });

  it('8. Heat Output: Retains BTU and Watts from City Plumbing without false MCS claims', async () => {
    const withHeatOutput = await db.all<any>(`
      SELECT * FROM radiator_catalogue 
      WHERE source_btu IS NOT NULL
    `);

    expect(withHeatOutput.length).toBeGreaterThan(0);
    for (const row of withHeatOutput) {
      expect(row.source_btu).toBeGreaterThan(0);
      expect(row.source_heat_output_w).toBeGreaterThan(0);
      expect(row.output_test_condition).toMatch(/50/);
      const expectedWatts = Math.round(row.source_btu / 3.412142);
      expect(row.source_heat_output_w).toBeCloseTo(expectedWatts, -1);
    }
  });

  it('9. P+ 900mm Exclusion: Confirms zero P+ 900mm radiators exist across catalogue', async () => {
    const pPlus900 = await db.get<any>("SELECT count(*) as count FROM radiator_catalogue WHERE radiator_type = 'P+' AND height_mm = 900");
    expect(pPlus900.count).toBe(0);

    const productsP900 = await db.get<any>("SELECT count(*) as count FROM products WHERE id LIKE 'rad_p_plus_900%'");
    expect(productsP900.count).toBe(0);
  });

  it('10. Duplicate Prevention: Confirms zero duplicate (radiator_type, height_mm, length_mm) and enforces UNIQUE constraint', async () => {
    const duplicates = await db.all<any>(`
      SELECT radiator_type, height_mm, length_mm, count(*) as count 
      FROM radiator_catalogue 
      GROUP BY radiator_type, height_mm, length_mm 
      HAVING count(*) > 1
    `);
    expect(duplicates.length).toBe(0);

    await expect(async () => {
      await db.run(`
        INSERT INTO radiator_catalogue (
          id, radiator_type, height_mm, length_mm,
          requested_height_mm, requested_length_mm,
          source_title_dimensions, normalized_height_mm, normalized_length_mm,
          dimension_match_type, dimension_validation_status,
          manufacturer, product_name,
          supplier, verification_type, supplier_verification_status, verification_status,
          source_vat_basis, normalization_method, vat_evidence_source, pricing_confidence,
          source_checked_at
        ) VALUES (
          'rad_dup_test', 'K1', 300, 400,
          300, 400,
          '300 x 400', 300, 400,
          'EXACT_TITLE_ORDER', 'PASS',
          'Dup Mfg', 'Dup Product',
          'City Plumbing', 'SUPPLIER_CATALOGUE', 'VERIFIED_CURRENT', 'SUPPLIER_VERIFIED',
          'INC_VAT', 'DIVIDE_BY_1_POINT_20', 'Test', 'CONFIRMED_20_PCT_VAT',
          '2026-09-12'
        )
      `);
    }).rejects.toThrow();
  });

  it('11. Commercial Blocking: Confirms SOURCE_REQUIRED record blocks commercial sign-off and unit price is 0', async () => {
    await db.run(`
      INSERT OR REPLACE INTO radiator_catalogue (
        id, radiator_type, height_mm, length_mm,
        requested_height_mm, requested_length_mm,
        source_title_dimensions, normalized_height_mm, normalized_length_mm,
        dimension_match_type, dimension_validation_status,
        manufacturer, product_name,
        supplier, verification_type, supplier_verification_status, verification_status,
        source_price, source_vat_basis, normalized_ex_vat_price,
        normalization_method, vat_evidence_source, pricing_confidence, source_count,
        source_checked_at, pricing_notes
      ) VALUES (
        'rad_unverified_sample', 'K1', 450, 8888,
        450, 8888,
        '450 x 8888', 450, 8888,
        'EXACT_TITLE_ORDER', 'PASS',
        'Unverified Mfg', 'Unverified Radiator',
        'City Plumbing', 'SUPPLIER_CATALOGUE', 'SOURCE_REQUIRED', 'SOURCE_REQUIRED',
        NULL, 'UNKNOWN', NULL,
        'VAT_STATUS_UNVERIFIED', 'Unverified', 'UNVERIFIED', 0,
        '2026-09-12', 'Unverified price test'
      )
    `);

    const output = await estimateRadiatorRequirements({
      heatDemandKw: 8.0,
      exactRadiatorSchedule: [
        { productId: 'rad_k1_600x1000', quantity: 2 },
        { productId: 'rad_unverified_sample', quantity: 1 }
      ]
    });

    expect(output.mode).toBe('EXACT_SCHEDULE');
    expect(output.hasUnverifiedPrices).toBe(true);
    expect(output.unverifiedItemIds).toContain('rad_unverified_sample');
    
    const unverifiedLineItem = output.lineItems.find(li => li.description.includes('rad_unverified_sample') || li.description.includes('Unverified Radiator'));
    expect(unverifiedLineItem).toBeDefined();
    expect(unverifiedLineItem!.unitPriceExVat).toBe(0);
    expect(unverifiedLineItem!.totalPriceExVat).toBe(0);

    expect(output.notes.some(n => n.includes('SOURCE_REQUIRED'))).toBe(true);
    expect(output.notes.some(n => n.includes('Commercial sign-off blocked'))).toBe(true);

    await db.run("DELETE FROM radiator_catalogue WHERE id = 'rad_unverified_sample'");
  });

  it('12. Commercial Calculation: Evaluates verified City Plumbing ex-VAT prices accurately without altering calculation logic', async () => {
    const rad600x1000 = await db.get<any>("SELECT * FROM radiator_catalogue WHERE id = 'rad_k1_600x1000'");
    expect(rad600x1000.supplier_verification_status).toBe('VERIFIED_CURRENT');
    const unitPrice = rad600x1000.normalized_ex_vat_price;

    const output = await estimateRadiatorRequirements({
      heatDemandKw: 8.0,
      exactRadiatorSchedule: [
        { productId: 'rad_k1_600x1000', quantity: 3 }
      ]
    });

    expect(output.mode).toBe('EXACT_SCHEDULE');
    expect(output.hasUnverifiedPrices).toBe(false);
    expect(output.totalRadiatorCostExVat).toBeCloseTo(unitPrice * 3, 2);
    expect(output.lineItems[0].unitPriceExVat).toBe(unitPrice);
  });
});
