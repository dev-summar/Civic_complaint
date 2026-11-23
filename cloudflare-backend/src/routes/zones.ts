import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';

const zones = new Hono<{ Bindings: Bindings; Variables: Variables }>();

zones.get('/', async (c) => {
  const rows = await c.env.DB.prepare('SELECT * FROM zones ORDER BY name ASC').all<any>();
  const list = (rows.results || []).map(r => ({ ...r, _id: r.id }));
  return c.json({ success: true, data: list });
});

zones.post('/', authMiddleware, async (c) => {
  const { name, code, district } = await c.req.json();
  const id = `zone-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    'INSERT INTO zones (id, name, code, district, is_active, created_at) VALUES (?, ?, ?, ?, 1, ?)'
  ).bind(id, name, code.toUpperCase(), district || '', now).run();

  const zone = { id, _id: id, name, code: code.toUpperCase(), district, isActive: true };
  return c.json({ success: true, data: zone }, 201);
});

zones.patch('/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const { name, code, district } = await c.req.json();

  await c.env.DB.prepare(
    'UPDATE zones SET name = COALESCE(?, name), code = COALESCE(?, code), district = COALESCE(?, district) WHERE id = ?'
  ).bind(name || null, code ? code.toUpperCase() : null, district || null, id).run();

  const zone = await c.env.DB.prepare('SELECT * FROM zones WHERE id = ?').bind(id).first<any>();
  zone._id = zone.id;
  return c.json({ success: true, data: zone });
});

zones.delete('/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM zones WHERE id = ?').bind(id).run();
  return c.json({ success: true, message: 'Zone deleted' });
});

export default zones;
