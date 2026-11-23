import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';

const notifications = new Hono<{ Bindings: Bindings; Variables: Variables }>();

function toNotification(r: any) {
  return {
    _id: r.id,
    id: r.id,
    title: r.title,
    body: r.body,
    type: r.type || 'complaint_update',
    isRead: r.is_read === 1,
    data: r.complaint_id ? { complaintId: r.complaint_id } : undefined,
    createdAt: r.created_at,
  };
}

notifications.get('/', authMiddleware, async (c) => {
  const user = c.get('user');
  const rows = await c.env.DB.prepare(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100'
  ).bind(user.id).all<any>();
  return c.json({ success: true, data: (rows.results || []).map(toNotification) });
});

notifications.get('/unread-count', authMiddleware, async (c) => {
  const user = c.get('user');
  const row = await c.env.DB.prepare(
    'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0'
  ).bind(user.id).first<{ count: number }>();
  return c.json({ success: true, data: { count: Number(row?.count) || 0 } });
});

notifications.patch('/read-all', authMiddleware, async (c) => {
  const user = c.get('user');
  await c.env.DB.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').bind(user.id).run();
  return c.json({ success: true, message: 'All notifications marked read' });
});

notifications.patch('/:id/read', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  await c.env.DB.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').bind(id, user.id).run();
  const row = await c.env.DB.prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?').bind(id, user.id).first<any>();
  if (!row) return c.json({ success: false, message: 'Notification not found' }, 404);
  return c.json({ success: true, data: toNotification(row) });
});

export default notifications;
