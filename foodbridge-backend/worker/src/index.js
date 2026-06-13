import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { registerAuthRoutes } from './routes/auth.js';
import { registerUserRoutes } from './routes/users.js';
import { registerFoodRoutes } from './routes/food.js';
import { registerOrderRoutes } from './routes/orders.js';
import { registerMessageRoutes } from './routes/messages.js';

const app = new Hono();

app.use('*', cors({
  origin: (origin) => origin || '*',
  credentials: true,
}));

registerAuthRoutes(app);
registerUserRoutes(app);
registerFoodRoutes(app);
registerOrderRoutes(app);
registerMessageRoutes(app);

app.get('/', (c) => c.text('Backend is running'));
app.get('/api/health', (c) => c.json({ ok: true, service: 'foodbridge-backend' }));

app.onError((err, c) => {
  console.error(err);
  return c.json({ message: 'Internal server error' }, 500);
});

export default app;
