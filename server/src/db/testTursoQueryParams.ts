import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const token = process.env.TURSO_AUTH_TOKEN?.trim() || '';
const host = 'primeenergyuk-tahseenalam345-tech.aws-ap-south-1.turso.io';

console.log('Testing Turso Token Authentication Variants...');

async function runTests() {
  // Test 1: @libsql/client with URL query parameter
  console.log('\n--- Test 1: URL Query Parameter ---');
  try {
    const client = createClient({
      url: `libsql://${host}?authToken=${token}`,
    });
    const res = await client.execute('SELECT 1 as test');
    console.log('✓ TEST 1 SUCCESS! Result:', res.rows);
    return;
  } catch (err: any) {
    console.log('Test 1 failed:', err.message);
  }

  // Test 2: @libsql/client with https URL query parameter
  console.log('\n--- Test 2: HTTPS URL Query Parameter ---');
  try {
    const client = createClient({
      url: `https://${host}?authToken=${token}`,
    });
    const res = await client.execute('SELECT 1 as test');
    console.log('✓ TEST 2 SUCCESS! Result:', res.rows);
    return;
  } catch (err: any) {
    console.log('Test 2 failed:', err.message);
  }

  // Test 3: Raw HTTP fetch with different header names
  console.log('\n--- Test 3: Raw HTTP Header Variations ---');
  const headersToTest = [
    { 'Authorization': `Bearer ${token}` },
    { 'Authorization': token },
    { 'x-turso-auth': token },
    { 'x-auth-token': token },
    { 'Authorization': `Bearer ${token}`, 'x-turso-auth': token }
  ];

  for (let i = 0; i < headersToTest.length; i++) {
    const headers = {
      'Content-Type': 'application/json',
      ...headersToTest[i]
    };
    try {
      const res = await fetch(`https://${host}/v2/pipeline`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          requests: [
            { type: 'execute', stmt: { sql: 'SELECT 1 as result' } },
            { type: 'close' }
          ]
        })
      });
      const text = await res.text();
      console.log(`Header variant ${i + 1} Status: ${res.status} ${res.statusText}`);
      console.log(`Header variant ${i + 1} Body  : ${text}`);
      if (res.status === 200) {
        console.log(`✓ HEADER VARIANT ${i + 1} SUCCESS!`);
        return;
      }
    } catch (err: any) {
      console.log(`Header variant ${i + 1} Error:`, err.message);
    }
  }
}

runTests();
