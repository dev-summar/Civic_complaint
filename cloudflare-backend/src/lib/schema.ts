import { workflowSchema } from './workflow';

let ensured = false;
let ensuring: Promise<void> | null = null;

const COMPLAINT_COLUMNS = [
  'assigned_at TEXT',
  'started_at TEXT',
  'resolved_at TEXT',
  'closed_at TEXT',
  'citizen_feedback TEXT',
  'citizen_rating INTEGER',
  'reopen_count INTEGER DEFAULT 0',
  'ai_category TEXT',
  'ai_summary TEXT',
];

export async function ensureSchema(db: D1Database) {
  if (ensured) return;
  // Concurrent first requests share one check, rather than all repeating DDL.
  if (!ensuring) ensuring = ensureSchemaOnce(db).then(() => { ensured = true; })
    .finally(() => { ensuring = null; });
  await ensuring;
}

async function ensureSchemaOnce(db: D1Database) {
  // Most isolates serve an already-upgraded database. Inspect it in one network
  // round trip instead of attempting a dozen sequential ALTER/CREATE requests.
  const metadata = await db.batch<{name: string}>([
    db.prepare('PRAGMA table_info(complaints)'),
    db.prepare('PRAGMA table_info(users)'),
    db.prepare('PRAGMA table_info(notifications)'),
    db.prepare("SELECT name FROM sqlite_master WHERE type IN ('table', 'index')"),
  ]);
  const names = (index: number) => new Set((metadata[index]?.results ?? []).map(row => row.name));
  const complaintColumns = names(0);
  const objects = names(3);
  const requiredObjects = ['notifications', 'comments', 'complaint_submission_keys', 'routing_rules',
    'demo_routing_targets', 'complaint_workflow', 'idx_workflow_resolution_due',
    'complaint_workflow_events', 'idx_workflow_event_complaint'];
  if (COMPLAINT_COLUMNS.every(column => complaintColumns.has(column.split(' ')[0])) &&
    names(1).has('community') && names(2).has('complaint_id') &&
    requiredObjects.every(name => objects.has(name))) return;

  // Preserve the existing upgrade path for older databases.
  for (const column of COMPLAINT_COLUMNS) {
    try {
      await db.prepare(`ALTER TABLE complaints ADD COLUMN ${column}`).run();
    } catch {
      // column already exists
    }
  }
  try {
    await db.prepare('ALTER TABLE users ADD COLUMN community TEXT').run();
  } catch {
    // column already exists
  }
  try {
    await db.batch([
      db.prepare(
        `CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
          type TEXT DEFAULT 'complaint_update', is_read INTEGER DEFAULT 0, complaint_id TEXT, created_at TEXT NOT NULL
        )`
      ),
      db.prepare(
        `CREATE TABLE IF NOT EXISTS comments (
          id TEXT PRIMARY KEY, complaint_id TEXT NOT NULL, user_id TEXT NOT NULL, user_name TEXT,
          text TEXT NOT NULL, created_at TEXT NOT NULL
        )`
      ),
    ]);
  } catch (err) {
    console.error('support table check failed', err);
  }
  try {
    await db.prepare('ALTER TABLE notifications ADD COLUMN complaint_id TEXT').run();
  } catch {
    // column already exists
  }
  await db.batch(workflowSchema.map(sql => db.prepare(sql)));
}

export async function notify(
  db: D1Database,
  userId: string | null | undefined,
  title: string,
  body: string,
  complaintId?: string,
) {
  if (!userId) return;
  try {
    await db.prepare(
      'INSERT INTO notifications (id, user_id, title, body, type, is_read, complaint_id, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)'
    ).bind(`ntf-${crypto.randomUUID()}`, userId, title, body, 'complaint_update', complaintId || null, new Date().toISOString()).run();
  } catch (err) {
    console.error('notification insert failed', err);
  }
}
