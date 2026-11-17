// The journal: every open task, most urgent first, so the player always
// knows what to do next. Pure: reads the state, changes nothing.
import { getPerson } from '../content/people';
import { fieldPlace, mainBuka, medicalCentre, placeName } from '../content/places';
import { attendance, canDoAssignment } from './academics';
import { ELECTION_DAY, nextMilestone, upcomingElection } from './goals';
import { clearanceSteps, missingDocs, officeName, officePlaceId } from './clearance';
import { naira } from './format';
import { canRegister, feesDueNow, registrationDeadline } from './money';
import { EXAM_FORM_DAYS, dayLabel, examTime, meetingTime } from './calendar';
import { ASSIGNMENT } from './config';
import { classStart, classState, minutesUntilClass } from './periods';
import { sideQuests } from './quests';
import { formatTime } from './time';
import { DOC_NAMES, OFFICE_ORDER } from '../content/offices';
import type { GameState } from './types';

export interface JournalTask {
  id: string;
  text: string;
  /** Where to go for it, if it is done at a place. */
  placeId?: string;
  /** Done on the phone (portal). */
  portal?: boolean;
  urgent?: boolean;
  /** Day of the semester it must be done by. */
  due?: number;
  group: 'today' | 'clearance' | 'money' | 'study' | 'health' | 'people' | 'goals';
}

type Producer = (d: GameState) => JournalTask[];

const clearanceTasks: Producer = (d) => {
  if (!d.clearance.active) return [];
  const due = registrationDeadline(d);
  const out: JournalTask[] = clearanceSteps(d)
    .filter((s) => !s.done)
    .map((s) => ({ id: `clr:${s.id}`, text: s.label, placeId: s.placeId, portal: s.portal, due, group: 'clearance' as const }));
  // Papers for the next office.
  const next = OFFICE_ORDER.find((o) => !d.clearance.signed[o]);
  const missing = next ? missingDocs(d, next) : [];
  if (missing.length) out.unshift({ id: 'clr:docs', text: `Get ${missing.map((m) => DOC_NAMES[m]).join(' and ')} at the Business Centre`, placeId: 'business-9', due, urgent: true, group: 'clearance' });
  return out;
};

const moneyTasks: Producer = (d) => {
  const out: JournalTask[] = [];
  if (!d.clearance.active) {
    for (const f of feesDueNow(d)) {
      const late = f.dueSemester === d.clock.semester && d.clock.day >= f.dueDay - 2;
      out.push({ id: `fee:${f.id}`, text: `Pay ${f.label.toLowerCase()} (${naira(f.amount)})`, portal: true, urgent: late, due: f.dueDay, group: 'money' });
    }
  }
  for (const debit of d.finance.debits) {
    out.push({
      id: `debit:${debit.id}`,
      text: `Show your bank alert at the Bursary: ${naira(debit.amount)} not recorded`,
      placeId: officePlaceId(d, 'bursary'),
      urgent: true,
      group: 'money',
    });
  }
  const reg = canRegister(d);
  if (!d.academics.registered && (reg.ok || reg.reason.startsWith('Pay the late'))) {
    out.push({
      id: 'register',
      text: reg.ok ? 'Register your courses on the portal' : reg.reason,
      due: registrationDeadline(d),
      portal: true,
      urgent: d.clock.day >= registrationDeadline(d) - 1,
      group: 'study',
    });
  }
  return out;
};

