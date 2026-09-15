import { db, initDatabase } from './src/db/connection.js';
import { seedRuleEvidenceRegistry } from './src/db/seedRuleEvidence.js';

initDatabase();
seedRuleEvidenceRegistry();

console.log('--- SYSTEM STATUS VERIFICATION AUDIT ---');

// 1. Audit Rules in DB
const rules = db.prepare('SELECT rule_id, rule_name, category, authority, source_version, verification_status FROM rule_evidence').all() as any[];
console.log(`Total rules in registry: ${rules.length}`);

const statusCounts: Record<string, number> = {};
for (const r of rules) {
  statusCounts[r.verification_status] = (statusCounts[r.verification_status] || 0) + 1;
}
console.log('Status Breakdown:', statusCounts);

// 2. Audit Supplier VAT Normalization
const prices = db.prepare('SELECT count(*) as count, source_vat_basis, normalization_confidence FROM product_prices GROUP BY source_vat_basis, normalization_confidence').all();
console.log('Supplier VAT Normalization Table Records:', prices);

// 3. Confirm Unknown prices are not divided by 1.20
const unknownVat = db.prepare("SELECT * FROM product_prices WHERE source_vat_basis = 'UNKNOWN'").all() as any[];
console.log(`Unknown VAT prices count: ${unknownVat.length}`);
for (const p of unknownVat) {
  console.log(`- Product: ${p.product_id}, Source Price: £${p.source_price}, Normalized: ${p.normalized_ex_vat_price}, Confidence: ${p.normalization_confidence}`);
}

console.log('Verification audit successfully finished.');
