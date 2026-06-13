import { authenticate } from '../auth.js';
import { generateHandshakeCode } from '../utils.js';
import { rowToOrder } from '../db.js';

async function populateFoodAndNgo(db, orderRows) {
  const result = [];
  for (const row of orderRows) {
    const order = rowToOrder(row);

    if (row.food_id) {
      const food = await db.prepare(`SELECT * FROM fooditems WHERE id = ?`).bind(row.food_id).first();
      if (food) {
        order.food = {
          _id: food.id,
          name: food.name,
          category: food.category,
          quantity: food.quantity,
          unit: food.unit,
          description: food.description,
          expiryTime: food.expiry_time,
          pickupLocation: {
            latitude: food.pickup_lat,
            longitude: food.pickup_lng,
            addressSentence: food.pickup_address,
          },
          status: food.status,
          createdAt: food.created_at,
        };

        if (food.posted_by) {
          const user = await db.prepare(
            `SELECT org_name, email, phone, address, description FROM users WHERE id = ?`
          ).bind(food.posted_by).first();
          if (user) {
            order.food.postedBy = {
              orgName: user.org_name,
              email: user.email,
              phone: user.phone,
              address: user.address,
              description: user.description,
            };
          }
        }
      }
    }

    if (row.ngo_id) {
      const ngo = await db.prepare(
        `SELECT org_name, email, phone, address, description FROM users WHERE id = ?`
      ).bind(row.ngo_id).first();
      if (ngo) {
        order.ngo = {
          orgName: ngo.org_name,
          email: ngo.email,
          phone: ngo.phone,
          address: ngo.address,
          description: ngo.description,
        };
      }
    }

    result.push(order);
  }
  return result;
}

export function registerOrderRoutes(app) {
  app.post('/api/orders', authenticate, async (c) => {
    try {
      const { food, ngo } = await c.req.json();
      if (!food || !ngo) {
        return c.json({ message: 'Food ID and NGO ID are required' }, 400);
      }

      const foodItem = await c.env.DB.prepare(
        `SELECT * FROM fooditems WHERE id = ?`
      ).bind(Number(food)).first();

      if (!foodItem) {
        return c.json({ message: 'Food item not found' }, 404);
      }

      if (foodItem.status === 'Claimed') {
        return c.json({ message: 'Food item has already been claimed by another NGO' }, 400);
      }

      const handshakeCode = generateHandshakeCode();

      const result = await c.env.DB.prepare(
        `INSERT INTO orders (food_id, ngo_id, quantity, handshake_code) VALUES (?, ?, ?, ?)`
      ).bind(Number(food), Number(ngo), foodItem.quantity, handshakeCode).run();

      await c.env.DB.prepare(
        `UPDATE fooditems SET status = 'Claimed' WHERE id = ?`
      ).bind(Number(food)).run();

      const inserted = await c.env.DB.prepare(`SELECT * FROM orders WHERE id = ?`).bind(result.meta.last_row_id).first();
      return c.json(rowToOrder(inserted), 201);
    } catch (err) {
      return c.json({ message: 'Order failed', error: err.message }, 400);
    }
  });

  app.get('/api/orders/ngo/:ngoId', authenticate, async (c) => {
    try {
      const { results } = await c.env.DB.prepare(
        `SELECT * FROM orders WHERE ngo_id = ? ORDER BY created_at DESC`
      ).bind(Number(c.req.param('ngoId'))).all();

      const populated = await populateFoodAndNgo(c.env.DB, results);
      return c.json(populated);
    } catch (err) {
      return c.json({ message: 'Failed to get orders', error: err.message }, 500);
    }
  });

  app.get('/api/orders/restaurant/:restaurantId', authenticate, async (c) => {
    try {
      const { results } = await c.env.DB.prepare(
        `SELECT o.* FROM orders o
         INNER JOIN fooditems f ON o.food_id = f.id
         WHERE f.posted_by = ?
         ORDER BY o.created_at DESC`
      ).bind(Number(c.req.param('restaurantId'))).all();

      const populated = await populateFoodAndNgo(c.env.DB, results);
      return c.json(populated);
    } catch (err) {
      return c.json({ message: 'Failed to get orders', error: err.message }, 500);
    }
  });

  app.delete('/api/orders/food/:foodId', authenticate, async (c) => {
    try {
      const foodId = Number(c.req.param('foodId'));
      const order = await c.env.DB.prepare(
        `SELECT * FROM orders WHERE food_id = ? AND status = 'pending' LIMIT 1`
      ).bind(foodId).first();

      if (!order) {
        return c.json({ message: 'Pending claim not found' }, 404);
      }

      await c.env.DB.prepare(`DELETE FROM orders WHERE id = ?`).bind(order.id).run();
      await c.env.DB.prepare(`UPDATE fooditems SET status = 'Active' WHERE id = ?`).bind(foodId).run();

      return c.json({ message: 'Claim released successfully' });
    } catch (err) {
      return c.json({ message: 'Release failed', error: err.message }, 400);
    }
  });

  app.post('/api/orders/verify', authenticate, async (c) => {
    try {
      const { foodId, handshakeCode } = await c.req.json();
      if (!foodId || !handshakeCode) {
        return c.json({ message: 'Food ID and Handshake Code are required' }, 400);
      }

      const order = await c.env.DB.prepare(
        `SELECT * FROM orders WHERE food_id = ? AND status = 'pending' LIMIT 1`
      ).bind(Number(foodId)).first();

      if (!order) {
        return c.json({ message: 'No pending claim found for this item' }, 404);
      }

      if (order.handshake_code.toUpperCase() !== handshakeCode.toUpperCase()) {
        return c.json({ message: 'Invalid handshake code' }, 400);
      }

      await c.env.DB.prepare(
        `UPDATE orders SET status = 'completed' WHERE id = ?`
      ).bind(order.id).run();

      return c.json({ message: 'Handshake verified successfully' });
    } catch (err) {
      return c.json({ message: 'Verification failed', error: err.message }, 400);
    }
  });
}
