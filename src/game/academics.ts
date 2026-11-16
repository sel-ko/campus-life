// Academics: the semester timetable, attending and reading, tests,
// assignments, exams, grading, GPA/CGPA, carryovers, probation, repeating,
// progression and graduation.
import { getCollege, getProgramme } from '../content/courses';
import { LECTURERS, getPerson } from '../content/people';
import { collegeVenues, gstHalls, medicalCentre, officePlace, placementFor } from '../content/places';
import type { CourseDef } from './contentTypes';
import {
  ATTENDANCE_BAR,
  FREE_ABSENCES,
  PERF,
  CA,
  CLASS_OF_DEGREE,
  EPS_PROFIT_TARGET,
  EXAM_DAYS,
  EXAM_MAX,
  FRESHER_LECTURES_START,
  GRADE_BANDS,
  GST_BATCH_MOVE_CHANCE,
  GST_SEAT_CHANCE,
  ISSUE_RESOLVE_CHANCE,
  KNOWLEDGE,
  LAST_LECTURE_DAY,
  LECTURE_CHANGES,
  PROBATION_CGPA,
  RETAKE_MAX_POINTS,
  PROJECT,
  REPEAT_FAILED_UNITS,
  RESULT_ISSUE_CHANCE,
  START_KNOWLEDGE,
  WEEKEND_DAYS,
} from './config';
import { semesterLoad, totalUnits } from './curriculum';
import { clamp, log } from './draft';
import { examFeeBlock } from './money';
import { hashText, type Rng } from './rng';
import { isWeekend, weekday } from './time';
import type {
  Availability,
  CourseKind,
  CourseResult,
  CourseState,
  GameState,
  Grade,
  Meeting,
  SemesterRecord,
} from './types';

// ---------- grading ----------

export function gradeFor(score: number): { grade: Grade; points: number } {
  const band = GRADE_BANDS.find((b) => score >= b.min) ?? GRADE_BANDS[GRADE_BANDS.length - 1]!;
  return { grade: band.grade, points: band.points };
}

export function gpa(courses: Array<{ units: number; points: number }>): number {
  const units = totalUnits(courses);
  if (!units) return 0;
  return Math.round((courses.reduce((s, c) => s + c.points * c.units, 0) / units) * 100) / 100;
}

/** CGPA weighted by units. Each course counts once, at its latest attempt:
 *  passing a carryover replaces the earlier F, but counts as a C at most. */
export function cgpaOf(transcript: SemesterRecord[]): number {
  const latest = new Map<string, { units: number; points: number }>();
  const failedBefore = new Set<string>();
  for (const r of transcript) {
    for (const c of r.courses) {
      const capped = failedBefore.has(c.code) ? Math.min(c.points, RETAKE_MAX_POINTS) : c.points;
      latest.set(c.code, { units: c.units, points: capped });
      if (c.grade === 'F') failedBefore.add(c.code);
    }
  }
  return gpa([...latest.values()]);
}

export function classOfDegree(cgpa: number): string {
  return CLASS_OF_DEGREE.find((c) => cgpa >= c.min)?.name ?? 'No degree';
}

export function currentCgpa(d: GameState): number {
  return cgpaOf(d.academics.transcript);
}

// ---------- building the semester ----------

const NO_MEETINGS: CourseKind[] = ['project'];

/** How many times a week a course meets. */
function weeklyMeetings(kind: CourseKind, units: number): number {
  switch (kind) {
    case 'it':
      return 5;
    case 'posting':
      return 3;
    case 'chambers':
      return 3;
    case 'project':
      return 0;
    case 'moot':
    case 'seminar':
    case 'practical':
      return 1;
    default:
      return units >= 3 ? 2 : 1;
  }
}

function venueFor(def: CourseDef, collegeId: string): string {
  const h = hashText(def.code);
  const pick = <T>(list: T[]) => list[h % list.length]!;
  switch (def.kind) {
    case 'gst': {
      const halls = gstHalls();
      return halls[Number(def.code.slice(-1)) % halls.length]!.id;
    }
    case 'practical':
      return pick(collegeVenues(collegeId, 'lab')).id;
    case 'it':
      return placementFor('it').id;
    case 'chambers':
      return placementFor('chambers').id;
    case 'posting':
      return medicalCentre().id;
    case 'project':
      return officePlace('college_office', collegeId).id;
    default:
      return pick(collegeVenues(collegeId, 'lecture_hall')).id;
  }
}

