// The blank starting state for a new player. engine.ts then runs the first
// session, semester and day on it.
import { CAST } from '../content/people';
import { freshersHall } from '../content/places';
import { BACKGROUNDS, SAVE_VERSION, START_NEEDS, PHONE } from './config';
import { matricNumber } from './admission';
import { START_CLOCK } from './time';
import type { AmbitionId, BackgroundId, GameState, OfficeId, PersonState, PlayerProfile } from './types';

export interface NewGameSetup {
  name: string;
  characterId: string;
  background: BackgroundId;
  /** The course applied for and the one admitted to (they differ after a near miss). */
  choiceId: string;
  programmeId: string;
  admissionScore: number;
  /** Entrance test attempts in this admission (1 if not given). */
  testAttempts?: number;
  ambition: AmbitionId;
  seed: number;
  /** Real year the game started, for the matric number. */
  startYear: number;
  gender?: 'male' | 'female';
  look?: PlayerProfile['look'];
}

const NO_OFFICES: Record<OfficeId, boolean> = {
  admissions: false,
  registry: false,
  bursary: false,
  student_affairs: false,
  ict: false,
  college_office: false,
  hod: false,
  medical: false,
};

export function blankState(s: NewGameSetup): GameState {
  const home = freshersHall();
  const people: Record<string, PersonState> = {};
  for (const p of CAST) people[p.id] = { rel: p.startRel ?? 0, lastTalk: 0, favours: {} };
  const money = BACKGROUNDS[s.background].startMoney;
  return {
    version: SAVE_VERSION,
    rng: s.seed >>> 0 || 1,
    phase: 'playing',
    player: {
      name: s.name,
      characterId: s.characterId,
      background: s.background,
      programmeId: s.programmeId,
      firstChoiceId: s.choiceId,
      admissionScore: s.admissionScore,
      testAttempts: s.testAttempts ?? 1,
      matric: matricNumber(s.programmeId, s.seed, s.startYear),
      ambition: s.ambition,
      startYear: s.startYear,
      gender: s.gender ?? (s.characterId.startsWith('f') ? 'female' : 'male'),
      ...(s.look ? { look: s.look } : {}),
    },
    clock: { ...START_CLOCK },
    needs: { ...START_NEEDS },
    ill: false,
    lostSlots: 0,
    money,
    location: { placeId: home.id, sectionId: home.sectionId },
    academics: {
      level: 1,
      courses: [],
      registered: false,
      lateRegistration: false,
      transcript: [],
      carryovers: [],
      lowCgpaRun: 0,
      probation: false,
      issues: [],
      spillover: false,
      repeating: false,
      project: null,
      orientation: false,
    },
    finance: { fees: [], debits: [], lateAllowance: [], portalDownUntil: 0, spent: 0, earned: 0, lastPortal: null },
    loans: [],
    clearance: {
      active: true,
      signed: { ...NO_OFFICES },
      extraPrereq: {},
      backOn: {},
      medicalFeePaid: false,
      allocation: false,
      library: false,
      startDay: 1,
      endDay: null,
      visits: 0,
      wasted: 0,
      spent: 0,
      lastOutcome: null,
    },
    inventory: {},
    room: {
      placeId: home.id,
      roomNo: 'Transit bunk',
      roommates: [],
      temporary: true,
      padlock: false,
      light: true,
      water: true,
      levy: 0,
      suspect: null,
    },
    hustle: { owned: ['snacks'], xp: 0, profitSemester: 0, profitTotal: 0 },
    people,
    chat: { threads: {}, seq: 0 },
    pendingEvent: null,
    scheduled: [],
    lastEventDay: 0,
    seenEvents: {},
    goals: { ambition: s.ambition, milestones: {}, objectives: [], objectivesDone: 0, position: 'none', campaign: 0 },
    week: { attended: 0, missed: 0, reads: 0, shifts: 0, talks: 0, signatures: 0, assignments: 0, chapters: 0, maxHunger: 0, startMoney: money },
    phone: { ...PHONE.start },
    stats: {
      lecturesAttended: 0,
      lecturesMissed: 0,
      meals: 0,
      brokeSlots: 0,
      brokeTimes: 0,
      wasBroke: false,
      kekeRides: 0,
      cabRides: 0,
      longWalks: 0,
      sickTimes: 0,
      stressSum: 0,
      stressSamples: 0,
      hustleShifts: 0,
      eventsSeen: 0,
      minMoney: money,
      maxMoney: money,
    },
    flags: {},
    campusWeek: null,
    summaries: [],
    log: [],
  };
}
