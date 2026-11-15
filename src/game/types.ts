// Every shape the game rules work with. No React, no three.js.
// Content shapes (courses, events, people...) are in contentTypes.ts.

export const SLOTS = ['Morning', 'Afternoon', 'Evening', 'Night'] as const;
export type Slot = (typeof SLOTS)[number];

export type BackgroundId = 'broke' | 'average' | 'comfortable';
export type AmbitionId = 'first_class' | 'big_money' | 'su_president' | 'soft_life';
export type Phase = 'playing' | 'graduated' | 'withdrawn';

/** Kinds of place. The first seven are the enterable kinds from the brief;
 *  the rest are outdoor or extra kinds that still answer the interaction API. */
export type PlaceType =
  | 'lecture_hall'
  | 'admin_office'
  | 'restaurant'
  | 'hostel_room'
  | 'lab'
  | 'library'
  | 'clinic'
  | 'shop'
  | 'workplace'
  | 'residence'
  | 'field'
  | 'busstop'
  | 'gate';

export type OfficeId =
  | 'admissions'
  | 'registry'
  | 'bursary'
  | 'student_affairs'
  | 'ict'
  | 'college_office'
  | 'hod'
  | 'medical';

export type DocId = 'photocopy' | 'passport' | 'receipt';
export type FeeId = 'acceptance' | 'school1' | 'school2' | 'dues' | 'hostel' | 'late_reg';
export type CourseKind = 'lecture' | 'practical' | 'gst' | 'it' | 'posting' | 'moot' | 'chambers' | 'project' | 'seminar';
export type Trait = 'tidy' | 'noisy' | 'generous' | 'borrower' | 'reader' | 'night_crawler';
export type Role =
  | 'course_rep'
  | 'efiko'
  | 'hustle_partner'
  | 'coursemate'
  | 'love_interest'
  | 'officer'
  | 'vendor'
  | 'doctor'
  | 'senior'
  | 'lecturer'
  | 'roommate';
export type HustleId = 'snacks' | 'typing' | 'tutoring' | 'pos' | 'business_centre';
export type TravelMode = 'walk' | 'keke' | 'cab';
export type Grade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

/** Where we are in the degree. `year` counts sessions played (a repeated
 *  year still adds one); `day` is 1 to 14 in the semester; `slot` is 0 to 3. */
export interface Clock {
  year: number;
  semester: 1 | 2;
  day: number;
  slot: number;
  /** Days since the game began; never resets. */
  dayCount: number;
}

/** 0 to 100 each. Hunger: 0 is full, 100 is starving. Health is hidden. */
export interface Needs {
  energy: number;
  hunger: number;
  stress: number;
  health: number;
}

/** A change to the player. Missing keys mean "no change". */
export interface Effects {
  money?: number;
  energy?: number;
  hunger?: number;
  stress?: number;
  health?: number;
  /** Added to every current course's knowledge. */
  knowledge?: number;
  /** Added to every current lecturer's goodwill. */
  goodwill?: number;
  /** Relationship changes, by person id or by role (every person with that role). */
  rel?: Record<string, number>;
  /** Relationship change with every current roommate. */
  roommates?: number;
  /** Items gained (or lost, negative), e.g. { noodles: 2 }. */
  items?: Record<string, number>;
  /** Slots lost (sleeping it off, a long queue...). */
  loseSlots?: number;
  setFlag?: string;
  clearFlag?: string;
  /** Lifts the attendance bar on the course with the worst attendance. */
  attendanceCover?: boolean;
  /** Borrow money from someone (they become owed). */
  borrow?: { from: string; amount: number; days: number };
  /** Lend money to someone. */
  lend?: { to: string; amount: number; days: number };
}

// ---------- academics ----------

export interface Meeting {
  day: number;
  slot: number;
  placeId: string;
  status: 'scheduled' | 'cancelled';
  attended: boolean;
  /** Attended standing outside a full hall (GST): less learned. */
  outside?: boolean;
  /** The continuous-assessment test is written at this meeting. */
  test?: boolean;
  /** Moved to another building, time or a weekend at short notice. */
  moved?: boolean;
}

export interface ExamSitting {
  day: number;
  slot: number;
  placeId: string;
  status: 'pending' | 'written' | 'missed' | 'barred';
  score: number | null;
  /** GST batches can be moved at short notice. */
  batchMoved?: boolean;
}

