import { db } from '../db/connection.js';

export interface RadiatorEstimationInputs {
  heatDemandKw: number;
  existingRadiatorCount?: number | null;
  exactRadiatorSchedule?: Array<{
    productId: string;
    quantity: number;
  }> | null;
  radiatorReplacementRequired?: boolean;
  isLowCapacityIndicated?: boolean;
}

export interface RadiatorEstimationOutputs {
  mode: 'EXACT_SCHEDULE' | 'NO_REPLACEMENT' | 'REPLACEMENT_REQUIRED';
  estimatedReplacementCount: number;
  displayQuantity: string;
  unitAllowanceCostExVat: number;
  totalRadiatorCostExVat: number;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPriceExVat: number;
    totalPriceExVat: number;
  }>;
  hasUnverifiedPrices?: boolean;
  unverifiedItemIds?: string[];
  notes: string[];
  disclaimer: string;
}

export async function estimateRadiatorRequirements(inputs: RadiatorEstimationInputs): Promise<RadiatorEstimationOutputs> {
  const notes: string[] = [];
  const disclaimer = 'Pre-survey indicator only — actual radiator replacement requires room-by-room MCS heat-loss calculations.';

  // Default unit price for generic replacement radiator
  const genericRadRow = await db.get(`
    SELECT p.id, p.model, pr.price_ex_vat 
    FROM products p 
    LEFT JOIN product_prices pr ON p.id = pr.product_id AND pr.is_current = 1
    WHERE p.id = 'rad_generic_replacement'
  `) as { id: string; model: string; price_ex_vat: number | null } | undefined;

  const unitAllowanceCostExVat = genericRadRow?.price_ex_vat || 165.00;

  // Case 1: Exact radiator schedule provided (After Survey or detailed pre-survey schedule)
  if (inputs.exactRadiatorSchedule && inputs.exactRadiatorSchedule.length > 0) {
    let totalCost = 0;
    let totalCount = 0;
    let hasUnverifiedPrices = false;
    const unverifiedItemIds: string[] = [];
    const lineItems: RadiatorEstimationOutputs['lineItems'] = [];

    for (const item of inputs.exactRadiatorSchedule) {
      const rad = await db.get(`
        SELECT rc.id, rc.product_name, rc.normalized_ex_vat_price, rc.verification_status, rc.pricing_confidence
        FROM radiator_catalogue rc
        WHERE rc.id = ?
      `, [item.productId]) as { id: string; product_name: string; normalized_ex_vat_price: number | null; verification_status: string; pricing_confidence: string } | undefined;

      let model = rad?.product_name;
      let price = rad?.normalized_ex_vat_price ?? null;
      let status = rad?.verification_status;
      let confidence = rad?.pricing_confidence;

      if (!rad) {
        const p = await db.get(`
          SELECT p.model, pr.price_ex_vat, pr.normalized_ex_vat_price, p.verification_status, pr.confidence
          FROM products p 
          LEFT JOIN product_prices pr ON p.id = pr.product_id AND pr.is_current = 1
          WHERE p.id = ?
        `, [item.productId]) as any;

        if (p) {
          model = p.model;
          price = p.normalized_ex_vat_price ?? p.price_ex_vat ?? null;
          status = p.verification_status;
          confidence = p.confidence;
        }
      }

      if (!model || status === 'SOURCE_REQUIRED' || price === null || confidence === 'PRICE_REQUIRED' || confidence === 'SOURCE_REQUIRED') {
        hasUnverifiedPrices = true;
        unverifiedItemIds.push(item.productId);
        notes.push(`CRITICAL ALERT: Radiator item '${item.productId}' is unverified (SOURCE_REQUIRED) and cannot enter commercial calculation as a verified price.`);
        lineItems.push({
          description: (model || item.productId) + ' [PRICE UNVERIFIED — SOURCE_REQUIRED]',
          quantity: item.quantity,
          unitPriceExVat: 0,
          totalPriceExVat: 0
        });
      } else {
        const subtotal = price * item.quantity;
        totalCost += subtotal;
        totalCount += item.quantity;

        lineItems.push({
          description: model,
          quantity: item.quantity,
          unitPriceExVat: price,
          totalPriceExVat: subtotal
        });
      }
    }

    if (hasUnverifiedPrices) {
      notes.push(`Commercial sign-off blocked: schedule contains unverified radiator items: ${unverifiedItemIds.join(', ')}.`);
    } else {
      notes.push(`Priced exact radiator schedule: ${totalCount} radiators specified.`);
    }

    return {
      mode: 'EXACT_SCHEDULE',
      estimatedReplacementCount: totalCount,
      displayQuantity: `${totalCount} units (confirmed schedule)`,
      unitAllowanceCostExVat,
      totalRadiatorCostExVat: totalCost,
      lineItems,
      hasUnverifiedPrices,
      unverifiedItemIds,
      notes,
      disclaimer: hasUnverifiedPrices 
        ? 'UNVERIFIED SCHEDULE — Radiator prices marked SOURCE_REQUIRED require verified supplier quotes before contract.'
        : 'Survey-confirmed radiator schedule.'
    };
  }

  // Case 2: Replacement required by business rule OR indicated by emitter capacity shortfall
  const needsUpgrade = Boolean(inputs.radiatorReplacementRequired || inputs.isLowCapacityIndicated);

  if (needsUpgrade) {
    const count = inputs.existingRadiatorCount;
    if (count && count > 0) {
      const ratio = inputs.radiatorReplacementRequired ? 0.50 : 0.40;
      const replacementCount = Math.max(1, Math.round(count * ratio));
      const totalCost = replacementCount * unitAllowanceCostExVat;

      notes.push(`Radiator upgrade indicated: ${replacementCount} replacement units estimated at £${unitAllowanceCostExVat}/unit.`);

      return {
        mode: 'REPLACEMENT_REQUIRED',
        estimatedReplacementCount: replacementCount,
        displayQuantity: `${replacementCount} radiator replacements estimated`,
        unitAllowanceCostExVat,
        totalRadiatorCostExVat: totalCost,
        lineItems: [
          {
            description: `Radiator Replacement Allowance (${replacementCount} units)`,
            quantity: replacementCount,
            unitPriceExVat: unitAllowanceCostExVat,
            totalPriceExVat: totalCost
          }
        ],
        notes,
        disclaimer
      };
    } else {
      // Upgrade indicated, but insufficient info to quantify exact replacement count pre-survey
      notes.push('Radiator upgrade indicated, but exact replacement count cannot be quantified pre-survey without radiator count.');

      return {
        mode: 'REPLACEMENT_REQUIRED',
        estimatedReplacementCount: 0,
        displayQuantity: 'Radiator replacement estimate: Pending survey',
        unitAllowanceCostExVat,
        totalRadiatorCostExVat: 0,
        lineItems: [],
        notes,
        disclaimer
      };
    }
  }

  // Case 3: Default — Existing radiator count represents existing property emitters.
  // Rule 8: If no radiator replacement is required: replacement quantity = 0, replacement cost = £0.
  notes.push('Existing radiators reported. No automatic replacement allowance added pre-survey (Replacement quantity = 0, Cost = £0).');

  return {
    mode: 'NO_REPLACEMENT',
    estimatedReplacementCount: 0,
    displayQuantity: '0 units (£0 — existing emitters retained pre-survey)',
    unitAllowanceCostExVat,
    totalRadiatorCostExVat: 0,
    lineItems: [],
    notes,
    disclaimer
  };
}

