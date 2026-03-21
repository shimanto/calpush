import { google } from 'googleapis';
import { env } from '../lib/env.js';
import { db } from '../lib/db.js';

const SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );
}

export function getAuthUrl(state: string): string {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state,
  });
}

export async function exchangeCode(code: string) {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: 'v2', auth: client });
  const { data: profile } = await oauth2.userinfo.get();

  if (!profile.id || !profile.email) {
    throw new Error('Failed to retrieve Google profile');
  }

  const user = await db.user.upsert({
    where: { googleId: profile.id },
    update: {
      email: profile.email,
      name: profile.name ?? null,
      picture: profile.picture ?? null,
      googleAccessToken: tokens.access_token ?? undefined,
      googleRefreshToken: tokens.refresh_token ?? undefined,
      googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
    create: {
      googleId: profile.id,
      email: profile.email,
      name: profile.name ?? null,
      picture: profile.picture ?? null,
      googleAccessToken: tokens.access_token ?? null,
      googleRefreshToken: tokens.refresh_token ?? null,
      googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
  });

  return user;
}

export async function getAuthenticatedClient(userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });

  if (!user.googleRefreshToken) {
    throw new Error('No refresh token available. User must re-authenticate.');
  }

  const client = createOAuth2Client();
  client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken,
    expiry_date: user.googleTokenExpiry?.getTime(),
  });

  client.on('tokens', async (tokens) => {
    await db.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: tokens.access_token ?? undefined,
        googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      },
    });
  });

  return client;
}
