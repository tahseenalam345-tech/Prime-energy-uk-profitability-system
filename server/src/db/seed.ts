import { db, initDatabase } from './connection.js';
import { seedRuleEvidenceRegistry } from './seedRuleEvidence.js';
import { seedCylinders } from './seedCylinders.js';
import { seedMasterProductCatalog } from './masterCatalogSeed.js';
import { seedRadiatorCatalogue } from './seedRadiators.js';

export async function seedDatabase() {
  await initDatabase();

  const existingRoles = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM roles').catch(() => undefined);
  if (existingRoles && existingRoles.count > 0) {
    console.log('Database already seeded. System ready.');
    return;
  }

  console.log('Seeding Prime Energy UK database...');

  const insert = db.transaction(() => {
    // 1. ROLES
    const insertRole = db.prepare('INSERT INTO roles (id, name, description) VALUES (?, ?, ?)');
    insertRole.run('role_admin', 'ADMIN', 'Full system access, commercial settings, rules and pricing control');
    insertRole.run('role_sales', 'SALES', 'Create and view New Lead pre-survey estimates');
    insertRole.run('role_surveyor', 'SURVEYOR', 'Input and confirm After Survey design specifications');
    insertRole.run('role_estimator', 'ESTIMATOR', 'Commercial manager, margin verification and quote overrides');
    insertRole.run('role_readonly', 'READ_ONLY', 'Read-only view of leads, quotes, and reports');

    // 2. USERS
    const insertUser = db.prepare('INSERT INTO users (id, name, email, role_id, password_hash, active) VALUES (?, ?, ?, ?, ?, ?)');
    insertUser.run('user_admin', 'Prime Admin', 'admin@primeenergy.co.uk', 'role_admin', 'hash_admin_123', 1);
    insertUser.run('user_sales', 'Sarah Jenkins (Sales)', 'sales@primeenergy.co.uk', 'role_sales', 'hash_sales_123', 1);
    insertUser.run('user_surveyor', 'David Miller (Surveyor)', 'surveyor@primeenergy.co.uk', 'role_surveyor', 'hash_surveyor_123', 1);
    insertUser.run('user_estimator', 'Gareth Evans (Commercial Mgr)', 'estimator@primeenergy.co.uk', 'role_estimator', 'hash_estimator_123', 1);
    insertUser.run('user_readonly', 'Executive Viewer', 'viewer@primeenergy.co.uk', 'role_readonly', 'hash_viewer_123', 1);

    // 3. COMMERCIAL SETTINGS
    const insertSettings = db.prepare(`
      INSERT INTO commercial_settings (
        id, version, target_gross_margin, labour_baseline, lead_generation_cost,
        extras_contingency, combi_conversion_allowance, combi_conversion_status,
        microbore_repipe_allowance, microbore_repipe_status, active, updated_by, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertSettings.run(
      'settings_v1',
      1,
      0.25, // 25% target gross margin
      1500.00, // £1,500 baseline labour
      300.00,  // £300 lead generation
      200.00,  // £200 contingency
      500.00,  // provisional combi conversion
      'PROVISIONAL_PENDING_CONFIRMATION',
      1800.00, // provisional microbore repipe
      'PROVISIONAL_PENDING_CONFIRMATION',
      1,
      'user_admin',
      'Initial baseline commercial configuration per Prime Energy specification'
    );

    // 4. TAX RULES
    const insertTax = db.prepare('INSERT INTO tax_rules (id, code, description, rate, effective_date, active, notes) VALUES (?, ?, ?, ?, ?, ?, ?)');
    insertTax.run('tax_energy_saving_0', 'ENERGY_SAVING_ZERO', 'UK Government Zero Rate VAT on domestic Energy-Saving Materials', 0.00, '2022-04-01', 1, 'HMRC VAT Notice 708/6');
    insertTax.run('tax_standard_20', 'STANDARD_VAT_20', 'UK Standard VAT Rate', 0.20, '2011-01-04', 1, 'Standard 20% VAT');

    // 5. EPC BASELINES (W/m²)
    const insertEpc = db.prepare('INSERT INTO epc_baselines (id, epc_band, w_per_m2) VALUES (?, ?, ?)');
    insertEpc.run('epc_ab', 'A/B', 30.0);
    insertEpc.run('epc_c', 'C', 40.0);
    insertEpc.run('epc_d', 'D', 55.0);
    insertEpc.run('epc_e', 'E', 70.0);
    insertEpc.run('epc_fg', 'F/G', 90.0);

    // 6. FALLBACK INSULATION TABLES (W/m²)
    const insertFallback = db.prepare('INSERT INTO fallback_insulation_tables (id, condition_key, description, w_per_m2) VALUES (?, ?, ?, ?)');
    insertFallback.run('fall_1', 'WALL_INSULATED_ROOF_INSULATED', 'Wall insulated + roof insulated', 45.0);
    insertFallback.run('fall_2', 'WALL_INSULATED_ROOF_UNINSULATED', 'Wall insulated + roof uninsulated/unknown', 60.0);
    insertFallback.run('fall_3', 'WALL_UNINSULATED_ROOF_INSULATED', 'Wall uninsulated/unknown + roof insulated', 65.0);
    insertFallback.run('fall_4', 'WALL_UNINSULATED_ROOF_UNINSULATED', 'Wall uninsulated/unknown + roof uninsulated', 85.0);
    insertFallback.run('fall_5', 'BOTH_UNKNOWN', 'Both unknown / default fallback', 70.0);

    // 7. PROPERTY MULTIPLIERS
    const insertMultiplier = db.prepare('INSERT INTO property_multipliers (id, property_type, multiplier, manual_review_flag) VALUES (?, ?, ?, ?)');
    insertMultiplier.run('mult_det', 'Detached', 1.15, 0);
    insertMultiplier.run('mult_bung', 'Bungalow', 1.10, 0);
    insertMultiplier.run('mult_end', 'End terrace', 1.05, 0);
    insertMultiplier.run('mult_semi', 'Semi detached', 1.00, 0);
    insertMultiplier.run('mult_mid', 'Mid terrace', 0.90, 0);
    insertMultiplier.run('mult_flat', 'Flat', 0.75, 1); // Mandatory manual review flag

    // 8. CYLINDER SIZING RULES
    const insertCylRule = db.prepare('INSERT INTO cylinder_sizing_rules (id, bedroom_min, bedroom_max, bathroom_min, recommended_litres_min, recommended_litres_max, notes) VALUES (?, ?, ?, ?, ?, ?, ?)');
    insertCylRule.run('cyl_1_2', 1, 2, 1, 150, 180, '1–2 bedrooms → 150–180L');
    insertCylRule.run('cyl_3', 3, 3, 1, 200, 200, '3 bedrooms → 200L');
    insertCylRule.run('cyl_3_4_bath2', 3, 4, 2, 250, 250, '3–4 bedrooms + 2 bathrooms → 250L');
    insertCylRule.run('cyl_5_plus', 5, 99, 2, 300, 350, '5+ bedrooms + 2+ bathrooms → 300L+');

    // 9. RADIATOR RATIO & CAPACITY BANDS
    const insertRadConfig = db.prepare(`
      INSERT INTO radiator_ratio_configs (
        id, min_heat_kw, max_heat_kw, min_est_rads, max_est_rads,
        default_replacement_ratio_low, default_replacement_ratio_high
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertRadConfig.run('rad_band_1', 0.0, 5.99, 0, 2, 0.40, 0.60);
    insertRadConfig.run('rad_band_2', 6.0, 9.99, 2, 4, 0.40, 0.60);
    insertRadConfig.run('rad_band_3', 10.0, 14.99, 4, 6, 0.40, 0.60);
    insertRadConfig.run('rad_band_4', 15.0, 99.0, 6, 8, 0.40, 0.60);

    // 10. CONFIDENCE WEIGHT CONFIGS
    const insertWeight = db.prepare('INSERT INTO confidence_weight_configs (id, field_key, label, max_weight) VALUES (?, ?, ?, ?)');
    insertWeight.run('cw_epc', 'epc_rating', 'EPC Rating', 20.0);
    insertWeight.run('cw_area', 'floor_area', 'EPC Floor Area m²', 20.0);
    insertWeight.run('cw_type', 'property_type', 'Property Type', 15.0);
    insertWeight.run('cw_wall', 'wall_insulation', 'Wall Insulation', 15.0);
    insertWeight.run('cw_roof', 'roof_insulation', 'Roof Insulation', 10.0);
    insertWeight.run('cw_heating', 'existing_heating_system', 'Existing Heating System', 10.0);
    insertWeight.run('cw_rads', 'radiator_information', 'Radiator Information', 5.0);
    insertWeight.run('cw_bath', 'bathroom_occupancy_signal', 'Bathroom / Occupancy Signal', 5.0);

    // 11. PROFITABILITY RATING CONFIGS
    const insertRating = db.prepare('INSERT INTO profitability_rating_configs (id, grade, min_margin, max_margin, color_code) VALUES (?, ?, ?, ?, ?)');
    insertRating.run('rate_aplus', 'A+', 0.35, 1.00, '#10b981'); // >= 35%
    insertRating.run('rate_a', 'A', 0.28, 0.3499, '#059669');    // 28-34%
    insertRating.run('rate_b', 'B', 0.20, 0.2799, '#3b82f6');    // 20-27%
    insertRating.run('rate_c', 'C', 0.12, 0.1999, '#f59e0b');    // 12-19%
    insertRating.run('rate_d', 'D', 0.05, 0.1199, '#f97316');    // 5-11%
    insertRating.run('rate_f', 'F', -1.00, 0.0499, '#ef4444');   // < 5%

    // 12. BUS RULES (VERSIONED)
    const insertBus = db.prepare(`
      INSERT INTO bus_rules (
        id, rule_id, description, scope_countries, standard_grant, off_gas_grant,
        developer_new_build_eligible, self_build_eligible, prior_grant_disqualifies,
        source, source_url, effective_date, review_date, version, notes, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertBus.run(
      'bus_v2024_1',
      'BUS_UK_STANDARD_2024',
      'Official Boiler Upgrade Scheme (BUS) England & Wales ruleset',
      'England,Wales',
      7500.00,
      9000.00, // uplift for eligible off-gas replacements
      0, // developer new-build NOT eligible
      1, // self-build eligible
      1, // prior grant disqualifies
      'Ofgem / Department for Energy Security and Net Zero',
      'https://www.gov.uk/apply-boiler-upgrade-scheme',
      '2023-10-23',
      '2026-12-31',
      'v2.4-2024',
      'Standard eligible ASHP: £7,500. Off-gas replacement eligible uplift: £9,000.',
      1
    );

    // 13. PRODUCTS & PRICES
    const insertProduct = db.prepare(`
      INSERT INTO products (
        id, family, manufacturer, model, category, nominal_capacity,
        rated_output_at_design, design_condition, flow_temperature, phase,
        electrical_requirements, specifications, product_source, source_date, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertPrice = db.prepare(`
      INSERT INTO product_prices (
        id, product_id, supplier, source_url, date_collected,
        price_ex_vat, price_inc_vat, vat_rate, unit, confidence, is_current
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // ASHP MODELS
    const ashpModels = [
      {
        id: 'ashp_ecogenica_7',
        manufacturer: 'Ecogenica',
        model: 'EG-07-M Monobloc 7kW',
        nominal: 7.0,
        rated: 6.2,
        designCond: '-2°C / 45°C flow',
        flowTemp: 45,
        phase: 1,
        elec: '1-phase, 16A dedicated supply, Type B/C breaker',
        priceEx: 2450.00,
        supplier: 'Ecogenica UK Trade Distributor',
        confidence: 'MARKET_CONFIRMED'
      },
      {
        id: 'ashp_ecogenica_9',
        manufacturer: 'Ecogenica',
        model: 'EG-09-M Monobloc 9kW',
        nominal: 9.0,
        rated: 8.1,
        designCond: '-2°C / 45°C flow',
        flowTemp: 45,
        phase: 1,
        elec: '1-phase, 20A dedicated supply',
        priceEx: 2850.00,
        supplier: 'Ecogenica UK Trade Distributor',
        confidence: 'MARKET_CONFIRMED'
      },
      {
        id: 'ashp_ecogenica_12',
        manufacturer: 'Ecogenica',
        model: 'EG-12-M Monobloc 12kW',
        nominal: 12.0,
        rated: 10.8,
        designCond: '-2°C / 45°C flow',
        flowTemp: 45,
        phase: 1,
        elec: '1-phase, 32A dedicated supply',
        priceEx: 3350.00,
        supplier: 'Ecogenica UK Trade Distributor',
        confidence: 'MARKET_CONFIRMED'
      },
      {
        id: 'ashp_trianco_8',
        manufacturer: 'Trianco',
        model: 'Activair 8kW High Temp Monobloc',
        nominal: 8.0,
        rated: 7.4,
        designCond: '-3°C / 50°C flow',
        flowTemp: 50,
        phase: 1,
        elec: '1-phase, 20A supply',
        priceEx: 2790.00,
        supplier: 'Trianco National Merchant',
        confidence: 'MARKET_CONFIRMED'
      },
      {
        id: 'ashp_trianco_12',
        manufacturer: 'Trianco',
        model: 'Activair 12kW High Temp Monobloc',
        nominal: 12.0,
        rated: 11.2,
        designCond: '-3°C / 50°C flow',
        flowTemp: 50,
        phase: 1,
        elec: '1-phase, 32A supply',
        priceEx: 3490.00,
        supplier: 'Trianco National Merchant',
        confidence: 'MARKET_CONFIRMED'
      },
      {
        id: 'ashp_trianco_16',
        manufacturer: 'Trianco',
        model: 'Activair 16kW Commercial/Large Domestic Monobloc (3-Phase)',
        nominal: 16.0,
        rated: 15.0,
        designCond: '-3°C / 50°C flow',
        flowTemp: 50,
        phase: 3,
        elec: '3-phase 400V 16A per phase required',
        priceEx: 4350.00,
        supplier: 'Trianco National Merchant',
        confidence: 'MARKET_CONFIRMED'
      }
    ];

    for (const item of ashpModels) {
      insertProduct.run(
        item.id,
        'ASHP',
        item.manufacturer,
        item.model,
        'Required',
        item.nominal,
        item.rated,
        item.designCond,
        item.flowTemp,
        item.phase,
        item.elec,
        JSON.stringify({ refrigerant: 'R32', soundPowerDba: 58 }),
        'Manufacturer Spec Sheet 2024',
        '2024-01-15',
        1
      );
      insertPrice.run(
        `price_${item.id}`,
        item.id,
        item.supplier,
        'https://primeenergy.co.uk/trade/catalogue',
        '2024-05-01',
        item.priceEx,
        item.priceEx, // 0% VAT
        0.00,
        'EACH',
        item.confidence,
        1
      );
    }

    // CYLINDER MODELS
    const cylinders = [
      { id: 'cyl_glenhill_150', mfg: 'Glenhill', model: 'Glenhill Heat Pump Slimline 150L Unvented', litres: 150, price: 820.00 },
      { id: 'cyl_glenhill_180', mfg: 'Glenhill', model: 'Glenhill Heat Pump Standard 180L Unvented', litres: 180, price: 890.00 },
      { id: 'cyl_glenhill_200', mfg: 'Glenhill', model: 'Glenhill Heat Pump High Gain 200L Unvented', litres: 200, price: 950.00 },
      { id: 'cyl_glenhill_250', mfg: 'Glenhill', model: 'Glenhill Heat Pump High Gain 250L Unvented', litres: 250, price: 1120.00 },
      { id: 'cyl_glenhill_300', mfg: 'Glenhill', model: 'Glenhill Heat Pump High Gain 300L Unvented', litres: 300, price: 1280.00 },
      { id: 'cyl_joule_200', mfg: 'Joule', model: 'Joule Cyclone HP 200L High Gain Cylinder', litres: 200, price: 980.00 }
    ];

    for (const cyl of cylinders) {
      insertProduct.run(
        cyl.id,
        'CYLINDER',
        cyl.mfg,
        cyl.model,
        'Required',
        null,
        null,
        null,
        null,
        1,
        'Standard 3kW immersion backup',
        JSON.stringify({ volumeLitres: cyl.litres, coilSurfaceM2: 2.8, unvented: true }),
        'Glenhill Cylinder Catalogue',
        '2024-03-01',
        1
      );
      insertPrice.run(
        `price_${cyl.id}`,
        cyl.id,
        'Glenhill Direct / Plumbing Merchant',
        'https://glenhillcylinders.co.uk',
        '2024-05-01',
        cyl.price,
        cyl.price,
        0.00,
        'EACH',
        'MARKET_CONFIRMED',
        1
      );
    }

    // RADIATORS
    const radProducts = [
      { id: 'rad_generic_replacement', mfg: 'Stelrad / Henrad', model: 'Standard Replacement Radiator Allowance (Type 21/22 average)', price: 165.00 },
      { id: 'rad_k1_600x600', mfg: 'Stelrad', model: 'K1 Single Panel Convector 600x600mm', price: 62.00 },
      { id: 'rad_k2_600x1000', mfg: 'Stelrad', model: 'K2 Double Convector 600x1000mm', price: 145.00 },
      { id: 'rad_p_plus_600x800', mfg: 'Stelrad', model: 'P+ Double Panel Single Convector 600x800mm', price: 110.00 },
      { id: 'rad_t22_600x1200', mfg: 'Stelrad', model: 'Type 22 High Heat Output 600x1200mm', price: 185.00 }
    ];

    for (const rad of radProducts) {
      insertProduct.run(
        rad.id,
        'RADIATOR',
        rad.mfg,
        rad.model,
        'Installation-dependent',
        null,
        null,
        'Delta T 30C',
        45,
        1,
        'None',
        JSON.stringify({ type: rad.id }),
        'Merchant Price List',
        '2024-04-01',
        1
      );
      insertPrice.run(
        `price_${rad.id}`,
        rad.id,
        'Wolseley / City Plumbing',
        'https://tradeplumbing.co.uk',
        '2024-05-01',
        rad.price,
        rad.price,
        0.00,
        'EACH',
        'MARKET_CONFIRMED',
        1
      );
    }

    // PIPEWORK & MATERIALS
    const pipes = [
      { id: 'pipe_std_allowance', mfg: 'Prime Standard', model: 'Standard Pipework & Insulation Fittings Allowance (15-28mm)', price: 350.00 },
      { id: 'pipe_microbore_repipe_pack', mfg: 'Prime Repipe', model: 'Full Microbore Re-pipe Materials & Pipework Allowance', price: 1800.00 }
    ];

    for (const p of pipes) {
      insertProduct.run(
        p.id,
        'PIPE',
        p.mfg,
        p.model,
        'Required',
        null,
        null,
        null,
        null,
        1,
        'None',
        JSON.stringify({}),
        'Trade Materials Index',
        '2024-05-01',
        1
      );
      insertPrice.run(
        `price_${p.id}`,
        p.id,
        'Prime Energy Sourcing',
        'https://primeenergy.co.uk',
        '2024-05-01',
        p.price,
        p.price,
        0.00,
        'LOT',
        'MARKET_CONFIRMED',
        1
      );
    }

    // ACCESSORIES / BOM
    const accessories = [
      { id: 'acc_magnetic_filter', mfg: 'Fernox / Adey', model: 'MagnaClean Heat Pump Dual Flow Filter', cat: 'Required', price: 155.00 },
      { id: 'acc_safety_pack', mfg: 'Reliance', model: 'Unvented Cylinder Safety & Expansion Vessel Kit', cat: 'Required', price: 180.00 },
      { id: 'acc_diverter_valve', mfg: 'Honeywell', model: '3-Way Motorised Zone Diverter Valve 28mm', cat: 'Required', price: 125.00 },
      { id: 'acc_av_feet', mfg: 'Pump House', model: 'Anti-Vibration Mounting Feet & Ground Bracket Set', cat: 'Required', price: 95.00 },
      { id: 'acc_flex_hoses', mfg: 'Inta', model: '28mm Flexible Stainless Steel Braided Anti-Vibration Hoses (Pair)', cat: 'Required', price: 78.00 },
      { id: 'acc_controller', mfg: 'Heatmiser', model: 'Smart Touch Heat Pump Thermostat & Gateway Hub', cat: 'Required', price: 175.00 },
      { id: 'acc_elec_pack', mfg: 'Wylex', model: 'Dedicated Outdoor Rotary Isolator & Fuse Board Upgrade Components', cat: 'Required', price: 160.00 },
      { id: 'acc_combi_conversion_pack', mfg: 'Prime Fit', model: 'Combi Conversion Piping Relocation & Redirection Kit', cat: 'Installation-dependent', price: 500.00 }
    ];

    for (const acc of accessories) {
      insertProduct.run(
        acc.id,
        'ACCESSORY',
        acc.mfg,
        acc.model,
        acc.cat,
        null,
        null,
        null,
        null,
        1,
        'Varies',
        JSON.stringify({}),
        'Trade Accessories Catalogue',
        '2024-05-01',
        1
      );
      insertPrice.run(
        `price_${acc.id}`,
        acc.id,
        'City Plumbing / PTS',
        'https://tradeplumbing.co.uk',
        '2024-05-01',
        acc.price,
        acc.price,
        0.00,
        'EACH',
        'MARKET_CONFIRMED',
        1
      );
    }

    // 14. SEED SAMPLE REAL-WORLD LEADS
    const insertLead = db.prepare('INSERT INTO leads (id, reference_no, customer_name, email, phone, lead_source, status, assigned_to) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const insertProp = db.prepare(`
      INSERT INTO properties (
        id, lead_id, address_line1, address_line2, postcode, country,
        epc_rating, epc_floor_area, property_type, property_status,
        bedrooms, bathrooms, ownership, wall_insulation, roof_insulation,
        existing_heating_system, boiler_type, on_off_gas_grid,
        cylinder_space, existing_radiator_count, existing_pipework,
        previous_government_grant, fuse_board_condition, conservation_area,
        boundary_planning_risk, listed_building, sales_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Sample Lead 1: 3-bed Semi-detached (Typical Prime Opportunity)
    insertLead.run('lead_001', 'PEL-2026-001', 'Arthur Pendelton', 'arthur.p@example.co.uk', '07700 900123', 'Website Form', 'NEW', 'user_sales');
    insertProp.run(
      'prop_001',
      'lead_001',
      '14 Meadow Lane',
      'Headingley',
      'LS6 2NW',
      'England',
      'D',
      120.0,
      'Semi detached',
      'Existing property',
      3,
      1,
      'Owner-occupier',
      'Insulated',
      'Insulated',
      'Gas Central Heating',
      'Combi',
      'On gas grid',
      'Yes',
      10,
      'Standard 15mm+',
      'None',
      'Modern',
      'No',
      'No',
      'No',
      'Airing cupboard space confirmed available for unvented cylinder installation.'
    );

    // Sample Lead 2: 4-bed Detached Off-Gas (High Grant £9,000 Opportunity)
    insertLead.run('lead_002', 'PEL-2026-002', 'Eleanor Vance', 'eleanor.vance@example.co.uk', '07700 900456', 'Partner Referral', 'NEW', 'user_sales');
    insertProp.run(
      'prop_002',
      'lead_002',
      'Rosewood Manor, Church Road',
      'Ripon',
      'HG4 3PQ',
      'England',
      'E',
      180.0,
      'Detached',
      'Existing property',
      4,
      2,
      'Owner-occupier',
      'Uninsulated',
      'Insulated',
      'Oil Boiler',
      'Regular',
      'Off gas grid',
      'Yes',
      14,
      'Standard 15mm+',
      'None',
      'Modern',
      'No',
      'No',
      'No',
      'High heating oil bills (£2,800/yr). Eager for clean heat transition with £9k off-gas grant.'
    );

    // Sample Lead 3: 2-bed Mid-terrace with Microbore Risk
    insertLead.run('lead_003', 'PEL-2026-003', 'Liam Gallagher', 'liam.g@example.co.uk', '07700 900789', 'Local Campaign', 'NEW', 'user_sales');
    insertProp.run(
      'prop_003',
      'lead_003',
      '27 Victoria Terrace',
      'Salford',
      'M5 4TT',
      'England',
      'D',
      85.0,
      'Mid terrace',
      'Existing property',
      2,
      1,
      'Owner-occupier',
      'Insulated',
      'Insulated',
      'Gas Combi Boiler',
      'Combi',
      'On gas grid',
      'Yes',
      7,
      'Microbore 10mm or less',
      'None',
      'Modern',
      'No',
      'No',
      'No',
      'Existing heating is 8mm microbore from 1980s. Requires full re-pipe commercial allowance.'
    );

    // DEMO / TEST DATASET (Requirement 14)
    // TEST A: Low heat demand ~4kW
    insertLead.run('lead_test_a', 'TEST-DEMO-A', '[TEST DATA] Test A - Low Demand (~4kW)', 'test.a.low@example.co.uk', '07700 900901', 'TEST_SUITE', 'NEW', 'user_sales');
    insertProp.run(
      'prop_test_a',
      'lead_test_a',
      '12 Greenfield Way',
      'Clifton',
      'BS1 4AA',
      'England',
      'C',
      100.0,
      'Semi detached',
      'Existing property',
      2,
      1,
      'Owner-occupier',
      'Insulated',
      'Insulated',
      'Gas Central Heating',
      'Combi',
      'On gas grid',
      'Yes',
      8,
      'Standard 15mm+',
      'None',
      'Modern',
      'No',
      'No',
      'No',
      '[TEST DATA] Target heat demand: ~4.0 kW (100 m² @ 40 W/m² C-Rating x 1.0 multiplier). Expected unit: ~4kW ASHP.'
    );

    // TEST B: Medium heat demand ~7kW
    insertLead.run('lead_test_b', 'TEST-DEMO-B', '[TEST DATA] Test B - Medium Demand (~7kW)', 'test.b.med@example.co.uk', '07700 900902', 'TEST_SUITE', 'NEW', 'user_sales');
    insertProp.run(
      'prop_test_b',
      'lead_test_b',
      '45 Oakfield Road',
      'Headingley',
      'LS6 2NW',
      'England',
      'D',
      130.0,
      'Semi detached',
      'Existing property',
      3,
      1,
      'Owner-occupier',
      'Insulated',
      'Insulated',
      'Gas Central Heating',
      'Combi',
      'On gas grid',
      'Yes',
      11,
      'Standard 15mm+',
      'None',
      'Modern',
      'No',
      'No',
      'No',
      '[TEST DATA] Target heat demand: ~7.15 kW (130 m² @ 55 W/m² D-Rating x 1.0 multiplier). Expected unit: ~7kW / 8kW rated ASHP.'
    );

    // TEST C: Higher heat demand ~10kW
    insertLead.run('lead_test_c', 'TEST-DEMO-C', '[TEST DATA] Test C - High Demand (~10kW)', 'test.c.high@example.co.uk', '07700 900903', 'TEST_SUITE', 'NEW', 'user_sales');
    insertProp.run(
      'prop_test_c',
      'lead_test_c',
      'Highfields House, Church Lane',
      'Pannal',
      'HG3 1AA',
      'England',
      'D',
      160.0,
      'Detached',
      'Existing property',
      4,
      2,
      'Owner-occupier',
      'Insulated',
      'Insulated',
      'Oil Boiler',
      'Regular',
      'Off gas grid',
      'Yes',
      15,
      'Standard 15mm+',
      'None',
      'Modern',
      'No',
      'No',
      'No',
      '[TEST DATA] Target heat demand: ~10.12 kW (160 m² @ 55 W/m² D-Rating x 1.15 Detached multiplier). Expected unit: ~10kW rated ASHP. £9k off-gas grant.'
    );

    // Ensure brand is populated for baseline products
    db.prepare("UPDATE products SET brand = manufacturer WHERE brand IS NULL").run();

    console.log('Prime Energy UK database seeded successfully with commercial baselines, products, BUS rules, and leads.');
  });

  await seedRuleEvidenceRegistry();
  await seedCylinders();
  await seedMasterProductCatalog();
  await seedRadiatorCatalogue();
}

// Execute if run directly
if (process.argv[1]?.includes('seed.ts') || process.argv[1]?.includes('seed.js')) {
  seedDatabase();
}
