import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';

const audit = new Hono<{ Bindings: Bindings; Variables: Variables }>();

audit.get('/', authMiddleware, async (c) => {
  const rows = await c.env.DB.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100').all<any>();
  const list = (rows.results || []).map(r => ({
    _id: r.id,
    id: r.id,
    action: r.action,
    resource: r.resource,
    resourceId: r.resource_id,
    actor: { name: r.actor_name || 'System', role: r.actor_role || 'system' },
    ip: r.ip,
    createdAt: r.created_at,
  }));
  return c.json({ success: true, data: list });
});

export default audit;
