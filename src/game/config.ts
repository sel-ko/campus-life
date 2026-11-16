// Every balance number in one place. Amounts are scaled for play, not real
// fee levels. The simulator (npm run sim) is how these were tuned; see BALANCE.md.
import type { BackgroundId, Needs } from './types';

export const SAVE_VERSION = 2;

// ---------- time ----------
export const SEMESTER_DAYS = 14;
/** Day 1 is a Monday. */
export const WEEKEND_DAYS = [6, 7, 13, 14];
export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
/** Exams fill the last three days. Lectures run until the day before. */
export const EXAM_DAYS = [12, 13, 14];
export const LAST_LECTURE_DAY = 11;
/** Year one, first semester: clearance and orientation come first. */
export const FRESHER_LECTURES_START = 8;
export const ORIENTATION_DAYS = [1, 2, 3, 4, 5];
/** Allowance lands on these semester days, in the morning. */
export const ALLOWANCE_DAYS = [1, 8];

// ---------- needs ----------
export const START_NEEDS: Needs = { energy: 85, hunger: 25, stress: 20, health: 90, hygiene: 55, bladder: 30 };
export const PER_SLOT = { hunger: 7, energy: -3, hygiene: -7, bladder: 11 };
/** Hygiene below this makes people keep their distance; bladder at 100 is an accident. */
export const SMELLY_AT = 25;

/** The phone: battery used each part of the day, data used, a data bundle. */
export const PHONE = { start: { battery: 85, data: 1500 }, drainPerSlot: 6, idleData: 15, portalData: 40, chatData: 5, bundle: 1500, bundlePrice: 500, chargePerHour: 60, shopCharge: 100 };
export const HUNGRY_AT = 80;
export const STARVING_DRAIN = { energy: -5, stress: 3, health: -3 };
export const TIRED_AT = 10;
export const STRESSED_AT = 85;
export const HEALTH_DROP = 3;
export const HEALTH_RECOVER = 1;
export const ILL_AT = 35;
export const COLLAPSE_HEALTH = 10;
export const BURNOUT_AT = 90;
export const SLEEP = { energy: 55, stress: -10, noLight: -15, noisy: -12, temporary: -10 };
export const NAP = { energy: 18, stress: -4 };
export const COLLAPSE = { stress: 10, health: -5 };

// ---------- money ----------
export interface Background {
  id: BackgroundId;
  label: string;
  blurb: string;
  startMoney: number;
  allowance: number;
  /** Chance a given allowance is late, and by up to how many days. */
  lateChance: number;
  /** Share of each fee the family sends. */
  feeShare: number;
}

export const BACKGROUNDS: Record<BackgroundId, Background> = {
  broke: {
    id: 'broke',
    label: 'Broke',
    blurb: 'Your people try, but you will need a hustle.',
    startMoney: 8000,
    allowance: 7000,
    lateChance: 0.35,
    feeShare: 0.85,
  },
  average: {
    id: 'average',
    label: 'Average',
    blurb: 'Fees are covered. Feeding money needs planning.',
    startMoney: 20000,
    allowance: 11000,
    lateChance: 0.2,
    feeShare: 1,
  },
  comfortable: {
    id: 'comfortable',
    label: 'Comfortable',
    blurb: 'Money is not your problem. Time is.',
    startMoney: 50000,
    allowance: 22000,
    lateChance: 0.08,
    feeShare: 1,
  },
};
export const ALLOWANCE_LATE_DAYS: [number, number] = [1, 3];

/** Per session. Competitive courses pay the higher figure. */
export const FEES = {
  acceptance: [15000, 20000],
  school: [80000, 110000],
  dues: [4000, 6000],
  hostel: [30000, 30000],
  lateRegistration: 5000,
} as const;
/** School fees come in two instalments, one per semester, due before exams. */
export const FEE_DUE_DAY = 11;
export const DATA_WEEKLY = 500;
export const CLASS_DUES = 1000;
export const PRACTICAL_MANUAL = 2000;

export const BROKE_BELOW = 1000;

// ---------- travel ----------
export const FARES = { keke: 150, cab: 700 };
/** Trips to or from the town: fares are dearer and walking takes two slots. */
export const TOWN_TRIP = { fareFactor: 2.5, walkSlots: 2 };
/** Driving your own car: fuel per trip between sections. */
export const DRIVE_FUEL = 300;
/** Bank loan: amount received, amount to repay, and days. */
export const BANK_LOAN = { amount: 20000, repay: 24000, days: 14 };
export const HOSPITAL_TREATMENT = 3000;
/** Kekes stop running at night. */
export const KEKE_NIGHT = false;

