import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../../prime_energy.db');

console.log('Testing @libsql/client on local file:', `file:${dbPath}`);

const client = createClient({
  url: `file:${dbPath}`,
});

async function run() {
  const res = await client.execute('SELECT COUNT(*) as count FROM products');
  console.log('Product count via @libsql/client:', res.rows[0].count);
}

run();
