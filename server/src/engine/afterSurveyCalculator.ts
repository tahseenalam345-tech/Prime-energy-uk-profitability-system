import { db } from '../db/connection.js';
import { calculateCommercials, CommercialOutputs, round2 } from './commercial.js';
import { evaluateBUSEligibility, BUSEligibilityOutputs } from './busEngine.js';
import { evaluateProfitabilityRating, RatingOutputs } from './ratingEngine.js';
import { evaluateCommercialRecommendation, RecommendationOutputs } from './recommendationEngine.js';

export interface AfterSurveyInputs {
  leadId: string;
  surveyorUserId: string;
  confirmedDesignHeatLossKw: number; // DO NOT RECALCULATE
  designOutdoorTemp: number;        // e.g. -2 or -3 C
  designFlowTemp: number;           // e.g. 45 or 50 C
  selectedAshpId: string;
  selectedCylinderId?: string;
  exactRadiatorsSchedule: Array<{
    productId: string;
    quantity: number;
    description?: string;
    unitPriceExVat?: number;
  }>;
  exactPipeworkSchedule?: Array<{
    description: string;
    metres: number;
    unitPriceExVat: number;
  }>;
  electricalRequirementsCost?: number;
  labourAdjustment?: number; // adjustment to baseline £1,500
  otherInstallationCosts?: number;
  surveyorNotes?: string;
  // Eligibility fields passed or queried from Lead Property
  country?: string;
  propertyStatus?: string;
  onOffGasGrid?: string;
  existingHeatingSystem?: string;
  previousGovernmentGrant?: string;
  costOverrides?: Record<string, number>;
  deletedLineIds?: string[];
  descriptionOverrides?: Record<string, string>;
  customLineItems?: Array<{
    id?: string;
    description: string;
    quantity?: number;
    unitPriceExVat?: number;
    total?: number;
    totalPriceExVat?: number;
    category?: string;
  }>;
}

export interface AfterSurveyCalculationResult {
  mode: 'AFTER_SURVEY';
  timestamp: string;
  confirmedDesignHeatLossKw: number;
  designConditions: {
    outdoorTemp: number;
    flowTemp: number;
  };
  selectedEquipment: {
    ashp: {
      id: string;
      manufacturer: string;
      model: string;
      ratedOutput: number;
      priceExVat: number;
    };
    cylinder?: {
      id: string;
      manufacturer: string;
      model: string;
      priceExVat: number;
    };
  };
  costBreakdown: {
    ashpCost: number;
    cylinderCost: number;
    radiatorsCost: number;
    pipeworkCost: number;
    accessoriesCost: number;
    electricalWorksCost: number;
    otherCosts: number;
    equipmentMaterialsTotal: number;
    labour: number;
    leadGeneration: number;
    extrasContingency: number;
    customCostsTotal?: number;
    totalJobCost: number;
  };
  bus: BUSEligibilityOutputs;
  commercials: CommercialOutputs;
  rating: RatingOutputs;
  recommendation: RecommendationOutputs;
  confidenceDisplay: 'SURVEY-CONFIRMED';
  lineItems: Array<{
    id: string;
    category: string;
    description: string;
    quantity: number;
    unitPriceExVat: number;
    totalPriceExVat: number;
    isOverridden?: boolean;
    originalPriceExVat?: number;
    originalTotal?: number;
    isCustom?: boolean;
    isDeleted?: boolean;
  }>;
  costAuditTrail?: Array<{
    lineItem: string;
    originalCost: number;
    overriddenCost: number;
    changedAt: string;
  }>;
  commercialSettingsUsed: {
    version: number;
    targetGrossMargin: number;
    labourBaseline: number;
    leadGenerationCost: number;
    extrasContingency: number;
  };
}

