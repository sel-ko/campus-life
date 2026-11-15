// The orchestrator: starting a game and moving time on. Each step calls the
// domain modules (money, academics, needs, hostel, people, chat, events,
// goals) in a fixed order. Internal functions change a draft (see draft.ts);
// the exported pure versions copy the state first.
import { buildSemester, closeSlot, endOfSession, moveGstBatches, semesterResults } from './academics';
import { chatDayMut, scriptMut, semesterChatMut, setupChatMut } from './chat';
import { ALLOWANCE_DAYS } from './config';
import { dueEventsMut } from './events';
import { log, produce } from './draft';
import { addLateFeeIfDue, allowanceDay, landLateAllowance, sendFeeMoney, sessionFees, weeklyData } from './money';
import { dayOutagesMut, oversleepMut, reallocateMut, roommateNightMut } from './hostel';
import { checkCollapse, nightWithoutSleep, tickNeeds } from './needs';
import { loansDayMut } from './people';
import { Rng } from './rng';
import { blankState, type NewGameSetup } from './state';
import { slotName, stepClock } from './time';
import type { GameState } from './types';

// ---------- starting ----------

export function newGame(setup: NewGameSetup): GameState {
  const d = blankState(setup);
  const r = new Rng(d.rng);
  setupChatMut(d, r);
  beginSession(d, r);
  beginSemester(d, r);
  beginDay(d, r);
  d.rng = r.seed;
  return d;
}

/** Start of a session (two semesters): fees. */
export function beginSession(d: GameState, r: Rng): void {
  const firstYear = d.clock.year === 1;
  d.finance.fees = sessionFees(d.player.programmeId, firstYear);
  if (!firstYear) reallocateMut(d, r);
}

/** Start of a semester: family fee money and a fresh registration. */
export function beginSemester(d: GameState, _r: Rng): void {
  d.academics.registered = false;
  d.academics.lateRegistration = false;
  d.finance.fees = d.finance.fees.filter((f) => f.id !== 'late_reg');
  d.hustle.profitSemester = 0;
  sendFeeMoney(d);
  buildSemester(d, _r);
  semesterChatMut(d, _r);
}

/** Start of a day (in the morning). */
export function beginDay(d: GameState, r: Rng): void {
  landLateAllowance(d);
  if (ALLOWANCE_DAYS.includes(d.clock.day)) {
    allowanceDay(d, r);
    weeklyData(d);
  }
  addLateFeeIfDue(d);
  const moved = moveGstBatches(d, r);
  dayOutagesMut(d, r);
  oversleepMut(d, r);
  chatDayMut(d, r, moved);
  loansDayMut(d, r);
  dueEventsMut(d);
}

/** End of a day (after the Night slot), before the clock moves. */
export function endDay(d: GameState, r: Rng): void {
  nightWithoutSleep(d);
  roommateNightMut(d, r);
}

export function endSemester(d: GameState, r: Rng): void {
  const before = d.academics.transcript.length;
  semesterResults(d, r);
  if (d.academics.transcript.length > before) scriptMut(d, r, 'results_out');
  if (d.clock.semester === 2) endOfSession(d);
}

/** Moves time on by one slot, running end-of-day and end-of-semester rules. */
export function passSlot(d: GameState, r: Rng): void {
  if (d.phase !== 'playing') return;
  closeSlot(d);
  tickNeeds(d);
  checkCollapse(d);
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

/** After an action: spend its slots, then any slots lost to collapse or oversleeping. */
export function advance(d: GameState, r: Rng, slots: number): void {
  passSlots(d, r, slots);
  let guard = 0;
  while (d.lostSlots > 0 && d.phase === 'playing' && guard++ < 12) {
    d.lostSlots -= 1;
    log(d, `The ${slotName(d.clock).toLowerCase()} passed without you.`);
    passSlot(d, r);
  }
}

// ---------- public, pure ----------

/** Do nothing for one slot (always possible: no dead ends). */
export function waitSlot(state: GameState): GameState {
  return produce(state, (d, r) => {
    log(d, 'You rested and let time pass.');
    advance(d, r, 1);
  });
}