// Authoritative Stelrad Compact Reference Data (Reference Condition: Δt50 = 75/65/20°C, Δt30 = 55/45/20°C where documented)
export const STELRAD_EXACT_CATALOGUE: Record<string, { uin?: string; type: string; height: number; length: number; wattsQ50: number; wattsQ30?: number; btuQ50: number }> = {
  // Special data check requirement: 700 x 2600 K2 / UIN 143863 = 5099 W / 17,403 Btu/hr. Use 5099 W, not 4503 W.
  '143863': { uin: '143863', type: 'K2', height: 700, length: 2600, wattsQ50: 5099, wattsQ30: 2598, btuQ50: 17403 },
  'rad_k2_700x2600': { uin: '143863', type: 'K2', height: 700, length: 2600, wattsQ50: 5099, wattsQ30: 2598, btuQ50: 17403 },
  
  // Standard Stelrad Compact references
  'rad_k1_600x1000': { type: 'K1', height: 600, length: 1000, wattsQ50: 968, wattsQ30: 493, btuQ50: 3303 },
  'rad_p_plus_600x1000': { type: 'P+', height: 600, length: 1000, wattsQ50: 1332, wattsQ30: 679, btuQ50: 4545 },
  'rad_k2_600x1000': { type: 'K2', height: 600, length: 1000, wattsQ50: 1747, wattsQ30: 890, btuQ50: 5961 },
  'rad_k2_600x1200': { type: 'K2', height: 600, length: 1200, wattsQ50: 2096, wattsQ30: 1068, btuQ50: 7152 },
  'rad_k2_600x1400': { type: 'K2', height: 600, length: 1400, wattsQ50: 2446, wattsQ30: 1246, btuQ50: 8346 }
};

