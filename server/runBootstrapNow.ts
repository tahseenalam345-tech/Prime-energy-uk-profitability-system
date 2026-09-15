import dotenv from 'dotenv';
dotenv.config();

import { bootstrapInitialAdmin } from './src/db/bootstrapAdmin.js';
import { db } from './src/db/connection.js';

async function runNow() {
  console.log('=== RUNNING DETERMINISTIC ADMIN BOOTSTRAP ===');
  await bootstrapInitialAdmin();

  console.log('\n=== USERS IN TURSO DATABASE AFTER BOOTSTRAP ===');
  const users = await db.all(`
    SELECT u.id, u.name, u.email, u.active, u.created_at, r.name as role_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    ORDER BY u.created_at ASC
  `);
  console.table(users);
}

runNow().catch(console.error);
