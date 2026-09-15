import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/connection.js';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) {
    return secret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is missing in production environment!');
  }
  return 'prime_energy_jwt_secret_dev_key_change_in_production_321';
}

// In-memory token cache for fast local lookup
export const tokenBlacklist = new Set<string>();

export async function revokeToken(token: string): Promise<void> {
  tokenBlacklist.add(token);
  try {
    await db.run('INSERT OR IGNORE INTO revoked_tokens (token) VALUES (?)', [token]);
  } catch (err) {
    console.error('Failed to persist revoked token in Turso:', err);
  }
}

export async function isTokenRevoked(token: string): Promise<boolean> {
  if (tokenBlacklist.has(token)) {
    return true;
  }
  try {
    const record = await db.get('SELECT token FROM revoked_tokens WHERE token = ?', [token]);
    if (record) {
      tokenBlacklist.add(token);
      return true;
    }
  } catch (err) {
    // If DB check fails, fallback to in-memory check
  }
  return false;
}

export function generateToken(user: AuthenticatedUser): string {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    getJwtSecret(),
    { expiresIn: '24h' }
  );
}

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please provide a Bearer token.' });
  }

  const revoked = await isTokenRevoked(token);
  if (revoked) {
    return res.status(401).json({ error: 'Token has been invalidated (logged out).' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid authentication token.' });
  }
}

export async function optionalAuthenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = (req.headers['authorization'] || req.headers['Authorization']) as string | undefined;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  const revoked = await isTokenRevoked(token);
  if (revoked) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AuthenticatedUser;
    req.user = decoded;
  } catch (err) {
    req.user = undefined;
  }
  next();
}


export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: User role '${req.user.role}' is not authorized to perform this action. Required role(s): ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}

