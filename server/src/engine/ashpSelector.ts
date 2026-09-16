import { db } from '../db/connection.js';

export interface ASHPProductItem {
  id: string;
  brand: string;
  manufacturer: string;
  productFamily: string;
  model: string;
  sku: string | null;
  nominalCapacity: number;
  nominalKw: number;
  marketingNominalKw: number;
  ratedOutputAtDesign: number;
  ratedOutputKw: number;
  designCondition: string;
  ratedOutputCondition: string;
  flowTemperature: number;
  refrigerant: string;
  phase: number;
  electricalRequirements: string;
  mcsStatus: string;
  mcsReference: string | null;
  mcsDirectoryUrl?: string | null;
  ofgemPelStatus: string;
  ofgemSourceUrl?: string | null;
  busEligibility: string;
  dataConfidence: string;
  priceExVat: number;
  priceIncVat: number;
  vatRate: number;
  supplier: string;
  sourceUrl?: string | null;
  sourceType: string;
  confidence: string;
}

export interface ASHPRecommendationOption {
  product: ASHPProductItem;
  rank: number;
  label: string;
  reason: string;
}

export interface ASHPSelectionResult {
  recommendedProduct: ASHPProductItem | null;
  selectedProduct: ASHPProductItem | null;
  isManualOverride: boolean;
  overrideNote?: string;
  top3Recommended: ASHPRecommendationOption[];
  alternatives: Array<{
    id: string;
    brand: string;
    manufacturer: string;
    productFamily: string;
    model: string;
    nominalCapacity: number;
    ratedOutputAtDesign: number;
    designCondition: string;
    mcsStatus: string;
    ofgemPelStatus: string;
    priceExVat: number;
  }>;
  allAshpProducts?: ASHPProductItem[];
  categorizedSuitableAshps?: {
    preferred: ASHPProductItem[];
    bestMatch: ASHPProductItem[];
    valueCost: ASHPProductItem[];
    alternatives: ASHPProductItem[];
    allQualifying: ASHPProductItem[];
  };
  status: 'OPTIMAL_MATCH' | 'HIGH_HEAT_DEMAND_WARNING' | 'NO_QUALIFYING_MODEL' | 'MANUAL_REVIEW_REQUIRED';
  notes: string[];
  disclaimer: string;
  ruleEvidenceId: string;
}

export interface ASHPSelectorOptions {
  preferredBrand?: string;
  preferredManufacturer?: string;
  requireMcsVerified?: boolean;
  designOutdoorTemp?: number; // e.g. -2, -3, -5, -7 °C
  designFlowTemp?: number;    // e.g. 35, 45, 50, 55 °C
  maxFlowTemperature?: number;
  overrideProductId?: string; // Manual user selection override
}