export function lecturerFor(code: string): string {
  return LECTURERS[hashText(`lecturer:${code}`) % LECTURERS.length]!.id;
}

function temperament(id: string) {
  return getPerson(id)?.temperament ?? 'gentle';
}

/** Weekly slots: weekday 0-4 x slot 0-2, Morning first. */
function weeklyPattern(defs: CourseDef[], r: Rng): Map<string, Array<{ wd: number; slot: number }>> {
  const taken = new Set<string>();
  const out = new Map<string, Array<{ wd: number; slot: number }>>();
  const order = [...defs].sort((a, b) => weeklyMeetings(b.kind, b.units) - weeklyMeetings(a.kind, a.units));
  for (const def of order) {
    const n = weeklyMeetings(def.kind, def.units);
    const mine: Array<{ wd: number; slot: number }> = [];
    const preferSlots = def.kind === 'moot' ? [2, 1, 0] : def.kind === 'chambers' ? [1, 0, 2] : [0, 1, 2];
    const days = r.shuffle([0, 1, 2, 3, 4]);
    for (const slot of preferSlots) {
      for (const wd of days) {
        if (mine.length >= n) break;
        if (taken.has(`${wd}:${slot}`) && def.kind !== 'it') continue;
        if (mine.some((m) => m.wd === wd) && n <= 5) continue;
        mine.push({ wd, slot });
        taken.add(`${wd}:${slot}`);
      }
    }
    out.set(def.code, mine);
  }
  return out;
}

function examSlots(): Array<{ day: number; slot: number }> {
  const out: Array<{ day: number; slot: number }> = [];
  for (const slot of [0, 1, 2]) for (const day of EXAM_DAYS) out.push({ day, slot });
  for (const day of EXAM_DAYS) out.push({ day, slot: 3 });
  // Overflow papers (heavy carryover loads) go on the last lecture day.
  out.push({ day: LAST_LECTURE_DAY, slot: 2 }, { day: LAST_LECTURE_DAY, slot: 3 });
  return out.sort((a, b) => a.day - b.day || a.slot - b.slot);
}

export function hasExam(kind: CourseKind): boolean {
  return kind !== 'it' && kind !== 'chambers';
}

function handoutPrice(lecturerId: string, code: string, r: Rng): number {
  const t = temperament(lecturerId);
  if (t === 'handout') return 1500 + r.int(0, 3) * 500;
  if (code.startsWith('GST') || code.startsWith('EPS')) return r.chance(0.5) ? 1000 : 0;
  return r.chance(0.3) ? 1500 + r.int(0, 2) * 500 : 0;
}

