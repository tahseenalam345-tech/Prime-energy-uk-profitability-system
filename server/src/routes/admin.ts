import { Router, Response } from 'express';
import { db } from '../db/connection.js';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth.js';

export const adminRouter = Router();

// Require authentication for all admin endpoints
adminRouter.use(authenticateToken);

function safeErrorResponse(res: Response, err: any, defaultMsg: string) {
  console.error(`[Admin Router Error]:`, err);
  const msg = process.env.NODE_ENV === 'production' ? defaultMsg : (err.message || defaultMsg);
  res.status(500).json({ error: msg });
}

// GET Commercial Settings
adminRouter.get('/commercial-settings', requireRole('ADMIN', 'ESTIMATOR', 'SALES', 'SURVEYOR', 'READ_ONLY'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = await db.get('SELECT * FROM commercial_settings ORDER BY version DESC LIMIT 1');
    res.json({ settings });
  } catch (err: any) {
    safeErrorResponse(res, err, 'Failed to fetch commercial settings');
  }
});

// UPDATE Commercial Settings (creates new version, writes audit log)
adminRouter.post('/commercial-settings', requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      targetGrossMargin,
      labourBaseline,
      leadGenerationCost,
      extrasContingency,
      combiConversionAllowance,
      microboreRepipeAllowance,
      notes,
      userId = 'user_admin'
    } = req.body;

    const current = await db.get('SELECT * FROM commercial_settings ORDER BY version DESC LIMIT 1') as any;
    const newVersion = (current?.version || 0) + 1;
    const newId = `settings_v${newVersion}`;

    await db.batch([
      { sql: 'UPDATE commercial_settings SET active = 0' },
      {
        sql: `
          INSERT INTO commercial_settings (
            id, version, target_gross_margin, labour_baseline, lead_generation_cost,
            extras_contingency, combi_conversion_allowance, combi_conversion_status,
            microbore_repipe_allowance, microbore_repipe_status, active, updated_by, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        `,
        args: [
          newId,
          newVersion,
          targetGrossMargin ?? current.target_gross_margin,
          labourBaseline ?? current.labour_baseline,
          leadGenerationCost ?? current.lead_generation_cost,
          extrasContingency ?? current.extras_contingency,
          combiConversionAllowance ?? current.combi_conversion_allowance,
          'CONFIRMED',
          microboreRepipeAllowance ?? current.microbore_repipe_allowance,
          'CONFIRMED',
          userId,
          notes || `Updated commercial settings to v${newVersion}`
        ]
      },
      {
        sql: `
          INSERT INTO audit_logs (id, user_id, entity_type, entity_id, action, old_values, new_values, reason)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          `audit_${Date.now()}`,
          userId,
          'COMMERCIAL_SETTINGS',
          newId,
          'UPDATE',
          JSON.stringify(current),
          JSON.stringify(req.body),
          notes || 'Commercial settings updated by Admin'
        ]
      }
    ], 'write');

    const updated = await db.get('SELECT * FROM commercial_settings WHERE id = ?', [newId]);
    res.json({ success: true, settings: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update commercial settings' });
  }
});

// GET Research & Catalog Summary (Requirements 23.A - 23.J + Master Audit Report)
adminRouter.get('/products/stats/summary', async (req: Request, res: Response) => {
  try {
    const brandsResearchedRows = await db.all(`
      SELECT DISTINCT COALESCE(brand, manufacturer) as brand 
      FROM products 
      WHERE family = 'ASHP' AND active = 1
    `);
    const brandsResearched = brandsResearchedRows.map((r: any) => r.brand);

    const totalAshpProducts = await db.get(`
      SELECT COUNT(*) as count FROM products WHERE family = 'ASHP' AND active = 1
    `) as { count: number };

    const capacityVariants = await db.get(`
      SELECT COUNT(DISTINCT COALESCE(marketing_nominal_kw, nominal_capacity)) as count 
      FROM products 
      WHERE family = 'ASHP' AND active = 1 AND COALESCE(marketing_nominal_kw, nominal_capacity) IS NOT NULL
    `) as { count: number };

    const mcsCertified = await db.get(`
      SELECT COUNT(*) as count FROM products 
      WHERE family = 'ASHP' AND active = 1 AND mcs_status = 'MCS_CERTIFIED'
    `) as { count: number };

    const ashpVerifiedRatedOutput = await db.get(`
      SELECT COUNT(*) as count FROM products 
      WHERE family = 'ASHP' AND active = 1 AND rated_output_kw IS NOT NULL AND rated_output_kw > 0
    `) as { count: number };

    const ofgemPelListed = await db.get(`
      SELECT COUNT(*) as count FROM products 
      WHERE family = 'ASHP' AND active = 1 AND ofgem_pel_status = 'PEL_LISTED'
    `) as { count: number };

    const manualReviewRequired = await db.get(`
      SELECT COUNT(*) as count FROM products 
      WHERE active = 1 AND (manual_review_required = 1 OR verification_status IN ('CONFLICT_REVIEW', 'UNVERIFIED', 'NOT_FOUND'))
    `) as { count: number };

    const withCurrentPrice = await db.get(`
      SELECT COUNT(DISTINCT product_id) as count 
      FROM product_prices 
      WHERE price_ex_vat IS NOT NULL AND price_ex_vat > 0
    `) as { count: number };

    const totalActiveProducts = await db.get(`
      SELECT COUNT(*) as count FROM products WHERE active = 1
    `) as { count: number };

    const catRows = await db.all(`
      SELECT family, COUNT(*) as count FROM products WHERE active = 1 GROUP BY family
    `) as Array<{ family: string; count: number }>;
    const categoryBreakdown: Record<string, number> = {};
    for (const c of catRows) categoryBreakdown[c.family] = c.count;

    // Discrepancy & Exclusion logs
    const namingDiscrepancies = [
      {
        brand: 'Viessmann',
        retailerName: 'Vitocal 150-A Type 06 / 10 / 13 / 16',
        mcsDirectoryName: 'Vitocal 150-A / 151-A (AWO-E-AC 151.A06 / A10 / A13 / A16)',
        notes: 'CRITICAL AUDIT: Marketing model name (4/6/10/13/16kW) does not equal actual rated heating output (4.0/4.8/7.3/8.1/9.1kW). Sizing engine strictly queries certified rated output.'
      },
      {
        brand: 'Grant',
        retailerName: 'Grant Aerona 290 4kW / 6.5kW / 9kW / 12kW (HPR2904, HPR29065, HPR2909, HPR29012)',
        mcsDirectoryName: 'Grant Aerona 290 4kW, 6.5kW, 9kW, 12kW (MCS HP0008/41 to /44)',
        notes: 'Retailer catalog uses internal part codes HPR290x. Verified exact match against Grant MCS certificate HP0008.'
      },
      {
        brand: 'Daikin',
        retailerName: 'Daikin UK.EDLA04EV/BLYGD Low Temp Monobloc 4kW Blygold',
        mcsDirectoryName: 'Daikin Altherma 3 M EDLA04EV3 (MCS HP0006/42)',
        notes: 'City Plumbing distributes Blygold anti-corrosion treated coastal version with suffix /BLYGD. Base heat pump engine is EDLA04EV3.'
      },
      {
        brand: 'Mitsubishi Electric',
        retailerName: 'Mitsubishi Ecodan PUZ-W85VHA2R5-BS 8.5kW Coastal Unit Only',
        mcsDirectoryName: 'Ecodan PUZ-WM85VAA (MCS HP0003/61)',
        notes: 'Retailer lists coastal factory treated chassis with -BS suffix and VHA chassis revision. Sizing and BUS eligibility verified under PUZ-WM85VAA.'
      },
      {
        brand: 'Ecogenica',
        retailerName: 'Ecogenica Outback 5kW ECO-ZR02FC',
        mcsDirectoryName: 'Ecogenica ECO-ZR02FC (MCS-ECO-ZR02FC)',
        notes: 'Outback 5kW is verified with MCS. 3kW model does not exist in UK central heating trade market and is marked NOT FOUND.'
      }
    ];

    const excludedProducts = [
      {
        product: 'Becker & Wolf BWHP080WM290 / BWHP100WM290 / BWHP300R290',
        brand: 'Becker & Wolf',
        retailerUrl: 'https://www.cityplumbing.co.uk/p/becker-wolf-floor-standing-300l-hot-water-heat-pump-r290-bwhp300r290/p/219502',
        reason: 'Exhaust-air domestic hot water storage cylinder heat pump. Excluded from space-heating air-to-water ASHP sizing. Flagged MANUAL_REVIEW.'
      },
      {
        product: 'Vaillant Flexotherm Ground Source Heat Pumps (0020257362, 0020257361)',
        brand: 'Vaillant',
        retailerUrl: 'https://www.cityplumbing.co.uk/p/vaillant-flexotherm-19kw-400v-ground-source-heat-pump-0020257362/p/521363',
        reason: 'Ground-source heat pump equipment. Excluded from domestic air-to-water ASHP catalog.'
      },
      {
        product: 'Ecogenica 3kW Model (ECO-3KW-UK)',
        brand: 'Ecogenica',
        retailerUrl: 'https://ecogenica.co.uk',
        reason: 'DOES NOT EXIST: Confirmed fake/placeholder. Removed from product database per 14 Sep 2026 verification audit.'
      },
      {
        product: 'Gledhill StainlessLite HP Slimline 180L & Non-Plus 210L (PLUHPS180, PLUHP210)',
        brand: 'Gledhill',
        retailerUrl: 'https://www.gledhill.net',
        reason: 'Unverified / unconfirmed capacity & discontinued product lines removed per 14 Sep 2026 verification audit.'
      }
    ];

    res.json({
      summary: {
        totalActiveProducts: totalActiveProducts.count,
        brandsResearchedCount: brandsResearched.length,
        brandsList: brandsResearched,
        totalAshpProducts: totalAshpProducts.count,
        distinctCapacityVariantsCount: capacityVariants.count,
        mcsCertifiedCount: mcsCertified.count,
        ashpModelsWithVerifiedRatedOutput: ashpVerifiedRatedOutput.count,
        ashpModelsWithVerifiedMcs: mcsCertified.count,
        productsWithVerifiedCurrentPrice: withCurrentPrice.count,
        ofgemPelListedCount: ofgemPelListed.count,
        manualReviewRequiredCount: manualReviewRequired.count,
        categoryBreakdown
      },
      namingDiscrepancies,
      excludedProducts
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch summary' });
  }
});

// GET Products catalog with rich technical specifications & current pricing
adminRouter.get('/products', async (req: Request, res: Response) => {
  try {
    const {
      family, brand, mcs_status, ofgem_pel_status, verification_status, search,
      radiator_type, height_mm, length_mm,
      min_kw, max_kw, kw_rating,
      min_litres, max_litres, litres,
      min_watts, max_watts, watts,
      pipe_size_mm, accessory_type
    } = req.query;

    let query = `
      SELECT 
        p.id, p.family, COALESCE(p.brand, p.manufacturer) as brand, p.manufacturer,
        p.product_family, p.model, p.sku, p.category, p.product_type, p.system_type,
        COALESCE(p.marketing_nominal_kw, p.nominal_capacity) as nominal_capacity,
        COALESCE(p.marketing_nominal_kw, p.nominal_capacity) as marketing_nominal_kw,
        COALESCE(p.rated_output_kw, p.rated_output_at_design) as rated_output_at_design,
        COALESCE(p.rated_output_kw, p.rated_output_at_design) as rated_output_kw,
        COALESCE(p.rated_output_condition, p.design_condition, '-2°C / 45°C flow') as design_condition,
        p.design_temperature, p.flow_temperature, p.capacity_source, p.capacity_source_url,
        p.refrigerant, p.phase, p.electrical_requirements, p.specifications, p.product_source,
        p.source_date, p.mcs_status, p.mcs_product_name, p.mcs_manufacturer, p.mcs_product_reference,
        p.mcs_directory_url, p.mcs_verification_date, p.mcs_standard_version, p.mcs_notes,
        p.ofgem_pel_status, p.ofgem_pel_version, p.ofgem_source_url, p.bus_product_eligibility_status,
        p.data_confidence, p.manual_review_required, p.verification_status, p.conflict_notes,
        p.manufacturer_url, p.technical_datasheet_url,
        p.manufacturer_product_url, p.technical_manual_url, p.brochure_url,
        p.mcs_product_url, p.mcs_certificate_number,
        p.source_verification_date, p.source_verification_status,
        p.scop, p.cop,
        p.output_a_minus_7_w35, p.output_a7_w45, p.output_w55,
        p.exact_capacity_litres, p.height_mm, p.diameter_mm, p.depth_mm,
        p.cylinder_type, p.coil_area_m2, p.heat_pump_compatible, p.compatible_ashp,
        p.radiator_type, p.length_mm, p.output_w_delta_t50, p.output_w_low_temp,
        p.output_w_delta_t30, p.output_w_delta_t40, p.output_w_delta_t45,
        p.notes, p.active,
        COALESCE(pr.supplier, p.supplier) as supplier,
        COALESCE(pr.supplier_sku, p.supplier_sku, p.sku) as supplier_sku,
        COALESCE(pr.price_ex_vat, p.price_ex_vat) as price_ex_vat,
        COALESCE(pr.price_inc_vat, p.price_inc_vat) as price_inc_vat,
        COALESCE(pr.source_url, p.price_source_url) as price_source_url,
        COALESCE(pr.date_collected, p.price_date) as price_date,
        pr.id as price_id, pr.source_type, pr.price_basis, pr.vat_rate, pr.currency, pr.unit,
        pr.availability, pr.confidence
      FROM products p
      LEFT JOIN product_prices pr ON p.id = pr.product_id AND pr.is_current = 1
      WHERE p.active = 1
    `;
    const params: any[] = [];

    if (family && family !== 'ALL') {
      query += ' AND p.family = ?';
      params.push(family);
    }
    if (brand && brand !== 'ALL') {
      query += ' AND (p.brand = ? OR p.manufacturer = ?)';
      params.push(brand, brand);
    }
    if (mcs_status && mcs_status !== 'ALL') {
      query += ' AND p.mcs_status = ?';
      params.push(mcs_status);
    }
    if (ofgem_pel_status && ofgem_pel_status !== 'ALL') {
      query += ' AND p.ofgem_pel_status = ?';
      params.push(ofgem_pel_status);
    }
    if (verification_status && verification_status !== 'ALL') {
      query += ' AND p.verification_status = ?';
      params.push(verification_status);
    }
    if (radiator_type && radiator_type !== 'ALL') {
      query += " AND (p.radiator_type = ? OR json_extract(p.specifications, '$.type') = ?)";
      params.push(radiator_type, radiator_type);
    }
    if (height_mm && height_mm !== 'ALL') {
      query += " AND (p.height_mm = ? OR CAST(json_extract(p.specifications, '$.height_mm') AS INTEGER) = ?)";
      params.push(Number(height_mm), Number(height_mm));
    }
    if (length_mm && length_mm !== 'ALL') {
      query += " AND (p.length_mm = ? OR CAST(json_extract(p.specifications, '$.length_mm') AS INTEGER) = ?)";
      params.push(Number(length_mm), Number(length_mm));
    }

    // --- ADVANCED CATEGORY SPECIFIC FILTERS ---
    if (kw_rating && kw_rating !== 'ALL') {
      query += ' AND (ABS(COALESCE(p.marketing_nominal_kw, p.rated_output_kw, 0) - ?) < 0.85 OR ABS(COALESCE(p.rated_output_kw, 0) - ?) < 0.85)';
      params.push(Number(kw_rating), Number(kw_rating));
    }
    if (min_kw) {
      query += ' AND COALESCE(p.marketing_nominal_kw, p.rated_output_kw, 0) >= ?';
      params.push(Number(min_kw));
    }
    if (max_kw) {
      query += ' AND COALESCE(p.marketing_nominal_kw, p.rated_output_kw, 0) <= ?';
      params.push(Number(max_kw));
    }

    if (litres && litres !== 'ALL') {
      query += ' AND ABS(COALESCE(p.exact_capacity_litres, 0) - ?) < 15';
      params.push(Number(litres));
    }
    if (min_litres) {
      query += ' AND COALESCE(p.exact_capacity_litres, 0) >= ?';
      params.push(Number(min_litres));
    }
    if (max_litres) {
      query += ' AND COALESCE(p.exact_capacity_litres, 0) <= ?';
      params.push(Number(max_litres));
    }

    if (watts && watts !== 'ALL') {
      query += ' AND ABS(COALESCE(p.output_w_delta_t50, p.output_w_low_temp, 0) - ?) < 150';
      params.push(Number(watts));
    }
    if (min_watts) {
      query += ' AND COALESCE(p.output_w_delta_t50, p.output_w_low_temp, 0) >= ?';
      params.push(Number(min_watts));
    }
    if (max_watts) {
      query += ' AND COALESCE(p.output_w_delta_t50, p.output_w_low_temp, 0) <= ?';
      params.push(Number(max_watts));
    }

    if (pipe_size_mm && pipe_size_mm !== 'ALL') {
      query += ' AND (p.diameter_mm = ? OR p.model LIKE ? OR p.specifications LIKE ?)';
      params.push(Number(pipe_size_mm), `%${pipe_size_mm}mm%`, `%${pipe_size_mm}mm%`);
    }

    if (accessory_type && accessory_type !== 'ALL') {
      query += ' AND (p.category LIKE ? OR p.product_type LIKE ? OR p.model LIKE ? OR p.specifications LIKE ?)';
      const accTerm = `%${accessory_type}%`;
      params.push(accTerm, accTerm, accTerm, accTerm);
    }

    if (search) {
      const s = String(search).trim();
      const kwMatch = s.match(/^(\d+(?:\.\d+)?)\s*kw$/i);
      const litreMatch = s.match(/^(\d+(?:\.\d+)?)\s*l(?:itres?)?$/i);
      const wattMatch = s.match(/^(\d+(?:\.\d+)?)\s*w(?:atts?)?$/i);
      const mmMatch = s.match(/^(\d+)\s*mm$/i);

      if (kwMatch) {
        const val = parseFloat(kwMatch[1]);
        query += ' AND (ABS(COALESCE(p.marketing_nominal_kw, p.rated_output_kw, 0) - ?) < 0.85 OR p.model LIKE ?)';
        params.push(val, `%${s}%`);
      } else if (litreMatch) {
        const val = parseFloat(litreMatch[1]);
        query += ' AND (ABS(COALESCE(p.exact_capacity_litres, 0) - ?) < 15 OR p.model LIKE ?)';
        params.push(val, `%${s}%`);
      } else if (wattMatch) {
        const val = parseFloat(wattMatch[1]);
        query += ' AND (ABS(COALESCE(p.output_w_delta_t50, p.output_w_low_temp, 0) - ?) < 150 OR p.model LIKE ?)';
        params.push(val, `%${s}%`);
      } else if (mmMatch) {
        const val = parseInt(mmMatch[1], 10);
        query += ' AND (p.diameter_mm = ? OR p.height_mm = ? OR p.length_mm = ? OR p.model LIKE ? OR p.specifications LIKE ?)';
        params.push(val, val, val, `%${s}%`, `%${s}%`);
      } else {
        query += ' AND (p.model LIKE ? OR p.brand LIKE ? OR p.manufacturer LIKE ? OR p.product_family LIKE ? OR p.sku LIKE ? OR p.supplier LIKE ? OR p.category LIKE ? OR p.specifications LIKE ?)';
        const term = `%${s}%`;
        params.push(term, term, term, term, term, term, term, term);
      }
    }

    query += ' ORDER BY p.family ASC, COALESCE(p.brand, p.manufacturer) ASC, COALESCE(p.rated_output_kw, p.exact_capacity_litres, p.output_w_delta_t50, 0) ASC';
    const products = await db.all(query, params);
    res.json({ products });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch products' });
  }
});

// GET Single Product with Complete Multi-Source Price History
adminRouter.get('/products/:id', async (req: Request, res: Response) => {
  try {
    const product = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const prices = await db.all('SELECT * FROM product_prices WHERE product_id = ? ORDER BY date_collected DESC, created_at DESC', [req.params.id]);
    const audits = await db.all('SELECT * FROM audit_logs WHERE entity_id = ? ORDER BY created_at DESC LIMIT 20', [req.params.id]);

    res.json({ product, prices, audits });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch product' });
  }
});

// UPDATE Product Specifications & Governance Verification
adminRouter.post('/products/:id', requireRole('ADMIN', 'ESTIMATOR'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const productId = req.params.id;
    const {
      mcs_status,
      mcs_product_reference,
      mcs_notes,
      ofgem_pel_status,
      bus_product_eligibility_status,
      manual_review_required,
      data_confidence,
      verification_status,
      notes,
      rated_output_kw,
      rated_output_condition,
      flow_temperature,
      refrigerant,
      phase,
      electrical_requirements,
      userId = 'user_admin'
    } = req.body;

    const current = await db.get('SELECT * FROM products WHERE id = ?', [productId]) as any;
    if (!current) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await db.batch([
      {
        sql: `
          UPDATE products SET
            mcs_status = COALESCE(?, mcs_status),
            mcs_product_reference = COALESCE(?, mcs_product_reference),
            mcs_notes = COALESCE(?, mcs_notes),
            ofgem_pel_status = COALESCE(?, ofgem_pel_status),
            bus_product_eligibility_status = COALESCE(?, bus_product_eligibility_status),
            manual_review_required = COALESCE(?, manual_review_required),
            data_confidence = COALESCE(?, data_confidence),
            verification_status = COALESCE(?, verification_status),
            notes = COALESCE(?, notes),
            rated_output_kw = COALESCE(?, rated_output_kw),
            rated_output_at_design = COALESCE(?, rated_output_at_design),
            rated_output_condition = COALESCE(?, rated_output_condition),
            flow_temperature = COALESCE(?, flow_temperature),
            refrigerant = COALESCE(?, refrigerant),
            phase = COALESCE(?, phase),
            electrical_requirements = COALESCE(?, electrical_requirements),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        args: [
          mcs_status,
          mcs_product_reference,
          mcs_notes,
          ofgem_pel_status,
          bus_product_eligibility_status,
          manual_review_required,
          data_confidence,
          verification_status,
          notes,
          rated_output_kw,
          rated_output_kw,
          rated_output_condition,
          flow_temperature,
          refrigerant,
          phase,
          electrical_requirements,
          productId
        ]
      },
      {
        sql: `
          INSERT INTO audit_logs (id, user_id, entity_type, entity_id, action, old_values, new_values, reason)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          `audit_${Date.now()}`,
          userId,
          'PRODUCT_SPECIFICATION',
          productId,
          'UPDATE',
          JSON.stringify(current),
          JSON.stringify(req.body),
          notes || `Product specification and verification update for ${productId}`
        ]
      }
    ], 'write');

    const updated = await db.get('SELECT * FROM products WHERE id = ?', [productId]);
    res.json({ success: true, product: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update product' });
  }
});

// ADD / UPDATE Product Price
adminRouter.post('/products/:id/price', requireRole('ADMIN', 'ESTIMATOR'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const productId = req.params.id;
    const {
      supplier,
      sourceType = 'CITY_PLUMBING',
      sourceUrl,
      priceExVat,
      priceIncVat,
      priceBasis = 'EX_VAT',
      currency = 'GBP',
      availability = 'In stock',
      confidence = 'MARKET_CONFIRMED',
      userId = 'user_admin',
      notes
    } = req.body;

    const currentPrice = await db.get('SELECT * FROM product_prices WHERE product_id = ? AND is_current = 1', [productId]) as any;
    const newPriceId = `price_${productId}_${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];
    const calculatedIncVat = priceIncVat !== undefined ? priceIncVat : (priceExVat !== null && priceExVat !== undefined ? priceExVat : null);

    await db.batch([
      {
        sql: 'UPDATE product_prices SET is_current = 0 WHERE product_id = ?',
        args: [productId]
      },
      {
        sql: `
          INSERT INTO product_prices (
            id, product_id, supplier, source_type, source_url, price_basis,
            date_collected, price_captured_at, price_ex_vat, price_inc_vat,
            vat_rate, currency, unit, availability, confidence, is_current, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, ?, 'EACH', ?, ?, 1, ?)
        `,
        args: [
          newPriceId,
          productId,
          supplier || 'City Plumbing',
          sourceType,
          sourceUrl || null,
          priceBasis,
          today,
          new Date().toISOString(),
          priceExVat,
          calculatedIncVat,
          currency,
          availability,
          confidence,
          notes || `Price captured from ${sourceType}`
        ]
      },
      {
        sql: `
          INSERT INTO audit_logs (id, user_id, entity_type, entity_id, action, old_values, new_values, reason)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          `audit_${Date.now()}`,
          userId,
          'PRODUCT_PRICE',
          productId,
          'UPDATE',
          JSON.stringify(currentPrice),
          JSON.stringify(req.body),
          notes || `Price record added for product ${productId} (${sourceType})`
        ]
      }
    ], 'write');

    res.json({ success: true, message: 'Price record created successfully. Historical price preserved.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update price' });
  }
});

// GET BUS Rules
adminRouter.get('/bus-rules', async (req: Request, res: Response) => {
  try {
    const rules = await db.all('SELECT * FROM bus_rules ORDER BY effective_date DESC');
    res.json({ rules });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch BUS rules' });
  }
});

// UPDATE BUS Ruleset
adminRouter.post('/bus-rules/:id', requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { standardGrant, offGasGrant, notes, userId = 'user_admin' } = req.body;
    const current = await db.get('SELECT * FROM bus_rules WHERE id = ?', [req.params.id]) as any;

    await db.batch([
      {
        sql: `
          UPDATE bus_rules 
          SET standard_grant = ?, off_gas_grant = ?, notes = ?
          WHERE id = ?
        `,
        args: [standardGrant ?? current.standard_grant, offGasGrant ?? current.off_gas_grant, notes ?? current.notes, req.params.id]
      },
      {
        sql: `
          INSERT INTO audit_logs (id, user_id, entity_type, entity_id, action, old_values, new_values, reason)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          `audit_${Date.now()}`,
          userId,
          'BUS_RULE',
          req.params.id,
          'UPDATE',
          JSON.stringify(current),
          JSON.stringify({ standardGrant, offGasGrant }),
          notes || 'BUS grant amounts adjusted'
        ]
      }
    ], 'write');

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update BUS rules' });
  }
});

