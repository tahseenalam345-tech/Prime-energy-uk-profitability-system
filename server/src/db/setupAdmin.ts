import bcrypt from 'bcryptjs';
import { db, initDatabase } from './connection.js';

async function setupAdmin() {
  await initDatabase();

  const email = (process.env.ADMIN_EMAIL || process.argv[2] || 'admin@primeenergy.co.uk').toLowerCase().trim();
  const rawPassword = process.env.ADMIN_PASSWORD || process.argv[3] || 'PrimePassword2026!';
  const name = process.env.ADMIN_NAME || 'Prime Energy Admin';

  if (!email || !rawPassword) {
    console.error('ERROR: ADMIN_EMAIL and ADMIN_PASSWORD must be provided.');
    process.exit(1);
  }

  console.log(`=== Setting up initial Admin user [${email}] ===`);
  const passwordHash = bcrypt.hashSync(rawPassword, 12);

  // Ensure role_admin exists
  const adminRole = await db.get("SELECT id FROM roles WHERE name = 'ADMIN'");
  let roleId = adminRole?.id || 'role_admin';

  if (!adminRole) {
    await db.run("INSERT INTO roles (id, name, description) VALUES ('role_admin', 'ADMIN', 'Full system access, commercial settings, rules and pricing control')");
  }

  // Check if admin user already exists
  const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);

  if (existingUser) {
    await db.run(
      'UPDATE users SET password_hash = ?, active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [passwordHash, existingUser.id]
    );
    console.log(`✓ Updated existing Admin user [${email}] with new hashed password.`);
  } else {
    const userId = `user_admin_${Date.now()}`;
    await db.run(
      'INSERT INTO users (id, name, email, role_id, password_hash, active) VALUES (?, ?, ?, ?, ?, 1)',
      [userId, name, email, roleId, passwordHash]
    );
    console.log(`✓ Successfully created initial Admin user [${email}] (ID: ${userId}).`);
  }
}

setupAdmin().then(() => process.exit(0)).catch((err) => {
  console.error('❌ Setup Admin failed:', err);
  process.exit(1);
});
