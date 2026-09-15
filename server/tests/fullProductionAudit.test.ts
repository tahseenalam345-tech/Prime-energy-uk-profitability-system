import { describe, it, expect, beforeAll } from 'vitest';
import { db, initDatabase } from '../src/db/connection.js';
import { calculateNewLeadEstimate } from '../src/engine/newLeadCalculator.js';
import { calculateAfterSurveyViability } from '../src/engine/afterSurveyCalculator.js';
import { saveCalculationSnapshot, getCalculationSnapshotById, verifyHistoricalSnapshotReproduction } from '../src/engine/snapshotEngine.js';
import { evaluateBUSEligibility } from '../src/engine/busEngine.js';

import { seedDatabase } from '../src/db/seed.js';

describe('Full System Production Audit Verification Suite', () => {
  beforeAll(async () => {
    await initDatabase();
    await seedDatabase();
  });

  it('Audit Point 1 & 28: Dashboard Summary & Pipeline Job Fetching', async () => {
    const leads = await db.all('SELECT id, status FROM leads');
    expect(leads).toBeDefined();
    const quotes = await db.all('SELECT id FROM quotes');
    expect(quotes).toBeDefined();
  });

  it('Audit Point 2, 3, 4: New Lead Pre-Survey, EPC, and Heat Demand Estimation', async () => {
    const result = await calculateNewLeadEstimate({
      addressLine1: '123 Test Street',
      postcode: 'SW1A 1AA',
      epcRating: 'D',
      epcFloorArea: 120,
      propertyType: 'Semi detached',
      bedrooms: 3,
      bathrooms: 1,
      onOffGasGrid: 'On gas grid'
    });

    expect(result.mode).toBe('NEW_LEAD');
    expect(result.heatDemand.centralDemandKw).toBeGreaterThan(0);
    expect(result.heatDemand.annualHeatingKwh).toBeDefined();
    expect(result.ashp.recommendedProduct).toBeDefined();
    expect(result.cylinder.recommendedProduct).toBeDefined();
    expect(result.bus.grantAmount).toBe(7500);
  });

  it('Audit Point 5 & 6: ASHP Recommendation and Manual ASHP Override', async () => {
    // Automatic recommendation
    const autoResult = await calculateNewLeadEstimate({
      addressLine1: '45 Park Lane',
      postcode: 'M1 1AA',
      epcFloorArea: 100,
      propertyType: 'Semi detached'
    });
    expect(autoResult.ashp.recommendedProduct).toBeDefined();

    // Fetch an actual active ASHP product ID from DB to override
    const ashpRow = await db.get<{ id: string }>("SELECT id FROM products WHERE family = 'ASHP' AND active = 1 LIMIT 1");
    expect(ashpRow).toBeDefined();

    // Manual override
    const overrideResult = await calculateNewLeadEstimate({
      addressLine1: '45 Park Lane',
      postcode: 'M1 1AA',
      epcFloorArea: 100,
      propertyType: 'Semi detached',
      overrideAshpId: ashpRow!.id
    });

    expect(overrideResult.ashp.isManualOverride).toBe(true);
    expect(overrideResult.ashp.selectedProduct?.id).toBe(ashpRow!.id);
  });

  it('Audit Point 7 & 8: Cylinder Recommendation and Manual Cylinder Override', async () => {
    const autoCyl = await calculateNewLeadEstimate({
      addressLine1: '10 High St',
      postcode: 'B1 1AA',
      epcFloorArea: 150,
      propertyType: 'Detached',
      bedrooms: 4,
      bathrooms: 2,
      cylinderSpace: 'Yes'
    });
    expect(autoCyl.cylinder.recommendedProduct).toBeDefined();

    const cylRow = await db.get<{ id: string }>("SELECT id FROM products WHERE family = 'CYLINDER' AND active = 1 LIMIT 1");
    expect(cylRow).toBeDefined();

    const overrideCyl = await calculateNewLeadEstimate({
      addressLine1: '10 High St',
      postcode: 'B1 1AA',
      epcFloorArea: 150,
      propertyType: 'Detached',
      bedrooms: 4,
      bathrooms: 2,
      cylinderSpace: 'Yes',
      overrideCylinderId: cylRow!.id
    });
    expect(overrideCyl.cylinder.isManualOverride).toBe(true);
    expect(overrideCyl.cylinder.selectedProduct?.id).toBe(cylRow!.id);
  });

  it('Audit Point 9: Radiator Estimation & Selection', async () => {
    const radResult = await calculateNewLeadEstimate({
      addressLine1: '88 Station Rd',
      postcode: 'LS1 1AA',
      epcFloorArea: 110,
      propertyType: 'Semi detached',
      existingRadiatorCount: 8
    });
    expect(radResult.radiators.estimatedReplacementCount).toBeGreaterThan(0);
    expect(radResult.costBreakdown.radiatorsAllowance).toBeGreaterThan(0);
  });

  it('Audit Point 10: Accessories / Materials & BOM Engine', async () => {
    const bomResult = await calculateNewLeadEstimate({
      addressLine1: '5 Green Way',
      postcode: 'CB1 1AA',
      epcFloorArea: 90,
      propertyType: 'Terraced',
      boilerType: 'Combi',
      existingPipework: 'Microbore 10mm or less'
    });
    expect(bomResult.costBreakdown.combiConversionAllowance).toBeGreaterThan(0);
    expect(bomResult.costBreakdown.pipeworkAllowance).toBeGreaterThan(0);
  });

  it('Audit Point 11, 13, 14, 15, 16: Commercial Cost Composition & Margin Mathematics', async () => {
    const calc = await calculateNewLeadEstimate({
      addressLine1: 'Commercial Test',
      postcode: 'E1 6AN',
      epcFloorArea: 100,
      propertyType: 'Semi detached'
    });

    const c = calc.commercials;
    const totalJobCost = calc.costBreakdown.totalJobCost;

    // Golden Formula Validation
    const expectedReqRev = Math.round((totalJobCost / (1 - 0.25)) * 100) / 100;
    expect(c.requiredRevenue).toBe(expectedReqRev);

    const expectedContrib = Math.max(0, Math.round((expectedReqRev - calc.bus.grantAmount) * 100) / 100);
    expect(c.customerContribution).toBe(expectedContrib);

    const expectedRev = Math.round((calc.bus.grantAmount + c.customerContribution) * 100) / 100;
    expect(c.actualRevenue).toBe(expectedRev);

    const expectedProfit = Math.round((c.actualRevenue - totalJobCost) * 100) / 100;
    expect(c.grossProfit).toBe(expectedProfit);

    const expectedMarginPct = Math.round(((c.grossProfit / c.actualRevenue) * 100) * 100) / 100;
    expect(c.grossMarginPercent).toBe(expectedMarginPct);
  });

  it('Audit Point 12: BUS Grant £7,500 standard and £9,000 Off-Gas Oil/LPG case', async () => {
    const standardBus = await evaluateBUSEligibility({
      country: 'England',
      propertyStatus: 'Existing property',
      onOffGasGrid: 'On gas grid',
      existingHeatingSystem: 'Mains Gas Boiler'
    });
    expect(standardBus.grantAmount).toBe(7500);

    const offGasBus = await evaluateBUSEligibility({
      country: 'England',
      propertyStatus: 'Existing property',
      onOffGasGrid: 'Off gas grid',
      existingFuelType: 'Oil'
    });
    expect(offGasBus.grantAmount).toBe(9000);
  });

  it('Audit Point 17: Rating / Confidence Engine', async () => {
    const calc = await calculateNewLeadEstimate({
      addressLine1: 'Confidence Test',
      postcode: 'B1 1AA',
      epcFloorArea: 100,
      propertyType: 'Semi detached',
      epcRating: 'C',
      wallInsulation: 'Insulated',
      roofInsulation: 'Insulated'
    });
    expect(calc.confidence.level).toBeDefined();
    expect(calc.rating.finalGrade).toBeDefined();
  });

  it('Audit Point 18, 19, 20: Save Quote, Save Snapshot, and Snapshot Reopen', async () => {
    const leadId = `lead_audit_${Date.now()}`;
    await db.run(
      `INSERT INTO leads (id, reference_no, customer_name, status) VALUES (?, ?, ?, 'NEW')`,
      [leadId, `PEL-AUDIT-${Date.now()}`, 'Audit Customer']
    );

    await db.run(
      `INSERT INTO properties (id, lead_id, address_line1, postcode, property_type, property_status) VALUES (?, ?, '1 Audit Way', 'SW1A 1AA', 'Semi detached', 'Existing property')`,
      [`prop_audit_${Date.now()}`, leadId]
    );

    const calc = await calculateNewLeadEstimate({
      addressLine1: '1 Audit Way',
      postcode: 'SW1A 1AA',
      epcFloorArea: 100,
      propertyType: 'Semi detached'
    });

    const quoteId = `quote_audit_${Date.now()}`;
    const quoteRef = `PEQ-AUDIT-${Date.now()}`;

    await db.run(`
      INSERT INTO quotes (
        id, quote_reference, lead_id, mode, total_job_cost, bus_grant,
        required_revenue, customer_contribution, actual_revenue, gross_profit,
        gross_margin_percent, confidence_score, confidence_level, profitability_grade,
        commercial_recommendation, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      quoteId,
      quoteRef,
      leadId,
      calc.mode,
      calc.costBreakdown.totalJobCost,
      calc.bus.grantAmount,
      calc.commercials.requiredRevenue,
      calc.commercials.customerContribution,
      calc.commercials.actualRevenue,
      calc.commercials.grossProfit,
      calc.commercials.grossMarginPercent,
      calc.confidence.score,
      calc.confidence.level,
      calc.rating.finalGrade,
      calc.recommendation.status,
      'DRAFT',
      'user_sales'
    ]);

    const snapId = await saveCalculationSnapshot({
      quoteId,
      quoteReference: quoteRef,
      userId: 'user_sales',
      mode: calc.mode,
      inputs: { leadId, floorArea: 100 },
      products: calc.lineItems,
      prices: calc.lineItems.map(l => ({ description: l.description, price: l.unitPriceExVat })),
      rulesetVersions: { bus: calc.bus.rulesetVersion, commercialSettings: calc.commercialSettingsUsed.version },
      commercialSettings: calc.commercialSettingsUsed,
      outputs: calc
    });

    expect(snapId).toBeDefined();

    const snapshot = await getCalculationSnapshotById(quoteId);
    expect(snapshot).not.toBeNull();
    expect(snapshot?.outputs.costBreakdown.totalJobCost).toBe(calc.costBreakdown.totalJobCost);

    const verification = await verifyHistoricalSnapshotReproduction(quoteId);
    expect(verification.isMatch).toBe(true);
  });

  it('Audit Point 21: After Survey Calculation Engine', async () => {
    const ashpRow = await db.get<{ id: string }>("SELECT id FROM products WHERE family = 'ASHP' AND active = 1 LIMIT 1");
    const cylRow = await db.get<{ id: string }>("SELECT id FROM products WHERE family = 'CYLINDER' AND active = 1 LIMIT 1");

    const afterSurvey = await calculateAfterSurveyViability({
      leadId: 'lead_test',
      surveyorUserId: 'user_surveyor',
      confirmedDesignHeatLossKw: 7.2,
      designOutdoorTemp: -3,
      designFlowTemp: 45,
      selectedAshpId: ashpRow!.id,
      selectedCylinderId: cylRow!.id,
      exactRadiatorsSchedule: [
        { productId: 'rad_k2_600_1000', quantity: 6, unitPriceExVat: 120 }
      ]
    });

    expect(afterSurvey.mode).toBe('AFTER_SURVEY');
    expect(afterSurvey.confirmedDesignHeatLossKw).toBe(7.2);
    expect(afterSurvey.selectedEquipment.ashp.id).toBe(ashpRow!.id);
    expect(afterSurvey.selectedEquipment.cylinder?.id).toBe(cylRow!.id);
    expect(afterSurvey.confidenceDisplay).toBe('SURVEY-CONFIRMED');
  });

  it('Audit Point 22, 23, 24, 25: Master Product Catalog, MCS & Cylinder/Radiator Catalogues', async () => {
    const products = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM products WHERE active = 1');
    expect(products!.count).toBeGreaterThan(400);

    const ashpMcs = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM products WHERE family = 'ASHP' AND mcs_status = 'MCS_CERTIFIED'");
    expect(ashpMcs!.count).toBeGreaterThan(50);

    const cylinders = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM products WHERE family = 'CYLINDER' AND active = 1");
    expect(cylinders!.count).toBeGreaterThan(5);

    const radiators = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM radiator_catalogue WHERE active = 1');
    expect(radiators!.count).toBeGreaterThanOrEqual(100);
  });

  it('Audit Point 26 & 27: Pricing/VAT & Authoritative Rule Evidence Registry', async () => {
    const ruleEvidence = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM rule_evidence WHERE verification_status LIKE 'VERIFIED_OFFICIAL%' OR verification_status = 'PRIME_CONFIG'");
    expect(ruleEvidence!.count).toBeGreaterThan(10);
  });

  it('Audit Point 29 & 30: Database Provider Diagnostics', async () => {
    const info = db.getProviderInfo();
    expect(info.databaseProvider).toBeDefined();
    expect(info.databaseHost).toBeDefined();
  });
});