// GET Estimation Tables
adminRouter.get('/estimation-tables', async (req: Request, res: Response) => {
  try {
    const epcBaselines = await db.all('SELECT * FROM epc_baselines ORDER BY w_per_m2 ASC');
    const fallbacks = await db.all('SELECT * FROM fallback_insulation_tables');
    const multipliers = await db.all('SELECT * FROM property_multipliers');
    const cylinderRules = await db.all('SELECT * FROM cylinder_sizing_rules');
    const radiatorConfigs = await db.all('SELECT * FROM radiator_ratio_configs');

    res.json({ epcBaselines, fallbacks, multipliers, cylinderRules, radiatorConfigs });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch estimation tables' });
  }
});

// GET Audit Trail
adminRouter.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const logs = await db.all('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100');
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch audit logs' });
  }
});

// GET Rule Evidence Registry
adminRouter.get('/rule-evidence', async (req: Request, res: Response) => {
  try {
    const { category, status, search } = req.query;
    let query = 'SELECT * FROM rule_evidence WHERE 1=1';
    const params: any[] = [];

    if (category && category !== 'ALL') {
      query += ' AND category = ?';
      params.push(category);
    }
    if (status && status !== 'ALL') {
      query += ' AND verification_status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (rule_name LIKE ? OR rule_id LIKE ? OR authority LIKE ? OR rule_value LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ' ORDER BY category ASC, verification_status ASC, rule_name ASC';
    const rules = await db.all(query, params);
    res.json({ rules });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch rule evidence' });
  }
});

// GET Single Rule Evidence
adminRouter.get('/rule-evidence/:id', async (req: Request, res: Response) => {
  try {
    const rule = await db.get('SELECT * FROM rule_evidence WHERE id = ? OR rule_id = ?', [req.params.id, req.params.id]);
    if (!rule) {
      return res.status(404).json({ error: 'Rule evidence not found' });
    }
    res.json({ rule });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch rule evidence' });
  }
});

// GET Hot Water Cylinders Catalog
adminRouter.get('/cylinders', async (req: Request, res: Response) => {
  try {
    const cylinders = await db.all(`
      SELECT 
        p.id, COALESCE(p.brand, p.manufacturer) as brand, p.manufacturer, p.model, p.sku,
        COALESCE(p.nominal_capacity, 200) as litres, p.specifications,
        p.capacity_source_url as manufacturer_url,
        pr.price_ex_vat, pr.price_inc_vat, pr.price_basis, pr.supplier, pr.source_url
      FROM products p
      LEFT JOIN product_prices pr ON p.id = pr.product_id AND pr.is_current = 1
      WHERE p.family = 'CYLINDER' AND p.active = 1
      ORDER BY COALESCE(p.nominal_capacity, 200) ASC, pr.price_ex_vat ASC
    `);
    res.json({ cylinders });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch cylinders' });
  }
});

// GET Domestic Radiators Catalog
adminRouter.get('/radiators', async (req: Request, res: Response) => {
  try {
    const { type, height, length, status, search } = req.query;
    let query = 'SELECT * FROM radiator_catalogue WHERE active = 1';
    const params: any[] = [];

    if (type && type !== 'ALL') {
      query += ' AND radiator_type = ?';
      params.push(type);
    }
    if (height && height !== 'ALL') {
      query += ' AND height_mm = ?';
      params.push(parseInt(height as string, 10));
    }
    if (length && length !== 'ALL') {
      query += ' AND length_mm = ?';
      params.push(parseInt(length as string, 10));
    }
    if (status && status !== 'ALL') {
      query += ' AND verification_status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (product_name LIKE ? OR sku LIKE ? OR manufacturer LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY radiator_type ASC, height_mm ASC, length_mm ASC';
    const radiators = await db.all(query, params);
    res.json({ radiators, total: radiators.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch radiators' });
  }
});
