import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { env } from './lib/env.js';
import { db } from './lib/db.js';
import { startScheduler, stopScheduler } from './services/scheduler.js';
import { getSessionUserId } from './middleware/session.js';
import authRoutes from './routes/auth.js';
import apiRoutes from './routes/api.js';
import webhookRoutes from './routes/webhook.js';
import stripeRoutes from './routes/stripe.js';
import { landingPage } from './views/landing.js';
import { dashboardPage } from './views/dashboard.js';
import { privacyPage } from './views/privacy.js';

const app = new Hono();

// --- Security ---
app.use('*', secureHeaders());
app.use('/api/*', cors({ origin: env.BASE_URL, credentials: true }));

// --- Logging ---
app.use('*', logger());
app.use('/static/*', serveStatic({ root: './public' }));

// --- Health check ---
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// --- Routes ---
app.route('/auth', authRoutes);
app.route('/api', apiRoutes);
app.route('/webhook', webhookRoutes);
app.route('/stripe', stripeRoutes);

// --- Pages ---

app.get('/', (c) => {
  const userId = getSessionUserId(c);
  if (userId) return c.redirect('/dashboard');
  return c.html(landingPage());
});

app.get('/dashboard', (c) => {
  const userId = getSessionUserId(c);
  if (!userId) return c.redirect('/');
  return c.html(dashboardPage());
});

app.get('/privacy', (c) => c.html(privacyPage()));

// --- Global error handler ---
app.onError((err, c) => {
  console.error(`[error] ${c.req.method} ${c.req.path}:`, err);

  if (err.message?.includes('Record to update not found') || err.message?.includes('Record to delete does not exist')) {
    return c.json({ error: 'Resource not found' }, 404);
  }

  return c.json({ error: 'Internal server error' }, 500);
});

app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// --- Start ---

const port = env.PORT;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`CalPush Cloud running on http://localhost:${info.port}`);
  startScheduler();
});

process.on('SIGTERM', () => { stopScheduler(); db.$disconnect(); });
process.on('SIGINT', () => { stopScheduler(); db.$disconnect(); process.exit(0); });