/** Courses for the new semester with their timetable, test, assignment and exam. */
export function buildSemester(d: GameState, r: Rng): void {
  const a = d.academics;
  const p = getProgramme(d.player.programmeId);
  const defs = semesterLoad(p.id, a.level, d.clock.semester, a.carryovers, a.spillover);
  const collegeId = p.collegeId;
  const pattern = weeklyPattern(defs, r);
  const startDay = d.clock.year === 1 && d.clock.semester === 1 && a.level === 1 && !a.repeating ? FRESHER_LECTURES_START : 1;
  const slots = examSlots();
  const examOrder = r.shuffle(defs.filter((x) => hasExam(x.kind)).map((x) => x.code));

  a.courses = defs.map((def): CourseState => {
    const lecturerId = lecturerFor(def.code);
    const venueId = venueFor(def, collegeId);
    const meetings: Meeting[] = [];
    if (!NO_MEETINGS.includes(def.kind)) {
      for (let day = startDay; day <= LAST_LECTURE_DAY; day++) {
        if (isWeekend(day)) continue;
        for (const m of pattern.get(def.code) ?? []) {
          if (m.wd === weekday(day)) meetings.push({ day, slot: m.slot, placeId: venueId, status: 'scheduled', attended: false });
        }
      }
    }
    // Short-notice changes: cancelled, moved to another room, or fixed for a weekend.
    const absentee = temperament(lecturerId) === 'absentee';
    for (const m of meetings) {
      if (['it', 'posting', 'chambers'].includes(def.kind)) continue;
      if (r.chance(LECTURE_CHANGES.cancel + (absentee ? 0.25 : 0))) m.status = 'cancelled';
      else if (r.chance(LECTURE_CHANGES.move)) {
        const other = [...collegeVenues(collegeId, 'lecture_hall'), ...gstHalls()].filter((v) => v.id !== venueId);
        if (other.length) {
          m.placeId = r.pick(other).id;
          m.moved = true;
        }
      } else if (r.chance(LECTURE_CHANGES.weekend) && def.kind !== 'gst') {
        const weekend = WEEKEND_DAYS.filter((wdDay) => wdDay > m.day && wdDay <= LAST_LECTURE_DAY);
        if (weekend.length) {
          m.day = weekend[0]!;
          m.moved = true;
        }
      }
    }
    meetings.sort((x, y) => x.day - y.day || x.slot - y.slot);
    // The test: a meeting in week two (or the last one there is).
    const testable = ['lecture', 'gst', 'practical', 'seminar', 'moot'].includes(def.kind);
    if (testable) {
      const live = meetings.filter((m) => m.status === 'scheduled');
      const late = live.filter((m) => m.day >= 8);
      const t = late[0] ?? live[live.length - 1];
      if (t) t.test = true;
    }
    const examIndex = examOrder.indexOf(def.code);
    const examAt = examIndex >= 0 ? slots[examIndex % slots.length]! : { day: EXAM_DAYS[0]!, slot: 0 };
    const examPlace =
      def.kind === 'gst' ? venueId : def.kind === 'project' ? officePlace('college_office', collegeId).id : venueId;
    return {
      code: def.code,
      title: def.title,
      units: def.units,
      kind: def.kind,
      carryover: def.carryover,
      draft: def.draft,
      lecturerId,
      venueId,
      meetings,
      knowledge: START_KNOWLEDGE,
      testScore: null,
      assignment: null,
      assignmentDue: 10,
      handout: { price: handoutPrice(lecturerId, def.code, r), status: 'none' },
      goodwill: 0,
      covered: false,
      exam: {
        day: examAt.day,
        slot: examAt.slot,
        placeId: examPlace,
        status: hasExam(def.kind) ? 'pending' : 'written',
        score: null,
      },
      notes: false,
    };
  });

  // Final year: a project supervisor.
  if (a.level === p.years && d.clock.semester === 1 && !a.project) {
    a.project = { supervisorId: r.pick(LECTURERS).id, chapters: 0, draft: 0, awaiting: false, defended: false };
    log(d, `Final year! Your project supervisor is ${getPerson(a.project.supervisorId)?.name}. Five chapters, then a defence.`);
  }
  // Nothing to register in an empty spill-over semester.
  if (a.courses.length === 0) a.registered = true;
}

// ---------- the timetable now ----------

export function meetingsNow(d: GameState, placeId?: string): Array<{ course: CourseState; meeting: Meeting }> {
  const out: Array<{ course: CourseState; meeting: Meeting }> = [];
  for (const course of d.academics.courses) {
    for (const meeting of course.meetings) {
      if (meeting.day !== d.clock.day || meeting.slot !== d.clock.slot || meeting.status !== 'scheduled') continue;
      if (placeId && meeting.placeId !== placeId) continue;
      out.push({ course, meeting });
    }
  }
  return out;
}

export function examsNow(d: GameState, placeId?: string): CourseState[] {
  return d.academics.courses.filter(
    (c) => c.exam.status === 'pending' && c.exam.day === d.clock.day && c.exam.slot === d.clock.slot && (!placeId || c.exam.placeId === placeId),
  );
}

/** Attendance so far: attended / held, counting meetings already past. */
export function attendance(d: GameState, course: CourseState, wholeSemester = false): { attended: number; held: number; pct: number } {
  const now = d.clock.day * 4 + d.clock.slot;
  // A new fresher's attendance only counts from the day their clearance form is complete.
  const fresher = d.clock.year === 1 && d.clock.semester === 1 && d.academics.level === 1 && !d.academics.repeating;
  const from = fresher ? (d.flags.formDoneDay ?? 99) : 0;
  const held = course.meetings.filter(
    (m) => m.status === 'scheduled' && (m.attended || (m.day >= from && (wholeSemester || m.day * 4 + m.slot < now))),
  );
  const attended = held.filter((m) => m.attended).length;
  return { attended, held: held.length, pct: held.length ? attended / held.length : 1 };
}

