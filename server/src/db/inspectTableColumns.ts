import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backupDbPath = path.resolve(__dirname, '../../prime_energy_backup_20260914.db');
const localDb = new Database(backupDbPath);

console.log('=== INSPECTING ACTUAL TABLE COLUMNS IN LOCAL SQLITE BACKUP ===');

const tables = localDb
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
  .all() as { name: string }[];

const tableSchemaMap: Record<string, { name: string; type: string }[]> = {};

for (const { name } of tables) {
  const cols = localDb.prepare(`PRAGMA table_info("${name}")`).all() as { name: string; type: string }[];
  tableSchemaMap[name] = cols;
  console.log(`Table [${name}]: ${cols.length} columns (${cols.map(c => c.name).join(', ')})`);
}

fs.writeFileSync(
  path.resolve(__dirname, '../../actual_columns.json'),
  JSON.stringify(tableSchemaMap, null, 2)
);

console.log('\n✓ Saved actual column metadata to server/actual_columns.json');
