import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const token = process.env.TURSO_AUTH_TOKEN?.trim();

const hosts = [
  'primeenergyuk-tahseenalam345-tech.aws-ap-south-1.turso.io',
  'primeenergyuk-tahseenalam345-tech.turso.io',
  'primeenergyuk.tahseenalam345-tech.turso.io',
  'primeenergyuk.turso.io',
  'primeenergyuk-tahseenalam345.turso.io',
];

async function testHosts() {
  for (const host of hosts) {
    const url = `https://${host}/v2/pipeline`;
    console.log(`\nTesting host: ${host}`);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            { type: 'execute', stmt: { sql: 'SELECT 1 as result' } },
            { type: 'close' }
          ]
        })
      });

      console.log(`Response Status for ${host}:`, res.status, res.statusText);
      const text = await res.text();
      console.log(`Response Body for ${host}:`, text);
      if (res.status === 200) {
        console.log(`\n🎉 WORKING HOSTNAME FOUND: ${host}`);
        return;
      }
    } catch (err: any) {
      console.error(`Fetch error for ${host}:`, err.message);
    }
  }
}

testHosts();
