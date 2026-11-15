// The journal: every open task, most urgent first, so the player always
// knows what to do next. Pure: reads the state, changes nothing.
import { getPerson } from '../content/people';
import { fieldPlace, mainBuka, medicalCentre, placeName } from '../content/places';
import { attendance, canDoAssignment } from './academics';
import { clearanceSteps, officeName, officePlaceId } from './clearance';
import { naira } from './format';
import { canRegister, feesDueNow, registrationDeadline } from './money';
import type { GameState } from './types';

export interface JournalTask {
  id: string;
  text: string;
  /** Where to go for it, if it is done at a place. */
  placeId?: string;
  /** Done on the phone (portal). */
  portal?: boolean;
  urgent?: boolean;
  group: 'today' | 'clearance' | 'money' | 'study' | 'health' | 'people' | 'goals';
}

type Producer = (d: GameState) => JournalTask[];

const clearanceTasks: Producer = (d) => {
  if (!d.clearance.active) return [];
  return clearanceSteps(d)
    .filter((s) => !s.done)
    .map((s) => ({ id: `clr:${s.id}`, text: s.label, placeId: s.placeId, portal: s.portal, group: 'clearance' as const }));
};

const moneyTasks: Producer = (d) => {
  const out: JournalTask[] = [];
  if (!d.clearance.active) {
    for (const f of feesDueNow(d)) {
      const late = f.dueSemester === d.clock.semester && d.clock.day >= f.dueDay - 2;
      out.push({ id: `fee:${f.id}`, text: `Pay ${f.label.toLowerCase()} (${naira(f.amount)}) by day ${f.dueDay}`, portal: true, urgent: late, group: 'money' });
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
      text: reg.ok ? `Register your courses on the portal (deadline day ${registrationDeadline(d)})` : reg.reason,
      portal: true,
      urgent: d.clock.day >= registrationDeadline(d) - 1,
      group: 'study',
    });
  }
  return out;
};

const SLOT_NAMES = ['morning', 'afternoon', 'evening', 'night'];

const studyTasks: Producer = (d) => {
  const out: JournalTask[] = [];
  const a = d.academics;
  const now = d.clock.day * 4 + d.clock.slot;
  for (const c of a.courses) {
    // Today's (and tomorrow morning's) lectures, tests and exams.
    for (const m of c.meetings) {
      const t = m.day * 4 + m.slot;
      if (m.status !== 'scheduled' || m.attended || t < now || m.day > d.clock.day) continue;
      out.push({
        id: `lecture:${c.code}:${m.day}:${m.slot}`,
        text: `${m.test ? 'TEST: ' : ''}${c.code} ${c.kind === 'posting' ? 'posting' : c.kind === 'it' ? 'placement' : 'lecture'} this ${SLOT_NAMES[m.slot]} at ${placeName(m.placeId)}${m.moved ? ' (moved)' : ''}`,
        placeId: m.placeId,
        urgent: t === now || !!m.test,
        group: 'today',
      });
    }
    const e = c.exam;
    if (e.status === 'pending' && e.day * 4 + e.slot >= now && e.day <= d.clock.day + 1) {
      out.push({
        id: `exam:${c.code}`,
        text: `EXAM: ${c.code} on day ${e.day}, ${SLOT_NAMES[e.slot]}, at ${placeName(e.placeId)}${e.batchMoved ? ' (batch time changed!)' : ''}`,
        placeId: e.placeId,
        urgent: true,
        group: 'today',
      });
    }
    if (canDoAssignment(d, c).ok && d.clock.day >= 3) {
      out.push({ id: `assignment:${c.code}`, text: `Submit the ${c.code} assignment by day ${c.assignmentDue} (library or room)`, urgent: d.clock.day >= c.assignmentDue - 1, group: 'study' });
    }
    if (c.meetings.length && !c.covered && d.clock.day >= 6 && attendance(d, c).pct < 0.75) {
      out.push({ id: `bar:${c.code}`, text: `Attendance in ${c.code} is below 75%: attend every class or you will be barred`, urgent: true, group: 'study' });
    }
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
  if (d.money < 1500) out.push({ id: 'broke', text: 'Money is very low: run errands in the hostel, wash plates at a buka, or borrow from a friend', placeId: d.room.placeId, group: 'money' });
  return out;
};

const peopleTasks: Producer = (d) =>
  d.loans
    .filter((l) => l.playerOwes)
    .map((l) => ({
      id: `loan:${l.id}`,
      text: `Pay back ${naira(l.amount)} to ${getPerson(l.personId)?.name ?? 'a friend'} by day ${l.due - d.clock.dayCount + d.clock.day}`,
      urgent: l.due <= d.clock.dayCount + 1,
      group: 'people' as const,
    }));

const PRODUCERS: Producer[] = [studyTasks, healthTasks, clearanceTasks, moneyTasks, peopleTasks];

export function journal(d: GameState): JournalTask[] {
  const tasks = PRODUCERS.flatMap((p) => p(d));
  return tasks.sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent));
}