/** The 75% rule (unless the course rep or an office has covered for you). */
export function barred(d: GameState, course: CourseState): boolean {
  if (course.covered || ['project', 'it', 'chambers'].includes(course.kind)) return false;
  const a = attendance(d, course, true);
  return a.pct < ATTENDANCE_BAR && a.held - a.attended > FREE_ABSENCES;
}

// ---------- doing things ----------

function learn(d: GameState, course: CourseState, amount: number): number {
  const lecturer = temperament(course.lecturerId);
  let gain = amount * (lecturer === 'strict' ? 1.1 : 1);
  if (d.ill) gain *= KNOWLEDGE.illFactor;
  if (d.needs.energy < 15) gain *= 0.6;
  if (d.needs.hunger >= 80) gain *= 0.7;
  gain = Math.round(gain);
  course.knowledge = clamp(course.knowledge + gain);
  return gain;
}

/** How well you perform on a paper, 0 to 1. */
function performance(d: GameState, course: CourseState, r: Rng): number {
  let p = PERF.base + PERF.slope * (course.knowledge / 100) + r.noise(0.08);
  if (temperament(course.lecturerId) === 'gentle') p += 0.04;
  if (temperament(course.lecturerId) === 'strict') p -= 0.04;
  if (d.needs.energy < 20) p -= 0.08;
  if (d.needs.stress >= 90) p -= 0.1;
  if (d.ill) p -= 0.1;
  return clamp(p, 0, 1);
}

/** GST halls are packed: without a seat you stand outside and learn less. */
export function gstSeatFree(d: GameState, r: Rng, arrivedThisSlot: boolean): boolean {
  const rep = d.people.tobi?.rel ?? 0;
  if (rep >= 30) return true; // the course rep keeps you a seat
  return !arrivedThisSlot && r.chance(GST_SEAT_CHANCE);
}

export function attendMut(d: GameState, r: Rng, code: string, outside = false): string {
  const course = d.academics.courses.find((c) => c.code === code);
  const m = course && meetingsNow(d).find((x) => x.course.code === code)?.meeting;
  if (!course || !m) return 'There is no lecture now.';
  m.attended = true;
  m.outside = outside;
  d.stats.lecturesAttended += 1;
  d.week.attended += 1;
  // Every class of a course together covers the same ground, however often it meets.
  const live = Math.max(2, course.meetings.filter((x) => x.status === 'scheduled').length);
  const perClass = (KNOWLEDGE.lecture * 4) / live;
  const base = course.kind === 'posting' || course.kind === 'it' || course.kind === 'chambers' ? KNOWLEDGE.posting : perClass;
  const manual = course.kind === 'practical' && !(d.inventory.manual ?? 0) ? 0.5 : 1;
  const gain = learn(d, course, base * (outside ? KNOWLEDGE.outsideFactor : 1) * manual);
  if (temperament(course.lecturerId) === 'jovial') d.needs.stress = clamp(d.needs.stress - 2);
  course.goodwill = clamp(course.goodwill + 1, -50, 50);
  let text = outside
    ? `${code}: no seat, so you stood by the window and caught what you could (+${gain} knowledge).`
    : `You attended ${code} (+${gain} knowledge).`;
  if (manual < 1) text += ' No practical manual, so you mostly watched.';
  if (m.test) {
    const score = Math.round(CA.test * performance(d, course, r));
    course.testScore = score;
    text += ` Surprise: it was the ${code} test day. You scored ${score}/${CA.test}.`;
  }
  log(d, text);
  return text;
}

export function readMut(d: GameState, code: string, where: 'library' | 'room'): string {
  const course = d.academics.courses.find((c) => c.code === code);
  if (!course) return 'No such course.';
  const dark = where === 'room' && !d.room.light && d.clock.slot >= 2;
  const amount = where === 'library' ? KNOWLEDGE.readLibrary : dark ? KNOWLEDGE.readDark : KNOWLEDGE.readRoom;
  const gain = learn(d, course, amount);
  d.week.reads += 1;
  const text = dark
    ? `You read ${code} with your phone torch. Light never come (+${gain}).`
    : `You read ${code} (+${gain} knowledge).`;
  log(d, text);
  return text;
}