export interface CourseState {
  code: string;
  title: string;
  units: number;
  kind: CourseKind;
  carryover: boolean;
  draft: boolean;
  lecturerId: string;
  venueId: string;
  meetings: Meeting[];
  /** How well the player knows the course, 0 to 100. */
  knowledge: number;
  testScore: number | null;
  assignment: number | null;
  assignmentDue: number;
  handout: { price: number; status: 'none' | 'bought' | 'refused' };
  /** The lecturer's opinion of the player, -50 to 50. */
  goodwill: number;
  /** Attendance bar lifted by the course rep or an office. */
  covered: boolean;
  exam: ExamSitting;
  /** Got notes from a friend this semester. */
  notes: boolean;
}

export interface CourseResult {
  code: string;
  title: string;
  units: number;
  ca: number;
  exam: number;
  score: number;
  grade: Grade;
  points: number;
  carryover: boolean;
  /** A result problem waiting at an office; `trueScore` is restored when fixed. */
  issue?: 'missing_script' | 'wrong_grade';
  trueScore?: number;
}

export interface SemesterRecord {
  year: number;
  level: number;
  semester: 1 | 2;
  courses: CourseResult[];
  units: number;
  failedUnits: number;
  gpa: number;
  cgpa: number;
}

export interface CarryoverCourse {
  code: string;
  title: string;
  units: number;
  kind: CourseKind;
  semester: 1 | 2;
}

export interface ResultIssue {
  id: string;
  record: number;
  code: string;
  kind: 'missing_script' | 'wrong_grade';
  officeId: OfficeId;
  visits: number;
}

export interface ProjectState {
  supervisorId: string;
  /** Chapters approved by the supervisor, 0 to 5. */
  chapters: number;
  /** Progress on the chapter being written, 0 to 100. */
  draft: number;
  /** Chapter written and waiting for the supervisor. */
  awaiting: boolean;
  defended: boolean;
}

export interface AcademicState {
  /** 1 = 100 level. Stays the same when a year is repeated. */
  level: number;
  courses: CourseState[];
  registered: boolean;
  lateRegistration: boolean;
  transcript: SemesterRecord[];
  carryovers: CarryoverCourse[];
  /** Semesters in a row with CGPA below the probation line. */
  lowCgpaRun: number;
  probation: boolean;
  issues: ResultIssue[];
  /** Playing an extra year only to clear carryovers. */
  spillover: boolean;
  repeating: boolean;
  project: ProjectState | null;
  /** Orientation attended (year one). */
  orientation: boolean;
}

// ---------- money ----------

export interface FeeState {
  id: FeeId;
  label: string;
  amount: number;
  paid: boolean;
  dueSemester: 1 | 2;
  dueDay: number;
}

export interface PendingDebit {
  id: string;
  feeId: FeeId;
  amount: number;
  visits: number;
}

export interface MoneyState {
  fees: FeeState[];
  debits: PendingDebit[];
  /** Allowance that is late: when it lands (dayCount) and how much. */
  lateAllowance: Array<{ dayCount: number; amount: number }>;
  /** The portal is down until this slot stamp (see stamp()). */
  portalDownUntil: number;
  /** Total spent and earned, for summaries. */
  spent: number;
  earned: number;
  /** What the portal said last time, for the phone screen. */
  lastPortal: PortalResult | null;
}

export type PortalOutcome = 'ok' | 'down' | 'unrecorded' | 'refused';
export interface PortalResult {
  outcome: PortalOutcome;
  text: string;
  at: number;
}

export interface Loan {
  id: string;
  personId: string;
  amount: number;
  /** dayCount it should be paid back by. */
  due: number;
  /** True when the player owes the person. */
  playerOwes: boolean;
  /** Reminder already sent. */
  nagged?: boolean;
}

// ---------- clearance ----------

export interface ClearanceState {
  active: boolean;
  signed: Record<OfficeId, boolean>;
  /** "Go and get X's signature first", said at a visit. */
  extraPrereq: Partial<Record<OfficeId, OfficeId>>;
  /** "Come back tomorrow": not before this dayCount. */
  backOn: Partial<Record<OfficeId, number>>;
  medicalFeePaid: boolean;
  allocation: boolean;
  library: boolean;
  startDay: number;
  endDay: number | null;
  visits: number;
  wasted: number;
  spent: number;
  lastOutcome: string | null;
}

// ---------- hostel ----------

export interface RoomState {
  placeId: string;
  roomNo: string;
  roommates: string[];
  /** Still on a temporary bed space (before allocation). */
  temporary: boolean;
  padlock: boolean;
  light: boolean;
  water: boolean;
  /** A room levy waiting to be paid. */
  levy: number;
  /** A roommate suspected of taking things. */
  suspect: string | null;
}

