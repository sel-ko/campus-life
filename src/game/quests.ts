// The quest log: the main story told as a chain of connected quests, plus
// side quests picked up from people, event cards and your situation.
//
// Main story, every semester: arrival → fees → clearance → settle in →
// register → first classes → homework → first test → no fees, no exam →
// exam week → results, then the next semester (results day → a new semester
// → back to class → hand it in → test season → [project] → no fees, no exam
// → exam week → results). Each quest has objectives with progress (3/8
// signatures), finishing one opens the next, and each pays reputation (XP),
// sometimes money from home and some peace of mind.
//
// Side quests hook back in: each one says which main quest it helps, and its
// reward does help (knowledge for the next test, attendance cover, money for
// fees). Main objectives point at the side quests that would help.
//
// The chain is worked out from the state every time; `d.quests.main` only
// remembers which quests are finished (so rewards are paid once and a
// finished quest stays finished).
import { OFFICES, OFFICE_ORDER, DOC_NAMES } from '../content/offices';
import { getPerson } from '../content/people';
import { PLACES, fieldPlace, getPlace, mainBuka, mainLibrary, medicalCentre, placeName } from '../content/places';
import { MAIN_QUESTS, SIDE_QUESTS, getSideQuest } from '../content/quests';
import type { SideQuestDef } from './contentTypes';
import { assignmentGiven, assignmentLate, attendance, hasAssignment, hasExam } from './academics';
import { EXAM_FORM_DAYS, dayLabel, meetingWhen } from './calendar';
import { clearanceSteps, missingDocs, officeName, officePlaceId, signedCount } from './clearance';
import { LATE_REGISTRATION_CLOSE, SEMESTER_DAYS } from './config';
import { clamp, log } from './draft';
import { applyEffects } from './effects';
import { eventMatches } from './events';
import { naira } from './format';
import { addMoney, canRegister, clearanceFormDone, feesDueNow, registrationDeadline } from './money';
import { classState, examWindow, nextClass } from './periods';
import { addXpMut, canStartSide, levelInfo, questsOf, semesterStartDay, startSideQuestMut, type RepLevel } from './questState';
import { formatTime } from './time';
import type { CourseState, DocId, GameState, Meeting, PlaceType, SideQuestState } from './types';

export interface QuestObjective {
  id: string;
  label: string;
  done: boolean;
  /** e.g. 3 of 8 signatures. */
  progress?: { have: number; need: number };
  /** Where to go for it. */
  placeId?: string;
  /** Done on the phone (school app). */
  portal?: boolean;
  hint?: string;
  /** Does not hold the quest up. */
  optional?: boolean;
  /** A follow-up that came out of the objective after it ("no passport? get one"). */
  sub?: boolean;
  /** For a follow-up: the place where you were told. */
  at?: string;
  /** Money paid once, the first time it is done. */
  reward?: number;
  /** "Thu 8 Oct, 5:00 pm". */
  due?: string;
  /** A side quest that would help with this (its id). */
  sideQuest?: string;
}

export interface QuestRewardInfo {
  xp: number;
  money?: number;
  /** Stress taken off. */
  relief?: number;
  /** The reward in words. */
  text: string;
}

export interface Quest {
  id: string;
  kind: 'main' | 'side';
  title: string;
  blurb: string;
  /** Person who gave a side quest. */
  giver?: string;
  objectives: QuestObjective[];
  reward: QuestRewardInfo;
  status: 'locked' | 'active' | 'done' | 'failed';
  /** For a side quest: the main quest it helps, in words. */
  helps?: string;
  /** dayCount a side quest must be done by. */
  dueDay?: number;
}

// ---------- helpers ----------

const semKey = (d: GameState) => `y${d.clock.year}s${d.clock.semester}`;
const isFresherSemester = (d: GameState) => d.clock.year === 1 && d.clock.semester === 1;
const DOC_SHOP = 'business-9';
const PLURAL: Record<DocId, string> = { photocopy: 'photocopies of your credentials', passport: 'passport photographs', receipt: 'receipts' };

/** The eatery nearest your hostel (the hostel cafeteria), else the main buka. */
function nearbyEatery(d: GameState): string {
  const home = getPlace(d.room.placeId);
  const near = PLACES.filter((p) => p.type === 'restaurant' && p.menu && p.sectionId === home?.sectionId);
  return (near.find((p) => /cafeteria/i.test(p.name)) ?? near[0] ?? mainBuka()).id;
}

