import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import crypto from 'crypto';
import { env } from '../lib/env.js';
import type { AppVariables } from '../lib/types.js';
import type { Context, Next } from 'hono';

// Simple signed-cookie session (userId only, no external store needed for MVP)

const COOKIE_NAME = 'calpush_session';
const MAX_AGE = 30 * 24 * 60 * 60; // 30 days

function sign(value: string): string {
  const sig = crypto.createHmac('sha256', env.SESSION_SECRET).update(value).digest('base64url');
  return `${value}.${sig}`;
}

function unsign(signed: string): string | null {
  const idx = signed.lastIndexOf('.');
  if (idx < 0) return null;
  const value = signed.slice(0, idx);
  if (sign(value) === signed) return value;
  return null;
}

export function setSession(c: Context, userId: string) {
  setCookie(c, COOKIE_NAME, sign(userId), {
    httpOnly: true,
    secure: env.BASE_URL.startsWith('https'),
    sameSite: 'Lax',
    maxAge: MAX_AGE,
    path: '/',
  });
}

export function clearSession(c: Context) {
  deleteCookie(c, COOKIE_NAME, { path: '/' });
}

export function getSessionUserId(c: Context): string | null {
  const cookie = getCookie(c, COOKIE_NAME);
  if (!cookie) return null;
  return unsign(cookie);
}

export async function requireAuth(c: Context<{ Variables: AppVariables }>, next: Next) {
  const userId = getSessionUserId(c);
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  c.set('userId', userId);
  await next();
}
