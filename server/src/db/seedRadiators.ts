import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, initDatabase } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RadiatorSpecification {
  id: string;
  type: 'K1' | 'P+' | 'K2';
  height_mm: number;
  length_mm: number;
}

// 1. EXACT 199 SPECIFICATIONS
export const REQUESTED_RADIATOR_SIZES: RadiatorSpecification[] = [];

// K1 (70 sizes)
const k1_specs = [
  { height: 300, lengths: [400, 500, 1000, 1500, 2000, 2500, 3000] },
  { height: 450, lengths: [400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600, 2800, 3000] },
  { height: 600, lengths: [300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600, 2800, 3000] },
  { height: 700, lengths: [300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600, 2800, 3000] },
  { height: 900, lengths: [400, 500, 600, 700, 800, 900, 1000] }
];

for (const group of k1_specs) {
  for (const len of group.lengths) {
    REQUESTED_RADIATOR_SIZES.push({
      id: `rad_k1_${group.height}x${len}`,
      type: 'K1',
      height_mm: group.height,
      length_mm: len
    });
  }
}

// P+ (60 sizes)
const p_plus_specs = [
  { height: 300, lengths: [500, 1000, 1500, 2000, 2500, 3000] },
  { height: 450, lengths: [400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600, 2800, 3000] },
  { height: 600, lengths: [400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600, 2800, 3000] },
  { height: 700, lengths: [400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600, 2800, 3000] }
  // 900mm: NO P+ sizes per prompt instructions
];

for (const group of p_plus_specs) {
  for (const len of group.lengths) {
    REQUESTED_RADIATOR_SIZES.push({
      id: `rad_p_plus_${group.height}x${len}`,
      type: 'P+',
      height_mm: group.height,
      length_mm: len
    });
  }
}

// K2 (69 sizes)
const k2_specs = [
  { height: 300, lengths: [500, 1000, 1500, 2000, 2500, 3000] },
  { height: 450, lengths: [400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600, 2800, 3000] },
  { height: 600, lengths: [300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600, 2800, 3000] },
  { height: 700, lengths: [300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600, 2800, 3000] },
  { height: 900, lengths: [400, 500, 600, 700, 800, 900, 1000] }
];

for (const group of k2_specs) {
  for (const len of group.lengths) {
    REQUESTED_RADIATOR_SIZES.push({
      id: `rad_k2_${group.height}x${len}`,
      type: 'K2',
      height_mm: group.height,
      length_mm: len
    });
  }
}

export function matchSpecToCityPlumbing(spec: RadiatorSpecification, items: any[]) {
  const exactOrderMatches: any[] = [];
  const reversedMatches: any[] = [];
  const vertexMatches: any[] = [];

  for (const item of items) {
    const t = item.title;

    // 1. Dimension matching
    const dimMatch = t.match(/(\d{3,4})\s*(?:mm)?\s*[xX*\/]\s*(\d{3,4})\s*(?:mm)?/);
    if (!dimMatch) continue;

    const d1 = parseInt(dimMatch[1], 10);
    const d2 = parseInt(dimMatch[2], 10);
    const isExactOrder = (d1 === spec.height_mm && d2 === spec.length_mm);
    const isReversedOrder = (d2 === spec.height_mm && d1 === spec.length_mm);

    if (!isExactOrder && !isReversedOrder) continue;

    // 2. Type matching
    let itemType: 'K1' | 'P+' | 'K2' | null = null;
    if (/(?:^|\W)(?:p\+|type\s*21|p\s*plus)(?:\W|$)/i.test(t)) {
      itemType = 'P+';
    } else if (/(?:^|\W)(?:k2|type\s*22|double\s*convector)(?:\W|$)/i.test(t)) {
      itemType = 'K2';
    } else if (/(?:^|\W)(?:k1|type\s*11|single\s*convector)(?:\W|$)/i.test(t)) {
      itemType = 'K1';
    }

    if (itemType !== spec.type) continue;

    // Extract BTU
    let btu: number | null = null;
    const btuMatch = t.match(/(\d{3,5})\s*BTU/i);
    if (btuMatch) btu = parseInt(btuMatch[1], 10);

    let mfg = 'Stelrad';
    if (/purmo/i.test(t)) mfg = 'Purmo';
    if (/myson/i.test(t)) mfg = 'Myson';
    if (/henrad/i.test(t)) mfg = 'Henrad';
    if (/kudox/i.test(t)) mfg = 'Kudox';

    const isVertex = /vertex/i.test(t);
    const record = {
      title: item.title,
      url: item.url,
      price: item.price,
      sku: item.sku,
      btu,
      mfg,
      d1,
      d2,
      rawDimStr: `${d1}mm x ${d2}mm`,
      isVertex
    };

    if (isVertex) {
      vertexMatches.push(record);
    } else if (isExactOrder) {
      exactOrderMatches.push(record);
    } else {
      reversedMatches.push(record);
    }
  }

  return {
    exactOrderMatches,
    reversedMatches,
    vertexMatches,
    // Prioritize standard horizontal convector radiators in exact title order
    primaryPool: exactOrderMatches.length > 0 ? exactOrderMatches : (reversedMatches.length > 0 ? reversedMatches : vertexMatches)
  };
}