export interface EmitterCapacityInputs {
  existingRadiatorCount?: number | null;
  dominantRadiatorType?: 'K1' | 'P_PLUS' | 'K2' | 'MIXED' | 'UNKNOWN' | 'MIXED_UNKNOWN' | string | null;
  isStandardHorizontalPanel?: boolean | 'YES' | 'NO' | 'DONT_KNOW' | null;
  radiatorInfoConfidence?: 'VISUALLY_CONFIRMED' | 'APPROXIMATE' | 'UNKNOWN' | null;
  exactRadiatorSchedule?: Array<{
    productId?: string;
    uin?: string;
    type?: string;
    heightMm?: number;
    lengthMm?: number;
    quantity?: number;
  }> | null;
  targetFlowTemp?: number;
  estimatedHeatDemandKw?: number | null;
}

export interface EmitterCapacityOutputs {
  totalRadiatorCount: number;
  dominantRadiatorType: string;
  isStandardHorizontalPanel: string;
  radiatorInfoConfidence: string;
  hasExactScheduleOrDimensions: boolean;
  confidenceLevel: 'High' | 'Medium' | 'Low' | 'Unknown';
  estimatedOutputKwAt50: number | null;
  estimatedOutputKwAt50Display: string;
  estimatedOutputKwAt30: number | null;
  estimatedOutputKwAt30Display: string;
  qualitativeSummary: string;
  comparisonResult: 'Low emitter capacity' | 'Plausible match' | 'High emitter capacity' | 'Unknown';
  plausibilityCheck: {
    estimatedHeatDemandKw: number;
    emitterCapacityKw: number | null;
    comparisonResult: 'Low emitter capacity' | 'Plausible match' | 'High emitter capacity' | 'Unknown';
    warningMessage?: string;
    statusLabel: string;
  };
  disclaimer: string;
  heatDemandDisclaimer: string;
  notes: string[];
}

