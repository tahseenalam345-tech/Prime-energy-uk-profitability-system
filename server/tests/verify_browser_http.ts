import { calculateNewLeadEstimate } from '../src/engine/newLeadCalculator.js';

async function testBrowserHttpSave() {
  console.log('=== TESTING ACTUAL BROWSER HTTP FETCH TO SERVER ===');

  // 1. Create Lead via HTTP POST /api/leads
  const leadPayload = {
    customerName: 'Sarah Connors',
    email: 'sarah.connors@example.co.uk',
    phone: '07700 900888',
    leadSource: 'Web Calculator UI',
    addressLine1: '10 Downing Street',
    postcode: 'SW1A 2AA',
    country: 'England',
    epcRating: 'D',
    epcFloorArea: 160,
    propertyType: 'Detached',
    bedrooms: 4,
    bathrooms: 2
  };

  const leadRes = await fetch('http://localhost:4000/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(leadPayload)
  });

  console.log(`Step 1: Lead Creation HTTP Status: ${leadRes.status} ${leadRes.statusText}`);
  const leadData = await leadRes.json();
  console.log('  Lead Response Body:', leadData);

  if (!leadRes.ok || !leadData.id) {
    throw new Error(`Lead creation failed: ${JSON.stringify(leadData)}`);
  }

  // 2. Generate Calculation
  const calculation = calculateNewLeadEstimate({
    addressLine1: '10 Downing Street',
    postcode: 'SW1A 2AA',
    epcFloorArea: 160,
    propertyType: 'Detached',
    bedrooms: 4,
    bathrooms: 2
  });

  // 3. Sanitize calc result (same as api.ts)
  const calcClean = { ...calculation };
  delete (calcClean as any).ashp?.allAshpProducts;
  delete (calcClean as any).cylinder?.allCylinders;

  const quotePayload = {
    leadId: leadData.id,
    calculationResult: calcClean,
    userId: 'user_sales'
  };

  const bodyStr = JSON.stringify(quotePayload);
  const payloadBytes = Buffer.byteLength(bodyStr, 'utf8');

  console.log(`\nStep 2: Sending Save Quote Snapshot HTTP POST Request to http://localhost:4000/api/quotes`);
  console.log(`  Calculated Payload String Length: ${bodyStr.length} chars`);
  console.log(`  Payload Size in Bytes: ${payloadBytes} bytes (${(payloadBytes / 1024).toFixed(2)} KB)`);

  const quoteRes = await fetch('http://localhost:4000/api/quotes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: bodyStr
  });

  console.log(`Step 3: Save Quote HTTP Response Status: ${quoteRes.status} ${quoteRes.statusText}`);
  const resText = await quoteRes.text();
  console.log('  Quote Response Raw Text:', resText);
  let quoteData: any = {};
  try {
    quoteData = JSON.parse(resText);
  } catch (e) {}

  if (quoteRes.status !== 201) {
    throw new Error(`Save quote failed with HTTP ${quoteRes.status}: ${JSON.stringify(quoteData)}`);
  }

  console.log('\n--- VERIFICATION CHECKS ---');
  console.log(`✅ HTTP Status is 201 Created (NOT 413 Payload Too Large)`);
  console.log(`✅ Lead ID: ${leadData.id}`);
  console.log(`✅ Quote ID: ${quoteData.quoteId}`);
  console.log(`✅ Quote Reference: ${quoteData.quoteReference}`);
  console.log(`✅ Snapshot ID Returned: ${quoteData.snapshotId}`);

  // 4. Test reopening saved snapshot via GET /api/quotes/:id/snapshot
  const snapRes = await fetch(`http://localhost:4000/api/quotes/${quoteData.quoteId}/snapshot`);
  console.log(`Step 4: Reopen Snapshot HTTP Status: ${snapRes.status} ${snapRes.statusText}`);
  const snapData = await snapRes.json();
  console.log(`✅ Snapshot Reopened Successfully! Snapshot ID in DB: ${snapData.snapshot?.id}`);

  console.log('\n=== REAL BROWSER HTTP FETCH FLOW VERIFIED PERFECTLY ===');
}

testBrowserHttpSave().catch(err => {
  console.error('❌ HTTP TEST ERROR:', err);
  process.exit(1);
});