export function canDoAssignment(d: GameState, course: CourseState): Availability {
  if (course.assignment !== null) return { ok: false, reason: 'Already submitted' };
  if (['it', 'chambers', 'project', 'posting'].includes(course.kind)) return { ok: false, reason: 'No assignment for this one' };
  if (course.code === 'EPS 312') return { ok: false, reason: 'EPS 312 is marked on your hustle profit' };
  if (d.clock.day > course.assignmentDue) return { ok: false, reason: `It was due on day ${course.assignmentDue}` };
  return { ok: true };
}

export function assignmentMut(d: GameState, r: Rng, code: string): string {
  const course = d.academics.courses.find((c) => c.code === code)!;
  if (course.code === 'GST 121' && !d.clearance.library && !d.flags.library_card) {
    course.assignment = 0;
    log(d, 'GST 121: the assignment needs a library card. You are not registered at the library, so it scored 0.');
    return 'No library card, no marks.';
  }
  const score = Math.round(CA.assignment * clamp(0.4 + 0.6 * (course.knowledge / 100) + r.noise(0.08), 0, 1));
  course.assignment = score;
  d.week.assignments += 1;
  log(d, `You submitted the ${code} assignment. Expect about ${score}/${CA.assignment}.`);
  return `Submitted (${score}/${CA.assignment}).`;
}

export function buyHandoutMut(d: GameState, code: string): void {
  const course = d.academics.courses.find((c) => c.code === code)!;
  course.handout.status = 'bought';
  course.goodwill = clamp(course.goodwill + 5, -50, 50);
  const gain = learn(d, course, KNOWLEDGE.handout);
  log(d, `You bought the ${code} handout. It actually explains things (+${gain} knowledge).`);
}

export function refuseHandoutMut(d: GameState, code: string): void {
  const course = d.academics.courses.find((c) => c.code === code)!;
  course.handout.status = 'refused';
  if (temperament(course.lecturerId) === 'handout') course.goodwill = clamp(course.goodwill - 5, -50, 50);
}

export function canWriteExam(d: GameState, course: CourseState): Availability {
  if (course.exam.status !== 'pending') return { ok: false, reason: 'Not open' };
  if (!d.academics.registered) return { ok: false, reason: 'You did not register this course' };
  const fees = examFeeBlock(d);
  if (fees) return { ok: false, reason: fees };
  if (barred(d, course)) return { ok: false, reason: 'Barred: attendance below 75%. Ask the course rep or the College Office' };
  return { ok: true };
}

export function writeExamMut(d: GameState, r: Rng, code: string): string {
  const course = d.academics.courses.find((c) => c.code === code)!;
  let score: number;
  if (course.kind === 'project') {
    const p = d.academics.project;
    const chapters = p?.chapters ?? 0;
    score = Math.round(EXAM_MAX * clamp(0.25 + 0.7 * (chapters / PROJECT.chapters) + r.noise(0.06), 0, 1));
    if (p) p.defended = true;
    log(d, `You defended your project with ${chapters} approved chapters. The panel nodded slowly.`);
  } else {
    score = Math.round(EXAM_MAX * performance(d, course, r));
    log(d, `You wrote the ${code} exam. ${score >= 45 ? 'It went well.' : score >= 30 ? 'Fifty-fifty.' : 'God abeg.'}`);
  }
  course.exam.status = 'written';
  course.exam.score = score;
  d.needs.stress = clamp(d.needs.stress + 4);
  return `Exam written.`;
}

/** The course rep (once a semester) or the College Office lifts an attendance bar. */
export function coverAttendanceMut(d: GameState, code: string): void {
  const course = d.academics.courses.find((c) => c.code === code);
  if (course) course.covered = true;
}

export function worstAttendance(d: GameState): CourseState | undefined {
  return [...d.academics.courses]
    .filter((c) => !c.covered && c.meetings.length)
    .sort((a, b) => attendance(d, a, true).pct - attendance(d, b, true).pct)[0];
}

// ---------- project ----------

