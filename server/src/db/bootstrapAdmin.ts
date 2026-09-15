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
    
    // Check if initial admin user already exists
    const existingAdmin = await db.get('SELECT id, email FROM users WHERE email = ?', [adminEmail]);
    if (existingAdmin) {
      console.log(`[Admin Bootstrap]: Initial admin user (${adminEmail}) already exists. Preserving account.`);
      return;
    }

    // Get ADMIN role ID
    const adminRole = await db.get("SELECT id FROM roles WHERE name = 'ADMIN'");
    const roleId = adminRole?.id || 'role_admin';

    // Password from environment variable (ADMIN_PASSWORD) or secure bootstrap default
    const rawPassword = process.env.ADMIN_PASSWORD || 'PrimePassword2026!';
    const passwordHash = bcrypt.hashSync(rawPassword, 10);

    await db.run(
      `INSERT INTO users (id, name, email, role_id, password_hash, active) VALUES (?, ?, ?, ?, ?, ?)`,
      ['user_admin_initial', 'System Admin', adminEmail, roleId, passwordHash, 1]
    );

    console.log(`[Admin Bootstrap]: Initial admin user (${adminEmail}) created successfully.`);
  } catch (err: any) {
    console.error('[Admin Bootstrap]: Error checking/creating initial admin:', err?.message || err);
  }
}

