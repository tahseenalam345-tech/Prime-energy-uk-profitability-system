import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../src/db/connection.js';
import { seedAshpDatabase } from '../src/db/seedAshp.js';
import { selectRecommendedASHP } from '../src/engine/ashpSelector.js';
import { calculateCommercials } from '../src/engine/commercial.js';

describe('Heat Pump Product & Pricing Database Architecture', () => {
  beforeAll(async () => {
    await seedAshpDatabase();
  });

  it('1. Exact model matching: retrieves precise model record by SKU and model code', async () => {
    const daikin = await db.get<any>('SELECT * FROM products WHERE model = ?', ['EPRA08EV3']);
    expect(daikin).toBeDefined();
    expect(daikin.brand).toBe('Daikin');
    expect(daikin.marketing_nominal_kw).toBe(8.0);
    expect(daikin.rated_output_kw).toBe(7.6);
    expect(daikin.refrigerant).toBe('R32');

    const vaillant = await db.get<any>('SELECT * FROM products WHERE model = ?', ['aroTHERM Plus VWL 75/6 A']);
    expect(vaillant).toBeDefined();
    expect(vaillant.brand).toBe('Vaillant');
    expect(vaillant.product_family).toBe('aroTHERM Plus');
    expect(vaillant.refrigerant).toBe('R290');
  });

  it('2. Duplicate model prevention: unique primary key prevents duplicate models on re-seed', async () => {
    const initial = await db.get<any>("SELECT COUNT(*) as c FROM products WHERE family = 'ASHP'");
    const initialCount = initial.c;
    await seedAshpDatabase();
    const finalRes = await db.get<any>("SELECT COUNT(*) as c FROM products WHERE family = 'ASHP'");
    expect(finalRes.c).toBe(initialCount);
  }, 20000);

  it('3. Capacity variant hierarchy: separate records exist for distinct capacities within same family', async () => {
    const baxiVariants = await db.all<any>(`
      SELECT marketing_nominal_kw, rated_output_kw, model 
      FROM products 
      WHERE brand = 'Baxi' AND product_family = 'HP40 Monobloc'
      ORDER BY marketing_nominal_kw ASC
    `);

    expect(baxiVariants.length).toBeGreaterThanOrEqual(5);
    const capacities = baxiVariants.map(v => v.marketing_nominal_kw);
    expect(capacities).toContain(4);
    expect(capacities).toContain(5);
    expect(capacities).toContain(8);
    expect(capacities).toContain(11);
    expect(capacities).toContain(13);

    const models = new Set(baxiVariants.map(v => v.model));
    expect(models.size).toBe(baxiVariants.length);
  });

  it('4. Multi-price source separation: supports City Plumbing and secondary trade suppliers without clashing', async () => {
    const mitsubishi = await db.get<any>('SELECT id FROM products WHERE model = ?', ['PUZ-WZ50VAA']);
    expect(mitsubishi).toBeDefined();

    const prices = await db.all<any>('SELECT * FROM product_prices WHERE product_id = ?', [mitsubishi.id]);
    expect(prices.length).toBeGreaterThanOrEqual(2);

    const cpPrice = prices.find(p => p.source_type === 'CITY_PLUMBING');
    const tradePrice = prices.find(p => p.source_type === 'UK_SUPPLIER');

    expect(cpPrice).toBeDefined();
    expect(tradePrice).toBeDefined();
    expect(cpPrice.price_ex_vat).toBe(1986.00);
    expect(tradePrice.supplier).toBe('Plumbase');
    expect(tradePrice.price_ex_vat).toBe(2050.00);
  });

  it('5. MCS model-specific verification: checks exact MCS product reference and status', async () => {
    const grant = await db.get<any>('SELECT * FROM products WHERE model LIKE ?', ['%Aerona 290 4kW%']);
    expect(grant).toBeDefined();
    expect(grant.mcs_status).toBe('MCS_CERTIFIED');
    expect(grant.mcs_product_reference).toBe('MCS HP0008/41');
    expect(grant.mcs_directory_url).toContain('mcscertified.com');
  });

  it('6. Ofgem BUS PEL status verification: stores PEL listed status and BUS verification', async () => {
    const ideal = await db.get<any>('SELECT * FROM products WHERE model LIKE ?', ['%HP290 8 kW%']);
    expect(ideal).toBeDefined();
    expect(ideal.ofgem_pel_status).toBe('PEL_LISTED');
    expect(ideal.bus_product_eligibility_status).toBe('VERIFIED');
  });

  it('7. Manual review flagging: non-space-heating products (Becker & Wolf DHW) are flagged MANUAL_REVIEW', async () => {
    const becker = await db.get<any>('SELECT * FROM products WHERE brand = ?', ['Becker & Wolf']);
    expect(becker).toBeDefined();
    expect(becker.manual_review_required).toBe(1);
    expect(becker.bus_product_eligibility_status).toBe('NOT_ELIGIBLE');
    expect(becker.product_type).toContain('Cylinder');
  });

  it('8. Missing price handling: unexposed retailer prices remain NULL with confidence PRICE_REQUIRED', async () => {
    const unpriced = await db.all<any>(`
      SELECT p.id, p.model, pr.price_ex_vat, pr.confidence 
      FROM products p 
      JOIN product_prices pr ON p.id = pr.product_id 
      WHERE pr.source_type = 'CITY_PLUMBING' AND pr.price_ex_vat IS NULL
    `);

    expect(unpriced.length).toBeGreaterThan(0);
    for (const record of unpriced) {
      expect(record.price_ex_vat).toBeNull();
      expect(record.confidence).toBe('PRICE_REQUIRED');
    }
  });

  it('9. Missing rated output handling: units lacking design-condition output cannot be auto-selected', async () => {
    await db.run(`
      INSERT INTO products (
        id, family, brand, manufacturer, model, marketing_nominal_kw,
        rated_output_kw, active, mcs_status, bus_product_eligibility_status
      ) VALUES ('dummy_unrated', 'ASHP', 'Generic', 'Generic Mfr', 'Generic 10kW', 10.0, NULL, 1, 'MCS_CERTIFIED', 'VERIFIED')
      ON CONFLICT(id) DO UPDATE SET rated_output_kw = NULL
    `);

    const selection = await selectRecommendedASHP(5.0);
    expect(selection.recommendedProduct?.id).not.toBe('dummy_unrated');
    expect(selection.alternatives.some(a => a.id === 'dummy_unrated')).toBe(false);

    await db.run("DELETE FROM products WHERE id = 'dummy_unrated'");
  });

  it('10. Model recommendation based on actual rated output at design condition (not marketing name)', async () => {
    const selection = await selectRecommendedASHP(7.2);
    expect(selection.status).toBe('OPTIMAL_MATCH');
    expect(selection.recommendedProduct).toBeDefined();
    expect(selection.recommendedProduct!.ratedOutputAtDesign).toBeGreaterThanOrEqual(7.2);
    expect(selection.recommendedProduct!.ratedOutputAtDesign).not.toBeLessThan(7.2);
  });

  it('11. Unverified / manual review models are never auto-selected by recommendation engine', async () => {
    const selection = await selectRecommendedASHP(1.5);
    expect(selection.recommendedProduct?.brand).not.toBe('Becker & Wolf');
    expect(selection.alternatives.some(a => a.brand === 'Becker & Wolf')).toBe(false);
  });

  it('12. Price changes preserve historical records instead of overwriting', async () => {
    const productId = 'ashp_baxi_hp40_04';
    const oldPrices = await db.all<any>('SELECT * FROM product_prices WHERE product_id = ?', [productId]);
    const initialPriceCount = oldPrices.length;

    const newPriceId = `price_${productId}_test_${Date.now()}`;
    await db.run('UPDATE product_prices SET is_current = 0 WHERE product_id = ?', [productId]);
    await db.run(`
      INSERT INTO product_prices (
        id, product_id, supplier, source_type, price_ex_vat, price_inc_vat, is_current, confidence, date_collected
      ) VALUES (?, ?, 'City Plumbing', 'CITY_PLUMBING', 2399.00, 2878.80, 1, 'MARKET_CONFIRMED', '2026-09-12')
    `, [newPriceId, productId]);

    const updatedPrices = await db.all<any>('SELECT * FROM product_prices WHERE product_id = ?', [productId]);
    expect(updatedPrices.length).toBe(initialPriceCount + 1);

    const currentPrice = await db.get<any>('SELECT * FROM product_prices WHERE product_id = ? AND is_current = 1', [productId]);
    expect(currentPrice.price_ex_vat).toBe(2399.00);

    const historicalPrice = await db.all<any>('SELECT * FROM product_prices WHERE product_id = ? AND is_current = 0', [productId]);
    expect(historicalPrice.length).toBeGreaterThanOrEqual(1);

    await db.run('DELETE FROM product_prices WHERE id = ?', [newPriceId]);
    await db.run('UPDATE product_prices SET is_current = 1 WHERE id = ?', [oldPrices[0].id]);
  });

  it('13. Commercial true-margin formula integrity: City Plumbing market reference prices do not distort target margins', async () => {
    const equipmentCost = 3000.00;
    const totalJobCost = equipmentCost + 1500.00 + 300.00 + 200.00;
    const targetMargin = 0.25;
    const grant = 7500.00;

    const calculation = calculateCommercials({
      totalJobCost,
      targetGrossMargin: targetMargin,
      busGrant: grant
    });

    expect(calculation.requiredRevenue).toBeCloseTo(6666.67, 2);
    expect(calculation.customerContribution).toBe(0.00);
    expect(calculation.actualRevenue).toBe(7500.00);
    expect(calculation.grossProfit).toBe(2500.00);
    expect(calculation.grossMarginPercent).toBeCloseTo(33.33, 1);
  });
});