/** A place of a kind, near you if possible. */
function placeOfType(d: GameState, type: PlaceType): string | undefined {
  switch (type) {
    case 'library':
      return mainLibrary().id;
    case 'field':
      return fieldPlace().id;
    case 'clinic':
      return medicalCentre().id;
    case 'restaurant':
      return mainBuka().id;
    case 'lecture_hall':
      return nextClass(d)?.meeting.placeId;
    default:
      return (PLACES.find((p) => p.type === type && p.sectionId === d.location.sectionId) ?? PLACES.find((p) => p.type === type))?.id;
  }
}

function classWhen(d: GameState, c: CourseState, m: Meeting): string {
  return m.day === d.clock.day ? `today ${meetingWhen(d, c, m).split(', ')[1]}` : meetingWhen(d, c, m);
}

/** The next class (or the one on now) as an objective. */
function nextClassObjective(d: GameState, id = 'next_class'): QuestObjective | null {
  const n = nextClass(d);
  if (!n) return null;
  const { course: c, meeting: m } = n;
  return {
    id,
    label: `${n.on ? 'NOW: ' : 'Next class: '}${c.code}${m.test ? ' TEST' : ''}, ${classWhen(d, c, m)} at ${placeName(m.placeId)}${m.moved ? ' (moved)' : ''}`,
    done: false,
    placeId: m.placeId,
    hint: m.assign && !assignmentGiven(c) ? 'The lecturer gives an assignment at this class' : c.title,
  };
}

/** Upcoming (not yet over) test meetings, earliest first. */
function testsAhead(d: GameState): Array<{ c: CourseState; m: Meeting }> {
  return d.academics.courses
    .flatMap((c) => c.meetings.filter((m) => m.test && m.status === 'scheduled' && !m.attended && classState(d, c, m) !== 'over').map((m) => ({ c, m })))
    .sort((a, b) => a.m.day - b.m.day || a.m.slot - b.m.slot);
}

function attendedThisSemester(d: GameState): number {
  return d.academics.courses.reduce((s, c) => s + c.meetings.filter((m) => m.attended).length, 0);
}

function assignable(d: GameState): CourseState[] {
  return d.academics.courses.filter((c) => hasAssignment(c));
}

/** Assignments given and still open (not submitted, not late). */
function openAssignments(d: GameState): CourseState[] {
  return assignable(d)
    .filter((c) => assignmentGiven(c) && c.assignment === null && !assignmentLate(d, c))
    .sort((a, b) => a.assignmentDue - b.assignmentDue);
}

export function assignmentDueLabel(d: GameState, c: CourseState): string {
  return `${dayLabel(d, c.assignmentDue)}, ${formatTime(c.assignmentDueMin ?? 17 * 60)}`;
}

function assignmentObjective(d: GameState, c: CourseState): QuestObjective {
  return { id: `assignment_${c.code}`, label: `Do the ${c.code} assignment (due ${assignmentDueLabel(d, c)})`, done: false, placeId: mainLibrary().id, due: assignmentDueLabel(d, c), hint: 'At your desk in your room, or in the library' };
}

function sideHint(d: GameState, id: string): string | undefined {
  const def = getSideQuest(id);
  if (!def) return undefined;
  const running = questsOf(d).side.some((s) => s.id === id && s.status === 'active');
  if (running) return `Side quest on: ${def.title}`;
  if (!canStartSide(d, id)) return undefined;
  const giver = getPerson(def.giver)?.name;
  return `Tip: ${def.title}${giver ? ` (${giver})` : ''} would help`;
}

// ---------- the main story ----------

interface Draft {
  base: string;
  /** Overrides the title from MAIN_QUESTS. */
  title?: string;
  blurb?: string;
  objectives: QuestObjective[];
  /** Also done when this holds, even if some objectives are not (e.g. no classes left). */
  doneIf?: boolean;
  xp?: number;
}

function arrival(d: GameState): Draft {
  const signed = signedCount(d);
  const orientationOn = isFresherSemester(d) && d.clock.day === 1 && !d.academics.orientation;
  return {
    base: 'arrival',
    objectives: [
      { id: 'bath', reward: 300, label: 'Freshen up: take a bath', done: !!d.flags.bathed || signed > 0, placeId: d.room.placeId, hint: 'Walk into the bathroom in your room' },
      { id: 'eat', reward: 300, label: 'Eat something', done: d.stats.meals > 0 || signed > 0, placeId: nearbyEatery(d), hint: 'The hostel cafeteria, or cook in your room' },
      ...(orientationOn || d.academics.orientation
        ? [{ id: 'orientation', optional: true, label: "Freshers' orientation (day 1, morning or afternoon)", done: d.academics.orientation, placeId: PLACES.find((p) => p.gst)?.id, hint: 'Free biscuits and your first friends' } satisfies QuestObjective]
        : []),
    ],
  };
}

