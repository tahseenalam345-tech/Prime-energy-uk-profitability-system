import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/connection.js';
import { generateToken, authenticateToken, requireRole, revokeToken, AuthenticatedRequest } from '../middleware/auth.js';

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
      WHERE LOWER(u.email) = ? AND u.active = 1
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
authRouter.post('/logout', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    await revokeToken(token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET Current Authenticated User Profile
authRouter.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const roleName = req.user.role || (req.user as any).role_name || 'READ_ONLY';
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: roleName,
      role_name: roleName
    }
  });
});

// Diagnostic status endpoint (Non-sensitive env presence and admin status check)
authRouter.get('/diagnostic-status', async (req: Request, res: Response) => {
  try {
    const rawEmail = (process.env.ADMIN_EMAIL || 'tahseenalam345@gmail.com').trim().replace(/^["']|["']$/g, '');
    const cleanEmail = rawEmail.toLowerCase();
    const adminUser = await db.get('SELECT id, email, active, role_id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    
    res.json({
      status: 'ok',
      env: {
        ADMIN_EMAIL_present: !!process.env.ADMIN_EMAIL,
        ADMIN_PASSWORD_present: !!process.env.ADMIN_PASSWORD,
      },
      configuredAdminEmail: cleanEmail,
      configuredAdminInDb: adminUser ? {
        email: adminUser.email,
        active: adminUser.active,
        role_id: adminUser.role_id
      } : null
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed diagnostic check' });
  }
});

// List all users including inactive (Admin ONLY)
authRouter.get('/users', authenticateToken, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const users = await db.all(`
      SELECT u.id, u.name, u.email, u.role_id, u.active, u.created_at, r.name as role_name, r.description as role_description
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ORDER BY u.created_at DESC
    `);
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// List all roles (Admin ONLY)
authRouter.get('/roles', authenticateToken, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const roles = await db.all('SELECT id, name, description FROM roles ORDER BY name ASC');
    res.json({ roles });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Create new user (Admin ONLY)
authRouter.post('/users', authenticateToken, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, role_id, role_name, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(400).json({ error: `User with email '${cleanEmail}' already exists.` });
    }

    // Resolve role ID
    let targetRoleId = role_id;
    if (!targetRoleId && role_name) {
      const roleRow = await db.get('SELECT id FROM roles WHERE name = ?', [role_name.toUpperCase().trim()]);
      if (roleRow) targetRoleId = roleRow.id;
    }

    if (!targetRoleId) {
      const readOnlyRole = await db.get("SELECT id FROM roles WHERE name = 'READ_ONLY'");
      targetRoleId = readOnlyRole?.id || 'role_readonly';
    }

    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const passwordHash = bcrypt.hashSync(password, 10);

    await db.run(
      'INSERT INTO users (id, name, email, role_id, password_hash, active) VALUES (?, ?, ?, ?, ?, 1)',
      [userId, name.trim(), cleanEmail, targetRoleId, passwordHash]
    );

    // Audit log
    await db.run(
      'INSERT INTO audit_logs (id, user_id, user_name, entity_type, entity_id, action, new_values, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        `audit_${Date.now()}`,
        req.user?.id || 'user_admin',
        req.user?.name || 'Admin',
        'USER',
        userId,
        'CREATE_USER',
        JSON.stringify({ userId, name, email: cleanEmail, roleId: targetRoleId }),
        `Created new user ${cleanEmail}`
      ]
    );

    const createdUser = await db.get(`
      SELECT u.id, u.name, u.email, u.role_id, u.active, r.name as role_name
      FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?
    `, [userId]);

    res.status(201).json({ success: true, user: createdUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create user' });
  }
});

// Update user role (Admin ONLY)
authRouter.put('/users/:id/role', authenticateToken, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { role_id, role_name } = req.body;
    const userId = req.params.id;

    let targetRoleId = role_id;
    if (!targetRoleId && role_name) {
      const roleRow = await db.get('SELECT id FROM roles WHERE name = ?', [role_name.toUpperCase().trim()]);
      if (roleRow) targetRoleId = roleRow.id;
    }

    if (!targetRoleId) {
      return res.status(400).json({ error: 'Valid role_id or role_name is required' });
    }

    const user = await db.get('SELECT id, name, email, role_id FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db.run('UPDATE users SET role_id = ? WHERE id = ?', [targetRoleId, userId]);

    // Audit log
    await db.run(
      'INSERT INTO audit_logs (id, user_id, user_name, entity_type, entity_id, action, old_values, new_values, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        `audit_${Date.now()}`,
        req.user?.id || 'user_admin',
        req.user?.name || 'Admin',
        'USER',
        userId,
        'CHANGE_ROLE',
        JSON.stringify({ oldRoleId: user.role_id }),
        JSON.stringify({ newRoleId: targetRoleId }),
        `Changed role for user ${user.email}`
      ]
    );

    res.json({ success: true, userId, roleId: targetRoleId });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update user role' });
  }
});

// Activate / Deactivate user (Admin ONLY)
authRouter.patch('/users/:id/status', authenticateToken, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { active } = req.body;
    const userId = req.params.id;

    if (active === undefined) {
      return res.status(400).json({ error: 'active parameter (boolean or number) is required' });
    }

    const isActive = active ? 1 : 0;
    const user = await db.get('SELECT id, name, email, active FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db.run('UPDATE users SET active = ? WHERE id = ?', [isActive, userId]);

    // Audit log
    await db.run(
      'INSERT INTO audit_logs (id, user_id, user_name, entity_type, entity_id, action, old_values, new_values, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        `audit_${Date.now()}`,
        req.user?.id || 'user_admin',
        req.user?.name || 'Admin',
        'USER',
        userId,
        'UPDATE_STATUS',
        JSON.stringify({ active: user.active }),
        JSON.stringify({ active: isActive }),
        `${isActive ? 'Activated' : 'Deactivated'} user ${user.email}`
      ]
    );

    res.json({ success: true, userId, active: isActive });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update user status' });
  }
});

// Reset user password (Admin ONLY)
authRouter.post('/users/:id/reset-password', authenticateToken, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { newPassword } = req.body;
    const userId = req.params.id;

    if (!newPassword || newPassword.trim().length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const user = await db.get('SELECT id, email FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passwordHash = bcrypt.hashSync(newPassword.trim(), 10);
    await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);

    // Audit log
    await db.run(
      'INSERT INTO audit_logs (id, user_id, user_name, entity_type, entity_id, action, reason) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        `audit_${Date.now()}`,
        req.user?.id || 'user_admin',
        req.user?.name || 'Admin',
        'USER',
        userId,
        'RESET_PASSWORD',
        `Reset password for user ${user.email}`
      ]
    );

    res.json({ success: true, message: `Password reset successfully for ${user.email}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to reset password' });
  }
});

