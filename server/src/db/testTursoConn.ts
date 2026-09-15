import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

const token = process.env.TURSO_AUTH_TOKEN?.trim() || '';

const urls = [
  'libsql://primeenergyuk-tahseenalam345-tech.turso.io',
  'libsql://primeenergyuk-tahseenalam345-tech.aws-ap-south-1.turso.io',
  'libsql://primeenergyuk-tahseenalam345.turso.io',
  'libsql://primeenergyuk-tahseenalam345-tech.aws-us-east-1.turso.io'
];

async function testAll() {
  for (const url of urls) {
    try {
      console.log(`Testing ${url}...`);
      const client = createClient({ url, authToken: token });
      const res = await client.execute('SELECT 1 as val');
      console.log(`SUCCESS on ${url}:`, res.rows);
    } catch (e: any) {
      console.log(`FAILED on ${url}:`, e.message);
    }
  }
}

testAll();
