import { Hono } from 'hono';
import { z } from 'zod';
import { categories } from '../lib/intake';
import { authMiddleware } from '../middleware/auth';
import type { Bindings, Variables } from '../types';

const routing = new Hono<{ Bindings: Bindings; Variables: Variables }>();
const ruleInput = z.object({
  zoneId: z.string().min(1),
  departmentId: z.string().min(1),
  category: z.enum(categories),
  officerId: z.string().min(1),
  supervisorId: z.string().min(1),
  south: z.number().min(-90).max(90),
  north: z.number().min(-90).max(90),
  west: z.number().min(-180).max(180),
  east: z.number().min(-180).max(180),
  autoAssign: z.boolean().default(false),
}).refine(rule => rule.south < rule.north && rule.west < rule.east && rule.officerId !== rule.supervisorId);

routing.use('*', authMiddleware, async (c, next) => {
  const admin = await c.env.DB.prepare("SELECT id FROM users WHERE id = ? AND role = 'admin' AND is_active = 1")
    .bind(c.get('user').id).first();
  if (!admin) return c.json({ success: false, message: 'Only administrators can manage routing rules.' }, 403);
  await next();
});

routing.get('/', async c => {
  const rules = await c.env.DB.prepare('SELECT * FROM routing_rules ORDER BY zone_id, category').all();
  return c.json({ success: true, data: rules.results });
});

routing.put('/staff/:id', async c => {
  const parsed = z.object({
    zoneId: z.string().min(1),
    departmentId: z.string().min(1),
  }).safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ success: false, message: 'Select a ward and department.' }, 400);
  const { zoneId, departmentId } = parsed.data;
  const result = await c.env.DB.prepare(`
    UPDATE users SET zone_id = ?, department_id = ?, updated_at = ?
    WHERE id = ? AND is_active = 1 AND role IN ('officer','field_worker')
    AND EXISTS (SELECT 1 FROM zones WHERE id = ? AND is_active = 1)
    AND EXISTS (SELECT 1 FROM departments WHERE id = ? AND is_active = 1)
  `).bind(zoneId, departmentId, new Date().toISOString(), c.req.param('id'), zoneId, departmentId).run();
  if (!result.meta.changes) return c.json({ success: false, message: 'Active staff, ward or department not found.' }, 404);
  return c.json({ success: true, data: { zoneId, departmentId } });
});

routing.put('/', async c => {
  const parsed = ruleInput.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ success: false, message: 'Check the route, contacts and geographic bounds.' }, 400);
  const rule = parsed.data;
  const valid = await c.env.DB.prepare(`
    SELECT 1 FROM zones z, departments d, users o, users s
    WHERE z.id = ? AND d.id = ? AND o.id = ? AND s.id = ?
      AND z.is_active = 1 AND d.is_active = 1 AND o.is_active = 1 AND s.is_active = 1
      AND o.role = 'officer' AND o.zone_id = z.id AND o.department_id = d.id
      AND (s.role = 'admin' OR (s.role = 'officer' AND s.department_id = d.id))
  `).bind(rule.zoneId, rule.departmentId, rule.officerId, rule.supervisorId).first();
  if (!valid) return c.json({ success: false, message: 'Select active staff, ward and department with matching coverage.' }, 400);
  await c.env.DB.prepare(`
    INSERT INTO routing_rules (id, zone_id, department_id, category, officer_id, supervisor_id, south, west, north, east, auto_assign)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(zone_id, category) DO UPDATE SET department_id = excluded.department_id,
      officer_id = excluded.officer_id, supervisor_id = excluded.supervisor_id, south = excluded.south,
      west = excluded.west, north = excluded.north, east = excluded.east, auto_assign = excluded.auto_assign
  `).bind(crypto.randomUUID(), rule.zoneId, rule.departmentId, rule.category, rule.officerId, rule.supervisorId,
    rule.south, rule.west, rule.north, rule.east, rule.autoAssign ? 1 : 0).run();
  return c.json({ success: true, data: rule });
});

export default routing;
