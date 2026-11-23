import { ensureSchema } from './schema';

type Followup = {
  id: string;
  title: string;
  citizen_id: string | null;
  assigned_worker_id: string | null;
  assigned_officer_id: string | null;
  supervisor: string | null;
  deadline: string;
  language: string;
};

const stages = [
  { key: 'assignment-reminder', status: "c.status IN ('submitted','acknowledged')", due: 'w.assignment_due_at', hours: -1, action: 'Assignment due soon', target: 'officer' },
  { key: 'assignment-overdue', status: "c.status IN ('submitted','acknowledged')", due: 'w.assignment_due_at', hours: 0, action: 'Assignment deadline missed', target: 'officer' },
  { key: 'assignment-escalation', status: "c.status IN ('submitted','acknowledged')", due: 'w.assignment_due_at', hours: 2, action: 'Assignment escalated to supervisor', target: 'supervisor' },
  { key: 'resolution-reminder', status: "c.status IN ('assigned', 'in_progress')", due: 'w.resolution_due_at', hours: -2, action: 'Resolution due soon', target: 'worker' },
  { key: 'resolution-overdue', status: "c.status IN ('submitted', 'assigned', 'in_progress')", due: 'w.resolution_due_at', hours: 0, action: 'Resolution deadline missed', target: 'officer' },
  { key: 'resolution-escalation', status: "c.status IN ('submitted', 'assigned', 'in_progress')", due: 'w.resolution_due_at', hours: 4, action: 'Resolution escalated to supervisor', target: 'supervisor' },
  { key: 'confirmation-reminder', status: "c.status = 'resolved'", due: 'c.resolved_at', hours: 24, action: 'Citizen confirmation reminder', target: 'citizen' },
] as const;

export async function sendFollowups(db: D1Database, time: number) {
  await ensureSchema(db);
  const now = new Date(time).toISOString();
  for (const stage of stages) {
    const cutoff = new Date(time - stage.hours * 3_600_000).toISOString();
    const keySql = "c.id || ':' || ? || ':' || " + stage.due;
    const rows = await db.prepare(`
      SELECT c.id, c.title, c.citizen_id, c.assigned_worker_id, c.assigned_officer_id, w.language,
        COALESCE((SELECT id FROM users WHERE id = w.supervisor_id AND is_active = 1 AND role IN ('officer','admin')),
          (SELECT id FROM users WHERE role = 'admin' AND is_active = 1 ORDER BY id LIMIT 1)) AS supervisor,
        ${stage.due} AS deadline
      FROM complaints c JOIN complaint_workflow w ON w.complaint_id = c.id
      WHERE ${stage.status} AND ${stage.due} <= ?
        ${stage.hours < 0 ? 'AND ' + stage.due + ' > ?' : ''}
        ${stage.target === 'citizen' ? 'AND c.citizen_id IS NOT NULL' : ''}
        AND NOT EXISTS (SELECT 1 FROM complaint_workflow_events WHERE id = ${keySql})
      ORDER BY ${stage.due}, c.id LIMIT 25
    `).bind(...(stage.hours < 0 ? [cutoff, now, stage.key] : [cutoff, stage.key])).all<Followup>();

    const statements: D1PreparedStatement[] = [];
    for (const row of rows.results) {
      const primary = {
        officer: row.assigned_officer_id ?? row.supervisor,
        worker: row.assigned_worker_id ?? row.assigned_officer_id ?? row.supervisor,
        supervisor: row.supervisor ?? row.assigned_officer_id,
        citizen: row.citizen_id,
      }[stage.target];
      if (!primary) continue;
      const isLate = stage.hours >= 0 && stage.target !== 'citizen';
      const eventId = row.id + ':' + stage.key + ':' + row.deadline;
      const stillDue = `FROM complaints c JOIN complaint_workflow w ON w.complaint_id = c.id
        WHERE c.id = ? AND ${stage.status} AND ${stage.due} = ?
        AND c.assigned_officer_id IS ? AND c.assigned_worker_id IS ?`;
      const guard = [row.id, row.deadline, row.assigned_officer_id, row.assigned_worker_id];
      statements.push(db.prepare(`
        INSERT OR IGNORE INTO complaint_workflow_events (id, complaint_id, action, description, created_at)
        SELECT ?, c.id, ?, ?, ? ${stillDue}
      `).bind(eventId, stage.action, 'Follow-up sent for the current case deadline.', now, ...guard));
      if (stage.target === 'supervisor') {
        statements.push(db.prepare(`
          UPDATE complaint_workflow SET escalated_at = COALESCE(escalated_at, ?) WHERE complaint_id = ?
          AND EXISTS (SELECT 1 ${stillDue})
        `).bind(now, row.id, ...guard));
      }
      const recipients = new Set([primary, ...(isLate ? [row.assigned_officer_id, row.citizen_id] : []),
        ...(stage.key === 'resolution-overdue' ? [row.assigned_worker_id] : [])]);
      for (const recipient of recipients) {
        if (!recipient) continue;
        let title: string = stage.action;
        if (recipient === row.citizen_id) {
          const confirmation = stage.target === 'citizen';
          title = row.language === 'hi'
            ? (confirmation ? 'क्या समस्या ठीक हो गई?' : 'शिकायत में देरी हुई है')
            : row.language === 'hinglish'
              ? (confirmation ? 'Kya problem theek ho gayi?' : 'Aapki complaint mein deri hui hai')
              : (confirmation ? 'Was the issue fixed?' : 'Your complaint is delayed');
        }
        statements.push(db.prepare(`
          INSERT OR IGNORE INTO notifications (id, user_id, title, body, type, is_read, complaint_id, created_at)
          SELECT ?, ?, ?, ?, 'complaint_update', 0, c.id, ? ${stillDue}
        `).bind(eventId + ':' + recipient, recipient, title, row.title, now, ...guard));
      }
    }
    if (statements.length) await db.batch(statements);
  }
}
