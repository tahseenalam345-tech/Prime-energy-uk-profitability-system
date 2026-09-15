import { describe, it, expect, beforeAll } from 'vitest';
import { db, initDatabase } from '../src/db/connection.js';
import { seedMasterProductCatalog } from '../src/db/masterCatalogSeed.js';
import { selectRecommendedASHP } from '../src/engine/ashpSelector.js';

describe('Authoritative Master Product Catalogue & Sizing Verification Suite', () => {
  beforeAll(async () => {
    await initDatabase();
    await seedMasterProductCatalog();
  }, 60000);

  describe('1. ASHP Separate Explicit Fields & Sizing Integrity', () => {
    it('stores marketing capacity and verified rated output as separate explicit fields', async () => {
      const ideal8kW = await db.get<any>(`
        SELECT brand, model, sku, marketing_nominal_kw, rated_output_kw, rated_output_condition,
               flow_temperature, phase, mcs_status, mcs_product_reference, supplier,
               price_ex_vat, price_inc_vat
        FROM products
        WHERE sku = '241488' AND family = 'ASHP'
      `);

      expect(ideal8kW).toBeDefined();
      expect(ideal8kW.brand).toBe('Ideal Heating');
      expect(ideal8kW.marketing_nominal_kw).toBe(8.0);
      expect(ideal8kW.rated_output_kw).toBe(7.2);
      expect(ideal8kW.rated_output_condition).toBeDefined();
      expect(ideal8kW.phase).toBe(1);
      expect(ideal8kW.mcs_status).toBe('MCS_CERTIFIED');
      expect(ideal8kW.price_ex_vat).toBeGreaterThan(0);
      expect(ideal8kW.price_inc_vat).toBeGreaterThan(ideal8kW.price_ex_vat);
    });

    it('quotation engine reliably selects models where rated_output_kw >= 7.2 kW', async () => {
      const result = await selectRecommendedASHP(7.2);
      expect(result.status).toBe('OPTIMAL_MATCH');
      expect(result.recommendedProduct).not.toBeNull();
      expect(result.recommendedProduct!.ratedOutputAtDesign).toBeGreaterThanOrEqual(7.2);
    });

    it('Viessmann models have marketing nominal kW separated from actual tested rated output and flagged CONFLICT_REVIEW', async () => {
      const viessmann10 = await db.get<any>(`
        SELECT brand, model, sku, marketing_nominal_kw, rated_output_kw, verification_status, conflict_notes
        FROM products
        WHERE sku = 'Z023212'
      `);

      expect(viessmann10).toBeDefined();
      expect(viessmann10.marketing_nominal_kw).toBe(10.0);
      expect(viessmann10.rated_output_kw).toBe(7.3);
      expect(viessmann10.verification_status).toBe('CONFLICT_REVIEW');
      expect(viessmann10.conflict_notes).toContain('CRITICAL SIZING DISCREPANCY');
    });
  });

  describe('2. Gap Fixes: Ecogenica & Trianco & Gledhill', () => {
    it('Ecogenica: Outback models (5kW, 8kW, 11kW, 16kW) are verified, 3kW placeholder is removed', async () => {
      const ecogenica5 = await db.get<any>(`
        SELECT brand, model, sku, marketing_nominal_kw, rated_output_kw, mcs_status, mcs_certificate_number,
               manufacturer_product_url, verification_status, active
        FROM products
        WHERE sku = 'ECO-ZR02FC'
      `);

      expect(ecogenica5).toBeDefined();
      expect(ecogenica5.rated_output_kw).toBe(5.0);
      expect(ecogenica5.mcs_status).toBe('MCS_CERTIFIED');
      expect(ecogenica5.mcs_certificate_number).toBe('ECO-ZR02FC');
      expect(ecogenica5.manufacturer_product_url).toBe('https://ecogenica.co.uk/product');
      expect(ecogenica5.verification_status).toBe('VERIFIED');
      expect(ecogenica5.active).toBe(1);

      const ecogenica8 = await db.get<any>(`SELECT * FROM products WHERE sku = 'ECO-ZR03FC'`);
      expect(ecogenica8).toBeDefined();
      expect(ecogenica8.rated_output_kw).toBe(8.0);

      const ecogenica11 = await db.get<any>(`SELECT * FROM products WHERE sku = 'ECO-ZR04FC'`);
      expect(ecogenica11).toBeDefined();
      expect(ecogenica11.rated_output_kw).toBe(11.0);

      const ecogenica16 = await db.get<any>(`SELECT * FROM products WHERE sku = 'ECO-ZR06FC'`);
      expect(ecogenica16).toBeDefined();
      expect(ecogenica16.rated_output_kw).toBe(16.0);

      const ecogenica3 = await db.get<any>(`
        SELECT brand, model, sku, active, verification_status
        FROM products
        WHERE sku = 'ECO-3KW-UK'
      `);

      if (ecogenica3) {
        expect(ecogenica3.active).toBe(0);
      }
    });

    it('Trianco Activair: complete verified current range exists (Pro 6/12/17kW, HT 5/9/15/22kW, indoor 3.2/5kW)', async () => {
      const pro6 = await db.get<any>(`SELECT * FROM products WHERE sku = 'TR-ACT-PRO-6'`);
      expect(pro6).toBeDefined();
      expect(pro6.mcs_certificate_number).toBe('HP0289/05');
      expect(pro6.manufacturer_product_url).toBe('https://trianco.co.uk/product/Activair-Pro');

      const outdoor9kW = await db.get<any>(`SELECT * FROM products WHERE sku = '9509'`);
      expect(outdoor9kW).toBeDefined();
      expect(outdoor9kW.brand).toBe('Trianco');
      expect(outdoor9kW.rated_output_kw).toBe(8.9);
      expect(outdoor9kW.refrigerant).toBe('R290');
      expect(outdoor9kW.technical_manual_url).toBe('https://www.scribd.com/document/752420718/Activair-High-Temp-Manual');
      expect(outdoor9kW.price_ex_vat).toBe(2550.00);

      const outdoor5kW = await db.get<any>(`SELECT * FROM products WHERE sku = '9505' AND product_family = 'Activair R290 HT'`);
      expect(outdoor5kW).toBeDefined();
      expect(outdoor5kW.price_ex_vat).toBe(2079.25);

      const indoor3kW = await db.get<any>(`SELECT * FROM products WHERE sku = '9503'`);
      expect(indoor3kW).toBeDefined();
      expect(indoor3kW.rated_output_kw).toBe(3.2);
      expect(indoor3kW.price_ex_vat).toBe(2412.50);

      const indoor5kW = await db.get<any>(`SELECT * FROM products WHERE sku = '9505-INDOOR'`);
      expect(indoor5kW).toBeDefined();
      expect(indoor5kW.rated_output_kw).toBe(5.0);
      expect(indoor5kW.price_ex_vat).toBe(2825.00);
    });

    it('Gledhill: StainlessLite Plus HP Pre-Plumbed 150L, 180L, 210L have official manual URLs and verified status', async () => {
      const plus150 = await db.get<any>(`SELECT * FROM products WHERE sku = 'PLUHP150'`);
      expect(plus150).toBeDefined();
      expect(plus150.exact_capacity_litres).toBe(150);
      expect(plus150.technical_manual_url).toBe('https://www.gledhill.net/download/stainless-es-manual/');
      expect(plus150.manufacturer_product_url).toContain('stainlesslite-plus-heat-pump-pre-plumbed');

      const plus180 = await db.get<any>(`SELECT * FROM products WHERE sku = 'PLUHP180'`);
      expect(plus180).toBeDefined();
      expect(plus180.exact_capacity_litres).toBe(180);

      const plus210 = await db.get<any>(`SELECT * FROM products WHERE sku = 'PLUHP210'`);
      expect(plus210).toBeDefined();
      expect(plus210.exact_capacity_litres).toBe(210);
      expect(plus210.coil_area_m2).toBe(3.5);
    });
  });

  describe('3. Radiators & Installation Accessories', () => {
    it('Radiators store exact dimensions, ΔT50 output, and low-temperature ΔT outputs', async () => {
      const k2_1000 = await db.get<any>(`SELECT * FROM products WHERE sku = '143788'`);
      expect(k2_1000).toBeDefined();
      expect(k2_1000.radiator_type).toBe('K2');
      expect(k2_1000.height_mm).toBe(600);
      expect(k2_1000.length_mm).toBe(1000);
      expect(k2_1000.output_w_delta_t50).toBe(1882);
      expect(k2_1000.output_w_low_temp).toBe(941);
      expect(k2_1000.price_ex_vat).toBe(155.46);
    });

    it('Pipework and accessories are structured with explicit dimensions and verified supplier prices', async () => {
      const uponor = await db.get<any>(`SELECT * FROM products WHERE sku = 'ECOFLEX-32'`);
      expect(uponor).toBeDefined();
      expect(uponor.diameter_mm).toBe(32);
      expect(uponor.price_ex_vat).toBe(34.04);
      expect(uponor.supplier).toBe('Plumbingsupplies24');

      const fernox = await db.get<any>(`SELECT * FROM products WHERE sku = '58501'`);
      expect(fernox).toBeDefined();
      expect(fernox.family).toBe('ACCESSORIES');
      expect(fernox.price_ex_vat).toBe(89.57);
      expect(fernox.supplier).toBe('Mr Central Heating');
    });

    it('Preserves multiple supplier prices in product_prices table', async () => {
      const vaillantPrices = await db.all<any>(`
        SELECT supplier, price_ex_vat, source_url
        FROM product_prices
        WHERE product_id = 'ashp_vaillant_arotherm_plus_5'
      `);

      expect(vaillantPrices.length).toBeGreaterThanOrEqual(2);
      const suppliers = vaillantPrices.map(p => p.supplier);
      expect(suppliers).toContain('MWPHS');
      expect(suppliers).toContain('City Plumbing');
    });
  });

  describe('4. Radiator Filtering Capabilities (Type, Height, Length)', () => {
    it('filters radiators by type = K1, height = 500, length = 600 returning only matching records', async () => {
      const results = await db.all<any>(`
        SELECT id, model, radiator_type, height_mm, length_mm, output_w_delta_t50, price_ex_vat
        FROM products
        WHERE family = 'RADIATOR' 
          AND active = 1
          AND radiator_type = 'K1'
          AND height_mm = 500
          AND length_mm = 600
      `);

      expect(results.length).toBeGreaterThanOrEqual(1);
      for (const r of results) {
        expect(r.radiator_type).toBe('K1');
        expect(r.height_mm).toBe(500);
        expect(r.length_mm).toBe(600);
        expect(r.output_w_delta_t50).toBeGreaterThan(0);
      }
    });

    it('filters radiators by type = K1, height = 600, length = 600 returning only matching records', async () => {
      const results = await db.all<any>(`
        SELECT id, model, radiator_type, height_mm, length_mm, output_w_delta_t50, price_ex_vat
        FROM products
        WHERE family = 'RADIATOR' 
          AND active = 1
          AND radiator_type = 'K1'
          AND height_mm = 600
          AND length_mm = 600
      `);

      expect(results.length).toBeGreaterThanOrEqual(1);
      for (const r of results) {
        expect(r.radiator_type).toBe('K1');
        expect(r.height_mm).toBe(600);
        expect(r.length_mm).toBe(600);
      }
    });

    it('supports standard heights across radiator catalog', async () => {
      const rows = await db.all<any>(`
        SELECT DISTINCT height_mm 
        FROM radiator_catalogue 
        WHERE active = 1 AND height_mm IS NOT NULL 
        ORDER BY height_mm ASC
      `);
      const heights = rows.map(r => r.height_mm);

      expect(heights.length).toBeGreaterThanOrEqual(4);
      expect(heights).toContain(300);
      expect(heights).toContain(600);
    });
  });

  describe('5. ERH (Electric Room Heaters / Panel Heaters) Master Catalogue', () => {
    it('seeds all 29 ERH models with separate explicit fields for Watts, kW, dimensions, and supplier prices', async () => {
      const erhProducts = await db.all<any>(`
        SELECT id, brand, model, sku, rated_output_kw, output_w_delta_t50,
               height_mm, diameter_mm, depth_mm, electrical_requirements,
               supplier, price_ex_vat, price_inc_vat, verification_status
        FROM products
        WHERE family = 'ERH' AND active = 1
        ORDER BY brand ASC, rated_output_kw ASC
      `);

      expect(erhProducts.length).toBeGreaterThanOrEqual(29);

      const adax400 = erhProducts.find(p => p.sku === 'NCH04KWT');
      expect(adax400).toBeDefined();
      expect(adax400.brand).toBe('Adax');
      expect(adax400.rated_output_kw).toBe(0.4);
      expect(adax400.output_w_delta_t50).toBe(400);
      expect(adax400.height_mm).toBe(370);
      expect(adax400.diameter_mm).toBe(474);
      expect(adax400.depth_mm).toBe(90);
      expect(adax400.price_ex_vat).toBe(115.83);
      expect(adax400.price_inc_vat).toBe(139.00);
      expect(adax400.supplier).toBe('Quality Heating');

      const dimplexPLX050 = erhProducts.find(p => p.model === 'PLX050E');
      expect(dimplexPLX050).toBeDefined();
      expect(dimplexPLX050.brand).toBe('Dimplex');
      expect(dimplexPLX050.rated_output_kw).toBe(0.5);
      expect(dimplexPLX050.output_w_delta_t50).toBe(500);
      expect(dimplexPLX050.price_ex_vat).toBe(133.32);
      expect(dimplexPLX050.price_inc_vat).toBe(159.98);

      const stiebel500 = erhProducts.find(p => p.sku === '205867');
      expect(stiebel500).toBeDefined();
      expect(stiebel500.brand).toBe('Stiebel Eltron');
      expect(stiebel500.rated_output_kw).toBe(0.5);
      expect(stiebel500.price_ex_vat).toBe(92.25);
      expect(stiebel500.supplier).toBe('Alert Electrical');

      const haverland1000 = erhProducts.find(p => p.model.includes('iSense 1000W'));
      expect(haverland1000).toBeDefined();
      expect(haverland1000.rated_output_kw).toBe(1.0);
      expect(haverland1000.price_ex_vat).toBe(152.08);

      const blyss2kw = erhProducts.find(p => p.id === 'erh_blyss_ndk20_24af');
      expect(blyss2kw).toBeDefined();
      expect(blyss2kw.price_ex_vat).toBe(24.96);
      expect(blyss2kw.price_inc_vat).toBe(29.95);
      expect(blyss2kw.supplier).toBe('Screwfix');

      const manrose = erhProducts.find(p => p.sku === '5200BTU');
      expect(manrose).toBeDefined();
      expect(manrose.rated_output_kw).toBe(1.5);
      expect(manrose.output_w_delta_t50).toBe(1500);
      expect(manrose.price_ex_vat).toBe(52.08);
    });
  });

  describe('6. Fan Heaters Master Catalogue & Multi-Supplier Pricing', () => {
    it('seeds all Fan Heater models with multi-supplier records and industrial phase specs', async () => {
      const fanProducts = await db.all<any>(`
        SELECT id, brand, model, sku, rated_output_kw, output_w_delta_t50,
               phase, supplier, price_ex_vat, price_inc_vat, verification_status,
               manual_review_required
        FROM products
        WHERE family = 'FAN_HEATER' AND active = 1
      `);

      expect(fanProducts.length).toBeGreaterThanOrEqual(19);

      const dxff20 = fanProducts.find(p => p.id === 'fan_dimplex_dxff20tsn');
      expect(dxff20).toBeDefined();
      expect(dxff20.rated_output_kw).toBe(2.0);

      const dxff20Prices = await db.all<any>(`
        SELECT supplier, price_ex_vat, price_inc_vat
        FROM product_prices
        WHERE product_id = 'fan_dimplex_dxff20tsn'
        ORDER BY price_ex_vat ASC
      `);

      expect(dxff20Prices.length).toBe(2);
      expect(dxff20Prices[0].supplier).toBe('RS Components');
      expect(dxff20Prices[0].price_ex_vat).toBe(30.93);
      expect(dxff20Prices[1].supplier).toBe('Plumb Nation');
      expect(dxff20Prices[1].price_ex_vat).toBe(33.33);

      const dxff30Prices = await db.all<any>(`
        SELECT supplier, price_ex_vat, price_inc_vat
        FROM product_prices
        WHERE product_id = 'fan_dimplex_dxff30tsn'
        ORDER BY price_ex_vat ASC
      `);

      expect(dxff30Prices.length).toBe(2);
      expect(dxff30Prices[0].supplier).toBe('RS Components');
      expect(dxff30Prices[0].price_ex_vat).toBe(40.69);
      expect(dxff30Prices[1].supplier).toBe('Plumb Nation');
      expect(dxff30Prices[1].price_ex_vat).toBe(41.67);

      const rspro9kw = fanProducts.find(p => p.sku === '174-6571');
      expect(rspro9kw).toBeDefined();
      expect(rspro9kw.rated_output_kw).toBe(9.0);
      expect(rspro9kw.phase).toBe(3);
      expect(rspro9kw.price_ex_vat).toBe(208.97);

      const consortLST = fanProducts.find(p => p.sku === 'CSL1LST');
      expect(consortLST).toBeDefined();
      expect(consortLST.rated_output_kw).toBe(1.0);
      expect(consortLST.price_ex_vat).toBe(151.04);
      expect(consortLST.supplier).toBe('National Heater Shops');

      const caspian = fanProducts.find(p => p.sku === 'CASPIAN-4KW');
      expect(caspian).toBeDefined();
      expect(caspian.rated_output_kw).toBe(4.0);
      expect(caspian.price_ex_vat).toBe(387.49);

      const warmiplan = fanProducts.find(p => p.id === 'fan_warmiplan_wh20');
      expect(warmiplan).toBeDefined();
      expect(warmiplan.verification_status).toBe('NOT_FOUND');
      expect(warmiplan.manual_review_required).toBe(1);
      expect(warmiplan.price_ex_vat).toBeNull();
    });
  });
});