export interface HustleState {
  owned: HustleId[];
  xp: number;
  profitSemester: number;
  profitTotal: number;
}

// ---------- people and chat ----------

export interface PersonState {
  rel: number;
  /** dayCount the player last talked to them. */
  lastTalk: number;
  /** Favours used this semester, by kind. */
  favours: Record<string, number>;
}

export interface ChatReply {
  label: string;
  reply: string;
  effects?: Effects;
}

export interface ChatMessage {
  id: number;
  /** A person id, 'me' or 'system'. */
  from: string;
  text: string;
  /** stamp() of when it was sent. */
  at: number;
  replies?: ChatReply[];
  answered?: number;
  draft?: boolean;
}

/** One conversation. 'direct' threads are with one person; the shape is
 *  meant to let a real player-to-player transport replace them later. */
export interface ChatThread {
  id: string;
  title: string;
  kind: 'group' | 'direct';
  members: string[];
  messages: ChatMessage[];
  unread: number;
}

export interface ChatState {
  threads: Record<string, ChatThread>;
  seq: number;
}

// ---------- goals ----------

export type ObjectiveMetric =
  | 'attend'
  | 'reads'
  | 'shifts'
  | 'talks'
  | 'signatures'
  | 'assignments'
  | 'save'
  | 'calm'
  | 'fed'
  | 'chapter'
  | 'fees';

export interface Objective {
  id: string;
  label: string;
  metric: ObjectiveMetric;
  target: number;
  done: boolean;
  draft?: boolean;
}

export interface WeekCounters {
  attended: number;
  missed: number;
  reads: number;
  shifts: number;
  talks: number;
  signatures: number;
  assignments: number;
  chapters: number;
  maxHunger: number;
  startMoney: number;
}

export type Position = 'none' | 'class_rep' | 'dept_president' | 'su_president';

export interface GoalState {
  ambition: AmbitionId;
  milestones: Record<string, 'done' | 'missed'>;
  objectives: Objective[];
  objectivesDone: number;
  position: Position;
  /** Campaign effort for the next election. */
  campaign: number;
}

export interface Stats {
  lecturesAttended: number;
  lecturesMissed: number;
  meals: number;
  brokeSlots: number;
  brokeTimes: number;
  wasBroke: boolean;
  kekeRides: number;
  cabRides: number;
  longWalks: number;
  sickTimes: number;
  stressSum: number;
  stressSamples: number;
  hustleShifts: number;
  eventsSeen: number;
  minMoney: number;
  maxMoney: number;
}

/** A screen the UI should show once (results, year summary, graduation...). */
export type Summary =
  | { kind: 'clearance' }
  | { kind: 'semester'; record: number }
  | { kind: 'year'; year: number; level: number; repeated: boolean; probation: boolean }
  | { kind: 'graduation' }
  | { kind: 'withdrawn' };

export interface LogEntry {
  at: number;
  text: string;
}

export interface PlayerProfile {
  name: string;
  characterId: string;
  background: BackgroundId;
  programmeId: string;
  /** The course they applied for (may differ if they missed the cut-off). */
  firstChoiceId: string;
  admissionScore: number;
  matric: string;
  ambition: AmbitionId;
}

export interface GameState {
  version: number;
  rng: number;
  phase: Phase;
  player: PlayerProfile;
  clock: Clock;
  needs: Needs;
  ill: boolean;
  /** Slots still to be lost (collapse, illness). */
  lostSlots: number;
  money: number;
  location: { placeId: string; sectionId: string };
  academics: AcademicState;
  finance: MoneyState;
  loans: Loan[];
  clearance: ClearanceState;
  inventory: Record<string, number>;
  room: RoomState;
  hustle: HustleState;
  people: Record<string, PersonState>;
  chat: ChatState;
  pendingEvent: { id: string; placeId: string | null } | null;
  scheduled: Array<{ eventId: string; dayCount: number }>;
  /** dayCount of the last random event (one a day at most). */
  lastEventDay: number;
  seenEvents: Record<string, number>;
  goals: GoalState;
  week: WeekCounters;
  stats: Stats;
  flags: Record<string, number>;
  /** This real-world week's campus-wide event. */
  campusWeek: { key: string; id: string } | null;
  summaries: Summary[];
  log: LogEntry[];
}

/** Can something be done right now? If not, says why. */
export type Availability = { ok: true } | { ok: false; reason: string };
