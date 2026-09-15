import { db } from '../db/connection.js';
import { calculateIndicativeHeatDemand, HeatDemandOutputs } from './heatDemand.js';
import { selectRecommendedASHP, ASHPSelectionResult } from './ashpSelector.js';
import { selectRecommendedCylinder, CylinderOutputs } from './cylinderEngine.js';
import { estimateRadiatorRequirements, RadiatorEstimationOutputs, evaluateExistingEmitterCapacity, EmitterCapacityOutputs } from './radiatorEngine.js';
import { evaluateAccessoriesAndBom, BomEvaluationOutputs } from './accessoryBomEngine.js';
import { evaluateBUSEligibility, BUSEligibilityOutputs } from './busEngine.js';
import { calculateCommercials, CommercialOutputs, round2 } from './commercial.js';
import { evaluateConfidence, ConfidenceOutputs } from './confidenceEngine.js';
import { evaluateProfitabilityRating, RatingOutputs } from './ratingEngine.js';
import { evaluateCommercialRecommendation, RecommendationOutputs } from './recommendationEngine.js';

export interface NewLeadPropertyInputs {
  addressLine1?: string;
  addressLine2?: string;
  postcode?: string;
  country?: string; // England, Wales, Scotland, Northern Ireland
  epcRating?: string;
  epcFloorArea?: number;
  propertyType?: string;
  propertyStatus?: string; // Existing property, Developer new-build, Self-build
  bedrooms?: number;
  bathrooms?: number;
  ownership?: string;
  wallInsulation?: string;
  roofInsulation?: string;
  existingHeatingSystem?: string;
  existingFuelType?: string;
  boilerType?: string;
  onOffGasGrid?: string;
  cylinderSpace?: string;
  existingRadiatorCount?: number;
  k1Count?: number;
  pPlusCount?: number;
  k2Count?: number;
  otherCount?: number;
  existingEmitterDimensions?: Array<{ type: string; heightMm: number; lengthMm: number }>;
  existingRadiatorDetails?: string;
  existingPipework?: string;
  previousGovernmentGrant?: string;
  fuseBoardCondition?: string;
  conservationArea?: string;
  boundaryPlanningRisk?: string;
  listedBuilding?: string;
  annualHeatingKwh?: number;
  annualHotWaterKwh?: number;
  epcCertificateNumber?: string;
  epcDate?: string;
  storeys?: number;
  leadSource?: string;
  salesNotes?: string;
  // Manual Overrides
  overrideAshpId?: string;
  overrideCylinderId?: string;
  costOverrides?: Record<string, number>;
  deletedLineIds?: string[];
  descriptionOverrides?: Record<string, string>;
  customLineItems?: Array<{
    id?: string;
    category?: string;
    description: string;
    quantity?: number;
    unitPriceExVat?: number;
    totalPriceExVat?: number;
    total?: number;
  }>;
  overrideTargetMargin?: number;
}

export interface NewLeadCalculationResult {
  mode: 'NEW_LEAD';
  disclaimer: string;
  timestamp: string;
  hasSufficientData: boolean;
  autoNote: string;
  existingEmitterInformation?: {
    k1Count: number;
    pPlusCount: number;
    k2Count: number;
    otherCount: number;
    totalCount: number;
    dimensions?: Array<{ type: string; heightMm: number; lengthMm: number }>;
    note: string;
  };
  heatDemand: HeatDemandOutputs;
  emitterCapacity: EmitterCapacityOutputs;
  ashp: ASHPSelectionResult;
  cylinder: CylinderOutputs;
  radiators: RadiatorEstimationOutputs;
  bom: BomEvaluationOutputs;
  bus: BUSEligibilityOutputs;
  costBreakdown: {
    ashpCost: number;
    cylinderCost: number;
    radiatorsAllowance: number;
    pipeworkAllowance: number;
    accessoriesCost: number;
    combiConversionAllowance: number;
    equipmentMaterials: number;
    labour: number;
    leadGeneration: number;
    extrasContingency: number;
    customCostsTotal: number;
    totalJobCost: number;
  };
  commercials: CommercialOutputs;
  confidence: ConfidenceOutputs;
  rating: RatingOutputs;
  recommendation: RecommendationOutputs;
  assumptionsAndDataGaps: string[];
  costOverridesApplied: Record<string, { original: number; overridden: number }>;
  costAuditTrail?: Array<{
    lineItem: string;
    originalCost: number;
    overriddenCost: number;
    changedAt: string;
  }>;
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
  commercialSettingsUsed: {
    version: number;
    targetGrossMargin: number;
    labourBaseline: number;
    leadGenerationCost: number;
    extrasContingency: number;
    combiConversionAllowance: number;
    microboreRepipeAllowance: number;
  };
  ruleEvidenceLinks: {
    bus: string;
    heatDemand: string;
    ashp: string;
    cylinder: string;
    commercial: string;
  };
}

