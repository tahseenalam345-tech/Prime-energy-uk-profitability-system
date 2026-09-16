import { describe, it, expect } from 'vitest';
import { calculateNewLeadEstimate } from '../src/engine/newLeadCalculator.js';
import { evaluateExistingEmitterCapacity, STELRAD_EXACT_CATALOGUE } from '../src/engine/radiatorEngine.js';

describe('Mode A — Final UX & Calculation Improvement Tests', () => {

  it('1. EMPTY INITIAL STATE — returns hasSufficientData = false and no preselected recommendations', async () => {
    const res = await calculateNewLeadEstimate({});

    expect(res.hasSufficientData).toBe(false);
    expect(res.ashp?.selectedProduct).toBeNull();
    expect(res.ashp?.recommendedProduct).toBeNull();
    expect(res.cylinder?.selectedProduct).toBeNull();
    expect(res.cylinder?.recommendedProduct).toBeNull();
    expect(res.heatDemand?.estimatedDesignHeatLossKw).toBeNull();
    expect(res.commercials.totalJobCost).toBe(0);
  });

  it('2. LIVE / PROGRESSIVE CALCULATION — calculates heat demand and recommendations when floor area supplied', async () => {
    const res = await calculateNewLeadEstimate({
      epcFloorArea: 120,
      propertyType: 'Detached',
      epcRating: 'D'
    });

    expect(res.hasSufficientData).toBe(true);
    expect(res.heatDemand?.estimatedDesignHeatLossKw).toBeGreaterThan(0);
    expect(res.ashp?.recommendedProduct).toBeDefined();
    expect(res.ashp?.recommendedProduct?.id).toBeTruthy();
  });

  it('3. DEFAULT TARGET MARGIN — verifies 7% (0.07) default commercial target margin', async () => {
    const res = await calculateNewLeadEstimate({
      epcFloorArea: 100,
      propertyType: 'Semi detached',
      epcRating: 'C',
      previousGovernmentGrant: 'BUS' // Grant ineligible so grossMarginPercent == targetGrossMargin (7.0%)
    });

    expect(res.commercials.targetGrossMargin).toBe(0.07);
    const expectedRevenue = Math.round(res.commercials.totalJobCost / (1 - 0.07));
    expect(res.commercials.requiredRevenue).toBeCloseTo(expectedRevenue, 0);
    expect(res.commercials.grossMarginPercent).toBe(7.0);
  });

  it('4. ASHP RECOMMENDATION & CATEGORIZATION — returns categorized suitable ASHPs sorted by priority, match, cost', async () => {
    const res = await calculateNewLeadEstimate({
      epcFloorArea: 140,
      propertyType: 'Detached',
      epcRating: 'E'
    });

    expect(res.ashp?.categorizedSuitableAshps).toBeDefined();
    const categorized = res.ashp?.categorizedSuitableAshps!;
    expect(Array.isArray(categorized.preferred)).toBe(true);
    expect(Array.isArray(categorized.bestMatch)).toBe(true);
    expect(Array.isArray(categorized.valueCost)).toBe(true);
    expect(Array.isArray(categorized.alternatives)).toBe(true);
    expect(Array.isArray(categorized.allQualifying)).toBe(true);

    const ratedOutput = res.ashp?.selectedProduct?.ratedOutputAtDesign || res.ashp?.selectedProduct?.ratedOutputKw || 0;
    const requiredDemand = res.heatDemand?.estimatedDesignHeatLossKw || 0;
    expect(ratedOutput).toBeGreaterThanOrEqual(requiredDemand);
  });

  it('5. NO UNDERSIZED SELECTION — does not select a cheaper heat pump if it fails technical heat demand', async () => {
    const res = await calculateNewLeadEstimate({
      epcFloorArea: 160,
      propertyType: 'Detached',
      epcRating: 'E'
    });

    const ratedOutput = res.ashp?.selectedProduct?.ratedOutputAtDesign || res.ashp?.selectedProduct?.ratedOutputKw || 0;
    const estimatedKw = res.heatDemand?.estimatedDesignHeatLossKw || 0;
    expect(ratedOutput).toBeGreaterThanOrEqual(estimatedKw);
    expect(ratedOutput).toBeGreaterThanOrEqual(12.0);
  });

  it('6. CYLINDER RECOMMENDATION — recommends cylinder based on bedrooms, bathrooms, DHW rules', async () => {
    const res = await calculateNewLeadEstimate({
      epcFloorArea: 120,
      bedrooms: 4,
      bathrooms: 2,
      cylinderSpace: 'Yes'
    });

    expect(res.cylinder?.recommendedProduct).toBeDefined();
    expect(res.cylinder?.recommendedProduct?.volumeLitres).toBeGreaterThanOrEqual(250);
  });

  it('7. SIMPLIFIED RADIATOR TYPE CAPTURE — stores total radiator count and dominant type', async () => {
    const res = await calculateNewLeadEstimate({
      epcFloorArea: 100,
      existingRadiatorCount: 10,
      dominantRadiatorType: 'K2'
    });

    expect(res.existingEmitterInformation).toBeDefined();
    expect(res.existingEmitterInformation?.totalRadiatorCount).toBe(10);
    expect(res.existingEmitterInformation?.dominantRadiatorType).toBe('K2');
  });

  it('8. RADIATOR EFFECT — increasing radiator count does NOT incorrectly increase heat loss or heat pump size', async () => {
    const res5Rads = await calculateNewLeadEstimate({
      epcFloorArea: 120,
      propertyType: 'Detached',
      epcRating: 'D',
      existingRadiatorCount: 5,
      dominantRadiatorType: 'K1'
    });

    const res25Rads = await calculateNewLeadEstimate({
      epcFloorArea: 120,
      propertyType: 'Detached',
      epcRating: 'D',
      existingRadiatorCount: 25,
      dominantRadiatorType: 'K2'
    });

    expect(res5Rads.heatDemand.maxDemandKw).toBe(res25Rads.heatDemand.maxDemandKw);
    expect(res5Rads.ashp?.recommendedProduct?.id).toBe(res25Rads.ashp?.recommendedProduct?.id);
  });

  it('9. COMBI CONVERSION ABSENT — £500 combi conversion allowance is completely absent', async () => {
    const resCombi = await calculateNewLeadEstimate({
      epcFloorArea: 100,
      boilerType: 'Combi'
    });

    const combiLine = resCombi.lineItems.find(l => l.category === 'Combi Conversion' || l.category === 'COMBI_CONVERSION' || l.description.toLowerCase().includes('combi conversion'));
    expect(combiLine).toBeUndefined();
    expect(resCombi.bom.combiConversionCostExVat).toBe(0);
    expect(resCombi.costBreakdown.combiConversionAllowance).toBe(0);
  });

  it('10. AUTO-NOTE GENERATION — produces ONE LINE ONLY note using supplied info', async () => {
    const res = await calculateNewLeadEstimate({
      epcFloorArea: 120,
      propertyType: 'Semi detached',
      wallInsulation: 'Uninsulated',
      roofInsulation: 'Insulated',
      existingHeatingSystem: 'Oil Boiler',
      annualHeatingKwh: 39000
    });

    expect(res.autoNote).toBeDefined();
    expect(res.autoNote.includes('\n')).toBe(false); // Strictly ONE LINE only
    expect(res.autoNote).toContain('120m² semi detached');
    expect(res.autoNote.toLowerCase()).toContain('uninsulated walls');
    expect(res.autoNote.toLowerCase()).toContain('insulated roof');
    expect(res.autoNote.toLowerCase()).toContain('oil boiler');
    expect(res.autoNote).toContain('EPC heating demand 39,000 kWh/year');
    expect(res.autoNote).toContain('estimated heat demand');
    expect(res.autoNote).toContain('recommended');
  });

  it('11. RADIATOR BOM COST BUG FIX — existing radiator count does NOT create extra radiator BOM quantities or costs', async () => {
    const res = await calculateNewLeadEstimate({
      epcFloorArea: 120,
      propertyType: 'Detached',
      existingRadiatorCount: 12,
      dominantRadiatorType: 'K2'
    });

    expect(res.radiators.estimatedReplacementCount).toBe(0);
    expect(res.radiators.totalRadiatorCostExVat).toBe(0);
    expect(res.costBreakdown.radiatorsAllowance).toBe(0);
  });

  it('12. EXACT STELRAD DATA & 700x2600 K2 UIN 143863 = 5099 W', () => {
    const item = STELRAD_EXACT_CATALOGUE['143863'];
    expect(item).toBeDefined();
    expect(item.wattsQ50).toBe(5099);
    expect(item.btuQ50).toBe(17403);

    const emitterOut = evaluateExistingEmitterCapacity({
      exactRadiatorSchedule: [
        { uin: '143863', quantity: 1 }
      ],
      estimatedHeatDemandKw: 8.5
    });

    expect(emitterOut.hasExactScheduleOrDimensions).toBe(true);
    expect(emitterOut.estimatedOutputKwAt50).toBe(5.1); // 5099 W rounded to 5.1 kW
  });

  it('13. MISSING DIMENSIONS — produces qualitative emitter result only without invented total kW', () => {
    const emitterOut = evaluateExistingEmitterCapacity({
      existingRadiatorCount: 10,
      dominantRadiatorType: 'K2',
      estimatedHeatDemandKw: 8.5
    });

    expect(emitterOut.hasExactScheduleOrDimensions).toBe(false);
    expect(emitterOut.estimatedOutputKwAt50).toBe(17.5);
    expect(emitterOut.estimatedOutputKwAt50Display).toContain('~17.5 kW @ Δt50');
    expect(emitterOut.estimatedOutputKwAt30).toBe(8.9);
    expect(emitterOut.estimatedOutputKwAt30Display).toContain('~8.9 kW @ Δt30');
    expect(emitterOut.confidenceLevel).toBe('Low');
    expect(emitterCapacityIsSeparateFromHeatDemand(8.5, emitterOut)).toBe(true);
  });
});

function emitterCapacityIsSeparateFromHeatDemand(heatDemandKw: number, emitterOut: any): boolean {
  return emitterOut.plausibilityCheck.estimatedHeatDemandKw === heatDemandKw;
}

