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
  return day <= 7 ? 1 : 2;
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
export function stepClock(c: Clock): ClockStep {
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
  return `${dayName(c.day)} ${slotName(c)}, day ${c.day} of ${SEMESTER_DAYS}`;
}
