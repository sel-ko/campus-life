// Shapes of the content data in src/content/. The rules read these; the data
// itself never contains logic.
import type {
  AmbitionId,
  CourseKind,
  Effects,
  HustleId,
  ObjectiveMetric,
  OfficeId,
  PlaceType,
  Role,
  Slot,
  Trait,
} from './types';

// ---------- courses ----------

/** [code, title, units, kind?] — kind defaults to 'lecture'. */
export type CourseTuple = readonly [code: string, title: string, units: number, kind?: CourseKind];

export interface CourseDef {
  code: string;
  title: string;
  units: number;
  kind: CourseKind;
  draft: boolean;
}

export type Track = 'clinical' | 'basic_medical' | 'engineering' | 'science' | 'law' | 'business' | 'arts';

export interface CollegeDef {
  id: string;
  name: string;
  short: string;
  /** Map section id: 'ts' (First Campus) or 'ps' (2nd Campus). */
  sectionId: string;
}

export interface ProgrammeDef {
  id: string;
  name: string;
  /** Department prefix for course codes, e.g. CSC. */
  prefix: string;
  collegeId: string;
  years: number;
  track: Track;
  competitive: boolean;
  /** Entrance test score (out of 10) needed. */
  cutoff: number;
  /** Written lists for 100 and 200 level, keyed "level-semester", e.g. "1-1". */
  lists: Record<string, readonly CourseTuple[]>;
  /** Titles used to generate 300 level and above. */
  advanced: readonly string[];
  /** Clinical posting titles (clinical track). */
  postings?: readonly string[];
  /** Values still to be confirmed by the school. */
  confirm?: string;
  draft: boolean;
}

// ---------- admission ----------

export interface Question {
  id: string;
  topic: 'general' | 'science' | 'maths' | 'english' | 'geography';
  q: string;
  options: readonly [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
  draft: true;
}

// ---------- people ----------

export interface PersonDef {
  id: string;
  name: string;
  role: Role;
  /** Short line shown in the contacts list. */
  blurb: string;
  traits?: readonly Trait[];
  /** Officers: which office they sit in. */
  office?: OfficeId;
  /** Lecturers: how they behave. */
  temperament?: 'strict' | 'gentle' | 'handout' | 'absentee' | 'jovial';
  /** Starting relationship. */
  startRel?: number;
  /** Character look for the 3D model. */
  look: string;
  draft: true;
}

// ---------- places ----------

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  /** Hunger removed (positive number). */
  fills: number;
  energy?: number;
  stress?: number;
  /** Snack: quick and light. */
  snack?: boolean;
  /** Minutes to eat it (snacks are quick; swallow and soup takes a while). */
  minutes?: number;
  draft?: boolean;
}

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  /** How many you get for the price. */
  pack?: number;
  /** Provisions: what eating one does. */
  food?: { fills: number; energy?: number; needsWater?: boolean; cook?: boolean };
  /** Decoration for your corner of the room (shown there, and makes it feel like home). */
  decor?: boolean;
  draft?: boolean;
}

export interface OfficeDef {
  id: OfficeId;
  name: string;
  /** Documents the officer keeps from you, by type and count. */
  docs: Partial<Record<'photocopy' | 'passport' | 'receipt', number>>;
  /** Offices that must sign first. */
  needs?: readonly OfficeId[];
  /** The acceptance fee must be paid and on the portal. */
  needsAcceptance?: boolean;
  fee?: number;
  officerId: string;
}

// ---------- hustles ----------

export interface HustleDef {
  id: HustleId;
  name: string;
  blurb: string;
  /** Shifts done (any hustle) before this one opens. */
  xpNeeded: number;
  setupCost: number;
  /** Money spent on stock each shift. */
  stockCost: number;
  revenue: [number, number];
  energy: number;
  stress: number;
  /** Where it is done. */
  placeTypes: readonly PlaceType[];
  /** Extra condition for opening. */
  requires?: 'good_grade';
}

// ---------- events ----------

export type EventCategory =
  | 'clearance'
  | 'portal'
  | 'gst'
  | 'lectures'
  | 'tests'
  | 'roommates'
  | 'money'
  | 'utilities'
  | 'health'
  | 'friends'
  | 'travel'
  | 'later_years'
  | 'campus';

