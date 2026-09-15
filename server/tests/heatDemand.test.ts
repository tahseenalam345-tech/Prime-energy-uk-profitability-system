import { describe, it, expect, beforeAll } from 'vitest';
import { seedDatabase } from '../src/db/seed.js';
import { calculateIndicativeHeatDemand } from '../src/engine/heatDemand.js';

describe('Heat Demand Estimation Engine', () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  it('calculates EPC Band D Semi-detached correctly', async () => {
    const result = await calculateIndicativeHeatDemand({
      floorAreaM2: 120,
      epcRating: 'D',
      propertyType: 'Semi detached'
    });

    expect(result.baselineWPerM2).toBe(55);
    expect(result.propertyMultiplier).toBe(1.0);
    expect(result.centralDemandKw).toBe(6.5);
    expect(result.minDemandKw).toBe(5.5);
    expect(result.maxDemandKw).toBe(7.5);
    expect(result.displayRange).toBe('5.5 – 7.5 kW');
    expect(result.manualReviewFlag).toBe(false);
  });

  it('applies property multiplier for Detached house (1.15x)', async () => {
    const result = await calculateIndicativeHeatDemand({
      floorAreaM2: 180,
      epcRating: 'E',
      propertyType: 'Detached'
    });

    expect(result.propertyMultiplier).toBe(1.15);
    expect(result.centralDemandKw).toBe(14.5);
  });

  it('flags Flat for mandatory manual review with 0.75x multiplier', async () => {
    const result = await calculateIndicativeHeatDemand({
      floorAreaM2: 70,
      epcRating: 'C',
      propertyType: 'Flat'
    });

    expect(result.propertyMultiplier).toBe(0.75);
    expect(result.manualReviewFlag).toBe(true);
    expect(result.notes.some(n => n.includes('Mandatory manual review flagged'))).toBe(true);
  });

  it('uses fallback insulation table when EPC is unavailable', async () => {
    const result = await calculateIndicativeHeatDemand({
      floorAreaM2: 100,
      propertyType: 'End terrace',
      wallInsulation: 'Insulated',
      roofInsulation: 'Insulated'
    });

    expect(result.baselineSource).toBe('FALLBACK_INSULATION');
    expect(result.baselineWPerM2).toBe(45);
    expect(result.propertyMultiplier).toBe(1.05);
    expect(result.centralDemandKw).toBe(4.5);
  });

  it('handles worst-case uninsulated fallback (85 W/m²)', async () => {
    const result = await calculateIndicativeHeatDemand({
      floorAreaM2: 100,
      propertyType: 'Semi detached',
      wallInsulation: 'Uninsulated',
      roofInsulation: 'Uninsulated'
    });

    expect(result.baselineWPerM2).toBe(85);
    expect(result.centralDemandKw).toBe(8.5);
  });
});
