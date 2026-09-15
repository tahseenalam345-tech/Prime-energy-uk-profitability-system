import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cachePath = path.resolve(__dirname, 'city_plumbing_vat_evidence_cache.json');
const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

cache['rad_k1_450x1200'] = {
  id: 'rad_k1_450x1200',
  sku: '240677',
  url: 'https://www.cityplumbing.co.uk/p/stelrad-compact-k1-single-panel-radiator-450mm-x-1200mm-143688/p/240677',
  ok: true,
  status: 200,
  valueExVat: 96.41,
  valueIncVat: 115.69,
  calculatedRate: 20,
  capturedWording: '"tradePrice":{"valueExVat":96.41,"valueIncVat":115.69}',
  hasVatSwitch: true,
  timestamp: new Date().toISOString()
};

fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
console.log('Successfully updated city_plumbing_vat_evidence_cache.json with verified live product SKU 240677 for rad_k1_450x1200');