// ---------- portal ----------
export const PORTAL = {
  down: 0.12,
  unrecorded: 0.06,
  /** Extra risk within this many days of a deadline. */
  nearDeadlineDays: 2,
  nearDeadlineDown: 0.25,
  nearDeadlineUnrecorded: 0.05,
  /** Chance one Bursary visit sorts out an unrecorded debit. */
  resolveChance: 0.45,
};
/** Registration closes on this day; a late fee is charged after it, until the late close. */
export const REGISTRATION_DEADLINE = 5;
export const FRESHER_REGISTRATION_DEADLINE = 10;
export const LATE_REGISTRATION_CLOSE = 11;

// ---------- clearance ----------
export const CLEARANCE_WEIGHTS = {
  signed: 0.7,
  notOnSeat: 0.12,
  comeBackTomorrow: 0.1,
  needOther: 0.05,
  missingDoc: 0.05,
  closed: 0.03,
  /** Added to "signed" per point of relationship with the officer, and in the morning. */
  relBonus: 0.004,
  morningBonus: 0.08,
  afternoonNotOnSeat: 0.08,
  fridayTomorrow: 0.08,
  eveningClosed: 0.5,
  longQueue: 0.1,
};
export const MEDICAL_TEST_FEE = 3000;

// ---------- academics ----------
export const START_KNOWLEDGE = 5;
export const KNOWLEDGE = {
  lecture: 14,
  outsideFactor: 0.6,
  readLibrary: 11,
  readRoom: 8,
  readDark: 3,
  handout: 12,
  notes: 8,
  groupStudy: 10,
  posting: 10,
  illFactor: 0.5,
};
export const CA = { test: 15, assignment: 10, attendance: 5 };
export const EXAM_MAX = 70;
export const ATTENDANCE_BAR = 0.75;
/** Absences per course that never bar you (courses meet only 2 to 4 times). */
export const FREE_ABSENCES = 1;
/** Paper performance = PERF.base + PERF.slope × knowledge/100, plus luck. */
export const PERF = { base: 0.27, slope: 0.8 };
export const GRADE_BANDS: Array<{ min: number; grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'; points: number }> = [
  { min: 70, grade: 'A', points: 5 },
  { min: 60, grade: 'B', points: 4 },
  { min: 50, grade: 'C', points: 3 },
  { min: 45, grade: 'D', points: 2 },
  { min: 40, grade: 'E', points: 1 },
  { min: 0, grade: 'F', points: 0 },
];
export const CLASS_OF_DEGREE: Array<{ min: number; name: string }> = [
  { min: 4.5, name: 'First Class' },
  { min: 3.5, name: 'Second Class Upper' },
  { min: 2.4, name: 'Second Class Lower' },
  { min: 1.5, name: 'Third Class' },
  { min: 1.0, name: 'Pass' },
];
export const PROBATION_CGPA = 1.0;
/** A passed carryover replaces its F in the CGPA but counts as a C at most. */
export const RETAKE_MAX_POINTS = 3;
/** Failing this many units in one session means repeating the year. */
export const REPEAT_FAILED_UNITS = 24;
export const RESULT_ISSUE_CHANCE = 0.04;
export const ISSUE_RESOLVE_CHANCE = 0.5;
/** Chance a scheduled lecture is cancelled / moved / moved to a weekend. */
export const LECTURE_CHANGES = { cancel: 0.06, move: 0.06, weekend: 0.03 };
export const GST_SEAT_CHANCE = 0.75;
export const GST_BATCH_MOVE_CHANCE = 0.3;
export const EPS_PROFIT_TARGET = 10000;
export const PROJECT = { draftPerSession: 35, chapters: 5 };

// ---------- hostel ----------
export const OUTAGES = { light: 0.25, water: 0.2 };
export const THEFT = { chance: 0.18, padlockFactor: 0.2, cashMin: 300, cashMax: 1500 };
export const OVERSLEEP_CHANCE = 0.08;
export const KEEP_ROOMMATE_CHANCE = 0.3;
export const PADLOCK_PRICE = 1500;

// ---------- people ----------
export const TALK_REL = 3;
export const LOAN_DAYS = 7;
export const UNPAID_LOAN_REL = -20;

// ---------- events ----------
export const EVENT_CHANCE = 0.2;
export const LOG_LIMIT = 40;
export const CHAT_LIMIT = 60;

// ---------- hustles ----------
export const ERRAND_PAY = 400;
export const WASH_PLATES_PAY = 500;
