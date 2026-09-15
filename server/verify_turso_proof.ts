import { db } from './src/db/connection.js';

async function runProof() {
  const info = db.getProviderInfo();
  console.log('Provider Info:', JSON.stringify(info));

  const usersCount = await db.get('SELECT COUNT(*) as c FROM users');
  const rolesCount = await db.get('SELECT COUNT(*) as c FROM roles');
  const leadsCount = await db.get('SELECT COUNT(*) as c FROM leads');
  const quotesCount = await db.get('SELECT COUNT(*) as c FROM quotes');
  const productsCount = await db.get('SELECT COUNT(*) as c FROM products');

  console.log('TURSO_PROOFS:', JSON.stringify({
    provider: info.databaseProvider,
    host: info.databaseHost,
    usersCount: usersCount?.c || 0,
    rolesCount: rolesCount?.c || 0,
    leadsCount: leadsCount?.c || 0,
    quotesCount: quotesCount?.c || 0,
    productsCount: productsCount?.c || 0,
  }));
  process.exit(0);
}

runProof().catch(err => {
  console.error('Proof error:', err);
  process.exit(1);
});
