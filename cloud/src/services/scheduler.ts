import { db } from '../lib/db.js';
import { getEventsForDate, getUpcomingEvents, buildScheduleText } from './calendar.js';
import { pushMessage } from './line.js';
import { incrementPushCount } from './plan.js';

// --- Daily Schedule Notification ---

export async function sendDailySchedules() {
  const users = await db.user.findMany({
    where: { googleRefreshToken: { not: null } },
    include: { lineChannels: { where: { webhookActive: true, lineUserId: { not: null } } } },
  });

  const today = new Date();
  let sent = 0;
  let errors = 0;
  let limited = 0;

  for (const user of users) {
    // Check user's preferred notify time (JST)
    const [prefH, prefM] = (user.notifyTime || '08:55').split(':').map(Number);
    const now = new Date();
    const jstHour = (now.getUTCHours() + 9) % 24;
    const jstMin = now.getMinutes();
    if (jstHour !== prefH || jstMin !== prefM) continue;

    for (const channel of user.lineChannels) {
      try {
        // Check plan limits
        const { allowed } = await incrementPushCount(user.id);
        if (!allowed) {
          limited++;
          continue;
        }

        const events = await getEventsForDate(user.id, today);
        const text = buildScheduleText(events, today);
        await pushMessage(channel.id, channel.lineUserId!, text);

        await db.notification.create({
          data: {
            userId: user.id,
            lineChannelId: channel.id,
            type: 'daily_schedule',
            title: `${today.getMonth() + 1}/${today.getDate()} の予定`,
            body: text,
          },
        });
        sent++;
      } catch (e) {
        console.error(`[scheduler] daily schedule failed for user=${user.id}:`, e);
        errors++;
      }
    }
  }

  console.log(`[scheduler] daily schedules: sent=${sent}, errors=${errors}, limited=${limited}`);
}

// --- Event Reminder ---

export async function sendEventReminders() {
  const users = await db.user.findMany({
    where: { googleRefreshToken: { not: null } },
    include: { lineChannels: { where: { webhookActive: true, lineUserId: { not: null } } } },
  });

  let sent = 0;

  for (const user of users) {
    if (user.lineChannels.length === 0) continue;

    const reminderMin = user.reminderMinutes ?? 5;

    try {
      const events = await getUpcomingEvents(user.id, reminderMin + 1);
      const now = Date.now();

      for (const ev of events) {
        const diff = ev.start.getTime() - now;
        const minMs = (reminderMin - 0.5) * 60 * 1000;
        const maxMs = (reminderMin + 1) * 60 * 1000;
        if (diff < minMs || diff > maxMs) continue;

        // Check plan limits
        const { allowed } = await incrementPushCount(user.id);
        if (!allowed) continue;

        const hh = String(ev.start.getHours()).padStart(2, '0');
        const mm = String(ev.start.getMinutes()).padStart(2, '0');
        const text = `⏰ まもなく開始\n\n🕐 ${hh}:${mm}〜 ${ev.title}`;

        for (const channel of user.lineChannels) {
          await pushMessage(channel.id, channel.lineUserId!, text);
          await db.notification.create({
            data: {
              userId: user.id,
              lineChannelId: channel.id,
              type: 'reminder',
              title: ev.title,
              body: text,
            },
          });
          sent++;
        }
      }
    } catch (e) {
      console.error(`[scheduler] reminder failed for user=${user.id}:`, e);
    }
  }

  if (sent > 0) console.log(`[scheduler] reminders sent: ${sent}`);
}

// --- Scheduler Runner ---

let dailyTimer: ReturnType<typeof setInterval> | null = null;
let reminderTimer: ReturnType<typeof setInterval> | null = null;

export function startScheduler() {
  console.log('[scheduler] starting...');

  // Daily schedule: check every minute for each user's preferred time
  dailyTimer = setInterval(async () => {
    await sendDailySchedules();
  }, 60 * 1000);

  // Reminder: check every minute
  reminderTimer = setInterval(async () => {
    await sendEventReminders();
  }, 60 * 1000);

  console.log('[scheduler] started (daily=per-user time, reminders=every 1min)');
}

export function stopScheduler() {
  if (dailyTimer) clearInterval(dailyTimer);
  if (reminderTimer) clearInterval(reminderTimer);
  console.log('[scheduler] stopped');
}