/** When an event can fire. Every condition given must hold. */
export interface EventWhen {
  /** At a kind of place (the place of the last action). */
  places?: readonly PlaceType[];
  slots?: readonly Slot[];
  /** Year of study (level) range. */
  levels?: readonly [number, number];
  semesters?: readonly (1 | 2)[];
  days?: readonly [number, number];
  tracks?: readonly Track[];
  clearance?: boolean;
  moneyBelow?: number;
  moneyAbove?: number;
  stressAbove?: number;
  hungerAbove?: number;
  healthBelow?: number;
  energyBelow?: number;
  roommateTrait?: Trait;
  hasHustle?: HustleId;
  lightOff?: boolean;
  waterOff?: boolean;
  ill?: boolean;
  courseKind?: CourseKind;
  registered?: boolean;
  flag?: string;
  notFlag?: string;
  ambition?: AmbitionId;
  /** Relationship with someone of this role at least this much. */
  relAbove?: readonly [Role, number];
  hasDebit?: boolean;
  owesMoney?: boolean;
}

export interface EventChoiceDef {
  label: string;
  outcome: string;
  effects: Effects;
  /** Only offered if the player has this much money. */
  cost?: number;
  /** Another event that follows some days later. */
  followUp?: { event: string; days: number };
}

export interface EventDef {
  id: string;
  category: EventCategory;
  /** 'random' events fire after actions; 'followup' only when scheduled. */
  kind: 'random' | 'followup';
  when: EventWhen;
  title: string;
  text: string;
  choices: readonly [EventChoiceDef, EventChoiceDef] | readonly [EventChoiceDef, EventChoiceDef, EventChoiceDef];
  weight?: number;
  once?: boolean;
  draft: true;
}

/** Campus-wide event for a real calendar week (same for every player). */
export interface CampusWeekDef {
  id: string;
  title: string;
  text: string;
  modifiers: {
    foodPrice?: number;
    lightOut?: number;
    waterOut?: number;
    fare?: number;
    stress?: number;
    portalDown?: number;
  };
  draft: true;
}

// ---------- chat ----------

export type ChatTrigger =
  | 'admitted'
  | 'semester_start'
  | 'test_announced'
  | 'lecture_cancelled'
  | 'lecture_moved'
  | 'lecture_weekend'
  | 'gst_batch_moved'
  | 'exams_soon'
  | 'class_dues'
  | 'dept_week'
  | 'portal_rumour'
  | 'false_alarm'
  | 'chatter'
  | 'results_out'
  | 'room_allocated'
  | 'room_light'
  | 'room_levy'
  | 'room_chatter'
  | 'loan_reminder'
  | 'friend_checkin'
  | 'registration_reminder';

export interface ChatScript {
  id: string;
  trigger: ChatTrigger;
  thread: 'freshers' | 'class' | 'room' | 'direct';
  /** A role (the first person with it), 'classmate' (any coursemate) or 'roommate'. */
  from: Role | 'classmate' | 'roommate' | 'system';
  /** {code}, {title}, {day}, {slot}, {place}, {amount}, {name} are filled in. */
  text: string;
  replies?: ReadonlyArray<{ label: string; reply: string; effects?: Effects }>;
  draft: true;
}

// ---------- goals ----------

export interface MilestoneDef {
  id: string;
  /** End of this level's session. 'final' = at graduation. */
  level: number | 'final';
  label: string;
  check: {
    cgpaAtLeast?: number;
    moneyAtLeast?: number;
    hustle?: HustleId;
    friendsAtLeast?: number;
    position?: 'class_rep' | 'dept_president' | 'su_president';
    calmAtLeast?: number;
    brokeAtMost?: number;
  };
}

export interface AmbitionDef {
  id: AmbitionId;
  name: string;
  blurb: string;
  milestones: readonly MilestoneDef[];
  ending: { win: string; lose: string };
  draft: true;
}

export interface ObjectiveDef {
  id: string;
  label: string;
  metric: ObjectiveMetric;
  target: number;
  /** When this objective makes sense. */
  when?: { clearance?: boolean; lectures?: boolean; hustle?: boolean; project?: boolean; feesDue?: boolean; examWeek?: boolean };
  draft: true;
}
