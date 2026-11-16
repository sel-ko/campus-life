// Calendar arithmetic on the game clock. Pure.
import { DAY_NAMES, EXAM_DAYS, SEMESTER_DAYS, WEEKEND_DAYS } from './config';
import { SLOTS, type Clock, type Slot } from './types';

export const START_CLOCK: Clock = { year: 1, semester: 1, day: 1, slot: 0, dayCount: 1 };

/** One number for "this slot of this day", for ordering messages and deadlines. */
export function stamp(c: Clock): number {
  return c.dayCount * 4 + c.slot;
}

export function slotName(c: Clock | number): Slot {
  return SLOTS[typeof c === 'number' ? c : c.slot] ?? 'Night';
}

export function isWeekend(day: number): boolean {
  return WEEKEND_DAYS.includes(day);
}

export function isExamDay(day: number): boolean {
  return EXAM_DAYS.includes(day);
}

export function dayName(day: number): string {
  return DAY_NAMES[(day - 1) % 7] ?? '';
}

/** 1 for days 1-7, 2 for days 8-14. */
export function weekOf(day: number): number {
  return Math.ceil(day / 7);
}

/** Day of the week, 0 = Monday. */
export function weekday(day: number): number {
  return (day - 1) % 7;
}

/** dayCount of a given semester day in the same semester as the clock. */
export function dayCountOf(c: Clock, day: number): number {
  return c.dayCount + (day - c.day);
}

export interface ClockStep {
  clock: Clock;
  newDay: boolean;
  newSemester: boolean;
}

/** Moves the clock on one slot; Night rolls into the next Morning and day 14
 *  Night into day 1 of the next semester (or session). */
export function stepClock(full: Clock): ClockStep {
  // The new slot starts at its own start time.
  const { min: _min, ...c } = full;
  if (c.slot < SLOTS.length - 1) return { clock: { ...c, slot: c.slot + 1 }, newDay: false, newSemester: false };
  if (c.day < SEMESTER_DAYS) {
    return { clock: { ...c, slot: 0, day: c.day + 1, dayCount: c.dayCount + 1 }, newDay: true, newSemester: false };
  }
  const next: Clock =
    c.semester === 1
      ? { ...c, semester: 2, day: 1, slot: 0, dayCount: c.dayCount + 1 }
      : { year: c.year + 1, semester: 1, day: 1, slot: 0, dayCount: c.dayCount + 1 };
  return { clock: next, newDay: true, newSemester: true };
}

export function describeClock(c: Clock): string {
  return `${dayName(c.day)} ${slotName(c)} (day ${c.day} of ${SEMESTER_DAYS})`;
}

// ---------- clock time (hours and minutes) ----------

/** When each part of the day starts, in minutes since midnight. */
export const SLOT_START = [7 * 60, 12 * 60, 16 * 60, 20 * 60];
/** When each part ends (night ends at 7 a.m. the next day). */
export const SLOT_END = [12 * 60, 16 * 60, 20 * 60, 31 * 60];

/** Minutes since midnight now (possibly past 24:00 at night). */
export function clockMin(c: Clock): number {
  return c.min ?? SLOT_START[c.slot]!;
}

/** "9:20 am" for minutes since midnight. */
export function formatTime(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h % 12 === 0 ? 12 : h % 12}:${String(mm).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

/** The game time on the clock, e.g. "9:20 am". */
export function clockTime(c: Clock): string {
  return formatTime(clockMin(c));
}

/** Minutes left in the current part of the day. */
export function minutesLeftInSlot(c: Clock): number {
  return SLOT_END[c.slot]! - clockMin(c);
}

/** "2 hrs 40 min", "45 min", "1 hr". */
export function formatDuration(min: number): string {
  const m = Math.max(1, Math.round(min));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return `${r} min`;
  return `${h} hr${h > 1 ? 's' : ''}${r ? ` ${r} min` : ''}`;
}