export function writeProjectMut(d: GameState): string {
  const p = d.academics.project;
  if (!p) return 'No project yet.';
  if (p.awaiting) return 'Your supervisor has not read the last chapter yet.';
  p.draft = Math.min(100, p.draft + PROJECT.draftPerSession);
  if (p.draft >= 100) {
    p.awaiting = true;
    p.draft = 0;
    log(d, `Chapter ${p.chapters + 1} drafted. Take it to your supervisor.`);
  } else log(d, `You worked on chapter ${p.chapters + 1} (${p.draft}% done).`);
  return 'Worked on the project.';
}

export function meetSupervisorMut(d: GameState, r: Rng): string {
  const p = d.academics.project;
  if (!p) return 'No project yet.';
  if (!p.awaiting) {
    log(d, 'Your supervisor asked, "Where is the chapter?" Go and write.');
    return 'Nothing to show.';
  }
  const rel = d.people[p.supervisorId]?.rel ?? 0;
  if (r.chance(0.55 + rel / 200)) {
    p.chapters = Math.min(PROJECT.chapters, p.chapters + 1);
    p.awaiting = false;
    d.week.chapters += 1;
    log(d, `Supervisor approved chapter ${p.chapters}! Only red ink on half the pages.`);
  } else {
    log(d, 'Supervisor: "Not yet. Correct the references and come back."');
    p.awaiting = false;
    p.draft = 60;
  }
  return 'Met the supervisor.';
}

// ---------- each slot, each day ----------

/** End of a slot: meetings and exams in it that were not attended are missed. */
export function closeSlot(d: GameState): void {
  for (const course of d.academics.courses) {
    for (const m of course.meetings) {
      if (m.day === d.clock.day && m.slot === d.clock.slot && m.status === 'scheduled' && !m.attended) {
        d.stats.lecturesMissed += 1;
        d.week.missed += 1;
        if (m.test) course.testScore = 0;
      }
    }
    const e = course.exam;
    if (e.status === 'pending' && e.day === d.clock.day && e.slot === d.clock.slot) {
      e.status = barred(d, course) ? 'barred' : 'missed';
      e.score = 0;
      log(d, `You missed the ${course.code} exam.`);
    }
  }
}

/** Start of a day: GST exam batches can move at short notice. Returns moved codes. */
export function moveGstBatches(d: GameState, r: Rng): string[] {
  const moved: string[] = [];
  for (const c of d.academics.courses) {
    if (c.kind !== 'gst' || c.exam.status !== 'pending' || c.exam.batchMoved) continue;
    if (c.exam.day !== d.clock.day + 1 || !r.chance(GST_BATCH_MOVE_CHANCE)) continue;
    const taken = new Set(d.academics.courses.map((x) => `${x.exam.day}:${x.exam.slot}`));
    const options = [0, 1, 2].map((slot) => ({ day: c.exam.day, slot })).filter((s) => !taken.has(`${s.day}:${s.slot}`));
    if (!options.length) continue;
    const to = r.pick(options);
    c.exam.slot = to.slot;
    c.exam.batchMoved = true;
    moved.push(c.code);
  }
  return moved;
}

// ---------- results ----------

function courseScore(d: GameState, c: CourseState): { ca: number; exam: number } {
  const att = attendance(d, c, true).pct;
  if (!d.academics.registered) return { ca: 0, exam: 0 };
  switch (c.kind) {
    case 'it':
    case 'chambers': {
      const score = clamp(Math.round(35 + 55 * att + c.goodwill / 5), 0, 100);
      return { ca: Math.round(score * 0.3), exam: score - Math.round(score * 0.3) };
    }
    case 'posting':
      return { ca: Math.round(30 * att), exam: c.exam.score ?? 0 };
    case 'project': {
      const chapters = d.academics.project?.chapters ?? 0;
      return { ca: Math.round((30 * chapters) / PROJECT.chapters), exam: c.exam.score ?? 0 };
    }
    default: {
      let assignment = c.assignment ?? 0;
      if (c.code === 'EPS 312') assignment = Math.min(CA.assignment, Math.round((CA.assignment * d.hustle.profitSemester) / EPS_PROFIT_TARGET));
      const ca = (c.testScore ?? 0) + assignment + Math.round(CA.attendance * att);
      return { ca, exam: c.exam.score ?? 0 };
    }
  }
}

