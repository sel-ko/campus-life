// The day planner behind the timetable: for any day of the semester, what is
// on and when. Classes, tests and exams come from the timetable at their real
// times; around them sit orientation, clearance office hours, deadlines,
// allowance, the election, meals and sleep, so the timetable is never empty
// and always says what to do. Pure: reads the state, changes nothing.
import { PLACES, mainBuka, mainLibrary } from '../content/places';
import { OFFICE_ORDER } from '../content/offices';
import { hasExam } from './academics';
import { examTime, movedText } from './calendar';
import { officeName, officePlaceId } from './clearance';
import { ALLOWANCE_DAYS, EXAM_DAYS, ORIENTATION_DAYS, WEEKEND_DAYS } from './config';
import { ELECTION_DAY, upcomingElection } from './goals';
import { feesDueNow, registrationDeadline } from './money';
import { classWindow, examWindow, windowText } from './periods';
import { SLOT_START } from './time';
import type { GameState } from './types';

export type PlanKind = 'class' | 'test' | 'exam' | 'orientation' | 'clearance' | 'deadline' | 'money' | 'meal' | 'free' | 'sleep' | 'event';

export interface PlanItem {
  slot: number;
  /** When it starts, minutes since midnight (classes and exams at their real times). */
  start: number;
  /** "8:00–10:00 am", "9:00 am–12:00 pm", or the part of the day ("Evening"). */
  time: string;
  kind: PlanKind;
  text: string;
  placeId?: string;
  /** Already done (attended, written). */
  done?: boolean;
  /** Cancelled or moved. */
  note?: string;
  /** For a moved class: its new day, time and hall, and where it was. */
  movedText?: string;
}

export const PLAN_ICON: Record<PlanKind, string> = {
  class: '📘',
  test: '✏️',
  exam: '📝',
  orientation: '🎤',
  clearance: '🗂️',
  deadline: '⏰',
  money: '₦',
  meal: '🍲',
  free: '☀️',
  sleep: '🌙',
  event: '🗳️',
};

const SLOT_LABEL = ['Morning', 'Afternoon', 'Evening', 'Night'];
/** Things with no exact time start with their part of the day. */
const at = (slot: number, time?: string) => ({ slot, start: SLOT_START[slot]!, time: time ?? SLOT_LABEL[slot]! });

export function dayPlan(d: GameState, day: number): PlanItem[] {
  const out: PlanItem[] = [];
  const weekend = WEEKEND_DAYS.includes(day);
  const fresher = d.clock.year === 1 && d.clock.semester === 1 && d.academics.level === 1;
  const past = day < d.clock.day;

  // Lectures, tests and placements.
  for (const c of d.academics.courses) {
    for (const m of c.meetings) {
      if (m.day !== day) continue;
      const w = classWindow(c, m);
      out.push({
        slot: m.slot,
        start: w.start,
        time: windowText(w),
        kind: m.test ? 'test' : 'class',
        text: `${c.code} ${m.test ? 'test' : c.kind === 'practical' ? 'practical' : c.kind === 'it' ? 'placement' : 'lecture'}: ${c.title}`,
        placeId: m.placeId,
        done: m.attended,
        note: m.status === 'cancelled' ? 'cancelled' : m.moved ? 'moved' : undefined,
        ...(m.moved && m.status !== 'cancelled' ? { movedText: movedText(d, c, m) } : {}),
      });
    }
    if (c.exam.day === day && hasExam(c.kind)) {
      out.push({ slot: c.exam.slot, start: examWindow(c.exam.slot).start, time: examTime(c.exam.slot), kind: 'exam', text: `${c.code} EXAM`, placeId: c.exam.placeId, done: c.exam.status !== 'pending', note: c.exam.batchMoved ? 'moved' : undefined });
    }
  }

  // Freshers' week: orientation and clearance.
  if (fresher && ORIENTATION_DAYS.includes(day) && !d.academics.orientation) {
    const hall = PLACES.find((p) => p.gst);
    out.push({ ...at(0, '9:00 am'), start: 9 * 60, kind: 'orientation', text: "Freshers' orientation", placeId: hall?.id });
  }
  if (d.clearance.active && !weekend && !past) {
    const next = OFFICE_ORDER.filter((o) => !d.clearance.signed[o]).slice(0, 2);
    for (const [i, o] of next.entries()) out.push({ ...at(i, i === 0 ? '8:00 am–12:00 pm' : '12:00–4:00 pm'), start: i === 0 ? 8 * 60 : 12 * 60, kind: 'clearance', text: `Clearance: ${officeName(o)} (office hours)`, placeId: officePlaceId(d, o) });
  }

  // Money and deadlines.
  if (ALLOWANCE_DAYS.includes(day)) out.push({ ...at(0), kind: 'money', text: 'Allowance from home lands' });
  if (day === registrationDeadline(d) && !d.academics.registered) out.push({ ...at(1), kind: 'deadline', text: 'Last day to register courses (portal)' });
  for (const f of feesDueNow(d)) if (f.dueSemester === d.clock.semester && f.dueDay === day) out.push({ ...at(1), kind: 'deadline', text: `${f.label} due today` });
  if (day === ELECTION_DAY && upcomingElection(d)) out.push({ ...at(1), kind: 'event', text: 'Student union election' });

  // Fill the gaps: eat, read, rest, have fun, sleep.
  const busy = (s: number) => out.some((x) => x.slot === s);
  if (!busy(1)) out.push({ ...at(1, '12:00–1:00 pm'), kind: 'meal', text: weekend ? 'Lunch, laundry and rest' : 'Lunch at the buka', placeId: mainBuka().id });
  if (!busy(2)) {
    const exams = EXAM_DAYS.includes(day + 1) || EXAM_DAYS.includes(day);
    out.push({ ...at(2), kind: 'free', text: exams ? 'Read for your exams' : weekend ? 'Hang out, or a party in town' : 'Read in the library or hang out', placeId: exams ? mainLibrary().id : undefined });
  }
  if (!busy(0) && weekend) out.push({ ...at(0), kind: 'free', text: 'Lie in. No classes today' });
  if (!busy(3)) out.push({ ...at(3, 'Night'), kind: 'sleep', text: weekend ? 'Night life or sleep' : 'Sleep (class tomorrow)' });
  return out.sort((a, b) => a.start - b.start || a.slot - b.slot);
}
