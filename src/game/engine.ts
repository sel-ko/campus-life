// The orchestrator: starting a game and moving time on. Each step calls the
// domain modules (money, academics, needs, hostel, people, chat, events,
// goals) in a fixed order. Internal functions change a draft (see draft.ts);
// the exported pure versions copy the state first.
import { ALLOWANCE_DAYS } from './config';
import { log, produce } from './draft';
import { addLateFeeIfDue, allowanceDay, landLateAllowance, sendFeeMoney, sessionFees, weeklyData } from './money';
import { Rng } from './rng';
import { blankState, type NewGameSetup } from './state';
import { stepClock } from './time';
import type { GameState } from './types';

// ---------- starting ----------

export function newGame(setup: NewGameSetup): GameState {
  const d = blankState(setup);
  const r = new Rng(d.rng);
  beginSession(d, r);
  beginSemester(d, r);
  beginDay(d, r);
  d.rng = r.seed;
  return d;
}

/** Start of a session (two semesters): fees. */
export function beginSession(d: GameState, _r: Rng): void {
  const firstYear = d.clock.year === 1;
  d.finance.fees = sessionFees(d.player.programmeId, firstYear);
}

/** Start of a semester: family fee money and a fresh registration. */
export function beginSemester(d: GameState, _r: Rng): void {
  d.academics.registered = false;
  d.academics.lateRegistration = false;
  d.finance.fees = d.finance.fees.filter((f) => f.id !== 'late_reg');
  sendFeeMoney(d);
}

/** Start of a day (in the morning). */
export function beginDay(d: GameState, r: Rng): void {
  landLateAllowance(d);
  if (ALLOWANCE_DAYS.includes(d.clock.day)) {
    allowanceDay(d, r);
    weeklyData(d);
  }
  addLateFeeIfDue(d);
}

export function endDay(_d: GameState, _r: Rng): void {}

export function endSemester(_d: GameState, _r: Rng): void {}

/** Moves time on by one slot, running end-of-day and end-of-semester rules. */
export function passSlot(d: GameState, r: Rng): void {
  if (d.phase !== 'playing') return;
  const before = d.clock;
  const step = stepClock(before);
  if (step.newDay) endDay(d, r);
  if (step.newSemester) endSemester(d, r);
  if (d.phase !== 'playing') return;
  const sessionChanged = step.clock.year !== before.year;
  d.clock = step.clock;
  if (step.newSemester) {
    if (sessionChanged) beginSession(d, r);
    beginSemester(d, r);
  }
  if (step.newDay) beginDay(d, r);
}

/** Passes several slots (sleeping through, collapsing...). */
export function passSlots(d: GameState, r: Rng, n: number): void {
  for (let i = 0; i < n && d.phase === 'playing'; i++) passSlot(d, r);
}

// ---------- public, pure ----------

/** Do nothing for one slot (always possible: no dead ends). */
export function waitSlot(state: GameState): GameState {
  return produce(state, (d, r) => {
    log(d, 'You rested and let time pass.');
    passSlot(d, r);
  });
}
