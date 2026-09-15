import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const originalDbPath = path.resolve(__dirname, '../../prime_energy.db');
const backupDbPath = path.resolve(__dirname, '../../prime_energy_backup_20260914.db');

console.log('=== STEP 1: MANDATORY LOCAL SQLITE BACKUP & AUDIT ===');

if (!fs.existsSync(originalDbPath)) {
  console.error(`ERROR: Original database file not found at ${originalDbPath}`);
  process.exit(1);
}

// 1. Copy file to backup destination
fs.copyFileSync(originalDbPath, backupDbPath);
console.log(`✓ Backup successfully created: ${backupDbPath}`);

// 2. File stats & SHA-256 hash
const stats = fs.statSync(backupDbPath);
const fileBuffer = fs.readFileSync(backupDbPath);
const hashSum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

console.log(`- Backup Filename: prime_energy_backup_20260914.db`);
console.log(`- File Size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB (${stats.size} bytes)`);
console.log(`- SHA-256 Hash: ${hashSum}`);

// 3. SQLite Integrity Check
const backupDb = new Database(backupDbPath);
const integrityResult = backupDb.pragma('integrity_check') as any[];
const quickCheckResult = backupDb.pragma('quick_check') as any[];

console.log(`- PRAGMA integrity_check: ${JSON.stringify(integrityResult)}`);
console.log(`- PRAGMA quick_check: ${JSON.stringify(quickCheckResult)}`);

if (integrityResult[0]?.integrity_check !== 'ok' && integrityResult[0] !== 'ok') {
  console.error('CRITICAL ERROR: Database integrity check failed!');
  process.exit(1);
}

// 4. Extract baseline row counts for all tables
const tables = backupDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as { name: string }[];

console.log('\n=== BASELINE TABLE ROW COUNTS ===');
const counts: Record<string, number> = {};

for (const { name } of tables) {
  const countRes = backupDb.prepare(`SELECT COUNT(*) as count FROM "${name}"`).get() as { count: number };
  counts[name] = countRes.count;
  console.log(`- ${name.padEnd(30)}: ${countRes.count} rows`);
}

const auditReport = {
  timestamp: new Date().toISOString(),
  originalDbPath,
  backupDbPath,
  fileSizeBytes: stats.size,
  fileSizeMB: (stats.size / (1024 * 1024)).toFixed(2),
  sha256: hashSum,
  integrityCheck: integrityResult[0]?.integrity_check || integrityResult[0],
  quickCheck: quickCheckResult[0]?.quick_check || quickCheckResult[0],
  tableCounts: counts
};

fs.writeFileSync(path.resolve(__dirname, '../../backup_audit_summary.json'), JSON.stringify(auditReport, null, 2));
console.log(`\n✓ Baseline audit summary saved to server/backup_audit_summary.json`);

backupDb.close();