export async function calculateNewLeadEstimate(inputs: NewLeadPropertyInputs): Promise<NewLeadCalculationResult> {
  const timestamp = new Date().toISOString();
  const disclaimer = 'PRE-SURVEY ESTIMATE — NOT FINAL MCS HEAT-LOSS DESIGN. Sizing and costs subject to full technical site survey.';
  const assumptionsAndDataGaps: string[] = [];
  const costOverridesApplied: Record<string, { original: number; overridden: number }> = {};

  // 1. Fetch current commercial settings
  const settings = await db.get('SELECT * FROM commercial_settings WHERE active = 1 ORDER BY version DESC LIMIT 1') as {
    version: number;
    target_gross_margin: number;
    labour_baseline: number;
    lead_generation_cost: number;
    extras_contingency: number;
    combi_conversion_allowance: number;
    microbore_repipe_allowance: number;
  } | undefined;

  const commercialSettingsUsed = {
    version: settings?.version || 1,
    targetGrossMargin: inputs.overrideTargetMargin ?? (settings?.target_gross_margin === 0.25 ? 0.07 : (settings?.target_gross_margin ?? 0.07)),
    labourBaseline: settings?.labour_baseline ?? 1500.00,
    leadGenerationCost: settings?.lead_generation_cost ?? 300.00,
    extrasContingency: settings?.extras_contingency ?? 200.00,
    combiConversionAllowance: settings?.combi_conversion_allowance ?? 500.00,
    microboreRepipeAllowance: settings?.microbore_repipe_allowance ?? 1800.00
  };

  const hasSufficientData = Boolean(
    (inputs.epcFloorArea && inputs.epcFloorArea > 0) ||
    (inputs.epcRating && inputs.epcRating !== 'Unknown') ||
    (inputs.propertyType && inputs.propertyType !== '') ||
    inputs.annualHeatingKwh ||
    inputs.overrideAshpId
  );

  const k1Count = inputs.k1Count || 0;
  const pPlusCount = inputs.pPlusCount || 0;
  const k2Count = inputs.k2Count || 0;
  const otherCount = inputs.otherCount || 0;
  const totalEmitterCount = (k1Count + pPlusCount + k2Count + otherCount) || inputs.existingRadiatorCount || 0;

  const existingEmitterInformation = {
    k1Count,
    pPlusCount,
    k2Count,
    otherCount,
    totalCount: totalEmitterCount,
    totalRadiatorCount: totalEmitterCount,
    dimensions: inputs.existingEmitterDimensions,
    dimensionsText: inputs.existingEmitterDimensions,
    note: 'Stored as EXISTING EMITTER INFORMATION supporting context. Emitter counts do NOT alter pre-survey heat loss estimation without an evidence-backed rule.'
  };

  // 2. Heat Demand Estimation (Empirical Pre-Survey Heuristic)
  const heatDemandObj = hasSufficientData ? await calculateIndicativeHeatDemand({
    floorAreaM2: inputs.epcFloorArea || 0,
    epcRating: inputs.epcRating,
    propertyType: inputs.propertyType,
    wallInsulation: inputs.wallInsulation,
    roofInsulation: inputs.roofInsulation,
    annualHeatingKwh: inputs.annualHeatingKwh,
    annualHotWaterKwh: inputs.annualHotWaterKwh,
    epcCertificateNumber: inputs.epcCertificateNumber,
    epcDate: inputs.epcDate,
    storeys: inputs.storeys
  }) : null;

  const heatDemand = heatDemandObj ? {
    ...heatDemandObj,
    estimatedDesignHeatLossKw: heatDemandObj.maxDemandKw
  } : {
    baselineWPerM2: 0,
    baselineSource: 'DEFAULT_FALLBACK' as const,
    propertyMultiplier: 1.0,
    propertyType: inputs.propertyType || 'Unknown',
    centralDemandKw: 0,
    minDemandKw: 0,
    maxDemandKw: 0,
    estimatedDesignHeatLossKw: null,
    displayRange: 'Not calculated (Awaiting property data)',
    annualHeatingKwh: inputs.annualHeatingKwh || null,
    annualHotWaterKwh: inputs.annualHotWaterKwh || null,
    manualReviewFlag: false,
    notes: ['Awaiting property floor area or archetype inputs for heat demand estimate.'],
    disclaimer: 'PRE-SURVEY ESTIMATE',
    ruleEvidenceId: 'EPC_HEURISTIC_PRE_SURVEY_W_M2'
  };

  if (hasSufficientData && heatDemand.notes) {
    assumptionsAndDataGaps.push(...heatDemand.notes);
  }

  // 3. ASHP Selection (Supports user manual override)
  const ashp = hasSufficientData || inputs.overrideAshpId ? await selectRecommendedASHP(heatDemand.maxDemandKw, {
    overrideProductId: inputs.overrideAshpId
  }) : {
    recommendedProduct: null,
    selectedProduct: null,
    isManualOverride: false,
    alternatives: [],
    status: 'NO_QUALIFYING_MODEL' as const,
    notes: ['Awaiting property floor area or EPC inputs for ASHP recommendation.'],
    disclaimer: 'PRE-SURVEY ESTIMATE',
    ruleEvidenceId: 'ASHP_RECOMMENDATION'
  };
  if (hasSufficientData) {
    assumptionsAndDataGaps.push(...ashp.notes);
  }

  // 4. Cylinder Selection (Supports user manual override)
  const cylinder = hasSufficientData || inputs.overrideCylinderId ? await selectRecommendedCylinder({
    bedrooms: inputs.bedrooms,
    bathrooms: inputs.bathrooms,
    cylinderSpace: inputs.cylinderSpace,
    boilerType: inputs.boilerType,
    overrideCylinderId: inputs.overrideCylinderId
  }) : {
    recommendedProduct: null,
    selectedProduct: null,
    isManualOverride: false,
    alternatives: [],
    viabilityBlocker: false,
    notes: ['Awaiting hot water demand inputs for cylinder recommendation.'],
    assumptions: [],
    disclaimer: 'PRE-SURVEY ESTIMATE',
    ruleEvidenceId: 'CYLINDER_RECOMMENDATION'
  };
  if (hasSufficientData) {
    assumptionsAndDataGaps.push(...cylinder.notes, ...cylinder.assumptions);
  }

  // 5. Radiator Engine & Emitter Capacity Plausibility Evaluation
  const radiators = await estimateRadiatorRequirements({
    heatDemandKw: heatDemand.centralDemandKw,
    existingRadiatorCount: totalEmitterCount
  });
  
  const emitterCapacity = evaluateExistingEmitterCapacity({
    k1Count,
    pPlusCount,
    k2Count,
    otherCount,
    dimensionsText: inputs.existingEmitterDimensions,
    targetFlowTemp: 45,
    estimatedHeatDemandKw: heatDemand.maxDemandKw
  });

  if (hasSufficientData) {
    assumptionsAndDataGaps.push(...radiators.notes);
    assumptionsAndDataGaps.push(...emitterCapacity.notes);
  }

  // 6. Accessories & BOM Engine
  const activeAshp = ashp.selectedProduct || ashp.recommendedProduct;
  const bom = await evaluateAccessoriesAndBom({
    boilerType: inputs.boilerType,
    cylinderSpace: inputs.cylinderSpace,
    existingPipework: inputs.existingPipework,
    ashpPhase: activeAshp?.phase || 1,
    hasCylinder: !cylinder.viabilityBlocker
  });
  assumptionsAndDataGaps.push(...bom.warnings);

  // 7. BUS Grant Engine (Authoritative)
  const bus = await evaluateBUSEligibility({
    country: inputs.country,
    propertyStatus: inputs.propertyStatus,
    onOffGasGrid: inputs.onOffGasGrid,
    existingHeatingSystem: inputs.existingHeatingSystem,
    existingFuelType: inputs.existingFuelType,
    previousGovernmentGrant: inputs.previousGovernmentGrant
  });
  assumptionsAndDataGaps.push(...bus.notes);

  // 8. Cost Aggregation with Editable Cost Overrides
  const activeCylinder = cylinder.selectedProduct || cylinder.recommendedProduct;

  let ashpCost = round2(activeAshp?.priceExVat || 0);
  let cylinderCost = round2(activeCylinder?.priceExVat || 0);
  let radsCost = round2(radiators.totalRadiatorCostExVat);
  let pipeCost = round2(bom.totalPipeworkCostExVat);
  let accCost = round2(bom.totalAccessoriesCostExVat);
  let combiCost = round2(bom.combiConversionCostExVat);
  let labour = round2(commercialSettingsUsed.labourBaseline);
  let leadGen = round2(commercialSettingsUsed.leadGenerationCost);
  let extras = round2(commercialSettingsUsed.extrasContingency);

  const deletedSet = new Set(inputs.deletedLineIds || []);
  const descOverrides = inputs.descriptionOverrides || {};
  const overrides = inputs.costOverrides || {};
  const costAuditTrail: Array<{ lineItem: string; originalCost: number; overriddenCost: number; changedAt: string }> = [];

  const applyOverride = (keys: string[], currentVal: number): { value: number; isOverridden: boolean; originalTotal: number } => {
    for (const key of keys) {
      if (deletedSet.has(key)) {
        if (currentVal !== 0) {
          costOverridesApplied[keys[0]] = { original: currentVal, overridden: 0 };
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
      if (overrides[key] !== undefined) {
        const val = round2(overrides[key]);
        if (val !== currentVal) {
          costOverridesApplied[keys[0]] = { original: currentVal, overridden: val };
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

  const radRes = applyOverride(['Radiators', 'radiatorsAllowance', 'radiatorsCost', 'Radiators Allowance', 'line_radiators'], radsCost);
  radsCost = radRes.value;

  const pipeRes = applyOverride(['Pipework', 'pipeworkAllowance', 'pipeworkCost', 'Pipework & Materials', 'line_pipework'], pipeCost);
  pipeCost = pipeRes.value;

  const accRes = applyOverride(['Accessories', 'accessoriesCost', 'Accessories & Controls', 'line_accessories'], accCost);
  accCost = accRes.value;

  const combiRes = applyOverride(['Combi Conversion', 'combiCost', 'combiConversionAllowance', 'line_combi'], combiCost);
  combiCost = combiRes.value;

  const labourRes = applyOverride(['Labour', 'labour', 'Installation Labour', 'line_labour'], labour);
  labour = labourRes.value;

  const leadGenRes = applyOverride(['LeadGeneration', 'leadGeneration', 'leadGen', 'Lead Acquisition Cost', 'line_leadgen'], leadGen);
  leadGen = leadGenRes.value;

  const contRes = applyOverride(['Contingency', 'extrasContingency', 'contingency', 'Contingency / Sundries', 'line_contingency'], extras);
  extras = contRes.value;

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
      if (overrides[id] !== undefined) {
        amount = round2(overrides[id]);
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

  const equipmentMaterials = hasSufficientData ? round2(ashpCost + cylinderCost + radsCost + pipeCost + accCost + combiCost) : 0;
  const totalJobCost = hasSufficientData ? round2(equipmentMaterials + labour + leadGen + extras + customCostsTotal) : 0;

  const costBreakdown = {
    ashpCost: hasSufficientData ? ashpCost : 0,
    cylinderCost: hasSufficientData ? cylinderCost : 0,
    radiatorsAllowance: hasSufficientData ? radsCost : 0,
    pipeworkAllowance: hasSufficientData ? pipeCost : 0,
    accessoriesCost: hasSufficientData ? accCost : 0,
    combiConversionAllowance: hasSufficientData ? combiCost : 0,
    equipmentMaterials,
    labour: hasSufficientData ? labour : 0,
    leadGeneration: hasSufficientData ? leadGen : 0,
    extrasContingency: hasSufficientData ? extras : 0,
    customCostsTotal: hasSufficientData ? customCostsTotal : 0,
    totalJobCost
  };

  // 9. True Commercial Gross Margin Mathematics
  const commercials = calculateCommercials({
    totalJobCost,
    targetGrossMargin: commercialSettingsUsed.targetGrossMargin,
    busGrant: hasSufficientData ? bus.grantAmount : 0
  });

  // 10. Confidence Evaluation
  const confidence = await evaluateConfidence({
    epcRating: inputs.epcRating,
    floorAreaM2: inputs.epcFloorArea,
    propertyType: inputs.propertyType,
    wallInsulation: inputs.wallInsulation,
    roofInsulation: inputs.roofInsulation,
    existingHeatingSystem: inputs.existingHeatingSystem,
    radiatorCount: totalEmitterCount,
    radiatorDetails: inputs.existingEmitterDimensions || (totalEmitterCount > 0 ? `${totalEmitterCount} radiators` : undefined),
    hasMissingDimensions: emitterCapacity.hasMissingDimensions,
    emitterStatus: emitterCapacity.status,
    bathrooms: inputs.bathrooms
  });

  // 11. Profitability Rating
  const rating = evaluateProfitabilityRating({
    grossMarginPercent: commercials.grossMarginPercent,
    grossProfit: commercials.grossProfit,
    confidenceLevel: confidence.level
  });

  // 12. Recommendation
  const viabilityBlockers: string[] = [];
  if (cylinder.viabilityBlocker && cylinderCost > 0) {
    viabilityBlockers.push('Physical cylinder space confirmed unavailable (Airing cupboard / loft / garage space required).');
  }

  const manualReviewFlags: string[] = [];
  if (heatDemand.manualReviewFlag) {
    manualReviewFlags.push('Flat / apartment building structure requires surveyor structural review and leasehold planning permissions.');
  }
  if (ashp.isManualOverride) {
    assumptionsAndDataGaps.push(`Notice: Commercial estimate calculated with user-selected ASHP override: ${activeAshp?.brand} ${activeAshp?.model}.`);
  }
  if (cylinder.isManualOverride) {
    assumptionsAndDataGaps.push(`Notice: Commercial estimate calculated with user-selected cylinder override: ${activeCylinder?.brand} ${activeCylinder?.model}.`);
  }

  const recommendation = evaluateCommercialRecommendation({
    busStatus: bus.status,
    grossMarginPercent: commercials.grossMarginPercent,
    grossProfit: commercials.grossProfit,
    confidenceLevel: confidence.level,
    customerContribution: commercials.customerContribution,
    viabilityBlockers,
    commercialRisks: bom.risks,
    manualReviewFlags
  });

  // 13. Line Items Schedule
  const standardLineItems = [
    {
      id: 'line_ashp',
      category: 'ASHP Equipment',
      description: descOverrides['line_ashp'] || descOverrides['ASHP Equipment'] || descOverrides['ASHP'] || (activeAshp ? `${activeAshp.brand} ${activeAshp.model} (${activeAshp.ratedOutputAtDesign}kW rated @ ${activeAshp.designCondition})` : 'ASHP Equipment'),
      quantity: 1,
      unitPriceExVat: ashpCost,
      totalPriceExVat: ashpCost,
      isOverridden: costOverridesApplied['ASHP'] !== undefined,
      originalPriceExVat: costOverridesApplied['ASHP']?.original ?? (activeAshp?.priceExVat || 0),
      originalTotal: costOverridesApplied['ASHP']?.original ?? (activeAshp?.priceExVat || 0),
      isDeleted: deletedSet.has('line_ashp') || deletedSet.has('ASHP') || deletedSet.has('ASHP Equipment')
    },
    {
      id: 'line_cylinder',
      category: 'Hot Water Cylinder',
      description: descOverrides['line_cylinder'] || descOverrides['Hot Water Cylinder'] || descOverrides['Cylinder'] || (activeCylinder ? `${activeCylinder.brand} ${activeCylinder.model} (${activeCylinder.volumeLitres}L)` : 'Cylinder'),
      quantity: cylinderCost > 0 ? 1 : 0,
      unitPriceExVat: cylinderCost,
      totalPriceExVat: cylinderCost,
      isOverridden: costOverridesApplied['Cylinder'] !== undefined,
      originalPriceExVat: costOverridesApplied['Cylinder']?.original ?? (activeCylinder?.priceExVat || 0),
      originalTotal: costOverridesApplied['Cylinder']?.original ?? (activeCylinder?.priceExVat || 0),
      isDeleted: deletedSet.has('line_cylinder') || deletedSet.has('Cylinder') || deletedSet.has('Hot Water Cylinder')
    },
    {
      id: 'line_radiators',
      category: 'Radiators Allowance',
      description: descOverrides['line_radiators'] || descOverrides['Radiators Allowance'] || descOverrides['Radiators'] || `Emitters upgrade allowance (${radiators.estimatedReplacementCount} radiator replacements estimated)`,
      quantity: radiators.estimatedReplacementCount,
      unitPriceExVat: radiators.estimatedReplacementCount > 0 ? round2(radsCost / radiators.estimatedReplacementCount) : 0,
      totalPriceExVat: radsCost,
      isOverridden: costOverridesApplied['Radiators'] !== undefined,
      originalPriceExVat: costOverridesApplied['Radiators']?.original ?? radiators.totalRadiatorCostExVat,
      originalTotal: costOverridesApplied['Radiators']?.original ?? radiators.totalRadiatorCostExVat,
      isDeleted: deletedSet.has('line_radiators') || deletedSet.has('Radiators') || deletedSet.has('Radiators Allowance')
    },
    {
      id: 'line_pipework',
      category: 'Pipework & Materials',
      description: descOverrides['line_pipework'] || descOverrides['Pipework & Materials'] || descOverrides['Pipework'] || 'Standard 22-28mm copper/insulated pipework & system bypass package',
      quantity: 1,
      unitPriceExVat: pipeCost,
      totalPriceExVat: pipeCost,
      isOverridden: costOverridesApplied['Pipework'] !== undefined,
      originalPriceExVat: costOverridesApplied['Pipework']?.original ?? bom.totalPipeworkCostExVat,
      originalTotal: costOverridesApplied['Pipework']?.original ?? bom.totalPipeworkCostExVat,
      isDeleted: deletedSet.has('line_pipework') || deletedSet.has('Pipework') || deletedSet.has('Pipework & Materials')
    },
    {
      id: 'line_accessories',
      category: 'Accessories & Controls',
      description: descOverrides['line_accessories'] || descOverrides['Accessories & Controls'] || descOverrides['Accessories'] || 'MagnaClean dual filter, anti-vibration feet, flex hoses, smart controller & electrical rotary isolator',
      quantity: 1,
      unitPriceExVat: accCost,
      totalPriceExVat: accCost,
      isOverridden: costOverridesApplied['Accessories'] !== undefined,
      originalPriceExVat: costOverridesApplied['Accessories']?.original ?? bom.totalAccessoriesCostExVat,
      originalTotal: costOverridesApplied['Accessories']?.original ?? bom.totalAccessoriesCostExVat,
      isDeleted: deletedSet.has('line_accessories') || deletedSet.has('Accessories') || deletedSet.has('Accessories & Controls')
    },
    ...(combiCost > 0 || deletedSet.has('line_combi') ? [{
      id: 'line_combi',
      category: 'Combi Conversion',
      description: descOverrides['line_combi'] || descOverrides['Combi Conversion'] || 'Combi to unvented cylinder conversion relocation kit & hot/cold redirection',
      quantity: 1,
      unitPriceExVat: combiCost,
      totalPriceExVat: combiCost,
      isConditional: true,
      isOverridden: costOverridesApplied['Combi Conversion'] !== undefined,
      originalPriceExVat: costOverridesApplied['Combi Conversion']?.original ?? bom.combiConversionCostExVat,
      originalTotal: costOverridesApplied['Combi Conversion']?.original ?? bom.combiConversionCostExVat,
      isDeleted: deletedSet.has('line_combi') || deletedSet.has('Combi Conversion')
    }] : []),
    {
      id: 'line_labour',
      category: 'Installation Labour',
      description: descOverrides['line_labour'] || descOverrides['Installation Labour'] || descOverrides['Labour'] || 'MCS certified installation team baseline labour (2 technicians, 2-3 days on site)',
      quantity: 1,
      unitPriceExVat: labour,
      totalPriceExVat: labour,
      isOverridden: costOverridesApplied['Labour'] !== undefined,
      originalPriceExVat: costOverridesApplied['Labour']?.original ?? commercialSettingsUsed.labourBaseline,
      originalTotal: costOverridesApplied['Labour']?.original ?? commercialSettingsUsed.labourBaseline,
      isDeleted: deletedSet.has('line_labour') || deletedSet.has('Labour') || deletedSet.has('Installation Labour')
    },
    {
      id: 'line_leadgen',
      category: 'Lead Acquisition Cost',
      description: descOverrides['line_leadgen'] || descOverrides['Lead Acquisition Cost'] || descOverrides['LeadGeneration'] || 'Customer marketing acquisition & surveyor booking allocation',
      quantity: 1,
      unitPriceExVat: leadGen,
      totalPriceExVat: leadGen,
      isOverridden: costOverridesApplied['LeadGeneration'] !== undefined,
      originalPriceExVat: costOverridesApplied['LeadGeneration']?.original ?? commercialSettingsUsed.leadGenerationCost,
      originalTotal: costOverridesApplied['LeadGeneration']?.original ?? commercialSettingsUsed.leadGenerationCost,
      isDeleted: deletedSet.has('line_leadgen') || deletedSet.has('LeadGeneration') || deletedSet.has('Lead Acquisition Cost')
    },
    {
      id: 'line_contingency',
      category: 'Contingency / Sundries',
      description: descOverrides['line_contingency'] || descOverrides['Contingency / Sundries'] || descOverrides['Contingency'] || 'Site contingency, electrical consumable sundries & flushing chemicals',
      quantity: 1,
      unitPriceExVat: extras,
      totalPriceExVat: extras,
      isOverridden: costOverridesApplied['Contingency'] !== undefined,
      originalPriceExVat: costOverridesApplied['Contingency']?.original ?? commercialSettingsUsed.extrasContingency,
      originalTotal: costOverridesApplied['Contingency']?.original ?? commercialSettingsUsed.extrasContingency,
      isDeleted: deletedSet.has('line_contingency') || deletedSet.has('Contingency') || deletedSet.has('Contingency / Sundries')
    },
    ...customItemsFormatted
  ];

  const lineItems = standardLineItems;

  function buildAutoNote(): string {
    if (!hasSufficientData) {
      return 'PRE-SURVEY ESTIMATE — NOT FINAL MCS HEAT-LOSS DESIGN; Awaiting property data.';
    }

    const segments: string[] = [];

    const areaStr = inputs.epcFloorArea ? `${inputs.epcFloorArea}m²` : '';
    const typeStr = inputs.propertyType ? inputs.propertyType.toLowerCase() : '';
    if (areaStr || typeStr) {
      segments.push([areaStr, typeStr].filter(Boolean).join(' '));
    }

    const insList: string[] = [];
    if (inputs.wallInsulation && inputs.wallInsulation !== 'Unknown') {
      insList.push(`${inputs.wallInsulation.toLowerCase()} walls`);
    } else if (inputs.wallInsulation === 'Uninsulated') {
      insList.push('uninsulated walls');
    }
    if (inputs.roofInsulation && inputs.roofInsulation !== 'Unknown') {
      insList.push(`${inputs.roofInsulation.toLowerCase()} roof`);
    } else if (inputs.roofInsulation === 'Uninsulated') {
      insList.push('insulated roof');
    }
    if (insList.length > 0) {
      segments.push(insList.join(', '));
    }

    if (inputs.existingHeatingSystem || inputs.existingFuelType) {
      const sys = [inputs.existingFuelType, inputs.existingHeatingSystem].filter(Boolean).join(' ');
      segments.push(`${sys.toLowerCase()}`);
    }

    if (inputs.annualHeatingKwh && inputs.annualHeatingKwh > 0) {
      segments.push(`EPC heating demand ${inputs.annualHeatingKwh.toLocaleString()} kWh/year`);
    }

    if (heatDemand.maxDemandKw > 0) {
      segments.push(`estimated heat demand ${heatDemand.maxDemandKw.toFixed(1)} kW`);
    }

    if (activeAshp) {
      const kwVal = activeAshp.ratedOutputKw || activeAshp.nominalKw;
      segments.push(`recommended ${kwVal} kW ASHP`);
    }

    return segments.join('; ') + '.';
  }

  const autoNote = buildAutoNote();

  return {
    mode: 'NEW_LEAD',
    disclaimer,
    timestamp,
    hasSufficientData,
    autoNote,
    existingEmitterInformation,
    heatDemand,
    emitterCapacity,
    ashp,
    cylinder,
    radiators,
    bom,
    bus,
    costBreakdown,
    commercials,
    confidence,
    rating,
    recommendation,
    assumptionsAndDataGaps,
    costOverridesApplied,
    costAuditTrail,
    lineItems,
    commercialSettingsUsed,
    ruleEvidenceLinks: {
      bus: 'BUS_ASHP_STANDARD_GRANT',
      heatDemand: 'EPC_HEURISTIC_PRE_SURVEY_W_M2',
      ashp: 'ASHP_RATED_OUTPUT_DESIGN',
      cylinder: 'CYLINDER_SIZING_HEURISTIC',
      commercial: 'PRIME_MARGIN_FORMULA'
    }
  };
}
