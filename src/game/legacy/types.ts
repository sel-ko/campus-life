// Every shape the game rules work with. No React, no three, no school names.

export type MeterKey = 'grades' | 'energy' | 'social' | 'stress';
export type Meters = Record<MeterKey, number>;

export const SLOTS = ['Morning', 'Afternoon', 'Evening', 'Night'] as const;
export type Slot = (typeof SLOTS)[number];

/** Kinds of place. Actions point at a type; the content file says which real
 *  buildings are of that type. Types after 'gate' are place kinds with no
 *  actions of their own (they borrow other lists, or have none yet). */
export type LocationType =
  | 'lecture'
  | 'library'
  | 'faculty'
  | 'cafeteria'
  | 'hostel'
  | 'field'
  | 'business'
  | 'park'
  | 'gate'
  | 'lab'
  | 'admin'
  | 'hospital'
  | 'bank'
  | 'busstop'
  | 'special'
  | 'market'
  | 'clinic';

export type BackgroundId = 'broke' | 'average' | 'comfortable';

/** A change to the player's resources. Missing keys mean "no change". */
export type Effects = Partial<Record<MeterKey | 'money', number>>;

export interface ActionDef {
  id: string;
  label: string;
  locationType: LocationType;
  /** Slots this action is open on weekdays. */
  slots: Slot[];
  /** Slots open on weekend days. If missing, weekends use `slots`. */
  weekendSlots?: Slot[];
  /** True if the action is closed on weekends (lectures). */
  weekdaysOnly?: boolean;
  effects: Effects;
  /** 'eat' satisfies the daily meal; 'study' avoids the no-study penalty. */
  tags?: Array<'eat' | 'study'>;
}

export interface EventChoice {
  label: string;
  effects: Effects;
  /** Short line shown in the log after picking this choice. */
  outcome: string;
}

export interface GameEvent {
  id: string;
  /** Which slot(s) the event can happen in, or 'any'. */
  slot: Slot | 'any';
  /** Which kind of place it can happen at, or 'any'. */
  locationType: LocationType | 'any';
  text: string;
  choices: [EventChoice, EventChoice];
  /** Marks events written as placeholders, to be rewritten with real in-jokes. */
  draft?: boolean;
}

export interface PlayerSetup {
  nickname: string;
  departmentId: string;
  background: BackgroundId;
  characterId: string;
  /** Id of the place the player stays (a hostel-type location). */
  homeId: string;
}

export interface LogEntry {
  day: number;
  slot: Slot;
  text: string;
}

export interface GameState {
  version: 1;
  player: PlayerSetup;
  /** 1 to 14 while playing. */
  day: number;
  /** Index into SLOTS, 0 to 3. */
  slotIndex: number;
  meters: Meters;
  money: number;
  /** What the player has done today, for the end-of-day rules. */
  today: { ate: boolean; studied: boolean };
  /** Set by a collapse: the next slot is lost. */
  skipNextSlot: boolean;
  /** Only one random event per day. */
  eventDoneToday: boolean;
  /** Id of an event waiting for the player to choose. */
  pendingEventId: string | null;
  log: LogEntry[];
  finished: boolean;
}

export type Availability = { ok: true } | { ok: false; reason: string };

export interface SemesterResult {
  cgpa: number;
  className: string;
  title: string;
  titleBlurb: string;
}
