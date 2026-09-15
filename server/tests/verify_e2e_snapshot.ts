import { db } from '../src/db/connection.js';
import { calculateNewLeadEstimate } from '../src/engine/newLeadCalculator.js';
import { saveCalculationSnapshot, getCalculationSnapshotById, verifyHistoricalSnapshotReproduction } from '../src/engine/snapshotEngine.js';

async function runE2EVerification() {
  console.log('=== STARTING END-TO-END QUOTE SNAPSHOT FLOW VERIFICATION ===');

  const leadInputs = {
    customerName: 'Eleanor Vance',
    email: 'eleanor.vance@example.co.uk',
    phone: '07700 900123',
    leadSource: 'Website Quote Calculator',
    addressLine1: '42 Highfield Road',
    postcode: 'LS17 6QA',
    country: 'England',
    epcRating: 'D',
    epcFloorArea: 135,
    propertyType: 'Detached',
    propertyStatus: 'Existing property',
    bedrooms: 4,
    bathrooms: 2,
    wallInsulation: 'Cavity wall',
    roofInsulation: '200mm loft',
    existingHeatingSystem: 'Mains Gas',
    boilerType: 'System',
    onOffGasGrid: 'On gas grid',
    cylinderSpace: 'Yes',
    existingRadiatorCount: 12,
    existingPipework: 'Standard 15mm+',
    previousGovernmentGrant: 'None',
    salesNotes: 'E2E verification customer lead'
  };

  const result = await calculateNewLeadEstimate(leadInputs);
  console.log('Step 1: Generated calculation result.');
  console.log(`  Total Job Cost: £${result.costBreakdown.totalJobCost}`);

  const leadId = `lead_${Date.now()}`;
  const refNo = `PEL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  await db.run(`
    INSERT INTO leads (id, reference_no, customer_name, email, phone, lead_source, status, assigned_to)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    leadId,
    refNo,
    leadInputs.customerName,
    leadInputs.email,
    leadInputs.phone,
    leadInputs.leadSource,
    'NEW',
    'user_sales'
  ]);

  const quoteId = `quote_${Date.now()}`;
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
    leadId,
    result.mode,
    result.costBreakdown.totalJobCost,
    result.bus.grantAmount,
    result.commercials.requiredRevenue,
    result.commercials.customerContribution,
    result.commercials.actualRevenue,
    result.commercials.grossProfit,
    result.commercials.grossMarginPercent,
    result.confidence.score,
    result.confidence.level,
    result.rating.finalGrade,
    result.recommendation.status,
    'user_sales'
  ]);

  const snapshotId = await saveCalculationSnapshot({
    quoteId,
    quoteReference: quoteRef,
    userId: 'user_sales',
    mode: 'NEW_LEAD',
    inputs: { leadId, leadInputs },
    products: result.lineItems,
    prices: result.lineItems.map(l => ({ description: l.description, price: l.unitPriceExVat })),
    rulesetVersions: { bus: 'v2.4', commercialSettings: 'v1' },
    commercialSettings: result.commercialSettingsUsed,
    outputs: result
  });

  console.log(`Snapshot saved: ${snapshotId}`);

  const snapshot = await getCalculationSnapshotById(quoteId);
  console.log('Snapshot reopened:', snapshot ? 'SUCCESS' : 'FAILED');

  const verification = await verifyHistoricalSnapshotReproduction(quoteId);
  console.log('Reproduction verification:', verification.isMatch ? 'MATCH' : 'MISMATCH');

  console.log('=== END-TO-END VERIFICATION COMPLETE ===');
}

if (process.argv[1]?.includes('verify_e2e_snapshot')) {
  runE2EVerification().catch(console.error);
}