function resultFor(score: number, c: CourseState): CourseResult {
  const g = gradeFor(score);
  return { code: c.code, title: c.title, units: c.units, ca: 0, exam: 0, score, grade: g.grade, points: g.points, carryover: c.carryover };
}

/** Sets a result's score and grade (used when an office fixes a problem). */
function setScore(res: CourseResult, score: number): void {
  const g = gradeFor(score);
  res.score = score;
  res.grade = g.grade;
  res.points = g.points;
}

function recomputeCgpas(d: GameState): void {
  const t = d.academics.transcript;
  for (let i = 0; i < t.length; i++) {
    t[i]!.gpa = gpa(t[i]!.courses);
    t[i]!.failedUnits = t[i]!.courses.filter((c) => c.grade === 'F').reduce((s, c) => s + c.units, 0);
    t[i]!.cgpa = cgpaOf(t.slice(0, i + 1));
  }
}

/** End of semester: grade every course, update carryovers, probation and progression. */
export function semesterResults(d: GameState, r: Rng): void {
  const a = d.academics;
  // Not registered: the semester does not count. Its courses wait for next year.
  if (!a.registered && a.courses.length) {
    for (const c of a.courses) {
      if (!a.carryovers.some((x) => x.code === c.code)) a.carryovers.push({ code: c.code, title: c.title, units: c.units, kind: c.kind, semester: d.clock.semester });
    }
    log(d, 'You were never registered this semester, so it does not count. Its courses move to next year, on top of the normal load.');
    a.courses = [];
    return;
  }
  const courses: CourseResult[] = a.courses.map((c) => {
    const { ca, exam } = courseScore(d, c);
    const res = resultFor(clamp(ca + exam), c);
    res.ca = ca;
    res.exam = exam;
    if (hasExam(c.kind)) res.examStatus = c.exam.status === 'pending' ? 'missed' : c.exam.status;
    return res;
  });
  // Now and then a script goes missing or a grade is entered wrongly.
  const recordIndex = a.transcript.length;
  for (const res of courses) {
    if (!r.chance(RESULT_ISSUE_CHANCE) || res.score === 0) continue;
    const kind = r.chance(0.5) ? 'missing_script' : 'wrong_grade';
    res.issue = kind;
    res.trueScore = res.score;
    setScore(res, kind === 'missing_script' ? 0 : Math.max(0, res.score - 12));
    a.issues.push({
      id: `${recordIndex}:${res.code}`,
      record: recordIndex,
      code: res.code,
      kind,
      officeId: kind === 'missing_script' ? 'registry' : 'college_office',
      visits: 0,
    });
  }
  if (courses.length) {
    const record: SemesterRecord = {
      year: d.clock.year,
      level: a.level,
      semester: d.clock.semester,
      courses,
      units: totalUnits(courses),
      failedUnits: 0,
      gpa: 0,
      cgpa: 0,
    };
    a.transcript.push(record);
    recomputeCgpas(d);
    d.summaries.push({ kind: 'semester', record: recordIndex });
    log(d, `Results are out: GPA ${record.gpa.toFixed(2)}, CGPA ${record.cgpa.toFixed(2)}.`);
  }

  // A failed project can be worked on and defended again.
  const proj = courses.find((x) => x.title === 'Final Year Project');
  if (proj && proj.grade === 'F' && a.project) a.project.defended = false;

  // Carryovers: an F is retaken in the same semester next year; a pass clears it.
  for (const res of courses) {
    a.carryovers = a.carryovers.filter((co) => co.code !== res.code);
    if (res.grade === 'F' && !res.issue) {
      const c = a.courses.find((x) => x.code === res.code)!;
      a.carryovers.push({ code: c.code, title: c.title, units: c.units, kind: c.kind, semester: d.clock.semester });
    }
  }

  // Probation: CGPA below 1.00 two semesters running; a third means withdrawal.
  const cgpa = currentCgpa(d);
  // A fresher's first semester (clearance chaos) does not count towards probation.
  const firstSemester = a.transcript.length === 1;
  if (courses.length && !firstSemester) {
    a.lowCgpaRun = cgpa < PROBATION_CGPA ? a.lowCgpaRun + 1 : 0;
    if (a.lowCgpaRun === 2) {
      a.probation = true;
      log(d, 'Academic probation: your CGPA has been below 1.00 for two semesters. One more and you are out.');
    } else if (a.lowCgpaRun >= 3 && a.probation) {
      d.phase = 'withdrawn';
      d.summaries.push({ kind: 'withdrawn' });
      log(d, 'You have been withdrawn from the university. It is not the end of the world: you can start again.');
      return;
    } else if (a.lowCgpaRun === 0) a.probation = false;
  }
  a.courses = [];
}

