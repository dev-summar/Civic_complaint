import { Hono, Context } from 'hono';
import { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';

const analytics = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const OVERDUE_HOURS = 72;
const OPEN_STATUSES = "('submitted', 'acknowledged', 'assigned', 'in_progress', 'escalated')";

function round1(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : null;
}

export async function getSpeedStats(db: D1Database) {
  const row = await db.prepare(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status IN ${OPEN_STATUSES} THEN 1 ELSE 0 END) AS open,
       SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS awaiting_confirmation,
       SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS closed,
       SUM(CASE WHEN COALESCE(reopen_count, 0) > 0 THEN 1 ELSE 0 END) AS reopened,
       SUM(CASE WHEN status IN ${OPEN_STATUSES} AND (
         (w.resolution_due_at IS NOT NULL AND julianday(w.resolution_due_at) <= julianday('now'))
         OR (w.resolution_due_at IS NULL AND (julianday('now') - julianday(created_at)) * 24 > ${OVERDUE_HOURS})
         OR (status IN ('submitted','acknowledged') AND julianday(w.assignment_due_at) <= julianday('now')))
            THEN 1 ELSE 0 END) AS overdue,
       AVG(CASE WHEN assigned_at IS NOT NULL
                THEN (julianday(assigned_at) - julianday(created_at)) * 24 END) AS avg_assign_hours,
       AVG(CASE WHEN resolved_at IS NOT NULL
                THEN (julianday(resolved_at) - julianday(created_at)) * 24 END) AS avg_resolution_hours
     FROM complaints LEFT JOIN complaint_workflow w ON w.complaint_id = complaints.id`
  ).first<any>();

  return {
    total: Number(row?.total) || 0,
    open: Number(row?.open) || 0,
    awaitingConfirmation: Number(row?.awaiting_confirmation) || 0,
    closed: Number(row?.closed) || 0,
    reopened: Number(row?.reopened) || 0,
    overdue: Number(row?.overdue) || 0,
    avgAssignHours: round1(row?.avg_assign_hours),
    avgResolutionHours: round1(row?.avg_resolution_hours),
    overdueAfterHours: OVERDUE_HOURS,
  };
}

export async function getHotspots(db: D1Database, limit = 15) {
  const rows = await db.prepare(
    `SELECT
       ROUND(latitude, 3) AS lat,
       ROUND(longitude, 3) AS lng,
       COUNT(*) AS total,
       SUM(CASE WHEN status IN ${OPEN_STATUSES} THEN 1 ELSE 0 END) AS open,
       MAX(address) AS address,
       MAX(created_at) AS last_reported
     FROM complaints
     WHERE latitude IS NOT NULL AND longitude IS NOT NULL
     GROUP BY ROUND(latitude, 3), ROUND(longitude, 3)
     HAVING COUNT(*) >= 2
     ORDER BY total DESC, open DESC
     LIMIT ?`
  ).bind(limit).all<any>();

  const spots = rows.results || [];
  const withCategory = [];
  for (const spot of spots) {
    const top = await db.prepare(
      `SELECT category, COUNT(*) AS n FROM complaints
       WHERE ROUND(latitude, 3) = ? AND ROUND(longitude, 3) = ?
       GROUP BY category ORDER BY n DESC LIMIT 1`
    ).bind(spot.lat, spot.lng).first<any>();
    withCategory.push({
      latitude: Number(spot.lat),
      longitude: Number(spot.lng),
      total: Number(spot.total) || 0,
      open: Number(spot.open) || 0,
      address: spot.address || '',
      lastReported: spot.last_reported,
      topCategory: top?.category || 'others',
    });
  }
  return withCategory;
}

// GET /api/v1/dashboard or /api/v1/analytics/dashboard
async function dashboardHandler(c: Context<{ Bindings: Bindings; Variables: Variables }>) {
  const speed = await getSpeedStats(c.env.DB);
  const pending = await c.env.DB.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'submitted'").first<any>();
  const inProgress = await c.env.DB.prepare("SELECT COUNT(*) as count FROM complaints WHERE status IN ('assigned', 'in_progress')").first<any>();

  return c.json({
    success: true,
    data: {
      totalComplaints: speed.total,
      pending: pending?.count || 0,
      inProgress: inProgress?.count || 0,
      resolved: speed.awaitingConfirmation + speed.closed,
      closed: speed.closed,
      overdue: speed.overdue,
      avgAssignHours: speed.avgAssignHours,
      avgResolutionHours: speed.avgResolutionHours,
    },
  });
}

analytics.get('/', authMiddleware, dashboardHandler);
analytics.get('/dashboard', authMiddleware, dashboardHandler);

// GET /api/v1/analytics/complaints — breakdowns plus handling speed and hotspots
analytics.get('/complaints', authMiddleware, async (c) => {
  const byCategory = await c.env.DB.prepare(
    'SELECT category AS _id, COUNT(*) AS count FROM complaints GROUP BY category ORDER BY count DESC'
  ).all<any>();
  const byStatus = await c.env.DB.prepare(
    'SELECT status AS _id, COUNT(*) AS count FROM complaints GROUP BY status ORDER BY count DESC'
  ).all<any>();
  const speed = await getSpeedStats(c.env.DB);
  const hotspots = await getHotspots(c.env.DB, 10);

  return c.json({
    success: true,
    data: {
      byCategory: byCategory.results || [],
      byStatus: byStatus.results || [],
      resolvedCount: speed.awaitingConfirmation + speed.closed,
      ...speed,
      hotspots,
    },
  });
});

// GET /api/v1/analytics/hotspots
analytics.get('/hotspots', authMiddleware, async (c) => {
  const hotspots = await getHotspots(c.env.DB, 25);
  return c.json({ success: true, data: hotspots });
});

// GET /api/v1/analytics/departments
analytics.get('/departments', authMiddleware, async (c) => {
  const depts = await c.env.DB.prepare('SELECT id, name, code FROM departments').all<any>();
  const list = (depts.results || []).map((d: any) => ({
    name: d.name,
    code: d.code,
    totalComplaints: 0,
    resolvedComplaints: 0,
  }));
  return c.json({ success: true, data: list });
});

// GET /api/v1/analytics/zones
analytics.get('/zones', authMiddleware, async (c) => {
  const zones = await c.env.DB.prepare('SELECT id, name, code, district FROM zones').all<any>();
  const list = (zones.results || []).map((z: any) => ({
    name: z.name,
    code: z.code,
    district: z.district,
    totalComplaints: 0,
    resolvedComplaints: 0,
  }));
  return c.json({ success: true, data: list });
});

export default analytics;