function feesQuest(d: GameState): Draft {
  const clr = clearanceSteps(d);
  const step = (id: string) => clr.find((s) => s.id === id)!;
  const owed = d.finance.fees.filter((f) => !f.paid && f.dueSemester === 1 && f.id !== 'late_reg').reduce((s, f) => s + f.amount, 0);
  const short = owed > d.money;
  const objectives: QuestObjective[] = [
    { id: 'acceptance', label: 'Pay the acceptance fee', done: step('acceptance').done, portal: true, hint: 'Phone → School app → Fees' },
    { id: 'school1', label: 'Pay your school fees (half or full)', done: step('school1').done, portal: true, hint: 'Phone → School app → Fees. Daddy sent the money' },
    { id: 'dues', label: 'Pay your departmental dues', done: step('dues').done, portal: true },
    { id: 'hostel', label: 'Pay your hostel fee', done: step('hostel').done, portal: true },
  ];
  if (short && objectives.some((o) => !o.done)) {
    objectives.unshift({ id: 'find_money', sub: true, label: `Find ${naira(owed - d.money)} more for your fees`, done: false, hint: sideHint(d, 'kelz_hustle') ?? 'Ask Mummy or Daddy (Phone → Wallet), or wash plates at a buka', sideQuest: 'kelz_hustle' });
  }
  return { base: 'fees', objectives };
}

function clearanceQuest(d: GameState): Draft {
  const c = d.clearance;
  const signed = signedCount(d);
  const next = OFFICE_ORDER.find((o) => !c.signed[o]);
  const haveDocs = (d.inventory.photocopy ?? 0) + (d.inventory.passport ?? 0) > 0 || signed > 0;
  const objectives: QuestObjective[] = [
    { id: 'docs', label: 'Get photocopies, passport photos and the printed receipt', done: haveDocs, placeId: DOC_SHOP, hint: 'Business Centre. Every office keeps some paper' },
  ];
  if (next) {
    const office = OFFICES[next];
    const placeId = officePlaceId(d, next);
    const bring = (Object.entries(office.docs) as Array<[DocId, number]>).map(([doc, n]) => (n > 1 ? `${n} ${PLURAL[doc]}` : `1 ${DOC_NAMES[doc]}`)).join(', ');
    const missing = missingDocs(d, next);
    if (missing.length && haveDocs) objectives.push({ id: `docs_${next}`, sub: true, at: placeId, label: `Get ${missing.map((m) => DOC_NAMES[m]).join(' and ')} at the Business Centre`, done: false, placeId: DOC_SHOP, hint: `The ${officeName(next)} will not sign without it` });
    for (const need of [...(office.needs ?? []), ...(c.extraPrereq[next] ? [c.extraPrereq[next]!] : [])]) {
      if (!c.signed[need]) objectives.push({ id: `first_${next}_${need}`, sub: true, at: placeId, label: `The ${officeName(next)} wants the ${officeName(need)} signature first`, done: false, placeId: officePlaceId(d, need) });
    }
    if (office.fee && d.money < office.fee) objectives.push({ id: `fee_${next}`, sub: true, at: placeId, label: `Find ${naira(office.fee)} for the ${officeName(next)} fee`, done: false, hint: sideHint(d, 'mama_plates') ?? 'Call home from your phone (Wallet), or wash plates', sideQuest: 'mama_plates' });
    const back = c.backOn[next];
    if (back !== undefined && back > d.clock.dayCount) objectives.push({ id: `back_${next}`, sub: true, at: placeId, label: `The ${officeName(next)} said come back tomorrow`, done: false, hint: 'Try another office today' });
    objectives.push({
      id: `office_${next}`,
      label: `Signature ${signed + 1}/8: ${officeName(next)} (${placeName(placeId)})${bring ? ` · 📄 ${bring}` : ''}${office.fee ? ` · ${naira(office.fee)}` : ''}`,
      done: false,
      progress: { have: signed, need: OFFICE_ORDER.length },
      placeId,
      hint: [bring && `Bring ${bring}`, office.fee ? `Fee ${naira(office.fee)}` : '', 'Open weekday mornings and afternoons'].filter(Boolean).join(' · '),
    });
  } else {
    objectives.push({ id: 'signatures', label: `Clearance form signed (8/8)`, done: true, progress: { have: 8, need: 8 } });
  }
  objectives.push({ id: 'allocation', label: 'Collect your hostel allocation (Student Affairs)', done: c.allocation, placeId: officePlaceId(d, 'student_affairs'), hint: 'Your real room and your roommates' });
  return { base: 'clearance', objectives, doneIf: clearanceFormDone(d) && c.allocation };
}

