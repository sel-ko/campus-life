// The story: your degree told as chapters, each a short list of things you
// must do, in order. The first chapter is the fresher's first days (freshen
// up, eat, then the long clearance walk); later chapters follow each semester
// to graduation. Pure: worked out from the state every time, nothing saved.
import { mainBuka, mainLibrary, placeName } from '../content/places';
import { clearanceSteps, missingDocs, officeName, officePlaceId, signedCount } from './clearance';
import { DOC_NAMES, OFFICES, OFFICE_ORDER } from '../content/offices';
import { canRegister, feesDueNow, registrationDeadline } from './money';
import { addMoney } from './money';
import { log } from './draft';
import type { DocId, GameState } from './types';

export interface StoryStep {
  id: string;
  label: string;
  done: boolean;
  /** Where to go for it. */
  placeId?: string;
  /** Done on the phone (portal). */
  portal?: boolean;
  /** A little more explanation for the quest card. */
  hint?: string;
  /** Paid once, the first time the step is done. */
  reward?: number;
  /** A follow-up that came out of the step below it ("no passport? get one"). */
  sub?: boolean;
}

export interface Chapter {
  id: string;
  number: number;
  title: string;
  blurb: string;
  steps: StoryStep[];
}

const DOC_SHOP = 'business-9';
const PLURAL: Record<DocId, string> = { photocopy: 'photocopies of your credentials', passport: 'passport photographs', receipt: 'receipts' };

function fresherChapter(d: GameState): Chapter {
  const c = d.clearance;
  const clr = clearanceSteps(d);
  const step = (id: string) => clr.find((s) => s.id === id)!;
  const signed = signedCount(d);
  const firstUnsigned = OFFICE_ORDER.find((o) => !c.signed[o]);
  const haveDocs = (d.inventory.photocopy ?? 0) + (d.inventory.passport ?? 0) > 0 || signed > 0;
  return {
    id: 'fresher',
    number: 1,
    title: 'Welcome, fresher',
    blurb: 'You made it in. Before you are a real student, you must survive clearance.',
    steps: [
      { id: 'bath', reward: 300, label: 'Freshen up: take a bath', done: !!d.flags.bathed || signed > 0, placeId: d.room.placeId, hint: 'Walk into the bathroom in your room' },
      { id: 'eat', reward: 300, label: 'Eat something', done: d.stats.meals > 0 || signed > 0, placeId: mainBuka().id, hint: 'The buka, or cook in your room' },
      { id: 'acceptance', label: 'Pay the acceptance fee', done: step('acceptance').done, portal: true, hint: 'Phone → School app → Fees' },
      { id: 'docs', label: 'Buy photocopies, passports and a receipt', done: haveDocs, placeId: DOC_SHOP, hint: 'Every office wants paper' },
      // The clearance route: one office at a time, in order, each with what to bring.
      ...OFFICE_ORDER.flatMap((o, i): StoryStep[] => {
        const office = OFFICES[o];
        const bring = (Object.entries(office.docs) as Array<[DocId, number]>).map(([doc, n]) => (n > 1 ? `${n} ${PLURAL[doc]}` : `1 ${DOC_NAMES[doc]}`)).join(', ');
        const placeId = officePlaceId(d, o);
        const step: StoryStep = {
          id: `office_${o}`,
          reward: i === OFFICE_ORDER.length - 1 ? 1500 : 200,
          label: `${i === 0 ? 'Start clearance at the' : 'Signature:'} ${officeName(o)} (${placeName(placeId)})`,
          done: c.signed[o],
          placeId,
          hint: [bring && `Bring ${bring}`, office.fee ? `Fee ${office.fee.toLocaleString('en-NG')} naira` : '', 'Open weekday mornings and afternoons'].filter(Boolean).join(' · '),
        };
        if (c.signed[o]) return [step];
        // Follow-ups for the office you are on (or one that turned you back).
        const current = o === firstUnsigned || c.backOn[o] !== undefined || c.extraPrereq[o] !== undefined;
        if (!current) return [step];
        const subs: StoryStep[] = [];
        const missing = missingDocs(d, o);
        if (missing.length) subs.push({ id: `docs_${o}`, sub: true, label: `Get ${missing.map((m) => DOC_NAMES[m]).join(' and ')} at the Business Centre`, done: false, placeId: DOC_SHOP, hint: `The ${officeName(o)} will not sign without it` });
        for (const need of [...(office.needs ?? []), ...(c.extraPrereq[o] ? [c.extraPrereq[o]!] : [])]) {
          if (!c.signed[need]) subs.push({ id: `first_${o}_${need}`, sub: true, label: `The ${officeName(o)} wants the ${officeName(need)} signature first`, done: false, placeId: officePlaceId(d, need) });
        }
        if (office.needsAcceptance && !clr[0]!.done) subs.push({ id: `acc_${o}`, sub: true, label: 'Pay the acceptance fee before the Bursary', done: false, portal: true });
        if (office.fee && d.money < office.fee) subs.push({ id: `fee_${o}`, sub: true, label: `Find ${office.fee.toLocaleString('en-NG')} naira for the ${officeName(o)} fee`, done: false, hint: 'Hustle, wash plates, or ask a friend' });
        const back = c.backOn[o];
        if (back !== undefined && back > d.clock.dayCount) subs.push({ id: `back_${o}`, sub: true, label: `The ${officeName(o)} said come back tomorrow`, done: false, hint: 'Try another office today' });
        return [...subs, step];
      }),
      { id: 'fees', label: 'Pay school fees, dues and the hostel fee', done: step('school1').done && step('dues').done && step('hostel').done, portal: true },
      { id: 'allocation', label: 'Collect your hostel allocation', done: c.allocation, placeId: step('allocation').placeId },
      { id: 'library', reward: 500, label: 'Register at the library', done: c.library, placeId: mainLibrary().id, hint: 'Bring one passport photograph' },
    ],
  };
}

