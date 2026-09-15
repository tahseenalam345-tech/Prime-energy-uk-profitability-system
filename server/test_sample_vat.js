import { db } from './src/db/connection.js';

async function testSampleUrls() {
  const rows = db.prepare('SELECT id, product_name, sku, source_url FROM radiator_catalogue LIMIT 5').all();
  
  for (const r of rows) {
    console.log(`\nTesting: ${r.id} - ${r.sku} - ${r.source_url}`);
    try {
      const res = await fetch(r.source_url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      const html = await res.text();
      const match = html.match(/"tradePrice":\s*\{"valueExVat":\s*([0-9.]+),\s*"valueIncVat":\s*([0-9.]+)/);
      if (match) {
        const ex = parseFloat(match[1]);
        const inc = parseFloat(match[2]);
        const ratio = inc / ex;
        console.log(`  -> Found tradePrice! Ex VAT: £${ex}, Inc VAT: £${inc}, Ratio: ${ratio.toFixed(4)} (20% VAT: ${(ratio - 1.2).toFixed(6)})`);
      } else {
        console.log(`  -> No tradePrice JSON regex match. HTML length: ${html.length}`);
      }
    } catch (e) {
      console.error(`  -> Fetch error: ${e.message}`);
    }
  }
}

testSampleUrls().catch(console.error);