function settleIn(d: GameState): Draft {
  const talked = (questsOf(d).counts.talk ?? 0) > 0 || Object.entries(d.people).some(([id, p]) => p.rel >= 20 && getPerson(id)?.role !== 'family');
  return {
    base: 'settle_in',
    objectives: [
      { id: 'library', reward: 500, label: 'Register at the library', done: d.clearance.library, placeId: mainLibrary().id, hint: 'Bring one passport photograph. You need the card for assignments' },
      { id: 'meet', label: 'Talk to someone: a roommate, Tobi the course rep, Damilola...', done: talked, hint: sideHint(d, 'dami_friend') ?? 'People are in class, at the buka at lunch, at the field in the evening', sideQuest: 'dami_friend' },
    ],
  };
}

function registerQuest(d: GameState, base = 'register'): Draft {
  const reg = canRegister(d);
  const closed = !d.academics.registered && d.clock.day > LATE_REGISTRATION_CLOSE;
  return {
    base,
    objectives: [
      {
        id: 'register',
        label: closed ? 'Registration closed: this semester will not count' : `Register your courses on the portal (by ${dayLabel(d, registrationDeadline(d))})`,
        done: d.academics.registered || closed,
        portal: true,
        due: dayLabel(d, registrationDeadline(d)),
        hint: reg.ok || d.academics.registered ? 'Phone → School app → Courses' : reg.reason,
      },
    ],
  };
}

function firstClasses(d: GameState, base: string, need: number): Draft {
  const have = Math.min(need, attendedThisSemester(d));
  const anyGiven = assignable(d).some(assignmentGiven);
  const next = nextClassObjective(d);
  const objectives: QuestObjective[] = [
    { id: 'attend', label: `Attend ${need} classes`, done: have >= need, progress: { have, need }, placeId: next?.placeId, hint: 'Attending is how knowledge goes up. Skipping teaches nothing' },
  ];
  if (next && have < need) objectives.push({ ...next, sub: true });
  if (assignable(d).length) objectives.push({ id: 'assignment_given', label: 'Get an assignment from a lecturer (given in class)', done: anyGiven, optional: true, hint: 'Miss the class and you only hear about it from the course rep' });
  const noMore = !nextClass(d);
  return { base, objectives, doneIf: noMore };
}

function homework(d: GameState): Draft {
  const open = openAssignments(d);
  const submitted = assignable(d).filter((c) => c.assignment !== null).length;
  const pendingGiven = assignable(d).some((c) => !assignmentGiven(c));
  const objectives: QuestObjective[] = open.length ? [assignmentObjective(d, open[0]!)] : [];
  if (!open.length && submitted === 0) objectives.push({ id: 'wait_assignment', label: 'Go to class: your lecturers will give assignments', done: false, placeId: nextClass(d)?.meeting.placeId });
  objectives.push({ id: 'submitted', label: 'Submit your first assignment', done: submitted > 0, progress: { have: Math.min(1, submitted), need: 1 } });
  return { base: 'first_assignment', objectives, doneIf: submitted > 0 || (!open.length && !pendingGiven) };
}

function allAssignments(d: GameState): Draft {
  const list = assignable(d);
  const submitted = list.filter((c) => c.assignment !== null).length;
  const open = openAssignments(d);
  const closed = list.filter((c) => c.assignment !== null || (assignmentGiven(c) && assignmentLate(d, c))).length;
  const objectives: QuestObjective[] = [
    { id: 'submitted', label: `Submit your assignments`, done: closed >= list.length, progress: { have: submitted, need: list.length } },
    ...open.slice(0, 2).map((c) => ({ ...assignmentObjective(d, c), sub: true })),
  ];
  if (!open.length && closed < list.length) objectives.push({ id: 'wait_assignment', sub: true, label: 'More assignments come in class: keep attending', done: false, placeId: nextClass(d)?.meeting.placeId });
  return { base: 'assignments', objectives, doneIf: closed >= list.length };
}

function testsQuest(d: GameState, base: string): Draft {
  const all = d.academics.courses.flatMap((c) => c.meetings.filter((m) => m.test && m.status === 'scheduled').map((m) => ({ c, m })));
  const written = all.filter((x) => x.m.attended).length;
  const ahead = testsAhead(d);
  const objectives: QuestObjective[] = [];
  const t = ahead[0];
  if (t) {
    const target = 50;
    const k = Math.round(t.c.knowledge);
    objectives.push({ id: 'prepare', optional: true, label: `Read for ${t.c.code}: knowledge ${Math.min(k, target)}/${target}`, done: k >= target, progress: { have: Math.min(k, target), need: target }, placeId: mainLibrary().id, hint: sideHint(d, 'ify_study') ?? 'Read at your desk or in the library', sideQuest: 'ify_study' });
    objectives.push({ id: 'write', label: `Write the ${t.c.code} test: ${classWhen(d, t.c, t.m)} at ${placeName(t.m.placeId)}`, done: false, placeId: t.m.placeId, due: meetingWhen(d, t.c, t.m), hint: 'Missing a test is a zero' });
  }
  if (base === 'tests') objectives.unshift({ id: 'written', label: 'Write your tests', done: !ahead.length, progress: { have: written, need: all.length } });
  else objectives.push({ id: 'written', label: 'Write your first test', done: written > 0, progress: { have: Math.min(1, written), need: 1 } });
  return { base, objectives, doneIf: base === 'tests' ? !ahead.length : written > 0 || !ahead.length };
}

