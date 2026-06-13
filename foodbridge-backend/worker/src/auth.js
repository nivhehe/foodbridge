import { SignJWT, jwtVerify } from 'jose';

const FALLBACK_SECRET = 'foodbridgeSecret2025';

function getSecret(env) {
  const secret = env.JWT_SECRET || FALLBACK_SECRET;
  return new TextEncoder().encode(secret);
}

export async function signToken(payload, env) {
  const secret = getSecret(env);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyToken(token, env) {
  const secret = getSecret(env);
  const { payload } = await jwtVerify(token, secret);
  return payload;
}

export async function authenticate(c, next) {
  const header = c.req.header('Authorization') || '';
  const token = header.split(' ')[1];
  if (!token) {
    return c.json({ message: 'Missing token' }, 401);
  }
  try {
    const payload = await verifyToken(token, c.env);
    c.set('user', payload);
    await next();
  } catch {
    return c.json({ message: 'Invalid token' }, 403);
  }
}
