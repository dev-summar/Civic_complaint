import type { Priority } from './intake';

export const workflowSchema = [
  `CREATE TABLE IF NOT EXISTS complaint_submission_keys (
    citizen_id TEXT NOT NULL, request_id TEXT NOT NULL,
    complaint_id TEXT NOT NULL UNIQUE REFERENCES complaints(id), payload_hash TEXT NOT NULL,
    PRIMARY KEY(citizen_id, request_id)
  )`,
  `CREATE TABLE IF NOT EXISTS routing_rules (
    id TEXT PRIMARY KEY, zone_id TEXT NOT NULL, department_id TEXT NOT NULL,
    category TEXT NOT NULL, officer_id TEXT NOT NULL, supervisor_id TEXT NOT NULL,
    south REAL NOT NULL, west REAL NOT NULL, north REAL NOT NULL, east REAL NOT NULL,
    auto_assign INTEGER NOT NULL DEFAULT 0,
    UNIQUE(zone_id, category)
  )`,
  `CREATE TABLE IF NOT EXISTS demo_routing_targets (
    rule_id TEXT PRIMARY KEY REFERENCES routing_rules(id) ON DELETE CASCADE,
    citizen_id TEXT NOT NULL REFERENCES users(id),
    worker_id TEXT NOT NULL REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS complaint_workflow (
    complaint_id TEXT PRIMARY KEY REFERENCES complaints(id),
    language TEXT NOT NULL DEFAULT 'en', original_report TEXT,
    triage_reason TEXT NOT NULL, review_reason TEXT, supervisor_id TEXT,
    assignment_due_at TEXT NOT NULL, resolution_due_at TEXT NOT NULL,
    escalated_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_workflow_resolution_due ON complaint_workflow(resolution_due_at)`,
  `CREATE TABLE IF NOT EXISTS complaint_workflow_events (
    id TEXT PRIMARY KEY, complaint_id TEXT NOT NULL REFERENCES complaints(id),
    actor_id TEXT, action TEXT NOT NULL, description TEXT NOT NULL, created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_workflow_event_complaint ON complaint_workflow_events(complaint_id, created_at)`,
];

export const workflowFields = `
  w.assignment_due_at, w.resolution_due_at, w.escalated_at, w.triage_reason, w.review_reason,
  (SELECT name FROM departments WHERE id = complaints.department_id) AS department_name,
  (SELECT name FROM users WHERE id = complaints.assigned_officer_id) AS officer_name,
  (SELECT name FROM users WHERE id = complaints.assigned_worker_id) AS worker_name
`;

type Rule = {
  zone_id: string; department_id: string; officer_id: string; supervisor_id: string;
  auto_assign: number; category: string; demo_worker_id: string | null;
};

export async function routeComplaint(
  db: D1Database,
  issue: { category: string; lat: number; lng: number; priority: Priority; review: boolean; citizenId: string; selectedCategory: string },
) {
  const matches = await db.prepare(`
    SELECT r.*, t.worker_id AS demo_worker_id FROM routing_rules r
    JOIN users o ON o.id = r.officer_id AND o.is_active = 1 AND o.role = 'officer'
      AND o.zone_id = r.zone_id AND o.department_id = r.department_id
    JOIN zones z ON z.id = r.zone_id AND z.is_active = 1
    JOIN departments d ON d.id = r.department_id AND d.is_active = 1
    LEFT JOIN demo_routing_targets t ON t.rule_id = r.id
    WHERE ((t.rule_id IS NULL AND r.category = ?) OR (t.citizen_id = ? AND r.category = ?))
      AND ? BETWEEN r.south AND r.north AND ? BETWEEN r.west AND r.east
    ORDER BY t.rule_id IS NOT NULL DESC
    LIMIT 2
  `).bind(issue.category, issue.citizenId, issue.selectedCategory, issue.lat, issue.lng).all<Rule>();
  const [first, second] = matches.results;
  const rule = first && (!second || (!!first.demo_worker_id && !second.demo_worker_id)) ? first : null;
  const needsReview = issue.review && !rule?.demo_worker_id;
  let worker: { id: string; name: string } | null = null;
  if (rule && !needsReview) {
    worker = await db.prepare(`
      SELECT u.id, u.name FROM users u LEFT JOIN complaints c ON c.assigned_worker_id = u.id
        AND c.status IN ('assigned', 'in_progress')
      WHERE u.role = 'field_worker' AND u.is_active = 1 AND u.zone_id = ? AND u.department_id = ?
        AND (? IS NULL OR u.id = ?)
      GROUP BY u.id
      ORDER BY SUM(CASE WHEN c.priority IN ('critical','high') THEN 1 ELSE 0 END) * ? + COUNT(c.id), u.id
      LIMIT 1
    `).bind(rule.zone_id, rule.department_id, rule.demo_worker_id, rule.demo_worker_id, issue.priority === 'high' ? 2 : 0).first<{ id: string; name: string }>();
  }
  const workerId = rule?.auto_assign ? worker?.id ?? null : null;
  const officer = rule ? null : await db.prepare(`
    SELECT id FROM users WHERE is_active = 1 AND role IN ('admin','officer')
      AND NOT EXISTS (SELECT 1 FROM routing_rules r JOIN demo_routing_targets t ON t.rule_id = r.id WHERE r.officer_id = users.id)
    ORDER BY CASE role WHEN 'officer' THEN 0 ELSE 1 END, id LIMIT 1
  `).first<{ id: string }>();
  const reviewReason = !rule ? 'No unique ward and department rule matched. Route manually.'
    : needsReview ? 'Officer review required.' : !worker ? 'No eligible field worker is available.'
    : !rule.auto_assign ? 'Suggested worker: ' + worker.name + '. Confirm the assignment manually.' : null;
  return { rule, officerId: rule?.officer_id ?? officer?.id ?? null, workerId, reviewReason };
}

export function deadlines(priority: Priority, from: string) {
  const [assignment, resolution] = {
    critical: [1, 4], high: [2, 24], medium: [8, 48], low: [24, 72],
  }[priority];
  const after = (hours: number) => new Date(Date.parse(from) + hours * 3_600_000).toISOString();
  return { assignment: after(assignment), resolution: after(resolution) };
}

export function workflowEvent(db: D1Database, complaint: string, actor: string | null, action: string, description: string, at: string) {
  return db.prepare(`
    INSERT INTO complaint_workflow_events (id, complaint_id, actor_id, action, description, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(crypto.randomUUID(), complaint, actor, action, description, at);
}

export function workflowNotice(db: D1Database, id: string, recipient: string, complaint: string, title: string, body: string, at: string) {
  return db.prepare(`
    INSERT OR IGNORE INTO notifications (id, user_id, title, body, type, is_read, complaint_id, created_at)
    VALUES (?, ?, ?, ?, 'complaint_update', 0, ?, ?)
  `).bind(id, recipient, title, body, complaint, at);
}
