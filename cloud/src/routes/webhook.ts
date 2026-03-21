import { Hono } from 'hono';
import { db } from '../lib/db.js';
import { verifySignature, replyMessage } from '../services/line.js';
import { getEventsForDate, buildScheduleText } from '../services/calendar.js';

const webhook = new Hono();

// POST /webhook/line/:channelId - Receive LINE webhook events
webhook.post('/line/:channelId', async (c) => {
  const channelDbId = c.req.param('channelId');

  const channel = await db.lineChannel.findUnique({
    where: { id: channelDbId },
    include: { user: true },
  });

  if (!channel) {
    return c.json({ error: 'Channel not found' }, 404);
  }

  // Verify webhook signature
  const rawBody = await c.req.text();
  const signature = c.req.header('x-line-signature') ?? '';

  if (!verifySignature(channel.channelSecret, rawBody, signature)) {
    return c.json({ error: 'Invalid signature' }, 403);
  }

  // Activate webhook on first valid request
  if (!channel.webhookActive) {
    await db.lineChannel.update({
      where: { id: channelDbId },
      data: { webhookActive: true },
    });
  }

  const body = JSON.parse(rawBody);
  const events = body.events as LineWebhookEvent[];

  for (const event of events) {
    // Capture LINE user ID on first interaction
    if (event.source?.userId && !channel.lineUserId) {
      await db.lineChannel.update({
        where: { id: channelDbId },
        data: { lineUserId: event.source.userId },
      });
    }

    if (event.type === 'message' && event.message?.type === 'text') {
      await handleTextCommand(channel.id, channel.user.id, event);
    }
  }

  return c.json({ ok: true });
});

async function handleTextCommand(channelDbId: string, userId: string, event: LineWebhookEvent) {
  const text = event.message!.text!.trim();
  const replyToken = event.replyToken!;

  if (text === '今日の予定') {
    const today = new Date();
    const events = await getEventsForDate(userId, today);
    const msg = buildScheduleText(events, today);
    await replyMessage(channelDbId, replyToken, msg);
    return;
  }

  if (text === '明日の予定') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const events = await getEventsForDate(userId, tomorrow);
    const msg = buildScheduleText(events, tomorrow);
    await replyMessage(channelDbId, replyToken, msg);
    return;
  }

  if (text === 'ヘルプ' || text === 'help') {
    await replyMessage(channelDbId, replyToken,
      '📅 CalPush Cloud コマンド一覧\n' +
      '─────────────\n' +
      '今日の予定\n' +
      '明日の予定\n' +
      'ヘルプ'
    );
    return;
  }
}

// LINE Webhook event types
interface LineWebhookEvent {
  type: string;
  replyToken?: string;
  source?: { userId?: string; type?: string };
  message?: { type?: string; text?: string };
}

export default webhook;