let productCache: { data: any[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 15000;

export function clearProductCache() {
  productCache = null;
}

export async function selectRecommendedASHP(
  upperBoundKw: number,
  optionsOrBrand?: string | ASHPSelectorOptions
): Promise<ASHPSelectionResult> {
  const notes: string[] = [];
  const disclaimer = 'PRE-SURVEY ESTIMATION — subject to room-by-room heat loss survey and final MCS design.';

  const options: ASHPSelectorOptions = 
    typeof optionsOrBrand === 'string' 
      ? { preferredBrand: optionsOrBrand, preferredManufacturer: optionsOrBrand }
      : (optionsOrBrand || {});

  const designOutdoor = options.designOutdoorTemp ?? -3;
  const designFlow = options.designFlowTemp ?? options.maxFlowTemperature ?? 45;

  // Query all active products with current pricing and performance curves (with 15s in-memory cache)
  const query = `
    SELECT 
      p.id, p.brand, p.manufacturer, p.product_family, p.model, p.sku,
      COALESCE(p.marketing_nominal_kw, p.nominal_capacity) as nominal_capacity,
      COALESCE(p.rated_output_kw, p.rated_output_at_design) as rated_output_kw,
      COALESCE(p.rated_output_condition, p.design_condition, '-2°C / 45°C flow') as design_condition,
      COALESCE(p.flow_temperature, 45) as flow_temperature,
      p.output_a_minus_7_w35, p.output_a7_w45, p.output_w55,
      p.refrigerant, p.phase, p.electrical_requirements, p.product_type,
      p.mcs_status, p.mcs_product_reference, p.mcs_directory_url,
      p.ofgem_pel_status, p.ofgem_source_url,
      p.bus_product_eligibility_status, p.data_confidence, p.manual_review_required,
      pr.price_ex_vat, pr.price_inc_vat, pr.vat_rate, pr.supplier, pr.source_type, pr.confidence, pr.source_url
    FROM products p
    LEFT JOIN product_prices pr ON p.id = pr.product_id AND pr.is_current = 1
    WHERE p.family = 'ASHP' AND p.active = 1
      AND (p.manual_review_required IS NULL OR p.manual_review_required = 0)
      AND (p.verification_status IS NULL OR p.verification_status NOT IN ('UNVERIFIED', 'NOT_FOUND', 'MANUAL_REVIEW'))
    ORDER BY COALESCE(p.rated_output_kw, p.rated_output_at_design, 999) ASC
  `;

  let rawProducts: any[];
  const now = Date.now();
  if (productCache && (now - productCache.timestamp < CACHE_TTL_MS)) {
    rawProducts = productCache.data;
  } else {
    rawProducts = await db.all(query) as any[];
    productCache = { data: rawProducts, timestamp: now };
  }

  const rawAshpProducts: ASHPProductItem[] = rawProducts.map(p => {
    // Dynamic rated output selection based on design flow and outdoor temperatures
    let rated = Number(p.rated_output_kw || p.nominal_capacity || 0);
    let condStr = p.design_condition || `${designOutdoor}°C / ${designFlow}°C flow`;

    if (designFlow >= 55 && p.output_w55 && p.output_w55 > 0) {
      rated = Number(p.output_w55);
      condStr = `A${designOutdoor}°C / W55°C flow`;
    } else if (designOutdoor <= -7 && designFlow <= 35 && p.output_a_minus_7_w35 && p.output_a_minus_7_w35 > 0) {
      rated = Number(p.output_a_minus_7_w35);
      condStr = `A-7°C / W35°C flow`;
    } else if (p.output_a7_w45 && p.output_a7_w45 > 0 && designOutdoor >= 7) {
      rated = Number(p.output_a7_w45);
      condStr = `A7°C / W45°C flow`;
    }

    const nominal = Number(p.nominal_capacity || rated || 0);
    const priceEx = Number(p.price_ex_vat ?? 3500.00);
    const priceInc = Number(p.price_inc_vat ?? Math.round(priceEx * 1.20 * 100) / 100);

    return {
      id: p.id,
      brand: p.brand || p.manufacturer,
      manufacturer: p.manufacturer,
      productFamily: p.product_family || 'Monobloc ASHP',
      model: p.model,
      sku: p.sku || null,
      nominalCapacity: nominal,
      nominalKw: nominal,
      marketingNominalKw: nominal,
      ratedOutputAtDesign: rated,
      ratedOutputKw: rated,
      designCondition: condStr,
      ratedOutputCondition: condStr,
      flowTemperature: designFlow,
      refrigerant: p.refrigerant || 'R290',
      phase: p.phase || 1,
      electricalRequirements: p.electrical_requirements || '230V 1-Phase 32A',
      mcsStatus: p.mcs_status || 'UNCLEAR',
      mcsReference: p.mcs_product_reference,
      mcsDirectoryUrl: p.mcs_directory_url,
      ofgemPelStatus: p.ofgem_pel_status || 'NOT_CHECKED',
      ofgemSourceUrl: p.ofgem_source_url,
      busEligibility: p.bus_product_eligibility_status || 'NOT_VERIFIED',
      dataConfidence: p.data_confidence || 'MEDIUM',
      priceExVat: priceEx,
      priceIncVat: priceInc,
      vatRate: p.vat_rate ?? 0.00,
      supplier: p.supplier || 'City Plumbing',
      sourceUrl: p.source_url,
      sourceType: p.source_type || 'CITY_PLUMBING',
      confidence: p.confidence || 'MARKET_AVERAGE'
    };
  });

  // Deduplicate products by SKU or Brand + Model
  const seenKeys = new Set<string>();
  const allAshpProducts: ASHPProductItem[] = [];
  for (const item of rawAshpProducts) {
    const key = (item.sku || `${item.brand}_${item.model}_${item.ratedOutputAtDesign}`).toLowerCase().trim();
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      allAshpProducts.push(item);
    }
  }

  // Filter qualifying candidates where rated output >= required heat demand (upperBoundKw)
  let candidates = allAshpProducts.filter(p => p.ratedOutputAtDesign >= upperBoundKw);

  // Optional MCS filtering
  if (options.requireMcsVerified) {
    candidates = candidates.filter(p => p.mcsStatus === 'MCS_CERTIFIED');
    notes.push('Filtered strictly for MCS Certified heat pump models.');
  }

  // Optional Brand filtering
  const brandPref = options.preferredBrand || options.preferredManufacturer;
  if (brandPref && brandPref !== 'ALL') {
    const brandFiltered = candidates.filter(p => 
      p.brand.toLowerCase().includes(brandPref.toLowerCase()) || 
      p.manufacturer.toLowerCase().includes(brandPref.toLowerCase())
    );
    if (brandFiltered.length > 0) {
      candidates = brandFiltered;
      notes.push(`Filtered for preferred brand: ${brandPref}`);
    } else {
      notes.push(`No ${brandPref} models meet ${upperBoundKw.toFixed(1)} kW demand. Showing best alternative brands.`);
    }
  }

  let recommendedProduct: ASHPProductItem | null = null;
  let status: ASHPSelectionResult['status'] = 'OPTIMAL_MATCH';

  if (candidates.length > 0) {
    // Sort by smallest surplus capacity above requirement, MCS status, then lowest price
    candidates.sort((a, b) => {
      const isMcsA = a.mcsStatus === 'MCS_CERTIFIED' ? 1 : 0;
      const isMcsB = b.mcsStatus === 'MCS_CERTIFIED' ? 1 : 0;
      if (isMcsA !== isMcsB) return isMcsB - isMcsA;

      const diffA = a.ratedOutputAtDesign - upperBoundKw;
      const diffB = b.ratedOutputAtDesign - upperBoundKw;
      if (Math.abs(diffA - diffB) > 0.1) {
        return diffA - diffB;
      }
      return a.priceExVat - b.priceExVat;
    });

    recommendedProduct = candidates[0];
    notes.push(`[AUTHORITATIVE SIZING] Selected ${recommendedProduct.brand} ${recommendedProduct.model} (${recommendedProduct.ratedOutputAtDesign} kW rated @ design condition ${designOutdoor}°C outdoor / ${designFlow}°C flow).`);

    if (recommendedProduct.ratedOutputAtDesign > upperBoundKw * 1.4) {
      notes.push(`Surplus capacity alert: Selected unit is >40% larger than ${upperBoundKw.toFixed(1)} kW design load.`);
    }
  } else {
    // High heat demand > 16 kW or no single unit found
    if (upperBoundKw > 16.0) {
      status = 'HIGH_HEAT_DEMAND_WARNING';
      notes.push(`CRITICAL WARNING: Peak heat demand ${upperBoundKw.toFixed(1)} kW exceeds standard single domestic heat pump capacity (16 kW). Cascade twin-ASHP or commercial survey required.`);
      
      const largestAvailable = allAshpProducts.reduce((max, p) => (p.ratedOutputAtDesign > (max?.ratedOutputAtDesign || 0) ? p : max), null as ASHPProductItem | null);
      recommendedProduct = largestAvailable;
    } else {
      status = 'NO_QUALIFYING_MODEL';
      notes.push(`No active ASHP model found with rated output >= ${upperBoundKw.toFixed(1)} kW.`);
    }
  }

  // Handle Manual Override Selection
  let selectedProduct = recommendedProduct;
  let isManualOverride = false;
  let overrideNote: string | undefined;

  if (options.overrideProductId) {
    const foundOverride = allAshpProducts.find(p => p.id === options.overrideProductId);
    if (foundOverride) {
      selectedProduct = foundOverride;
      isManualOverride = true;
      overrideNote = `Manual override applied: User selected ${foundOverride.brand} ${foundOverride.model} (${foundOverride.ratedOutputAtDesign} kW).`;
      notes.push(overrideNote);

      if (foundOverride.ratedOutputAtDesign < upperBoundKw) {
        notes.push(`WARNING: Overridden model ${foundOverride.model} (${foundOverride.ratedOutputAtDesign} kW) is BELOW required design load of ${upperBoundKw.toFixed(1)} kW.`);
      }
    }
  }

  // Build Top 3 ASHP Recommendations
  const allQualifying = allAshpProducts.filter(p => p.ratedOutputAtDesign >= upperBoundKw);
  const top3Recommended: ASHPRecommendationOption[] = [];

  if (allQualifying.length > 0) {
    // 1. Primary Recommendation (Closest surplus, MCS certified)
    const primary = [...allQualifying].sort((a, b) => {
      const mcsA = a.mcsStatus === 'MCS_CERTIFIED' ? 1 : 0;
      const mcsB = b.mcsStatus === 'MCS_CERTIFIED' ? 1 : 0;
      if (mcsA !== mcsB) return mcsB - mcsA;
      return (a.ratedOutputAtDesign - upperBoundKw) - (b.ratedOutputAtDesign - upperBoundKw);
    })[0];

    top3Recommended.push({
      product: primary,
      rank: 1,
      label: 'Primary Recommendation',
      reason: `Primary MCS match for ${upperBoundKw > 0 ? upperBoundKw.toFixed(1) : 'design'} kW heat loss (${primary.ratedOutputAtDesign} kW @ ${primary.designCondition})`
    });

    // 2. Lower-cost suitable alternative
    const remainingAfterPrimary = allQualifying.filter(p => p.id !== primary.id);
    if (remainingAfterPrimary.length > 0) {
      const cheapest = [...remainingAfterPrimary].sort((a, b) => a.priceExVat - b.priceExVat)[0];
      top3Recommended.push({
        product: cheapest,
        rank: 2,
        label: 'Lower-Cost Alternative',
        reason: `Lower cost £${cheapest.priceExVat.toLocaleString()} ex-VAT suitable option (${cheapest.ratedOutputAtDesign} kW rated)`
      });
    }

    // 3. Technical / Brand alternative
    const selectedIds = new Set(top3Recommended.map(r => r.product.id));
    const remainingForThird = allQualifying.filter(p => !selectedIds.has(p.id));
    if (remainingForThird.length > 0) {
      const preferredBrands = ['daikin', 'vaillant', 'mitsubishi', 'viessmann', 'baxi', 'grant'];
      const prefMatch = remainingForThird.find(p => preferredBrands.some(b => p.brand.toLowerCase().includes(b))) || remainingForThird[0];
      top3Recommended.push({
        product: prefMatch,
        rank: 3,
        label: 'Technical Alternative',
        reason: `Technically suitable ${prefMatch.brand} ${prefMatch.model} (${prefMatch.ratedOutputAtDesign} kW rated)`
      });
    }
  }

  const preferredBrands = ['daikin', 'vaillant', 'mitsubishi', 'viessmann', 'baxi', 'grant'];
  const preferred = allQualifying.filter(p => preferredBrands.some(b => p.brand.toLowerCase().includes(b)))
    .sort((a, b) => (a.ratedOutputAtDesign - upperBoundKw) - (b.ratedOutputAtDesign - upperBoundKw));

  const bestMatch = [...allQualifying].sort((a, b) => (a.ratedOutputAtDesign - upperBoundKw) - (b.ratedOutputAtDesign - upperBoundKw));
  const valueCost = [...allQualifying].sort((a, b) => a.priceExVat - b.priceExVat);
  const alternativesList = allQualifying;

  const categorizedSuitableAshps = {
    preferred: preferred.length > 0 ? preferred : bestMatch,
    bestMatch,
    valueCost,
    alternatives: alternativesList,
    allQualifying
  };

  // Generate alternative options list for legacy component backward compatibility
  const alternatives = allAshpProducts
    .filter(p => p.id !== selectedProduct?.id)
    .slice(0, 8)
    .map(p => ({
      id: p.id,
      brand: p.brand,
      manufacturer: p.manufacturer,
      productFamily: p.productFamily,
      model: p.model,
      nominalCapacity: p.nominalCapacity,
      ratedOutputAtDesign: p.ratedOutputAtDesign,
      designCondition: p.designCondition,
      mcsStatus: p.mcsStatus,
      ofgemPelStatus: p.ofgemPelStatus,
      priceExVat: p.priceExVat
    }));

  return {
    recommendedProduct,
    selectedProduct,
    isManualOverride,
    overrideNote,
    top3Recommended,
    alternatives,
    allAshpProducts,
    categorizedSuitableAshps,
    status,
    notes,
    disclaimer,
    ruleEvidenceId: 'MCS_RATED_HEATING_OUTPUT_AT_DESIGN'
  };
}
