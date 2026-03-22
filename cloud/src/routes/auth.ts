import { Hono } from 'hono';
import crypto from 'crypto';
import { getAuthUrl, exchangeCode } from '../services/google-auth.js';
import { syncUserCalendars } from '../services/calendar.js';
import { setSession, clearSession } from '../middleware/session.js';
import { env } from '../lib/env.js';

const auth = new Hono();

// GET /auth/google - Redirect to Google OAuth
auth.get('/google', (c) => {
  const state = crypto.randomBytes(16).toString('hex');
  // In production, store state in a short-lived cookie to verify on callback
  const url = getAuthUrl(state);
  return c.redirect(url);
});

// GET /auth/google/callback - Handle OAuth callback
auth.get('/google/callback', async (c) => {
  const code = c.req.query('code');
  if (!code) {
    return c.json({ error: 'Missing authorization code' }, 400);
  }

  try {
    const user = await exchangeCode(code);
    setSession(c, user.id);

    // Sync calendars in background
    syncUserCalendars(user.id).catch((e) =>
      console.error('[auth] calendar sync failed:', e)
    );

    return c.redirect('/dashboard');
  } catch (e) {
    console.error('[auth] OAuth callback error:', e);
    return c.redirect('/?error=auth_failed');
  }
});

// POST /auth/logout
auth.post('/logout', (c) => {
  clearSession(c);
  return c.redirect('/');
});

export default auth;
