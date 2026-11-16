// The orchestrator: starting a game and moving time on. Each step calls the
// domain modules (money, academics, needs, hostel, people, chat, events,
// goals) in a fixed order. Internal functions change a draft (see draft.ts);
// the exported pure versions copy the state first.
import { buildSemester, closeSlot, endOfSession, moveGstBatches, semesterResults } from './academics';
import { chatDayMut, scriptMut, semesterChatMut, setupChatMut } from './chat';
import { ALLOWANCE_DAYS, FORGET_PER_DAY } from './config';
import { dueEventsMut } from './events';
import { checkMilestonesMut, electionMut, finalMilestonesMut, newWeekMut } from './goals';
import { log, produce } from './draft';
import { drainPhoneMut } from './phone';
import { postMut } from './chat';
import { getPerson } from '../content/people';
import { addLateFeeIfDue, allowanceDay, landLateAllowance, sendFeeMoney, sessionFees, weeklyData } from './money';
import { dayOutagesMut, oversleepMut, reallocateMut, roommateNightMut } from './hostel';
import { checkCollapse, hangoverMut, nightWithoutSleep, tickNeeds } from './needs';
import { loansDayMut } from './people';
import { Rng } from './rng';
import { blankState, type NewGameSetup } from './state';
import { SLOT_END, SLOT_START, clockMin, slotName, stepClock } from './time';
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
  // Clearance not finished: the acceptance fee stays on the portal until it is paid.
  const owesAcceptance = d.clearance.active && !d.flags.acceptance_paid;
  d.finance.fees = sessionFees(d.player.programmeId, firstYear || owesAcceptance);
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
  if (d.clock.day % 7 === 1) newWeekMut(d, r);
  electionMut(d, r);
  const moved = moveGstBatches(d, r);
  dayOutagesMut(d, r);
  oversleepMut(d, r);
  hangoverMut(d);
  chatDayMut(d, r, moved);
  loansDayMut(d, r);
  dueEventsMut(d);
  manualDropMut(d);
  // What you do not revise, you slowly forget.
  for (const c of d.academics.courses) c.knowledge = Math.max(0, c.knowledge - FORGET_PER_DAY);
}

/** Once practicals start, the lecturer drops the manual at the business centre. */
function manualDropMut(d: GameState): void {
  const key = `manual_${d.clock.year}_${d.clock.semester}`;
  if (d.flags[key]) return;
  const practical = d.academics.courses.find((c) => c.kind === 'practical' && c.meetings.length);
  if (!practical) return;
  const first = Math.min(...practical.meetings.map((m) => m.day));
  if (d.clock.day < first - 1) return;
  d.flags[key] = d.clock.dayCount;
  postMut(d, 'class', getPerson(practical.lecturerId) ? practical.lecturerId : 'system', `The ${practical.code} practical manual is now at the Business Centre. Nobody enters my lab without it.`);
  log(d, `The ${practical.code} manual has been dropped at the Business Centre.`);
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
  if (d.clock.semester === 2) {
    const level = d.academics.level;
    endOfSession(d);
    checkMilestonesMut(d, level, d.academics.repeating);
    if (d.phase === 'graduated') finalMilestonesMut(d);
  }
}

/** Moves time on by one slot, running end-of-day and end-of-semester rules. */
export function passSlot(d: GameState, r: Rng): void {
  if (d.phase !== 'playing') return;
  closeSlot(d);
  tickNeeds(d);
  drainPhoneMut(d);
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

/**
 * Quick things (a bath, a meal, a short ride) move the clock on by minutes.
 * Running past the end of the part of the day passes it, with everything
 * that comes with that.
 */
export function addMinutes(d: GameState, r: Rng, minutes: number): void {
  if (minutes <= 0 || d.phase !== 'playing') return;
  let t = clockMin(d.clock) + minutes;
  let guard = 0;
  while (t >= SLOT_END[d.clock.slot]! && d.phase === 'playing' && guard++ < 4) {
    const over = t - SLOT_END[d.clock.slot]!;
    advance(d, r, 1);
    t = SLOT_START[d.clock.slot]! + over;
  }
  d.clock.min = t;
}

// ---------- public, pure ----------

/** Do nothing for one slot (always possible: no dead ends). */
export function waitSlot(state: GameState): GameState {
  return produce(state, (d, r) => {
    log(d, 'You rested and let time pass.');
    advance(d, r, 1);
  });
}
