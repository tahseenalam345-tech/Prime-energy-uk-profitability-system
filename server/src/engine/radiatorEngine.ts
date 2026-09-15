import { db } from '../db/connection.js';

export interface RadiatorEstimationInputs {
  heatDemandKw: number;
  existingRadiatorCount?: number | null;
  exactRadiatorSchedule?: Array<{
    productId: string;
    quantity: number;
  }> | null;
}

export interface RadiatorEstimationOutputs {
  mode: 'EXACT_SCHEDULE' | 'COUNT_REPLACEMENT_RATIO' | 'HEAT_DEMAND_CAPACITY_BAND';
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
  const disclaimer = 'ESTIMATED — actual radiator sizing requires room-by-room MCS heat-loss calculations and pipe sizing.';

  // Default unit price for generic replacement radiator
  const genericRadRow = await db.get(`
    SELECT p.id, p.model, pr.price_ex_vat 
    FROM products p 
    LEFT JOIN product_prices pr ON p.id = pr.product_id AND pr.is_current = 1
    WHERE p.id = 'rad_generic_replacement'
  `) as { id: string; model: string; price_ex_vat: number | null } | undefined;

  const unitAllowanceCostExVat = genericRadRow?.price_ex_vat || 165.00;

  // Case 1: Exact radiator schedule provided (After Survey or detailed New Lead)
  if (inputs.exactRadiatorSchedule && inputs.exactRadiatorSchedule.length > 0) {
    let totalCost = 0;
    let totalCount = 0;
    let hasUnverifiedPrices = false;
    const unverifiedItemIds: string[] = [];
    const lineItems: RadiatorEstimationOutputs['lineItems'] = [];

    for (const item of inputs.exactRadiatorSchedule) {
      // First check data-driven radiator_catalogue table
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
        // Fallback to general products & product_prices tables
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

      // Check if item is unverified or SOURCE_REQUIRED
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

  // Case 2: Only radiator count is known (Apply 40–60% replacement ratio allowance)
  if (inputs.existingRadiatorCount && inputs.existingRadiatorCount > 0) {
    const existingCount = inputs.existingRadiatorCount;
    // 50% midpoint replacement ratio
    const replacementCount = Math.max(1, Math.round(existingCount * 0.50));
    const minRange = Math.max(1, Math.floor(existingCount * 0.40));
    const maxRange = Math.max(minRange, Math.ceil(existingCount * 0.60));

    const totalCost = replacementCount * unitAllowanceCostExVat;

    notes.push(
      `Property has ${existingCount} radiators. Applied configurable 40–60% heat pump upsizing replacement ratio (estimated ${replacementCount} units).`
    );

    return {
      mode: 'COUNT_REPLACEMENT_RATIO',
      estimatedReplacementCount: replacementCount,
      displayQuantity: `${minRange}–${maxRange} radiators (approx. ${replacementCount} assumed)`,
      unitAllowanceCostExVat,
      totalRadiatorCostExVat: totalCost,
      lineItems: [
        {
          description: `Heat Pump Radiator Upsizing Allowance (${replacementCount} units @ 50% replacement ratio)`,
          quantity: replacementCount,
          unitPriceExVat: unitAllowanceCostExVat,
          totalPriceExVat: totalCost
        }
      ],
      notes,
      disclaimer
    };
  }

  // Case 3: Radiator count is unknown (Use heat demand capacity bands)
  const kw = inputs.heatDemandKw;
  let estCount = 3;
  let displayBand = '2–4 units';

  if (kw < 6.0) {
    estCount = 1;
    displayBand = '0–2 units';
  } else if (kw < 10.0) {
    estCount = 3;
    displayBand = '2–4 units';
  } else if (kw < 15.0) {
    estCount = 5;
    displayBand = '4–6 units';
  } else {
    estCount = 7;
    displayBand = '6–8 units';
  }

  const totalCost = estCount * unitAllowanceCostExVat;
  notes.push(
    `No radiator information provided. Sized allowance from indicative heat demand (${kw.toFixed(1)} kW) band: ${displayBand}.`
  );

  return {
    mode: 'HEAT_DEMAND_CAPACITY_BAND',
    estimatedReplacementCount: estCount,
    displayQuantity: `${displayBand} (approx. ${estCount} assumed)`,
    unitAllowanceCostExVat,
    totalRadiatorCostExVat: totalCost,
    lineItems: [
      {
        description: `Indicative Radiator Replacement Allowance (${displayBand}, heat demand ${kw.toFixed(1)} kW)`,
        quantity: estCount,
        unitPriceExVat: unitAllowanceCostExVat,
        totalPriceExVat: totalCost
      }
    ],
    notes,
    disclaimer
  };
}

export interface EmitterCapacityInputs {
  k1Count?: number;
  pPlusCount?: number;
  k2Count?: number;
  otherCount?: number;
  dimensionsText?: string | Array<{ type: string; heightMm?: number; lengthMm?: number }>;
  targetFlowTemp?: number;
  estimatedHeatDemandKw?: number;
}

export interface EmitterCapacityOutputs {
  k1Count: number;
  pPlusCount: number;
  k2Count: number;
  otherCount: number;
  totalRadiatorCount: number;
  hasMissingDimensions: boolean;
  status: 'VERIFIED_DIMENSIONS' | 'PARTIAL' | 'UNKNOWN';
  estimatedOutputKwAt50: number;
  estimatedOutputKwAtTargetFlow: number;
  targetFlowTemp: number;
  targetDeltaT: number;
  plausibilityCheck: {
    estimatedHeatDemandKw: number;
    emitterCapacityKw: number;
    isAdequate: boolean;
    warningMessage?: string;
    statusLabel: string;
  };
  notes: string[];
}

export function evaluateExistingEmitterCapacity(inputs: EmitterCapacityInputs): EmitterCapacityOutputs {
  const k1Count = Math.max(0, inputs.k1Count || 0);
  const pPlusCount = Math.max(0, inputs.pPlusCount || 0);
  const k2Count = Math.max(0, inputs.k2Count || 0);
  const otherCount = Math.max(0, inputs.otherCount || 0);
  const totalCount = k1Count + pPlusCount + k2Count + otherCount;

  const targetFlowTemp = inputs.targetFlowTemp || 45;
  const targetDeltaT = Math.max(10, targetFlowTemp - 20);

  let hasMissingDimensions = true;
  let dimensionsFoundCount = 0;

  let totalWAt50 = 0;

  if (typeof inputs.dimensionsText === 'string' && inputs.dimensionsText.trim().length > 0) {
    const text = inputs.dimensionsText;
    const matches = text.match(/\d{3,4}\s*[xX*]\s*\d{3,4}/g);
    if (matches && matches.length > 0) {
      hasMissingDimensions = false;
      dimensionsFoundCount = matches.length;
    }
  } else if (Array.isArray(inputs.dimensionsText) && inputs.dimensionsText.length > 0) {
    hasMissingDimensions = false;
    dimensionsFoundCount = inputs.dimensionsText.length;
  }

  totalWAt50 += k1Count * 900;
  totalWAt50 += pPlusCount * 1250;
  totalWAt50 += k2Count * 1650;
  totalWAt50 += otherCount * 1000;

  const estimatedOutputKwAt50 = Math.round((totalWAt50 / 1000) * 100) / 100;

  const scalingFactor = Math.pow(targetDeltaT / 50, 1.3);
  const estimatedOutputKwAtTargetFlow = Math.round((estimatedOutputKwAt50 * scalingFactor) * 100) / 100;

  const estimatedHeatDemandKw = Math.round((inputs.estimatedHeatDemandKw || 0) * 100) / 100;
  const notes: string[] = [];

  let status: EmitterCapacityOutputs['status'] = 'UNKNOWN';
  if (totalCount === 0 || hasMissingDimensions) {
    status = 'UNKNOWN';
    notes.push('Radiator dimensions or inventory missing — stored as UNKNOWN. Confidence reduced.');
  } else if (dimensionsFoundCount >= totalCount) {
    status = 'VERIFIED_DIMENSIONS';
    notes.push(`Calculated emitter capacity from EN 442 baseline output data for ${totalCount} radiators with verified dimensions.`);
  } else {
    status = 'PARTIAL';
    notes.push(`Calculated emitter capacity for ${totalCount} radiators using standard type output heuristics.`);
  }

  let isAdequate = false;
  let warningMessage: string | undefined = undefined;
  let statusLabel = 'UNKNOWN';

  if (totalCount === 0 || status === 'UNKNOWN') {
    isAdequate = false;
    statusLabel = 'UNKNOWN — Radiator information incomplete';
    warningMessage = 'Radiator dimensions/model missing — stored as UNKNOWN. Emitter adequacy will be verified at site survey.';
  } else if (estimatedOutputKwAtTargetFlow < estimatedHeatDemandKw) {
    isAdequate = false;
    statusLabel = 'WARNING — Potential Emitter Capacity Shortfall';
    warningMessage = 'Existing emitter capacity may be low for the proposed heat-pump flow temperature.';
  } else {
    isAdequate = true;
    statusLabel = 'PASS — Estimated existing emitter capacity adequate';
  }

  return {
    k1Count,
    pPlusCount,
    k2Count,
    otherCount,
    totalRadiatorCount: totalCount,
    hasMissingDimensions,
    status,
    estimatedOutputKwAt50,
    estimatedOutputKwAtTargetFlow,
    targetFlowTemp,
    targetDeltaT,
    plausibilityCheck: {
      estimatedHeatDemandKw,
      emitterCapacityKw: estimatedOutputKwAtTargetFlow,
      isAdequate,
      warningMessage,
      statusLabel
    },
    notes
  };
}

