import { Hono, Context } from 'hono';
import { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';
import { storeComplaintMedia } from './media';
import { notify } from '../lib/schema';
import { categories, languages, triageComplaint, type Priority } from '../lib/intake';
import { deadlines, routeComplaint, workflowEvent, workflowFields, workflowNotice } from '../lib/workflow';

const complaints = new Hono<{ Bindings: Bindings; Variables: Variables }>();
type Ctx = Context<{ Bindings: Bindings; Variables: Variables }>;

async function broadcastEvent(env: Bindings, event: string, data: any) {
  try {
    const id = env.BROADCASTER.idFromName('global');
    const stub = env.BROADCASTER.get(id);
    await stub.fetch('http://do/broadcast', {
      method: 'POST',
      body: JSON.stringify({ event, data }),
    });
  } catch (err) {
    console.error('DO broadcast error:', err);
  }
}

// GET /api/v1/complaints
complaints.get('/', authMiddleware, async (c) => {
  const user = c.get('user');
  const { status, category } = c.req.query();

  let query = `SELECT complaints.*, ${workflowFields} FROM complaints
    LEFT JOIN complaint_workflow w ON w.complaint_id = complaints.id WHERE 1=1`;
  const params: any[] = [];

  if (user.role === 'citizen') {
    query += ' AND citizen_id = ?';
    params.push(user.id);
  } else if (user.role === 'field_worker') {
    query += ' AND assigned_worker_id = ?';
    params.push(user.id);
  } else if (user.role === 'officer') {
    query += ` AND (assigned_officer_id = ? OR NOT EXISTS (
      SELECT 1 FROM routing_rules r JOIN demo_routing_targets t ON t.rule_id = r.id WHERE r.officer_id = ?
    ))`;
    params.push(user.id, user.id);
  }

  const statuses = (status || '').split(',').map(s => s.trim()).filter(Boolean);
  if (statuses.length) {
    query += ` AND status IN (${statuses.map(() => '?').join(', ')})`;
    params.push(...statuses);
  }

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  query += user.role === 'citizen'
    ? ' ORDER BY created_at DESC'
    : " ORDER BY CASE WHEN status IN ('resolved', 'closed', 'rejected') THEN 1 ELSE 0 END, CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at DESC";

  const rows = await c.env.DB.prepare(query).bind(...params).all<any>();
  const list = (rows.results || []).map(r => ({
    ...r,
    _id: r.id,
    media: JSON.parse(r.media || '[]'),
    location: { latitude: r.latitude, longitude: r.longitude, address: r.address },
  }));

  return c.json({ success: true, data: list });
});

// GET /api/v1/complaints/mine
complaints.get('/mine', authMiddleware, async (c) => {
  const user = c.get('user');
  const rows = await c.env.DB.prepare(
    `SELECT complaints.*, ${workflowFields} FROM complaints
     LEFT JOIN complaint_workflow w ON w.complaint_id = complaints.id WHERE citizen_id = ? ORDER BY created_at DESC`
  ).bind(user.id).all<any>();

  const list = (rows.results || []).map(r => ({
    ...r,
    _id: r.id,
    media: JSON.parse(r.media || '[]'),
    location: { latitude: r.latitude, longitude: r.longitude, address: r.address },
  }));

  return c.json({ success: true, data: list });
});

function usablePoint(latitude: unknown, longitude: unknown) {
  let lat = Number(latitude);
  let lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat >= 60 && lat <= 90 && lng >= 8 && lng <= 45) {
    const swapped = lat;
    lat = lng;
    lng = swapped;
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return null;
  return {latitude: lat, longitude: lng};
}

function distanceKm(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const earth = 6371;
  const lat = ((toLat - fromLat) * Math.PI) / 180;
  const lng = ((toLng - fromLng) * Math.PI) / 180;
  const a = Math.sin(lat / 2) ** 2
    + Math.cos((fromLat * Math.PI) / 180) * Math.cos((toLat * Math.PI) / 180) * Math.sin(lng / 2) ** 2;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(a)));
}

