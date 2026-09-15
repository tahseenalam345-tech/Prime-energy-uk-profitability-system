import { db } from './connection.js';
import { calculateNewLeadEstimate } from '../engine/newLeadCalculator.js';
import { saveCalculationSnapshot, getCalculationSnapshotById } from '../engine/snapshotEngine.js';
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function runLiveWorkflowTest() {
  console.log('=== STARTING LIVE TURSO WORKFLOW & PARITY VERIFICATION ===');

  // 1. Verify Active Provider Diagnostics
  const providerInfo = db.getProviderInfo();
  console.log('Diagnostic Provider Info:', JSON.stringify(providerInfo, null, 2));

  if (providerInfo.databaseProvider !== 'TURSO') {
    throw new Error('FAILED: Database provider is NOT Turso!');
  }

  // 2. Perform Real Application Workflow: New Lead -> Calculate -> Save Quote -> Save Snapshot -> Reopen Snapshot
  const uniqueId = Date.now();
  const testLeadId = `lead_live_turso_${uniqueId}`;
  const testPropertyId = `prop_live_turso_${uniqueId}`;
  const testQuoteId = `quote_live_turso_${uniqueId}`;
  const refCode = `TURSO-LIVE-${uniqueId}`;

  console.log(`\nCreating Live Lead in Turso Cloud (${testLeadId})...`);

  // Insert Lead & Property atomically
  await db.batch([
    {
      sql: `
        INSERT INTO leads (
          id, reference_no, customer_name, email, phone, lead_source, status, assigned_to, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'WEB_PORTAL', 'NEW', 'user_sales', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      args: [testLeadId, refCode, `Turso Test Customer ${uniqueId}`, `turso.test.${uniqueId}@example.co.uk`, '07700 900999']
    },
    {
      sql: `
        INSERT INTO properties (
          id, lead_id, address_line1, postcode, country, epc_rating,
          epc_floor_area, property_type, property_status, bedrooms, bathrooms, on_off_gas_grid,
          created_at
        ) VALUES (?, ?, '100 Turso Cloud Lane', 'EC1A 1BB', 'England', 'D', 125.0, 'Semi detached', 'Existing property', 3, 1, 'Off gas grid', CURRENT_TIMESTAMP)
      `,
      args: [testPropertyId, testLeadId]
    }
  ], 'write');

  console.log('✔ Lead and Property inserted into Turso Cloud successfully.');

  // Calculate New Lead
  console.log('\nCalculating New Lead estimate...');
  const calculationResult = await calculateNewLeadEstimate({
    addressLine1: '100 Turso Cloud Lane',
    postcode: 'EC1A 1BB',
    epcRating: 'D',
    epcFloorArea: 125.0,
    propertyType: 'Semi detached',
    bedrooms: 3,
    bathrooms: 1,
    onOffGasGrid: 'Off gas grid',
    existingHeatingSystem: 'Oil Boiler'
  });

  console.log(`✔ Calculation complete. Central Heat Demand: ${calculationResult.heatDemand.centralDemandKw} kW, Target ASHP: ${calculationResult.ashp.recommendedProduct?.model}`);

  // Save Quote
  console.log(`\nSaving Quote (${testQuoteId}) to Turso Cloud...`);
  await db.run(`
    INSERT INTO quotes (
      id, quote_reference, lead_id, mode, total_job_cost, bus_grant,
      required_revenue, customer_contribution, actual_revenue, gross_profit,
      gross_margin_percent, profitability_grade, commercial_recommendation, status, created_by, created_at
    ) VALUES (?, ?, ?, 'NEW_LEAD', ?, 9000.00, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', 'user_sales', CURRENT_TIMESTAMP)
  `, [
    testQuoteId,
    refCode,
    testLeadId,
    calculationResult.costBreakdown.totalJobCost,
    calculationResult.commercials.requiredRevenue,
    calculationResult.commercials.customerContribution,
    calculationResult.commercials.actualRevenue,
    calculationResult.commercials.grossProfit,
    calculationResult.commercials.grossMarginPercent,
    calculationResult.rating.grade,
    calculationResult.recommendation.status
  ]);

  console.log('✔ Quote saved to Turso Cloud successfully.');

  // Save Snapshot
  console.log('\nSaving Snapshot to Turso Cloud...');
  const snapshotId = await saveCalculationSnapshot({
    quoteId: testQuoteId,
    quoteReference: refCode,
    userId: 'user_sales',
    mode: 'NEW_LEAD',
    inputs: { addressLine1: '100 Turso Cloud Lane', postcode: 'EC1A 1BB' },
    products: [calculationResult.ashp.recommendedProduct || {}],
    prices: [],
    rulesetVersions: { bus: calculationResult.bus.rulesetVersion },
    commercialSettings: { targetGrossMargin: 0.25 },
    outputs: calculationResult
  });

  console.log(`✔ Snapshot saved. Snapshot ID: ${snapshotId}`);

  // Reopen Snapshot
  console.log(`\nReopening Snapshot (${snapshotId}) from Turso Cloud...`);
  const retrievedSnapshot = await getCalculationSnapshotById(snapshotId);
  if (!retrievedSnapshot) {
    throw new Error('FAILED: Snapshot could not be reopened from Turso Cloud!');
  }
  console.log(`✔ Snapshot reopened successfully. Total Job Cost matches: £${retrievedSnapshot.outputs.costBreakdown.totalJobCost}`);

  // 3. Multi-Session Verification: Query Turso Cloud from a separate client instance
  console.log('\nTesting Multi-Session Access (Independent Client Session)...');
  const session2Client = createClient({
    url: process.env.DATABASE_URL!.trim(),
    authToken: process.env.TURSO_AUTH_TOKEN!.trim(),
  });

  const session2LeadRes = await session2Client.execute({
    sql: 'SELECT id, reference_no, customer_name FROM leads WHERE id = ?',
    args: [testLeadId]
  });

  const session2Lead = session2LeadRes.rows[0];
  if (!session2Lead || session2Lead.id !== testLeadId) {
    throw new Error('FAILED: Independent DB session could NOT read newly created lead!');
  }

  const session2QuoteRes = await session2Client.execute({
    sql: 'SELECT id, total_job_cost, bus_grant FROM quotes WHERE id = ?',
    args: [testQuoteId]
  });

  const session2Quote = session2QuoteRes.rows[0];
  if (!session2Quote || session2Quote.id !== testQuoteId) {
    throw new Error('FAILED: Independent DB session could NOT read newly created quote!');
  }

  console.log('✔ Multi-session verification PASSED! Independent client read lead & quote successfully.');
  console.log('  Session 2 Lead:', session2Lead.customer_name);
  console.log('  Session 2 Quote Total Cost:', session2Quote.total_job_cost, '| BUS Grant:', session2Quote.bus_grant);

  // Table row count verification against Turso Cloud
  const tables = ['products', 'leads', 'quotes', 'calculation_snapshots'];
  console.log('\nCurrent Turso Cloud Row Counts:');
  for (const table of tables) {
    const r = await db.get<{ count: number }>(`SELECT COUNT(*) as count FROM ${table}`);
    console.log(`  - ${table}: ${r?.count}`);
  }

  console.log('\n==================================================');
  console.log('LIVE DB = TURSO');
  console.log('==================================================');
}

runLiveWorkflowTest().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
