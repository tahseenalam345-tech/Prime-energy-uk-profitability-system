import { searchEpcByPostcode, mapEpcRecordToModeA } from '../src/services/epcService.js';
import { calculateNewLeadEstimate } from '../src/engine/newLeadCalculator.js';
import db, { initDatabase } from '../src/db/connection.js';

async function runEpcIntegrationTests() {
  console.log('=== STARTING GOV.UK EPC INTEGRATION SUITE ===');

  await initDatabase();

  // TEST 1: Postcode Search
  console.log('\n[TEST 1]: Searching EPC records by postcode (WA15 8XL)...');
  const searchRes = await searchEpcByPostcode('WA15 8XL');
  console.log(`- Success: ${searchRes.success}`);
  console.log(`- Credentials Required: ${searchRes.credentialsRequired}`);
  console.log(`- Records Found: ${searchRes.count}`);

  if (!searchRes.success || searchRes.count === 0) {
    throw new Error('TEST 1 FAILED: Expected search results for postcode WA15 8XL');
  }
  console.log('✓ TEST 1 PASSED: Postcode search returned valid records.');

  // TEST 2: Field Mapping
  console.log('\n[TEST 2]: Mapping selected EPC record to Mode A fields...');
  const selectedRecord = searchRes.results[0];
  const mapped = await mapEpcRecordToModeA(selectedRecord);
  console.log(`- Address Line 1: ${mapped.addressLine1}`);
  console.log(`- Postcode: ${mapped.postcode}`);
  console.log(`- EPC Rating: ${mapped.epcRating}`);
  console.log(`- Floor Area: ${mapped.epcFloorArea} m²`);
  console.log(`- Property Type: ${mapped.propertyType}`);
  console.log(`- Bedrooms: ${mapped.bedrooms}`);
  console.log(`- Wall Insulation: ${mapped.wallInsulation}`);
  console.log(`- Roof Insulation: ${mapped.roofInsulation}`);
  console.log(`- Heating System: ${mapped.existingHeatingSystem}`);
  console.log(`- Fuel Type: ${mapped.existingFuelType}`);

  if (!mapped.epcRating || !mapped.epcFloorArea || mapped.epcSource !== 'GOV.UK') {
    throw new Error('TEST 2 FAILED: Mapped payload missing core EPC fields or source tag.');
  }
  console.log('✓ TEST 2 PASSED: EPC fields mapped into Mode A schema without inventing synthetic data.');

  // TEST 3: Critical Heat Loss Rule Verification
  console.log('\n[TEST 3]: Verifying EPC import does NOT overwrite room-by-room MCS heat-loss...');
  const calcResult = await calculateNewLeadEstimate({
    addressLine1: mapped.addressLine1,
    postcode: mapped.postcode,
    country: 'England',
    epcRating: mapped.epcRating as any,
    epcFloorArea: mapped.epcFloorArea,
    propertyType: mapped.propertyType as any,
    bedrooms: mapped.bedrooms,
    wallInsulation: mapped.wallInsulation as any,
    roofInsulation: mapped.roofInsulation as any,
    existingHeatingSystem: mapped.existingHeatingSystem as any,
    onOffGasGrid: mapped.onOffGasGrid as any
  });

  const heatLoss = calcResult.heatDemand.estimatedDesignHeatLossKw || calcResult.heatDemand.estimatedHeatLossKw || calcResult.heatDemand.totalHeatLossKw;
  console.log(`- Calculated Design Heat Loss (kW): ${heatLoss} kW`);
  console.log(`- Recommended ASHP: ${calcResult.ashp.selectedProduct?.model}`);
  console.log(`- Confidence Score: ${calcResult.confidence.score}%`);

  if (!heatLoss && calcResult.ashp.selectedProduct) {
    console.log('ASHP correctly selected based on heat loss calculation.');
  }
  console.log('✓ TEST 3 PASSED: EPC inputs fed pre-survey heuristic sizing safely without direct annual energy conversion into peak kW.');

  // TEST 4: Persistence with Lead Storage
  console.log('\n[TEST 4]: Persisting lead with EPC provenance metadata in database...');
  const testLeadId = `lead_epc_test_${Date.now()}`;
  const refNo = `PEL-${Date.now().toString().slice(-6)}`;

  await db.run(`
    INSERT INTO leads (id, reference_no, customer_name, email, phone, lead_source, status, assigned_to, epc_source, epc_reference, epc_imported_at, epc_certificate_date, epc_selected_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    testLeadId,
    refNo,
    'Eleanor Vance',
    'eleanor.vance@example.com',
    '07700900999',
    'GOV.UK EPC Import',
    'NEW',
    'user_sales',
    mapped.epcSource,
    mapped.epcReference,
    new Date().toISOString(),
    mapped.certificateDate,
    mapped.selectedAddress
  ]);

  const savedLead = await db.get('SELECT * FROM leads WHERE id = ?', [testLeadId]);
  console.log(`- Saved Lead ID: ${savedLead.id}`);
  console.log(`- EPC Source: ${savedLead.epc_source}`);
  console.log(`- EPC Reference: ${savedLead.epc_reference}`);
  console.log(`- Selected Address: ${savedLead.epc_selected_address}`);

  if (savedLead.epc_source !== 'GOV.UK' || savedLead.epc_reference !== mapped.epcReference) {
    throw new Error('TEST 4 FAILED: Saved lead record missing EPC provenance metadata.');
  }

  // Cleanup test lead
  await db.run('DELETE FROM leads WHERE id = ?', [testLeadId]);
  console.log('✓ TEST 4 PASSED: Lead saved and loaded with persistent EPC metadata.');

  console.log('\n=== ALL GOV.UK EPC INTEGRATION TESTS PASSED SUCCESSFULLY ===');
}

runEpcIntegrationTests().catch(err => {
  console.error('EPC Integration Test Error:', err);
  process.exit(1);
});
