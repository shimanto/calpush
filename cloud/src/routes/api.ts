import { Hono } from 'hono';
import { requireAuth } from '../middleware/session.js';
import { db } from '../lib/db.js';
import { getEventsForDate, buildScheduleText, syncUserCalendars } from '../services/calendar.js';
import { validateChannelCredentials, pushMessage } from '../services/line.js';
import { createEvent, updateEvent, deleteEvent, getTentativeEvents, confirmTentativeEvent, getAvailableSlots } from '../services/events.js';
import { getUserPlanInfo, getPlanLimits } from '../services/plan.js';
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

// --- Plan & Usage ---

api.get('/plan', async (c) => {
  const userId = c.get('userId') as string;
  return c.json(await getUserPlanInfo(userId));
});

api.patch('/settings', async (c) => {
  const userId = c.get('userId') as string;
  const body = await c.req.json<{ notifyTime?: string; reminderMinutes?: number }>();
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const limits = getPlanLimits(user.plan);

  const update: any = {};
  if (body.notifyTime !== undefined) {
    if (!limits.customNotifyTime && body.notifyTime !== '08:55') {
      return c.json({ error: 'Custom notify time requires Pro plan' }, 403);
    }
    update.notifyTime = body.notifyTime;
  }
  if (body.reminderMinutes !== undefined) {
    if (!limits.customReminderMinutes && body.reminderMinutes !== 5) {
      return c.json({ error: 'Custom reminder timing requires Pro plan' }, 403);
    }
    update.reminderMinutes = body.reminderMinutes;
  }

  await db.user.update({ where: { id: userId }, data: update });
  return c.json({ ok: true });
});

// --- Events CRUD ---

api.post('/events', async (c) => {
  const userId = c.get('userId') as string;
  const body = await c.req.json();
  const ev = await createEvent(userId, body);
  return c.json(ev, 201);
});

api.patch('/events/:calendarId/:eventId', async (c) => {
  const userId = c.get('userId') as string;
  const calendarId = c.req.param('calendarId');
  const eventId = c.req.param('eventId');
  const body = await c.req.json();
  const ev = await updateEvent(userId, calendarId, eventId, body);
  return c.json(ev);
});

api.delete('/events/:calendarId/:eventId', async (c) => {
  const userId = c.get('userId') as string;
  const calendarId = c.req.param('calendarId');
  const eventId = c.req.param('eventId');
  await deleteEvent(userId, calendarId, eventId);
  return c.json({ ok: true });
});

// --- Tentative Events ---

api.get('/tentative', async (c) => {
  const userId = c.get('userId') as string;
  return c.json(await getTentativeEvents(userId));
});

api.post('/tentative/:calendarId/:eventId/confirm', async (c) => {
  const userId = c.get('userId') as string;
  const calendarId = c.req.param('calendarId');
  const eventId = c.req.param('eventId');
  await confirmTentativeEvent(userId, calendarId, eventId);
  return c.json({ ok: true });
});

api.delete('/tentative/:calendarId/:eventId', async (c) => {
  const userId = c.get('userId') as string;
  const calendarId = c.req.param('calendarId');
  const eventId = c.req.param('eventId');
  await deleteEvent(userId, calendarId, eventId);
  return c.json({ ok: true });
});

// --- Available Slots ---

api.get('/slots', async (c) => {
  const userId = c.get('userId') as string;
  const days = parseInt(c.req.query('days') ?? '3', 10);
  const minutes = parseInt(c.req.query('minutes') ?? '60', 10);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const limits = getPlanLimits(user.plan);

  // Free: 3 days max, Pro: 14 days
  const maxDays = user.plan === 'free' ? 3 : 14;
  const slots = await getAvailableSlots(userId, Math.min(days, maxDays), minutes);
  return c.json({ slots, maxDays });
});

// --- Account Deletion ---

api.delete('/account', async (c) => {
  const userId = c.get('userId') as string;
  await db.user.delete({ where: { id: userId } });
  return c.json({ ok: true, message: 'Account and all data deleted' });
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
