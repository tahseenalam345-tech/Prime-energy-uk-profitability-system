import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const token = process.env.TURSO_AUTH_TOKEN?.trim();
const url = 'https://primeenergyuk-tahseenalam345-tech.aws-ap-south-1.turso.io/v2/pipeline';

async function testHttp() {
  console.log('Fetching:', url);
  console.log('Auth Token:', token?.substring(0, 30) + '...');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        { type: 'execute', stmt: { sql: 'SELECT 1' } },
        { type: 'close' }
      ]
    })
  });

  console.log('HTTP Status:', res.status, res.statusText);
  const text = await res.text();
  console.log('HTTP Response Body:', text);
}

testHttp();