function firstLecturesChapter(d: GameState): Chapter {
  const reg = canRegister(d);
  const nextClass = upcomingClass(d);
  return {
    id: 'student',
    number: 2,
    title: 'Officially a student',
    blurb: 'Clearance is done. Now the real work: register, go to class, find your people.',
    steps: [
      { id: 'register', label: `Register your courses (by day ${registrationDeadline(d)})`, done: d.academics.registered, portal: true, hint: reg.ok || d.academics.registered ? 'Phone → School app → Courses' : reg.reason },
      { id: 'lecture', reward: 500, label: 'Attend your first lecture', done: d.stats.lecturesAttended > 0, placeId: nextClass?.placeId, hint: nextClass?.text },
      { id: 'friend', reward: 500, label: 'Make a friend on campus', done: Object.values(d.people).some((p) => p.rel >= 30), hint: 'Talk to people you meet in class, at the buka, at the field' },
      { id: 'read', label: 'Read for one course', done: d.academics.courses.some((c) => c.knowledge >= 20) || d.academics.transcript.length > 0, placeId: mainLibrary().id, hint: 'At your desk or in the library' },
    ],
  };
}

function semesterChapter(d: GameState, number: number): Chapter {
  const a = d.academics;
  const nextClass = upcomingClass(d);
  const fees = feesDueNow(d);
  const examsLeft = a.courses.filter((c) => c.exam.status === 'pending');
  const examDay = Math.min(...a.courses.map((c) => c.exam.day).filter(Boolean), 99);
  const level = a.level * 100;
  const sem = d.clock.semester === 1 ? 'First' : 'Second';
  const steps: StoryStep[] = [
    { id: 'fees', label: 'Pay what the school is owed', done: fees.length === 0, portal: true, hint: fees.map((f) => f.label).join(', ') || undefined },
    { id: 'register', label: `Register this semester's courses (by day ${registrationDeadline(d)})`, done: a.registered, portal: true },
    { id: 'classes', label: nextClass ? `Next class: ${nextClass.text}` : 'No more classes this semester', done: !nextClass, placeId: nextClass?.placeId },
    { id: 'exams', label: examsLeft.length ? `Write your exams (from day ${examDay})` : 'Exams written', done: examsLeft.length === 0 && a.courses.length > 0, placeId: examsLeft[0]?.exam.placeId },
  ];
  if (a.project && !a.project.defended) {
    steps.push({ id: 'project', label: `Finish your project (${a.project.chapters}/5 chapters)`, done: false, hint: 'Write at your desk, then see your supervisor' });
  }
  return {
    id: `sem-${d.clock.year}-${d.clock.semester}`,
    number,
    title: `${level} Level, ${sem} Semester`,
    blurb: a.project ? 'Final year. One more push and you are a graduate.' : 'Keep your CGPA up, your stomach full and your friends close.',
    steps,
  };
}

/** Today's (or the next) class you have not attended yet. */
function upcomingClass(d: GameState): { placeId: string; text: string } | null {
  const now = d.clock.day * 4 + d.clock.slot;
  const SLOTS = ['morning', 'afternoon', 'evening', 'night'];
  let best: { t: number; placeId: string; text: string } | null = null;
  for (const c of d.academics.courses) {
    for (const m of c.meetings) {
      const t = m.day * 4 + m.slot;
      if (m.status !== 'scheduled' || m.attended || t < now) continue;
      if (!best || t < best.t) best = { t, placeId: m.placeId, text: `${c.code}, ${m.day === d.clock.day ? (t === now ? 'NOW' : `this ${SLOTS[m.slot]}`) : `day ${m.day} ${SLOTS[m.slot]}`}` };
    }
  }
  return best;
}

/** The chapter you are in now. */
export function currentChapter(d: GameState): Chapter {
  if (d.clearance.active) return fresherChapter(d);
  const first = d.clock.year === 1 && d.clock.semester === 1;
  if (first) {
    const ch = firstLecturesChapter(d);
    if (ch.steps.some((s) => !s.done)) return ch;
  }
  const semestersIn = (d.clock.year - 1) * 2 + d.clock.semester;
  return semesterChapter(d, semestersIn + 1);
}

/** The next unfinished step of the current chapter. */
export function nextStep(d: GameState): StoryStep | null {
  return currentChapter(d).steps.find((s) => !s.done) ?? null;
}

/**
 * Pays each finished story step's reward once (a little encouragement from
 * home: "well done, here is something"). Called after anything that could
 * finish a step.
 */
export function storyRewardsMut(d: GameState): void {
  if (d.phase !== 'playing') return;
  const ch = currentChapter(d);
  for (const s of ch.steps) {
    if (!s.done || !s.reward) continue;
    const key = `story_${ch.id}_${s.id}`;
    if (d.flags[key]) continue;
    d.flags[key] = d.clock.dayCount;
    addMoney(d, s.reward);
    log(d, `Quest done: ${s.label.replace(/ \(.*\)$/, '')}. Your people sent ₦${s.reward.toLocaleString('en-NG')} to say well done.`);
  }
}
