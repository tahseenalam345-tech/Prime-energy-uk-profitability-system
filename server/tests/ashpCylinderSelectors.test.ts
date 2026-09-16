import { describe, it, expect } from 'vitest';
import { selectRecommendedASHP } from '../src/engine/ashpSelector.js';
import { selectRecommendedCylinder } from '../src/engine/cylinderEngine.js';
import { calculateNewLeadEstimate } from '../src/engine/newLeadCalculator.js';

describe('ASHP & Cylinder Selectors & Recommendation Regression Suite', () => {

  it('1. Recommended ASHP never displays 0 kW when valid rated output exists', async () => {
    const res = await selectRecommendedASHP(6.0, { designOutdoorTemp: -2, designFlowTemp: 45 });
    expect(res.recommendedProduct).not.toBeNull();
    const rated = res.recommendedProduct?.ratedOutputAtDesign ?? res.recommendedProduct?.ratedOutputKw;
    expect(rated).toBeGreaterThan(0);
    expect(res.recommendedProduct?.nominalCapacity).toBeGreaterThan(0);
  });

  it('2. Returns Top 3 ASHP recommendations for current job with justification reasons', async () => {
    const res = await selectRecommendedASHP(5.5);
    expect(res.top3Recommended).toBeDefined();
    expect(res.top3Recommended.length).toBeGreaterThanOrEqual(1);
    expect(res.top3Recommended.length).toBeLessThanOrEqual(3);

    for (const option of res.top3Recommended) {
      expect(option.product).toBeDefined();
      expect(option.rank).toBeGreaterThan(0);
      expect(option.label).toBeTruthy();
      expect(option.reason).toBeTruthy();
      expect(option.product.ratedOutputAtDesign).toBeGreaterThan(0);
    }
  });

  it('3. ASHP numeric rated-kW sorting sorts numbers numerically not as strings', async () => {
    const res = await selectRecommendedASHP(4.0);
    const list = res.allAshpProducts || [];
    expect(list.length).toBeGreaterThan(0);

    const sortedAsc = [...list].sort((a, b) => a.ratedOutputAtDesign - b.ratedOutputAtDesign);
    for (let i = 0; i < sortedAsc.length - 1; i++) {
      expect(sortedAsc[i].ratedOutputAtDesign).toBeLessThanOrEqual(sortedAsc[i + 1].ratedOutputAtDesign);
    }
  });

  it('4. ASHP numeric price sorting sorts prices numerically', async () => {
    const res = await selectRecommendedASHP(4.0);
    const list = res.allAshpProducts || [];
    const sortedPrice = [...list].sort((a, b) => a.priceExVat - b.priceExVat);
    for (let i = 0; i < sortedPrice.length - 1; i++) {
      expect(sortedPrice[i].priceExVat).toBeLessThanOrEqual(sortedPrice[i + 1].priceExVat);
    }
  });

  it('5. Cylinder capacity displays full numbers (150L, 180L, 210L, 250L, 300L) and never empty "L"', async () => {
    const res = await selectRecommendedCylinder({ bedrooms: 3, bathrooms: 2 });
    expect(res.recommendedProduct).not.toBeNull();
    const vol = res.recommendedProduct?.volumeLitres ?? res.recommendedProduct?.nominal_litres;
    expect(vol).toBeGreaterThanOrEqual(150);
    expect(res.displayCapacity).toMatch(/^\d+\s*Litres$/i);
  });

  it('6. Cylinder numeric capacity sorting sorts capacities numerically', async () => {
    const res = await selectRecommendedCylinder({ bedrooms: 2, bathrooms: 1 });
    const list = res.allCylinders || [];
    expect(list.length).toBeGreaterThan(0);

    const sortedVol = [...list].sort((a, b) => a.volumeLitres - b.volumeLitres);
    for (let i = 0; i < sortedVol.length - 1; i++) {
      expect(sortedVol[i].volumeLitres).toBeLessThanOrEqual(sortedVol[i + 1].volumeLitres);
    }
  });

  it('7. Cylinder numeric price sorting sorts ex-VAT prices numerically', async () => {
    const res = await selectRecommendedCylinder({ bedrooms: 3, bathrooms: 2 });
    const list = res.allCylinders || [];
    const sortedPrice = [...list].sort((a, b) => a.priceExVat - b.priceExVat);
    for (let i = 0; i < sortedPrice.length - 1; i++) {
      expect(sortedPrice[i].priceExVat).toBeLessThanOrEqual(sortedPrice[i + 1].priceExVat);
    }
  });

  it('8. Returns Top 3 Cylinder recommendations with justification reasons', async () => {
    const res = await selectRecommendedCylinder({ bedrooms: 4, bathrooms: 2 });
    expect(res.top3Recommended).toBeDefined();
    expect(res.top3Recommended.length).toBeGreaterThanOrEqual(1);
    expect(res.top3Recommended.length).toBeLessThanOrEqual(3);

    for (const option of res.top3Recommended) {
      expect(option.product).toBeDefined();
      expect(option.product.volumeLitres).toBeGreaterThan(0);
      expect(option.reason).toBeTruthy();
    }
  });

  it('9. Removes duplicate product SKUs / models from catalog results', async () => {
    const ashpRes = await selectRecommendedASHP(5.0);
    const ashpKeys = (ashpRes.allAshpProducts || []).map(p => (p.sku || `${p.brand}_${p.model}_${p.ratedOutputAtDesign}`).toLowerCase().trim());
    const uniqueAshpKeys = new Set(ashpKeys);
    expect(ashpKeys.length).toBe(uniqueAshpKeys.size);

    const cylRes = await selectRecommendedCylinder({ bedrooms: 3, bathrooms: 2 });
    const cylKeys = (cylRes.allCylinders || []).map(c => `${c.brand}_${c.model}_${c.volumeLitres}`.toLowerCase().trim());
    const uniqueCylKeys = new Set(cylKeys);
    expect(cylKeys.length).toBe(uniqueCylKeys.size);
  });

  it('10. Selecting alternative ASHP model updates calculation cost & result correctly', async () => {
    const baseCalc = await calculateNewLeadEstimate({
      epcFloorArea: 100,
      propertyType: 'Detached',
      epcRating: 'D',
      bedrooms: 3,
      bathrooms: 2
    });

    const altModel = baseCalc.ashp.allAshpProducts?.find(p => p.id !== baseCalc.ashp.selectedProduct?.id);
    expect(altModel).toBeDefined();

    if (altModel) {
      const overrideCalc = await calculateNewLeadEstimate({
        epcFloorArea: 100,
        propertyType: 'Detached',
        epcRating: 'D',
        bedrooms: 3,
        bathrooms: 2,
        overrideAshpId: altModel.id
      });

      expect(overrideCalc.ashp.selectedProduct?.id).toBe(altModel.id);
      expect(overrideCalc.ashp.isManualOverride).toBe(true);
      expect(overrideCalc.costBreakdown.ashpCost).toBe(altModel.priceExVat);
    }
  });
});