const studyTasks: Producer = (d) => {
  const out: JournalTask[] = [];
  const a = d.academics;
  const now = d.clock.day * 4 + d.clock.slot;
  for (const c of a.courses) {
    // Today's lectures, tests and exams that you can still make (by the clock).
    for (const m of c.meetings) {
      if (m.status !== 'scheduled' || m.attended || m.day !== d.clock.day) continue;
      const st = classState(d, c, m);
      if (st === 'over') continue;
      out.push({
        id: `lecture:${c.code}:${m.day}:${m.slot}`,
        text: `${m.test ? 'TEST: ' : ''}${c.code} ${c.kind === 'posting' ? 'posting' : c.kind === 'it' ? 'placement' : 'lecture'}, ${meetingTime(c, m)} at ${placeName(m.placeId)}${st === 'on' ? ' (on now!)' : ''}${m.moved ? ` (moved${m.from && m.from.day === m.day && m.from.slot !== m.slot ? ` from ${classStart(c, m.from)}` : ''})` : ''}`,
        placeId: m.placeId,
        urgent: st === 'on' || minutesUntilClass(d, c, m) <= 60 || !!m.test,
        group: 'today',
      });
    }
    const e = c.exam;
    if (e.status === 'pending' && e.day * 4 + e.slot >= now && e.day <= d.clock.day + 1) {
      out.push({
        id: `exam:${c.code}`,
        text: `EXAM: ${c.code}, ${dayLabel(d, e.day)} ${examTime(e.slot)}, at ${placeName(e.placeId)}${e.batchMoved ? ' (batch time changed!)' : ''}`,
        placeId: e.placeId,
        urgent: true,
        group: 'today',
      });
    }
    if (canDoAssignment(d, c).ok) {
      const left = c.assignmentDue - d.clock.day;
      out.push({ id: `assignment:${c.code}`, text: `Submit the ${c.code} assignment by ${dayLabel(d, c.assignmentDue)}, ${formatTime(c.assignmentDueMin ?? ASSIGNMENT.dueMin)} (library or your desk)`, urgent: left <= 1, due: c.assignmentDue, group: 'study' });
    }
    // Tests coming up this semester.
    for (const m of c.meetings) {
      if (!m.test || m.attended || m.status !== 'scheduled' || m.day * 4 + m.slot < now) continue;
      out.push({ id: `test:${c.code}`, text: `✏️ ${c.code} test, ${dayLabel(d, m.day)} ${meetingTime(c, m)} at ${placeName(m.placeId)}`, placeId: m.placeId, urgent: m.day - d.clock.day <= 1, due: m.day, group: 'study' });
    }
    if (c.meetings.length && !c.covered && d.clock.day >= 6 && attendance(d, c).pct < 0.75) {
      out.push({ id: `bar:${c.code}`, text: `Attendance in ${c.code} is below 75%: attend every class or you will be barred`, urgent: true, group: 'study' });
    }
  }
  if (a.courses.some((c) => c.kind === 'practical') && !(d.inventory.manual ?? 0) && d.flags[`manual_${d.clock.year}_${d.clock.semester}`]) {
    const first = Math.min(...a.courses.filter((c) => c.kind === 'practical').flatMap((c) => c.meetings.map((m) => m.day)), 14);
    out.push({ id: 'manual', text: 'Buy the practical manual at the Business Centre: without it you only watch in practicals', placeId: 'business-9', due: first, group: 'study' });
  }
  // The exam form, signed at the College Office before exams.
  if (a.registered && !d.flags[`examform_${d.clock.year}_${d.clock.semester}`] && d.clock.day <= EXAM_FORM_DAYS[EXAM_FORM_DAYS.length - 1]!) {
    const open = EXAM_FORM_DAYS.includes(d.clock.day);
    out.push({ id: 'exam_form', text: open ? 'Sign your exam form at the College Office' : `Exam form signing opens ${dayLabel(d, EXAM_FORM_DAYS[0]!)}`, placeId: officePlaceId(d, 'college_office'), urgent: open, due: EXAM_FORM_DAYS[EXAM_FORM_DAYS.length - 1], group: 'study' });
  }
  for (const issue of a.issues) {
    out.push({
      id: `issue:${issue.id}`,
      text: `${issue.kind === 'missing_script' ? 'Missing script' : 'Wrong grade'} in ${issue.code}: see the ${officeName(issue.officeId)}`,
      placeId: officePlaceId(d, issue.officeId),
      urgent: true,
      group: 'study',
    });
  }
  const p = a.project;
  if (p && d.phase === 'playing' && !p.defended) {
    out.push({
      id: 'project',
      text: p.awaiting
        ? `Take chapter ${p.chapters + 1} to your supervisor (College Office)`
        : `Write chapter ${p.chapters + 1} of your project (${p.chapters}/5 approved)`,
      placeId: p.awaiting ? officePlaceId(d, 'college_office') : undefined,
      group: 'study',
    });
  }
  return out;
};

