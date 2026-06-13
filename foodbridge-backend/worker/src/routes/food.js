import { authenticate } from '../auth.js';
import { reverseGeocode } from '../utils.js';
import { rowToFood } from '../db.js';

async function populateUser(db, foodRows) {
  const result = [];
  for (const food of foodRows) {
    const item = rowToFood(food);
    if (food.posted_by) {
      const user = await db.prepare(
        `SELECT org_name, email, phone, address, description FROM users WHERE id = ?`
      ).bind(food.posted_by).first();
      if (user) {
        item.postedBy = {
          orgName: user.org_name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          description: user.description,
        };
      }
    }
    result.push(item);
  }
  return result;
}

export function registerFoodRoutes(app) {
  app.post('/api/food', authenticate, async (c) => {
    const { name, category, quantity, unit, description, expiryTime, latitude, longitude } = await c.req.json();

    if (!name || !category || !quantity || !unit || !expiryTime || latitude === undefined || longitude === undefined) {
      return c.json({ message: 'Required fields missing' }, 400);
    }

    const parsedLat = Number(latitude);
    const parsedLng = Number(longitude);
    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      return c.json({ message: 'Latitude and longitude must be valid numbers' }, 400);
    }

    const addressSentence = await reverseGeocode(parsedLat, parsedLng);

    const result = await c.env.DB.prepare(
      `INSERT INTO fooditems (name, category, quantity, unit, description, expiry_time, pickup_lat, pickup_lng, pickup_address, posted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(name, category, Number(quantity), unit, description || '', Number(expiryTime), parsedLat, parsedLng, addressSentence, Number(c.get('user').userId)).run();

    const inserted = await c.env.DB.prepare(`SELECT * FROM fooditems WHERE id = ?`).bind(result.meta.last_row_id).first();
    return c.json(rowToFood(inserted), 201);
  });

  app.get('/api/food', async (c) => {
    const now = new Date().toISOString();
    const { results } = await c.env.DB.prepare(
      `SELECT * FROM fooditems WHERE status = 'Active'`
    ).all();

    const active = results.filter((row) => {
      if (!row.created_at) return true;
      const expiresAt = new Date(new Date(row.created_at).getTime() + row.expiry_time * 60 * 60 * 1000);
      return expiresAt > new Date();
    });

    const populated = await populateUser(c.env.DB, active);
    return c.json(populated);
  });

  app.get('/api/food/restaurant/:userId', authenticate, async (c) => {
    const { results } = await c.env.DB.prepare(
      `SELECT * FROM fooditems WHERE posted_by = ?`
    ).bind(Number(c.req.param('userId'))).all();

    const now = Date.now();
    const nonExpired = results.filter((row) => {
      if (!row.created_at) return true;
      const expiresAt = new Date(new Date(row.created_at).getTime() + row.expiry_time * 60 * 60 * 1000);
      return expiresAt > now && (row.status === 'Active' || row.status === 'Claimed');
    });

    return c.json(nonExpired.map(rowToFood));
  });

  app.delete('/api/food/auto-remove', authenticate, async (c) => {
    const { results } = await c.env.DB.prepare(
      `SELECT * FROM fooditems WHERE status = 'Active'`
    ).all();

    const now = Date.now();
    for (const row of results) {
      if (!row.created_at) continue;
      const expiresAt = new Date(new Date(row.created_at).getTime() + row.expiry_time * 60 * 60 * 1000);
      if (expiresAt < now) {
        await c.env.DB.prepare(
          `UPDATE fooditems SET status = 'Claimed' WHERE id = ?`
        ).bind(row.id).run();
      }
    }

    return c.json({ message: 'Expired foods updated' });
  });

  app.delete('/api/food/:foodId', authenticate, async (c) => {
    const foodId = Number(c.req.param('foodId'));
    const userId = Number(c.get('user').userId);

    const food = await c.env.DB.prepare(
      `SELECT * FROM fooditems WHERE id = ?`
    ).bind(foodId).first();

    if (!food) {
      return c.json({ message: 'Food post not found' }, 404);
    }

    if (Number(food.posted_by) !== userId) {
      return c.json({ message: 'You can delete only your own food posts' }, 403);
    }

    await c.env.DB.prepare(`DELETE FROM orders WHERE food_id = ?`).bind(foodId).run();
    await c.env.DB.prepare(`DELETE FROM fooditems WHERE id = ?`).bind(foodId).run();

    return c.json({ message: 'Food post deleted successfully' });
  });
}