function examReady(d: GameState): Draft {
  const fees = feesDueNow(d).filter((f) => f.id !== 'late_reg' || !d.academics.registered);
  const formKey = `examform_${d.clock.year}_${d.clock.semester}`;
  const formOpen = EXAM_FORM_DAYS.includes(d.clock.day);
  const withClasses = d.academics.courses.filter((c) => c.meetings.length && !['project', 'it', 'chambers'].includes(c.kind));
  const ok = withClasses.filter((c) => c.covered || attendance(d, c, true).pct >= 0.75).length;
  const owed = fees.reduce((s, f) => s + f.amount, 0);
  const objectives: QuestObjective[] = [
    { id: 'fees', label: fees.length ? `Pay your fees: ${fees.map((f) => f.label).join(', ')} (${naira(owed)})` : 'Fees paid', done: !fees.length, portal: true, hint: owed > d.money ? (sideHint(d, 'kelz_hustle') ?? 'Ask home (Phone → Wallet) or hustle') : 'Phone → School app → Fees', sideQuest: owed > d.money ? 'kelz_hustle' : undefined },
    {
      id: 'exam_form',
      label: `Sign your exam form at the College Office (${dayLabel(d, EXAM_FORM_DAYS[0]!)} to ${dayLabel(d, EXAM_FORM_DAYS[EXAM_FORM_DAYS.length - 1]!)})`,
      done: !!d.flags[formKey] || !d.academics.registered,
      placeId: officePlaceId(d, 'college_office'),
      hint: formOpen ? 'Signing is open now: weekday office hours' : d.clock.day < EXAM_FORM_DAYS[0]! ? `Opens ${dayLabel(d, EXAM_FORM_DAYS[0]!)}` : 'Signing closed: you will pay a late fee at the hall',
    },
  ];
  if (withClasses.length) objectives.push({ id: 'attendance', optional: true, label: 'Attendance at 75% in every course', done: ok >= withClasses.length, progress: { have: ok, need: withClasses.length }, hint: sideHint(d, 'tobi_rep') ?? 'Below 75% you are barred from the exam', sideQuest: 'tobi_rep' });
  const formClosed = d.clock.day > EXAM_FORM_DAYS[EXAM_FORM_DAYS.length - 1]!;
  return { base: 'exam_ready', objectives, doneIf: !fees.length && (!!d.flags[formKey] || formClosed || !d.academics.registered) };
}

function examsQuest(d: GameState): Draft {
  const papers = d.academics.courses.filter((c) => hasExam(c.kind));
  const written = papers.filter((c) => c.exam.status === 'written').length;
  const pending = papers.filter((c) => c.exam.status === 'pending').sort((a, b) => a.exam.day - b.exam.day || a.exam.slot - b.exam.slot);
  const objectives: QuestObjective[] = [{ id: 'written', label: 'Write your exams', done: !pending.length, progress: { have: written, need: papers.length } }];
  const next = pending[0];
  if (next) {
    const when = `${dayLabel(d, next.exam.day)}, ${formatTime(examWindow(next.exam.slot).start)}`;
    objectives.push({ id: 'next_paper', sub: true, label: `Next paper: ${next.code}${next.kind === 'project' ? ' (project defence)' : ''}, ${when} at ${placeName(next.exam.placeId)}${next.exam.batchMoved ? ' (moved!)' : ''}`, done: false, placeId: next.exam.placeId, due: when, hint: sideHint(d, 'fit_life') ?? 'Sleep well and eat before the paper' });
  }
  return { base: 'exams', objectives, doneIf: !pending.length && d.academics.courses.length > 0 };
}

function projectQuest(d: GameState): Draft | null {
  const p = d.academics.project;
  if (!p) return null;
  const objectives: QuestObjective[] = [
    { id: 'chapters', label: 'Get five chapters approved', done: p.chapters >= 5, progress: { have: p.chapters, need: 5 } },
    p.awaiting
      ? { id: 'supervisor', sub: true, label: `Take chapter ${p.chapters + 1} to ${getPerson(p.supervisorId)?.name ?? 'your supervisor'} (College Office)`, done: false, placeId: officePlaceId(d, 'college_office') }
      : { id: 'write', sub: true, label: `Write chapter ${p.chapters + 1} at your desk (${p.draft}% drafted)`, done: p.chapters >= 5, placeId: d.room.placeId },
  ];
  return { base: 'project', objectives, doneIf: p.chapters >= 5 || p.defended };
}

