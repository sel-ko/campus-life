// The game rules. Every function takes a state and returns a NEW state; nothing
// is changed in place. Randomness is passed in (rng) so tests are repeatable.
import { ACTIONS, getAction } from './actions';
import {
  ALLOWANCE_DAYS,
  BACKGROUNDS,
  CLASS_BANDS,
  COLLAPSE_STRESS,
  DAY_NAMES,
  END_OF_DAY,
  EVENT_CHANCE,
  GRADES_PER_POINT,
  LOG_LIMIT,
  METER_MAX,
  METER_MIN,
  SEMESTER_DAYS,
  START_METERS,
  WEEKEND_DAYS,
} from './config';
import { EVENTS } from './events';
import { describeEffects, naira } from './format';
import {
  SLOTS,
  type ActionDef,
  type Availability,
  type Effects,
  type GameEvent,
  type GameState,
  type LocationType,
  type MeterKey,
  type PlayerSetup,
  type SemesterResult,
  type Slot,
} from './types';

/** Returns a number from 0 (inclusive) to 1 (exclusive), like Math.random. */
export type Rng = () => number;

// ---------- small helpers ----------

export function clampMeter(value: number): number {
  return Math.max(METER_MIN, Math.min(METER_MAX, value));
}

export function isWeekend(day: number): boolean {
  return WEEKEND_DAYS.includes(day);
}

export function dayName(day: number): string {
  return DAY_NAMES[(day - 1) % 7] ?? '';
}

export function currentSlot(state: GameState): Slot {
  return SLOTS[state.slotIndex] ?? 'Night';
}

function addLog(state: GameState, text: string): GameState {
  const entry = { day: state.day, slot: currentSlot(state), text };
  return { ...state, log: [...state.log, entry].slice(-LOG_LIMIT) };
}

/** Adds effects to the meters (clamped 0 to 100) and to money (never below 0). */
export function applyEffects(state: GameState, effects: Effects): GameState {
  const meters = { ...state.meters };
  for (const key of Object.keys(meters) as MeterKey[]) {
    meters[key] = clampMeter(meters[key] + (effects[key] ?? 0));
  }
  const money = Math.max(0, state.money + (effects.money ?? 0));
  return { ...state, meters, money };
}

function payAllowanceIfDue(state: GameState): GameState {
  if (!ALLOWANCE_DAYS.includes(state.day)) return state;
  const amount = BACKGROUNDS[state.player.background].weeklyAllowance;
  return addLog(applyEffects(state, { money: amount }), `Allowance don land! +${naira(amount)}`);
}

// ---------- starting ----------

export function startGame(player: PlayerSetup): GameState {
  const state: GameState = {
    version: 1,
    player,
    day: 1,
    slotIndex: 0,
    meters: { ...START_METERS },
    money: BACKGROUNDS[player.background].startMoney,
    today: { ate: false, studied: false },
    skipNextSlot: false,
    eventDoneToday: false,
    pendingEventId: null,
    log: [],
    finished: false,
  };
  return payAllowanceIfDue(state);
}

// ---------- what can the player do? ----------

export function slotsFor(action: ActionDef, day: number): Slot[] {
  if (isWeekend(day)) {
    if (action.weekdaysOnly) return [];
    return action.weekendSlots ?? action.slots;
  }
  return action.slots;
}

function listSlots(slots: Slot[]): string {
  if (slots.length === SLOTS.length) return 'any time';
  if (slots.length === 1) return `the ${slots[0]}`;
  return `the ${slots.slice(0, -1).join(', ')} or ${slots[slots.length - 1]}`;
}

/** Can the player take this action right now? If not, says why. */
export function canDoAction(state: GameState, action: ActionDef): Availability {
  if (state.finished) return { ok: false, reason: 'The semester is over' };
  if (state.pendingEventId) return { ok: false, reason: 'Sort out what is happening first' };

  const slots = slotsFor(action, state.day);
  if (slots.length === 0) return { ok: false, reason: 'Not on weekends' };
  if (!slots.includes(currentSlot(state))) {
    return { ok: false, reason: `Only in ${listSlots(slots)}` };
  }

  const cost = -(action.effects.money ?? 0);
  if (cost > 0 && state.money < cost) {
    return { ok: false, reason: `You need ${naira(cost)}` };
  }
  return { ok: true };
}

export function actionsAt(locationType: LocationType): ActionDef[] {
  return ACTIONS.filter((a) => a.locationType === locationType);
}

/** Used to dim buildings with nothing to do this slot. */
export function hasAvailableAction(state: GameState, locationType: LocationType): boolean {
  return actionsAt(locationType).some((a) => canDoAction(state, a).ok);
}

// ---------- collapse and time passing ----------

/** Energy at 0 means collapse: stress up and the next slot is lost. */
function checkCollapse(state: GameState): GameState {
  if (state.meters.energy > 0 || state.skipNextSlot) return state;
  const s = applyEffects(state, { stress: COLLAPSE_STRESS });
  return addLog(
    { ...s, skipNextSlot: true },
    `You collapsed from exhaustion! Stress +${COLLAPSE_STRESS} and you lose the next slot.`,
  );
}

