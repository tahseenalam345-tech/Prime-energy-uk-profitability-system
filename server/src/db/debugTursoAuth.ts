import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@libsql/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../../../.env');
console.log('=== TURSO AUTH DEBUG DIAGNOSTIC ===');
console.log(`- ENV File Path: ${envPath}`);

// Read raw .env file directly from disk to inspect formatting (without printing token)
const envRaw = fs.readFileSync(envPath, 'utf8');
const lines = envRaw.split('\n');

let rawTokenLine = '';
let rawUrlLine = '';

for (const l of lines) {
  if (l.trim().startsWith('TURSO_AUTH_TOKEN=')) {
    rawTokenLine = l.trim().substring('TURSO_AUTH_TOKEN='.length);
  }
  if (l.trim().startsWith('DATABASE_URL=')) {
    rawUrlLine = l.trim().substring('DATABASE_URL='.length);
  }
}

// Check quotes/formatting in raw file
const hasQuotesInRawToken = rawTokenLine.startsWith('"') || rawTokenLine.startsWith("'");
const hasWhitespaceInRawToken = /\s/.test(rawTokenLine);
const rawTokenLength = rawTokenLine.length;

// Now load dotenv
dotenv.config({ path: envPath, override: true });

const loadedUrl = process.env.DATABASE_URL || '';
const loadedToken = process.env.TURSO_AUTH_TOKEN || '';

const parsedUrl = new URL(loadedUrl.startsWith('libsql://') ? loadedUrl.replace('libsql://', 'https://') : loadedUrl);
const hostname = parsedUrl.hostname;
const dbName = hostname.split('.')[0];
const orgName = dbName.includes('-') ? dbName.split('-').slice(1).join('-') : 'unknown';

// Safely decode JWT payload without exposing secrets
let jwtHeader: any = null;
let jwtPayload: any = null;
try {
  const parts = loadedToken.trim().split('.');
  if (parts.length === 3) {
    jwtHeader = JSON.parse(Buffer.from(parts[0], 'base64').toString('utf8'));
    jwtPayload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
  }
} catch (e) {
  // ignore
}

console.log('\n--- 1. NON-SECRET CONFIGURATION SUMMARY ---');
console.log(`- DATABASE_URL Hostname    : ${hostname}`);
console.log(`- Database Name            : ${dbName.split('-')[0]}`);
console.log(`- Turso Org / Region Suffix: ${orgName}`);
console.log(`- Environment File Loaded  : ${envPath}`);
console.log(`- Configured Env Var Names : ${Object.keys(process.env).filter(k => k.includes('TURSO') || k.includes('DATABASE')).join(', ')}`);
console.log(`- Token Variable Being Read : TURSO_AUTH_TOKEN`);
console.log(`- Token Loaded Length      : ${loadedToken.length} characters`);
console.log(`- Raw Token Has Quotes     : ${hasQuotesInRawToken}`);
console.log(`- Raw Token Has Whitespace : ${hasWhitespaceInRawToken}`);
console.log(`- JWT Header Algorithm     : ${jwtHeader?.alg || 'unknown'}`);
console.log(`- JWT Token Scope (a)      : ${jwtPayload?.a || 'unknown'}`);
console.log(`- JWT Resource ID (rid)    : ${jwtPayload?.rid || 'unknown'}`);
console.log(`- JWT Key ID (kid)         : ${jwtPayload?.kid || 'unknown'}`);

console.log('\n--- 2. READ-ONLY AUTHENTICATION TEST (SELECT 1) ---');

async function testAuth() {
  let libsqlSuccess = false;
  let httpStatus = 0;
  let httpResponseBody = '';

  // Test 1: @libsql/client
  try {
    const client = createClient({
      url: loadedUrl,
      authToken: loadedToken.trim()
    });
    const res = await client.execute('SELECT 1 as auth_test');
    if (res.rows.length > 0 && res.rows[0].auth_test === 1) {
      libsqlSuccess = true;
    }
  } catch (err: any) {
    // caught below
  }

  // Test 2: Direct HTTP fetch for detailed diagnostics
  try {
    const fetchUrl = `https://${hostname}/v2/pipeline`;
    const res = await fetch(fetchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${loadedToken.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          { type: 'execute', stmt: { sql: 'SELECT 1 as auth_test' } },
          { type: 'close' }
        ]
      })
    });
    httpStatus = res.status;
    httpResponseBody = await res.text();
  } catch (err: any) {
    httpResponseBody = err.message;
  }

  console.log(`- HTTP Status Code: ${httpStatus}`);
  console.log(`- Turso Response  : ${httpResponseBody}`);

  if (libsqlSuccess || httpStatus === 200) {
    console.log('\n==================================================');
    console.log('AUTHENTICATION PASS');
    console.log('==================================================');
  } else {
    console.log('\n==================================================');
    console.log('AUTHENTICATION FAIL DIAGNOSTIC ANALYSIS');
    console.log('==================================================');
    console.log(`- Exact DATABASE_URL Hostname: ${hostname}`);
    console.log(`- Environment Variable Source: ${envPath} -> process.env.TURSO_AUTH_TOKEN`);
    console.log(`- Token Loaded Status       : Token successfully loaded (${loadedToken.length} chars)`);
    console.log(`- HTTP Status               : ${httpStatus}`);
    console.log(`- Turso Server Message       : ${httpResponseBody}`);
    console.log(`\n- ROOT CAUSE DIAGNOSIS:`);
    if (httpStatus === 401 && httpResponseBody.includes("can't be decoded with any of the existing keys")) {
      console.log(`  The database hostname (${hostname}) is valid and reachable over HTTPS.`);
      console.log(`  However, Turso Cloud's sqld gateway rejects the token signature because the key ID (${jwtPayload?.kid})`);
      console.log(`  is not registered in the active public key set for database instance ${jwtPayload?.rid}.`);
      console.log(`  This indicates a TOKEN TYPE / KEY ROTATION MISMATCH (e.g. an Org or User API token was generated instead of a Database token via 'turso db tokens create').`);
    } else if (httpStatus === 404) {
      console.log(`  URL MISMATCH: Hostname ${hostname} does not exist on Turso Cloud.`);
    } else {
      console.log(`  ENVIRONMENT / CONFIGURATION ERROR: ${httpResponseBody}`);
    }
  }
}

testAuth();
