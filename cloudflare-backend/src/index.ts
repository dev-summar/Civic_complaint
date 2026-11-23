import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Bindings, Variables } from './types';
import auth from './routes/auth';
import complaints, { comments } from './routes/complaints';
import notifications from './routes/notifications';
import users from './routes/users';
import departments from './routes/departments';
import zones from './routes/zones';
import assignments from './routes/assignments';
import analytics from './routes/analytics';
import audit from './routes/audit';
import media from './routes/media';
import ai from './routes/ai';
import engagement from './routes/engagement';
import routing from './routes/routing';
import { sendFollowups } from './lib/followups';

export { BroadcasterDO } from './websocket/broadcaster';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Enable CORS for web and mobile clients
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 86400,
}));

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    success: true,
    service: 'SwachhSetu Cloudflare API',
    runtime: 'Cloudflare Workers (Hono)',
    timestamp: new Date().toISOString(),
  });
});

// Real-time WebSocket upgrade route via Durable Object
app.get('/ws', async (c) => {
  const id = c.env.BROADCASTER.idFromName('global');
  const stub = c.env.BROADCASTER.get(id);
  return stub.fetch(c.req.raw);
});

app.route('/media', media);

// API v1 routes
app.route('/api/v1/auth', auth);
app.route('/api/v1/complaints', complaints);
app.route('/api/v1/users', users);
app.route('/api/v1/departments', departments);
app.route('/api/v1/zones', zones);
app.route('/api/v1/assignments', assignments);
app.route('/api/v1/analytics', analytics);
app.route('/api/v1/dashboard', analytics);
app.route('/api/v1/audit-logs', audit);
app.route('/api/v1/ai', ai);
app.route('/api/v1/engagement', engagement);
app.route('/api/v1/comments', comments);
app.route('/api/v1/notifications', notifications);
app.route('/api/v1/routing-rules', routing);

export default {
  fetch: app.fetch,
  scheduled(controller: ScheduledController, env: Bindings, ctx: ExecutionContext) {
    ctx.waitUntil(sendFollowups(env.DB, controller.scheduledTime));
  },
};