/** End-of-day rules, then move to the next morning (or finish). */
export function endDay(state: GameState): GameState {
  const notes: string[] = [];
  let s = applyEffects(state, { social: END_OF_DAY.socialDecay });
  notes.push(`Social ${END_OF_DAY.socialDecay}`);

  if (!s.today.studied) {
    s = applyEffects(s, { grades: END_OF_DAY.noStudyGrades });
    notes.push(`no reading today, Grades ${END_OF_DAY.noStudyGrades}`);
  }
  if (!s.today.ate) {
    s = applyEffects(s, { energy: END_OF_DAY.noFoodEnergy, stress: END_OF_DAY.noFoodStress });
    notes.push(`you did not eat, Energy ${END_OF_DAY.noFoodEnergy}, Stress +${END_OF_DAY.noFoodStress}`);
  }
  // Burnout is checked after the other end-of-day changes.
  if (s.meters.stress >= END_OF_DAY.burnoutStressAt) {
    s = applyEffects(s, { grades: END_OF_DAY.burnoutGrades });
    notes.push(`burnout, Grades ${END_OF_DAY.burnoutGrades}`);
  }
  s = addLog(s, `End of day ${s.day}: ${notes.join('; ')}.`);

  if (s.day >= SEMESTER_DAYS) {
    return addLog({ ...s, finished: true }, 'The semester is over. Time to see your results!');
  }

  s = checkCollapse(s);
  s = {
    ...s,
    day: s.day + 1,
    slotIndex: 0,
    today: { ate: false, studied: false },
    eventDoneToday: false,
  };
  return payAllowanceIfDue(s);
}

function stepSlot(state: GameState): GameState {
  if (state.slotIndex >= SLOTS.length - 1) return endDay(state);
  return { ...state, slotIndex: state.slotIndex + 1 };
}

/** Moves to the next slot, skipping any slot lost to a collapse. */
export function advanceSlot(state: GameState): GameState {
  let s = stepSlot(state);
  while (s.skipNextSlot && !s.finished) {
    s = addLog({ ...s, skipNextSlot: false }, `Too tired to do anything this ${currentSlot(s)}.`);
    s = stepSlot(s);
  }
  return s;
}

// ---------- events ----------

/** Picks at most one event for this slot and place. Returns null most of the time. */
export function pickEvent(
  state: GameState,
  slot: Slot,
  locationType: LocationType,
  rng: Rng,
  events: GameEvent[] = EVENTS,
): GameEvent | null {
  if (state.eventDoneToday) return null;
  const matches = events.filter(
    (e) =>
      (e.slot === 'any' || e.slot === slot) &&
      (e.locationType === 'any' || e.locationType === locationType),
  );
  if (matches.length === 0) return null;
  if (rng() >= EVENT_CHANCE) return null;
  return matches[Math.floor(rng() * matches.length)] ?? null;
}

export function getPendingEvent(state: GameState, events: GameEvent[] = EVENTS): GameEvent | null {
  return events.find((e) => e.id === state.pendingEventId) ?? null;
}

/** The player picked choice 0 or 1 on the pending event. */
export function resolveEvent(
  state: GameState,
  choiceIndex: 0 | 1,
  events: GameEvent[] = EVENTS,
): GameState {
  const event = getPendingEvent(state, events);
  if (!event) {
    if (!state.pendingEventId) return state;
    return advanceSlot({ ...state, pendingEventId: null });
  }
  const choice = event.choices[choiceIndex];
  const effectText = describeEffects(choice.effects).join(', ');
  let s = applyEffects({ ...state, pendingEventId: null }, choice.effects);
  s = addLog(s, effectText ? `${choice.outcome} (${effectText})` : choice.outcome);
  s = checkCollapse(s);
  return advanceSlot(s);
}

// ---------- the main move ----------

/** The player takes an action. Returns the state unchanged if it is not allowed. */
export function doAction(
  state: GameState,
  actionId: string,
  rng: Rng = Math.random,
  events: GameEvent[] = EVENTS,
): GameState {
  const action = getAction(actionId);
  if (!action || !canDoAction(state, action).ok) return state;

  const slot = currentSlot(state);
  let s = applyEffects(state, action.effects);
  s = {
    ...s,
    today: {
      ate: s.today.ate || (action.tags?.includes('eat') ?? false),
      studied: s.today.studied || (action.tags?.includes('study') ?? false),
    },
  };
  s = addLog(s, `${action.label}: ${describeEffects(action.effects).join(', ')}`);
  s = checkCollapse(s);

  // A collapsed player is not interrupted by an event.
  if (!s.skipNextSlot) {
    const event = pickEvent(s, slot, action.locationType, rng, events);
    if (event) {
      // Wait here until the player chooses; resolveEvent moves time on.
      return { ...s, pendingEventId: event.id, eventDoneToday: true };
    }
  }
  return advanceSlot(s);
}

// ---------- results ----------

export function computeCgpa(grades: number): number {
  return Math.round((grades / GRADES_PER_POINT) * 100) / 100;
}

export function degreeClass(cgpa: number): string {
  return CLASS_BANDS.find((b) => cgpa >= b.min)?.name ?? 'Probation';
}

export function finalResult(state: GameState): SemesterResult {
  const cgpa = computeCgpa(state.meters.grades);
  return { cgpa, className: degreeClass(cgpa) };
}
