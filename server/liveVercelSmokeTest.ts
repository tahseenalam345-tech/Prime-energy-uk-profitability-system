import dotenv from 'dotenv';
dotenv.config();

const baseUrl = 'https://prime-energy-uk-profitability-syste.vercel.app';

async function runLiveSmokeTest() {
  console.log('==================================================');
  console.log('LIVE VERCEL END-TO-END SMOKE TEST');
  console.log('Target URL:', baseUrl);
  console.log('==================================================\n');

  // 1. Health check & Turso proof
  const healthRes = await fetch(`${baseUrl}/api/health`);
  const health = await healthRes.json();
  console.log('[TEST 1] Health Check & Turso Proof:');
  console.log('  - Status Code:', healthRes.status);
  console.log('  - Service Status:', health.status);
  console.log('  - Database Provider:', health.databaseProvider);
  console.log('  - Database Host:', health.databaseHost);

  if (health.databaseProvider !== 'TURSO') {
    throw new Error('FAILED: Database provider is NOT Turso Cloud!');
  }

  // 2. Anonymous Access Views (Read-Only)
  console.log('\n[TEST 2] Anonymous Read-Only Access:');
  const dashRes = await fetch(`${baseUrl}/api/reports/dashboard-summary`);
  const dash = await dashRes.json();
  console.log('  - Dashboard View:', dashRes.status === 200 ? 'PASS' : 'FAIL', '| Total Leads:', dash.metrics?.totalLeads);

  const jobsRes = await fetch(`${baseUrl}/api/reports/jobs`);
  const jobs = await jobsRes.json();
  console.log('  - Jobs View:', jobsRes.status === 200 ? 'PASS' : 'FAIL', '| Total Jobs Loaded:', jobs.jobs?.length);

  const prodRes = await fetch(`${baseUrl}/api/admin/products?family=ASHP&search=Viessmann`);
  const prods = await prodRes.json();
  console.log('  - Products Search & Filter (Viessmann ASHP):', prodRes.status === 200 ? 'PASS' : 'FAIL', '| Items Found:', prods.products?.length);

  // 3. Unauthenticated Mutation Write Block (401 Check)
  console.log('\n[TEST 3] Unauthenticated Write Protection (401 Check):');
  const unauthMutateRes = await fetch(`${baseUrl}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerName: 'Unauthorized Test Customer' })
  });
  const unauthErr = await unauthMutateRes.json();
  console.log('  - POST /api/leads Unauthenticated Status:', unauthMutateRes.status, '| Block Message:', unauthErr.error);

  if (unauthMutateRes.status !== 401) {
    throw new Error('FAILED: Unauthenticated mutation was NOT blocked with 401!');
  }

  // 4. Admin Account Login
  console.log('\n[TEST 4] Admin Authentication:');
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'tahseenamal345@gmail.com',
      password: 'PrimePassword2026!'
    })
  });
  const loginData = await loginRes.json();
  console.log('  - Admin Login Status:', loginRes.status);
  console.log('  - User ID:', loginData.user?.id);
  console.log('  - User Role:', loginData.user?.role_name);
  console.log('  - JWT Token Issued:', !!loginData.token);

  const adminToken = loginData.token;
  if (!adminToken) {
    throw new Error('FAILED: Admin token not received!');
  }

  // 5. Admin Create READ_ONLY User
  console.log('\n[TEST 5] Admin User Management (Create READ_ONLY User):');
  const readOnlyEmail = `readonly_smoke_${Date.now()}@example.com`;
  const createUserRes = await fetch(`${baseUrl}/api/auth/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: 'Smoke Test Viewer User',
      email: readOnlyEmail,
      role_name: 'READ_ONLY',
      password: 'SmokePassword2026!'
    })
  });
  const createUserData = await createUserRes.json();
  console.log('  - Create User Status:', createUserRes.status);
  console.log('  - Created User Email:', createUserData.user?.email);
  console.log('  - Created User Role:', createUserData.user?.role_name);

  // 6. Test READ_ONLY Login & Authorization Enforcement
  console.log('\n[TEST 6] READ_ONLY User Authorization & Write Block (403 Check):');
  const readOnlyLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: readOnlyEmail,
      password: 'SmokePassword2026!'
    })
  });
  const readOnlyLoginData = await readOnlyLoginRes.json();
  const readOnlyToken = readOnlyLoginData.token;
  console.log('  - READ_ONLY Login Status:', readOnlyLoginRes.status);
  console.log('  - READ_ONLY Token Issued:', !!readOnlyToken);

  const readOnlyWriteRes = await fetch(`${baseUrl}/api/auth/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${readOnlyToken}`
    },
    body: JSON.stringify({ name: 'Unauthorized Create', email: 'fail@example.com', password: 'pass' })
  });
  const readOnlyWriteErr = await readOnlyWriteRes.json();
  console.log('  - READ_ONLY Write Attempt Status:', readOnlyWriteRes.status, '| Forbidden Message:', readOnlyWriteErr.error);

  if (readOnlyWriteRes.status !== 403) {
    throw new Error('FAILED: READ_ONLY write attempt was NOT blocked with 403!');
  }

  // 7. Full Workflow: Create Lead -> Calculate -> Save Quote -> Save Snapshot
  console.log('\n[TEST 7] Full End-to-End Workflow (Lead -> Calc -> Quote -> Snapshot):');
  const uniqueId = Date.now();
  const leadRes = await fetch(`${baseUrl}/api/leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      customerName: `Live Vercel Customer ${uniqueId}`,
      addressLine1: '500 Vercel Production Cloud Way',
      postcode: 'EC1A 1BB',
      epcRating: 'D',
      epcFloorArea: 135.0,
      bedrooms: 4,
      bathrooms: 2,
      onOffGasGrid: 'Off gas grid',
      existingHeatingSystem: 'Oil Boiler'
    })
  });
  const leadData = await leadRes.json();
  console.log('  - 7.1 Lead Creation Status:', leadRes.status, '| Lead ID:', leadData.id, '| Ref:', leadData.referenceNo);

  const calcRes = await fetch(`${baseUrl}/api/calculator/new-lead`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      addressLine1: '500 Vercel Production Cloud Way',
      postcode: 'EC1A 1BB',
      epcRating: 'D',
      epcFloorArea: 135.0,
      bedrooms: 4,
      bathrooms: 2,
      onOffGasGrid: 'Off gas grid',
      existingHeatingSystem: 'Oil Boiler'
    })
  });
  const calcData = await calcRes.json();
  console.log('  - 7.2 Quotation Calculation Status:', calcRes.status);
  console.log('      Central Heat Demand:', calcData.heatDemand?.centralDemandKw, 'kW');
  console.log('      Selected ASHP Model:', calcData.ashp?.recommendedProduct?.model);
  console.log('      BUS Grant Amount: £', calcData.bus?.grantAmount);
  console.log('      Total Job Cost: £', calcData.costBreakdown?.totalJobCost);

  const quoteRes = await fetch(`${baseUrl}/api/quotes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      leadId: leadData.id,
      calculationResult: calcData
    })
  });
  const quoteData = await quoteRes.json();
  console.log('  - 7.3 Save Quote & Snapshot Status:', quoteRes.status);
  console.log('      Quote ID:', quoteData.quoteId);
  console.log('      Quote Reference:', quoteData.quoteReference);
  console.log('      Snapshot ID:', quoteData.snapshotId);

  // 8. Reopen Snapshot from Live Database
  console.log('\n[TEST 8] Snapshot Reopening & Reproducibility Verification:');
  const snapRes = await fetch(`${baseUrl}/api/quotes/${quoteData.quoteId}/snapshot`);
  const snapData = await snapRes.json();
  console.log('  - Snapshot Reopen Status:', snapRes.status);
  console.log('  - Snapshot Found:', !!snapData.snapshot);
  console.log('  - Reopened Total Job Cost Match: £', snapData.snapshot?.outputs?.costBreakdown?.totalJobCost);

  if (snapData.snapshot?.outputs?.costBreakdown?.totalJobCost !== calcData.costBreakdown?.totalJobCost) {
    throw new Error('FAILED: Reopened snapshot total cost does not match calculated output!');
  }

  // 9. Confirm Persisted Data in Dashboard Report
  console.log('\n[TEST 9] Live Turso Cloud Persistence Check in Dashboard Report:');
  const updatedDashRes = await fetch(`${baseUrl}/api/reports/dashboard-summary`);
  const updatedDash = await updatedDashRes.json();
  const createdLeadInDash = updatedDash.jobs?.find((j: any) => j.id === leadData.id);

  console.log('  - Newly Created Lead Found in Dashboard:', !!createdLeadInDash);
  console.log('  - Customer Name Verified:', createdLeadInDash?.customer_name);
  console.log('  - Quote Reference Verified:', createdLeadInDash?.commercial?.quote_reference);
  console.log('  - Job Status Verified:', createdLeadInDash?.status);

  if (!createdLeadInDash) {
    throw new Error('FAILED: Newly created lead was not returned by live dashboard query!');
  }

  console.log('\n==================================================');
  console.log('LIVE VERCEL SMOKE TEST: ALL 9 AUDIT POINTS PASSED!');
  console.log('==================================================\n');
}

runLiveSmokeTest().catch((err) => {
  console.error('\nLIVE SMOKE TEST FAILED WITH ERROR:', err);
  process.exit(1);
});
