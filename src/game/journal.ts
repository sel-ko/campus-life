// The journal: every open task, most urgent first, so the player always
// knows what to do next. Pure: reads the state, changes nothing.
import { clearanceSteps, officePlaceId } from './clearance';
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

const PRODUCERS: Producer[] = [clearanceTasks, moneyTasks];

export function journal(d: GameState): JournalTask[] {
  const tasks = PRODUCERS.flatMap((p) => p(d));
  return tasks.sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent));
}

