import { authenticate } from '../auth.js';

export function registerUserRoutes(app) {
  app.get('/api/users/:id', authenticate, async (c) => {
    const row = await c.env.DB.prepare(
      `SELECT org_name, email, phone, address, description FROM users WHERE id = ?`
    ).bind(c.req.param('id')).first();

    if (!row) return c.json({ message: 'Not found' }, 404);

    return c.json({
      orgName: row.org_name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      description: row.description,
    });
  });

  app.put('/api/users/:id', authenticate, async (c) => {
    const { orgName, email, phone, address, description } = await c.req.json();
    await c.env.DB.prepare(
      `UPDATE users SET org_name = ?, email = ?, phone = ?, address = ?, description = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(orgName || '', email || '', phone || '', address || '', description || '', c.req.param('id')).run();

    return c.json({ message: 'Profile updated' });
  });
}
