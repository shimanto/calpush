import { google } from 'googleapis';
import { getAuthenticatedClient } from './google-auth.js';
import { db } from '../lib/db.js';

// --- Event CRUD ---

export interface CreateEventInput {
  calendarId: string;
  title: string;
  date: string;      // YYYY-MM-DD
  startTime?: string; // HH:MM (omit for all-day)
  endTime?: string;   // HH:MM
  location?: string;
  tentative?: boolean;
}

export async function createEvent(userId: string, input: CreateEventInput) {
  const auth = await getAuthenticatedClient(userId);
  const cal = google.calendar({ version: 'v3', auth });

  const summary = input.tentative ? `【仮】${input.title}` : input.title;

  const event: any = { summary };
  if (input.location) event.location = input.location;

  if (input.startTime && input.endTime) {
    event.start = { dateTime: `${input.date}T${input.startTime}:00+09:00`, timeZone: 'Asia/Tokyo' };
    event.end = { dateTime: `${input.date}T${input.endTime}:00+09:00`, timeZone: 'Asia/Tokyo' };
  } else {
    event.start = { date: input.date };
    // All-day events end on the next day
    const nextDay = new Date(input.date);
    nextDay.setDate(nextDay.getDate() + 1);
    const nd = nextDay.toISOString().split('T')[0];
    event.end = { date: nd };
  }

  const { data } = await cal.events.insert({
    calendarId: input.calendarId,
    requestBody: event,
  });

  return data;
}

export async function updateEvent(
  userId: string,
  calendarId: string,
  eventId: string,
  updates: { title?: string; date?: string; startTime?: string; endTime?: string; location?: string }
) {
  const auth = await getAuthenticatedClient(userId);
  const cal = google.calendar({ version: 'v3', auth });

  const patch: any = {};
  if (updates.title) patch.summary = updates.title;
  if (updates.location !== undefined) patch.location = updates.location;

  if (updates.date && updates.startTime && updates.endTime) {
    patch.start = { dateTime: `${updates.date}T${updates.startTime}:00+09:00`, timeZone: 'Asia/Tokyo' };
    patch.end = { dateTime: `${updates.date}T${updates.endTime}:00+09:00`, timeZone: 'Asia/Tokyo' };
  } else if (updates.date) {
    patch.start = { date: updates.date };
    const nextDay = new Date(updates.date);
    nextDay.setDate(nextDay.getDate() + 1);
    patch.end = { date: nextDay.toISOString().split('T')[0] };
  }

  const { data } = await cal.events.patch({
    calendarId,
    eventId,
    requestBody: patch,
  });

  return data;
}

export async function deleteEvent(userId: string, calendarId: string, eventId: string) {
  const auth = await getAuthenticatedClient(userId);
  const cal = google.calendar({ version: 'v3', auth });

  await cal.events.delete({ calendarId, eventId });
}

// --- Tentative Event Management ---

export async function getTentativeEvents(userId: string) {
  const auth = await getAuthenticatedClient(userId);
  const cal = google.calendar({ version: 'v3', auth });
  const calendars = await db.calendarLink.findMany({ where: { userId } });

  const now = new Date();
  const futureLimit = new Date();
  futureLimit.setDate(futureLimit.getDate() + 90);

  const tentatives: any[] = [];

  for (const link of calendars) {
    const { data } = await cal.events.list({
      calendarId: link.calendarId,
      timeMin: now.toISOString(),
      timeMax: futureLimit.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      q: '【仮】',
    });

    for (const ev of data.items ?? []) {
      if (!ev.summary?.startsWith('【仮】')) continue;
      tentatives.push({
        id: ev.id,
        calendarId: link.calendarId,
        title: ev.summary.replace('【仮】', ''),
        start: ev.start?.dateTime ?? ev.start?.date,
        end: ev.end?.dateTime ?? ev.end?.date,
        allDay: !!ev.start?.date,
      });
    }
  }

  return tentatives;
}

export async function confirmTentativeEvent(userId: string, calendarId: string, eventId: string) {
  const auth = await getAuthenticatedClient(userId);
  const cal = google.calendar({ version: 'v3', auth });

  const { data: ev } = await cal.events.get({ calendarId, eventId });
  if (!ev.summary?.startsWith('【仮】')) {
    throw new Error('Event is not tentative');
  }

  await cal.events.patch({
    calendarId,
    eventId,
    requestBody: { summary: ev.summary.replace('【仮】', '') },
  });
}

export async function getAvailableSlots(userId: string, days: number, durationMinutes: number) {
  const auth = await getAuthenticatedClient(userId);
  const cal = google.calendar({ version: 'v3', auth });
  const calendars = await db.calendarLink.findMany({ where: { userId } });

  if (calendars.length === 0) return [];

  const now = new Date();
  const end = new Date();
  end.setDate(end.getDate() + days);

  // Gather all busy times
  const busyTimes: { start: Date; end: Date }[] = [];

  for (const link of calendars) {
    const { data } = await cal.events.list({
      calendarId: link.calendarId,
      timeMin: now.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    for (const ev of data.items ?? []) {
      if (ev.start?.dateTime && ev.end?.dateTime) {
        busyTimes.push({ start: new Date(ev.start.dateTime), end: new Date(ev.end.dateTime) });
      }
    }
  }

  busyTimes.sort((a, b) => a.start.getTime() - b.start.getTime());

  // Find free slots (9:00-18:00 JST workday)
  const slots: { date: string; start: string; end: string }[] = [];
  const durationMs = durationMinutes * 60 * 1000;

  for (let d = 0; d < days; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);
    if (d === 0 && day.getHours() >= 18) continue; // Skip today if past work hours

    // 9:00-18:00 JST
    const dayStart = new Date(day);
    dayStart.setHours(9, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(18, 0, 0, 0);

    const actualStart = d === 0 ? new Date(Math.max(now.getTime(), dayStart.getTime())) : dayStart;

    // Check 30-min intervals
    let cursor = actualStart.getTime();
    while (cursor + durationMs <= dayEnd.getTime()) {
      const slotStart = cursor;
      const slotEnd = cursor + durationMs;

      const conflict = busyTimes.some(
        (b) => b.start.getTime() < slotEnd && b.end.getTime() > slotStart
      );

      if (!conflict) {
        const s = new Date(slotStart);
        const e = new Date(slotEnd);
        slots.push({
          date: `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`,
          start: `${String(s.getHours()).padStart(2, '0')}:${String(s.getMinutes()).padStart(2, '0')}`,
          end: `${String(e.getHours()).padStart(2, '0')}:${String(e.getMinutes()).padStart(2, '0')}`,
        });
      }

      cursor += 30 * 60 * 1000; // 30-min step
    }
  }

  return slots;
}
