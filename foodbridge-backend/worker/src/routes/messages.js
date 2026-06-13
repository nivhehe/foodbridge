import { authenticate } from '../auth.js';

export function registerMessageRoutes(app) {
  app.get('/api/messages/:orderId', authenticate, async (c) => {
    try {
      const orderId = c.req.param('orderId');
      const userId = Number(c.get('user').userId);

      const order = await c.env.DB.prepare(
        `SELECT o.*, f.posted_by as food_poster FROM orders o
         INNER JOIN fooditems f ON o.food_id = f.id
         WHERE o.id = ?`
      ).bind(orderId).first();

      if (!order) {
        return c.json({ message: 'Order not found' }, 404);
      }

      const isNgo = Number(order.ngo_id) === userId;
      const isRestaurant = Number(order.food_poster) === userId;

      if (!isNgo && !isRestaurant) {
        return c.json({ message: 'Not authorized to view messages for this order' }, 403);
      }

      const { results } = await c.env.DB.prepare(
        `SELECT * FROM messages WHERE order_id = ? ORDER BY created_at ASC`
      ).bind(orderId).all();

      const populated = await Promise.all(
        results.map(async (msg) => {
          const user = await c.env.DB.prepare(
            `SELECT org_name, user_type FROM users WHERE id = ?`
          ).bind(msg.sender_id).first();
          return {
            _id: msg.id,
            order: msg.order_id,
            sender: user ? { orgName: user.org_name, userType: user.user_type } : msg.sender_id,
            text: msg.text,
            createdAt: msg.created_at,
            updatedAt: msg.updated_at,
          };
        }),
      );

      return c.json(populated);
    } catch (err) {
      return c.json({ message: 'Error retrieving messages', error: err.message }, 500);
    }
  });

  app.post('/api/messages/:orderId', authenticate, async (c) => {
    try {
      const orderId = c.req.param('orderId');
      const { text } = await c.req.json();
      const userId = Number(c.get('user').userId);

      if (!text || !text.trim()) {
        return c.json({ message: 'Message text is required' }, 400);
      }

      const order = await c.env.DB.prepare(
        `SELECT o.*, f.posted_by as food_poster FROM orders o
         INNER JOIN fooditems f ON o.food_id = f.id
         WHERE o.id = ?`
      ).bind(orderId).first();

      if (!order) {
        return c.json({ message: 'Order not found' }, 404);
      }

      const isNgo = Number(order.ngo_id) === userId;
      const isRestaurant = Number(order.food_poster) === userId;

      if (!isNgo && !isRestaurant) {
        return c.json({ message: 'Not authorized to send messages for this order' }, 403);
      }

      const result = await c.env.DB.prepare(
        `INSERT INTO messages (order_id, sender_id, text) VALUES (?, ?, ?)`
      ).bind(Number(orderId), userId, text.trim()).run();

      const inserted = await c.env.DB.prepare(`SELECT * FROM messages WHERE id = ?`).bind(result.meta.last_row_id).first();
      const user = await c.env.DB.prepare(
        `SELECT org_name, user_type FROM users WHERE id = ?`
      ).bind(userId).first();

      return c.json({
        _id: inserted.id,
        order: inserted.order_id,
        sender: user ? { orgName: user.org_name, userType: user.user_type } : inserted.sender_id,
        text: inserted.text,
        createdAt: inserted.created_at,
        updatedAt: inserted.updated_at,
      }, 201);
    } catch (err) {
      return c.json({ message: 'Error saving message', error: err.message }, 500);
    }
  });

  app.delete('/api/messages/:messageId', authenticate, async (c) => {
    try {
      const messageId = c.req.param('messageId');
      const userId = Number(c.get('user').userId);

      const msg = await c.env.DB.prepare(
        `SELECT * FROM messages WHERE id = ?`
      ).bind(messageId).first();

      if (!msg) {
        return c.json({ message: 'Message not found' }, 404);
      }

      if (Number(msg.sender_id) !== userId) {
        return c.json({ message: 'Not authorized to delete this message' }, 403);
      }

      await c.env.DB.prepare(`DELETE FROM messages WHERE id = ?`).bind(messageId).run();
      return c.json({ message: 'Message deleted successfully' });
    } catch (err) {
      return c.json({ message: 'Error deleting message', error: err.message }, 500);
    }
  });
}