function resultsWaiting(d: GameState): Draft {
  return {
    base: 'results',
    blurb: `Results come out when the semester ends (${dayLabel(d, SEMESTER_DAYS)}). Rest, eat well, and get ready for the next one.`,
    objectives: [{ id: 'wait', label: `Results are published at the end of ${dayLabel(d, SEMESTER_DAYS)}`, done: false }],
  };
}

/** The first quest of a semester after the first: last semester's results. */
function resultsDay(d: GameState): Draft | null {
  const rec = d.academics.transcript[d.academics.transcript.length - 1];
  if (!rec) return null;
  const pending = d.summaries.some((s) => s.kind === 'semester');
  const carry = d.academics.carryovers;
  const objectives: QuestObjective[] = [
    { id: 'see', label: `See your results: GPA ${rec.gpa.toFixed(2)}, CGPA ${rec.cgpa.toFixed(2)}`, done: !pending, hint: 'Phone → School app → Results' },
  ];
  if (carry.length) objectives.push({ id: 'carryovers', optional: true, label: `Carryovers to clear: ${carry.map((c) => c.code).join(', ')}`, done: false, hint: 'They come back in the same semester next session' });
  return { base: 'results_prev', title: `Results day: ${rec.level}00 Level, ${rec.semester === 1 ? 'First' : 'Second'} Semester`, objectives, xp: 30 + Math.round(rec.gpa * 15) };
}

function newSemester(d: GameState): Draft {
  const level = d.academics.level * 100;
  const sem = d.clock.semester === 1 ? 'First' : 'Second';
  const reg = registerQuest(d, 'new_semester');
  const fees = feesDueNow(d).filter((f) => f.id !== 'late_reg');
  const first = attendedThisSemester(d) > 0 || !nextClass(d);
  const next = nextClassObjective(d, 'first_class');
  return {
    base: 'new_semester',
    title: `${level} Level, ${sem} Semester`,
    blurb: d.academics.project ? 'Final year. One more push and you are a graduate.' : d.clock.semester === 1 ? 'A new session: new room, new courses, new fees.' : 'Second semester. Same wahala, new courses.',
    objectives: [
      ...reg.objectives,
      { id: 'fees', optional: true, label: fees.length ? `Pay your fees (${fees.map((f) => f.label).join(', ')})` : 'Fees paid', done: !fees.length, portal: true, hint: 'Due before exams: no fees, no exam' },
      next ? { ...next, label: `First class: ${next.label.replace(/^(NOW: |Next class: )/, '')}`, done: first } : { id: 'first_class', label: 'First class', done: true },
    ],
    doneIf: reg.objectives[0]!.done && first,
  };
}

/** The current semester's main quests, in order, without status. */
function chainDrafts(d: GameState): Draft[] {
  const out: Draft[] = [];
  const fresher = isFresherSemester(d);
  if (!fresher) {
    const r = resultsDay(d);
    if (r) out.push(r);
  }
  if (fresher || d.clearance.active) out.push(arrival(d), feesQuest(d), clearanceQuest(d), settleIn(d));
  if (fresher) {
    out.push(registerQuest(d), firstClasses(d, 'first_classes', 3), homework(d), testsQuest(d, 'first_test'));
  } else {
    out.push(newSemester(d), firstClasses(d, 'classes', 4), allAssignments(d), testsQuest(d, 'tests'));
    const p = projectQuest(d);
    if (p) out.push(p);
  }
  out.push(examReady(d), examsQuest(d), resultsWaiting(d));
  // A semester with nothing to study (spill-over with no courses): skip the class quests.
  if (!d.academics.courses.length && d.academics.registered) return out.filter((x) => !['first_classes', 'classes', 'first_assignment', 'assignments', 'first_test', 'tests', 'exam_ready', 'exams'].includes(x.base));
  return out;
}

function finishDraft(d: GameState, x: Draft, stamped: boolean): Quest {
  const text = MAIN_QUESTS[x.base === 'results_prev' ? 'results' : x.base] ?? { title: x.base, blurb: '', xp: 20 };
  const xp = x.xp ?? text.xp;
  const required = x.objectives.filter((o) => !o.optional && !o.sub);
  const done = stamped || x.doneIf === true || (required.length > 0 && required.every((o) => o.done));
  const parts = [`+${xp} rep`, text.money ? naira(text.money) : '', text.relief ? 'peace of mind' : ''].filter(Boolean);
  return {
    id: `${semKey(d)}:${x.base}`,
    kind: 'main',
    title: x.title ?? text.title,
    blurb: x.blurb ?? text.blurb,
    objectives: x.objectives,
    reward: { xp, money: text.money, relief: text.relief, text: parts.join(', ') },
    status: done ? 'done' : 'locked',
  };
}