// GET /api/v1/complaints/nearby?latitude=&longitude=&radius=5000
complaints.get('/nearby', authMiddleware, async (c) => {
  const origin = usablePoint(c.req.query('latitude'), c.req.query('longitude'));
  if (!origin) return c.json({success: false, message: 'A valid location is required.'}, 400);
  const requested = Number(c.req.query('radius'));
  const radiusKm = Math.min(25, Math.max(0.2, Number.isFinite(requested) ? requested / 1000 : 5));
  const rows = await c.env.DB.prepare(
    'SELECT * FROM complaints ORDER BY created_at DESC LIMIT 200'
  ).all<any>();

  const list = (rows.results || []).flatMap(r => {
    const point = usablePoint(r.latitude, r.longitude);
    if (!point || distanceKm(origin.latitude, origin.longitude, point.latitude, point.longitude) > radiusKm) return [];
    return [{
      ...r,
      _id: r.id,
      media: JSON.parse(r.media || '[]'),
      location: {...point, address: r.address},
    }];
  });

  return c.json({ success: true, data: list });
});

// POST /api/v1/complaints
complaints.post('/', authMiddleware, async (c) => {
  const user = c.get('user');
  let body: any = {};
  try {
    const contentType = c.req.header('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const form = await c.req.parseBody();
      let location: any = form.location;
      if (typeof location === 'string') {
        try {
          location = JSON.parse(location);
        } catch {
          location = null;
        }
      }
      body = {
        title: form.title,
        description: form.description,
        category: form.category,
        priority: form.priority,
        isAnonymous: form.isAnonymous === 'true' || form.isAnonymous === '1',
        address: form.address,
        latitude: form.latitude,
        longitude: form.longitude,
        location,
        language: form.language,
      };
    } else {
      body = await c.req.json();
    }
  } catch {
    return c.json({ success: false, message: 'Complaint details could not be read.' }, 400);
  }

  if (typeof body?.title !== 'string' || !body.title.trim() ||
      typeof body.description !== 'string' || !body.description.trim() || typeof body.category !== 'string' || !body.category.trim()) {
    return c.json({ success: false, message: 'Title, description and category are required.' }, 400);
  }

  const rawLat = body.location?.latitude ?? body.latitude;
  const rawLng = body.location?.longitude ?? body.longitude;
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  if (rawLat == null || rawLng == null || rawLat === '' || rawLng === '' ||
      !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return c.json({ success: false, message: 'A GPS location is required to register this complaint.' }, 400);
  }
  const address = body.location?.address ?? body.address ?? '';
  const requestId = body.clientRequestId;
  if (requestId !== undefined && (typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(requestId))) {
    return c.json({ success: false, message: 'Invalid submission reference.' }, 400);
  }
  const payloadHash = requestId ? Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',
    new TextEncoder().encode(JSON.stringify({
      title: body.title, description: body.description, category: body.category,
      priority: body.priority ?? null, lat, lng, address,
      isAnonymous: !!body.isAnonymous, media: body.media ?? [], language: body.language ?? 'en',
      originalReport: body.originalReport ?? null,
    })),
  ))).map(byte => byte.toString(16).padStart(2, '0')).join('') : null;
  const existingSubmission = () => c.env.DB.prepare(`
    SELECT complaints.*, ${workflowFields}, k.payload_hash FROM complaint_submission_keys k
    JOIN complaints ON complaints.id = k.complaint_id
    LEFT JOIN complaint_workflow w ON w.complaint_id = complaints.id
    WHERE k.citizen_id = ? AND k.request_id = ?
  `).bind(user.id, requestId).first<any>();
  if (requestId) {
    const existing = await existingSubmission();
    if (existing) {
      if (existing.payload_hash !== payloadHash) return c.json({ success: false, message: 'This submission reference has already been used.' }, 409);
      delete existing.payload_hash;
      return c.json({ success: true, data: toComplaint(existing) });
    }
  }
  const requested: Priority = ['low', 'medium', 'high', 'critical'].includes(body.priority) ? body.priority : 'medium';
  const photoCategory = categories.includes(body.aiCategory) ? body.aiCategory : null;
  const language = languages.includes(body.language) ? body.language : 'en';
  const original = typeof body.originalReport === 'string' ? body.originalReport.trim().slice(0, 3000) : null;
  const triage = await triageComplaint(c.env, body.title.slice(0, 100),
    original ? body.description.slice(0, 500) + '\nOriginal: ' + original : body.description.slice(0, 1500),
    body.category.slice(0, 100), requested, photoCategory);
  const { priority } = triage;
  const { rule, officerId, workerId, reviewReason } = await routeComplaint(c.env.DB, {
    category: triage.category, lat, lng, priority, review: triage.review,
    citizenId: user.id, selectedCategory: body.category,
  });
  const category = rule?.demo_worker_id ? rule.category : triage.category;

  const id = `cmp-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const due = deadlines(priority, now);
  const status = workerId ? 'assigned' : 'submitted';
  let media: { url: string; type: 'image' | 'video' }[] = [];
  try {
    media = await storeComplaintMedia(
      c.env.DB,
      new URL(c.req.url).origin,
      id,
      Array.isArray(body.media) ? body.media : [],
    );
  } catch (err) {
    console.error('complaint photo save failed', err);
    media = [];
  }
  const mediaStr = JSON.stringify(media);
  body.media = media;

  try {
    const db = c.env.DB;
    const statements = [db.prepare(
      `INSERT INTO complaints (
        id, title, description, category, status, priority,
        citizen_id, latitude, longitude, address, is_anonymous, media,
        ai_category, ai_summary, created_at, updated_at, department_id, zone_id,
        assigned_officer_id, assigned_worker_id, assigned_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      body.title,
      body.description,
      category,
      status,
      priority,
      body.isAnonymous ? null : user.id,
      lat,
      lng,
      address,
      body.isAnonymous ? 1 : 0,
      mediaStr,
      photoCategory,
      typeof body.aiSummary === 'string' ? body.aiSummary.slice(0, 300) : null,
      now,
      now, rule?.department_id ?? null, rule?.zone_id ?? null, officerId, workerId, workerId ? now : null,
    ), db.prepare(`
      INSERT INTO complaint_workflow (complaint_id, language, original_report, triage_reason, review_reason,
        supervisor_id, assignment_due_at, resolution_due_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, language, original, triage.reason, reviewReason, rule?.supervisor_id ?? null, due.assignment, due.resolution),
    workflowEvent(db, id, null, 'Triaged', priority.toUpperCase() + ' · ' + triage.reason, now)];
    if (requestId) statements.push(db.prepare(`
      INSERT INTO complaint_submission_keys (citizen_id, request_id, complaint_id, payload_hash)
      VALUES (?, ?, ?, ?)
    `).bind(user.id, requestId, id, payloadHash));
    if (workerId) {
      statements.push(db.prepare(`
        INSERT INTO assignments (id, complaint_id, officer_id, worker_id, status, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'pending', 'Automatic ward routing', ?, ?)
      `).bind('asg-' + crypto.randomUUID(), id, officerId, workerId, now, now),
      workflowEvent(db, id, null, 'Automatically assigned',
        rule?.demo_worker_id ? 'Matched the service area and selected complaint category.' : 'Matched category, ward and eligible worker workload.', now),
      workflowNotice(db, id + ':worker', workerId, id, 'New job assigned', body.title, now));
    }
    if (officerId) statements.push(workflowNotice(db, id + ':officer', officerId, id,
      workerId ? 'Complaint automatically assigned' : 'Complaint awaiting review', body.title, now));
    if (!body.isAnonymous) statements.push(workflowNotice(db, id + ':citizen', user.id, id,
      workerId ? 'Report filed and assigned' : 'Report filed', body.title, now));
    await db.batch(statements);
  } catch (err) {
    if (media.length) {
      await c.env.DB.prepare(`DELETE FROM complaint_media WHERE complaint_id = ?
        AND NOT EXISTS (SELECT 1 FROM complaints WHERE id = ?)`).bind(id, id).run();
    }
    if (requestId) {
      const existing = await existingSubmission();
      if (existing?.payload_hash === payloadHash) {
        delete existing.payload_hash;
        return c.json({ success: true, data: toComplaint(existing) });
      }
      if (existing) return c.json({ success: false, message: 'This submission reference has already been used.' }, 409);
    }
    console.error('complaint insert failed', err);
    return c.json({ success: false, message: 'Could not save the complaint. Try again.' }, 500);
  }

  const complaint = {
    id,
    _id: id,
    title: body.title,
    description: body.description,
    category,
    status,
    priority,
    assignmentDueAt: due.assignment,
    resolutionDueAt: due.resolution,
    location: { latitude: lat, longitude: lng, address },
    media: body.media || [],
    createdAt: now,
    updatedAt: now,
  };

  // Broadcast to WebSockets
  await broadcastEvent(c.env, 'complaint:created', complaint);

  const saved = await c.env.DB.prepare(`SELECT complaints.*, ${workflowFields} FROM complaints
    LEFT JOIN complaint_workflow w ON w.complaint_id = complaints.id WHERE complaints.id = ?`).bind(id).first<any>();
  return c.json({ success: true, message: 'Complaint filed successfully', data: toComplaint(saved) }, 201);
});

// GET /api/v1/complaints/:id
complaints.get('/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const r = await c.env.DB.prepare(`SELECT complaints.*, ${workflowFields} FROM complaints
    LEFT JOIN complaint_workflow w ON w.complaint_id = complaints.id WHERE complaints.id = ?`).bind(id).first<any>();

  if (!r) return c.json({ success: false, message: 'Complaint not found' }, 404);

  const detail = {
    ...r,
    _id: r.id,
    media: JSON.parse(r.media || '[]'),
    location: { latitude: r.latitude, longitude: r.longitude, address: r.address },
  };

  return c.json({ success: true, data: detail });
});

// GET /api/v1/complaints/:id/timeline
complaints.get('/:id/timeline', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const comp = await c.env.DB.prepare('SELECT * FROM complaints WHERE id = ?').bind(id).first<any>();
  if (!comp) return c.json({ success: false, message: 'Complaint not found' }, 404);

  const timeline: { action: string; status: string; description: string; createdAt: string }[] = [
    { action: 'Submitted', status: 'submitted', description: 'Complaint filed by citizen', createdAt: comp.created_at },
  ];

  const wasAssigned = ['assigned', 'in_progress', 'resolved', 'closed'].includes(comp.status) || comp.assigned_at;
  if (wasAssigned) {
    const worker = comp.assigned_worker_id
      ? await c.env.DB.prepare('SELECT name FROM users WHERE id = ?').bind(comp.assigned_worker_id).first<any>()
      : null;
    timeline.push({
      action: 'Assigned',
      status: 'assigned',
      description: worker?.name ? `Assigned to ${worker.name}` : 'Assigned to field team',
      createdAt: comp.assigned_at || comp.updated_at,
    });
  }
  if (comp.started_at) {
    timeline.push({ action: 'Work started', status: 'in_progress', description: 'Field worker started the job', createdAt: comp.started_at });
  }
  if (Number(comp.reopen_count) > 0) {
    timeline.push({
      action: 'Reopened',
      status: 'in_progress',
      description: comp.citizen_feedback ? `Citizen says it is not fixed: ${comp.citizen_feedback}` : 'Citizen says it is not fixed',
      createdAt: comp.updated_at,
    });
  }
  if (comp.status === 'resolved' || comp.status === 'closed') {
    timeline.push({ action: 'Resolved', status: 'resolved', description: comp.resolution_notes || 'Civic issue resolved', createdAt: comp.resolved_at || comp.updated_at });
  }
  if (comp.status === 'closed') {
    timeline.push({ action: 'Confirmed by citizen', status: 'closed', description: comp.citizen_feedback || 'Citizen confirmed the spot is clean', createdAt: comp.closed_at || comp.updated_at });
  }

  const events = await c.env.DB.prepare(`
    SELECT action, description, created_at AS createdAt FROM complaint_workflow_events WHERE complaint_id = ?
  `).bind(id).all<typeof timeline[number]>();
  const combined = timeline.concat(events.results).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return c.json({ success: true, data: combined });
});

async function listCommentsHandler(c: Ctx) {
  const id = c.req.param('id');
  const rows = await c.env.DB.prepare(
    'SELECT * FROM comments WHERE complaint_id = ? ORDER BY created_at ASC'
  ).bind(id).all<any>();

  const list = (rows.results || []).map(r => ({
    _id: r.id,
    id: r.id,
    text: r.text,
    complaint: r.complaint_id,
    author: { name: r.user_name || 'User' },
    createdAt: r.created_at,
  }));

  return c.json({ success: true, data: list });
}

async function addCommentHandler(c: Ctx) {
  const id = c.req.param('id');
  const user = c.get('user');
  const { text } = await c.req.json().catch(() => ({}));

  if (!text || !String(text).trim()) return c.json({ success: false, message: 'Text required' }, 400);

  const commentId = `cmt-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    'INSERT INTO comments (id, complaint_id, user_id, user_name, text, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(commentId, id, user.id, user.name, text, now).run();

  const comment = {
    _id: commentId,
    id: commentId,
    text,
    complaint: id,
    author: { name: user.name },
    createdAt: now,
  };

  return c.json({ success: true, data: comment }, 201);
}

