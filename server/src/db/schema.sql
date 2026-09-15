-- PRIME ENERGY UK HEAT PUMP PROFITABILITY SYSTEM
-- Relational SQLite Schema

PRAGMA foreign_keys = ON;

-- USERS & ROLES
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role_id TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- TOKEN REVOCATION (TURSO PERSISTENT)
CREATE TABLE IF NOT EXISTS revoked_tokens (
  token TEXT PRIMARY KEY,
  revoked_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_name TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL, -- CREATE, UPDATE, DELETE, OVERRIDE
  old_values TEXT,      -- JSON
  new_values TEXT,      -- JSON
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- COMMERCIAL SETTINGS (VERSIONED)
CREATE TABLE IF NOT EXISTS commercial_settings (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  target_gross_margin REAL NOT NULL DEFAULT 0.07, -- 7% Prime Energy Commercial Setting
  labour_baseline REAL NOT NULL DEFAULT 1500.00,
  lead_generation_cost REAL NOT NULL DEFAULT 300.00,
  extras_contingency REAL NOT NULL DEFAULT 200.00,
  combi_conversion_allowance REAL NOT NULL DEFAULT 500.00,
  combi_conversion_status TEXT DEFAULT 'PROVISIONAL_PENDING_CONFIRMATION',
  microbore_repipe_allowance REAL NOT NULL DEFAULT 1800.00,
  microbore_repipe_status TEXT DEFAULT 'PROVISIONAL_PENDING_CONFIRMATION',
  active INTEGER DEFAULT 1,
  effective_from DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT,
  notes TEXT
);

-- TAX & VAT RULES
CREATE TABLE IF NOT EXISTS tax_rules (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  rate REAL NOT NULL, -- e.g. 0.0 for 0% domestic energy efficiency installation
  effective_date DATE NOT NULL,
  active INTEGER DEFAULT 1,
  notes TEXT
);

-- PRODUCT CATALOG
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  family TEXT NOT NULL,          -- ASHP, CYLINDER, RADIATOR, ACCESSORY, PIPE
  brand TEXT,                    -- Commercial brand name (e.g. Daikin, Mitsubishi, Vaillant)
  manufacturer TEXT NOT NULL,    -- Legal manufacturer name
  product_family TEXT,           -- Hierarchy: Product series (e.g. Ecodan PUZ-WM, aroTHERM Plus, Vitocal 150-A)
  model TEXT NOT NULL,           -- Exact manufacturer model code
  sku TEXT,                      -- Retailer / City Plumbing SKU or part code
  category TEXT,                 -- Included, Required, Recommended, Optional, Installation-dependent
  product_type TEXT DEFAULT 'Air-to-water ASHP', -- Air-to-water ASHP, Ground-source, Exhaust-air DHW, etc.
  system_type TEXT DEFAULT 'Monobloc',          -- Monobloc, Split, Unknown
  nominal_capacity REAL,         -- Maintained for backwards-compatibility
  marketing_nominal_kw REAL,     -- Marketing capacity name (e.g. 8.0 kW)
  rated_output_at_design REAL,   -- Maintained for backwards-compatibility
  rated_output_kw REAL,          -- Actual certified output at design condition (e.g. 7.2 kW at -2°C / 45°C flow)
  rated_output_condition TEXT,   -- Specific test condition, e.g. 'A-2/W45', 'A-3/W50', 'A-7/W35'
  design_temperature REAL,       -- Design ambient temperature in °C (e.g. -2, -3)
  flow_temperature REAL,         -- Design flow temperature in °C (e.g. 45, 50, 55)
  capacity_source TEXT,          -- Certification or manufacturer datasheet source
  capacity_source_url TEXT,      -- Source link for performance data
  refrigerant TEXT,              -- R290, R32, R410A, Other, Unknown
  phase INTEGER DEFAULT 1,       -- 1 (Single-Phase 230V) or 3 (Three-Phase 400V)
  electrical_requirements TEXT,  -- Minimum breaker/supply rating
  specifications TEXT,           -- JSON (dimensions, sound power, weight, connections)
  product_source TEXT,           -- Retailer or trade distributor source
  source_date DATE,              -- Date specification was collected
  -- MCS Product Certification
  mcs_status TEXT DEFAULT 'UNCLEAR', -- MCS_CERTIFIED, NOT_FOUND, UNCLEAR
  mcs_product_name TEXT,         -- Exact certified product name in MCS directory
  mcs_manufacturer TEXT,         -- Exact manufacturer in MCS directory
  mcs_product_reference TEXT,    -- MCS certificate / product reference (e.g. MCS HP0002)
  mcs_directory_url TEXT,        -- Official MCS directory URL
  mcs_verification_date DATE,    -- Date MCS directory checked
  mcs_standard_version TEXT,     -- e.g. MCS 007 / MIS 3005-D v2.0
  mcs_notes TEXT,                -- Any discrepancy between retailer/manufacturer and MCS naming
  -- Ofgem Boiler Upgrade Scheme (BUS) Eligibility
  ofgem_pel_status TEXT DEFAULT 'NOT_CHECKED', -- PEL_LISTED, NOT_LISTED, NOT_CHECKED, UNCLEAR
  ofgem_pel_version TEXT,        -- Version/quarter of Ofgem Product Eligibility List
  ofgem_source_url TEXT,         -- Official Ofgem PEL source link
  bus_product_eligibility_status TEXT DEFAULT 'NOT_VERIFIED', -- VERIFIED, NOT_VERIFIED, NOT_ELIGIBLE, MANUAL_REVIEW
  -- Quality Governance & Review
  data_confidence TEXT DEFAULT 'MEDIUM', -- HIGH, MEDIUM, LOW, MANUAL_REVIEW
  manual_review_required INTEGER DEFAULT 0, -- 1 if requires manual review before recommendation
  verification_status TEXT DEFAULT 'PROVISIONAL', -- VERIFIED, CONFLICT_REVIEW, PROVISIONAL, FLAGGED, NOT_FOUND, UNVERIFIED
  conflict_notes TEXT,           -- Document technical or pricing discrepancies for manual review
  -- Technical & Sizing Explicit Fields
  manufacturer_url TEXT,         -- Official manufacturer product URL
  technical_datasheet_url TEXT,  -- Direct technical specification / datasheet PDF
  manufacturer_product_url TEXT, -- Verified direct manufacturer product page URL
  technical_manual_url TEXT,     -- Verified direct/official technical manual PDF URL
  brochure_url TEXT,             -- Verified direct/official brochure PDF URL
  mcs_product_url TEXT,          -- Verified direct MCS Product Directory URL
  mcs_certificate_number TEXT,   -- Verified MCS certificate number (e.g. HP0289/05)
  source_verification_date TEXT, -- Date source verification was executed (e.g. '2026-09-14')
  source_verification_status TEXT DEFAULT 'PROVISIONAL', -- VERIFIED, UNVERIFIED, NOT_FOUND, FAKE_REMOVED, CONFLICT_REVIEW
  -- ASHP Performance Outputs at Key Test Points
  scop REAL,                     -- Seasonal Coefficient of Performance
  cop REAL,                      -- Rated COP at A7/W35
  output_a_minus_7_w35 REAL,     -- Heating output at -7°C ambient / 35°C flow (kW)
  output_a7_w45 REAL,            -- Heating output at 7°C ambient / 45°C flow (kW)
  output_w55 REAL,               -- Heating output at 55°C flow (kW)
  -- Cylinder Explicit Fields
  exact_capacity_litres REAL,    -- EXACT cylinder volume in litres
  height_mm INTEGER,             -- Height in mm
  diameter_mm INTEGER,           -- Diameter / width in mm
  depth_mm INTEGER,              -- Depth in mm
  cylinder_type TEXT,            -- Unvented Indirect, Unvented Slimline, Integrated HP Cylinder, Direct
  coil_area_m2 REAL,             -- Heat exchanger coil surface area in m²
  heat_pump_compatible INTEGER DEFAULT 1, -- 1 if dedicated high-gain heat pump coil
  compatible_ashp TEXT,          -- Compatible ASHP brands or 'All ASHP'
  -- Radiator Explicit Fields
  radiator_type TEXT,            -- K1, K2, P+
  length_mm INTEGER,             -- Length in mm
  output_w_delta_t50 REAL,       -- Rated heat output in Watts at ΔT50
  output_w_low_temp REAL,        -- Low temperature heat output in Watts (e.g. at ΔT30)
  output_w_delta_t30 REAL,       -- Heat output in Watts at ΔT30 (heat pump design)
  output_w_delta_t40 REAL,       -- Heat output in Watts at ΔT40
  output_w_delta_t45 REAL,       -- Heat output in Watts at ΔT45
  -- Commercial Supplier & Pricing Explicit Snapshot Fields
  supplier TEXT,                 -- Primary verified supplier (City Plumbing, MWPHS, The Heat Pump Warehouse, etc.)
  supplier_sku TEXT,             -- Supplier SKU / part code
  price_ex_vat REAL,             -- Price excluding VAT (£)
  price_inc_vat REAL,            -- Price including VAT (£)
  price_source_url TEXT,         -- Direct merchant / supplier product URL
  price_date TEXT,               -- Date price was verified (e.g. '2026-09-14')
  notes TEXT,                    -- General product notes & audit remarks
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- PRODUCT PRICE HISTORY & MULTIPLE SOURCES
CREATE TABLE IF NOT EXISTS product_prices (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  supplier TEXT NOT NULL,        -- City Plumbing, Wolseley, Plumbase, Manufacturer, Internal
  source_type TEXT NOT NULL DEFAULT 'CITY_PLUMBING', -- CITY_PLUMBING, MANUFACTURER, UK_SUPPLIER, INTERNAL, MANUAL
  source_url TEXT,               -- Exact product listing URL
  price_basis TEXT DEFAULT 'EX_VAT', -- EX_VAT, INC_VAT, UNKNOWN
  supplier_sku TEXT,             -- Supplier SKU / order code
  date_collected DATE NOT NULL,
  price_date DATE,               -- Price date captured
  price_captured_at DATETIME,
  price_ex_vat REAL,             -- Selling / Reference price ex VAT (NULL if not exposed)
  price_inc_vat REAL,            -- Selling / Reference price inc VAT (NULL if not exposed)
  vat_rate REAL DEFAULT 0.0,
  source_price REAL,             -- Captured supplier raw price
  source_vat_basis TEXT DEFAULT 'EX_VAT', -- EX_VAT, INC_VAT, UNKNOWN
  normalized_ex_vat_price REAL,  -- Price normalized to EX VAT
  normalization_method TEXT DEFAULT 'VERIFIED_EX_VAT', -- DIRECT_EX_VAT, DIVIDE_BY_1_POINT_20, VAT_STATUS_UNVERIFIED
  normalization_confidence TEXT DEFAULT 'HIGH', -- HIGH, MEDIUM, UNVERIFIED
  currency TEXT DEFAULT 'GBP',
  unit TEXT DEFAULT 'EACH',
  availability TEXT DEFAULT 'In stock', -- In stock, Available to order, Out of stock, Unknown
  valid_from DATETIME,
  valid_to DATETIME,
  confidence TEXT NOT NULL,      -- MARKET_CONFIRMED, PROVISIONAL, PRICE_REQUIRED
  is_current INTEGER DEFAULT 1,  -- 1 for current active price per source
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_products_family ON products(family);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_rated_output ON products(rated_output_kw);
CREATE INDEX IF NOT EXISTS idx_products_mcs ON products(mcs_status);
CREATE INDEX IF NOT EXISTS idx_products_pel ON products(ofgem_pel_status);
CREATE INDEX IF NOT EXISTS idx_product_prices_prod ON product_prices(product_id, is_current);
CREATE INDEX IF NOT EXISTS idx_product_prices_source ON product_prices(source_type);

-- COMPATIBILITY, REQUIREMENT, & QUANTITY RULES (BOM ENGINE)
CREATE TABLE IF NOT EXISTS requirement_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  condition_type TEXT NOT NULL, -- CYLINDER_UNVENTED, ASHP_THREE_PHASE, MICROBORE_DETECTED, COMBI_CONVERSION
  trigger_field TEXT NOT NULL,
  trigger_operator TEXT NOT NULL, -- EQUALS, IN, GREATER_THAN
  trigger_value TEXT NOT NULL,
  action_type TEXT NOT NULL,     -- REQUIRE_PRODUCT, APPLY_ALLOWANCE, FLAG_RISK, TRIGGER_LABOUR
  target_product_id TEXT,
  target_allowance_code TEXT,
  quantity_formula TEXT,
  description TEXT NOT NULL,
  active INTEGER DEFAULT 1
);

-- ESTIMATION CONFIG TABLES
CREATE TABLE IF NOT EXISTS epc_baselines (
  id TEXT PRIMARY KEY,
  epc_band TEXT NOT NULL UNIQUE,
  w_per_m2 REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS fallback_insulation_tables (
  id TEXT PRIMARY KEY,
  condition_key TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  w_per_m2 REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS property_multipliers (
  id TEXT PRIMARY KEY,
  property_type TEXT NOT NULL UNIQUE,
  multiplier REAL NOT NULL,
  manual_review_flag INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cylinder_sizing_rules (
  id TEXT PRIMARY KEY,
  bedroom_min INTEGER NOT NULL,
  bedroom_max INTEGER NOT NULL,
  bathroom_min INTEGER DEFAULT 1,
  recommended_litres_min INTEGER NOT NULL,
  recommended_litres_max INTEGER NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS radiator_ratio_configs (
  id TEXT PRIMARY KEY,
  min_heat_kw REAL,
  max_heat_kw REAL,
  min_est_rads INTEGER,
  max_est_rads INTEGER,
  default_replacement_ratio_low REAL DEFAULT 0.40,
  default_replacement_ratio_high REAL DEFAULT 0.60
);

-- CONFIDENCE WEIGHTS
CREATE TABLE IF NOT EXISTS confidence_weight_configs (
  id TEXT PRIMARY KEY,
  field_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  max_weight REAL NOT NULL
);

-- PROFITABILITY RATING CONFIG
CREATE TABLE IF NOT EXISTS profitability_rating_configs (
  id TEXT PRIMARY KEY,
  grade TEXT NOT NULL UNIQUE,
  min_margin REAL NOT NULL,
  max_margin REAL,
  color_code TEXT
);

-- BUS RULES (VERSIONED)
CREATE TABLE IF NOT EXISTS bus_rules (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  scope_countries TEXT NOT NULL, -- e.g. "England,Wales"
  standard_grant REAL NOT NULL DEFAULT 7500.00,
  off_gas_grant REAL NOT NULL DEFAULT 9000.00,
  developer_new_build_eligible INTEGER DEFAULT 0,
  self_build_eligible INTEGER DEFAULT 1,
  prior_grant_disqualifies INTEGER DEFAULT 1,
  source TEXT NOT NULL,
  source_url TEXT NOT NULL,
  effective_date DATE NOT NULL,
  review_date DATE,
  version TEXT NOT NULL,
  notes TEXT,
  active INTEGER DEFAULT 1
);

-- LEADS & PROPERTIES
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  reference_no TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  lead_source TEXT,
  status TEXT DEFAULT 'NEW', -- NEW, ESTIMATED, SURVEY_SCHEDULED, SURVEYED, QUOTED, WON, LOST
  assigned_to TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS properties (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL UNIQUE,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  postcode TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'England',
  epc_rating TEXT,
  epc_floor_area REAL,
  property_type TEXT NOT NULL,     -- Detached, Semi detached, End terrace, Mid terrace, Bungalow, Flat
  property_status TEXT NOT NULL,   -- Existing property, Developer new-build, Self-build
  bedrooms INTEGER,
  bathrooms INTEGER,
  ownership TEXT,                  -- Owner-occupier, Landlord, Tenant
  wall_insulation TEXT,            -- Insulated, Uninsulated, Unknown
  roof_insulation TEXT,            -- Insulated, Uninsulated, Unknown
  existing_heating_system TEXT,
  boiler_type TEXT,                -- Combi, System, Regular, Unknown
  on_off_gas_grid TEXT,            -- On gas grid, Off gas grid
  existing_cylinder_details TEXT,
  cylinder_space TEXT,             -- Yes, No, Unknown
  existing_radiator_count INTEGER,
  existing_radiator_details TEXT,
  existing_pipework TEXT,          -- Standard 15mm+, Microbore 10mm or less, Unknown
  previous_government_grant TEXT,  -- None, BUS, RHI, Unknown
  fuse_board_condition TEXT,       -- Modern, Old, Unknown
  conservation_area TEXT,          -- Yes, No, Unknown
  boundary_planning_risk TEXT,     -- Yes, No, Unknown
  listed_building TEXT,            -- Yes, No, Unknown
  sales_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

-- SURVEY & DESIGN INPUTS (MODE B)
CREATE TABLE IF NOT EXISTS survey_design_inputs (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  surveyor_user_id TEXT,
  confirmed_design_heat_loss REAL NOT NULL, -- kW
  design_outdoor_temp REAL NOT NULL,        -- e.g. -2 or -3
  design_flow_temp REAL NOT NULL,           -- e.g. 45 or 50
  selected_ashp_id TEXT NOT NULL,
  selected_cylinder_id TEXT,
  exact_radiators_schedule TEXT,            -- JSON array
  exact_pipework_schedule TEXT,             -- JSON array
  electrical_works_cost REAL DEFAULT 0.0,
  surveyor_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id),
  FOREIGN KEY (selected_ashp_id) REFERENCES products(id)
);

-- QUOTES & JOBS
CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  quote_reference TEXT NOT NULL UNIQUE,
  lead_id TEXT NOT NULL,
  mode TEXT NOT NULL, -- NEW_LEAD, AFTER_SURVEY
  total_job_cost REAL NOT NULL,
  bus_grant REAL NOT NULL,
  required_revenue REAL NOT NULL,
  customer_contribution REAL NOT NULL,
  actual_revenue REAL NOT NULL,
  gross_profit REAL NOT NULL,
  gross_margin_percent REAL NOT NULL,
  confidence_score REAL,
  confidence_level TEXT, -- HIGH, MEDIUM, LOW, SURVEY_CONFIRMED
  profitability_grade TEXT, -- A+, A, B, C, D, F
  commercial_recommendation TEXT NOT NULL,
  status TEXT DEFAULT 'DRAFT', -- DRAFT, SENT, ACCEPTED, REJECTED
  manual_override INTEGER DEFAULT 0,
  override_reason TEXT,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

-- QUOTE LINE ITEMS
CREATE TABLE IF NOT EXISTS quote_line_items (
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL,
  product_id TEXT,
  category TEXT NOT NULL, -- ASHP, CYLINDER, RADIATORS, PIPEWORK, ACCESSORIES, LABOUR, LEAD_GEN, CONTINGENCY
  description TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_cost_ex_vat REAL NOT NULL,
  total_cost_ex_vat REAL NOT NULL,
  vat_rate REAL DEFAULT 0.0,
  total_cost_inc_vat REAL NOT NULL,
  FOREIGN KEY (quote_id) REFERENCES quotes(id)
);

-- IMMUTABLE CALCULATION SNAPSHOTS
CREATE TABLE IF NOT EXISTS calculation_snapshots (
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL UNIQUE,
  quote_reference TEXT NOT NULL,
  timestamp DATETIME NOT NULL,
  user_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  inputs_json TEXT NOT NULL,
  products_json TEXT NOT NULL,
  prices_json TEXT NOT NULL,
  ruleset_versions_json TEXT NOT NULL,
  commercial_settings_json TEXT NOT NULL,
  outputs_json TEXT NOT NULL,
  FOREIGN KEY (quote_id) REFERENCES quotes(id)
);

-- AUTHORITATIVE RULE EVIDENCE REGISTRY
CREATE TABLE IF NOT EXISTS rule_evidence (
  id TEXT PRIMARY KEY,
  rule_id TEXT UNIQUE NOT NULL,
  rule_name TEXT NOT NULL,
  category TEXT NOT NULL, -- BUS, MCS, EPC_SAP, HEAT_DEMAND, ASHP_SELECTION, CYLINDER, RADIATORS, ACCESSORIES, PIPEWORK, COMMERCIAL, VAT, RATING, CONFIDENCE
  rule_value TEXT NOT NULL,
  authority TEXT NOT NULL, -- GOV.UK / Ofgem / MCS / HMRC / Prime Energy / Heuristic Estimation
  source_url TEXT,
  source_document TEXT,
  source_version TEXT,
  evidence_reference TEXT, -- Section / Page / Notice / Statutory Instrument
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  last_verified_at TEXT NOT NULL,
  verification_status TEXT NOT NULL, -- VERIFIED_OFFICIAL, PRIME_CONFIG, ESTIMATION_HEURISTIC, SOURCE_REQUIRED, SUPERSEDED
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rule_evidence_category ON rule_evidence(category);
CREATE INDEX IF NOT EXISTS idx_rule_evidence_status ON rule_evidence(verification_status);

-- DATA-DRIVEN DOMESTIC RADIATOR CATALOGUE (AUDITED SUPPLIER REGISTRY)
CREATE TABLE IF NOT EXISTS radiator_catalogue (
  id TEXT PRIMARY KEY,
  radiator_type TEXT NOT NULL,                -- K1, P+, K2
  height_mm INTEGER NOT NULL,
  length_mm INTEGER NOT NULL,
  requested_height_mm INTEGER NOT NULL,
  requested_length_mm INTEGER NOT NULL,
  source_title_dimensions TEXT NOT NULL,
  normalized_height_mm INTEGER NOT NULL,
  normalized_length_mm INTEGER NOT NULL,
  dimension_match_type TEXT NOT NULL,         -- EXACT_TITLE_ORDER, REVERSED_NORMALIZED
  dimension_validation_status TEXT NOT NULL,  -- PASS, FAIL
  manufacturer TEXT NOT NULL,
  product_name TEXT NOT NULL,
  sku TEXT,
  heat_output_watts REAL,
  source_btu REAL,
  source_heat_output_w REAL,
  output_test_condition TEXT,
  output_source_url TEXT,
  supplier TEXT NOT NULL DEFAULT 'City Plumbing',
  verification_type TEXT NOT NULL DEFAULT 'SUPPLIER_CATALOGUE',
  supplier_verification_status TEXT NOT NULL DEFAULT 'VERIFIED_CURRENT', -- VERIFIED_CURRENT, SOURCE_REQUIRED
  verification_status TEXT NOT NULL DEFAULT 'SUPPLIER_VERIFIED',        -- SUPPLIER_VERIFIED, SOURCE_REQUIRED
  city_plumbing_price REAL,
  source_price REAL,
  source_vat_basis TEXT NOT NULL DEFAULT 'INC_VAT', -- INC_VAT, EX_VAT, UNKNOWN
  normalized_ex_vat_price REAL,
  normalization_method TEXT NOT NULL,        -- DIVIDE_BY_1_POINT_20, DIRECT_EX_VAT, VAT_STATUS_UNVERIFIED
  vat_evidence_source TEXT NOT NULL,
  source_page_evidence TEXT,
  captured_vat_wording TEXT,
  vat_evidence_timestamp TEXT,
  vat_rate_percent REAL,
  pricing_confidence TEXT NOT NULL,          -- CONFIRMED_20_PCT_VAT, HIGH, SOURCE_REQUIRED
  source_count INTEGER NOT NULL DEFAULT 1,
  source_url TEXT,
  is_three_source_averaged INTEGER NOT NULL DEFAULT 0,
  source_price_1 REAL,
  source_price_2 REAL,
  source_price_3 REAL,
  source_sku_1 TEXT,
  source_sku_2 TEXT,
  source_sku_3 TEXT,
  source_url_1 TEXT,
  source_url_2 TEXT,
  source_url_3 TEXT,
  source_product_1 TEXT,
  source_product_2 TEXT,
  source_product_3 TEXT,
  selected_manufacturer TEXT,
  selected_model TEXT,
  selected_sku TEXT,
  selection_rationale TEXT,
  commercial_review_required INTEGER NOT NULL DEFAULT 0,
  commercial_review_reason TEXT,
  source_metadata_json TEXT,
  source_checked_at DATE NOT NULL,
  pricing_notes TEXT,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(radiator_type, height_mm, length_mm)
);

CREATE INDEX IF NOT EXISTS idx_radiator_type ON radiator_catalogue(radiator_type);
CREATE INDEX IF NOT EXISTS idx_radiator_dims ON radiator_catalogue(height_mm, length_mm);
CREATE INDEX IF NOT EXISTS idx_radiator_supplier_status ON radiator_catalogue(supplier_verification_status);
CREATE INDEX IF NOT EXISTS idx_radiator_review ON radiator_catalogue(commercial_review_required);

