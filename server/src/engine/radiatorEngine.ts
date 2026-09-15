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
