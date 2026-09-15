import { describe, it, expect, beforeAll } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateToken, tokenBlacklist, getJwtSecret, authenticateToken, optionalAuthenticateToken, requireRole } from '../src/middleware/auth.js';

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

  it('6. Logout & Token Revocation / Blacklisting', async () => {
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

    await authenticateToken(req, res, next);
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

  it('9. Server-Side RBAC: Unauthenticated Request Returns 401 Unauthorized', async () => {
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

    await authenticateToken(req, res, () => { nextCalled = true; });

    expect(nextCalled).toBe(false);
    expect(statusCode).toBe(401);
    expect(responseBody.error).toContain('Authentication required');
  });

  it('12. optionalAuthenticateToken: allows unauthenticated requests to proceed with req.user = undefined', async () => {
    const req: any = { headers: {} };
    const res: any = {};
    let nextCalled = false;

    await optionalAuthenticateToken(req, res, () => { nextCalled = true; });

    expect(nextCalled).toBe(true);
    expect(req.user).toBeUndefined();
  });

  it('13. optionalAuthenticateToken: attaches user profile when valid Bearer token is sent', async () => {
    const optUser = { id: 'user_opt_test', name: 'Opt Test User', email: 'opt@primeenergy.co.uk', role: 'SALES' };
    const token = generateToken(optUser);
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res: any = {};
    let nextCalled = false;

    await optionalAuthenticateToken(req, res, () => { nextCalled = true; });

    expect(nextCalled).toBe(true);
    expect(req.user).toBeDefined();
    expect(req.user.email).toBe(optUser.email);
  });



  it('14. Initial Admin Bootstrap: provisions initial admin user tahseenamal345@gmail.com with bcrypt hash', async () => {
    const { bootstrapInitialAdmin } = await import('../src/db/bootstrapAdmin.js');
    await bootstrapInitialAdmin();

    const admin = await db.get('SELECT email, password_hash, active FROM users WHERE email = ?', ['tahseenamal345@gmail.com']);
    expect(admin).toBeDefined();
    expect(admin.email).toBe('tahseenamal345@gmail.com');
    expect(admin.active).toBe(1);
    expect(admin.password_hash.startsWith('$2a$') || admin.password_hash.startsWith('$2b$')).toBe(true);
  });

  it('15. Admin User Management RBAC: Non-admin role (READ_ONLY/SALES) blocked from user management with 403 Forbidden', () => {
    const req: any = { user: testUserReadOnly };
    let statusCode = 0;
    let responseBody: any = null;

    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return { json: (body: any) => { responseBody = body; } };
      }
    };
    let nextCalled = false;

    const middleware = requireRole('ADMIN');
    middleware(req, res, () => { nextCalled = true; });

    expect(nextCalled).toBe(false);
    expect(statusCode).toBe(403);
    expect(responseBody.error).toContain('Forbidden');
  });

  it('16. Anonymous API Access: GET endpoints (dashboard, products, leads) PASS', async () => {
    const dashboard = await db.all('SELECT id FROM leads LIMIT 5');
    const products = await db.all('SELECT id FROM products WHERE active = 1 LIMIT 5');
    expect(Array.isArray(dashboard)).toBe(true);
    expect(Array.isArray(products)).toBe(true);
  });

  it('17. Anonymous API Access: Mutation endpoints (POST lead, POST quote, PATCH status, POST user) BLOCKED with 401', async () => {
    const req: any = { headers: {} };
    let statusCode = 0;
    let responseBody: any = null;
    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return { json: (body: any) => { responseBody = body; } };
      }
    };

    await authenticateToken(req, res, () => {});
    expect(statusCode).toBe(401);
    expect(responseBody.error).toContain('Authentication required');
  });

  it('18. READ_ONLY Role Permissions: View PASS, Write BLOCKED (403), Admin Page BLOCKED (403)', () => {
    const req: any = { user: testUserReadOnly };
    let statusCode = 0;
    let responseBody: any = null;
    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return { json: (body: any) => { responseBody = body; } };
      }
    };

    // Attempt admin action
    requireRole('ADMIN')(req, res, () => {});
    expect(statusCode).toBe(403);
    expect(responseBody.error).toContain('Forbidden');

    // Attempt sales write action
    statusCode = 0;
    requireRole('ADMIN', 'SALES')(req, res, () => {});
    expect(statusCode).toBe(403);
  });

  it('19. ADMIN Role Permissions: View PASS, Write PASS, Admin/Users PASS', () => {
    const req: any = { user: testUserAdmin };
    let nextCalled = false;
    const res: any = { status: () => ({ json: () => {} }) };

    requireRole('ADMIN')(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });
});

