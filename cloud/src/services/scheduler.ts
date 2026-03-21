import { db } from '../lib/db.js';
import { getEventsForDate, getUpcomingEvents, buildScheduleText } from './calendar.js';
import { pushMessage } from './line.js';

// --- Daily Schedule Notification ---

export async function sendDailySchedules() {
  const users = await db.user.findMany({
    where: { googleRefreshToken: { not: null } },
    include: { lineChannels: { where: { webhookActive: true, lineUserId: { not: null } } } },
  });

  const today = new Date();
  let sent = 0;
  let errors = 0;

  for (const user of users) {
    for (const channel of user.lineChannels) {
      try {
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

  console.log(`[scheduler] daily schedules: sent=${sent}, errors=${errors}`);
}

// --- Event Reminder (5 minutes before) ---

export async function sendEventReminders() {
  const users = await db.user.findMany({
    where: { googleRefreshToken: { not: null } },
    include: { lineChannels: { where: { webhookActive: true, lineUserId: { not: null } } } },
  });

  let sent = 0;

  for (const user of users) {
    if (user.lineChannels.length === 0) continue;

    try {
      // Events starting in the next 5-6 minutes
      const events = await getUpcomingEvents(user.id, 6);
      const now = Date.now();

      for (const ev of events) {
        const diff = ev.start.getTime() - now;
        // Only notify for events 4.5-6 minutes away (to avoid double-sending)
        if (diff < 4.5 * 60 * 1000 || diff > 6 * 60 * 1000) continue;

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

  // Daily schedule: check every minute, send at ~08:55 JST
  dailyTimer = setInterval(async () => {
    const now = new Date();
    const jstHour = (now.getUTCHours() + 9) % 24;
    const jstMin = now.getMinutes();
    if (jstHour === 8 && jstMin === 55) {
      await sendDailySchedules();
    }
  }, 60 * 1000);

  // Reminder: check every minute
  reminderTimer = setInterval(async () => {
    await sendEventReminders();
  }, 60 * 1000);

  console.log('[scheduler] started (daily=08:55 JST, reminders=every 1min)');
}

export function stopScheduler() {
  if (dailyTimer) clearInterval(dailyTimer);
  if (reminderTimer) clearInterval(reminderTimer);
  console.log('[scheduler] stopped');
}