export async function calculateAfterSurveyViability(inputs: AfterSurveyInputs): Promise<AfterSurveyCalculationResult> {
  const timestamp = new Date().toISOString();

  // Fetch current commercial settings
  const settings = await db.get('SELECT * FROM commercial_settings WHERE active = 1 ORDER BY version DESC LIMIT 1') as {
    version: number;
    target_gross_margin: number;
    labour_baseline: number;
    lead_generation_cost: number;
    extras_contingency: number;
  } | undefined;

  const commercialSettingsUsed = {
    version: settings?.version || 1,
    targetGrossMargin: settings?.target_gross_margin ?? 0.25,
    labourBaseline: settings?.labour_baseline ?? 1500.00,
    leadGenerationCost: settings?.lead_generation_cost ?? 300.00,
    extrasContingency: settings?.extras_contingency ?? 200.00
  };

  // 1. Fetch Selected ASHP
  const ashpRow = await db.get(`
    SELECT p.id, p.manufacturer, p.model, p.rated_output_at_design, pr.price_ex_vat
    FROM products p
    LEFT JOIN product_prices pr ON p.id = pr.product_id AND pr.is_current = 1
    WHERE p.id = ?
  `, [inputs.selectedAshpId]) as {
    id: string;
    manufacturer: string;
    model: string;
    rated_output_at_design: number;
    price_ex_vat: number | null;
  } | undefined;

  if (!ashpRow) {
    throw new Error(`Selected ASHP product '${inputs.selectedAshpId}' not found in catalog.`);
  }

  let ashpCost = ashpRow.price_ex_vat || 0;

  // 2. Fetch Selected Cylinder (if any)
  let cylinderCost = 0;
  let selectedCylinderData: AfterSurveyCalculationResult['selectedEquipment']['cylinder'] = undefined;

  if (inputs.selectedCylinderId) {
    const cylRow = await db.get(`
      SELECT p.id, p.manufacturer, p.model, pr.price_ex_vat
      FROM products p
      LEFT JOIN product_prices pr ON p.id = pr.product_id AND pr.is_current = 1
      WHERE p.id = ?
    `, [inputs.selectedCylinderId]) as {
      id: string;
      manufacturer: string;
      model: string;
      price_ex_vat: number | null;
    } | undefined;

    if (cylRow) {
      cylinderCost = cylRow.price_ex_vat || 0;
      selectedCylinderData = {
        id: cylRow.id,
        manufacturer: cylRow.manufacturer,
        model: cylRow.model,
        priceExVat: cylinderCost
      };
    }
  }

  // 3. Exact Radiators Schedule
  let radiatorsCost = 0;
  const radLineItems: Array<{ description: string; quantity: number; unitPriceExVat: number; totalPriceExVat: number }> = [];

  for (const r of inputs.exactRadiatorsSchedule || []) {
    let unitPrice = r.unitPriceExVat;
    let desc = r.description;

    if (unitPrice === undefined || !desc) {
      const p = await db.get(`
        SELECT p.model, pr.price_ex_vat 
        FROM products p 
        LEFT JOIN product_prices pr ON p.id = pr.product_id AND pr.is_current = 1
        WHERE p.id = ?
      `, [r.productId]) as { model: string; price_ex_vat: number | null } | undefined;

      unitPrice = unitPrice ?? (p?.price_ex_vat || 165.00);
      desc = desc || p?.model || 'Radiator Replacement';
    }

    const subtotal = round2(unitPrice * r.quantity);
    radiatorsCost += subtotal;
    radLineItems.push({
      description: desc,
      quantity: r.quantity,
      unitPriceExVat: unitPrice,
      totalPriceExVat: subtotal
    });
  }

  // 4. Exact Pipework
  let pipeworkCost = 0;
  const pipeLineItems: Array<{ description: string; quantity: number; unitPriceExVat: number; totalPriceExVat: number }> = [];

  if (inputs.exactPipeworkSchedule && inputs.exactPipeworkSchedule.length > 0) {
    for (const p of inputs.exactPipeworkSchedule) {
      const subtotal = round2(p.metres * p.unitPriceExVat);
      pipeworkCost += subtotal;
      pipeLineItems.push({
        description: `${p.description} (${p.metres}m)`,
        quantity: p.metres,
        unitPriceExVat: p.unitPriceExVat,
        totalPriceExVat: subtotal
      });
    }
  } else {
    // Standard baseline allowance if not itemized meter by meter
    pipeworkCost = 350.00;
    pipeLineItems.push({
      description: 'Standard 22/28mm Copper & Barrier Pipework Pack',
      quantity: 1,
      unitPriceExVat: 350.00,
      totalPriceExVat: 350.00
    });
  }

  // 5. Core Accessories
  const accessoryRows = await db.all(`
    SELECT p.id, p.model, pr.price_ex_vat 
    FROM products p 
    LEFT JOIN product_prices pr ON p.id = pr.product_id AND pr.is_current = 1
    WHERE p.id IN ('acc_magnetic_filter', 'acc_safety_pack', 'acc_diverter_valve', 'acc_av_feet', 'acc_flex_hoses', 'acc_controller', 'acc_elec_pack')
  `) as Array<{ id: string; model: string; price_ex_vat: number | null }>;

  let accessoriesCost = 0;
  const accLineItems: Array<{ description: string; quantity: number; unitPriceExVat: number; totalPriceExVat: number }> = [];

  for (const a of accessoryRows) {
    const price = a.price_ex_vat || 100.00;
    accessoriesCost += price;
    accLineItems.push({
      description: a.model,
      quantity: 1,
      unitPriceExVat: price,
      totalPriceExVat: price
    });
  }

  // 6. Electrical works & other installation costs
  let electricalWorksCost = round2(inputs.electricalRequirementsCost || 0);
  let otherCosts = round2(inputs.otherInstallationCosts || 0);

  // 7. Base Labour, Lead Gen & Contingency
  const labourAdjustment = inputs.labourAdjustment || 0;
  let labour = round2(commercialSettingsUsed.labourBaseline + labourAdjustment);
  let leadGeneration = round2(commercialSettingsUsed.leadGenerationCost);
  let extrasContingency = round2(commercialSettingsUsed.extrasContingency);

  // 8. Cost Overrides, Deleted Lines and Audit Trail
  const deletedSet = new Set(inputs.deletedLineIds || []);
  const descOverrides = inputs.descriptionOverrides || {};
  const costOverrides = inputs.costOverrides || {};
  const costAuditTrail: Array<{ lineItem: string; originalCost: number; overriddenCost: number; changedAt: string }> = [];

  const applyOverride = (keys: string[], currentVal: number): { value: number; isOverridden: boolean; originalTotal: number } => {
    for (const key of keys) {
      if (deletedSet.has(key)) {
        if (currentVal !== 0) {
          costAuditTrail.push({
            lineItem: keys[0],
            originalCost: currentVal,
            overriddenCost: 0,
            changedAt: timestamp
          });
        }
        return { value: 0, isOverridden: true, originalTotal: currentVal };
      }
    }
    for (const key of keys) {
      if (costOverrides[key] !== undefined) {
        const val = round2(costOverrides[key]);
        if (val !== currentVal) {
          costAuditTrail.push({
            lineItem: keys[0],
            originalCost: currentVal,
            overriddenCost: val,
            changedAt: timestamp
          });
        }
        return { value: val, isOverridden: true, originalTotal: currentVal };
      }
    }
    return { value: currentVal, isOverridden: false, originalTotal: currentVal };
  };

  const ashpRes = applyOverride(['ASHP', 'ashpCost', 'ASHP Equipment', 'line_ashp'], ashpCost);
  ashpCost = ashpRes.value;

  const cylRes = applyOverride(['Cylinder', 'cylinderCost', 'Hot Water Cylinder', 'line_cylinder'], cylinderCost);
  cylinderCost = cylRes.value;

  const radRes = applyOverride(['Radiators', 'radiatorsCost', 'Radiators Allowance', 'line_radiators'], radiatorsCost);
  radiatorsCost = radRes.value;

  const pipeRes = applyOverride(['Pipework', 'pipeworkCost', 'Pipework & Materials', 'line_pipework'], pipeworkCost);
  pipeworkCost = pipeRes.value;

  const accRes = applyOverride(['Accessories', 'accessoriesCost', 'Accessories & Controls', 'line_accessories'], accessoriesCost);
  accessoriesCost = accRes.value;

  const elecRes = applyOverride(['Electrical Works', 'electricalWorksCost', 'line_elec', 'line_electrical'], electricalWorksCost);
  electricalWorksCost = elecRes.value;

  const otherRes = applyOverride(['Other Works', 'otherCosts', 'line_other'], otherCosts);
  otherCosts = otherRes.value;

  const labourRes = applyOverride(['Labour', 'labour', 'Installation Labour', 'line_labour'], labour);
  labour = labourRes.value;

  const leadGenRes = applyOverride(['LeadGeneration', 'leadGeneration', 'leadGen', 'Lead Acquisition Cost', 'line_leadgen'], leadGeneration);
  leadGeneration = leadGenRes.value;

  const contRes = applyOverride(['Contingency', 'extrasContingency', 'contingency', 'Contingency / Sundries', 'line_contingency'], extrasContingency);
  extrasContingency = contRes.value;

  // Custom Line Items
  let customCostsTotal = 0;
  const customItemsFormatted: Array<{
    id: string;
    category: string;
    description: string;
    quantity: number;
    unitPriceExVat: number;
    totalPriceExVat: number;
    isOverridden: boolean;
    originalTotal?: number;
    isCustom: boolean;
  }> = [];

  if (inputs.customLineItems && inputs.customLineItems.length > 0) {
    inputs.customLineItems.forEach((item, idx) => {
      const id = item.id || `line_custom_${idx}`;
      if (deletedSet.has(id)) {
        return;
      }
      const qty = item.quantity && item.quantity > 0 ? item.quantity : 1;
      let amount = item.totalPriceExVat ?? item.total;
      if (amount === undefined) {
        amount = round2((item.unitPriceExVat || 0) * qty);
      }
      if (costOverrides[id] !== undefined) {
        amount = round2(costOverrides[id]);
      }
      const unitPrice = item.unitPriceExVat !== undefined ? item.unitPriceExVat : round2(amount / qty);
      const desc = descOverrides[id] || item.description || `Custom Line Item #${idx + 1}`;
      customCostsTotal = round2(customCostsTotal + amount);
      customItemsFormatted.push({
        id,
        category: item.category || 'Custom Line Item',
        description: desc,
        quantity: qty,
        unitPriceExVat: unitPrice,
        totalPriceExVat: amount,
        isOverridden: true,
        originalTotal: amount,
        isCustom: true
      });
    });
  }

  const equipmentMaterialsTotal = round2(ashpCost + cylinderCost + radiatorsCost + pipeworkCost + accessoriesCost + electricalWorksCost + otherCosts);
  const totalJobCost = round2(equipmentMaterialsTotal + labour + leadGeneration + extrasContingency + customCostsTotal);

  const costBreakdown = {
    ashpCost,
    cylinderCost,
    radiatorsCost,
    pipeworkCost,
    accessoriesCost,
    electricalWorksCost,
    otherCosts,
    equipmentMaterialsTotal,
    labour,
    leadGeneration,
    extrasContingency,
    customCostsTotal,
    totalJobCost
  };

  // BUS Grant Evaluation
  const bus = await evaluateBUSEligibility({
    country: inputs.country,
    propertyStatus: inputs.propertyStatus,
    onOffGasGrid: inputs.onOffGasGrid,
    existingHeatingSystem: inputs.existingHeatingSystem,
    previousGovernmentGrant: inputs.previousGovernmentGrant
  });

  // Commercial Margin Calculation
  const commercials = calculateCommercials({
    totalJobCost,
    targetGrossMargin: commercialSettingsUsed.targetGrossMargin,
    busGrant: bus.grantAmount
  });

  // Profitability Rating
  const rating = evaluateProfitabilityRating({
    grossMarginPercent: commercials.grossMarginPercent,
    grossProfit: commercials.grossProfit,
    confidenceLevel: 'HIGH' // After survey has High confidence (MCS confirmed)
  });

  // Commercial Recommendation
  const recommendation = evaluateCommercialRecommendation({
    busStatus: bus.status,
    grossMarginPercent: commercials.grossMarginPercent,
    grossProfit: commercials.grossProfit,
    confidenceLevel: 'HIGH',
    customerContribution: commercials.customerContribution,
    viabilityBlockers: [],
    commercialRisks: [],
    manualReviewFlags: []
  });

  // Schedule Line Items
  const standardLineItems = [
    {
      id: 'line_ashp',
      category: 'ASHP Equipment',
      description: descOverrides['line_ashp'] || descOverrides['ASHP Equipment'] || descOverrides['ASHP'] || `${ashpRow.manufacturer} ${ashpRow.model} (${ashpRow.rated_output_at_design}kW MCS confirmed)`,
      quantity: 1,
      unitPriceExVat: ashpCost,
      totalPriceExVat: ashpCost,
      isOverridden: costOverrides['ASHP'] !== undefined,
      originalPriceExVat: costOverrides['ASHP'] !== undefined ? (ashpRow.price_ex_vat || 0) : ashpCost,
      originalTotal: costOverrides['ASHP'] !== undefined ? (ashpRow.price_ex_vat || 0) : ashpCost,
      isDeleted: deletedSet.has('line_ashp') || deletedSet.has('ASHP') || deletedSet.has('ASHP Equipment')
    },
    ...(selectedCylinderData ? [{
      id: 'line_cylinder',
      category: 'Hot Water Cylinder',
      description: descOverrides['line_cylinder'] || descOverrides['Hot Water Cylinder'] || descOverrides['Cylinder'] || `${selectedCylinderData.manufacturer} ${selectedCylinderData.model}`,
      quantity: 1,
      unitPriceExVat: cylinderCost,
      totalPriceExVat: cylinderCost,
      isOverridden: costOverrides['Cylinder'] !== undefined,
      originalPriceExVat: costOverrides['Cylinder'] !== undefined ? (selectedCylinderData.priceExVat || 0) : cylinderCost,
      originalTotal: costOverrides['Cylinder'] !== undefined ? (selectedCylinderData.priceExVat || 0) : cylinderCost,
      isDeleted: deletedSet.has('line_cylinder') || deletedSet.has('Cylinder') || deletedSet.has('Hot Water Cylinder')
    }] : []),
    {
      id: 'line_radiators',
      category: 'Radiator Schedule',
      description: descOverrides['line_radiators'] || descOverrides['Radiators'] || `Surveyor itemized radiator schedule (${radLineItems.length} items)`,
      quantity: radLineItems.reduce((sum, r) => sum + r.quantity, 0),
      unitPriceExVat: radiatorsCost > 0 ? round2(radiatorsCost / Math.max(1, radLineItems.reduce((sum, r) => sum + r.quantity, 0))) : 0,
      totalPriceExVat: radiatorsCost,
      isOverridden: costOverrides['Radiators'] !== undefined,
      originalPriceExVat: costOverrides['Radiators'] !== undefined ? radLineItems.reduce((sum, r) => sum + r.totalPriceExVat, 0) : radiatorsCost,
      originalTotal: costOverrides['Radiators'] !== undefined ? radLineItems.reduce((sum, r) => sum + r.totalPriceExVat, 0) : radiatorsCost,
      isDeleted: deletedSet.has('line_radiators') || deletedSet.has('Radiators')
    },
    {
      id: 'line_pipework',
      category: 'Pipework Schedule',
      description: descOverrides['line_pipework'] || descOverrides['Pipework'] || `Surveyor itemized pipework (${pipeLineItems.reduce((sum, p) => sum + p.quantity, 0)}m)`,
      quantity: 1,
      unitPriceExVat: pipeworkCost,
      totalPriceExVat: pipeworkCost,
      isOverridden: costOverrides['Pipework'] !== undefined,
      originalPriceExVat: costOverrides['Pipework'] !== undefined ? pipeLineItems.reduce((sum, p) => sum + p.totalPriceExVat, 0) : pipeworkCost,
      originalTotal: costOverrides['Pipework'] !== undefined ? pipeLineItems.reduce((sum, p) => sum + p.totalPriceExVat, 0) : pipeworkCost,
      isDeleted: deletedSet.has('line_pipework') || deletedSet.has('Pipework')
    },
    {
      id: 'line_accessories',
      category: 'Accessories Pack',
      description: descOverrides['line_accessories'] || descOverrides['Accessories'] || 'Full heat pump hydraulic accessories pack',
      quantity: 1,
      unitPriceExVat: accessoriesCost,
      totalPriceExVat: accessoriesCost,
      isOverridden: costOverrides['Accessories'] !== undefined,
      originalPriceExVat: costOverrides['Accessories'] !== undefined ? accLineItems.reduce((sum, a) => sum + a.totalPriceExVat, 0) : accessoriesCost,
      originalTotal: costOverrides['Accessories'] !== undefined ? accLineItems.reduce((sum, a) => sum + a.totalPriceExVat, 0) : accessoriesCost,
      isDeleted: deletedSet.has('line_accessories') || deletedSet.has('Accessories')
    },
    ...(electricalWorksCost > 0 || deletedSet.has('line_electrical') || deletedSet.has('line_elec') ? [{
      id: 'line_elec',
      category: 'Electrical Works',
      description: descOverrides['line_elec'] || descOverrides['line_electrical'] || descOverrides['Electrical Works'] || 'Surveyor specified consumer unit & electrical supply upgrades',
      quantity: 1,
      unitPriceExVat: electricalWorksCost,
      totalPriceExVat: electricalWorksCost,
      isOverridden: costOverrides['Electrical Works'] !== undefined || costOverrides['line_elec'] !== undefined,
      originalPriceExVat: inputs.electricalRequirementsCost || 0,
      originalTotal: inputs.electricalRequirementsCost || 0,
      isDeleted: deletedSet.has('line_electrical') || deletedSet.has('line_elec') || deletedSet.has('Electrical Works')
    }] : []),
    ...(otherCosts > 0 || deletedSet.has('line_other') ? [{
      id: 'line_other',
      category: 'Other Site Works',
      description: descOverrides['line_other'] || descOverrides['Other Works'] || 'Surveyor specified ground pad / builder / scaffolding works',
      quantity: 1,
      unitPriceExVat: otherCosts,
      totalPriceExVat: otherCosts,
      isOverridden: costOverrides['Other Works'] !== undefined,
      originalPriceExVat: inputs.otherInstallationCosts || 0,
      originalTotal: inputs.otherInstallationCosts || 0,
      isDeleted: deletedSet.has('line_other') || deletedSet.has('Other Works')
    }] : []),
    {
      id: 'line_labour',
      category: 'Installation Labour',
      description: descOverrides['line_labour'] || descOverrides['Labour'] || `Surveyor confirmed installation labour (${labourAdjustment >= 0 ? '+' : ''}£${labourAdjustment} adjustment)`,
      quantity: 1,
      unitPriceExVat: labour,
      totalPriceExVat: labour,
      isOverridden: costOverrides['Labour'] !== undefined,
      originalPriceExVat: commercialSettingsUsed.labourBaseline + labourAdjustment,
      originalTotal: commercialSettingsUsed.labourBaseline + labourAdjustment,
      isDeleted: deletedSet.has('line_labour') || deletedSet.has('Labour')
    },
    {
      id: 'line_leadgen',
      category: 'Lead Acquisition Cost',
      description: descOverrides['line_leadgen'] || descOverrides['LeadGen'] || 'Lead marketing & sales acquisition allocation',
      quantity: 1,
      unitPriceExVat: leadGeneration,
      totalPriceExVat: leadGeneration,
      isOverridden: costOverrides['LeadGeneration'] !== undefined,
      originalPriceExVat: commercialSettingsUsed.leadGenerationCost,
      originalTotal: commercialSettingsUsed.leadGenerationCost,
      isDeleted: deletedSet.has('line_leadgen') || deletedSet.has('LeadGeneration')
    },
    {
      id: 'line_contingency',
      category: 'Contingency / Sundries',
      description: descOverrides['line_contingency'] || descOverrides['Contingency'] || 'Surveyor site contingency & sundries allowance',
      quantity: 1,
      unitPriceExVat: extrasContingency,
      totalPriceExVat: extrasContingency,
      isOverridden: costOverrides['Contingency'] !== undefined,
      originalPriceExVat: commercialSettingsUsed.extrasContingency,
      originalTotal: commercialSettingsUsed.extrasContingency,
      isDeleted: deletedSet.has('line_contingency') || deletedSet.has('Contingency')
    },
    ...customItemsFormatted
  ];

  return {
    mode: 'AFTER_SURVEY',
    timestamp,
    confirmedDesignHeatLossKw: inputs.confirmedDesignHeatLossKw,
    designConditions: {
      outdoorTemp: inputs.designOutdoorTemp,
      flowTemp: inputs.designFlowTemp
    },
    selectedEquipment: {
      ashp: {
        id: ashpRow.id,
        manufacturer: ashpRow.manufacturer,
        model: ashpRow.model,
        ratedOutput: ashpRow.rated_output_at_design,
        priceExVat: ashpCost
      },
      cylinder: selectedCylinderData
    },
    costBreakdown,
    bus,
    commercials,
    rating,
    recommendation,
    confidenceDisplay: 'SURVEY-CONFIRMED',
    lineItems: standardLineItems,
    costAuditTrail,
    commercialSettingsUsed
  };
}