const healthTasks: Producer = (d) => {
  const out: JournalTask[] = [];
  const n = d.needs;
  if (d.ill) out.push({ id: 'ill', text: 'You are sick: see a doctor at the Medical Centre or the Sick Bay', placeId: medicalCentre().id, urgent: true, group: 'health' });
  if (n.hunger >= 70) out.push({ id: 'hungry', text: 'You are very hungry: eat something (buka, kiosk, or cook in your room)', placeId: mainBuka().id, urgent: n.hunger >= 85, group: 'health' });
  if (n.energy <= 25) out.push({ id: 'tired', text: 'You are exhausted: sleep tonight or take a nap in your room', placeId: d.room.placeId, urgent: n.energy <= 12, group: 'health' });
  if (n.stress >= 75) out.push({ id: 'stressed', text: 'Stress is high: hang out at the Sports Complex or rest', placeId: fieldPlace().id, group: 'health' });
  if (d.room.levy) out.push({ id: 'levy', text: `Pay the room levy (${naira(d.room.levy)}) in your room`, placeId: d.room.placeId, group: 'money' });
  if (d.money < 1500) out.push({ id: 'broke', text: 'Money is very low: call home (phone → Wallet), wash plates at a buka, or borrow from a friend', placeId: d.room.placeId, group: 'money' });
  return out;
};

const peopleTasks: Producer = (d) =>
  d.loans
    .filter((l) => l.playerOwes)
    .map((l) => ({
      id: `loan:${l.id}`,
      text: `Pay back ${naira(l.amount)} to ${getPerson(l.personId)?.name ?? 'a friend'} by ${dayLabel(d, l.due - d.clock.dayCount + d.clock.day)}`,
      urgent: l.due <= d.clock.dayCount + 1,
      group: 'people' as const,
    }));

const goalTasks: Producer = (d) => {
  const out: JournalTask[] = [];
  const m = nextMilestone(d);
  if (m) out.push({ id: `milestone:${m.id}`, text: `Ambition: ${m.label}`, group: 'goals' });
  const e = upcomingElection(d);
  if (e && d.clock.day <= ELECTION_DAY) out.push({ id: 'election', text: `Election on ${dayLabel(d, ELECTION_DAY)}: campaign at the Sports Complex and make friends`, placeId: fieldPlace().id, group: 'goals' });
  return out;
};

/** The next step of every side quest you have picked up. */
const sideQuestTasks: Producer = (d) =>
  sideQuests(d).flatMap((q) => {
    const o = q.objectives.find((x) => !x.done);
    if (!o) return [];
    const left = q.dueDay !== undefined ? q.dueDay - d.clock.dayCount : 99;
    return [{ id: `side:${q.id}`, text: `${q.title}: ${o.label}${o.progress ? ` (${o.progress.have}/${o.progress.need})` : ''}`, placeId: o.placeId, urgent: left <= 0, group: 'goals' as const }];
  });

const PRODUCERS: Producer[] = [goalTasks, sideQuestTasks, studyTasks, healthTasks, clearanceTasks, moneyTasks, peopleTasks];

export function journal(d: GameState): JournalTask[] {
  const tasks = PRODUCERS.flatMap((p) => p(d));
  return tasks.sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent) || (a.due ?? 99) - (b.due ?? 99));
}

