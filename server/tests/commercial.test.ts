import { describe, it, expect } from 'vitest';
import { calculateCommercials } from '../src/engine/commercial.js';

describe('Commercial Calculation Engine', () => {
  it('passes the CRITICAL GOLDEN TEST for Prime Energy UK', () => {
    const result = calculateCommercials({
      totalJobCost: 8000,
      targetGrossMargin: 0.25,
      busGrant: 7500
    });

    expect(result.requiredRevenue).toBe(10666.67);
    expect(result.customerContribution).toBe(3166.67);
    expect(result.actualRevenue).toBe(10666.67);
    expect(result.grossProfit).toBe(2666.67);
    expect(result.grossMarginPercent).toBe(25);
  });

  it('handles jobs where BUS Grant exceeds required revenue (Customer pays £0)', () => {
    const result = calculateCommercials({
      totalJobCost: 5000,
      targetGrossMargin: 0.20,
      busGrant: 7500
    });

    expect(result.requiredRevenue).toBe(6250.00);
    expect(result.customerContribution).toBe(0);
    expect(result.actualRevenue).toBe(7500.00);
    expect(result.grossProfit).toBe(2500.00);
    expect(result.grossMarginPercent).toBe(33.33);
  });

  it('handles zero BUS grant (Customer pays full required revenue)', () => {
    const result = calculateCommercials({
      totalJobCost: 10000,
      targetGrossMargin: 0.30,
      busGrant: 0
    });

    expect(result.requiredRevenue).toBe(14285.71);
    expect(result.customerContribution).toBe(14285.71);
    expect(result.actualRevenue).toBe(14285.71);
    expect(result.grossProfit).toBe(4285.71);
    expect(result.grossMarginPercent).toBe(30);
  });

  it('handles off-gas uplift £9,000 BUS grant with £11,000 job cost', () => {
    const result = calculateCommercials({
      totalJobCost: 11000,
      targetGrossMargin: 0.25,
      busGrant: 9000
    });

    expect(result.requiredRevenue).toBe(14666.67);
    expect(result.customerContribution).toBe(5666.67);
    expect(result.grossProfit).toBe(3666.67);
    expect(result.grossMarginPercent).toBe(25);
  });

  it('rejects target gross margin >= 100%', () => {
    expect(() => calculateCommercials({
      totalJobCost: 8000,
      targetGrossMargin: 1.0,
      busGrant: 7500
    })).toThrow();
  });

  it('correctly executes full manual override quote scenario (Requirement 16)', async () => {
    const { calculateNewLeadEstimate } = await import('../src/engine/newLeadCalculator.js');

    const baseResult = await calculateNewLeadEstimate({
      addressLine1: '42 Override Way',
      postcode: 'LS1 1AA',
      country: 'England',
      epcFloorArea: 140,
      epcRating: 'D',
      propertyType: 'Detached',
      bedrooms: 4,
      bathrooms: 2,
      cylinderSpace: 'Yes',
      boilerType: 'Combi',
      existingPipework: 'Standard 15mm+'
    });

    const productA = baseResult.ashp.recommendedProduct;
    expect(productA).toBeDefined();
    expect(baseResult.cylinder.recommendedVolumeLitres).toBe(250);
    expect(baseResult.cylinder.selectedProduct?.volumeLitres).toBe(250);

    const productBId = 'ashp_ideal_hp290_08';
    const overrideCylinderId = 'cyl_gledhill_200_hp';

    const overriddenResult = await calculateNewLeadEstimate({
      addressLine1: '42 Override Way',
      postcode: 'LS1 1AA',
      country: 'England',
      epcFloorArea: 140,
      epcRating: 'D',
      propertyType: 'Detached',
      bedrooms: 4,
      bathrooms: 2,
      cylinderSpace: 'Yes',
      boilerType: 'Combi',
      existingPipework: 'Standard 15mm+',
      overrideAshpId: productBId,
      overrideCylinderId: overrideCylinderId,
      costOverrides: {
        'Cylinder': 0,
        'Labour': 1850
      },
      customLineItems: [
        {
          description: 'Specialist Scaffolding & Access Tower',
          quantity: 1,
          unitPriceExVat: 450,
          totalPriceExVat: 450
        }
      ]
    });

    expect(overriddenResult.ashp.isManualOverride).toBe(true);
    expect(overriddenResult.ashp.selectedProduct?.id).toBe(productBId);
    expect(overriddenResult.ashp.selectedProduct?.brand).toBe('Ideal Heating');
    expect(overriddenResult.ashp.recommendedProduct?.id).toBe(productA?.id);

    expect(overriddenResult.cylinder.isManualOverride).toBe(true);
    expect(overriddenResult.cylinder.selectedProduct?.volumeLitres).toBe(200);
    expect(overriddenResult.cylinder.recommendedVolumeLitres).toBe(250);

    expect(overriddenResult.costBreakdown.cylinderCost).toBe(0.00);
    expect(overriddenResult.costBreakdown.labour).toBe(1850.00);
    expect(overriddenResult.costBreakdown.customCostsTotal).toBe(450.00);

    const expectedEquipmentMaterials = 
      overriddenResult.costBreakdown.ashpCost +
      0.00 +
      overriddenResult.costBreakdown.radiatorsAllowance +
      overriddenResult.costBreakdown.pipeworkAllowance +
      overriddenResult.costBreakdown.accessoriesCost +
      overriddenResult.costBreakdown.combiConversionAllowance;

    expect(overriddenResult.costBreakdown.equipmentMaterials).toBe(expectedEquipmentMaterials);

    const expectedTotalJobCost = 
      expectedEquipmentMaterials +
      1850.00 +
      overriddenResult.costBreakdown.leadGeneration +
      overriddenResult.costBreakdown.extrasContingency +
      450.00;

    expect(overriddenResult.commercials.totalJobCost).toBe(expectedTotalJobCost);

    const targetMargin = overriddenResult.commercialSettingsUsed.targetGrossMargin;
    const expectedReqRev = Math.round((expectedTotalJobCost / (1 - targetMargin)) * 100) / 100;
    expect(overriddenResult.commercials.requiredRevenue).toBe(expectedReqRev);

    expect(overriddenResult.costOverridesApplied['Cylinder']).toBeDefined();
    expect(overriddenResult.costOverridesApplied['Cylinder'].overridden).toBe(0);
    expect(overriddenResult.costOverridesApplied['Labour']).toBeDefined();
    expect(overriddenResult.costOverridesApplied['Labour'].overridden).toBe(1850);
  });
});
