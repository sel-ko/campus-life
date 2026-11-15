// Helpers shared by the tests (not used by the game).
import { buildSemester } from './academics';
import { newGame } from './engine';
import { Rng } from './rng';
import type { BackgroundId, GameState, OfficeId } from './types';

export function testGame(over: Partial<{ programmeId: string; background: BackgroundId; seed: number }> = {}): GameState {
  return newGame({
    name: 'Ada',
    characterId: 'f1',
    background: over.background ?? 'average',
    choiceId: over.programmeId ?? 'computer_science',
    programmeId: over.programmeId ?? 'computer_science',
    admissionScore: 8,
    ambition: 'first_class',
    seed: over.seed ?? 42,
    startYear: 2026,
  });
}

/** Sets the clock to a weekday slot (day 3 is a Wednesday). */
export function at(d: GameState, day: number, slot: number): GameState {
  d.clock = { ...d.clock, dayCount: d.clock.dayCount + (day - d.clock.day), day, slot };
  return d;
}

export function signAll(d: GameState): void {
  for (const k of Object.keys(d.clearance.signed) as OfficeId[]) d.clearance.signed[k] = true;
}

/** A second-year student (clearance long done) at the start of a semester, with a full timetable. */
export function veteranGame(over: Parameters<typeof testGame>[0] = {}): GameState {
  const d = structuredClone(testGame(over));
  d.clock = { year: 2, semester: 1, day: 1, slot: 0, dayCount: 29 };
  d.academics.level = 2;
  d.clearance.active = false;
  d.clearance.endDay = 5;
  d.finance.fees = d.finance.fees.filter((f) => f.id !== 'acceptance');
  buildSemester(d, new Rng(over.seed ?? 42));
  return d;
}
