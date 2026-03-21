import { Hono } from 'hono';
import { requireAuth } from '../middleware/session.js';
import { db } from '../lib/db.js';
import { getEventsForDate, buildScheduleText, syncUserCalendars } from '../services/calendar.js';
import { validateChannelCredentials, pushMessage } from '../services/line.js';
import { env } from '../lib/env.js';
import type { AppVariables } from '../lib/types.js';

const api = new Hono<{ Variables: AppVariables }>();

api.use('/*', requireAuth);

// --- User Profile ---

api.get('/me', async (c) => {
  const userId = c.get('userId') as string;
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, name: true, picture: true, createdAt: true },
  });
  return c.json(user);
});

// --- Calendars ---

api.get('/calendars', async (c) => {
  const userId = c.get('userId') as string;
  const calendars = await db.calendarLink.findMany({ where: { userId }, orderBy: { isDefault: 'desc' } });
  return c.json(calendars);
});

api.post('/calendars/sync', async (c) => {
  const userId = c.get('userId') as string;
  await syncUserCalendars(userId);
  const calendars = await db.calendarLink.findMany({ where: { userId } });
  return c.json(calendars);
});

// --- Schedule ---

api.get('/schedule/:date', async (c) => {
  const userId = c.get('userId') as string;
  const dateStr = c.req.param('date');
  const date = new Date(dateStr + 'T00:00:00+09:00');

  if (isNaN(date.getTime())) {
    return c.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, 400);
  }

  const events = await getEventsForDate(userId, date);
  return c.json({ date: dateStr, events, text: buildScheduleText(events, date) });
});

// --- LINE Channel ---

api.get('/line/channels', async (c) => {
  const userId = c.get('userId') as string;
  const channels = await db.lineChannel.findMany({
    where: { userId },
    select: {
      id: true,
      channelId: true,
      webhookActive: true,
      lineUserId: true,
      createdAt: true,
    },
  });
  return c.json(channels);
});

api.post('/line/channels', async (c) => {
  const userId = c.get('userId') as string;
  const body = await c.req.json<{ channelId: string; channelSecret: string }>();

  if (!body.channelId || !body.channelSecret) {
    return c.json({ error: 'channelId and channelSecret are required' }, 400);
  }

  // Validate credentials by attempting to issue a token
  const valid = await validateChannelCredentials(body.channelId, body.channelSecret);
  if (!valid) {
    return c.json({ error: 'Invalid LINE channel credentials. Please check your Channel ID and Channel Secret.' }, 400);
  }

  const channel = await db.lineChannel.upsert({
    where: { userId_channelId: { userId, channelId: body.channelId } },
    update: { channelSecret: body.channelSecret },
    create: {
      userId,
      channelId: body.channelId,
      channelSecret: body.channelSecret,
    },
  });

  const webhookUrl = `${env.BASE_URL}/webhook/line/${channel.id}`;

  return c.json({
    id: channel.id,
    channelId: channel.channelId,
    webhookUrl,
    message: 'Channel registered. Set the Webhook URL in LINE Developers Console.',
  });
});

api.delete('/line/channels/:id', async (c) => {
  const userId = c.get('userId') as string;
  const id = c.req.param('id');

  await db.lineChannel.deleteMany({ where: { id, userId } });
  return c.json({ ok: true });
});

api.post('/line/channels/:id/test', async (c) => {
  const userId = c.get('userId') as string;
  const id = c.req.param('id');

  const channel = await db.lineChannel.findFirst({ where: { id, userId } });
  if (!channel) return c.json({ error: 'Channel not found' }, 404);
  if (!channel.lineUserId) {
    return c.json({ error: 'LINE user ID not captured yet. Send any message to your LINE bot first.' }, 400);
  }

  await pushMessage(channel.id, channel.lineUserId, '✅ CalPush Cloud テスト送信成功');
  return c.json({ ok: true, message: 'Test message sent' });
});

// --- Notifications History ---

api.get('/notifications', async (c) => {
  const userId = c.get('userId') as string;
  const limit = parseInt(c.req.query('limit') ?? '50', 10);

  const notifications = await db.notification.findMany({
    where: { userId },
    orderBy: { sentAt: 'desc' },
    take: limit,
  });
  return c.json(notifications);
});

export default api;