/** End of a session (after second-semester results): repeat, progress or graduate. */
export function endOfSession(d: GameState): void {
  if (d.phase !== 'playing') return;
  const a = d.academics;
  const p = getProgramme(d.player.programmeId);
  const thisYear = a.transcript.filter((t) => t.year === d.clock.year);
  const failed = thisYear.reduce((s, t) => s + t.courses.filter((c) => c.grade === 'F' && !c.carryover).reduce((x, c) => x + c.units, 0), 0);
  const final = a.level >= p.years;
  const levelBefore = a.level;
  a.repeating = false;

  if (final) {
    const projectDone = a.transcript.some((t) => t.courses.some((c) => c.title === 'Final Year Project' && c.grade !== 'F'));
    if (a.carryovers.length === 0 && projectDone && a.issues.length === 0) {
      d.phase = 'graduated';
      d.summaries.push({ kind: 'year', year: d.clock.year, level: levelBefore, repeated: false, probation: a.probation });
      d.summaries.push({ kind: 'graduation' });
      log(d, `You have graduated with a ${classOfDegree(currentCgpa(d))}! Congratulations!`);
      return;
    }
    a.spillover = true;
    if (!projectDone && !a.carryovers.some((c) => c.title === 'Final Year Project')) {
      const proj = a.transcript.flatMap((t) => t.courses).find((c) => c.title === 'Final Year Project');
      if (proj) a.carryovers.push({ code: proj.code, title: proj.title, units: proj.units, kind: 'project', semester: 2 });
    }
    log(d, `Spill-over: you have ${a.carryovers.length} carryover course(s) left. One more session to clear them.`);
  } else if (thisYear.length === 0) {
    // Nothing registered all session: the year is repeated.
    a.repeating = true;
    a.carryovers = a.carryovers.filter((c) => !a.transcript.every((t) => t.courses.every((x) => x.code !== c.code)));
    log(d, `You did not register for any semester this session, so you will repeat ${levelBefore}00 level.`);
  } else if (failed >= REPEAT_FAILED_UNITS) {
    a.repeating = true;
    a.carryovers = a.carryovers.filter((c) => !thisYear.some((t) => t.courses.some((x) => x.code === c.code && !x.carryover)));
    log(d, `You failed ${failed} units this session, so you will repeat ${levelBefore}00 level.`);
  } else {
    a.level += 1;
    log(d, `On to ${a.level}00 level!`);
  }
  d.summaries.push({ kind: 'year', year: d.clock.year, level: levelBefore, repeated: a.repeating, probation: a.probation });
}

/** One visit about a missing script or wrong grade. */
export function resolveIssueMut(d: GameState, r: Rng, issueId: string, bonus = 0): boolean {
  const a = d.academics;
  const issue = a.issues.find((i) => i.id === issueId);
  if (!issue) return false;
  issue.visits += 1;
  if (!r.chance(ISSUE_RESOLVE_CHANCE + bonus)) {
    log(d, issue.kind === 'missing_script' ? '"We are still searching for your script." Come back.' : '"The HOD has not signed the correction yet." Come back.');
    return false;
  }
  a.issues = a.issues.filter((i) => i.id !== issueId);
  const res = a.transcript[issue.record]?.courses.find((c) => c.code === issue.code);
  if (res && res.trueScore !== undefined) {
    setScore(res, res.trueScore);
    delete res.issue;
    delete res.trueScore;
    recomputeCgpas(d);
    // A fixed F is no longer a carryover.
    if (res.grade !== 'F') a.carryovers = a.carryovers.filter((c) => c.code !== res.code);
  }
  log(d, `Sorted! Your ${issue.code} result now shows ${res?.grade ?? 'correctly'}.`);
  return true;
}

export function collegeName(d: GameState): string {
  return getCollege(getProgramme(d.player.programmeId).collegeId).name;
}