complaints.get('/:id/comments', authMiddleware, listCommentsHandler);
complaints.post('/:id/comments', authMiddleware, addCommentHandler);

export const comments = new Hono<{ Bindings: Bindings; Variables: Variables }>();
comments.get('/:id', authMiddleware, listCommentsHandler);
comments.post('/:id', authMiddleware, addCommentHandler);

function toComplaint(r: any) {
  return {
    ...r,
    _id: r.id,
    media: JSON.parse(r.media || '[]'),
    location: { latitude: r.latitude, longitude: r.longitude, address: r.address },
  };
}

async function assignHandler(c: Ctx) {
  const id = c.req.param('id');
  const user = c.get('user');
  if (!['officer', 'admin'].includes(user.role)) {
    return c.json({ success: false, message: 'Only an officer or admin can assign workers.' }, 403);
  }
  const { workerId, notes } = await c.req.json().catch(() => ({}));
  if (!workerId) return c.json({ success: false, message: 'Pick a field worker to assign.' }, 400);

  const comp = await c.env.DB.prepare('SELECT * FROM complaints WHERE id = ?').bind(id).first<any>();
  if (!comp) return c.json({ success: false, message: 'Complaint not found' }, 404);
  if (user.role === 'officer' && comp.assigned_officer_id && comp.assigned_officer_id !== user.id) {
    return c.json({ success: false, message: 'Only the responsible officer or an administrator can assign this case.' }, 403);
  }
  if (['resolved', 'closed', 'rejected'].includes(comp.status)) {
    return c.json({ success: false, message: `This complaint is already ${comp.status}.` }, 400);
  }
  const worker = await c.env.DB.prepare(
    "SELECT id, name, zone_id, department_id FROM users WHERE id = ? AND role = 'field_worker' AND is_active = 1"
  ).bind(workerId).first<any>();
  if (!worker) return c.json({ success: false, message: 'That field worker was not found or is inactive.' }, 400);

  if ((comp.zone_id && comp.zone_id !== worker.zone_id) ||
      (comp.department_id && comp.department_id !== worker.department_id)) {
    return c.json({ success: false, message: 'Choose a worker from the complaint ward and department.' }, 400);
  }
  const now = new Date().toISOString();
  const db = c.env.DB;
  const coveringOfficer = comp.zone_id ? null : await db.prepare(`
    SELECT id FROM users WHERE is_active = 1 AND role = 'officer' AND zone_id = ? AND department_id = ?
    ORDER BY id LIMIT 1
  `).bind(worker.zone_id, worker.department_id).first<{ id: string }>();
  const owner = coveringOfficer?.id ?? comp.assigned_officer_id ?? user.id;
  const assignmentId = 'asg-' + crypto.randomUUID();
  const results = await db.batch([
    db.prepare(`
      INSERT INTO assignments (id, complaint_id, officer_id, worker_id, status, notes, created_at, updated_at)
      SELECT ?, id, ?, ?, 'pending', ?, ?, ? FROM complaints
      WHERE id = ? AND updated_at = ? AND status IN ('submitted', 'acknowledged', 'assigned', 'in_progress', 'escalated')
    `).bind(assignmentId, owner, workerId, typeof notes === 'string' ? notes.slice(0, 500) : '', now, now, id, comp.updated_at),
    db.prepare(`
      UPDATE assignments SET status = 'reassigned', updated_at = ?
      WHERE complaint_id = ? AND id != ? AND status IN ('pending', 'active')
      AND EXISTS (SELECT 1 FROM assignments WHERE id = ?)
    `).bind(now, id, assignmentId, assignmentId),
    db.prepare(`
      UPDATE complaints SET status = 'assigned', assigned_officer_id = ?, assigned_worker_id = ?,
        assigned_at = COALESCE(assigned_at, ?), department_id = COALESCE(department_id, ?),
        zone_id = COALESCE(zone_id, ?), updated_at = ?
      WHERE id = ? AND EXISTS (SELECT 1 FROM assignments WHERE id = ?)
    `).bind(owner, workerId, now, worker.department_id, worker.zone_id, now, id, assignmentId),
    db.prepare(`
      UPDATE complaint_workflow SET review_reason = NULL
      WHERE complaint_id = ? AND EXISTS (SELECT 1 FROM assignments WHERE id = ?)
    `).bind(id, assignmentId),
    db.prepare(`
      INSERT INTO complaint_workflow_events (id, complaint_id, actor_id, action, description, created_at)
      SELECT ?, complaint_id, ?, 'Manual assignment', ?, ? FROM assignments WHERE id = ?
    `).bind(assignmentId, user.id, 'Assigned to ' + worker.name, now, assignmentId),
  ]);
  if (!results[0].meta.changes) return c.json({ success: false, message: 'The complaint changed. Refresh and retry.' }, 409);

  const updated = await c.env.DB.prepare('SELECT * FROM complaints WHERE id = ?').bind(id).first<any>();
  await notify(c.env.DB, workerId, 'New job assigned', `“${comp.title}” at ${comp.address || 'the pinned location'}`, id);
  await notify(c.env.DB, comp.citizen_id, 'Worker assigned', `${worker.name} has been assigned to “${comp.title}”.`, id);
  if (comp.assigned_worker_id !== workerId) {
    await notify(c.env.DB, comp.assigned_worker_id, 'Job reassigned', comp.title, id);
  }
  if (owner !== user.id) await notify(db, owner, 'Worker assigned', comp.title, id);
  await broadcastEvent(c.env, 'complaint:assigned', updated);
  return c.json({ success: true, data: toComplaint(updated) });
}

