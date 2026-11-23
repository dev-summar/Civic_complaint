import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';

const departments = new Hono<{ Bindings: Bindings; Variables: Variables }>();

departments.get('/', async (c) => {
  const rows = await c.env.DB.prepare('SELECT * FROM departments ORDER BY name ASC').all<any>();
  const list = (rows.results || []).map(r => ({ ...r, _id: r.id }));
  return c.json({ success: true, data: list });
});

departments.post('/', authMiddleware, async (c) => {
  const { name, code, description } = await c.req.json();
  const id = `dept-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    'INSERT INTO departments (id, name, code, description, is_active, created_at) VALUES (?, ?, ?, ?, 1, ?)'
  ).bind(id, name, code.toUpperCase(), description || '', now).run();

  const dept = { id, _id: id, name, code: code.toUpperCase(), description, isActive: true };
  return c.json({ success: true, data: dept }, 201);
});

departments.patch('/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const { name, code, description } = await c.req.json();

  await c.env.DB.prepare(
    'UPDATE departments SET name = COALESCE(?, name), code = COALESCE(?, code), description = COALESCE(?, description) WHERE id = ?'
  ).bind(name || null, code ? code.toUpperCase() : null, description || null, id).run();

  const dept = await c.env.DB.prepare('SELECT * FROM departments WHERE id = ?').bind(id).first<any>();
  dept._id = dept.id;
  return c.json({ success: true, data: dept });
});

departments.delete('/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM departments WHERE id = ?').bind(id).run();
  return c.json({ success: true, message: 'Department deleted' });
});

export default departments;
