import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

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
  return process.env.JWT_SECRET?.trim() || 'prime_energy_jwt_secret_dev_key_change_in_production_321';
}

// Blacklist set for logged-out tokens (or token revocation check)
export const tokenBlacklist = new Set<string>();

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

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please provide a Bearer token.' });
  }

  if (tokenBlacklist.has(token)) {
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
