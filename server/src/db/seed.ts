import bcrypt from 'bcryptjs';
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

  console.log('Seeding Prime Energy UK database with secure defaults and commercial baselines...');

  const defaultPasswordHash = bcrypt.hashSync('PrimePassword2026!', 10);

  const batchStmts: Array<{ sql: string; args?: any[] }> = [
    // 1. ROLES
    { sql: 'INSERT INTO roles (id, name, description) VALUES (?, ?, ?)', args: ['role_admin', 'ADMIN', 'Full system access, commercial settings, rules and pricing control'] },
    { sql: 'INSERT INTO roles (id, name, description) VALUES (?, ?, ?)', args: ['role_sales', 'SALES', 'Create and view New Lead pre-survey estimates'] },
    { sql: 'INSERT INTO roles (id, name, description) VALUES (?, ?, ?)', args: ['role_surveyor', 'SURVEYOR', 'Input and confirm After Survey design specifications'] },
    { sql: 'INSERT INTO roles (id, name, description) VALUES (?, ?, ?)', args: ['role_estimator', 'ESTIMATOR', 'Commercial manager, margin verification and quote overrides'] },
    { sql: 'INSERT INTO roles (id, name, description) VALUES (?, ?, ?)', args: ['role_readonly', 'READ_ONLY', 'Read-only view of leads, quotes, and reports'] },

    // 2. USERS (Bcrypt Hashed Passwords)
    { sql: 'INSERT INTO users (id, name, email, role_id, password_hash, active) VALUES (?, ?, ?, ?, ?, ?)', args: ['user_admin', 'Prime Admin', 'admin@primeenergy.co.uk', 'role_admin', defaultPasswordHash, 1] },
    { sql: 'INSERT INTO users (id, name, email, role_id, password_hash, active) VALUES (?, ?, ?, ?, ?, ?)', args: ['user_sales', 'Sarah Jenkins (Sales)', 'sales@primeenergy.co.uk', 'role_sales', defaultPasswordHash, 1] },
    { sql: 'INSERT INTO users (id, name, email, role_id, password_hash, active) VALUES (?, ?, ?, ?, ?, ?)', args: ['user_surveyor', 'David Miller (Surveyor)', 'surveyor@primeenergy.co.uk', 'role_surveyor', defaultPasswordHash, 1] },
    { sql: 'INSERT INTO users (id, name, email, role_id, password_hash, active) VALUES (?, ?, ?, ?, ?, ?)', args: ['user_estimator', 'Gareth Evans (Commercial Mgr)', 'estimator@primeenergy.co.uk', 'role_estimator', defaultPasswordHash, 1] },
    { sql: 'INSERT INTO users (id, name, email, role_id, password_hash, active) VALUES (?, ?, ?, ?, ?, ?)', args: ['user_readonly', 'Executive Viewer', 'viewer@primeenergy.co.uk', 'role_readonly', defaultPasswordHash, 1] },

    // 3. COMMERCIAL SETTINGS
    {
      sql: `
        INSERT INTO commercial_settings (
          id, version, target_gross_margin, labour_baseline, lead_generation_cost,
          extras_contingency, combi_conversion_allowance, combi_conversion_status,
          microbore_repipe_allowance, microbore_repipe_status, active, updated_by, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: ['settings_v1', 1, 0.07, 1500.00, 300.00, 200.00, 500.00, 'PROVISIONAL_PENDING_CONFIRMATION', 1800.00, 'PROVISIONAL_PENDING_CONFIRMATION', 1, 'user_admin', 'Initial baseline commercial configuration per Prime Energy specification']
    },

    // 4. TAX RULES
    { sql: 'INSERT INTO tax_rules (id, code, description, rate, effective_date, active, notes) VALUES (?, ?, ?, ?, ?, ?, ?)', args: ['tax_energy_saving_0', 'ENERGY_SAVING_ZERO', 'UK Government Zero Rate VAT on domestic Energy-Saving Materials', 0.00, '2022-04-01', 1, 'HMRC VAT Notice 708/6'] },
    { sql: 'INSERT INTO tax_rules (id, code, description, rate, effective_date, active, notes) VALUES (?, ?, ?, ?, ?, ?, ?)', args: ['tax_standard_20', 'STANDARD_VAT_20', 'UK Standard VAT Rate', 0.20, '2011-01-04', 1, 'Standard 20% VAT'] },

    // 5. EPC BASELINES (W/m²)
    { sql: 'INSERT INTO epc_baselines (id, epc_band, w_per_m2) VALUES (?, ?, ?)', args: ['epc_ab', 'A/B', 30.0] },
    { sql: 'INSERT INTO epc_baselines (id, epc_band, w_per_m2) VALUES (?, ?, ?)', args: ['epc_c', 'C', 40.0] },
    { sql: 'INSERT INTO epc_baselines (id, epc_band, w_per_m2) VALUES (?, ?, ?)', args: ['epc_d', 'D', 55.0] },
    { sql: 'INSERT INTO epc_baselines (id, epc_band, w_per_m2) VALUES (?, ?, ?)', args: ['epc_e', 'E', 70.0] },
    { sql: 'INSERT INTO epc_baselines (id, epc_band, w_per_m2) VALUES (?, ?, ?)', args: ['epc_fg', 'F/G', 90.0] },

    // 6. FALLBACK INSULATION TABLES (W/m²)
    { sql: 'INSERT INTO fallback_insulation_tables (id, condition_key, description, w_per_m2) VALUES (?, ?, ?, ?)', args: ['fall_1', 'WALL_INSULATED_ROOF_INSULATED', 'Wall insulated + roof insulated', 45.0] },
    { sql: 'INSERT INTO fallback_insulation_tables (id, condition_key, description, w_per_m2) VALUES (?, ?, ?, ?)', args: ['fall_2', 'WALL_INSULATED_ROOF_UNINSULATED', 'Wall insulated + roof uninsulated/unknown', 60.0] },
    { sql: 'INSERT INTO fallback_insulation_tables (id, condition_key, description, w_per_m2) VALUES (?, ?, ?, ?)', args: ['fall_3', 'WALL_UNINSULATED_ROOF_INSULATED', 'Wall uninsulated/unknown + roof insulated', 65.0] },
    { sql: 'INSERT INTO fallback_insulation_tables (id, condition_key, description, w_per_m2) VALUES (?, ?, ?, ?)', args: ['fall_4', 'WALL_UNINSULATED_ROOF_UNINSULATED', 'Wall uninsulated/unknown + roof uninsulated', 85.0] },
    { sql: 'INSERT INTO fallback_insulation_tables (id, condition_key, description, w_per_m2) VALUES (?, ?, ?, ?)', args: ['fall_5', 'BOTH_UNKNOWN', 'Both unknown / default fallback', 70.0] },

    // 7. PROPERTY MULTIPLIERS
    { sql: 'INSERT INTO property_multipliers (id, property_type, multiplier, manual_review_flag) VALUES (?, ?, ?, ?)', args: ['mult_det', 'Detached', 1.15, 0] },
    { sql: 'INSERT INTO property_multipliers (id, property_type, multiplier, manual_review_flag) VALUES (?, ?, ?, ?)', args: ['mult_bung', 'Bungalow', 1.10, 0] },
    { sql: 'INSERT INTO property_multipliers (id, property_type, multiplier, manual_review_flag) VALUES (?, ?, ?, ?)', args: ['mult_end', 'End terrace', 1.05, 0] },
    { sql: 'INSERT INTO property_multipliers (id, property_type, multiplier, manual_review_flag) VALUES (?, ?, ?, ?)', args: ['mult_semi', 'Semi detached', 1.00, 0] },
    { sql: 'INSERT INTO property_multipliers (id, property_type, multiplier, manual_review_flag) VALUES (?, ?, ?, ?)', args: ['mult_mid', 'Mid terrace', 0.90, 0] },
    { sql: 'INSERT INTO property_multipliers (id, property_type, multiplier, manual_review_flag) VALUES (?, ?, ?, ?)', args: ['mult_flat', 'Flat', 0.75, 1] },

    // 8. CYLINDER SIZING RULES
    { sql: 'INSERT INTO cylinder_sizing_rules (id, bedroom_min, bedroom_max, bathroom_min, recommended_litres_min, recommended_litres_max, notes) VALUES (?, ?, ?, ?, ?, ?, ?)', args: ['cyl_1_2', 1, 2, 1, 150, 180, '1–2 bedrooms → 150–180L'] },
    { sql: 'INSERT INTO cylinder_sizing_rules (id, bedroom_min, bedroom_max, bathroom_min, recommended_litres_min, recommended_litres_max, notes) VALUES (?, ?, ?, ?, ?, ?, ?)', args: ['cyl_3', 3, 3, 1, 200, 200, '3 bedrooms → 200L'] },
    { sql: 'INSERT INTO cylinder_sizing_rules (id, bedroom_min, bedroom_max, bathroom_min, recommended_litres_min, recommended_litres_max, notes) VALUES (?, ?, ?, ?, ?, ?, ?)', args: ['cyl_3_4_bath2', 3, 4, 2, 250, 250, '3–4 bedrooms + 2 bathrooms → 250L'] },
    { sql: 'INSERT INTO cylinder_sizing_rules (id, bedroom_min, bedroom_max, bathroom_min, recommended_litres_min, recommended_litres_max, notes) VALUES (?, ?, ?, ?, ?, ?, ?)', args: ['cyl_5_plus', 5, 99, 2, 300, 350, '5+ bedrooms + 2+ bathrooms → 300L+'] },

    // 9. RADIATOR RATIO & CAPACITY BANDS
    {
      sql: `
        INSERT INTO radiator_ratio_configs (
          id, min_heat_kw, max_heat_kw, min_est_rads, max_est_rads,
          default_replacement_ratio_low, default_replacement_ratio_high
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: ['rad_band_1', 0.0, 5.99, 0, 2, 0.40, 0.60]
    },
    { sql: 'INSERT INTO radiator_ratio_configs (id, min_heat_kw, max_heat_kw, min_est_rads, max_est_rads, default_replacement_ratio_low, default_replacement_ratio_high) VALUES (?, ?, ?, ?, ?, ?, ?)', args: ['rad_band_2', 6.0, 9.99, 2, 4, 0.40, 0.60] },
    { sql: 'INSERT INTO radiator_ratio_configs (id, min_heat_kw, max_heat_kw, min_est_rads, max_est_rads, default_replacement_ratio_low, default_replacement_ratio_high) VALUES (?, ?, ?, ?, ?, ?, ?)', args: ['rad_band_3', 10.0, 14.99, 4, 6, 0.40, 0.60] },
    { sql: 'INSERT INTO radiator_ratio_configs (id, min_heat_kw, max_heat_kw, min_est_rads, max_est_rads, default_replacement_ratio_low, default_replacement_ratio_high) VALUES (?, ?, ?, ?, ?, ?, ?)', args: ['rad_band_4', 15.0, 99.0, 6, 8, 0.40, 0.60] },

    // 10. CONFIDENCE WEIGHT CONFIGS
    { sql: 'INSERT INTO confidence_weight_configs (id, field_key, label, max_weight) VALUES (?, ?, ?, ?)', args: ['cw_epc', 'epc_rating', 'EPC Rating', 20.0] },
    { sql: 'INSERT INTO confidence_weight_configs (id, field_key, label, max_weight) VALUES (?, ?, ?, ?)', args: ['cw_area', 'floor_area', 'EPC Floor Area m²', 20.0] },
    { sql: 'INSERT INTO confidence_weight_configs (id, field_key, label, max_weight) VALUES (?, ?, ?, ?)', args: ['cw_type', 'property_type', 'Property Type', 15.0] },
    { sql: 'INSERT INTO confidence_weight_configs (id, field_key, label, max_weight) VALUES (?, ?, ?, ?)', args: ['cw_wall', 'wall_insulation', 'Wall Insulation', 15.0] },
    { sql: 'INSERT INTO confidence_weight_configs (id, field_key, label, max_weight) VALUES (?, ?, ?, ?)', args: ['cw_roof', 'roof_insulation', 'Roof Insulation', 10.0] },
    { sql: 'INSERT INTO confidence_weight_configs (id, field_key, label, max_weight) VALUES (?, ?, ?, ?)', args: ['cw_heating', 'existing_heating_system', 'Existing Heating System', 10.0] },
    { sql: 'INSERT INTO confidence_weight_configs (id, field_key, label, max_weight) VALUES (?, ?, ?, ?)', args: ['cw_rads', 'radiator_information', 'Radiator Information', 5.0] },
    { sql: 'INSERT INTO confidence_weight_configs (id, field_key, label, max_weight) VALUES (?, ?, ?, ?)', args: ['cw_bath', 'bathroom_occupancy_signal', 'Bathroom / Occupancy Signal', 5.0] },

    // 11. PROFITABILITY RATING CONFIGS
    { sql: 'INSERT INTO profitability_rating_configs (id, grade, min_margin, max_margin, color_code) VALUES (?, ?, ?, ?, ?)', args: ['rate_aplus', 'A+', 0.35, 1.00, '#10b981'] },
    { sql: 'INSERT INTO profitability_rating_configs (id, grade, min_margin, max_margin, color_code) VALUES (?, ?, ?, ?, ?)', args: ['rate_a', 'A', 0.28, 0.3499, '#059669'] },
    { sql: 'INSERT INTO profitability_rating_configs (id, grade, min_margin, max_margin, color_code) VALUES (?, ?, ?, ?, ?)', args: ['rate_b', 'B', 0.20, 0.2799, '#3b82f6'] },
    { sql: 'INSERT INTO profitability_rating_configs (id, grade, min_margin, max_margin, color_code) VALUES (?, ?, ?, ?, ?)', args: ['rate_c', 'C', 0.12, 0.1999, '#f59e0b'] },
    { sql: 'INSERT INTO profitability_rating_configs (id, grade, min_margin, max_margin, color_code) VALUES (?, ?, ?, ?, ?)', args: ['rate_d', 'D', 0.05, 0.1199, '#f97316'] },
    { sql: 'INSERT INTO profitability_rating_configs (id, grade, min_margin, max_margin, color_code) VALUES (?, ?, ?, ?, ?)', args: ['rate_f', 'F', -1.00, 0.0499, '#ef4444'] },

    // 12. BUS RULES
    {
      sql: `
        INSERT INTO bus_rules (
          id, rule_id, description, scope_countries, standard_grant, off_gas_grant,
          developer_new_build_eligible, self_build_eligible, prior_grant_disqualifies,
          source, source_url, effective_date, review_date, version, notes, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        'bus_v2024_1', 'BUS_UK_STANDARD_2024', 'Official Boiler Upgrade Scheme (BUS) England & Wales ruleset',
        'England,Wales', 7500.00, 9000.00, 0, 1, 1, 'Ofgem / Department for Energy Security and Net Zero',
        'https://www.gov.uk/apply-boiler-upgrade-scheme', '2023-10-23', '2026-12-31', 'v2.4-2024',
        'Standard eligible ASHP: £7,500. Off-gas replacement eligible uplift: £9,000.', 1
      ]
    }
  ];

  await db.batch(batchStmts, 'write');

  await seedRuleEvidenceRegistry();
  await seedCylinders();
  await seedMasterProductCatalog();
  await seedRadiatorCatalogue();

  // Populate brand if null
  await db.run('UPDATE products SET brand = manufacturer WHERE brand IS NULL');

  console.log('Prime Energy UK database seeded successfully with secure baselines and catalogs.');
}

// Execute if run directly via CLI
if (process.argv[1]?.includes('seed.ts') || process.argv[1]?.includes('seed.js')) {
  seedDatabase();
}
