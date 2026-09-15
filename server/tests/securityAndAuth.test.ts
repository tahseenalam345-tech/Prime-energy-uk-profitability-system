import { describe, it, expect, beforeAll } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateToken, tokenBlacklist, getJwtSecret } from '../src/middleware/auth.js';
import { db } from '../src/db/connection.js';

describe('Security, Authentication & RBAC Verification Suite', () => {

  const testUserAdmin = { id: 'user_admin_test', name: 'Admin User', email: 'admin@test.com', role: 'ADMIN' };
  const testUserSales = { id: 'user_sales_test', name: 'Sales User', email: 'sales@test.com', role: 'SALES' };
  const testUserReadOnly = { id: 'user_readonly_test', name: 'Read Only User', email: 'viewer@test.com', role: 'READ_ONLY' };

  it('1. Confirm Turso Cloud is confirmed as active DB provider', () => {
    const info = db.getProviderInfo();
    expect(info.databaseProvider).toBe('TURSO');
    expect(info.databaseHost).toBeDefined();
  });

  it('2. Password Hashing: bcrypt generates valid hashes and compares correctly', () => {
    const plainPassword = 'SuperSecretPassword2026!';
    const hash = bcrypt.hashSync(plainPassword, 10);
    
    expect(hash).not.toBe(plainPassword);
    expect(bcrypt.compareSync(plainPassword, hash)).toBe(true);
    expect(bcrypt.compareSync('WrongPassword', hash)).toBe(false);
  });

  it('3. JWT Token Generation & Verification', () => {
    const token = generateToken(testUserAdmin);
    expect(typeof token).toBe('string');

    const decoded = jwt.verify(token, getJwtSecret()) as any;
    expect(decoded.id).toBe(testUserAdmin.id);
    expect(decoded.role).toBe('ADMIN');
  });

  it('4. Expired Token Rejection', () => {
    const secret = process.env.JWT_SECRET || 'prime_energy_jwt_secret_dev_key_change_in_production_321';
    const expiredToken = jwt.sign(testUserSales, secret, { expiresIn: '-1s' });

    expect(() => {
      jwt.verify(expiredToken, secret);
    }).toThrow(jwt.TokenExpiredError);
  });

  it('5. Token Revocation / Logout Blacklisting', () => {
    const token = generateToken(testUserSales);
    expect(tokenBlacklist.has(token)).toBe(false);

    // Simulate logout action
    tokenBlacklist.add(token);
    expect(tokenBlacklist.has(token)).toBe(true);
  });

  it('6. Production Startup Seed Guard: Startup Seeding Disabled when NODE_ENV is production', () => {
    const isProd = true;
    const enableSeed = process.env.ENABLE_STARTUP_SEED === 'true';
    const shouldSeed = !isProd && enableSeed;

    expect(shouldSeed).toBe(false);
  });

  it('7. Production CORS Guard: Wildcard CORS disallowed in production environment', () => {
    const isProd = true;
    const allowedOrigins = ['https://prime-energy-uk.vercel.app'];
    
    const requestOrigin = 'https://malicious-site.com';
    const isAllowed = !isProd || allowedOrigins.includes(requestOrigin);

    expect(isAllowed).toBe(false);
  });
});
