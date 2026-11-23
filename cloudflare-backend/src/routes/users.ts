import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';

const users = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /api/v1/users
users.get('/', authMiddleware, async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT id, name, email, phone, role, is_active, created_at FROM users ORDER BY created_at DESC'
  ).all<any>();

  const list = (rows.results || []).map(r => ({
    ...r,
    _id: r.id,
    isActive: r.is_active === 1,
  }));

  return c.json({ success: true, data: list });
});

// GET /api/v1/users/workers
users.get('/workers', authMiddleware, async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT id, name, email, phone, role FROM users WHERE role = "field_worker" AND is_active = 1'
  ).all<any>();

  const list = (rows.results || []).map(r => ({ ...r, _id: r.id }));
  return c.json({ success: true, data: list });
});

// GET /api/v1/users/officers
users.get('/officers', authMiddleware, async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT id, name, email, phone, role FROM users WHERE role = "officer" AND is_active = 1'
  ).all<any>();

  const list = (rows.results || []).map(r => ({ ...r, _id: r.id }));
  return c.json({ success: true, data: list });
});

// GET /api/v1/users/:id
users.get('/:id', authMiddleware, async (c) => {
  const record = await c.env.DB.prepare(
    'SELECT id, name, email, phone, role, is_active, community, created_at FROM users WHERE id = ?'
  ).bind(c.req.param('id')).first<any>();
  if (!record) return c.json({ success: false, message: 'User not found' }, 404);
  return c.json({ success: true, data: { ...record, _id: record.id, isActive: record.is_active === 1 } });
});

// POST /api/v1/users
users.post('/', authMiddleware, async (c) => {
  if (c.get('user').role !== 'admin') {
    return c.json({ success: false, message: 'Only an admin can create users.' }, 403);
  }
  const { name, email, password, phone, role } = await c.req.json().catch(() => ({}));
  if (!name || !email) return c.json({ success: false, message: 'Name and email are required.' }, 400);
  if (role && !['citizen', 'officer', 'field_worker', 'admin'].includes(role)) {
    return c.json({ success: false, message: 'Unknown role.' }, 400);
  }
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(String(email).toLowerCase()).first();
  if (existing) return c.json({ success: false, message: 'A user with this email already exists.' }, 409);
  const id = `usr-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    'INSERT INTO users (id, name, email, phone, password, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)'
  ).bind(id, name, email.toLowerCase(), phone || null, password || 'Demo@1234', role || 'citizen', now, now).run();

  const user = { id, _id: id, name, email, phone, role: role || 'citizen', isActive: true };
  return c.json({ success: true, data: user }, 201);
});

// PATCH /api/v1/users/profile — the signed-in user's own name, phone, community
users.patch('/profile', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const community = typeof body.community === 'string' ? body.community.trim().slice(0, 80) : null;
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    'UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), community = COALESCE(?, community), updated_at = ? WHERE id = ?'
  ).bind(body.name || null, body.phone || null, community, now, user.id).run();

  const record = await c.env.DB.prepare(
    'SELECT id, name, email, phone, role, is_active, community FROM users WHERE id = ?'
  ).bind(user.id).first<any>();
  if (!record) return c.json({ success: false, message: 'User not found' }, 404);
  record._id = record.id;
  record.isActive = record.is_active === 1;
  return c.json({ success: true, data: record });
});

// PATCH /api/v1/users/:id
users.patch('/:id', authMiddleware, async (c) => {
  if (c.get('user').role !== 'admin') {
    return c.json({ success: false, message: 'Only administrators can update staff records.' }, 403);
  }
  const id = c.req.param('id');
  const body = await c.req.json();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    'UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), role = COALESCE(?, role), updated_at = ? WHERE id = ?'
  ).bind(body.name || null, body.phone || null, body.role || null, now, id).run();

  const user = await c.env.DB.prepare('SELECT id, name, email, phone, role, is_active FROM users WHERE id = ?').bind(id).first<any>();
  if (!user) return c.json({ success: false, message: 'User not found' }, 404);
  user._id = user.id;
  user.isActive = user.is_active === 1;

  return c.json({ success: true, data: user });
});

// PATCH /api/v1/users/:id/status
users.patch('/:id/status', authMiddleware, async (c) => {
  if (c.get('user').role !== 'admin') {
    return c.json({ success: false, message: 'Only administrators can change user status.' }, 403);
  }
  const id = c.req.param('id');
  const { isActive } = await c.req.json();
  const now = new Date().toISOString();

  await c.env.DB.prepare('UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?').bind(isActive ? 1 : 0, now, id).run();

  return c.json({ success: true, message: 'Status updated' });
});

// DELETE /api/v1/users/:id
users.delete('/:id', authMiddleware, async (c) => {
  if (c.get('user').role !== 'admin') {
    return c.json({ success: false, message: 'Only administrators can delete users.' }, 403);
  }
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
  return c.json({ success: true, message: 'User deleted' });
});

export default users;
