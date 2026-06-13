import bcrypt from 'bcryptjs';
import { signToken } from '../auth.js';
import { rowToUser } from '../db.js';

export function registerAuthRoutes(app) {
  app.post('/api/auth/register', async (c) => {
    try {
      const { email, phone, password, userType } = await c.req.json();
      const normalizedEmail = email ? String(email).trim().toLowerCase() : '';
      const normalizedPhone = phone ? String(phone).trim() : '';

      if (!password || !(normalizedEmail || normalizedPhone) || !userType) {
        return c.json({ message: 'Missing fields' }, 400);
      }

      const existing = await c.env.DB.prepare(
        `SELECT id FROM users WHERE email = ? OR phone = ? LIMIT 1`
      ).bind(normalizedEmail, normalizedPhone).first();

      if (existing) {
        return c.json({ message: 'Email or Phone exists' }, 400);
      }

      const hashed = await bcrypt.hash(password, 10);
      const result = await c.env.DB.prepare(
        `INSERT INTO users (email, phone, password, user_type) VALUES (?, ?, ?, ?)`
      ).bind(normalizedEmail, normalizedPhone, hashed, userType).run();

      return c.json({ message: 'Registered' }, 201);
    } catch (err) {
      return c.json({ message: 'Registration failed', error: err.message }, 400);
    }
  });

  app.post('/api/auth/login', async (c) => {
    try {
      const body = await c.req.json();
      const rawIdentifier = body.emailOrPhone || body.email || body.phone || '';
      const password = String(body.password || '');
      const identifier = String(rawIdentifier).trim();
      const identifierEmail = identifier.toLowerCase();

      if (!identifier || !password) {
        return c.json({ message: 'Missing credentials' }, 400);
      }

      const userRow = await c.env.DB.prepare(
        `SELECT * FROM users WHERE email = ? OR email = ? OR phone = ? LIMIT 1`
      ).bind(identifierEmail, identifier, identifier).first();

      if (!userRow) {
        return c.json({ message: 'Invalid credentials' }, 401);
      }

      let passwordMatched = false;
      if (typeof userRow.password === 'string' && userRow.password.startsWith('$2')) {
        passwordMatched = await bcrypt.compare(password, userRow.password);
      } else if (String(userRow.password || '') === password) {
        passwordMatched = true;
        const hashed = await bcrypt.hash(password, 10);
        await c.env.DB.prepare(
          `UPDATE users SET password = ? WHERE id = ?`
        ).bind(hashed, userRow.id).run();
      }

      if (!passwordMatched) {
        return c.json({ message: 'Invalid credentials' }, 401);
      }

      const payload = { userId: String(userRow.id), userType: userRow.user_type };
      const token = await signToken(payload, c.env);
      return c.json({ token, userId: String(userRow.id), userType: userRow.user_type });
    } catch (err) {
      return c.json({ message: 'Login failed', error: err.message }, 400);
    }
  });
}