async function resolveHandler(c: Ctx) {
  const id = c.req.param('id');
  const user = c.get('user');
  const comp = await c.env.DB.prepare('SELECT * FROM complaints WHERE id = ?').bind(id).first<any>();
  if (!comp) return c.json({ success: false, message: 'Complaint not found' }, 404);
  const isAssignedWorker = user.role === 'field_worker' && comp.assigned_worker_id === user.id;
  const isOfficer = user.role === 'officer' && (!comp.assigned_officer_id || comp.assigned_officer_id === user.id);
  if (user.role !== 'admin' && !isOfficer && !isAssignedWorker) {
    return c.json({ success: false, message: 'Only the assigned worker or an officer can resolve this.' }, 403);
  }
  if (['resolved', 'closed', 'rejected'].includes(comp.status)) {
    return c.json({ success: false, message: `This complaint is already ${comp.status}.` }, 400);
  }
  const body = await c.req.json().catch(() => ({}));
  const notes = body.resolutionNotes || body.notes || 'Resolved';
  const now = new Date().toISOString();

  const db = c.env.DB;
  const eventId = crypto.randomUUID();
  const results = await db.batch([
    db.prepare(`
      INSERT INTO complaint_workflow_events (id, complaint_id, actor_id, action, description, created_at)
      SELECT ?, id, ?, 'Resolution recorded', 'Waiting for citizen confirmation.', ? FROM complaints
      WHERE id = ? AND updated_at = ? AND status NOT IN ('resolved', 'closed', 'rejected')
    `).bind(eventId, user.id, now, id, comp.updated_at),
    db.prepare(`
      UPDATE complaints SET status = 'resolved', resolution_notes = ?, resolved_at = ?, updated_at = ?
      WHERE id = ? AND EXISTS (SELECT 1 FROM complaint_workflow_events WHERE id = ?)
    `).bind(notes, now, now, id, eventId),
    db.prepare(`
      UPDATE assignments SET status = 'completed', updated_at = ?
      WHERE complaint_id = ? AND status IN ('pending', 'active')
      AND EXISTS (SELECT 1 FROM complaint_workflow_events WHERE id = ?)
    `).bind(now, id, eventId),
  ]);
  if (!results[0].meta.changes) return c.json({ success: false, message: 'The complaint changed. Refresh and retry.' }, 409);

  const updated = await c.env.DB.prepare('SELECT * FROM complaints WHERE id = ?').bind(id).first<any>();
  await notify(c.env.DB, comp.citizen_id, 'Marked resolved', `“${comp.title}” was marked fixed. Please check and confirm.`, id);
  await notify(c.env.DB, comp.assigned_officer_id, 'Awaiting citizen confirmation', comp.title, id);
  await broadcastEvent(c.env, 'complaint:resolved', updated);
  return c.json({ success: true, data: toComplaint(updated) });
}

