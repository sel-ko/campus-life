// The campus-wide event for the current real-world week. The same week gives
// every player the same event (fixed seed, no server).
import { CAMPUS_WEEKS } from '../content/campusWeek';
import type { CampusWeekDef } from './contentTypes';
import { Rng, hashText } from './rng';
import type { GameState } from './types';

const CAMPUS_SEED = 'campus-life-seed';

/** ISO week key like "2026-W46" for a moment in time. */
export function isoWeekKey(ms: number): string {
  const date = new Date(ms);
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function campusWeekFor(ms: number): { key: string; event: CampusWeekDef } {
  const key = isoWeekKey(ms);
  const event = new Rng(hashText(`${CAMPUS_SEED}:${key}`)).pick(CAMPUS_WEEKS);
  return { key, event };
}

export function campusEvent(d: GameState): CampusWeekDef | null {
  return d.campusWeek ? (CAMPUS_WEEKS.find((e) => e.id === d.campusWeek!.id) ?? null) : null;
}

export function modifiers(d: GameState): CampusWeekDef['modifiers'] {
  return campusEvent(d)?.modifiers ?? {};
}

/** Brings the game's campus week up to date with the real date. */
export function syncCampusWeekMut(d: GameState, nowMs: number): boolean {
  const { key, event } = campusWeekFor(nowMs);
  if (d.campusWeek?.key === key) return false;
  d.campusWeek = { key, id: event.id };
  return true;
}
