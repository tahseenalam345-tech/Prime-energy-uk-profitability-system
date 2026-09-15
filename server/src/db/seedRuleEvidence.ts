import { db, initDatabase } from './connection.js';

export interface RuleEvidenceRecord {
  id: string;
  rule_id: string;
  rule_name: string;
  category: 'BUS' | 'MCS' | 'EPC_SAP' | 'HEAT_DEMAND' | 'ASHP_SELECTION' | 'CYLINDER' | 'RADIATORS' | 'ACCESSORIES' | 'PIPEWORK' | 'COMMERCIAL' | 'VAT' | 'RATING' | 'CONFIDENCE';
  rule_value: string;
  authority: string;
  source_url: string;
  source_document: string;
  source_version: string;
  evidence_reference: string;
  effective_from: string;
  effective_to?: string | null;
  last_verified_at: string;
  verification_status: 'VERIFIED_OFFICIAL_CURRENT' | 'PRIME_CONFIG' | 'ESTIMATION_HEURISTIC' | 'SOURCE_REQUIRED' | 'HISTORICAL' | 'UNVERIFIED';
  notes: string;
}

export const OFFICIAL_RULE_REGISTRY: RuleEvidenceRecord[] = [
  // 1. BUS Standard Grant £7,500
  {
    id: 'rule_bus_ashp_std_7500',
    rule_id: 'BUS_ASHP_STANDARD_GRANT',
    rule_name: 'Boiler Upgrade Scheme Standard ASHP Grant (£7,500)',
    category: 'BUS',
    rule_value: '£7,500 statutory voucher deduction for eligible domestic Air Source Heat Pump installations replacing existing fossil fuel heating',
    authority: 'GOV.UK / Department for Energy Security and Net Zero (DESNZ) / Ofgem',
    source_url: 'https://www.gov.uk/apply-boiler-upgrade-scheme',
    source_document: 'GOV.UK Notice of Approved Grant Categories and Values for BUS & Ofgem BUS Installer Guidance V5.1',
    source_version: 'V5.1 / 21 July 2026 Notice',
    evidence_reference: 'Schedule 1, Category A (Air-to-water heat pump approved value £7,500)',
    effective_from: '2026-07-21',
    effective_to: null,
    last_verified_at: '2026-09-12',
    verification_status: 'VERIFIED_OFFICIAL_CURRENT',
    notes: 'Current statutory voucher deduction for domestic air source heat pump installations in England and Wales.'
  },

  // 2. BUS Off-Gas Oil & LPG Replacement £9,000 Approved Category
  {
    id: 'rule_bus_off_gas_oil_lpg_9000',
    rule_id: 'BUS_OFF_GAS_OIL_LPG_9000',
    rule_name: 'BUS Off-Gas Oil & LPG Replacement Grant Category (£9,000)',
    category: 'BUS',
    rule_value: '£9,000 approved grant value for eligible domestic Air Source Heat Pumps installed in off-gas grid properties replacing existing oil or LPG boilers',
    authority: 'GOV.UK / Department for Energy Security and Net Zero (DESNZ) / Ofgem',
    source_url: 'https://www.gov.uk/guidance/check-if-you-can-get-a-grant-to-upgrade-your-boiler',
    source_document: 'GOV.UK Notice of Approved Grant Categories and Values for BUS (Updated 21 July 2026)',
    source_version: 'V5.1 / 21 July 2026 Notice',
    evidence_reference: 'Section 2, Category B (Off-gas oil/LPG replacement approved grant value £9,000)',
    effective_from: '2026-07-21',
    effective_to: null,
    last_verified_at: '2026-09-12',
    verification_status: 'VERIFIED_OFFICIAL_CURRENT',
    notes: 'Approved grant value under current 21 July 2026 Notice: Off-gas property replacing existing oil or LPG heating with an air-to-water ASHP qualifies for £9,000. Decommissioning evidence and photographic proof of fuel tank disconnection required for voucher redemption.'
  },

  // 3. BUS Ground Source Heat Pump £9,000 Standard Grant
  {
    id: 'rule_bus_gshp_9000',
    rule_id: 'BUS_GSHP_GRANT_9000',
    rule_name: 'Boiler Upgrade Scheme Ground Source Heat Pump Grant (£9,000)',
    category: 'BUS',
    rule_value: '£9,000 statutory voucher grant for eligible domestic Ground Source Heat Pump (GSHP) installations',
    authority: 'GOV.UK / Ofgem',
    source_url: 'https://www.ofgem.gov.uk/guidance/boiler-upgrade-scheme-guidance-installers',
    source_document: 'Ofgem Boiler Upgrade Scheme: Guidance for Installers V5.1',
    source_version: 'V5.1 / 21 July 2026 Notice',
    evidence_reference: 'Chapter 3, Paragraph 3.8 (GSHP approved grant value £9,000)',
    effective_from: '2026-07-21',
    effective_to: null,
    last_verified_at: '2026-09-12',
    verification_status: 'VERIFIED_OFFICIAL_CURRENT',
    notes: 'Standard approved grant value for ground source installations across all fuel types.'
  },

  // 4. BUS Developer New-Build Exclusion & Self-Build Exemption
  {
    id: 'rule_bus_new_build_restriction',
    rule_id: 'BUS_NEW_BUILD_RESTRICTION',
    rule_name: 'Developer New-Build Property Ineligibility & Self-Build Exemption',
    category: 'BUS',
    rule_value: 'Commercial developer new-build properties are strictly ineligible for BUS funding; custom self-build properties qualify with completion certificates and financing proof',
    authority: 'Ofgem',
    source_url: 'https://www.ofgem.gov.uk/publications/boiler-upgrade-scheme-guidance-installers',
    source_document: 'Ofgem Boiler Upgrade Scheme: Guidance for Installers V5.1',
    source_version: 'V5.1',
    evidence_reference: 'Chapter 2, Paragraphs 2.14–2.18 (New-build exclusion & custom self-build rules)',
    effective_from: '2026-07-21',
    effective_to: null,
    last_verified_at: '2026-09-12',
    verification_status: 'VERIFIED_OFFICIAL_CURRENT',
    notes: 'Developer new-builds must meet Building Regulations Part L without public grant assistance. Self-builds are eligible with local authority sign-off.'
  },

  // 5. MCS Room-by-Room Heat Loss Requirement (MIS 3005-D: 2025 Issue 2.0)
  {
    id: 'rule_mcs_mis3005d_room_loss',
    rule_id: 'MCS_MIS_3005_D_ROOM_HEAT_LOSS',
    rule_name: 'MCS Room-by-Room Heat Loss Calculation Standard (MIS 3005-D)',
    category: 'MCS',
    rule_value: 'MCS certified heat pump installations require room-by-room heat loss calculations in accordance with BS EN 12831-1:2017',
    authority: 'Microgeneration Certification Scheme (MCS)',
    source_url: 'https://mcscertified.com/standards-library/',
    source_document: 'MIS 3005-D: 2025 (The Heat Pump Standard - Design)',
    source_version: 'Issue 2.0 (Date: 05/12/2025, PDF: MIS-3005-D-2025-V2.0-Final.pdf)',
    evidence_reference: 'Clause 3.4.1(a) — Heat load calculation / BS EN 12831-1:2017',
    effective_from: '2025-12-05',
    effective_to: null,
    last_verified_at: '2026-09-12',
    verification_status: 'VERIFIED_OFFICIAL_CURRENT',
    notes: 'Current production authority for heat pump design: MIS 3005-D: 2025 Issue 2.0 Clause 3.4.1(a) mandates heat load calculation carried out in accordance with BS EN 12831-1:2017. Whole-building estimates prohibited for final MCS design.'
  },

  // 6. MCS Design External Temperature Requirement (MIS 3005-D: 2025 Issue 2.0)
  {
    id: 'rule_mcs_mis3005d_ext_temp',
    rule_id: 'MCS_MIS_3005_D_DESIGN_EXT_TEMP',
    rule_name: 'MCS Design External Temperature Standard (MIS 3005-D)',
    category: 'MCS',
    rule_value: 'Heat pump design must use UK external design temperatures at 99% and 99.6% based on Table 2 for the property geographical location',
    authority: 'Microgeneration Certification Scheme (MCS)',
    source_url: 'https://mcscertified.com/standards-library/',
    source_document: 'MIS 3005-D: 2025 (The Heat Pump Standard - Design)',
    source_version: 'Issue 2.0 (Date: 05/12/2025, PDF: MIS-3005-D-2025-V2.0-Final.pdf)',
    evidence_reference: 'Table 2 — UK external design temperatures at 99% and 99.6%',
    effective_from: '2025-12-05',
    effective_to: null,
    last_verified_at: '2026-09-12',
    verification_status: 'VERIFIED_OFFICIAL_CURRENT',
    notes: 'Specifies UK external design temperatures at 99% and 99.6% meteorological data from Table 2 of MIS 3005-D: 2025 Issue 2.0.'
  },

  // 7. MCS Sizing and Capacity Matching Requirement (MIS 3005-D: 2025 Issue 2.0)
  {
    id: 'rule_mcs_mis3005d_sizing_output',
    rule_id: 'MCS_MIS_3005_D_SIZING_OUTPUT',
    rule_name: 'MCS Heat Pump Capacity Matching Standard (MIS 3005-D)',
    category: 'ASHP_SELECTION',
    rule_value: 'Heat pump selected to provide at least 100% of calculated heat load at design external and flow temperature, supported by manufacturer and emitter-system performance data',
    authority: 'Microgeneration Certification Scheme (MCS)',
    source_url: 'https://mcscertified.com/standards-library/',
    source_document: 'MIS 3005-D: 2025 (The Heat Pump Standard - Design)',
    source_version: 'Issue 2.0 (Date: 05/12/2025, PDF: MIS-3005-D-2025-V2.0-Final.pdf)',
    evidence_reference: 'Clause 3.4.1(e) — Heat pump selected to provide at least 100% of calculated heat load, considering flow temperature and manufacturer/emitter data',
    effective_from: '2025-12-05',
    effective_to: null,
    last_verified_at: '2026-09-12',
    verification_status: 'VERIFIED_OFFICIAL_CURRENT',
    notes: 'MIS 3005-D: 2025 Issue 2.0 Clause 3.4.1(e) mandates heat pump selected to provide at least 100% of calculated heat load considering flow temperature, supported by manufacturer and emitter-system performance data.'
  },

  // 8. MCS Emitter and Low Flow Temperature Standard (MIS 3005-D: 2025 Issue 2.0)
  {
    id: 'rule_mcs_mis3005d_emitters',
    rule_id: 'MCS_MIS_3005_D_EMITTER_FLOW_TEMP',
    rule_name: 'MCS Emitter Sizing and Flow Temperature Standard (MIS 3005-D)',
    category: 'RADIATORS',
    rule_value: 'High-temperature heat pumps should be avoided unless >55°C is required; if >55°C is proposed, an alternative ≤55°C design should also be provided',
    authority: 'Microgeneration Certification Scheme (MCS)',
    source_url: 'https://mcscertified.com/standards-library/',
    source_document: 'MIS 3005-D: 2025 (The Heat Pump Standard - Design)',
    source_version: 'Issue 2.0 (Date: 05/12/2025, PDF: MIS-3005-D-2025-V2.0-Final.pdf)',
    evidence_reference: 'Clause 3.4.4 & Clause 3.4.5 — High-temperature heat pumps avoided unless >55°C required; alternative ≤55°C design required',
    effective_from: '2025-12-05',
    effective_to: null,
    last_verified_at: '2026-09-12',
    verification_status: 'VERIFIED_OFFICIAL_CURRENT',
    notes: 'Clause 3.4.4: High-temperature heat pumps should be avoided unless >55°C is required. Clause 3.4.5: If >55°C is proposed, an alternative ≤55°C design should also be provided.'
  },

  // 9. Historical MCS Standard (MIS 3005-D v1.0 2021) — Superseded
  {
    id: 'rule_mcs_mis3005d_v1_hist',
    rule_id: 'MCS_MIS_3005_D_V1_HISTORICAL',
    rule_name: 'MCS MIS 3005-D Version 1.0 (Historical 2021 Standard — Superseded)',
    category: 'MCS',
    rule_value: 'Historical 2021 heat pump design standard; superseded by Issue 2.0 (05/12/2025)',
    authority: 'Microgeneration Certification Scheme (MCS)',
    source_url: 'https://mcscertified.com/standards-library/',
    source_document: 'MIS 3005-D: The Heat Pump Standard (Design) v1.0 (2021)',
    source_version: 'Version 1.0 (Historical 2021 Issue)',
    evidence_reference: 'Superseded 2021 Clauses (Superseded by Issue 2.0 on 05/12/2025)',
    effective_from: '2021-12-16',
    effective_to: '2025-12-04',
    last_verified_at: '2026-09-12',
    verification_status: 'HISTORICAL',
    notes: 'Historical standard. Retained in registry for audit traceability; superseded by MIS 3005-D: 2025 Issue 2.0 on 05/12/2025.'
  },

  // 10. MCS Product Directory Verification Rule
  {
    id: 'rule_mcs_product_directory',
    rule_id: 'MCS_PRODUCT_DIRECTORY',
    rule_name: 'MCS Certified Product Directory Verification',
    category: 'MCS',
    rule_value: 'Heat pump model must hold active certification in the MCS Product Directory with traceable certificate reference (e.g. MCS HP00xx)',
    authority: 'MCS / Gemserv',
    source_url: 'https://mcscertified.com/product-directory/',
    source_document: 'MCS Product Certification Scheme Requirements (MCS 007)',
    source_version: 'Live Directory 2026',
    evidence_reference: 'MCS 007 Testing Standard',
    effective_from: '2010-01-01',
    effective_to: null,
    last_verified_at: '2026-09-12',
    verification_status: 'VERIFIED_OFFICIAL_CURRENT',
    notes: 'All approved models verified against active MCS directory certificates.'
  },

  // 11. Ofgem BUS Product Eligibility List (PEL) Schedule
  {
    id: 'rule_ofgem_pel_schedule',
    rule_id: 'OFGEM_PEL_SCHEDULE',
    rule_name: 'Ofgem BUS Product Eligibility List (PEL)',
    category: 'BUS',
    rule_value: 'Equipment model must appear on the active Ofgem Product Eligibility List to be approved for BUS grant redemption',
    authority: 'Ofgem',
    source_url: 'https://www.ofgem.gov.uk/publications/boiler-upgrade-scheme-product-eligibility',
    source_document: 'Ofgem Boiler Upgrade Scheme Product Eligibility List',
    source_version: 'Q3 2026 Schedule',
    evidence_reference: 'Air-to-Water Technology Schedule',
    effective_from: '2026-07-01',
    effective_to: null,
    last_verified_at: '2026-09-12',
    verification_status: 'VERIFIED_OFFICIAL_CURRENT',
    notes: 'Checked quarterly against active Ofgem PEL database.'
  },

  // 12. SAP 10.2 Annual Energy vs Peak Heat Loss Distinction
  {
    id: 'rule_epc_annual_energy_sap',
    rule_id: 'SAP_EPC_ANNUAL_ENERGY_VS_PEAK_LOAD',
    rule_name: 'SAP 10.2 Annual Space Heating Energy Interpretation',
    category: 'EPC_SAP',
    rule_value: 'Annual space heating energy kWh/year from EPC represents total annual energy delivered across seasonal degree days; it must NEVER be divided by 1,000 to infer peak heating capacity kW',
    authority: 'Building Research Establishment (BRE) / DESNZ',
    source_url: 'https://www.bregroup.com/sap/standard-assessment-procedure-sap-10/',
    source_document: 'The Government Standard Assessment Procedure for Energy Rating of Dwellings (SAP 10.2)',
    source_version: 'SAP 10.2',
    evidence_reference: 'Section 12 & Table 12',
    effective_from: '2022-06-15',
    effective_to: null,
    last_verified_at: '2026-09-12',
    verification_status: 'VERIFIED_OFFICIAL_CURRENT',
    notes: 'Statutory methodology rule. Peak kW heat loss requires steady-state calculation at peak winter delta-T, entirely distinct from annual degree-day consumption.'
  },

  // 13. Customer Installation Zero-Rate VAT
  {
    id: 'rule_hmrc_vat_zero_esm',
    rule_id: 'HMRC_ESM_VAT_ZERO',
    rule_name: 'Zero Rate VAT on Domestic Energy-Saving Materials (ESM Installation)',
    category: 'VAT',
    rule_value: '0% VAT rate applies to the installation of heat pumps and ancillary equipment in residential accommodation in the UK',
    authority: 'HM Revenue & Customs (HMRC)',
    source_url: 'https://www.gov.uk/guidance/vat-on-energy-saving-materials-and-heating-equipment-notice-7086',
    source_document: 'HMRC VAT Notice 708/6: Energy-saving materials and heating equipment',
    source_version: 'Statutory Guidance Notice (In force through March 2027)',
    evidence_reference: 'Sections 2.1 & 2.2 (Air source heat pumps zero rating)',
    effective_from: '2022-04-01',
    effective_to: '2027-03-31',
    last_verified_at: '2026-09-12',
    verification_status: 'VERIFIED_OFFICIAL_CURRENT',
    notes: 'Customer domestic installation invoice is strictly zero-rated for VAT pursuant to Value Added Tax Act 1994 Group 23.'
  },

  // 14. Supplier Purchase Price VAT Normalization (Commercial Accounting Policy)
  {
    id: 'rule_supplier_price_vat_normalization',
    rule_id: 'SUPPLIER_PRICE_VAT_NORMALIZATION',
    rule_name: 'Merchant Purchase Price VAT Normalization Rule',
    category: 'VAT',
    rule_value: 'Merchant trade purchase prices are normalized to EX VAT: where price basis is confirmed INC_VAT and standard UK 20% VAT applies, EX_VAT = INC_VAT / 1.20; where VAT basis is UNKNOWN, price is flagged UNVERIFIED and not blindly divided by 1.20',
    authority: 'Prime Energy Commercial & Procurement Governance',
    source_url: 'https://primeenergy.co.uk/commercial/procurement-vat-policy',
    source_document: 'Prime Energy Trade Procurement Accounting Policy v2.0',
    source_version: 'v2.0',
    evidence_reference: 'Section 3 — Supplier Price VAT Normalization Rule',
    effective_from: '2024-01-01',
    effective_to: null,
    last_verified_at: '2026-09-12',
    verification_status: 'PRIME_CONFIG',
    notes: 'Commercial trade procurement rule. Governs B2B input price normalization; not an HMRC statutory customer formula.'
  },

  // 15. Prime Energy True Gross Margin Formula
  {
    id: 'rule_prime_margin_formula',
    rule_id: 'PRIME_MARGIN_FORMULA',
    rule_name: 'Prime Energy True Gross Margin Pricing Formula',
    category: 'COMMERCIAL',
    rule_value: 'Required Revenue = Total Cost / (1 - Target Gross Margin); Customer Contribution = MAX(0, Required Revenue - Grant); Gross Margin = (Revenue - Total Cost) / Revenue * 100',
    authority: 'Prime Energy Commercial Operations Policy',
    source_url: 'https://primeenergy.co.uk/commercial/pricing-policy',
    source_document: 'Prime Energy Financial & Commercial Margin Governance Policy v1.0',
    source_version: 'v1.0',
    evidence_reference: 'Section 2 — True Gross Margin Formula',
    effective_from: '2024-01-01',
    effective_to: null,
    last_verified_at: '2026-09-12',
    verification_status: 'PRIME_CONFIG',
    notes: 'Standard commercial gross margin formula enforced to protect profit margins; not a statutory accounting rule.'
  },

  // 16. Domestic Hot Water Cylinder Sizing Heuristic (Prime Energy Heuristic)
  {
    id: 'rule_cylinder_sizing_heuristic',
    rule_id: 'CYLINDER_SIZING_HEURISTIC',
    rule_name: 'Domestic Hot Water Storage Sizing Heuristic',
    category: 'CYLINDER',
    rule_value: 'Indicative cylinder volume guideline: 1-2 beds = 150-180L; 3 beds = 200L; 3-4 beds (2 baths) = 250L; 5+ beds = 300L',
    authority: 'Prime Energy',
    source_url: 'https://primeenergy.co.uk/standards/cylinder-heuristics',
    source_document: 'Prime Energy Pre-Survey Estimation Guide v1.2',
    source_version: 'v1.2',
    evidence_reference: 'Section 4 — Pre-survey domestic hot water storage volume guidelines',
    effective_from: '2024-01-01',
    effective_to: null,
    last_verified_at: '2026-09-12',
    verification_status: 'ESTIMATION_HEURISTIC',
    notes: 'Internal pre-survey heuristic; survey/design overrides this.'
  },

  // 17. EPC Rating Indicative W/m² Pre-Survey Heuristic
  {
    id: 'rule_epc_heuristic_w_per_m2',
    rule_id: 'EPC_HEURISTIC_PRE_SURVEY_W_M2',
    rule_name: 'EPC Rating Indicative W/m² Pre-Survey Heuristic',
    category: 'HEAT_DEMAND',
    rule_value: 'Empirical thermal loss approximation: Band A/B = 30 W/m², C = 40 W/m², D = 55 W/m², E = 70 W/m², F/G = 90 W/m²',
    authority: 'Prime Energy',
    source_url: 'https://primeenergy.co.uk/standards/engineering-heuristics',
    source_document: 'Prime Energy Domestic Sizing Heuristic Guide v1.2',
    source_version: 'v1.2',
    evidence_reference: 'Section 3.1 — Building fabric thermal loss heuristic',
    effective_from: '2024-01-01',
    effective_to: null,
    last_verified_at: '2026-09-12',
    verification_status: 'ESTIMATION_HEURISTIC',
    notes: 'Internal pre-survey heuristic; room-by-room BS EN 12831 survey overrides this.'
  },

  // 18. Microbore Re-Pipe Commercial Allowance
  {
    id: 'rule_microbore_repipe_allowance',
    rule_id: 'MICROBORE_REPIPE_ALLOWANCE',
    rule_name: 'Microbore (<=10mm) Full Re-Pipe Commercial Allowance (£1,800)',
    category: 'PIPEWORK',
    rule_value: 'Properties with existing microbore pipework (10mm or less) trigger a £1,800 baseline ex VAT commercial allowance for full pipework upgrade',
    authority: 'Prime Energy Engineering & Risk Governance',
    source_url: 'https://primeenergy.co.uk/commercial/pipework-policy',
    source_document: 'Prime Energy Technical Risk & Pipework Sizing Schedule v1',
    source_version: 'v1.0',
    evidence_reference: 'Section 4 — Microbore flow rate limitation risk policy',
    effective_from: '2024-01-01',
    effective_to: null,
    last_verified_at: '2026-09-12',
    verification_status: 'PRIME_CONFIG',
    notes: 'Internal commercial risk management rule. Prevents hydraulic starvation at low heat pump flow temperatures.'
  },

  // 19. Combi to ASHP System Conversion Allowance
  {
    id: 'rule_combi_conversion_allowance',
    rule_id: 'COMBI_CONVERSION_ALLOWANCE',
    rule_name: 'Combi to ASHP System Conversion Allowance (£500)',
    category: 'ACCESSORIES',
    rule_value: 'Replacing a combi boiler requires new cylinder installation, pipework redirection, and primary circuit reconfiguration (£500 baseline ex VAT allowance)',
    authority: 'Prime Energy Commercial Operations',
    source_url: 'https://primeenergy.co.uk/commercial/combi-conversion-policy',
    source_document: 'Prime Energy Conversion Allowance Schedule v1',
    source_version: 'v1.0',
    evidence_reference: 'Section 2 — Combi conversion material pack',
    effective_from: '2024-01-01',
    effective_to: null,
    last_verified_at: '2026-09-12',
    verification_status: 'PRIME_CONFIG',
    notes: 'Internal commercial allowance covering conversion fittings and isolation valve manifolds.'
  },

  // 20. Radiator Replacement Ratio Pre-Survey Heuristic
  {
    id: 'rule_radiator_replacement_ratio',
    rule_id: 'RADIATOR_REPLACEMENT_RATIO',
    rule_name: 'Radiator Replacement Ratio Pre-Survey Heuristic (40–60%)',
    category: 'RADIATORS',
    rule_value: 'In pre-survey mode where only total radiator count is known, an estimated 40% to 60% of existing emitters (50% midpoint) are assumed to require upsizing',
    authority: 'Prime Energy',
    source_url: 'https://primeenergy.co.uk/standards/emitter-sizing',
    source_document: 'Prime Energy Pre-Survey Emitter Guidelines v1.2',
    source_version: 'v1.2',
    evidence_reference: 'Section 5 — Indicative emitter replacement allowance (40-60%)',
    effective_from: '2024-01-01',
    effective_to: null,
    last_verified_at: '2026-09-12',
    verification_status: 'ESTIMATION_HEURISTIC',
    notes: 'Internal pre-survey heuristic; survey radiator schedule overrides this.'
  },

  // 21. After Survey Confirmed Design Authority
  {
    id: 'rule_survey_confirmed_design_authority',
    rule_id: 'SURVEY_CONFIRMED_DESIGN_AUTHORITY',
    rule_name: 'Survey-Confirmed Room-by-Room Design Heat Loss Authority',
    category: 'MCS',
    rule_value: 'Survey-confirmed room-by-room design heat loss kW is the authoritative design input; calculation engines must NOT substitute or recalculate it using EPC heuristics',
    authority: 'MCS / Prime Energy Survey Protocol',
    source_url: 'https://mcscertified.com/standards-library/',
    source_document: 'MIS 3005-D: 2025 Issue 2.0 & Prime Energy Survey Handbook',
    source_version: 'Issue 2.0 (Date: 05/12/2025, PDF: MIS-3005-D-2025-V2.0-Final.pdf)',
    evidence_reference: 'Clause 3.4.1(a) — Authoritative Room-by-Room Heat Loss Survey to BS EN 12831-1:2017',
    effective_from: '2025-12-05',
    effective_to: null,
    last_verified_at: '2026-09-12',
    verification_status: 'VERIFIED_OFFICIAL_CURRENT',
    notes: 'Survey-confirmed design heat loss is the authoritative design input under MIS 3005-D: 2025 Clause 3.4.1(a) and must NOT be substituted by pre-survey heuristics.'
  }
];

