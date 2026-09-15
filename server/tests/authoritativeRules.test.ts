import { describe, it, expect, beforeAll } from 'vitest';
import { initDatabase, db } from '../src/db/connection.js';
import { evaluateBUSEligibility } from '../src/engine/busEngine.js';
import { calculateIndicativeHeatDemand } from '../src/engine/heatDemand.js';
import { selectRecommendedASHP } from '../src/engine/ashpSelector.js';
import { selectRecommendedCylinder } from '../src/engine/cylinderEngine.js';
import { calculateCommercials, round2 } from '../src/engine/commercial.js';
import { calculateNewLeadEstimate } from '../src/engine/newLeadCalculator.js';
import { calculateAfterSurveyViability } from '../src/engine/afterSurveyCalculator.js';
import { seedRuleEvidenceRegistry } from '../src/db/seedRuleEvidence.js';
import { seedCylinders } from '../src/db/seedCylinders.js';

describe('Authoritative Rules, Standards, and Verification Suite (TEST 1 to TEST 13)', () => {
  beforeAll(async () => {
    await initDatabase();
    await seedRuleEvidenceRegistry();
    await seedCylinders();
  }, 60000);

  it('TEST 1: On-grid ASHP -> £7,500', async () => {
    const res = await evaluateBUSEligibility({
      country: 'England',
      propertyStatus: 'Existing property',
      onOffGasGrid: 'On gas grid',
      existingHeatingSystem: 'Gas Central Heating',
      existingFuelType: 'Mains Gas',
      previousGovernmentGrant: 'None'
    });

    expect(res.status).toBe('PASS');
    expect(res.grantAmount).toBe(7500.00);
    expect(res.grantType).toBe('STANDARD_ASHP');
    expect(res.conditionalUpliftAvailable).toBe(false);
  });

  it('TEST 2: Off-gas + oil + ASHP -> £9,000', async () => {
    const res = await evaluateBUSEligibility({
      country: 'England',
      propertyStatus: 'Existing property',
      onOffGasGrid: 'Off gas grid',
      existingHeatingSystem: 'Oil Boiler',
      existingFuelType: 'Heating Oil',
      previousGovernmentGrant: 'None'
    });

    expect(res.status).toBe('PASS');
    expect(res.grantAmount).toBe(9000.00);
    expect(res.grantType).toBe('OFF_GAS_UPLIFT');
    expect(res.busUpliftEligibility).toBe(true);
    expect(res.conditionalUpliftAvailable).toBe(true);
    expect(res.conditionalUpliftAmount).toBe(9000.00);
    expect(res.ruleEvidenceId).toBe('BUS_OFF_GAS_OIL_LPG_9000');
  });

  it('TEST 3: Off-gas + LPG + ASHP -> £9,000', async () => {
    const res = await evaluateBUSEligibility({
      country: 'England',
      propertyStatus: 'Existing property',
      onOffGasGrid: 'Off gas grid',
      existingHeatingSystem: 'LPG Boiler',
      existingFuelType: 'Bulk LPG',
      previousGovernmentGrant: 'None'
    });

    expect(res.status).toBe('PASS');
    expect(res.grantAmount).toBe(9000.00);
    expect(res.grantType).toBe('OFF_GAS_UPLIFT');
    expect(res.busUpliftEligibility).toBe(true);
    expect(res.conditionalUpliftAvailable).toBe(true);
    expect(res.conditionalUpliftAmount).toBe(9000.00);
    expect(res.ruleEvidenceId).toBe('BUS_OFF_GAS_OIL_LPG_9000');
  });

  it('TEST 4: Off-gas + electric + ASHP -> £7,500', async () => {
    const res = await evaluateBUSEligibility({
      country: 'England',
      propertyStatus: 'Existing property',
      onOffGasGrid: 'Off gas grid',
      existingHeatingSystem: 'Electric Storage Heaters',
      existingFuelType: 'Electricity',
      previousGovernmentGrant: 'None'
    });

    expect(res.status).toBe('PASS');
    expect(res.grantAmount).toBe(7500.00);
    expect(res.grantType).toBe('STANDARD_ASHP');
    expect(res.busUpliftEligibility).toBe(false);
    expect(res.conditionalUpliftAvailable).toBe(false);
  });

  it('TEST 5: Off-gas + coal + ASHP -> £7,500', async () => {
    const res = await evaluateBUSEligibility({
      country: 'England',
      propertyStatus: 'Existing property',
      onOffGasGrid: 'Off gas grid',
      existingHeatingSystem: 'Coal Fire Back Boiler',
      existingFuelType: 'Coal / Solid Fuel',
      previousGovernmentGrant: 'None'
    });

    expect(res.status).toBe('PASS');
    expect(res.grantAmount).toBe(7500.00);
    expect(res.grantType).toBe('STANDARD_ASHP');
    expect(res.busUpliftEligibility).toBe(false);
    expect(res.conditionalUpliftAvailable).toBe(false);
  });

  it('TEST 6: Off-gas + fossil hybrid + ASHP -> INELIGIBLE (£0 grant)', async () => {
    const res = await evaluateBUSEligibility({
      country: 'England',
      propertyStatus: 'Existing property',
      onOffGasGrid: 'Off gas grid',
      existingHeatingSystem: 'Fossil-Fuel Hybrid Heat Pump & Boiler',
      existingFuelType: 'Hybrid Heating',
      previousGovernmentGrant: 'None'
    });

    expect(res.status).toBe('FAIL');
    expect(res.grantAmount).toBe(0.00);
    expect(res.grantType).toBe('NONE');
    expect(res.grantCategory).toBe('INELIGIBLE_FOSSIL_HYBRID');
    expect(res.busUpliftEligibility).toBe(false);
    expect(res.conditionalUpliftAvailable).toBe(false);
  });

  it('TEST 7: Developer new-build -> BUS ineligible', async () => {
    const res = await evaluateBUSEligibility({
      country: 'England',
      propertyStatus: 'Developer new-build',
      onOffGasGrid: 'On gas grid',
      existingHeatingSystem: 'None',
      previousGovernmentGrant: 'None'
    });

    expect(res.status).toBe('FAIL');
    expect(res.grantAmount).toBe(0.00);
    expect(res.grantType).toBe('NONE');
    expect(res.reasons.some(r => r.includes('Developer new-build properties are strictly ineligible'))).toBe(true);
    expect(res.ruleEvidenceId).toBe('BUS_NEW_BUILD_RESTRICTION');
  });

  it('TEST 8: Eligible self-build -> apply current BUS rules', async () => {
    const res = await evaluateBUSEligibility({
      country: 'England',
      propertyStatus: 'Self-build',
      onOffGasGrid: 'On gas grid',
      existingHeatingSystem: 'None',
      previousGovernmentGrant: 'None'
    });

    expect(res.status).toBe('PASS');
    expect(res.grantAmount).toBe(7500.00);
    expect(res.grantType).toBe('STANDARD_ASHP');
    expect(res.notes.some(n => n.includes('Self-build eligible'))).toBe(true);
  });

  it('TEST 9: Annual EPC heating kWh/year must NEVER be treated as peak kW heat loss', async () => {
    const demand = await calculateIndicativeHeatDemand({
      floorAreaM2: 120.0,
      epcRating: 'D',
      propertyType: 'Semi detached',
      wallInsulation: 'Insulated',
      roofInsulation: 'Insulated',
      annualHeatingKwh: 14120.0,
      annualHotWaterKwh: 1814.0
    });

    expect(demand.centralDemandKw).not.toBe(14.12);
    expect(demand.centralDemandKw).not.toBe(14.1);
    expect(demand.centralDemandKw).toBe(6.5);
    expect(demand.annualHeatingKwh).toBe(14120.0);
    expect(demand.annualHeatingKwhNote).toContain('14,120 kWh/yr');
  });

  it('TEST 10: After Survey must use survey-confirmed design heat loss and must NOT substitute EPC heuristic', async () => {
    const confirmedSurveyKw = 6.8;
    const surveyCalc = await calculateAfterSurveyViability({
      leadId: 'lead_test_10',
      surveyorUserId: 'surveyor_authoritative',
      confirmedDesignHeatLossKw: confirmedSurveyKw,
      designOutdoorTemp: -2.0,
      designFlowTemp: 45,
      selectedAshpId: 'ashp_grant_aerona290_065',
      selectedCylinderId: 'cyl_gledhill_200_hp',
      exactRadiatorsSchedule: [
        { productId: 'rad_k2_600_1200', quantity: 2, unitPriceExVat: 145.00 }
      ],
      country: 'England',
      propertyStatus: 'Existing property',
      onOffGasGrid: 'On gas grid',
      existingHeatingSystem: 'Gas Central Heating'
    });

    expect(surveyCalc.confirmedDesignHeatLossKw).toBe(confirmedSurveyKw);
    expect(surveyCalc.confidenceDisplay).toBe('SURVEY-CONFIRMED');
    expect(surveyCalc.selectedEquipment.ashp.id).toBe('ashp_grant_aerona290_065');
  });

  it('TEST 11: Manual ASHP override persists and commercial calculation updates', async () => {
    const baseResult = await calculateNewLeadEstimate({
      addressLine1: 'Test Property 11',
      postcode: 'LS6 2NW',
      epcFloorArea: 130.0,
      epcRating: 'D',
      propertyType: 'Semi detached'
    });

    const recommendedUnit = baseResult.ashp.recommendedProduct;
    expect(recommendedUnit).toBeDefined();

    const manualUnitId = 'ashp_vaillant_arotherm_plus_10';
    const overrideResult = await calculateNewLeadEstimate({
      addressLine1: 'Test Property 11',
      postcode: 'LS6 2NW',
      epcFloorArea: 130.0,
      epcRating: 'D',
      propertyType: 'Semi detached',
      overrideAshpId: manualUnitId
    });

    expect(overrideResult.ashp.isManualOverride).toBe(true);
    expect(overrideResult.ashp.selectedProduct?.id).toBe(manualUnitId);
    expect(overrideResult.ashp.recommendedProduct?.id).toBe(recommendedUnit?.id);
    expect(overrideResult.costBreakdown.ashpCost).toBe(overrideResult.ashp.selectedProduct?.priceExVat);
    expect(overrideResult.commercials.totalJobCost).not.toBe(baseResult.commercials.totalJobCost);
  });

  it('TEST 12: Manual cylinder override persists and commercial calculation updates', async () => {
    const baseResult = await calculateNewLeadEstimate({
      addressLine1: 'Test Property 12',
      postcode: 'LS6 2NW',
      epcFloorArea: 140.0,
      epcRating: 'D',
      propertyType: 'Detached',
      bedrooms: 4,
      bathrooms: 2
    });

    expect(baseResult.cylinder.recommendedVolumeLitres).toBe(250);
    const originalCylinderCost = baseResult.costBreakdown.cylinderCost;

    const overrideResult = await calculateNewLeadEstimate({
      addressLine1: 'Test Property 12',
      postcode: 'LS6 2NW',
      epcFloorArea: 140.0,
      epcRating: 'D',
      propertyType: 'Detached',
      bedrooms: 4,
      bathrooms: 2,
      overrideCylinderId: 'cyl_gledhill_200_hp'
    });

    expect(overrideResult.cylinder.isManualOverride).toBe(true);
    expect(overrideResult.cylinder.recommendedVolumeLitres).toBe(250);
    expect(overrideResult.cylinder.selectedProduct?.volumeLitres).toBe(200);
    expect(overrideResult.costBreakdown.cylinderCost).toBe(overrideResult.cylinder.selectedProduct?.priceExVat);
    expect(overrideResult.costBreakdown.cylinderCost).not.toBe(originalCylinderCost);
  });

  it('TEST 13: Supplier INC_VAT price is only normalized when VAT basis is known/confirmed', async () => {
    const incPrice = 1200.00;
    const normalizedExVat = round2(incPrice / 1.20);
    expect(normalizedExVat).toBe(1000.00);

    const unknownVatBasis = 'UNKNOWN';
    const normalizedUnknown = unknownVatBasis === 'INC_VAT' ? round2(incPrice / 1.20) : null;
    expect(normalizedUnknown).toBeNull();

    const prices = await db.all<any>(`
      SELECT source_price, source_vat_basis, normalized_ex_vat_price, normalization_method, normalization_confidence
      FROM product_prices 
      WHERE is_current = 1
    `);

    expect(prices.length).toBeGreaterThan(0);
    const incVatRecords = prices.filter(p => p.source_vat_basis === 'INC_VAT');
    for (const r of incVatRecords) {
      expect(r.normalization_method).toBe('DIVIDE_BY_1_POINT_20');
      expect(r.normalization_confidence).toBe('CONFIRMED_20_PCT_VAT');
      expect(r.normalized_ex_vat_price).toBe(round2(r.source_price / 1.20));
    }

    const unknownRecords = prices.filter(p => p.source_vat_basis === 'UNKNOWN');
    for (const r of unknownRecords) {
      expect(r.normalization_method).toBe('VAT_STATUS_UNVERIFIED');
      expect(r.normalization_confidence).toBe('UNVERIFIED');
      expect(r.normalized_ex_vat_price).toBeNull();
    }
  });

  it('REGISTRY AUDIT: Rule Evidence Registry contains only allowed statuses and verified MCS Issue 2.0', async () => {
    const rules = await db.all<any>('SELECT * FROM rule_evidence');
    const allowedStatuses = new Set([
      'VERIFIED_OFFICIAL_CURRENT',
      'PRIME_CONFIG',
      'ESTIMATION_HEURISTIC',
      'SOURCE_REQUIRED',
      'HISTORICAL',
      'UNVERIFIED'
    ]);

    for (const rule of rules) {
      expect(allowedStatuses.has(rule.verification_status)).toBe(true);
      expect(rule.authority.length).toBeGreaterThan(0);
      expect(rule.source_document.length).toBeGreaterThan(0);
    }

    const mcsCurrent = rules.filter(r => r.rule_id.startsWith('MCS_MIS_3005_D') && r.verification_status === 'VERIFIED_OFFICIAL_CURRENT');
    expect(mcsCurrent.length).toBeGreaterThanOrEqual(4);
    for (const r of mcsCurrent) {
      expect(r.source_version).toContain('Issue 2.0');
      expect(r.source_document).toContain('MIS 3005-D: 2025');
    }

    const roomLossRule = rules.find(r => r.rule_id === 'MCS_MIS_3005_D_ROOM_HEAT_LOSS');
    expect(roomLossRule.evidence_reference).toContain('Clause 3.4.1(a)');
    expect(roomLossRule.rule_value).toContain('BS EN 12831-1:2017');

    const extTempRule = rules.find(r => r.rule_id === 'MCS_MIS_3005_D_DESIGN_EXT_TEMP');
    expect(extTempRule.evidence_reference).toContain('Table 2');

    const sizingRule = rules.find(r => r.rule_id === 'MCS_MIS_3005_D_SIZING_OUTPUT');
    expect(sizingRule.evidence_reference).toContain('Clause 3.4.1(e)');

    const emitterRule = rules.find(r => r.rule_id === 'MCS_MIS_3005_D_EMITTER_FLOW_TEMP');
    expect(emitterRule.evidence_reference).toContain('Clause 3.4.4');
    expect(emitterRule.evidence_reference).toContain('Clause 3.4.5');

    const mcsHistorical = rules.find(r => r.rule_id === 'MCS_MIS_3005_D_V1_HISTORICAL');
    expect(mcsHistorical).toBeDefined();
    expect(mcsHistorical.verification_status).toBe('HISTORICAL');

    const cylHeuristic = rules.find(r => r.rule_id === 'CYLINDER_SIZING_HEURISTIC');
    expect(cylHeuristic.verification_status).toBe('ESTIMATION_HEURISTIC');
    expect(cylHeuristic.authority).toBe('Prime Energy');
    expect(cylHeuristic.notes).toContain('Internal pre-survey heuristic; survey/design overrides this.');
  });
});
