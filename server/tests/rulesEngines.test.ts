import { describe, it, expect, beforeAll } from 'vitest';
import { seedDatabase } from '../src/db/seed.js';
import { selectRecommendedCylinder } from '../src/engine/cylinderEngine.js';
import { estimateRadiatorRequirements } from '../src/engine/radiatorEngine.js';
import { evaluateAccessoriesAndBom } from '../src/engine/accessoryBomEngine.js';
import { evaluateConfidence } from '../src/engine/confidenceEngine.js';
import { evaluateProfitabilityRating } from '../src/engine/ratingEngine.js';

describe('Specialized Rules Engines', () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  describe('Cylinder Engine', () => {
    it('sizes 1-2 bed property for 180L cylinder', async () => {
      const result = await selectRecommendedCylinder({ bedrooms: 2, cylinderSpace: 'Yes' });
      expect(result.recommendedVolumeLitres).toBe(180);
      expect(result.viabilityBlocker).toBe(false);
    });

    it('sizes 3 bed 1 bath for 200L cylinder', async () => {
      const result = await selectRecommendedCylinder({ bedrooms: 3, bathrooms: 1, cylinderSpace: 'Yes' });
      expect(result.recommendedVolumeLitres).toBe(200);
    });

    it('sizes 4 bed 2 bath for 250L cylinder', async () => {
      const result = await selectRecommendedCylinder({ bedrooms: 4, bathrooms: 2, cylinderSpace: 'Yes' });
      expect(result.recommendedVolumeLitres).toBe(250);
    });

    it('sizes 5+ bed for 300L+ cylinder', async () => {
      const result = await selectRecommendedCylinder({ bedrooms: 5, bathrooms: 2, cylinderSpace: 'Yes' });
      expect(result.recommendedVolumeLitres).toBe(300);
    });

    it('does not silently guess when bedrooms are unknown', async () => {
      const result = await selectRecommendedCylinder({ bedrooms: undefined, cylinderSpace: 'Yes' });
      expect(result.error).toBe('Cylinder sizing requires bedroom information.');
      expect(result.recommendedVolumeLitres).toBeNull();
    });

    it('flags viability blocker when cylinder space is unavailable', async () => {
      const result = await selectRecommendedCylinder({ bedrooms: 3, cylinderSpace: 'No' });
      expect(result.viabilityBlocker).toBe(true);
      expect(result.notes.some(n => n.includes('Potentially non-viable'))).toBe(true);
    });
  });

  describe('Radiator Engine', () => {
    it('applies 40-60% replacement ratio when existing count is known', async () => {
      const result = await estimateRadiatorRequirements({ heatDemandKw: 8.0, existingRadiatorCount: 10 });
      expect(result.mode).toBe('COUNT_REPLACEMENT_RATIO');
      expect(result.estimatedReplacementCount).toBe(5);
      expect(result.totalRadiatorCostExVat).toBe(5 * 165.00);
    });

    it('uses heat demand capacity bands when nothing is known', async () => {
      const result = await estimateRadiatorRequirements({ heatDemandKw: 8.0 });
      expect(result.mode).toBe('HEAT_DEMAND_CAPACITY_BAND');
      expect(result.estimatedReplacementCount).toBe(3);
    });
  });

  describe('BOM & Pipework Engine', () => {
    it('triggers full re-pipe allowance when microbore is detected', async () => {
      const result = await evaluateAccessoriesAndBom({
        existingPipework: 'Microbore 10mm or less',
        boilerType: 'Combi',
        cylinderSpace: 'Yes'
      });

      expect(result.totalPipeworkCostExVat).toBe(2050.00);
      expect(result.risks.some(r => r.includes('Microbore pipework'))).toBe(true);
      expect(result.combiConversionCostExVat).toBe(500.00);
    });

    it('warns when pipework is unknown and uses standard allowance', async () => {
      const result = await evaluateAccessoriesAndBom({
        existingPipework: 'Unknown',
        boilerType: 'System'
      });

      expect(result.totalPipeworkCostExVat).toBe(250.00);
      expect(result.warnings.some(w => w.includes('diameter is UNKNOWN'))).toBe(true);
    });
  });

  describe('Confidence & Rating Engines', () => {
    it('evaluates HIGH confidence for complete property data', async () => {
      const result = await evaluateConfidence({
        epcRating: 'D',
        floorAreaM2: 120,
        propertyType: 'Semi detached',
        wallInsulation: 'Insulated',
        roofInsulation: 'Insulated',
        existingHeatingSystem: 'Gas Boiler',
        radiatorCount: 10,
        bathrooms: 1
      });

      expect(result.score).toBeGreaterThanOrEqual(75);
      expect(result.level).toBe('HIGH');
    });

    it('evaluates LOW confidence for sparse data', async () => {
      const result = await evaluateConfidence({
        floorAreaM2: 80,
        propertyType: 'Mid terrace'
      });

      expect(result.score).toBeLessThan(45);
      expect(result.level).toBe('LOW');
    });

    it('caps profitability rating at B when confidence is LOW', async () => {
      const result = await evaluateProfitabilityRating({
        grossMarginPercent: 36.0,
        grossProfit: 3500,
        confidenceLevel: 'LOW'
      });

      expect(result.baseGrade).toBe('A+');
      expect(result.finalGrade).toBe('B');
      expect(result.isDowngraded).toBe(true);
      expect(result.downgradeReasons.some(r => r.includes('Rating capped at B'))).toBe(true);
    });

    it('caps profitability rating at C when gross profit is below £1,000', async () => {
      const result = await evaluateProfitabilityRating({
        grossMarginPercent: 25.0,
        grossProfit: 650,
        confidenceLevel: 'HIGH'
      });

      expect(result.baseGrade).toBe('B');
      expect(result.finalGrade).toBe('C');
      expect(result.isDowngraded).toBe(true);
    });
  });
});
