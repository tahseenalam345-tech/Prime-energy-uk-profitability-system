import dotenv from 'dotenv';
dotenv.config();

import { db } from './src/db/connection.js';

async function inspectUsers() {
  const users = await db.all(`
    SELECT u.id, u.name, u.email, u.active, u.created_at, r.name as role_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    ORDER BY u.created_at ASC
  `);
  console.log('=== LIVE TURSO USERS ===');
  console.table(users);
}

inspectUsers().catch(console.error);
