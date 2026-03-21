import { Hono } from 'hono';
import { db } from '../lib/db.js';
import { verifySignature, replyMessage } from '../services/line.js';
import { getEventsForDate, buildScheduleText } from '../services/calendar.js';
import { createEvent, deleteEvent } from '../services/events.js';
import { getUserPlanInfo } from '../services/plan.js';
import { env } from '../lib/env.js';

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

  // --- Schedule Commands ---

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

  // --- Add Event: 予定追加 M/D HH:MM-HH:MM タイトル  or  予定追加 M/D タイトル ---

  if (text.startsWith('予定追加')) {
    try {
      const parsed = parseAddCommand(text);
      const calendars = await db.calendarLink.findMany({ where: { userId, isDefault: true } });
      const calendarId = calendars[0]?.calendarId;
      if (!calendarId) {
        await replyMessage(channelDbId, replyToken, '❌ カレンダーが未設定です。ダッシュボードで設定してください。');
        return;
      }

      await createEvent(userId, {
        calendarId,
        title: parsed.title,
        date: parsed.date,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
      });

      const timeStr = parsed.startTime ? `${parsed.startTime}〜${parsed.endTime}` : '終日';
      await replyMessage(channelDbId, replyToken, `✅ 予定を追加しました\n\n📅 ${parsed.date}\n🕐 ${timeStr}\n📝 ${parsed.title}`);
    } catch (e: any) {
      await replyMessage(channelDbId, replyToken, `❌ ${e.message}\n\n書式: 予定追加 M/D HH:MM-HH:MM タイトル\n例: 予定追加 4/1 10:00-11:00 会議`);
    }
    return;
  }

  // --- Delete Event: 予定削除 M/D タイトル ---

  if (text.startsWith('予定削除')) {
    try {
      const parsed = parseDeleteCommand(text);
      const date = new Date(parsed.date + 'T00:00:00+09:00');
      const events = await getEventsForDate(userId, date);
      const match = events.find((e) => e.title.includes(parsed.keyword));
      if (!match) {
        await replyMessage(channelDbId, replyToken, `❌ 「${parsed.keyword}」に一致する予定が見つかりません`);
        return;
      }

      const calendars = await db.calendarLink.findMany({ where: { userId } });
      const calendarId = calendars[0]?.calendarId;
      if (!calendarId) {
        await replyMessage(channelDbId, replyToken, '❌ カレンダーが未設定です');
        return;
      }

      await deleteEvent(userId, calendarId, match.id);
      await replyMessage(channelDbId, replyToken, `✅ 予定を削除しました\n📝 ${match.title}`);
    } catch (e: any) {
      await replyMessage(channelDbId, replyToken, `❌ ${e.message}\n\n書式: 予定削除 M/D タイトル\n例: 予定削除 4/1 会議`);
    }
    return;
  }

  // --- Usage ---

  if (text === '利用状況') {
    const info = await getUserPlanInfo(userId);
    const pushStr = info.usage.pushLimit === -1
      ? `${info.usage.pushCount} 通（無制限）`
      : `${info.usage.pushCount} / ${info.usage.pushLimit} 通`;
    await replyMessage(channelDbId, replyToken,
      `📊 利用状況\n\nプラン: ${info.plan.toUpperCase()}\n通知: ${pushStr}\nカレンダー: ${info.usage.calendarCount} / ${info.usage.calendarLimit === -1 ? '∞' : info.usage.calendarLimit}`
    );
    return;
  }

  // --- Dashboard Link ---

  if (text === '管理画面') {
    await replyMessage(channelDbId, replyToken, `🔧 CalPush Cloud ダッシュボード\n${env.BASE_URL}/dashboard`);
    return;
  }

  // --- Help ---

  if (text === 'ヘルプ' || text === 'help') {
    await replyMessage(channelDbId, replyToken,
      '📅 CalPush Cloud コマンド一覧\n' +
      '─────────────\n' +
      '今日の予定\n' +
      '明日の予定\n' +
      '予定追加 M/D HH:MM-HH:MM タイトル\n' +
      '予定追加 M/D タイトル（終日）\n' +
      '予定削除 M/D タイトル\n' +
      '利用状況\n' +
      '管理画面\n' +
      'ヘルプ'
    );
    return;
  }
}

// --- Command Parsers ---

function parseAddCommand(text: string): { date: string; startTime?: string; endTime?: string; title: string } {
  // 予定追加 M/D HH:MM-HH:MM タイトル
  const timedMatch = text.match(/^予定追加\s+(\d{1,2})\/(\d{1,2})\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})\s+(.+)$/);
  if (timedMatch) {
    const year = new Date().getFullYear();
    const month = timedMatch[1].padStart(2, '0');
    const day = timedMatch[2].padStart(2, '0');
    return {
      date: `${year}-${month}-${day}`,
      startTime: timedMatch[3],
      endTime: timedMatch[4],
      title: timedMatch[5],
    };
  }

  // 予定追加 M/D タイトル (all-day)
  const allDayMatch = text.match(/^予定追加\s+(\d{1,2})\/(\d{1,2})\s+(.+)$/);
  if (allDayMatch) {
    const year = new Date().getFullYear();
    const month = allDayMatch[1].padStart(2, '0');
    const day = allDayMatch[2].padStart(2, '0');
    return {
      date: `${year}-${month}-${day}`,
      title: allDayMatch[3],
    };
  }

  throw new Error('書式が正しくありません');
}

function parseDeleteCommand(text: string): { date: string; keyword: string } {
  const match = text.match(/^予定削除\s+(\d{1,2})\/(\d{1,2})\s+(.+)$/);
  if (!match) throw new Error('書式が正しくありません');

  const year = new Date().getFullYear();
  const month = match[1].padStart(2, '0');
  const day = match[2].padStart(2, '0');
  return { date: `${year}-${month}-${day}`, keyword: match[3] };
}

// LINE Webhook event types
interface LineWebhookEvent {
  type: string;
  replyToken?: string;
  source?: { userId?: string; type?: string };
  message?: { type?: string; text?: string };
}

export default webhook;
