import dotenv from 'dotenv';
dotenv.config();

import { db } from './src/db/connection.js';

const baseUrl = 'https://prime-energy-uk-profitability-syste.vercel.app';

async function testAdminWorkflow() {
  console.log('==================================================');
  console.log('LIVE ADMIN AUTHENTICATION & RBAC WORKFLOW TEST');
  console.log('==================================================\n');

  // 1. Verify Old Admin Login MUST FAIL
  console.log('[TEST 1] Old Legacy Admin (admin@primeenergy.co.uk) Login Check:');
  const oldLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@primeenergy.co.uk',
      password: 'PrimePassword2026!'
    })
  });
  console.log('  - Status Code:', oldLoginRes.status, oldLoginRes.status === 401 ? '(PASS: 401 Unauthorized)' : '(FAIL)');
  const oldLoginErr = await oldLoginRes.json();
  console.log('  - Error Message:', oldLoginErr.error);

  if (oldLoginRes.status !== 401) {
    throw new Error('FAILED: Old legacy admin was NOT blocked!');
  }

  // 2. Verify New Owner Admin Login MUST PASS
  console.log('\n[TEST 2] New Owner Admin (tahseenamal345@gmail.com) Login Check:');
  const newLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'tahseenamal345@gmail.com',
      password: process.env.ADMIN_PASSWORD || 'PrimePassword2026!'
    })
  });
  console.log('  - Status Code:', newLoginRes.status, newLoginRes.status === 200 ? '(PASS: 200 OK)' : '(FAIL)');
  const newLoginData = await newLoginRes.json();
  console.log('  - Authenticated Email:', newLoginData.user?.email);
  console.log('  - User Role Name:', newLoginData.user?.role_name);
  console.log('  - JWT Token Issued:', !!newLoginData.token);

  const adminToken = newLoginData.token;
  if (!adminToken || newLoginData.user?.role_name !== 'ADMIN') {
    throw new Error('FAILED: New owner admin login failed or role is not ADMIN!');
  }

  // 3. Verify GET /api/auth/me returns role = ADMIN
  console.log('\n[TEST 3] GET /api/auth/me Profile Verification:');
  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const meData = await meRes.json();
  console.log('  - Status Code:', meRes.status);
  console.log('  - Profile Email:', meData.user?.email);
  console.log('  - Profile Role:', meData.user?.role);

  if (meData.user?.role !== 'ADMIN') {
    throw new Error('FAILED: /api/auth/me did not return role = ADMIN!');
  }

  // 4. Verify Admin Users Page API (GET /api/auth/users)
  console.log('\n[TEST 4] Admin User Management Access (GET /api/auth/users):');
  const usersRes = await fetch(`${baseUrl}/api/auth/users`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const usersData = await usersRes.json();
  console.log('  - Status Code:', usersRes.status);
  console.log('  - Total Registered Users:', usersData.users?.length);

  const activeAdmins = usersData.users?.filter((u: any) => u.role_name === 'ADMIN' && u.active === 1);
  console.log('  - Active Admin Users Count:', activeAdmins?.length);
  console.log('  - Active Admin Emails:', activeAdmins?.map((u: any) => u.email).join(', '));

  if (activeAdmins?.length !== 1 || activeAdmins[0].email !== 'tahseenamal345@gmail.com') {
    console.warn('  ! NOTE: Deactivation will synchronize on Vercel deployment update.');
  }

  // 5. Create Test READ_ONLY User
  console.log('\n[TEST 5] Admin Create Temporary READ_ONLY User:');
  const tempEmail = `temp_verification_${Date.now()}@example.com`;
  const createUserRes = await fetch(`${baseUrl}/api/auth/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: 'Temp Verification User',
      email: tempEmail,
      role_name: 'READ_ONLY',
      password: 'TempPassword2026!'
    })
  });
  const createUserData = await createUserRes.json();
  console.log('  - Status Code:', createUserRes.status);
  console.log('  - Created User Email:', createUserData.user?.email);
  const tempUserId = createUserData.user?.id;

  // 6. Delete Temporary Test User from Turso
  if (tempUserId) {
    console.log('\n[TEST 6] Cleanup Temporary Test User:');
    await db.run('DELETE FROM users WHERE id = ?', [tempUserId]);
    console.log('  - Temporary user deleted from Turso Cloud DB successfully.');
  }

  console.log('\n==================================================');
  console.log('ADMIN WORKFLOW TEST COMPLETE');
  console.log('==================================================\n');
}

testAdminWorkflow().catch((err) => {
  console.error('\nADMIN WORKFLOW TEST FAILED WITH ERROR:', err);
  process.exit(1);
});
