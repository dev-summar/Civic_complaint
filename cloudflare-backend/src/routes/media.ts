import { Hono } from 'hono';
import { Bindings, Variables } from '../types';

const media = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const MAX_BASE64_CHARS = 1_400_000;

export async function ensureMediaTable(db: D1Database) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS complaint_media (
      id TEXT PRIMARY KEY,
      complaint_id TEXT NOT NULL,
      mime TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`
  ).run();
}

/**
 * Moves inline `data:` images into complaint_media and returns media entries
 * that point at GET /media/:id instead of carrying the bytes.
 */
export async function storeComplaintMedia(
  db: D1Database,
  origin: string,
  complaintId: string,
  items: any[],
): Promise<{ url: string; type: 'image' | 'video' }[]> {
  const stored: { url: string; type: 'image' | 'video' }[] = [];
  let tableReady = false;

  for (const item of items.slice(0, 5)) {
    const url = typeof item?.url === 'string' ? item.url : '';
    const match = url.match(/^data:([\w/+.-]+);base64,(.+)$/);
    if (!match) {
      if (url.startsWith('http')) stored.push({ url, type: item.type === 'video' ? 'video' : 'image' });
      continue;
    }

    const [, mime, data] = match;
    if (!mime.startsWith('image/') || data.length > MAX_BASE64_CHARS) continue;

    if (!tableReady) {
      await ensureMediaTable(db);
      tableReady = true;
    }

    const id = `med-${crypto.randomUUID()}`;
    await db.prepare(
      'INSERT INTO complaint_media (id, complaint_id, mime, data, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, complaintId, mime, data, new Date().toISOString()).run();
    stored.push({ url: `${origin}/media/${id}`, type: 'image' });
  }

  return stored;
}

// GET /media/:id — public so <Image> can load it; ids are random UUIDs.
media.get('/:id', async (c) => {
  const id = c.req.param('id');
  let row: { mime: string; data: string } | null = null;
  try {
    row = await c.env.DB.prepare('SELECT mime, data FROM complaint_media WHERE id = ?')
      .bind(id)
      .first<{ mime: string; data: string }>();
  } catch {
    row = null;
  }
  if (!row) return c.json({ success: false, message: 'Photo not found' }, 404);

  const binary = atob(row.data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  return new Response(bytes, {
    headers: {
      'Content-Type': row.mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
});

export default media;
