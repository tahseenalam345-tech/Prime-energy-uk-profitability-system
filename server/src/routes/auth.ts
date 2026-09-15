import { Router, Request, Response } from 'express';
import { db } from '../db/connection.js';

export const authRouter = Router();

// List all roles and users for easy testing / role switching in internal app
authRouter.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await db.all(`
      SELECT u.id, u.name, u.email, u.role_id, r.name as role_name, r.description as role_description
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.active = 1
    `);
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch users' });
  }
});

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await db.get(`
      SELECT u.id, u.name, u.email, u.role_id, r.name as role_name, r.description as role_description
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.email = ? AND u.active = 1
    `, [email]);

    if (!user) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to login' });
  }
});
