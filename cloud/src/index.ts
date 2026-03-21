import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { serveStatic } from '@hono/node-server/serve-static';
import { env } from './lib/env.js';
import { db } from './lib/db.js';
import { startScheduler, stopScheduler } from './services/scheduler.js';
import { getSessionUserId } from './middleware/session.js';
import authRoutes from './routes/auth.js';
import apiRoutes from './routes/api.js';
import webhookRoutes from './routes/webhook.js';
import { landingPage } from './views/landing.js';
import { dashboardPage } from './views/dashboard.js';
import { privacyPage } from './views/privacy.js';

const app = new Hono();

app.use('*', logger());
app.use('/static/*', serveStatic({ root: './public' }));

// --- Routes ---
app.route('/auth', authRoutes);
app.route('/api', apiRoutes);
app.route('/webhook', webhookRoutes);

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

// --- Start ---

const port = env.PORT;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`CalPush Cloud running on http://localhost:${info.port}`);
  startScheduler();
});

process.on('SIGTERM', () => { stopScheduler(); db.$disconnect(); });
process.on('SIGINT', () => { stopScheduler(); db.$disconnect(); process.exit(0); });
