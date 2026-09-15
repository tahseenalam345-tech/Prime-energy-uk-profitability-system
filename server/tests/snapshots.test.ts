import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../src/db/connection.js';
import { seedDatabase } from '../src/db/seed.js';
import { calculateNewLeadEstimate } from '../src/engine/newLeadCalculator.js';
import { saveCalculationSnapshot, verifyHistoricalSnapshotReproduction } from '../src/engine/snapshotEngine.js';

describe('Calculation Snapshot Immutability Engine', () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  it('saves an immutable snapshot and reproduces exact financial output', async () => {
    const calculation = await calculateNewLeadEstimate({
      addressLine1: '14 Meadow Lane',
      postcode: 'LS6 2NW',
      country: 'England',
      epcRating: 'D',
      epcFloorArea: 120,
      propertyType: 'Semi detached',
      propertyStatus: 'Existing property',
      bedrooms: 3,
      bathrooms: 1,
      boilerType: 'Combi',
      cylinderSpace: 'Yes',
      existingPipework: 'Standard 15mm+',
      existingRadiatorCount: 10,
      onOffGasGrid: 'On gas grid',
      previousGovernmentGrant: 'None'
    });

    const quoteId = `test_quote_${Date.now()}`;
    const quoteRef = `PEL-TEST-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    await db.run(`
      INSERT INTO quotes (
        id, quote_reference, lead_id, mode, total_job_cost, bus_grant,
        required_revenue, customer_contribution, actual_revenue, gross_profit,
        gross_margin_percent, confidence_score, confidence_level, profitability_grade,
        commercial_recommendation, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      quoteId,
      quoteRef,
      'lead_001',
      'NEW_LEAD',
      calculation.costBreakdown.totalJobCost,
      calculation.bus.grantAmount,
      calculation.commercials.requiredRevenue,
      calculation.commercials.customerContribution,
      calculation.commercials.actualRevenue,
      calculation.commercials.grossProfit,
      calculation.commercials.grossMarginPercent,
      calculation.confidence.score,
      calculation.confidence.level,
      calculation.rating.finalGrade,
      calculation.recommendation.status,
      'user_sales'
    ]);

    const snapshotId = await saveCalculationSnapshot({
      quoteId,
      quoteReference: quoteRef,
      userId: 'user_sales',
      mode: 'NEW_LEAD',
      inputs: {
        floorArea: 120,
        propertyType: 'Semi detached',
        epc: 'D'
      },
      products: calculation.lineItems,
      prices: calculation.lineItems.map(l => ({ description: l.description, price: l.unitPriceExVat })),
      rulesetVersions: {
        bus: calculation.bus.rulesetVersion,
        commercialSettings: calculation.commercialSettingsUsed.version
      },
      commercialSettings: calculation.commercialSettingsUsed,
      outputs: calculation
    });

    expect(snapshotId).toBeDefined();

    const verification = await verifyHistoricalSnapshotReproduction(quoteId);
    expect(verification.isMatch).toBe(true);
    expect(verification.discrepancies).toHaveLength(0);
    expect(verification.historicalOutputs.commercials.grossMarginPercent).toBe(calculation.commercials.grossMarginPercent);
    expect(verification.historicalOutputs.commercials.customerContribution).toBe(calculation.commercials.customerContribution);
  });

  it('persists snapshot and returns snapshotId successfully', async () => {
    const calculation = await calculateNewLeadEstimate({
      addressLine1: '22 Park Avenue',
      postcode: 'LS1 4AP',
      country: 'England',
      epcRating: 'C',
      epcFloorArea: 150,
      propertyType: 'Detached',
      propertyStatus: 'Existing property',
      bedrooms: 4,
      bathrooms: 2,
      boilerType: 'System',
      cylinderSpace: 'Yes',
      existingPipework: 'Standard 15mm+',
      existingRadiatorCount: 14,
      onOffGasGrid: 'On gas grid',
      previousGovernmentGrant: 'None'
    });

    const quoteId = `quote_api_${Date.now()}`;
    const quoteRef = `PEQ-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 89999)}`;

    await db.run(`
      INSERT INTO quotes (
        id, quote_reference, lead_id, mode, total_job_cost, bus_grant,
        required_revenue, customer_contribution, actual_revenue, gross_profit,
        gross_margin_percent, confidence_score, confidence_level, profitability_grade,
        commercial_recommendation, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      quoteId,
      quoteRef,
      'lead_001',
      'NEW_LEAD',
      calculation.costBreakdown.totalJobCost,
      calculation.bus.grantAmount,
      calculation.commercials.requiredRevenue,
      calculation.commercials.customerContribution,
      calculation.commercials.actualRevenue,
      calculation.commercials.grossProfit,
      calculation.commercials.grossMarginPercent,
      calculation.confidence.score,
      calculation.confidence.level,
      calculation.rating.finalGrade,
      calculation.recommendation.status,
      'user_sales'
    ]);

    const snapshotId = await saveCalculationSnapshot({
      quoteId,
      quoteReference: quoteRef,
      userId: 'user_sales',
      mode: 'NEW_LEAD',
      inputs: { leadId: 'lead_001', calculation },
      products: calculation.lineItems,
      prices: calculation.lineItems.map(l => ({ description: l.description, price: l.unitPriceExVat })),
      rulesetVersions: { bus: 'v2.4', commercialSettings: 'v1' },
      commercialSettings: calculation.commercialSettingsUsed,
      outputs: calculation
    });

    expect(snapshotId).toBeDefined();
    expect(snapshotId).toMatch(/^snap_/);

    const verification = await verifyHistoricalSnapshotReproduction(quoteId);
    expect(verification.isMatch).toBe(true);
  });

  it('keeps snapshot payload optimized well under Express body parser limits', async () => {
    const calculation = await calculateNewLeadEstimate({
      addressLine1: '88 Station Road',
      postcode: 'LS2 9JT',
      epcFloorArea: 140,
      propertyType: 'Semi detached',
      bedrooms: 4,
      bathrooms: 2
    });

    const payload = {
      leadId: 'lead_test',
      mode: 'NEW_LEAD',
      createdBy: 'user_sales',
      calculationResult: calculation
    };

    const jsonStr = JSON.stringify(payload);
    const bytes = Buffer.byteLength(jsonStr, 'utf8');

    expect(bytes).toBeLessThan(500 * 1024);
  });
});
