import { createClient, Client } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const dbUrl = process.env.DATABASE_URL?.trim() || '';
const tursoToken = process.env.TURSO_AUTH_TOKEN?.trim() || '';

const isTurso = dbUrl.startsWith('libsql:') || dbUrl.startsWith('https:');

export const rawClient: Client = isTurso
  ? createClient({
      url: dbUrl,
      authToken: tursoToken,
    })
  : createClient({
      url: dbUrl.startsWith('file:')
        ? dbUrl
        : `file:${process.env.DB_PATH || path.resolve(__dirname, '../../prime_energy.db')}`,
    });

function sanitizeArgs(args: any[]): any[] {
  return args.map(v => (v === undefined ? null : v));
}

// Unified Async Database Interface for Turso Cloud & Local SQLite Fallback
export const db = {
  async execute(sql: string, args: any[] = []) {
    return await rawClient.execute({ sql, args: sanitizeArgs(args) });
  },

  async get<T = any>(sql: string, args: any[] = []): Promise<T | undefined> {
    const res = await rawClient.execute({ sql, args: sanitizeArgs(args) });
    return (res.rows[0] as unknown as T) || undefined;
  },

  async all<T = any>(sql: string, args: any[] = []): Promise<T[]> {
    const res = await rawClient.execute({ sql, args: sanitizeArgs(args) });
    return res.rows as unknown as T[];
  },

  async run(sql: string, args: any[] = []) {
    const res = await rawClient.execute({ sql, args: sanitizeArgs(args) });
    return {
      rowsAffected: res.rowsAffected,
      lastInsertRowid: res.lastInsertRowid,
    };
  },

  async batch(statements: Array<{ sql: string; args?: any[] }>, mode: 'write' | 'read' = 'write') {
    const sanitizedStmts = statements.map(s => ({
      sql: s.sql,
      args: s.args ? sanitizeArgs(s.args) : [],
    }));
    return await rawClient.batch(sanitizedStmts, mode);
  },

  async exec(sqlScript: string) {
    const stmts = sqlScript
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of stmts) {
      try {
        await rawClient.execute(stmt);
      } catch (err: any) {
        // Ignore table/index exists errors during initial setup
      }
    }
  },

  getProviderInfo() {
    let hostname = 'local-file';
    try {
      if (isTurso) {
        const u = new URL(dbUrl.replace(/^libsql:\/\//, 'https://'));
        hostname = u.hostname;
      }
    } catch (e) {
      hostname = 'turso-cloud';
    }

    return {
      databaseProvider: isTurso ? 'TURSO' : 'LOCAL_SQLITE',
      databaseHost: hostname,
    };
  }
};

export async function initDatabase() {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await db.exec(schema);
  }
}

export default db;
