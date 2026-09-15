import bcrypt from 'bcryptjs';
import { db } from './connection.js';

export async function bootstrapInitialAdmin() {
  try {
    // Ensure all standard system roles exist
    const defaultRoles = [
      { id: 'role_admin', name: 'ADMIN', description: 'Full access, commercial settings, user management, and administration' },
      { id: 'role_sales', name: 'SALES', description: 'Lead generation and sales pipeline workflow access' },
      { id: 'role_estimator', name: 'ESTIMATOR', description: 'Commercial pricing and estimate override calculation access' },
      { id: 'role_surveyor', name: 'SURVEYOR', description: 'After-survey heat loss and design input workflow access' },
      { id: 'role_readonly', name: 'READ_ONLY', description: 'Read-only viewing permissions across system' }
    ];

    for (const r of defaultRoles) {
      const existingRole = await db.get('SELECT id FROM roles WHERE name = ?', [r.name]);
      if (!existingRole) {
        await db.run(
          'INSERT INTO roles (id, name, description) VALUES (?, ?, ?)',
          [r.id, r.name, r.description]
        );
      }
    }

    const adminEmail = (process.env.ADMIN_EMAIL || 'tahseenamal345@gmail.com').toLowerCase().trim();

    // Get ADMIN role ID
    const adminRole = await db.get("SELECT id FROM roles WHERE name = 'ADMIN'");
    const roleId = adminRole?.id || 'role_admin';

    // 1. Deactivate legacy admin accounts (admin@primeenergy.co.uk or any other admin email != adminEmail)
    await db.run(
      'UPDATE users SET active = 0 WHERE LOWER(email) = ? OR (role_id = ? AND LOWER(email) != ?)',
      ['admin@primeenergy.co.uk', roleId, adminEmail]
    );

    // 2. Check if configured admin email exists
    const existingAdmin = await db.get('SELECT id FROM users WHERE LOWER(email) = ?', [adminEmail]);

    if (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim().length > 0) {
      const rawPassword = process.env.ADMIN_PASSWORD.trim();
      const passwordHash = bcrypt.hashSync(rawPassword, 10);

      if (existingAdmin) {
        await db.run(
          'UPDATE users SET password_hash = ?, role_id = ?, active = 1 WHERE id = ?',
          [passwordHash, roleId, existingAdmin.id]
        );
        console.log(`[Admin Bootstrap]: Updated password hash for owner admin user (${adminEmail}) from ADMIN_PASSWORD env.`);
      } else {
        await db.run(
          `INSERT INTO users (id, name, email, role_id, password_hash, active) VALUES (?, ?, ?, ?, ?, 1)`,
          ['user_admin_initial', 'System Admin', adminEmail, roleId, passwordHash]
        );
        console.log(`[Admin Bootstrap]: Created owner admin user (${adminEmail}) from ADMIN_PASSWORD env.`);
      }
    } else {
      if (existingAdmin) {
        await db.run(
          'UPDATE users SET role_id = ?, active = 1 WHERE id = ?',
          [roleId, existingAdmin.id]
        );
        console.log(`[Admin Bootstrap]: Preserved existing password hash for owner admin user (${adminEmail}).`);
      } else {
        const rawPassword = 'PrimePassword2026!';
        const passwordHash = bcrypt.hashSync(rawPassword, 10);
        await db.run(
          `INSERT INTO users (id, name, email, role_id, password_hash, active) VALUES (?, ?, ?, ?, ?, 1)`,
          ['user_admin_initial', 'System Admin', adminEmail, roleId, passwordHash]
        );
        console.log(`[Admin Bootstrap]: Created initial owner admin user (${adminEmail}) with fallback password.`);
      }
    }
  } catch (err: any) {
    console.error('[Admin Bootstrap]: Error checking/creating initial admin:', err?.message || err);
  }
}

