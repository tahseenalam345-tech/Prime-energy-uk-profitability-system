import { db, initDatabase } from './src/db/connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchPageTradePrice(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (!res.ok) {
      return { ok: false, status: res.status, error: `HTTP ${res.status}` };
    }
    const html = await res.text();
    
    // Match tradePrice payload
    const match = html.match(/"tradePrice":\s*\{"valueExVat":\s*([0-9.]+),\s*"valueIncVat":\s*([0-9.]+)/);
    const vatSwitchMatch = html.includes('data-test-id="vat-switch-button"');
    
    if (match) {
      const valueExVat = parseFloat(match[1]);
      const valueIncVat = parseFloat(match[2]);
      const calculatedRate = Math.round(((valueIncVat / valueExVat) - 1) * 100);
      return {
        ok: true,
        valueExVat,
        valueIncVat,
        calculatedRate,
        capturedWording: `"tradePrice":{"valueExVat":${valueExVat},"valueIncVat":${valueIncVat}}`,
        hasVatSwitch: vatSwitchMatch,
        timestamp: new Date().toISOString()
      };
    }

    return {
      ok: false,
      error: 'tradePrice block not found in page HTML',
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    return {
      ok: false,
      error: err.message,
      timestamp: new Date().toISOString()
    };
  }
}

async function verifyAll199Vat() {
  initDatabase();
  const rows = db.prepare('SELECT id, radiator_type, height_mm, length_mm, product_name, sku, source_url, source_price FROM radiator_catalogue').all();
  console.log(`Starting VAT evidence fetch for ${rows.length} radiator products...`);

  const results = {};
  const batchSize = 15;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await Promise.all(batch.map(async (row) => {
      const data = await fetchPageTradePrice(row.source_url);
      results[row.id] = {
        id: row.id,
        sku: row.sku,
        url: row.source_url,
        ...data
      };
    }));
    console.log(`Processed ${Math.min(i + batchSize, rows.length)} / ${rows.length}...`);
  }

  const cachePath = path.resolve(__dirname, 'city_plumbing_vat_evidence_cache.json');
  fs.writeFileSync(cachePath, JSON.stringify(results, null, 2));
  console.log(`Saved VAT evidence cache to ${cachePath}`);

  let successCount = 0;
  let rate20Count = 0;
  for (const k of Object.keys(results)) {
    if (results[k].ok) {
      successCount++;
      if (results[k].calculatedRate === 20) rate20Count++;
    }
  }

  console.log(`\n=== SUMMARY OF EVIDENCE ===`);
  console.log(`Total URLs queried: ${rows.length}`);
  console.log(`Successfully extracted tradePrice: ${successCount}`);
  console.log(`Explicitly confirmed 20% VAT: ${rate20Count}`);
}

verifyAll199Vat().catch(console.error);
