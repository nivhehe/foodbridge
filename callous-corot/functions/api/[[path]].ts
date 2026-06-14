import bcrypt from 'bcryptjs';

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`,
      { headers: { 'User-Agent': 'FoodBridge/1.0' } }
    );
    const data = await res.json();
    if (data?.display_name) return `Pickup is available at ${data.display_name}.`;
  } catch {}
  return `Pickup is available at coordinates (${lat}, ${lng}).`;
}

function handshakeCode() {
  return `FB-${Math.floor(1000 + Math.random() * 9000)}`;
}

async function handleRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, '') || '/';
  const method = request.method;
  const body = method !== 'GET' && method !== 'HEAD' ? await request.json().catch(() => ({})) : {};
  const auth = request.headers.get('Authorization') || '';
  const token = auth.split(' ')[1];

  function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-credentials': 'true' },
    });
  }

  // Auth helpers
  async function getUserId() {
    if (!token) return null;
    try {
      const { jwtVerify } = await import('jose');
      const secret = new TextEncoder().encode(env.JWT_SECRET || 'foodbridgeSecret2025');
      const { payload } = await jwtVerify(token, secret);
      return payload.userId;
    } catch { return null; }
  }

  async function requireAuth() {
    const uid = await getUserId();
    if (!uid) return json({ message: 'Unauthorized' }, 401);
    return uid;
  }

  // ── ROUTES ──

  // Health
  if (path === '/health' || path === '/') {
    return json({ ok: true, service: 'foodbridge-backend' });
  }

  // POST /auth/register
  if (path === '/auth/register' && method === 'POST') {
    const { email, phone, password, userType } = body;
    const normEmail = (email || '').trim().toLowerCase();
    const normPhone = (phone || '').trim();
    if (!password || !(normEmail || normPhone) || !userType) return json({ message: 'Missing fields' }, 400);

    const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ? OR phone = ?').bind(normEmail, normPhone).first();
    if (existing) return json({ message: 'Email or Phone exists' }, 400);

    const hashed = await bcrypt.hash(password, 10);
    await env.DB.prepare('INSERT INTO users (email, phone, password, user_type) VALUES (?,?,?,?)').bind(normEmail, normPhone, hashed, userType).run();
    return json({ message: 'Registered' }, 201);
  }

  // POST /auth/login
  if (path === '/auth/login' && method === 'POST') {
    const identifier = String(body.emailOrPhone || body.email || body.phone || '').trim();
    const password = String(body.password || '');
    const idEmail = identifier.toLowerCase();
    if (!identifier || !password) return json({ message: 'Missing credentials' }, 400);

    const user = await env.DB.prepare('SELECT * FROM users WHERE email = ? OR email = ? OR phone = ?').bind(idEmail, identifier, identifier).first();
    if (!user) return json({ message: 'Invalid credentials' }, 401);

    let matched = false;
    if (user.password?.startsWith('$2')) matched = await bcrypt.compare(password, user.password);
    else if (String(user.password) === password) { matched = true; const h = await bcrypt.hash(password, 10); await env.DB.prepare('UPDATE users SET password = ? WHERE id = ?').bind(h, user.id).run(); }
    if (!matched) return json({ message: 'Invalid credentials' }, 401);

    const { SignJWT } = await import('jose');
    const sec = new TextEncoder().encode(env.JWT_SECRET || 'foodbridgeSecret2025');
    const jwt = await new SignJWT({ userId: String(user.id), userType: user.user_type }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('7d').sign(sec);
    return json({ token: jwt, userId: String(user.id), userType: user.user_type });
  }

  const uid = await requireAuth();
  if (typeof uid === 'object') return uid;

  // GET|PUT /users/:id
  const userMatch = path.match(/^\/users\/(\d+)$/);
  if (userMatch) {
    const id = Number(userMatch[1]);
    if (method === 'GET') {
      const row = await env.DB.prepare('SELECT org_name, email, phone, address, description FROM users WHERE id = ?').bind(id).first();
      if (!row) return json({ message: 'Not found' }, 404);
      return json({ orgName: row.org_name, email: row.email, phone: row.phone, address: row.address, description: row.description });
    }
    if (method === 'PUT') {
      const { orgName, email, phone: phoneNum, address, description } = body;
      await env.DB.prepare("UPDATE users SET org_name=?, email=?, phone=?, address=?, description=?, updated_at=datetime('now') WHERE id=?").bind(orgName||'', email||'', phoneNum||'', address||'', description||'', id).run();
      return json({ message: 'Profile updated' });
    }
  }

  // Food routes
  if (path === '/food' && method === 'GET') {
    const { results } = await env.DB.prepare("SELECT * FROM fooditems WHERE status='Active'").all();
    const now = Date.now();
    const active = results.filter(r => !r.created_at || new Date(new Date(r.created_at).getTime() + r.expiry_time * 3600000) > new Date());
    const populated = [];
    for (const row of active) {
      const item = { _id: row.id, name: row.name, category: row.category, quantity: row.quantity, unit: row.unit, description: row.description, expiryTime: row.expiry_time, pickupLocation: { latitude: row.pickup_lat, longitude: row.pickup_lng, addressSentence: row.pickup_address }, status: row.status, createdAt: row.created_at };
      if (row.posted_by) {
        const u = await env.DB.prepare('SELECT org_name, email, phone, address, description FROM users WHERE id=?').bind(row.posted_by).first();
        if (u) item.postedBy = { orgName: u.org_name, email: u.email, phone: u.phone, address: u.address, description: u.description };
      }
      populated.push(item);
    }
    return json(populated);
  }

  if (path === '/food' && method === 'POST') {
    const { name, category, quantity, unit, description, expiryTime, latitude, longitude } = body;
    if (!name || !category || !quantity || !unit || !expiryTime || latitude===undefined || longitude===undefined) return json({ message: 'Required fields missing' }, 400);
    const addr = await reverseGeocode(Number(latitude), Number(longitude));
    const r = await env.DB.prepare('INSERT INTO fooditems (name,category,quantity,unit,description,expiry_time,pickup_lat,pickup_lng,pickup_address,posted_by) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(name,category,Number(quantity),unit,description||'',Number(expiryTime),Number(latitude),Number(longitude),addr,Number(uid)).run();
    const ins = await env.DB.prepare('SELECT * FROM fooditems WHERE id=?').bind(r.meta.last_row_id).first();
    return json({ _id: ins.id, name: ins.name, category: ins.category, quantity: ins.quantity, unit: ins.unit, description: ins.description, expiryTime: ins.expiry_time, pickupLocation: { latitude: ins.pickup_lat, longitude: ins.pickup_lng, addressSentence: ins.pickup_address }, status: ins.status, postedBy: Number(uid), createdAt: ins.created_at }, 201);
  }

  const restMatch = path.match(/^\/food\/restaurant\/(\d+)$/);
  if (restMatch && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM fooditems WHERE posted_by=?').bind(Number(restMatch[1])).all();
    const now = Date.now();
    return json(results.filter(r => {
      if (!r.created_at) return true;
      return new Date(new Date(r.created_at).getTime() + r.expiry_time * 3600000) > now && (r.status === 'Active' || r.status === 'Claimed');
    }).map(r => ({ _id: r.id, name: r.name, category: r.category, quantity: r.quantity, unit: r.unit, description: r.description, expiryTime: r.expiry_time, pickupLocation: { latitude: r.pickup_lat, longitude: r.pickup_lng, addressSentence: r.pickup_address }, status: r.status, postedBy: r.posted_by, createdAt: r.created_at })));
  }

  if (path === '/food/auto-remove' && method === 'DELETE') {
    const { results } = await env.DB.prepare("SELECT * FROM fooditems WHERE status='Active'").all();
    const now = Date.now();
    for (const r of results) {
      if (!r.created_at) continue;
      if (new Date(new Date(r.created_at).getTime() + r.expiry_time * 3600000) < now) {
        await env.DB.prepare("UPDATE fooditems SET status='Claimed' WHERE id=?").bind(r.id).run();
      }
    }
    return json({ message: 'Expired foods updated' });
  }

  const foodDelMatch = path.match(/^\/food\/(\d+)$/);
  if (foodDelMatch && method === 'DELETE') {
    const foodId = Number(foodDelMatch[1]);
    const food = await env.DB.prepare('SELECT * FROM fooditems WHERE id=?').bind(foodId).first();
    if (!food) return json({ message: 'Food post not found' }, 404);
    if (Number(food.posted_by) !== Number(uid)) return json({ message: 'You can delete only your own food posts' }, 403);
    await env.DB.prepare('DELETE FROM orders WHERE food_id=?').bind(foodId).run();
    await env.DB.prepare('DELETE FROM fooditems WHERE id=?').bind(foodId).run();
    return json({ message: 'Food post deleted successfully' });
  }

  // Orders
  if (path === '/orders' && method === 'POST') {
    const { food, ngo } = body;
    if (!food || !ngo) return json({ message: 'Food ID and NGO ID are required' }, 400);
    const foodItem = await env.DB.prepare('SELECT * FROM fooditems WHERE id=?').bind(Number(food)).first();
    if (!foodItem) return json({ message: 'Food item not found' }, 404);
    if (foodItem.status === 'Claimed') return json({ message: 'Food item has already been claimed' }, 400);
    const code = handshakeCode();
    const r = await env.DB.prepare('INSERT INTO orders (food_id, ngo_id, quantity, handshake_code) VALUES (?,?,?,?)').bind(Number(food), Number(ngo), foodItem.quantity, code).run();
    await env.DB.prepare("UPDATE fooditems SET status='Claimed' WHERE id=?").bind(Number(food)).run();
    const ins = await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(r.meta.last_row_id).first();
    return json({ _id: ins.id, food: ins.food_id, ngo: ins.ngo_id, quantity: ins.quantity, handshakeCode: ins.handshake_code, status: ins.status, createdAt: ins.created_at }, 201);
  }

  const ngoOrdersMatch = path.match(/^\/orders\/ngo\/(\d+)$/);
  if (ngoOrdersMatch && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM orders WHERE ngo_id=? ORDER BY created_at DESC').bind(Number(ngoOrdersMatch[1])).all();
    const populated = [];
    for (const row of results) {
      const o = { _id: row.id, food: row.food_id, ngo: row.ngo_id, quantity: row.quantity, handshakeCode: row.handshake_code, status: row.status, createdAt: row.created_at };
      if (row.food_id) {
        const f = await env.DB.prepare('SELECT * FROM fooditems WHERE id=?').bind(row.food_id).first();
        if (f) {
          o.food = { _id: f.id, name: f.name, category: f.category, quantity: f.quantity, unit: f.unit, description: f.description, expiryTime: f.expiry_time, pickupLocation: { latitude: f.pickup_lat, longitude: f.pickup_lng, addressSentence: f.pickup_address }, status: f.status, createdAt: f.created_at };
          if (f.posted_by) {
            const u = await env.DB.prepare('SELECT org_name,email,phone,address,description FROM users WHERE id=?').bind(f.posted_by).first();
            if (u) o.food.postedBy = { orgName: u.org_name, email: u.email, phone: u.phone, address: u.address, description: u.description };
          }
        }
      }
      if (row.ngo_id) {
        const u = await env.DB.prepare('SELECT org_name,email,phone,address,description FROM users WHERE id=?').bind(row.ngo_id).first();
        if (u) o.ngo = { orgName: u.org_name, email: u.email, phone: u.phone, address: u.address, description: u.description };
      }
      populated.push(o);
    }
    return json(populated);
  }

  const restOrdersMatch = path.match(/^\/orders\/restaurant\/(\d+)$/);
  if (restOrdersMatch && method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT o.* FROM orders o INNER JOIN fooditems f ON o.food_id = f.id WHERE f.posted_by=? ORDER BY o.created_at DESC'
    ).bind(Number(restOrdersMatch[1])).all();
    const populated = [];
    for (const row of results) {
      const o = { _id: row.id, food: row.food_id, ngo: row.ngo_id, quantity: row.quantity, handshakeCode: row.handshake_code, status: row.status, createdAt: row.created_at };
      if (row.food_id) {
        const f = await env.DB.prepare('SELECT * FROM fooditems WHERE id=?').bind(row.food_id).first();
        if (f) o.food = { _id: f.id, name: f.name, category: f.category, quantity: f.quantity, unit: f.unit, status: f.status, createdAt: f.created_at };
      }
      if (row.ngo_id) {
        const u = await env.DB.prepare('SELECT org_name,email,phone,address,description FROM users WHERE id=?').bind(row.ngo_id).first();
        if (u) o.ngo = { orgName: u.org_name, email: u.email, phone: u.phone, address: u.address, description: u.description };
      }
      populated.push(o);
    }
    return json(populated);
  }

  const releaseMatch = path.match(/^\/orders\/food\/(\d+)$/);
  if (releaseMatch && method === 'DELETE') {
    const fid = Number(releaseMatch[1]);
    const order = await env.DB.prepare("SELECT * FROM orders WHERE food_id=? AND status='pending' LIMIT 1").bind(fid).first();
    if (!order) return json({ message: 'Pending claim not found' }, 404);
    await env.DB.prepare('DELETE FROM orders WHERE id=?').bind(order.id).run();
    await env.DB.prepare("UPDATE fooditems SET status='Active' WHERE id=?").bind(fid).run();
    return json({ message: 'Claim released successfully' });
  }

  if (path === '/orders/verify' && method === 'POST') {
    const { foodId, handshakeCode: code } = body;
    if (!foodId || !code) return json({ message: 'Food ID and Handshake Code are required' }, 400);
    const order = await env.DB.prepare("SELECT * FROM orders WHERE food_id=? AND status='pending' LIMIT 1").bind(Number(foodId)).first();
    if (!order) return json({ message: 'No pending claim found' }, 404);
    if (order.handshake_code.toUpperCase() !== code.toUpperCase()) return json({ message: 'Invalid handshake code' }, 400);
    await env.DB.prepare("UPDATE orders SET status='completed' WHERE id=?").bind(order.id).run();
    return json({ message: 'Handshake verified successfully' });
  }

  // Messages
  const msgGetMatch = path.match(/^\/messages\/(\d+)$/);
  if (msgGetMatch && method === 'GET') {
    const oid = msgGetMatch[1];
    const order = await env.DB.prepare('SELECT o.*, f.posted_by as food_poster FROM orders o INNER JOIN fooditems f ON o.food_id=f.id WHERE o.id=?').bind(oid).first();
    if (!order) return json({ message: 'Order not found' }, 404);
    if (Number(order.ngo_id) !== Number(uid) && Number(order.food_poster) !== Number(uid)) return json({ message: 'Not authorized' }, 403);
    const { results } = await env.DB.prepare('SELECT * FROM messages WHERE order_id=? ORDER BY created_at ASC').bind(oid).all();
    const populated = [];
    for (const m of results) {
      const u = await env.DB.prepare('SELECT org_name, user_type FROM users WHERE id=?').bind(m.sender_id).first();
      populated.push({ _id: m.id, order: m.order_id, sender: u ? { orgName: u.org_name, userType: u.user_type } : m.sender_id, text: m.text, createdAt: m.created_at, updatedAt: m.updated_at });
    }
    return json(populated);
  }

  if (msgGetMatch && method === 'POST') {
    const oid = msgGetMatch[1];
    const { text } = body;
    if (!text?.trim()) return json({ message: 'Message text is required' }, 400);
    const order = await env.DB.prepare('SELECT o.*, f.posted_by as food_poster FROM orders o INNER JOIN fooditems f ON o.food_id=f.id WHERE o.id=?').bind(oid).first();
    if (!order) return json({ message: 'Order not found' }, 404);
    if (Number(order.ngo_id) !== Number(uid) && Number(order.food_poster) !== Number(uid)) return json({ message: 'Not authorized' }, 403);
    const r = await env.DB.prepare('INSERT INTO messages (order_id, sender_id, text) VALUES (?,?,?)').bind(Number(oid), Number(uid), text.trim()).run();
    const ins = await env.DB.prepare('SELECT * FROM messages WHERE id=?').bind(r.meta.last_row_id).first();
    const u = await env.DB.prepare('SELECT org_name, user_type FROM users WHERE id=?').bind(Number(uid)).first();
    return json({ _id: ins.id, order: ins.order_id, sender: u ? { orgName: u.org_name, userType: u.user_type } : ins.sender_id, text: ins.text, createdAt: ins.created_at, updatedAt: ins.updated_at }, 201);
  }

  const msgDelMatch = path.match(/^\/messages\/(\d+)$/);
  if (msgDelMatch && method === 'DELETE') {
    const mid = msgDelMatch[1];
    const msg = await env.DB.prepare('SELECT * FROM messages WHERE id=?').bind(mid).first();
    if (!msg) return json({ message: 'Message not found' }, 404);
    if (Number(msg.sender_id) !== Number(uid)) return json({ message: 'Not authorized' }, 403);
    await env.DB.prepare('DELETE FROM messages WHERE id=?').bind(mid).run();
    return json({ message: 'Message deleted successfully' });
  }

  return json({ message: 'Not found' }, 404);
}

export const onRequest = handleRequest;
