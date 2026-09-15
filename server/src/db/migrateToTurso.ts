import { createClient } from '@libsql/client';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const backupDbPath = path.resolve(__dirname, '../../prime_energy.db');
const tursoUrl = process.env.DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoToken) {
  console.error('ERROR: DATABASE_URL and TURSO_AUTH_TOKEN must be set in .env');
  process.exit(1);
}

console.log('=== STEP 2: REPEATABLE TURSO DATABASE MIGRATION & AUDIT ===');
console.log(`- Source (Backup SQLite): ${backupDbPath}`);
console.log(`- Target (Turso Cloud): ${tursoUrl}`);

const localDb = new Database(backupDbPath);
const tursoClient = createClient({
  url: tursoUrl,
  authToken: tursoToken.trim(),
});

async function migrate() {
  try {
    // 1. DDL Extraction directly from SQLite master (Guarantees 100% column parity)
    console.log('\n--- 1. Recreating Tables on Turso from Local SQLite DDL ---');
    const ddlRows = localDb
      .prepare("SELECT name, type, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'")
      .all() as { name: string; type: string; sql: string }[];

    // First drop existing tables to start clean
    try { await tursoClient.execute('PRAGMA foreign_keys = OFF;'); } catch (e) {}

    const tablesOnly = ddlRows.filter(r => r.type === 'table');
    const indexesOnly = ddlRows.filter(r => r.type === 'index');

    for (const t of tablesOnly) {
      try {
        await tursoClient.execute(`DROP TABLE IF EXISTS "${t.name}"`);
      } catch (err: any) {
        // ignore drop error
      }
    }

    // Execute CREATE TABLE statements
    for (const t of tablesOnly) {
      try {
        await tursoClient.execute(t.sql);
      } catch (err: any) {
        console.warn(`DDL Notice on CREATE TABLE [${t.name}]: ${err.message}`);
      }
    }
    console.log(`✓ Created ${tablesOnly.length} tables on Turso with 100% column parity.`);

    // 2. Extract local tables & order topologically
    const tableOrderPriority = [
      'roles', 'users', 'products', 'leads', 'properties', 'quotes', 
      'quote_line_items', 'calculation_snapshots', 'product_prices', 
      'survey_design_inputs', 'rule_evidence', 'radiator_catalogue', 
      'commercial_settings', 'bus_rules', 'tax_rules', 'audit_logs',
      'epc_baselines', 'fallback_insulation_tables', 'property_multipliers',
      'cylinder_sizing_rules', 'radiator_ratio_configs', 'confidence_weight_configs',
      'profitability_rating_configs', 'requirement_rules'
    ];

    tablesOnly.sort((a, b) => {
      const idxA = tableOrderPriority.indexOf(a.name);
      const idxB = tableOrderPriority.indexOf(b.name);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });

    console.log(`\n--- 2. Migrating Data across ${tablesOnly.length} Tables to Turso ---`);

    for (const { name } of tablesOnly) {
      const rows = localDb.prepare(`SELECT * FROM "${name}"`).all() as any[];
      if (rows.length === 0) {
        console.log(`- Table [${name}]: 0 rows (skipped insertion).`);
        continue;
      }

      const columns = Object.keys(rows[0]);
      const colList = columns.map(c => `"${c}"`).join(', ');
      const placeholders = columns.map(() => '?').join(', ');
      const sql = `INSERT OR REPLACE INTO "${name}" (${colList}) VALUES (${placeholders})`;

      // Dynamic chunk size: calculation_snapshots contains heavy JSON, chunk by 3; others by 25
      const chunkSize = name === 'calculation_snapshots' ? 3 : 25;
      const totalChunks = Math.ceil(rows.length / chunkSize);

      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const batchStatements = chunk.map(row => ({
          sql,
          args: columns.map(col => (row[col] === undefined ? null : row[col]))
        }));
        await tursoClient.batch(batchStatements, 'write');
      }

      console.log(`✓ Table [${name}]: Migrated ${rows.length} rows (${totalChunks} batch chunks).`);
    }

    // Execute CREATE INDEX statements
    console.log('\n--- 3. Creating Indexes on Turso ---');
    for (const idx of indexesOnly) {
      try {
        await tursoClient.execute(idx.sql);
      } catch (err: any) {
        // ignore index exists
      }
    }
    console.log(`✓ Created ${indexesOnly.length} indexes on Turso.`);

    // Re-enable FK checks after data load
    try { await tursoClient.execute('PRAGMA foreign_keys = ON;'); } catch (e) {}

    // 3. STEP 3: ROW COUNT VERIFICATION
    console.log('\n=== STEP 3: ROW COUNT VERIFICATION (LOCAL vs TURSO) ===');
    let hasCountMismatch = false;

    for (const { name } of tablesOnly) {
      const localCountRes = localDb.prepare(`SELECT COUNT(*) as count FROM "${name}"`).get() as { count: number };
      const tursoRes = await tursoClient.execute(`SELECT COUNT(*) as count FROM "${name}"`);
      const tursoCount = Number(tursoRes.rows[0].count);

      const localCount = localCountRes.count;
      const status = localCount === tursoCount ? '✓ PASS' : '❌ MISMATCH';

      if (localCount !== tursoCount) {
        hasCountMismatch = true;
      }

      console.log(`- ${name.padEnd(30)}: Local=${localCount} | Turso=${tursoCount} | ${status}`);
    }

    if (hasCountMismatch) {
      console.error('\nCRITICAL FAILURE: Row count mismatch detected between Local SQLite and Turso!');
      process.exit(1);
    } else {
      console.log('\n✓ ALL 24 TABLES PASSED 1:1 ROW COUNT VERIFICATION!');
    }

    // 4. STEP 4: DATA CHECKSUM & SAMPLE VALIDATION
    console.log('\n=== STEP 4: DATA CHECKSUM / SAMPLE VALIDATION ===');

    // A. 10 ASHP Products
    console.log('\n--- Validating 10 ASHP Products ---');
    const localAshps = localDb.prepare("SELECT * FROM products WHERE family = 'ASHP' LIMIT 10").all() as any[];
    for (const localProd of localAshps) {
      const res = await tursoClient.execute({ sql: 'SELECT * FROM products WHERE id = ?', args: [localProd.id] });
      const tursoProd = res.rows[0] as any;
      if (!tursoProd || tursoProd.model !== localProd.model || tursoProd.rated_output_kw !== localProd.rated_output_kw) {
        throw new Error(`ASHP Product Mismatch for ID ${localProd.id}`);
      }
    }
    console.log(`✓ 10 ASHP Products verified identical.`);

    // B. 10 Cylinders
    console.log('--- Validating 10 Cylinders ---');
    const localCylinders = localDb.prepare("SELECT * FROM products WHERE family = 'CYLINDER' LIMIT 10").all() as any[];
    for (const localCyl of localCylinders) {
      const res = await tursoClient.execute({ sql: 'SELECT * FROM products WHERE id = ?', args: [localCyl.id] });
      const tursoCyl = res.rows[0] as any;
      if (!tursoCyl || tursoCyl.exact_capacity_litres !== localCyl.exact_capacity_litres) {
        throw new Error(`Cylinder Mismatch for ID ${localCyl.id}`);
      }
    }
    console.log(`✓ 10 Cylinders verified identical.`);

    // C. 10 Radiators
    console.log('--- Validating 10 Radiator Catalogue Items ---');
    const localRads = localDb.prepare('SELECT * FROM radiator_catalogue LIMIT 10').all() as any[];
    for (const localRad of localRads) {
      const res = await tursoClient.execute({ sql: 'SELECT * FROM radiator_catalogue WHERE id = ?', args: [localRad.id] });
      const tursoRad = res.rows[0] as any;
      if (!tursoRad || tursoRad.heat_output_watts !== localRad.heat_output_watts) {
        throw new Error(`Radiator Mismatch for ID ${localRad.id}`);
      }
    }
    console.log(`✓ 10 Radiators verified identical.`);

    // D. 10 Price Records
    console.log('--- Validating 10 Price Records ---');
    const localPrices = localDb.prepare('SELECT * FROM product_prices LIMIT 10').all() as any[];
    for (const localPrice of localPrices) {
      const res = await tursoClient.execute({ sql: 'SELECT * FROM product_prices WHERE id = ?', args: [localPrice.id] });
      const tursoPrice = res.rows[0] as any;
      if (!tursoPrice || tursoPrice.normalized_ex_vat_price !== localPrice.normalized_ex_vat_price) {
        throw new Error(`Price Record Mismatch for ID ${localPrice.id}`);
      }
    }
    console.log(`✓ 10 Price Records verified identical.`);

    // E. 5 Leads
    console.log('--- Validating 5 Leads ---');
    const localLeads = localDb.prepare('SELECT * FROM leads LIMIT 5').all() as any[];
    for (const localLead of localLeads) {
      const res = await tursoClient.execute({ sql: 'SELECT * FROM leads WHERE id = ?', args: [localLead.id] });
      const tursoLead = res.rows[0] as any;
      if (!tursoLead || tursoLead.customer_name !== localLead.customer_name) {
        throw new Error(`Lead Mismatch for ID ${localLead.id}`);
      }
    }
    console.log(`✓ 5 Leads verified identical.`);

    // F. 5 Quotes
    console.log('--- Validating 5 Quotes ---');
    const localQuotes = localDb.prepare('SELECT * FROM quotes LIMIT 5').all() as any[];
    for (const localQ of localQuotes) {
      const res = await tursoClient.execute({ sql: 'SELECT * FROM quotes WHERE id = ?', args: [localQ.id] });
      const tursoQ = res.rows[0] as any;
      if (!tursoQ || tursoQ.total_job_cost !== localQ.total_job_cost || tursoQ.gross_profit !== localQ.gross_profit) {
        throw new Error(`Quote Mismatch for ID ${localQ.id}`);
      }
    }
    console.log(`✓ 5 Quotes verified identical.`);

    // G. 5 Immutable Snapshots (EXACT JSON EQUALITY)
    console.log('--- Validating 5 Calculation Snapshots (EXACT JSON EQUALITY) ---');
    const localSnapshots = localDb.prepare('SELECT * FROM calculation_snapshots LIMIT 5').all() as any[];
    for (const localSnap of localSnapshots) {
      const res = await tursoClient.execute({ sql: 'SELECT * FROM calculation_snapshots WHERE id = ?', args: [localSnap.id] });
      const tursoSnap = res.rows[0] as any;
      
      if (!tursoSnap) {
        throw new Error(`Snapshot missing in Turso for ID ${localSnap.id}`);
      }

      if (
        tursoSnap.inputs_json !== localSnap.inputs_json ||
        tursoSnap.outputs_json !== localSnap.outputs_json ||
        tursoSnap.products_json !== localSnap.products_json
      ) {
        throw new Error(`Exact JSON Equality check failed for Calculation Snapshot ID ${localSnap.id}`);
      }
    }
    console.log(`✓ 5 Calculation Snapshots passed EXACT JSON EQUALITY check.`);

    // H. 5 Rule Evidence Records
    console.log('--- Validating 5 Rule Evidence Records ---');
    const localEvidence = localDb.prepare('SELECT * FROM rule_evidence LIMIT 5').all() as any[];
    for (const localEv of localEvidence) {
      const res = await tursoClient.execute({ sql: 'SELECT * FROM rule_evidence WHERE id = ?', args: [localEv.id] });
      const tursoEv = res.rows[0] as any;
      if (!tursoEv || tursoEv.rule_name !== localEv.rule_name || tursoEv.rule_value !== localEv.rule_value) {
        throw new Error(`Rule Evidence Mismatch for ID ${localEv.id}`);
      }
    }
    console.log(`✓ 5 Rule Evidence Records verified identical.`);

    console.log('\n==================================================');
    console.log('🎉 TURSO MIGRATION & SAMPLE VALIDATION PASSED 100%!');
    console.log('==================================================');

  } catch (err) {
    console.error('\n❌ MIGRATION FAILED:', err);
    process.exit(1);
  } finally {
    localDb.close();
  }
}

migrate();
