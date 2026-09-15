import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/connection.js';
import { generateToken, authenticateToken, requireRole, tokenBlacklist, AuthenticatedRequest } from '../middleware/auth.js';

export const authRouter = Router();

// LOGIN endpoint with bcrypt password verification and JWT token generation
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await db.get(`
      SELECT u.id, u.name, u.email, u.password_hash, u.role_id, r.name as role_name, r.description as role_description
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.email = ? AND u.active = 1
    `, [email.toLowerCase().trim()]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password using bcrypt (or legacy string check fallback if unhashed)
    let passwordMatches = false;
    if (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$')) {
      passwordMatches = bcrypt.compareSync(password, user.password_hash);
    } else {
      // Fallback for legacy development pre-seeded strings
      passwordMatches = password === user.password_hash || bcrypt.compareSync(password, bcrypt.hashSync(user.password_hash, 10));
    }

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role_name
    };

    const token = generateToken(userData);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role_id: user.role_id,
        role_name: user.role_name,
        role_description: user.role_description
      }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to authenticate user' });
  }
});

// LOGOUT endpoint
authRouter.post('/logout', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    tokenBlacklist.add(token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET Current Authenticated User Profile
authRouter.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// List all active users (Admin only)
authRouter.get('/users', authenticateToken, requireRole('ADMIN', 'ESTIMATOR', 'SALES', 'SURVEYOR'), async (req: Request, res: Response) => {
  try {
    const users = await db.all(`
      SELECT u.id, u.name, u.email, u.role_id, r.name as role_name, r.description as role_description
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.active = 1
    `);
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});
