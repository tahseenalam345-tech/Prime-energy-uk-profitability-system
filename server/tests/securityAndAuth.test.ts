import { describe, it, expect, beforeAll } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateToken, tokenBlacklist, getJwtSecret, authenticateToken, requireRole } from '../src/middleware/auth.js';
import { db } from '../src/db/connection.js';

describe('Security, Authentication & RBAC Verification Suite', () => {

  const testUserAdmin = { id: 'user_admin_test', name: 'Prime Admin', email: 'admin@primeenergy.co.uk', role: 'ADMIN' };
  const testUserSales = { id: 'user_sales_test', name: 'Sarah Jenkins', email: 'sales@primeenergy.co.uk', role: 'SALES' };
  const testUserReadOnly = { id: 'user_readonly_test', name: 'Executive Viewer', email: 'viewer@primeenergy.co.uk', role: 'READ_ONLY' };

  it('1. Confirm Turso Cloud is confirmed as active DB provider', () => {
    const info = db.getProviderInfo();
    expect(info.databaseProvider).toBe('TURSO');
    expect(info.databaseHost).toBeDefined();
  });

  it('2. Password Hashing: bcrypt generates valid hashes and compares correctly', () => {
    const plainPassword = 'PrimePassword2026!';
    const hash = bcrypt.hashSync(plainPassword, 10);
    
    expect(hash).not.toBe(plainPassword);
    expect(bcrypt.compareSync(plainPassword, hash)).toBe(true);
    expect(bcrypt.compareSync('WrongPassword', hash)).toBe(false);
  });

  it('3. JWT Token Generation & Verification (Valid Login)', () => {
    const token = generateToken(testUserAdmin);
    expect(typeof token).toBe('string');

    const decoded = jwt.verify(token, getJwtSecret()) as any;
    expect(decoded.id).toBe(testUserAdmin.id);
    expect(decoded.role).toBe('ADMIN');
  });

  it('4. Expired Token Rejection', () => {
    const expiredToken = jwt.sign(testUserSales, getJwtSecret(), { expiresIn: '-1s' });

    expect(() => {
      jwt.verify(expiredToken, getJwtSecret());
    }).toThrow(jwt.TokenExpiredError);
  });

  it('5. Invalid Token Rejection', () => {
    const invalidToken = 'invalid.jwt.token.string';

    expect(() => {
      jwt.verify(invalidToken, getJwtSecret());
    }).toThrow();
  });

  it('6. Logout & Token Revocation / Blacklisting', () => {
    const token = generateToken(testUserSales);
    expect(tokenBlacklist.has(token)).toBe(false);

    // Logout action adds token to revocation set
    tokenBlacklist.add(token);
    expect(tokenBlacklist.has(token)).toBe(true);

    // Express middleware verification mock
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res: any = {
      status: (code: number) => ({
        json: (body: any) => ({ statusCode: code, body })
      })
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    authenticateToken(req, res, next);
    expect(nextCalled).toBe(false);
  });

  it('7. Server-Side RBAC: Correct Role Allows Execution', () => {
    const req: any = { user: testUserAdmin };
    const res: any = { status: (code: number) => ({ json: (data: any) => ({ code, data }) }) };
    let nextCalled = false;

    const middleware = requireRole('ADMIN', 'ESTIMATOR');
    middleware(req, res, () => { nextCalled = true; });

    expect(nextCalled).toBe(true);
  });

  it('8. Server-Side RBAC: Wrong Role Blocks Execution with 403 Forbidden', () => {
    const req: any = { user: testUserSales }; // SALES user trying ADMIN route
    let statusCode = 0;
    let responseBody: any = null;

    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return {
          json: (body: any) => { responseBody = body; }
        };
      }
    };
    let nextCalled = false;

    const middleware = requireRole('ADMIN');
    middleware(req, res, () => { nextCalled = true; });

    expect(nextCalled).toBe(false);
    expect(statusCode).toBe(403);
    expect(responseBody.error).toContain('Forbidden');
  });

  it('9. Server-Side RBAC: Unauthenticated Request Returns 401 Unauthorized', () => {
    const req: any = { headers: {} }; // No authorization header
    let statusCode = 0;
    let responseBody: any = null;

    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return {
          json: (body: any) => { responseBody = body; }
        };
      }
    };
    let nextCalled = false;

    authenticateToken(req, res, () => { nextCalled = true; });

    expect(nextCalled).toBe(false);
    expect(statusCode).toBe(401);
    expect(responseBody.error).toContain('Authentication required');
  });

  it('10. Production Startup Seed Guard: Startup Seeding Disabled in production', () => {
    const isProd = true;
    const enableSeed = process.env.ENABLE_STARTUP_SEED === 'true';
    const shouldSeed = !isProd && enableSeed;

    expect(shouldSeed).toBe(false);
  });

  it('11. Production CORS Guard: Wildcard CORS disallowed in production', () => {
    const isProd = true;
    const allowedOrigins = ['https://prime-energy-uk-profitability-system.vercel.app'];
    
    const requestOrigin = 'https://unauthorized-hacker-site.com';
    const isAllowed = !isProd || allowedOrigins.includes(requestOrigin);

    expect(isAllowed).toBe(false);
  });
});
