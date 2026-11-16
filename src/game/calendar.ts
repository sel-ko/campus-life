// The academic calendar: real dates for the game's days, and the dates that
// matter this semester (orientation, registration, fees, exam forms, tests,
// the election, exams). The first semester starts on the first Monday of
// October; the second on the first Monday of February. A game semester is a
// compressed fortnight, so day 1 is that Monday and day 14 the second Sunday.
// Pure: reads the state.
import { ALLOWANCE_DAYS, EXAM_DAYS, FRESHER_LECTURES_START, LATE_REGISTRATION_CLOSE, ORIENTATION_DAYS, SEMESTER_DAYS } from './config';
import { ELECTION_DAY, upcomingElection } from './goals';
import { registrationDeadline } from './money';
import type { CourseState, GameState, Meeting } from './types';

/** Days of the exam-form signing window (at the College Office). */
export const EXAM_FORM_DAYS = [15, 16, 17, 18, 19];
/** Paid at the exam hall if you never signed your exam form. */
export const EXAM_FORM_LATE_FEE = 2000;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** The calendar year the player started in (from the matric number on old saves). */
export function startYearOf(d: GameState): number {
  if (d.player.startYear) return d.player.startYear;
  const yy = Number(d.player.matric.split('/')[1]);
  return Number.isFinite(yy) ? 2000 + yy : 2026;
}

function firstMonday(year: number, month: number): Date {
  const date = new Date(Date.UTC(year, month, 1));
  while (date.getUTCDay() !== 1) date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

/** Monday of day 1 of a semester. */
export function semesterStart(d: GameState, year = d.clock.year, semester = d.clock.semester): Date {
  const y = startYearOf(d) + year - 1;
  return semester === 1 ? firstMonday(y, 9) : firstMonday(y + 1, 1);
}

/** The date of a day of this semester. */
export function dateOf(d: GameState, day: number): Date {
  const start = semesterStart(d);
  return new Date(start.getTime() + (day - 1) * 86400000);
}

/** "Mon 5 Oct". */
export function formatDate(date: Date, withYear = false): string {
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}${withYear ? ` ${date.getUTCFullYear()}` : ''}`;
}

/** A day of this semester as a date: "Mon 5 Oct". */
export function dayLabel(d: GameState, day: number): string {
  return formatDate(dateOf(d, day));
}

/** Today: "Mon 5 Oct". */
export function todayLabel(d: GameState): string {
  return dayLabel(d, d.clock.day);
}

// ---------- lecture times ----------

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

/** Which period a class falls in (mornings split between 8 and 10 by course). */
export function meetingPeriod(course: CourseState, meeting: Meeting): (typeof PERIODS)[number] {
  if (meeting.slot === 0) return PERIODS[hashCode(course.code) % 2]!;
  if (meeting.slot === 1) return PERIODS[3]!;
  return PERIODS[4]!;
}

/** "8:00–10:00 am" for a class. */
export function meetingTime(course: CourseState, meeting: Meeting): string {
  const p = meetingPeriod(course, meeting);
  const t = (m: number) => {
    const h = Math.floor(m / 60);
    return `${h % 12 === 0 ? 12 : h % 12}:${String(m % 60).padStart(2, '0')}`;
  };
  return `${t(p.start)}–${t(p.end)} ${p.end >= 12 * 60 ? 'pm' : 'am'}`;
}

// ---------- the calendar ----------

export interface CalendarEntry {
  day: number;
  /** Last day, for a period (orientation, exams). */
  end?: number;
  title: string;
  icon: string;
  kind: 'academic' | 'money' | 'test' | 'exam' | 'event' | 'deadline';
}

export function academicCalendar(d: GameState): CalendarEntry[] {
  const out: CalendarEntry[] = [];
  const fresher = d.clock.year === 1 && d.clock.semester === 1 && d.academics.level === 1;
  if (fresher) {
    out.push({ day: ORIENTATION_DAYS[0]!, end: ORIENTATION_DAYS[ORIENTATION_DAYS.length - 1], title: "Freshers' orientation", icon: '🎤', kind: 'academic' });
    out.push({ day: 1, end: registrationDeadline(d), title: 'Clearance (finish before registration closes)', icon: '🗂️', kind: 'deadline' });
  }
  out.push({ day: fresher ? FRESHER_LECTURES_START : 1, title: 'Lectures begin', icon: '📘', kind: 'academic' });
  out.push({ day: registrationDeadline(d), title: 'Course registration deadline', icon: '⏰', kind: 'deadline' });
  out.push({ day: LATE_REGISTRATION_CLOSE, title: 'Late registration closes', icon: '🚫', kind: 'deadline' });
  for (const f of d.finance.fees) if (f.dueSemester === d.clock.semester && f.id !== 'late_reg') out.push({ day: f.dueDay, title: `${f.label} due`, icon: '💸', kind: 'money' });
  for (const day of ALLOWANCE_DAYS) out.push({ day, title: 'Upkeep from home', icon: '₦', kind: 'money' });
  out.push({ day: EXAM_FORM_DAYS[0]!, end: EXAM_FORM_DAYS[EXAM_FORM_DAYS.length - 1], title: 'Exam form signing (College Office)', icon: '✍🏾', kind: 'deadline' });
  for (const c of d.academics.courses) for (const m of c.meetings) if (m.test) out.push({ day: m.day, title: `${c.code} test, ${meetingTime(c, m)}`, icon: '✏️', kind: 'test' });
  if (upcomingElection(d)) out.push({ day: ELECTION_DAY, title: 'Student union election', icon: '🗳️', kind: 'event' });
  out.push({ day: EXAM_DAYS[0]!, end: EXAM_DAYS[EXAM_DAYS.length - 1], title: 'Examinations', icon: '📝', kind: 'exam' });
  out.push({ day: SEMESTER_DAYS, title: d.clock.semester === 1 ? 'First semester ends' : 'Session ends', icon: '🏁', kind: 'academic' });
  return out.sort((a, b) => a.day - b.day);
}

/** The date range of each semester of this session. */
export function sessionDates(d: GameState): Array<{ label: string; from: string; to: string }> {
  return [1, 2].map((sem) => {
    const start = semesterStart(d, d.clock.year, sem as 1 | 2);
    const end = new Date(start.getTime() + (SEMESTER_DAYS - 1) * 86400000);
    return { label: sem === 1 ? 'First semester' : 'Second semester', from: formatDate(start), to: formatDate(end, true) };
  });
}

/** When a message was sent (a stamp: day count × 4 + part of day) as "Mon 5 Oct, 12:00 pm". */
export function stampLabel(d: GameState, at: number): string {
  const dayCount = Math.floor(at / 4);
  const slot = at % 4;
  const day = dayCount - (d.clock.dayCount - d.clock.day);
  const date = new Date(semesterStart(d).getTime() + (day - 1) * 86400000);
  const h = [7, 12, 16, 20][slot]!;
  return `${formatDate(date)}, ${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'am' : 'pm'}`;
}