export async function seedRuleEvidenceRegistry() {
  await initDatabase();
  console.log('Seeding Authoritative Rule Evidence Registry...');

  const stmts: Array<{ sql: string; args?: any[] }> = [
    { sql: 'DELETE FROM rule_evidence' }
  ];

  for (const rule of OFFICIAL_RULE_REGISTRY) {
    stmts.push({
      sql: `
        INSERT OR REPLACE INTO rule_evidence (
          id, rule_id, rule_name, category, rule_value, authority, source_url,
          source_document, source_version, evidence_reference, effective_from,
          effective_to, last_verified_at, verification_status, notes, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      args: [
        rule.id,
        rule.rule_id,
        rule.rule_name,
        rule.category,
        rule.rule_value,
        rule.authority,
        rule.source_url,
        rule.source_document,
        rule.source_version,
        rule.evidence_reference,
        rule.effective_from,
        rule.effective_to || null,
        rule.last_verified_at,
        rule.verification_status,
        rule.notes
      ]
    });
  }

  await db.batch(stmts, 'write');
  console.log(`Successfully seeded ${OFFICIAL_RULE_REGISTRY.length} authoritative rules into Rule Evidence Registry.`);
}

// Auto-run if executed directly
if (process.argv[1]?.includes('seedRuleEvidence.ts') || process.argv[1]?.includes('seedRuleEvidence.js')) {
  seedRuleEvidenceRegistry();
}