/** The main story for this semester: quests in order, finished, active or locked. */
export function mainQuests(d: GameState): Quest[] {
  const stamps = questsOf(d).main;
  const list = chainDrafts(d).map((x) => finishDraft(d, x, !!stamps[`${semKey(d)}:${x.base}`]));
  const active = list.find((q) => q.status !== 'done');
  if (active) active.status = 'active';
  return list;
}

/** The main quest you are on now (null only if everything is done). */
export function activeMainQuest(d: GameState): Quest | null {
  return mainQuests(d).find((q) => q.status === 'active') ?? null;
}

// ---------- side quests ----------

function checkHave(d: GameState, s: SideQuestState, o: SideQuestDef['objectives'][number]): { have: number; need: number } {
  const c = o.check;
  switch (c.kind) {
    case 'count':
      return { have: Math.max(0, (questsOf(d).counts[c.key] ?? 0) - (s.base[c.key] ?? 0)), need: c.need };
    case 'money':
      return { have: Math.min(d.money, c.atLeast), need: c.atLeast };
    case 'rel':
      return { have: Math.min(d.people[c.person]?.rel ?? 0, c.atLeast), need: c.atLeast };
    case 'healthy':
      return { have: d.ill ? 0 : 1, need: 1 };
  }
}

function sideQuest(d: GameState, s: SideQuestState): Quest | null {
  const def = getSideQuest(s.id);
  if (!def) return null;
  const objectives: QuestObjective[] = def.objectives.map((o) => {
    const p = checkHave(d, s, o);
    const done = s.status === 'done' || p.have >= p.need;
    return { id: o.id, label: o.label, done, progress: p.need > 1 ? { have: Math.min(p.have, p.need), need: p.need } : undefined, placeId: o.placeType ? placeOfType(d, o.placeType) : undefined, hint: o.hint };
  });
  const left = s.due !== undefined ? s.due - d.clock.dayCount : undefined;
  return {
    id: `side:${s.id}:${s.start}`,
    kind: 'side',
    title: def.title,
    blurb: def.blurb,
    giver: def.giver,
    objectives,
    reward: { xp: def.reward.xp, money: def.reward.effects?.money, text: `+${def.reward.xp} rep, ${def.rewardText}` },
    status: s.status,
    helps: def.helpsText,
    dueDay: s.due,
    ...(left !== undefined && s.status === 'active' ? { blurb: `${def.blurb} ${left <= 0 ? 'Last day!' : `${left} day${left === 1 ? '' : 's'} left.`}` } : {}),
  };
}

export function sideQuests(d: GameState, status: SideQuestState['status'] = 'active'): Quest[] {
  return questsOf(d)
    .side.filter((s) => s.status === status)
    .map((s) => sideQuest(d, s))
    .filter((q): q is Quest => !!q);
}

/** Side quests that a person would give you if you talked to them now. */
export function questOfferFrom(d: GameState, personId: string): SideQuestDef | undefined {
  return SIDE_QUESTS.find((q) => q.talk?.person === personId && (d.people[personId]?.rel ?? 0) >= q.talk.relAtLeast && canStartSide(d, q.id));
}

/** After talking to someone: they may give you their side quest. */
export function offerTalkQuestMut(d: GameState, personId: string): void {
  const def = questOfferFrom(d, personId);
  if (def) startSideQuestMut(d, def.id);
}

// ---------- rewards and progress ----------

function boostCourse(d: GameState, c: CourseState | undefined, amount: number): void {
  if (!c) return;
  c.knowledge = clamp(c.knowledge + amount);
  log(d, `${c.code} knowledge +${amount}.`);
}

function payMain(d: GameState, q: Quest, next: Quest | undefined): void {
  if (q.reward.money) addMoney(d, q.reward.money);
  if (q.reward.relief) d.needs.stress = clamp(d.needs.stress - q.reward.relief);
  log(d, `🏆 Quest complete: ${q.title}! ${q.reward.text}.${next ? ` Next: ${next.title}.` : ''}`);
  addXpMut(d, q.reward.xp);
}