export function evaluateExistingEmitterCapacity(inputs: EmitterCapacityInputs): EmitterCapacityOutputs {
  const totalCount = Math.max(0, inputs.existingRadiatorCount || 0);
  let dominantType = inputs.dominantRadiatorType || 'MIXED_UNKNOWN';
  if (dominantType === 'P+') dominantType = 'P_PLUS';

  const horizPanel = inputs.isStandardHorizontalPanel === true || inputs.isStandardHorizontalPanel === 'YES'
    ? 'YES'
    : inputs.isStandardHorizontalPanel === false || inputs.isStandardHorizontalPanel === 'NO'
    ? 'NO'
    : 'DONT_KNOW';

  const confidenceInput = inputs.radiatorInfoConfidence || 'UNKNOWN';
  const estimatedHeatDemandKw = Math.round(((inputs.estimatedHeatDemandKw || 0)) * 10) / 10;
  const notes: string[] = [];

  const disclaimer = "Estimated existing radiator emitter capacity — pre-survey indicator only. Not an MCS heat-loss calculation, not BS EN 12831 design heat loss and not final heat-pump sizing.";
  const heatDemandDisclaimer = "Preliminary estimated heat demand — not an MCS/BS EN 12831 heat-load calculation.";

  // Check if exact schedule or exact dimensions/UIN are supplied
  const hasExactSchedule = Boolean(inputs.exactRadiatorSchedule && inputs.exactRadiatorSchedule.length > 0);

  if (hasExactSchedule) {
    let sumQ50Watts = 0;
    let sumQ30Watts = 0;
    let missingQ30 = false;
    let allUinsKnown = true;
    let allDimsKnown = true;

    for (const item of inputs.exactRadiatorSchedule!) {
      const qty = item.quantity || 1;
      const lookupKey = item.uin || item.productId || `rad_${(item.type || 'k2').toLowerCase().replace('+', '_plus')}_${item.heightMm}x${item.lengthMm}`;
      const stelrad = STELRAD_EXACT_CATALOGUE[lookupKey];

      if (stelrad) {
        sumQ50Watts += stelrad.wattsQ50 * qty;
        if (stelrad.wattsQ30) {
          sumQ30Watts += stelrad.wattsQ30 * qty;
        } else {
          missingQ30 = true;
        }
      } else {
        allUinsKnown = false;
        allDimsKnown = false;
      }
    }

    const kw50 = Math.round((sumQ50Watts / 1000) * 100) / 100;
    const kw30 = !missingQ30 && sumQ30Watts > 0 ? Math.round((sumQ30Watts / 1000) * 100) / 100 : null;

    let confidenceLevel: 'High' | 'Medium' | 'Low' | 'Unknown' = 'Medium';
    if (allUinsKnown && confidenceInput === 'VISUALLY_CONFIRMED') {
      confidenceLevel = 'High';
    } else if (allDimsKnown) {
      confidenceLevel = 'Medium';
    }

    let comparisonResult: 'Low emitter capacity' | 'Plausible match' | 'High emitter capacity' | 'Unknown' = 'Unknown';
    if (kw30 !== null && estimatedHeatDemandKw > 0) {
      if (kw30 < estimatedHeatDemandKw * 0.85) {
        comparisonResult = 'Low emitter capacity';
      } else if (kw30 <= estimatedHeatDemandKw * 1.25) {
        comparisonResult = 'Plausible match';
      } else {
        comparisonResult = 'High emitter capacity';
      }
    } else if (kw50 > 0 && estimatedHeatDemandKw > 0) {
      comparisonResult = 'Plausible match';
    }

    const warningMessage = comparisonResult === 'Low emitter capacity'
      ? 'Existing emitter capacity may be insufficient at the proposed lower flow temperature.'
      : undefined;

    return {
      totalRadiatorCount: totalCount || inputs.exactRadiatorSchedule!.length,
      dominantRadiatorType: dominantType,
      isStandardHorizontalPanel: horizPanel,
      radiatorInfoConfidence: confidenceInput,
      hasExactScheduleOrDimensions: true,
      confidenceLevel,
      estimatedOutputKwAt50: kw50,
      estimatedOutputKwAt50Display: `${kw50.toFixed(2)} kW @ Δt50 (75/65/20°C)`,
      estimatedOutputKwAt30: kw30,
      estimatedOutputKwAt30Display: kw30 !== null ? `${kw30.toFixed(2)} kW @ Δt30 (55/45/20°C)` : 'Not calculated',
      qualitativeSummary: `Calculated from exact manufacturer Stelrad data for ${inputs.exactRadiatorSchedule!.length} specified radiators.`,
      comparisonResult,
      plausibilityCheck: {
        estimatedHeatDemandKw,
        emitterCapacityKw: kw30 ?? kw50,
        comparisonResult,
        warningMessage,
        statusLabel: comparisonResult
      },
      disclaimer,
      heatDemandDisclaimer,
      notes
    };
  }

  // Count / Dominant Type Only (No exact dimensions / UINs supplied)
  const isUnknown = totalCount === 0 || dominantType === 'MIXED_UNKNOWN' || dominantType === 'UNKNOWN' || dominantType === 'Mixed' || dominantType === 'Don’t know';

  let confidenceLevel: 'High' | 'Medium' | 'Low' | 'Unknown' = 'Unknown';
  let comparisonResult: 'Low emitter capacity' | 'Plausible match' | 'High emitter capacity' | 'Unknown' = 'Unknown';
  let qualitativeSummary = '';
  let estimatedOutputKwAt50: number | null = null;
  let estimatedOutputKwAt30: number | null = null;
  let estimatedOutputKwAt50Display = 'Not calculated';
  let estimatedOutputKwAt30Display = 'Not calculated';

  if (isUnknown) {
    confidenceLevel = 'Unknown';
    comparisonResult = 'Unknown';
    qualitativeSummary = 'Radiator count or dominant type unsupplied or mixed unknown. Pre-survey qualitative indicator only.';
  } else {
    confidenceLevel = 'Low';

    // Calculate indicative capacity using Stelrad Compact 600x1000 standard benchmarks
    // K1: 968W @ Δt50, 493W @ Δt30
    // P+: 1332W @ Δt50, 679W @ Δt30
    // K2: 1747W @ Δt50, 890W @ Δt30
    let perRad50W = 1500;
    let perRad30W = 750;

    if (dominantType === 'K1') {
      perRad50W = 968;
      perRad30W = 493;
      qualitativeSummary = 'Mostly K1 radiators indicate lower low-temperature emitter surface area. Indicative pre-survey indicator only; does NOT alter building heat loss.';
    } else if (dominantType === 'P_PLUS' || dominantType === 'P+') {
      perRad50W = 1332;
      perRad30W = 679;
      qualitativeSummary = 'Mostly P+ (Type 21) radiators provide moderate emitter surface area. Indicative pre-survey indicator only; does NOT alter building heat loss.';
    } else if (dominantType === 'K2') {
      perRad50W = 1747;
      perRad30W = 890;
      qualitativeSummary = 'Mostly K2 radiators indicate higher emitter output per size than K1/P+. Indicative pre-survey indicator only; does NOT alter building heat loss.';
    } else {
      perRad50W = 1350;
      perRad30W = 680;
      qualitativeSummary = 'Mixed radiator types provide moderate estimated emitter capacity. Indicative pre-survey indicator only; does NOT alter building heat loss.';
    }

    estimatedOutputKwAt50 = Math.round((totalCount * perRad50W / 1000) * 10) / 10;
    estimatedOutputKwAt30 = Math.round((totalCount * perRad30W / 1000) * 10) / 10;

    estimatedOutputKwAt50Display = `~${estimatedOutputKwAt50.toFixed(1)} kW @ Δt50 (indicative based on standard 600x1000 panel reference)`;
    estimatedOutputKwAt30Display = `~${estimatedOutputKwAt30.toFixed(1)} kW @ Δt30 (indicative low-temp capacity)`;

    if (estimatedHeatDemandKw > 0 && estimatedOutputKwAt30 < estimatedHeatDemandKw * 0.9) {
      comparisonResult = 'Low emitter capacity';
    } else {
      comparisonResult = 'Plausible match';
    }
  }

  notes.push('Count and dominant type supplied — calculated indicative Stelrad Compact emitter capacity. Emitter capacity does NOT alter building heat loss.');

  const warningMessage = comparisonResult === 'Low emitter capacity'
    ? 'Existing emitter capacity may be insufficient at the proposed lower flow temperature.'
    : undefined;

  return {
    totalRadiatorCount: totalCount,
    dominantRadiatorType: dominantType,
    isStandardHorizontalPanel: horizPanel,
    radiatorInfoConfidence: confidenceInput,
    hasExactScheduleOrDimensions: false,
    confidenceLevel,
    estimatedOutputKwAt50,
    estimatedOutputKwAt50Display,
    estimatedOutputKwAt30,
    estimatedOutputKwAt30Display,
    qualitativeSummary,
    comparisonResult,
    plausibilityCheck: {
      estimatedHeatDemandKw,
      emitterCapacityKw: estimatedOutputKwAt30 ?? estimatedOutputKwAt50,
      comparisonResult,
      warningMessage,
      statusLabel: comparisonResult
    },
    disclaimer,
    heatDemandDisclaimer,
    notes
  };
}