export async function seedRadiatorCatalogue() {
  await initDatabase();

  const jsonPath = path.resolve(__dirname, '../../city_plumbing_all_radiators.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`City Plumbing database cache not found at: ${jsonPath}`);
  }

  const cpItems = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`Loaded ${cpItems.length} City Plumbing radiator items from cache.`);

  // Load verified page-level VAT evidence cache
  const vatCachePath = path.resolve(__dirname, '../../city_plumbing_vat_evidence_cache.json');
  const vatEvidenceCache = fs.existsSync(vatCachePath) ? JSON.parse(fs.readFileSync(vatCachePath, 'utf8')) : {};
  console.log(`Loaded ${Object.keys(vatEvidenceCache).length} direct VAT evidence records from cache.`);

  // Re-create radiator_catalogue table cleanly if column schema changed
  await db.exec(`
    DROP TABLE IF EXISTS radiator_catalogue;
    CREATE TABLE IF NOT EXISTS radiator_catalogue (
      id TEXT PRIMARY KEY,
      radiator_type TEXT NOT NULL,
      height_mm INTEGER NOT NULL,
      length_mm INTEGER NOT NULL,
      requested_height_mm INTEGER NOT NULL,
      requested_length_mm INTEGER NOT NULL,
      source_title_dimensions TEXT NOT NULL,
      normalized_height_mm INTEGER NOT NULL,
      normalized_length_mm INTEGER NOT NULL,
      dimension_match_type TEXT NOT NULL,
      dimension_validation_status TEXT NOT NULL,
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
      supplier_verification_status TEXT NOT NULL DEFAULT 'VERIFIED_CURRENT',
      verification_status TEXT NOT NULL DEFAULT 'SUPPLIER_VERIFIED',
      city_plumbing_price REAL,
      source_price REAL,
      source_vat_basis TEXT NOT NULL DEFAULT 'INC_VAT',
      normalized_ex_vat_price REAL,
      normalization_method TEXT NOT NULL,
      vat_evidence_source TEXT NOT NULL,
      source_page_evidence TEXT,
      captured_vat_wording TEXT,
      vat_evidence_timestamp TEXT,
      vat_rate_percent REAL,
      pricing_confidence TEXT NOT NULL,
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
  `);

  let countExactMatches = 0;
  let countReversedMatches = 0;
  let countAmbiguous = 0;
  let countSourceRequired = 0;
  let countConfirmedIncVat = 0;
  let countConfirmedExVat = 0;
  let countUnknownVat = 0;
  let countThreeSourceAverages = 0;
  let countMoreThanThreeSources = 0;
  let countCommercialReview = 0;

  const statements: Array<{ sql: string; args?: any[] }> = [];

  for (const spec of REQUESTED_RADIATOR_SIZES) {
    const matchResult = matchSpecToCityPlumbing(spec, cpItems);
    const { exactOrderMatches, reversedMatches, vertexMatches, primaryPool } = matchResult;

    let dimension_match_type: 'EXACT_TITLE_ORDER' | 'REVERSED_NORMALIZED' = 'EXACT_TITLE_ORDER';
    let dimension_validation_status: 'PASS' | 'FAIL' = 'PASS';
    let source_title_dimensions = `${spec.height_mm}mm x ${spec.length_mm}mm`;
    let normalized_height_mm = spec.height_mm;
    let normalized_length_mm = spec.length_mm;

    let supplier_verification_status: 'VERIFIED_CURRENT' | 'SOURCE_REQUIRED' = 'VERIFIED_CURRENT';
    let verification_status: 'SUPPLIER_VERIFIED' | 'SOURCE_REQUIRED' = 'SUPPLIER_VERIFIED';
    let pricing_confidence: 'CONFIRMED_20_PCT_VAT' | 'HIGH' | 'SOURCE_REQUIRED' = 'CONFIRMED_20_PCT_VAT';

    let manufacturer = 'Stelrad';
    let productName = '';
    let sku: string | null = null;
    let cityPlumbingPrice: number | null = null;
    let sourcePrice: number | null = null;
    let sourceVatBasis: 'INC_VAT' | 'EX_VAT' | 'UNKNOWN' = 'INC_VAT';
    let normalizedExVatPrice: number | null = null;
    let normalizationMethod = 'DIVIDE_BY_1_POINT_20';
    let vatEvidenceSource = 'City Plumbing SearchSpring retail catalogue (confirmed 20% VAT rate via tradePrice JSON valueIncVat / valueExVat matching)';
    let sourceUrl: string | null = null;

    let is_three_source_averaged = 0;
    let source_price_1: number | null = null;
    let source_price_2: number | null = null;
    let source_price_3: number | null = null;
    let source_sku_1: string | null = null;
    let source_sku_2: string | null = null;
    let source_sku_3: string | null = null;
    let source_url_1: string | null = null;
    let source_url_2: string | null = null;
    let source_url_3: string | null = null;
    let source_product_1: string | null = null;
    let source_product_2: string | null = null;
    let source_product_3: string | null = null;

    let selected_manufacturer: string | null = null;
    let selected_model: string | null = null;
    let selected_sku: string | null = null;
    let selection_rationale: string | null = null;

    let commercial_review_required = 0;
    let commercial_review_reason: string | null = null;

    let btu: number | null = null;
    let watts: number | null = null;
    let output_test_condition: string | null = null;
    let pricing_notes = '';

    let source_page_evidence: string | null = null;
    let captured_vat_wording: string | null = null;
    let vat_evidence_timestamp: string = new Date().toISOString();
    let vat_rate_percent: number | null = null;

    if (primaryPool.length === 0) {
      dimension_validation_status = 'FAIL';
      supplier_verification_status = 'SOURCE_REQUIRED';
      verification_status = 'SOURCE_REQUIRED';
      pricing_confidence = 'SOURCE_REQUIRED';
      manufacturer = 'Pending Verification';
      productName = `${spec.type} Convector Radiator ${spec.height_mm}x${spec.length_mm}mm`;
      sourceVatBasis = 'UNKNOWN';
      normalizationMethod = 'NO_SUPPLIER_RECORD';
      vatEvidenceSource = 'UNVERIFIED — No matching listing found in City Plumbing catalogue cache';
      commercial_review_required = 1;
      commercial_review_reason = 'Specification unavailable in current merchant catalogue; manual supplier quote required.';
      selection_rationale = 'SOURCE_REQUIRED — No active match in City Plumbing database.';
      pricing_notes = selection_rationale;
      countSourceRequired++;
      countUnknownVat++;
      countCommercialReview++;
    } else {
      const best = primaryPool[0];
      if (exactOrderMatches.length > 0) {
        countExactMatches++;
        dimension_match_type = 'EXACT_TITLE_ORDER';
      } else if (reversedMatches.length > 0) {
        countReversedMatches++;
        dimension_match_type = 'REVERSED_NORMALIZED';
        source_title_dimensions = `${spec.length_mm}mm x ${spec.height_mm}mm (Reversed in title, normalized to ${spec.height_mm}H x ${spec.length_mm}L)`;
      }

      productName = best.name || best.title || `${spec.type} Radiator`;
      sku = best.sku || best.product_code || null;
      sourcePrice = best.price || best.price_inc_vat || null;
      cityPlumbingPrice = sourcePrice;
      sourceUrl = best.url ? (best.url.startsWith('http') ? best.url : `https://www.cityplumbing.co.uk${best.url}`) : null;
      btu = best.btu || null;
      watts = best.watts || (btu ? Math.round(btu / 3.412142) : null);
      output_test_condition = best.output_test_condition || 'ΔT=50K (BS EN 442 standard)';
      selected_manufacturer = best.brand || 'Stelrad';
      selected_model = productName;
      selected_sku = sku;

      if (primaryPool.length === 1) {
        selection_rationale = `Single verified match [${productName}] (SKU: ${sku}). Direct price £${sourcePrice}.`;
        pricing_notes = selection_rationale;
      } else if (primaryPool.length === 3) {
        is_three_source_averaged = 1;
        countThreeSourceAverages++;
        source_price_1 = primaryPool[0].price;
        source_price_2 = primaryPool[1].price;
        source_price_3 = primaryPool[2].price;
        source_sku_1 = primaryPool[0].sku;
        source_sku_2 = primaryPool[1].sku;
        source_sku_3 = primaryPool[2].sku;
        source_url_1 = primaryPool[0].url;
        source_url_2 = primaryPool[1].url;
        source_url_3 = primaryPool[2].url;
        source_product_1 = primaryPool[0].name;
        source_product_2 = primaryPool[1].name;
        source_product_3 = primaryPool[3]?.name || primaryPool[2].name;

        const avg = Math.round(((source_price_1 + source_price_2 + source_price_3) / 3) * 100) / 100;
        sourcePrice = avg;
        cityPlumbingPrice = avg;
        selection_rationale = `Averaged price across 3 verified City Plumbing listings: £${source_price_1}, £${source_price_2}, £${source_price_3}. Average: £${avg}.`;
        pricing_notes = selection_rationale;
      } else {
        countMoreThanThreeSources++;
        selection_rationale = `Selected primary standard trade convector [${productName}] (SKU: ${sku}). Automatic averaging prohibited because ${primaryPool.length} listings exist on City Plumbing.`;
        pricing_notes = selection_rationale;
      }

      const vatEvidence = vatEvidenceCache[spec.id];
      if (vatEvidence && vatEvidence.ok && vatEvidence.calculatedRate === 20) {
        sourceVatBasis = 'INC_VAT';
        vat_rate_percent = 20.0;
        source_page_evidence = 'City Plumbing Product Page Payload (tradePrice object)';
        captured_vat_wording = vatEvidence.capturedWording;
        vat_evidence_timestamp = vatEvidence.timestamp;
        vatEvidenceSource = `City Plumbing tradePrice payload confirmed: valueExVat £${vatEvidence.valueExVat.toFixed(2)} + 20% VAT = valueIncVat £${vatEvidence.valueIncVat.toFixed(2)} (20% VAT confirmed by ratio 1.2000).`;
        pricing_confidence = 'CONFIRMED_20_PCT_VAT';
        normalizedExVatPrice = Math.round((sourcePrice / 1.20) * 100) / 100;
        normalizationMethod = 'DIVIDE_BY_1_POINT_20';
        supplier_verification_status = 'VERIFIED_CURRENT';
        verification_status = 'SUPPLIER_VERIFIED';
        countConfirmedIncVat++;
      } else {
        sourceVatBasis = 'UNKNOWN';
        vat_rate_percent = null;
        captured_vat_wording = null;
        vat_evidence_timestamp = vatEvidence?.timestamp || new Date().toISOString();
        source_page_evidence = `City Plumbing Product Page (Error: ${vatEvidence?.error || 'Page evidence unavailable'})`;
        vatEvidenceSource = `UNVERIFIED — ${vatEvidence?.error || 'VAT basis and 20% rate could not be evidenced from product page; rate cannot be assumed'}`;
        normalizedExVatPrice = null;
        normalizationMethod = 'VAT_STATUS_UNVERIFIED';
        pricing_confidence = 'UNVERIFIED';
        supplier_verification_status = 'SOURCE_REQUIRED';
        verification_status = 'SOURCE_REQUIRED';
        commercial_review_required = 1;
        commercial_review_reason = (commercial_review_reason ? commercial_review_reason + '; ' : '') + 'VAT basis and 20% rate could not be evidenced from supplier page; marked UNKNOWN with price set to NULL and status SOURCE_REQUIRED.';
        countUnknownVat++;
        countSourceRequired++;
      }

      if (normalizedExVatPrice && normalizedExVatPrice > 500.00) {
        commercial_review_required = 1;
        commercial_review_reason = (commercial_review_reason ? commercial_review_reason + '; ' : '') + `High unit cost (£${normalizedExVatPrice.toFixed(2)} ex-VAT) exceeds £500 benchmark; commercial sign-off required.`;
      }

      if (commercial_review_required) {
        countCommercialReview++;
      }
    }

    statements.push({
      sql: `
        INSERT OR REPLACE INTO radiator_catalogue (
          id, radiator_type, height_mm, length_mm, requested_height_mm, requested_length_mm,
          source_title_dimensions, normalized_height_mm, normalized_length_mm,
          dimension_match_type, dimension_validation_status, manufacturer, product_name, sku,
          heat_output_watts, source_btu, source_heat_output_w, output_test_condition, output_source_url,
          supplier, verification_type, supplier_verification_status, verification_status,
          city_plumbing_price, source_price, source_vat_basis, normalized_ex_vat_price,
          normalization_method, vat_evidence_source, source_page_evidence, captured_vat_wording,
          vat_evidence_timestamp, vat_rate_percent, pricing_confidence, source_count, source_url,
          is_three_source_averaged, source_price_1, source_price_2, source_price_3,
          source_sku_1, source_sku_2, source_sku_3, source_url_1, source_url_2, source_url_3,
          source_product_1, source_product_2, source_product_3, selected_manufacturer,
          selected_model, selected_sku, selection_rationale, commercial_review_required,
          commercial_review_reason, source_metadata_json, source_checked_at, pricing_notes, active
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, '2026-09-12', ?, 1
        )
      `,
      args: [
        spec.id,
        spec.type,
        spec.height_mm,
        spec.length_mm,
        spec.height_mm,
        spec.length_mm,
        source_title_dimensions,
        normalized_height_mm,
        normalized_length_mm,
        dimension_match_type,
        dimension_validation_status,
        manufacturer,
        productName,
        sku,
        watts,
        btu,
        watts,
        output_test_condition,
        sourceUrl,
        'City Plumbing',
        'SUPPLIER_CATALOGUE',
        supplier_verification_status,
        verification_status,
        cityPlumbingPrice,
        sourcePrice,
        sourceVatBasis,
        normalizedExVatPrice,
        normalizationMethod,
        vatEvidenceSource,
        source_page_evidence,
        captured_vat_wording,
        vat_evidence_timestamp,
        vat_rate_percent,
        pricing_confidence,
        primaryPool.length,
        sourceUrl,
        is_three_source_averaged,
        source_price_1,
        source_price_2,
        source_price_3,
        source_sku_1,
        source_sku_2,
        source_sku_3,
        source_url_1,
        source_url_2,
        source_url_3,
        source_product_1,
        source_product_2,
        source_product_3,
        selected_manufacturer,
        selected_model,
        selected_sku,
        selection_rationale,
        commercial_review_required,
        commercial_review_reason,
        JSON.stringify(primaryPool),
        pricing_notes
      ]
    });

    statements.push({
      sql: `
        INSERT OR REPLACE INTO products (
          id, family, brand, manufacturer, model, sku, category,
          product_type, system_type, design_temperature, flow_temperature, phase,
          electrical_requirements, specifications, product_source, source_date,
          data_confidence, verification_status, notes, active, updated_at
        ) VALUES (
          ?, 'RADIATOR', ?, ?, ?, ?, 'Installation-dependent',
          'Hydronic Heat Emitter', 'Two-pipe water-to-air', -2.0, 45.0, 1,
          'None (Hydronic Emitter)', ?, 'City Plumbing SearchSpring API', '2026-09-12',
          ?, ?, ?, 1, CURRENT_TIMESTAMP
        )
      `,
      args: [
        spec.id,
        manufacturer,
        manufacturer,
        productName,
        sku,
        JSON.stringify({
          type: spec.type,
          height_mm: spec.height_mm,
          length_mm: spec.length_mm,
          heat_output_watts: watts,
          heat_output_btu: btu,
          source_count: primaryPool.length,
          commercial_review_required: commercial_review_required === 1
        }),
        supplier_verification_status === 'VERIFIED_CURRENT' ? 'HIGH' : 'LOW',
        verification_status,
        pricing_notes
      ]
    });

    statements.push({
      sql: `
        INSERT OR REPLACE INTO product_prices (
          id, product_id, supplier, source_type, source_url, price_basis,
          date_collected, price_captured_at, price_ex_vat, price_inc_vat, vat_rate,
          source_price, source_vat_basis, normalized_ex_vat_price, normalization_method,
          normalization_confidence, confidence, is_current, notes
        ) VALUES (
          ?, ?, 'City Plumbing', 'CITY_PLUMBING', ?, ?,
          '2026-09-12', CURRENT_TIMESTAMP, ?, ?, 0.20,
          ?, ?, ?, ?,
          ?, ?, 1, ?
        )
      `,
      args: [
        `price_${spec.id}`,
        spec.id,
        sourceUrl,
        sourceVatBasis,
        normalizedExVatPrice,
        sourcePrice,
        sourcePrice,
        sourceVatBasis,
        normalizedExVatPrice,
        normalizationMethod,
        pricing_confidence,
        supplier_verification_status === 'VERIFIED_CURRENT' ? 'MARKET_CONFIRMED' : 'PRICE_REQUIRED',
        pricing_notes
      ]
    });
  }

  for (let i = 0; i < statements.length; i += 100) {
    await db.batch(statements.slice(i, i + 100), 'write');
  }

  console.log('=== AUDITED RADIATOR CATALOGUE SEED COMPLETE ===');
  console.log(`Total requested specifications: ${REQUESTED_RADIATOR_SIZES.length}`);
  console.log(`Exact title order matches: ${countExactMatches}`);
  console.log(`Reversed title matches normalized: ${countReversedMatches}`);
  console.log(`Ambiguous dimension records: ${countAmbiguous}`);
  console.log(`SOURCE_REQUIRED records: ${countSourceRequired}`);
  console.log(`Confirmed INC_VAT records: ${countConfirmedIncVat}`);
  console.log(`Confirmed EX_VAT records: ${countConfirmedExVat}`);
  console.log(`UNKNOWN VAT records: ${countUnknownVat}`);
  console.log(`Exactly 3-source averaged records: ${countThreeSourceAverages}`);
  console.log(`>3-source records: ${countMoreThanThreeSources}`);
  console.log(`Commercial review required records: ${countCommercialReview}`);

  return {
    totalRequested: REQUESTED_RADIATOR_SIZES.length,
    exactMatches: countExactMatches,
    reversedMatches: countReversedMatches,
    ambiguous: countAmbiguous,
    sourceRequired: countSourceRequired,
    confirmedIncVat: countConfirmedIncVat,
    confirmedExVat: countConfirmedExVat,
    unknownVat: countUnknownVat,
    threeSourceAverages: countThreeSourceAverages,
    moreThanThreeSources: countMoreThanThreeSources,
    commercialReview: countCommercialReview
  };
}

if (process.argv[1]?.includes('seedRadiators.ts') || process.argv[1]?.includes('seedRadiators.js')) {
  seedRadiatorCatalogue();
}
