import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';
import { notify } from '../lib/schema';

const assignments = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const SELECT_ASSIGNMENTS = `
  SELECT a.*, c.title as complaint_title, c.description as complaint_description,
         c.category as complaint_category, c.status as complaint_status,
         c.priority as complaint_priority, c.media as complaint_media,
         c.latitude as complaint_latitude, c.longitude as complaint_longitude,
         c.address as complaint_address, c.created_at as complaint_created_at,
         c.updated_at as complaint_updated_at, c.citizen_id as complaint_citizen_id,
         w.name as worker_name, w.phone as worker_phone
  FROM assignments a
  LEFT JOIN complaints c ON a.complaint_id = c.id
  LEFT JOIN users w ON a.worker_id = w.id
`;

function parseMedia(value: string | null) {
  try {
    const media = JSON.parse(value || '[]');
    return Array.isArray(media) ? media : [];
  } catch {
    return [];
  }
}

function toAssignment(r: any) {
  return {
    _id: r.id,
    id: r.id,
    status: r.status,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    complaint: {
      _id: r.complaint_id,
      id: r.complaint_id,
      title: r.complaint_title || 'Complaint',
      description: r.complaint_description || '',
      category: r.complaint_category || 'others',
      status: r.complaint_status || 'assigned',
      priority: r.complaint_priority || 'medium',
      media: parseMedia(r.complaint_media),
      address: r.complaint_address || '',
      createdAt: r.complaint_created_at,
      updatedAt: r.complaint_updated_at,
      location: { latitude: r.complaint_latitude, longitude: r.complaint_longitude, address: r.complaint_address },
    },
    worker: { _id: r.worker_id, id: r.worker_id, name: r.worker_name, phone: r.worker_phone },
  };
}

// GET /api/v1/assignments
assignments.get('/', authMiddleware, async (c) => {
  const user = c.get('user');
  let query = SELECT_ASSIGNMENTS;
  const params: any[] = [];

  if (user.role === 'field_worker') {
    query += ' WHERE a.worker_id = ?';
    params.push(user.id);
  }
  query += ' ORDER BY a.created_at DESC';

  const rows = await c.env.DB.prepare(query).bind(...params).all<any>();
  return c.json({ success: true, data: (rows.results || []).map(toAssignment) });
});

// GET /api/v1/assignments/:id
assignments.get('/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const row = await c.env.DB.prepare(`${SELECT_ASSIGNMENTS} WHERE a.id = ?`).bind(c.req.param('id')).first<any>();
  if (!row || (user.role === 'field_worker' && row.worker_id !== user.id)) {
    return c.json({ success: false, message: 'Assignment not found' }, 404);
  }
  return c.json({ success: true, data: toAssignment(row) });
});

// PATCH /api/v1/assignments/:id/status
assignments.patch('/:id/status', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  const { status, notes } = await c.req.json().catch(() => ({}));
  if (!['pending', 'active', 'completed', 'cancelled'].includes(status)) {
    return c.json({ success: false, message: 'Unknown assignment status.' }, 400);
  }

  const current = await c.env.DB.prepare('SELECT * FROM assignments WHERE id = ?').bind(id).first<any>();
  if (!current) return c.json({ success: false, message: 'Assignment not found' }, 404);
  if (user.role === 'field_worker' && current.worker_id !== user.id) {
    return c.json({ success: false, message: 'This job is assigned to someone else.' }, 403);
  }
  if (user.role === 'citizen') {
    return c.json({ success: false, message: 'Not allowed.' }, 403);
  }

  const db = c.env.DB;
  const comp = await db.prepare('SELECT id, title, citizen_id, assigned_officer_id FROM complaints WHERE id = ?')
    .bind(current.complaint_id).first<{ id: string; title: string; citizen_id: string | null; assigned_officer_id: string | null }>();
  if (!comp) return c.json({ success: false, message: 'Complaint not found.' }, 404);
  const now = new Date().toISOString();
  const eventId = crypto.randomUUID();
  const note = typeof notes === 'string' ? notes.slice(0, 500) : null;
  const action = { pending: 'Assignment pending', active: 'Assignment started', completed: 'Assignment completed', cancelled: 'Assignment cancelled' }[status as 'pending' | 'active' | 'completed' | 'cancelled'];
  const statements = [
    db.prepare(`
      INSERT INTO complaint_workflow_events (id, complaint_id, actor_id, action, description, created_at)
      SELECT ?, c.id, ?, ?, ?, ? FROM assignments a JOIN complaints c ON c.id = a.complaint_id
      WHERE a.id = ? AND a.status IN ('pending', 'active') AND a.updated_at = ?
        AND c.assigned_worker_id = a.worker_id AND c.status IN ('assigned', 'in_progress')
        AND a.status <> ?
    `).bind(eventId, user.id, action, note || action, now, id, current.updated_at, status),
    db.prepare(`
      UPDATE assignments SET status = ?, notes = COALESCE(?, notes), updated_at = ? WHERE id = ?
      AND EXISTS (SELECT 1 FROM complaint_workflow_events WHERE id = ?)
    `).bind(status, note, now, id, eventId),
  ];
  if (status === 'completed') {
    statements.push(db.prepare(`
      UPDATE complaints SET status = 'resolved', resolution_notes = COALESCE(?, resolution_notes), resolved_at = ?, updated_at = ?
      WHERE id = ? AND EXISTS (SELECT 1 FROM complaint_workflow_events WHERE id = ?)
    `).bind(note, now, now, comp.id, eventId));
  } else if (status === 'active') {
    statements.push(db.prepare(`
      UPDATE complaints SET status = 'in_progress', started_at = COALESCE(started_at, ?), updated_at = ?
      WHERE id = ? AND EXISTS (SELECT 1 FROM complaint_workflow_events WHERE id = ?)
    `).bind(now, now, comp.id, eventId));
  } else if (status === 'cancelled') {
    statements.push(db.prepare(`
      UPDATE complaints SET status = 'submitted', assigned_worker_id = NULL, updated_at = ?
      WHERE id = ? AND EXISTS (SELECT 1 FROM complaint_workflow_events WHERE id = ?)
    `).bind(now, comp.id, eventId),
    db.prepare(`
      UPDATE complaint_workflow SET review_reason = 'Field assignment cancelled. Choose another worker.'
      WHERE complaint_id = ? AND EXISTS (SELECT 1 FROM complaint_workflow_events WHERE id = ?)
    `).bind(comp.id, eventId));
  }
  const results = await db.batch(statements);
  if (!results[0].meta.changes && current.status !== status) {
    return c.json({ success: false, message: 'This assignment is no longer current. Refresh and retry.' }, 409);
  }
  if (results[0].meta.changes) {
    await notify(db, comp.citizen_id, action, comp.title, comp.id);
    await notify(db, comp.assigned_officer_id, action, comp.title, comp.id);
  }

  const row = await c.env.DB.prepare(`${SELECT_ASSIGNMENTS} WHERE a.id = ?`).bind(id).first<any>();
  return c.json({ success: true, data: row ? toAssignment(row) : null });
});

export default assignments;
