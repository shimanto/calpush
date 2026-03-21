import { google, calendar_v3 } from 'googleapis';
import { getAuthenticatedClient } from './google-auth.js';
import { db } from '../lib/db.js';

export async function listCalendars(userId: string) {
  const auth = await getAuthenticatedClient(userId);
  const cal = google.calendar({ version: 'v3', auth });
  const { data } = await cal.calendarList.list();
  return data.items ?? [];
}

export async function syncUserCalendars(userId: string) {
  const calendars = await listCalendars(userId);

  for (const cal of calendars) {
    if (!cal.id) continue;
    await db.calendarLink.upsert({
      where: { userId_calendarId: { userId, calendarId: cal.id } },
      update: { name: cal.summary ?? null, color: cal.backgroundColor ?? null },
      create: {
        userId,
        calendarId: cal.id,
        name: cal.summary ?? null,
        color: cal.backgroundColor ?? null,
        isDefault: cal.primary === true,
      },
    });
  }
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  location?: string;
  calendarName?: string;
}

export async function getEventsForDate(userId: string, date: Date): Promise<CalendarEvent[]> {
  const auth = await getAuthenticatedClient(userId);
  const cal = google.calendar({ version: 'v3', auth });

  const calendars = await db.calendarLink.findMany({ where: { userId } });
  if (calendars.length === 0) return [];

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const events: CalendarEvent[] = [];

  for (const link of calendars) {
    const { data } = await cal.events.list({
      calendarId: link.calendarId,
      timeMin: dayStart.toISOString(),
      timeMax: dayEnd.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    for (const ev of data.items ?? []) {
      if (!ev.id || !ev.summary) continue;

      const allDay = !!ev.start?.date;
      const start = allDay
        ? new Date(ev.start!.date!)
        : new Date(ev.start!.dateTime!);
      const end = allDay
        ? new Date(ev.end!.date!)
        : new Date(ev.end!.dateTime!);

      events.push({
        id: ev.id,
        title: ev.summary,
        start,
        end,
        allDay,
        location: ev.location ?? undefined,
        calendarName: link.name ?? undefined,
      });
    }
  }

  events.sort((a, b) => {
    if (a.allDay && !b.allDay) return -1;
    if (!a.allDay && b.allDay) return 1;
    return a.start.getTime() - b.start.getTime();
  });

  return events;
}

export async function getUpcomingEvents(userId: string, withinMinutes: number): Promise<CalendarEvent[]> {
  const auth = await getAuthenticatedClient(userId);
  const cal = google.calendar({ version: 'v3', auth });

  const calendars = await db.calendarLink.findMany({ where: { userId } });
  if (calendars.length === 0) return [];

  const now = new Date();
  const soon = new Date(now.getTime() + withinMinutes * 60 * 1000);

  const events: CalendarEvent[] = [];

  for (const link of calendars) {
    const { data } = await cal.events.list({
      calendarId: link.calendarId,
      timeMin: now.toISOString(),
      timeMax: soon.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    for (const ev of data.items ?? []) {
      if (!ev.id || !ev.summary || !ev.start?.dateTime) continue;

      events.push({
        id: ev.id,
        title: ev.summary,
        start: new Date(ev.start.dateTime),
        end: new Date(ev.end!.dateTime!),
        allDay: false,
        location: ev.location ?? undefined,
        calendarName: link.name ?? undefined,
      });
    }
  }

  return events;
}

export function buildScheduleText(events: CalendarEvent[], date: Date): string {
  const mm = date.getMonth() + 1;
  const dd = date.getDate();
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  const dow = dayNames[date.getDay()];

  if (events.length === 0) {
    return `📅 ${mm}/${dd}（${dow}）の予定\n\n予定はありません`;
  }

  const lines = [`📅 ${mm}/${dd}（${dow}）の予定\n`];

  for (const ev of events) {
    if (ev.allDay) {
      lines.push(`📌 終日  ${ev.title}`);
    } else {
      const sh = String(ev.start.getHours()).padStart(2, '0');
      const sm = String(ev.start.getMinutes()).padStart(2, '0');
      const eh = String(ev.end.getHours()).padStart(2, '0');
      const em = String(ev.end.getMinutes()).padStart(2, '0');
      lines.push(`🕐 ${sh}:${sm}〜${eh}:${em}  ${ev.title}`);
    }
  }

  lines.push(`\n合計 ${events.length} 件`);
  return lines.join('\n');
}