complaints.post('/:id/assign', authMiddleware, assignHandler);
complaints.patch('/:id/assign', authMiddleware, assignHandler);
complaints.post('/:id/resolve', authMiddleware, resolveHandler);
complaints.patch('/:id/resolve', authMiddleware, resolveHandler);

complaints.patch('/:id/triage', authMiddleware, async c => {
  const user = c.get('user');
  if (!['officer', 'admin'].includes(user.role)) return c.json({ success: false, message: 'Not allowed.' }, 403);
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const priority = body.priority as Priority;
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 240) : '';
  if (!['low', 'medium', 'high', 'critical'].includes(priority) || !reason) {
    return c.json({ success: false, message: 'Priority and an override reason are required.' }, 400);
  }
  const db = c.env.DB;
  const comp = await db.prepare(`
    SELECT c.*, w.complaint_id AS tracked, COALESCE(
      (SELECT MAX(created_at) FROM complaint_workflow_events WHERE complaint_id = c.id AND action = 'Work reopened'),
      c.created_at) AS cycle_started_at
    FROM complaints c
    LEFT JOIN complaint_workflow w ON w.complaint_id = c.id WHERE c.id = ?
  `).bind(id).first<any>();
  if (!comp) return c.json({ success: false, message: 'Complaint not found.' }, 404);
  if (user.role !== 'admin' && comp.assigned_officer_id && comp.assigned_officer_id !== user.id) {
    return c.json({ success: false, message: 'Only the responsible officer can change the priority.' }, 403);
  }
  const now = new Date().toISOString();
  const due = deadlines(priority, comp.cycle_started_at);
  const eventId = crypto.randomUUID();
  const statements = [
    db.prepare(`
      INSERT INTO complaint_workflow_events (id, complaint_id, actor_id, action, description, created_at)
      SELECT ?, id, ?, 'Priority changed', ?, ? FROM complaints WHERE id = ? AND updated_at = ?
        AND status IN ('submitted', 'acknowledged', 'assigned', 'in_progress', 'escalated')
    `).bind(eventId, user.id, comp.priority.toUpperCase() + ' → ' + priority.toUpperCase() + ' · ' + reason, now, id, comp.updated_at),
    db.prepare(`
      UPDATE complaints SET priority = ?, updated_at = ? WHERE id = ?
      AND EXISTS (SELECT 1 FROM complaint_workflow_events WHERE id = ?)
    `).bind(priority, now, id, eventId),
  ];
  if (comp.tracked && priority !== comp.priority) statements.push(db.prepare(`
    UPDATE complaint_workflow SET assignment_due_at = ?, resolution_due_at = ?, escalated_at = NULL WHERE complaint_id = ?
    AND EXISTS (SELECT 1 FROM complaint_workflow_events WHERE id = ?)
  `).bind(due.assignment, due.resolution, id, eventId));
  const results = await db.batch(statements);
  if (!results[0].meta.changes) return c.json({ success: false, message: 'The complaint is closed or changed. Refresh and retry.' }, 409);
  await notify(db, comp.citizen_id, 'Complaint priority updated', comp.title, id);
  await notify(db, comp.assigned_worker_id, 'Complaint priority updated', comp.title, id);
  const updated = await db.prepare(`SELECT complaints.*, ${workflowFields} FROM complaints
    LEFT JOIN complaint_workflow w ON w.complaint_id = complaints.id WHERE complaints.id = ?`).bind(id).first<any>();
  return c.json({ success: true, data: toComplaint(updated) });
});