function paySide(d: GameState, def: SideQuestDef): void {
  if (def.reward.effects) applyEffects(d, def.reward.effects);
  if (def.reward.boostTest) boostCourse(d, testsAhead(d)[0]?.c ?? [...d.academics.courses].sort((a, b) => a.knowledge - b.knowledge)[0], def.reward.boostTest);
  if (def.reward.boostWeakest) boostCourse(d, [...d.academics.courses].filter((c) => !['it', 'chambers', 'project'].includes(c.kind)).sort((a, b) => a.knowledge - b.knowledge)[0], def.reward.boostWeakest);
  log(d, `✅ Side quest done: ${def.title}! ${def.rewardText}.`);
  addXpMut(d, def.reward.xp);
}

/**
 * After anything that could move a quest on: stamps finished main quests and
 * pays their rewards once, pays objective rewards, finishes or fails side
 * quests, and offers side quests that your situation calls for.
 */
export function questsMut(d: GameState, silent = false): void {
  if (d.phase !== 'playing') return;
  const q = questsOf(d);
  const chain = mainQuests(d);
  for (const [i, quest] of chain.entries()) {
    for (const o of quest.objectives) {
      if (!o.done || !o.reward) continue;
      const key = `${quest.id}:${o.id}`;
      // Old saves paid these as story_<chapter>_<step>.
      if (q.paid[key] || d.flags[`story_fresher_${o.id}`] || d.flags[`story_student_${o.id}`]) continue;
      q.paid[key] = d.clock.dayCount;
      if (silent) continue;
      addMoney(d, o.reward);
      log(d, `Done: ${o.label.replace(/ \(.*\)$/, '')}. Your people sent ${naira(o.reward)} to say well done.`);
    }
    if (quest.status !== 'done' || q.main[quest.id]) continue;
    q.main[quest.id] = d.clock.dayCount;
    if (!silent) payMain(d, quest, chain.slice(i + 1).find((x) => x.status !== 'done'));
  }
  for (const s of q.side) {
    if (s.status !== 'active') continue;
    const def = getSideQuest(s.id);
    if (!def) {
      s.status = 'failed';
      continue;
    }
    if (def.objectives.every((o) => {
      const p = checkHave(d, s, o);
      return p.have >= p.need;
    })) {
      s.status = 'done';
      s.end = d.clock.dayCount;
      if (!silent) paySide(d, def);
    } else if (s.due !== undefined && d.clock.dayCount > s.due) {
      s.status = 'failed';
      s.end = d.clock.dayCount;
      if (!silent) log(d, `Side quest missed: ${def.title}. Time ran out.`);
    }
  }
  if (silent) return;
  for (const def of SIDE_QUESTS) {
    if (def.auto && canStartSide(d, def.id) && eventMatches(d, def.auto, null)) startSideQuestMut(d, def.id);
  }
}

// ---------- for the screens ----------

export interface TrackedObjective {
  questId: string;
  questTitle: string;
  kind: 'main' | 'side';
  label: string;
  progress?: { have: number; need: number };
  placeId?: string;
  portal?: boolean;
  hint?: string;
  due?: string;
  /** A follow-up of the objective after it. */
  sub?: boolean;
}

/**
 * What to do now: the active main quest's next objective (and, if that is a
 * follow-up, the objective it leads to), then the next step of every side
 * quest. The first item is always the main story.
 */
export function currentObjectives(d: GameState): TrackedObjective[] {
  const out: TrackedObjective[] = [];
  const main = activeMainQuest(d);
  if (main) {
    const open = main.objectives.filter((o) => !o.done);
    const first = open.find((o) => !o.optional) ?? open[0];
    const pick = first ? [first, ...(first.sub ? open.slice(open.indexOf(first) + 1).filter((o) => !o.sub && !o.optional).slice(0, 1) : [])] : [];
    for (const o of pick) out.push({ questId: main.id, questTitle: main.title, kind: 'main', label: o.label, progress: o.progress, placeId: o.placeId, portal: o.portal, hint: o.hint, due: o.due, sub: o.sub });
  }
  for (const s of sideQuests(d)) {
    const o = s.objectives.find((x) => !x.done);
    if (o) out.push({ questId: s.id, questTitle: s.title, kind: 'side', label: o.label, progress: o.progress, placeId: o.placeId, hint: o.hint });
  }
  return out;
}

export interface QuestLog {
  rep: RepLevel;
  /** Main quests finished in the whole game. */
  finished: number;
  /** This semester's main story, in order. */
  main: Quest[];
  current: Quest | null;
  side: Quest[];
  /** Finished side quests (latest first). */
  sideDone: Quest[];
}

export function questLog(d: GameState): QuestLog {
  const main = mainQuests(d);
  const q = questsOf(d);
  return {
    rep: levelInfo(q.xp),
    finished: Object.keys(q.main).length,
    main,
    current: main.find((x) => x.status === 'active') ?? null,
    side: sideQuests(d),
    sideDone: sideQuests(d, 'done').reverse(),
  };
}

export { semesterStartDay };
