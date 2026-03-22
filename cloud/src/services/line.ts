import jwt from 'jsonwebtoken';
import { db } from '../lib/db.js';
import crypto from 'crypto';

// --- Channel Access Token v2.1 (JWT-based) ---

export async function issueChannelAccessToken(channelId: string, channelSecret: string): Promise<{ accessToken: string; expiresIn: number }> {
  // For Channel Access Token v2.1, we use the stateless token endpoint
  // which is simpler and doesn't require RSA key pair management.
  // Stateless tokens are valid for 15 minutes and don't count toward the 30-token limit.
  const res = await fetch('https://api.line.me/oauth2/v3/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: channelId,
      client_secret: channelSecret,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LINE token issue failed: ${res.status} ${body}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

export async function getAccessToken(lineChannelId: string): Promise<string> {
  const channel = await db.lineChannel.findUniqueOrThrow({ where: { id: lineChannelId } });

  // If token exists and not expired (with 5-min buffer), reuse it
  if (channel.accessToken && channel.tokenExpiry) {
    const bufferMs = 5 * 60 * 1000;
    if (channel.tokenExpiry.getTime() - bufferMs > Date.now()) {
      return channel.accessToken;
    }
  }

  // Issue new token
  const { accessToken, expiresIn } = await issueChannelAccessToken(channel.channelId, channel.channelSecret);
  const expiry = new Date(Date.now() + expiresIn * 1000);

  await db.lineChannel.update({
    where: { id: lineChannelId },
    data: { accessToken, tokenExpiry: expiry },
  });

  return accessToken;
}

// --- Message Sending ---

export async function pushMessage(lineChannelId: string, toUserId: string, text: string) {
  const token = await getAccessToken(lineChannelId);

  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: toUserId,
      messages: [{ type: 'text', text }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LINE push failed: ${res.status} ${body}`);
  }
}

export async function replyMessage(lineChannelId: string, replyToken: string, text: string) {
  const token = await getAccessToken(lineChannelId);

  const res = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LINE reply failed: ${res.status} ${body}`);
  }
}

// --- Webhook Signature Verification ---

export function verifySignature(channelSecret: string, body: string, signature: string): boolean {
  const hash = crypto
    .createHmac('SHA256', channelSecret)
    .update(body)
    .digest('base64');
  return hash === signature;
}

// --- Validate Channel Credentials ---

export async function validateChannelCredentials(channelId: string, channelSecret: string): Promise<boolean> {
  try {
    await issueChannelAccessToken(channelId, channelSecret);
    return true;
  } catch {
    return false;
  }
}