// POST /api/v1/complaints/:id/confirm — citizen closes or reopens a resolved complaint
complaints.post('/:id/confirm', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const fixed = body.fixed !== false;
  const feedback = typeof body.feedback === 'string' ? body.feedback.trim().slice(0, 500) : '';
  const rating = Number.isFinite(Number(body.rating)) ? Math.max(1, Math.min(5, Number(body.rating))) : null;

  const comp = await c.env.DB.prepare('SELECT * FROM complaints WHERE id = ?').bind(id).first<any>();
  if (!comp) return c.json({ success: false, message: 'Complaint not found' }, 404);
  if (comp.citizen_id !== user.id) {
    return c.json({ success: false, message: 'Only the citizen who filed this complaint can confirm it.' }, 403);
  }
  if (comp.status !== 'resolved') {
    return c.json({ success: false, message: 'This complaint is not waiting for confirmation.' }, 400);
  }

  const now = new Date().toISOString();
  const db = c.env.DB;
  const eventId = crypto.randomUUID();
  const statements = [db.prepare(`
    INSERT INTO complaint_workflow_events (id, complaint_id, actor_id, action, description, created_at)
    SELECT ?, id, ?, ?, ?, ? FROM complaints WHERE id = ? AND status = 'resolved' AND resolved_at IS ?
  `).bind(eventId, user.id, fixed ? 'Closure confirmed' : 'Work reopened',
    fixed ? 'Citizen confirmed the fix.' : 'The citizen requested further work. New deadlines apply.', now, id, comp.resolved_at)];
  const guarded = ' AND EXISTS (SELECT 1 FROM complaint_workflow_events WHERE id = ?)';
  if (fixed) {
    statements.push(db.prepare(
      'UPDATE complaints SET status = ?, closed_at = ?, citizen_feedback = ?, citizen_rating = ?, updated_at = ? WHERE id = ?' + guarded
    ).bind('closed', now, feedback || null, rating, now, id, eventId));
  } else {
    const nextStatus = comp.assigned_worker_id ? 'in_progress' : 'submitted';
    const due = deadlines(comp.priority, now);
    statements.push(db.prepare(
      'UPDATE complaints SET status = ?, resolved_at = NULL, citizen_feedback = ?, reopen_count = COALESCE(reopen_count, 0) + 1, updated_at = ? WHERE id = ?' + guarded
    ).bind(nextStatus, feedback || null, now, id, eventId),
      db.prepare(`
        UPDATE assignments SET status = 'active', updated_at = ? WHERE id = (
          SELECT id FROM assignments WHERE complaint_id = ? AND worker_id = ? AND status = 'completed'
          ORDER BY created_at DESC LIMIT 1
        )
      ` + guarded).bind(now, id, comp.assigned_worker_id, eventId),
      db.prepare(`
        UPDATE complaint_workflow SET assignment_due_at = ?, resolution_due_at = ?, escalated_at = NULL
        WHERE complaint_id = ?
      ` + guarded).bind(due.assignment, due.resolution, id, eventId),
    );
  }
  const results = await db.batch(statements);
  if (!results[0].meta.changes) return c.json({ success: false, message: 'The complaint changed. Refresh and retry.' }, 409);

  const updated = await c.env.DB.prepare('SELECT * FROM complaints WHERE id = ?').bind(id).first<any>();
  if (!fixed) {
    await notify(c.env.DB, comp.assigned_worker_id, 'Job reopened', `Citizen says “${comp.title}” is not fixed${feedback ? `: ${feedback}` : '.'}`, id);
  }
  await notify(c.env.DB, comp.assigned_officer_id, fixed ? 'Citizen confirmed the fix' : 'Complaint reopened', comp.title, id);
  await broadcastEvent(c.env, fixed ? 'complaint:closed' : 'complaint:reopened', updated);
  return c.json({
    success: true,
    message: fixed ? 'Thanks for confirming. Complaint closed.' : 'Complaint reopened for the field team.',
    data: toComplaint(updated),
  });
});

export default complaints;
