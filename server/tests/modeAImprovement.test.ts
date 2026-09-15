import { describe, it, expect } from 'vitest';
import { calculateNewLeadEstimate } from '../src/engine/newLeadCalculator.js';

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

  it('7. RADIATOR TYPE CAPTURE — stores radiator counts as EXISTING EMITTER INFORMATION', async () => {
    const res = await calculateNewLeadEstimate({
      epcFloorArea: 100,
      k1Count: 3,
      pPlusCount: 2,
      k2Count: 5,
      otherCount: 1,
      existingEmitterDimensions: 'Lounge: 600x1200 K2'
    });

    expect(res.existingEmitterInformation).toBeDefined();
    expect(res.existingEmitterInformation?.k1Count).toBe(3);
    expect(res.existingEmitterInformation?.pPlusCount).toBe(2);
    expect(res.existingEmitterInformation?.k2Count).toBe(5);
    expect(res.existingEmitterInformation?.otherCount).toBe(1);
    expect(res.existingEmitterInformation?.totalRadiatorCount).toBe(11);
    expect(res.existingEmitterInformation?.dimensionsText).toBe('Lounge: 600x1200 K2');
  });

  it('8. CONDITIONAL COSTS SEPARATION — combi conversion £500 is strictly conditional on Combi boiler', async () => {
    const resNonCombi = await calculateNewLeadEstimate({
      epcFloorArea: 100,
      boilerType: 'System'
    });
    const combiLineNon = resNonCombi.lineItems.find(l => l.category === 'Combi Conversion' || l.category === 'COMBI_CONVERSION');
    expect(combiLineNon).toBeUndefined();

    const resCombi = await calculateNewLeadEstimate({
      epcFloorArea: 100,
      boilerType: 'Combi'
    });
    const combiLineCombi = resCombi.lineItems.find(l => l.category === 'Combi Conversion' || l.category === 'COMBI_CONVERSION');
    expect(combiLineCombi).toBeDefined();
    expect(combiLineCombi?.totalPriceExVat).toBe(500);
    expect(combiLineCombi?.isConditional).toBe(true);
  });

  it('9. AUTO-NOTE GENERATION — produces ONE LINE ONLY note using supplied info', async () => {
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

  it('10. EMITTER CAPACITY & PLAUSIBILITY CHECK — calculates EN 442 capacity @ 45°C flow and checks plausibility', async () => {
    // Case A: Missing dimensions -> UNKNOWN & reduced confidence
    const resUnknown = await calculateNewLeadEstimate({
      epcFloorArea: 120,
      propertyType: 'Detached',
      epcRating: 'D'
      // No radiator counts/dimensions
    });

    expect(resUnknown.emitterCapacity).toBeDefined();
    expect(resUnknown.emitterCapacity?.status).toBe('UNKNOWN');
    expect(resUnknown.emitterCapacity?.hasMissingDimensions).toBe(true);
    expect(resUnknown.emitterCapacity?.plausibilityCheck.warningMessage).toContain('stored as UNKNOWN');
    // Radiator confidence breakdown awarded 0
    const radConf = resUnknown.confidence?.breakdown.find(b => b.field === 'radiator_information');
    expect(radConf?.awardedWeight).toBe(0);

    // Case B: Emitter capacity low -> Warning "Existing emitter capacity may be low..."
    // Floor area 140m² Detached ~ 10 kW heat demand. 2 x K1 radiators @ 45°C flow = ~0.73 kW capacity.
    const resLow = await calculateNewLeadEstimate({
      epcFloorArea: 140,
      propertyType: 'Detached',
      epcRating: 'E',
      k1Count: 2,
      existingEmitterDimensions: 'Lounge: 600x1000 K1, Bed: 600x1000 K1'
    });

    expect(resLow.emitterCapacity?.status).toBe('VERIFIED_DIMENSIONS');
    expect(resLow.emitterCapacity?.estimatedOutputKwAtTargetFlow).toBeLessThan(resLow.heatDemand.maxDemandKw);
    expect(resLow.emitterCapacity?.plausibilityCheck.isAdequate).toBe(false);
    expect(resLow.emitterCapacity?.plausibilityCheck.warningMessage).toBe('Existing emitter capacity may be low for the proposed heat-pump flow temperature.');

    // Crucial check: Emitter capacity shortfall does NOT alter fabric heat loss calculation!
    const resSameFabricNoRads = await calculateNewLeadEstimate({
      epcFloorArea: 140,
      propertyType: 'Detached',
      epcRating: 'E'
    });
    expect(resLow.heatDemand.maxDemandKw).toBe(resSameFabricNoRads.heatDemand.maxDemandKw);
  });
});
