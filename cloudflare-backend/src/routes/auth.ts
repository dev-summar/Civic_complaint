import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { signJWT, authMiddleware } from '../middleware/auth';
import { ensureSchema } from '../lib/schema';

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// POST /api/v1/auth/login
auth.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) {
    return c.json({ success: false, message: 'Email and password required' }, 400);
  }

  await ensureSchema(c.env.DB);
  const user = await c.env.DB.prepare(
    'SELECT id, name, email, phone, role, password, is_active, community FROM users WHERE email = ?'
  ).bind(email.toLowerCase()).first<any>();

  if (!user || user.password !== password) {
    return c.json({ success: false, message: 'Invalid email or password' }, 401);
  }

  if (user.is_active === 0) {
    return c.json({ success: false, message: 'Account is deactivated' }, 403);
  }

  const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
  const accessToken = await signJWT(payload, c.env.JWT_SECRET, 7 * 86400);
  const refreshToken = await signJWT(payload, c.env.JWT_SECRET, 30 * 86400);

  const { password: _, ...safeUser } = user;
  safeUser._id = user.id;

  return c.json({
    success: true,
    message: 'Login successful',
    data: {
      accessToken,
      refreshToken,
      user: safeUser,
    },
  });
});

// POST /api/v1/auth/signup
auth.post('/signup', async (c) => {
  const { name, email, password, phone } = await c.req.json();
  if (!name || !email || !password) {
    return c.json({ success: false, message: 'Name, email, and password required' }, 400);
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase()).first();
  if (existing) {
    return c.json({ success: false, message: 'Email already registered' }, 409);
  }

  const id = `usr-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    'INSERT INTO users (id, name, email, phone, password, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)'
  ).bind(id, name, email.toLowerCase(), phone || null, password, 'citizen', now, now).run();

  const userObj = { id, _id: id, name, email: email.toLowerCase(), phone, role: 'citizen', isActive: true };
  const payload = { id, email: email.toLowerCase(), role: 'citizen', name };
  const accessToken = await signJWT(payload, c.env.JWT_SECRET, 7 * 86400);
  const refreshToken = await signJWT(payload, c.env.JWT_SECRET, 30 * 86400);

  return c.json({
    success: true,
    message: 'Registration successful',
    data: {
      accessToken,
      refreshToken,
      user: userObj,
    },
  }, 201);
});

// POST /api/v1/auth/phone-login
auth.post('/phone-login', async (c) => {
  const { phone } = await c.req.json();
  return c.json({
    success: true,
    message: 'OTP sent successfully (Demo OTP: 123456)',
    data: { phone },
  });
});

// POST /api/v1/auth/verify-otp
auth.post('/verify-otp', async (c) => {
  const { phone, otp } = await c.req.json();
  if (otp !== '123456') {
    return c.json({ success: false, message: 'Invalid OTP' }, 400);
  }

  let user = await c.env.DB.prepare('SELECT id, name, email, phone, role FROM users WHERE phone = ?').bind(phone).first<any>();
  if (!user) {
    const id = `usr-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const email = `${phone}@citizen.swachhsetu.gov.in`;
    await c.env.DB.prepare(
      'INSERT INTO users (id, name, email, phone, password, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)'
    ).bind(id, `Citizen ${phone.slice(-4)}`, email, phone, 'Demo@1234', 'citizen', now, now).run();
    user = { id, name: `Citizen ${phone.slice(-4)}`, email, phone, role: 'citizen' };
  }

  const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
  const accessToken = await signJWT(payload, c.env.JWT_SECRET, 7 * 86400);
  const refreshToken = await signJWT(payload, c.env.JWT_SECRET, 30 * 86400);
  user._id = user.id;

  return c.json({
    success: true,
    message: 'Phone verified',
    data: {
      accessToken,
      refreshToken,
      user,
    },
  });
});

// GET /api/v1/auth/me
auth.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  const record = await c.env.DB.prepare(
    'SELECT id, name, email, phone, role, is_active, community, created_at FROM users WHERE id = ?'
  ).bind(user.id).first<any>();

  if (!record) {
    return c.json({ success: false, message: 'User not found' }, 404);
  }
  record._id = record.id;
  record.isActive = record.is_active === 1;

  return c.json({ success: true, data: record });
});

// POST /api/v1/auth/refresh-token
auth.post('/refresh-token', async (c) => {
  const { refreshToken } = await c.req.json();
  if (!refreshToken) return c.json({ success: false, message: 'Refresh token required' }, 400);
  const user = await signJWT({ id: 'refreshed', email: '', role: 'citizen', name: '' }, c.env.JWT_SECRET);
  return c.json({
    success: true,
    data: { accessToken: user, refreshToken },
  });
});

export default auth;
