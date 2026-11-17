// Exact class and exam times. The timetable is planned in parts of the day
// (slots), but every class has a real start and end time (8–10 am, 1–3 pm...)
// and every alert, timetable cell and quest uses these, compared with the
// game clock in minutes. Pure: no imports beyond the clock.
import { clockMin, formatTime } from './time';
import type { CourseState, GameState, Meeting } from './types';

function hashCode(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

/** The periods of a teaching day. Lunch is 12 to 1. */
export const PERIODS: Array<{ id: string; label: string; start: number; end: number; slot: number; break?: boolean }> = [
  { id: 'p1', label: '8–10 am', start: 8 * 60, end: 10 * 60, slot: 0 },
  { id: 'p2', label: '10–12', start: 10 * 60, end: 12 * 60, slot: 0 },
  { id: 'lunch', label: '12–1 pm', start: 12 * 60, end: 13 * 60, slot: 1, break: true },
  { id: 'p3', label: '1–3 pm', start: 13 * 60, end: 15 * 60, slot: 1 },
  { id: 'p4', label: '4–6 pm', start: 16 * 60, end: 18 * 60, slot: 2 },
];

/** Exam papers by part of the day. */
export const EXAM_PERIODS: Array<{ start: number; end: number }> = [
  { start: 9 * 60, end: 12 * 60 },
  { start: 13 * 60, end: 16 * 60 },
  { start: 16 * 60, end: 19 * 60 },
  { start: 20 * 60, end: 23 * 60 },
];

/** Which period a class falls in (mornings split between 8 and 10 by course). */
export function meetingPeriod(course: Pick<CourseState, 'code'>, meeting: Pick<Meeting, 'slot'>): (typeof PERIODS)[number] {
  if (meeting.slot === 0) return PERIODS[hashCode(course.code) % 2]!;
  if (meeting.slot === 1) return PERIODS[3]!;
  return PERIODS[4]!;
}

/** Start and end of a class, in minutes since midnight. */
export function classWindow(course: Pick<CourseState, 'code'>, meeting: Pick<Meeting, 'slot'>): { start: number; end: number } {
  const p = meetingPeriod(course, meeting);
  return { start: p.start, end: p.end };
}

/** Start and end of an exam paper, in minutes since midnight. */
export function examWindow(slot: number): { start: number; end: number } {
  return EXAM_PERIODS[slot] ?? EXAM_PERIODS[0]!;
}

/** "8:00 am" for the start of a class. */
export function classStart(course: Pick<CourseState, 'code'>, meeting: Pick<Meeting, 'slot'>): string {
  return formatTime(classWindow(course, meeting).start);
}

/** "9:00 am" for the start of an exam. */
export function examStart(slot: number): string {
  return formatTime(examWindow(slot).start);
}

/** "8:00–10:00 am" (or "11:00 am–1:00 pm") for a window. */
export function windowText(w: { start: number; end: number }): string {
  const s = formatTime(w.start);
  const e = formatTime(w.end);
  const sameHalf = s.slice(-2) === e.slice(-2);
  return `${sameHalf ? s.slice(0, -3) : s}–${e}`;
}

/** Minutes since the start of day 1 of the semester (night past midnight keeps counting). */
export function absMin(day: number, min: number): number {
  return day * 1440 + min;
}

/** Now, on the same scale as absMin. */
export function nowAbs(d: GameState): number {
  return absMin(d.clock.day, clockMin(d.clock));
}

export type ClassState = 'cancelled' | 'attended' | 'upcoming' | 'on' | 'over';

/** Where a class stands right now, by the clock (not by the part of the day). */
export function classState(d: GameState, course: CourseState, meeting: Meeting): ClassState {
  if (meeting.status === 'cancelled') return 'cancelled';
  if (meeting.attended) return 'attended';
  const w = classWindow(course, meeting);
  const now = nowAbs(d);
  if (now < absMin(meeting.day, w.start)) return 'upcoming';
  if (now < absMin(meeting.day, w.end)) return 'on';
  return 'over';
}

/** Minutes from now until a class starts (negative once it has started). */
export function minutesUntilClass(d: GameState, course: CourseState, meeting: Meeting): number {
  return absMin(meeting.day, classWindow(course, meeting).start) - nowAbs(d);
}

/** "5 h", "1 h 20 min", "45 min". */
export function inTime(min: number): string {
  const m = Math.max(1, Math.round(min));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return `${r} min`;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export interface ClassAlert {
  id: string;
  kind: 'late' | 'soon' | 'exam_late' | 'exam_soon';
  code: string;
  placeId: string;
  /** Minutes until it starts (negative: already started). */
  minutes: number;
  text: string;
  /** Red: late, or starting within the hour. */
  urgent: boolean;
}

/** How far ahead to warn about a class (minutes). */
export const ALERT_AHEAD = 14 * 60;

/**
 * Alerts for classes and exams by the clock: "You're late" only between a
 * class's start and end when you are not in its hall; "CSC 101 at 10:00 am
 * in 5 h" before it starts. `hereId` is the place you are inside (if any).
 */
export function classAlerts(d: GameState, hereId: string | null): ClassAlert[] {
  const out: ClassAlert[] = [];
  const now = nowAbs(d);
  for (const c of d.academics.courses) {
    for (const m of c.meetings) {
      if (m.status !== 'scheduled' || m.attended) continue;
      const w = classWindow(c, m);
      const start = absMin(m.day, w.start);
      const end = absMin(m.day, w.end);
      if (now >= end || start - now > ALERT_AHEAD) continue;
      const what = `${c.code}${m.test ? ' TEST' : ''}`;
      if (now >= start) {
        if (hereId === m.placeId) continue;
        out.push({ id: `late:${c.code}:${m.day}`, kind: 'late', code: c.code, placeId: m.placeId, minutes: start - now, urgent: true, text: `You're late! ${what} started at ${formatTime(w.start)} (till ${formatTime(w.end)})` });
      } else {
        out.push({ id: `soon:${c.code}:${m.day}`, kind: 'soon', code: c.code, placeId: m.placeId, minutes: start - now, urgent: start - now <= 60 || !!m.test, text: `${what} at ${formatTime(w.start)} in ${inTime(start - now)}` });
      }
    }
    const e = c.exam;
    if (e.status === 'pending') {
      const w = examWindow(e.slot);
      const start = absMin(e.day, w.start);
      const end = absMin(e.day, w.end);
      if (now < end && start - now <= ALERT_AHEAD) {
        if (now >= start) {
          if (hereId !== e.placeId) out.push({ id: `exam_late:${c.code}`, kind: 'exam_late', code: c.code, placeId: e.placeId, minutes: start - now, urgent: true, text: `${c.code} EXAM started at ${formatTime(w.start)}! Go now` });
        } else out.push({ id: `exam_soon:${c.code}`, kind: 'exam_soon', code: c.code, placeId: e.placeId, minutes: start - now, urgent: true, text: `${c.code} EXAM at ${formatTime(w.start)} in ${inTime(start - now)}` });
      }
    }
  }
  return out.sort((a, b) => a.minutes - b.minutes);
}

/** The next class you can still make (on now or later), by the clock. */
export function nextClass(d: GameState): { course: CourseState; meeting: Meeting; start: number; end: number; on: boolean } | null {
  const now = nowAbs(d);
  let best: { course: CourseState; meeting: Meeting; start: number; end: number; on: boolean } | null = null;
  for (const c of d.academics.courses) {
    for (const m of c.meetings) {
      if (m.status !== 'scheduled' || m.attended) continue;
      const w = classWindow(c, m);
      const start = absMin(m.day, w.start);
      const end = absMin(m.day, w.end);
      if (end <= now) continue;
      if (!best || start < best.start) best = { course: c, meeting: m, start, end, on: now >= start };
    }
  }
  return best;
}

/** The first class tomorrow (for the alarm): minutes since midnight, or null. */
export function firstClassOn(d: GameState, day: number): { code: string; start: number } | null {
  let best: { code: string; start: number } | null = null;
  for (const c of d.academics.courses) {
    for (const m of c.meetings) {
      if (m.day !== day || m.status !== 'scheduled') continue;
      const s = classWindow(c, m).start;
      if (!best || s < best.start) best = { code: c.code, start: s };
    }
    if (c.exam.status === 'pending' && c.exam.day === day) {
      const s = examWindow(c.exam.slot).start;
      if (!best || s < best.start) best = { code: `${c.code} exam`, start: s };
    }
  }
  return best;
}
