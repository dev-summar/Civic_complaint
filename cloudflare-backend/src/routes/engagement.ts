import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';
import { getSpeedStats } from './analytics';

const engagement = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/** Points a citizen earns: filing, getting it fixed, and confirming the fix. */
const POINTS = { report: 10, resolved: 15, confirmed: 25 };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function grade(score: number) {
  if (score >= 85) return 'Spotless';
  if (score >= 70) return 'Clean';
  if (score >= 50) return 'Improving';
  return 'Needs attention';
}

// GET /api/v1/engagement/score — city-wide Clean City Score (0–100)
engagement.get('/score', authMiddleware, async (c) => {
  const s = await getSpeedStats(c.env.DB);
  const fixed = s.awaitingConfirmation + s.closed;

  let score = 100;
  if (s.total > 0) {
    const resolutionRate = fixed / s.total;
    const confirmRate = fixed > 0 ? s.closed / fixed : 0;
    const overdueShare = s.overdue / s.total;
    const speed = s.avgResolutionHours == null ? 0.5 : clamp(1 - s.avgResolutionHours / 168, 0, 1);
    score = Math.round(
      100 * (0.45 * resolutionRate + 0.2 * confirmRate + 0.2 * speed + 0.15 * (1 - overdueShare)),
    );
  }

  return c.json({
    success: true,
    data: {
      score: clamp(score, 0, 100),
      grade: grade(score),
      total: s.total,
      fixed,
      confirmed: s.closed,
      open: s.open,
      overdue: s.overdue,
      avgResolutionHours: s.avgResolutionHours,
    },
  });
});

// GET /api/v1/engagement/leaderboard — communities, top citizens, and the caller's standing
engagement.get('/leaderboard', authMiddleware, async (c) => {
  const user = c.get('user');
  const pointsSql = `
    COUNT(c.id) * ${POINTS.report}
    + SUM(CASE WHEN c.status IN ('resolved', 'closed') THEN ${POINTS.resolved} ELSE 0 END)
    + SUM(CASE WHEN c.status = 'closed' THEN ${POINTS.confirmed} ELSE 0 END)`;

  const communities = await c.env.DB.prepare(
    `SELECT TRIM(u.community) AS community,
            COUNT(DISTINCT u.id) AS members,
            COUNT(c.id) AS reports,
            SUM(CASE WHEN c.status = 'closed' THEN 1 ELSE 0 END) AS confirmed,
            ${pointsSql} AS points
     FROM users u
     JOIN complaints c ON c.citizen_id = u.id
     WHERE u.community IS NOT NULL AND TRIM(u.community) != ''
     GROUP BY LOWER(TRIM(u.community))
     ORDER BY points DESC, reports DESC
     LIMIT 20`
  ).all<any>();

  const citizens = await c.env.DB.prepare(
    `SELECT u.id, u.name, u.community,
            COUNT(c.id) AS reports,
            SUM(CASE WHEN c.status = 'closed' THEN 1 ELSE 0 END) AS confirmed,
            ${pointsSql} AS points
     FROM users u
     JOIN complaints c ON c.citizen_id = u.id
     GROUP BY u.id
     ORDER BY points DESC, reports DESC
     LIMIT 50`
  ).all<any>();

  const citizenRows = citizens.results || [];
  const meIndex = citizenRows.findIndex((r: any) => r.id === user.id);
  const meRow = meIndex >= 0 ? citizenRows[meIndex] : null;
  const profile = await c.env.DB.prepare('SELECT community FROM users WHERE id = ?').bind(user.id).first<any>();

  return c.json({
    success: true,
    data: {
      points: POINTS,
      communities: (communities.results || []).map((r: any, i: number) => ({
        rank: i + 1,
        community: r.community,
        members: Number(r.members) || 0,
        reports: Number(r.reports) || 0,
        confirmed: Number(r.confirmed) || 0,
        points: Number(r.points) || 0,
      })),
      citizens: citizenRows.slice(0, 10).map((r: any, i: number) => ({
        rank: i + 1,
        name: r.name,
        community: r.community || '',
        reports: Number(r.reports) || 0,
        confirmed: Number(r.confirmed) || 0,
        points: Number(r.points) || 0,
        isMe: r.id === user.id,
      })),
      me: {
        rank: meIndex >= 0 ? meIndex + 1 : null,
        points: Number(meRow?.points) || 0,
        reports: Number(meRow?.reports) || 0,
        confirmed: Number(meRow?.confirmed) || 0,
        community: profile?.community || '',
      },
    },
  });
});

export default engagement;
