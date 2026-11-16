// Simple bots that play a whole degree through the same interaction API as
// the screens. Four strategies: always study, always hustle, balanced, random.
// Used by the simulator (npm run sim) and the no-dead-end test.
import { OFFICES, OFFICE_ORDER } from '../../content/offices';
import { HUSTLES, HUSTLE_ORDER } from '../../content/hustles';
import { PLACES, getPlace, mainLibrary, medicalCentre, officePlace, type PlaceDef } from '../../content/places';
import { getProgramme } from '../../content/courses';
import { examsNow, meetingsNow } from '../academics';
import { blockedBy, missingDocs, officesOpen } from '../clearance';
import { newGame } from '../engine';
import { chooseEventMut, pendingEventDef } from '../events';
import { canSetUp } from '../hustle';
import { getInteractions, getMenu, performMut, travelMut } from '../interactions';
import { canPay, canRegister, portalPayMut, portalRegisterMut } from '../money';
import { Rng } from '../rng';
import type { AmbitionId, GameState, HustleId, OfficeId } from '../types';

export type Strategy = 'study' | 'hustle' | 'balanced' | 'random';

const AMBITION: Record<Strategy, AmbitionId> = { study: 'first_class', hustle: 'big_money', balanced: 'soft_life', random: 'su_president' };

interface Ctx {
  d: GameState;
  r: Rng;
  b: Rng;
  s: Strategy;
}

function go(c: Ctx, placeId: string, urgent = false, noWalk = false): boolean {
  const { d } = c;
  if (d.location.placeId === placeId) return true;
  const to = getPlace(placeId)!;
  if (to.sectionId === d.location.sectionId) return travelMut(d, c.r, placeId, 'walk');
  const rich = urgent || d.money >= 6000;
  if (rich && d.clock.slot !== 3 && travelMut(d, c.r, placeId, 'keke')) return true;
  if (rich && travelMut(d, c.r, placeId, 'cab')) return true;
  if (noWalk) return false;
  return travelMut(d, c.r, placeId, 'walk') && d.location.placeId === placeId;
}

/** Errands that take no slot must never cost one by walking across campus. */
function goQuick(c: Ctx, placeId: string): boolean {
  return go(c, placeId, false, true);
}

function act(c: Ctx, placeId: string, id: string, urgent = false): boolean {
  // Check first, so the bot never pays a fare for something it cannot do.
  if (!getInteractions(c.d, placeId).some((i) => i.id === id && i.available)) return false;
  const before = c.d.clock;
  if (!go(c, placeId, urgent)) return false;
  if (c.d.clock !== before && c.d.pendingEvent) return true; // the walk took the slot
  return performMut(c.d, c.r, placeId, id);
}

/** Nearest place of a kind: in the current section if possible. */
function nearest(c: Ctx, pred: (p: PlaceDef) => boolean): PlaceDef | undefined {
  const here = PLACES.filter((p) => pred(p) && p.sectionId === c.d.location.sectionId);
  return here[0] ?? PLACES.find(pred);
}

function chooseEvent(c: Ctx): void {
  const ev = pendingEventDef(c.d)!;
  const options = ev.choices.map((ch, i) => ({ ch, i })).filter(({ ch }) => (ch.cost ?? 0) <= c.d.money);
  if (!options.length) {
    c.d.pendingEvent = null;
    return;
  }
  const score = ({ ch }: (typeof options)[number]) => {
    const e = ch.effects;
    switch (c.s) {
      case 'study':
        return (e.knowledge ?? 0) * 3 + (e.goodwill ?? 0) - (e.loseSlots ?? 0) * 5 + (e.money ?? 0) / 2000;
      case 'hustle':
        return (e.money ?? 0) / 300 - (e.loseSlots ?? 0) * 3;
      case 'balanced':
        return -(e.stress ?? 0) + (e.money ?? 0) / 1000 + (e.knowledge ?? 0) + (e.health ?? 0);
      default:
        return c.b.next();
    }
  };
  const best = options.sort((a, b2) => score(b2) - score(a))[0]!;
  chooseEventMut(c.d, best.i);
}

/** Things that take no slot: fees, registration, food, documents. */
function quickActions(c: Ctx): void {
  const { d } = c;
  if (c.s !== 'random' || c.b.chance(0.7)) {
    for (const f of d.finance.fees) if (canPay(d, f.id).ok) portalPayMut(d, c.r, f.id);
  }
  if (canRegister(d).ok) portalRegisterMut(d, c.r);
  // Eat when hungry.
  if (d.needs.hunger >= 50) {
    const own = d.location.placeId === d.room.placeId;
    const food = own ? getInteractions(d, d.room.placeId).find((i) => i.kind === 'cook' && i.available) : undefined;
    if (food) performMut(d, c.r, d.room.placeId, food.id);
    else {
      const rest = nearest(c, (p) => p.type === 'restaurant' && !!p.menu);
      if (rest) {
        const dish = getMenu(d, rest.id)
          .filter((m) => m.fills >= 30 && m.price <= d.money - (c.s === 'hustle' ? 0 : 300))
          .sort((a, b2) => a.price / a.fills - b2.price / b2.fills)[0];
        if (dish && goQuick(c, rest.id)) performMut(d, c.r, rest.id, `eat:${dish.id}`);
      }
    }
  }
  // Clearance documents, a library passport, and a manual for practicals.
  const buyable = (doc: string) => doc !== 'receipt' || d.finance.fees.some((f) => f.id === 'acceptance' && f.paid);
  const needDocs = d.clearance.active && OFFICE_ORDER.some((o) => !d.clearance.signed[o] && missingDocs(d, o).some(buyable));
  const needPassport = !d.clearance.library && (d.inventory.passport ?? 0) < 1;
  const needManual = d.academics.courses.some((x) => x.kind === 'practical') && !(d.inventory.manual ?? 0) && d.money > 6000;
  if (needManual && d.clock.slot < 3 && (c.s !== 'random' || c.b.chance(0.3))) {
    const shop = getPlace('business-9')!;
    if (goQuick(c, shop.id)) performMut(d, c.r, shop.id, 'buy:manual');
  }
  if ((needDocs || needPassport) && d.money > 1500 && d.clock.slot < 3) {
    const shop = getPlace('business-9')!;
    if (goQuick(c, shop.id)) {
      for (const item of ['photocopy', 'passport', 'receipt']) {
        const lacking = OFFICE_ORDER.some((o) => !d.clearance.signed[o] && missingDocs(d, o).includes(item as never)) || (item === 'passport' && needPassport);
        if (lacking) performMut(d, c.r, shop.id, `buy:${item}`);
      }
    }
  }
}

function sleepOrNap(c: Ctx): boolean {
  return act(c, c.d.room.placeId, c.d.clock.slot === 3 ? 'sleep' : 'nap');
}

function readSomething(c: Ctx): boolean {
  const { d } = c;
  const lib = nearest(c, (p) => p.type === 'library') ?? mainLibrary();
  const here = d.location.sectionId === lib.sectionId ? lib.id : d.room.placeId;
  const list = getInteractions(d, here);
  const assignment = list.find((i) => i.kind === 'assignment' && i.available);
  if (assignment) return act(c, here, assignment.id);
  const p = d.academics.project;
  if (p && !p.defended) {
    if (p.awaiting) {
      const office = officePlace('college_office', getProgramme(d.player.programmeId).collegeId);
      if (officesOpen(d) && act(c, office.id, 'supervisor')) return true;
    } else if (c.b.chance(0.5) && act(c, here, 'project')) return true;
  }
  const weakest = [...d.academics.courses].filter((x) => !['it', 'chambers', 'project'].includes(x.kind)).sort((a, b2) => a.knowledge - b2.knowledge)[0];
  return !!weakest && act(c, here, `read:${weakest.code}`);
}

function hustleSomething(c: Ctx): boolean {
  const { d } = c;
  for (const id of HUSTLE_ORDER) if (canSetUp(d, id).ok && d.money > HUSTLES[id].setupCost + 8000) {
    const place = PLACES.find((p) => p.hustles?.includes(id) && p.type !== 'hostel_room');
    if (place && go(c, place.id)) performMut(d, c.r, place.id, `setup:${id}`);
  }
  const owned = [...d.hustle.owned].sort((a, b2) => HUSTLE_ORDER.indexOf(b2) - HUSTLE_ORDER.indexOf(a));
  for (const id of owned as HustleId[]) {
    const place = id === 'snacks' ? getPlace(d.room.placeId) : nearest(c, (p) => !!p.hustles?.includes(id) && p.type !== 'hostel_room');
    if (place && act(c, place.id, `hustle:${id}`)) return true;
  }
  return act(c, d.room.placeId, 'errands');
}

/** One slot's worth of decision. Always spends at least one slot (or resolves an event). */
function slotAction(c0: Ctx): void {
  // "Random" plays a randomly chosen sensible strategy each slot.
  const c: Ctx = c0.s === 'random' ? { ...c0, s: c0.b.pick(['study', 'hustle', 'balanced'] as const) } : c0;
  const { d, s, b } = c;
  const slotBefore = d.clock.slot + d.clock.dayCount * 4;
  const done = () => d.clock.slot + d.clock.dayCount * 4 !== slotBefore || d.pendingEvent !== null || d.phase !== 'playing';

  for (const e of examsNow(d)) if (act(c, e.exam.placeId, `exam:${e.code}`, true) && done()) return;
  // Hungry and broke: wash plates for a free meal.
  if (d.needs.hunger >= 65 && d.money < 800 && d.clock.slot < 3) {
    const rest = nearest(c, (p) => p.type === 'restaurant');
    if (rest && act(c, rest.id, 'wash_plates') && done()) return;
  }
  if (d.ill) {
    const clinic = d.location.sectionId === 'estate' ? getPlace('clinic-j8t6h5')! : medicalCentre();
    if (act(c, clinic.id, 'treat') && done()) return;
  }
  if (d.clock.slot === 3 && (s !== 'random' || b.chance(0.85))) {
    if (sleepOrNap(c) && done()) return;
  }
  // A payment the portal swallowed: the Bursary first.
  if (officesOpen(d)) for (const debit of d.finance.debits) if (act(c, officePlace('bursary', 'nas').id, `debit:${debit.id}`) && done()) return;
  // During clearance, offices come first (except tests).
  for (const { course, meeting } of meetingsNow(d)) if (meeting.test && act(c, meeting.placeId, `attend:${course.code}`) && done()) return;
  if (d.clearance.active && d.clock.slot < 3 && ![6, 7, 13, 14].includes(d.clock.day)) {
    const col = getProgramme(d.player.programmeId).collegeId;
    for (const o of OFFICE_ORDER as OfficeId[]) {
      if (d.clearance.signed[o] || blockedBy(d, o) || missingDocs(d, o).length || (d.clearance.backOn[o] ?? 0) > d.clock.dayCount) continue;
      if (OFFICES[o].fee && d.money < OFFICES[o].fee!) continue;
      if (act(c, officePlace(o, col).id, `office:${o}`) && done()) return;
    }
    if (act(c, officePlace('student_affairs', col).id, 'allocation') && done()) return;
  }
  // Head home in the evening while kekes still run (night cabs are expensive).
  const room = getPlace(d.room.placeId)!;
  if (d.clock.slot === 2 && d.location.sectionId !== room.sectionId && !meetingsNow(d).length && !examsNow(d).length) go(c, room.id);
  const attendRate = s === 'study' || s === 'balanced' ? 1 : s === 'hustle' ? 0.55 : 0.6;
  for (const { course, meeting } of meetingsNow(d)) {
    if (meeting.test || b.chance(attendRate)) if (act(c, meeting.placeId, `attend:${course.code}`, meeting.test) && done()) return;
  }
  if (!d.clearance.library && act(c, mainLibrary().id, 'library_register') && done()) return;
  if (officesOpen(d)) {
    for (const debit of d.finance.debits) if (act(c, officePlace('bursary', 'nas').id, `debit:${debit.id}`) && done()) return;
    for (const issue of d.academics.issues) {
      if (act(c, officePlace(issue.officeId, getProgramme(d.player.programmeId).collegeId).id, `issue:${issue.id}`) && done()) return;
    }
  }
  if (d.needs.energy < 22 && d.clock.slot < 3 && sleepOrNap(c) && done()) return;
  // Fees due and not enough money: work first (no fees, no exam).
  const owed = d.finance.fees.filter((f) => !f.paid && f.dueSemester <= d.clock.semester).reduce((x, f) => x + f.amount, 0);
  if ((owed > d.money || d.money < 4000) && d.clock.slot < 3 && hustleSomething(c) && done()) return;
  if (d.money < 600 && (s !== 'random' || b.chance(0.5))) {
    const rest = nearest(c, (p) => p.type === 'restaurant');
    if (rest && act(c, rest.id, 'wash_plates') && done()) return;
  }

  switch (s) {
    case 'study':
      if (readSomething(c) && done()) return;
      break;
    case 'hustle':
      if (b.chance(0.25) && readSomething(c) && done()) return;
      if (hustleSomething(c) && done()) return;
      break;
    case 'balanced': {
      const weekend = [6, 7, 13, 14].includes(d.clock.day);
      if (d.needs.stress > 60 && (d.clock.slot === 2 || weekend) && d.money > 3000) {
        const field = PLACES.find((p) => p.type === 'field')!;
        if (act(c, field.id, 'hangout') && done()) return;
      }
      if (d.money < 15000 && b.chance(0.6) && hustleSomething(c) && done()) return;
      if (readSomething(c) && done()) return;
      break;
    }
    default: {
      const options = getInteractions(d, d.location.placeId).filter((i) => i.available && (i.cost?.slots ?? 0) > 0);
      if (options.length && b.chance(0.7)) {
        const pick = b.pick(options);
        if (performMut(d, c.r, d.location.placeId, pick.id) && done()) return;
      } else {
        const targets = PLACES.filter((p) => p.enterable);
        const to = b.pick(targets);
        go(c, to.id);
        if (done()) return;
      }
    }
  }
  if (!done()) performMut(d, c.r, d.location.placeId, 'wait');
}

export interface DegreeResult {
  programmeId: string;
  strategy: Strategy;
  seed: number;
  graduated: boolean;
  withdrawn: boolean;
  cgpa: number;
  sessions: number;
  brokeTimes: number;
  clearanceDays: number | null;
  carryovers: number;
  repeated: number;
  decisions: number;
}

export function playDegree(programmeId: string, strategy: Strategy, seed: number): DegreeResult {
  const d = newGame({
    name: 'Bot',
    characterId: 'm1',
    background: (['broke', 'average', 'comfortable'] as const)[seed % 3]!,
    choiceId: programmeId,
    programmeId,
    admissionScore: 8,
    ambition: AMBITION[strategy],
    seed: seed * 7919 + 13,
    startYear: 2026,
  });
  const c: Ctx = { d, r: new Rng(d.rng), b: new Rng(seed * 104729 + 7), s: strategy };
  const years = getProgramme(programmeId).years;
  const maxSessions = years + 4;
  let decisions = 0;
  let repeated = 0;
  let lastLevel = 1;
  while (d.phase === 'playing' && d.clock.year <= maxSessions && decisions < 40000) {
    decisions++;
    d.summaries.length = 0;
    if (d.pendingEvent) {
      chooseEvent(c);
      continue;
    }
    quickActions(c);
    if (d.pendingEvent) continue;
    slotAction(c);
    if (d.academics.repeating && d.academics.level === lastLevel && d.clock.day === 1 && d.clock.slot === 0 && d.clock.semester === 1) repeated++;
    lastLevel = d.academics.level;
  }
  d.rng = c.r.seed;
  const t = d.academics.transcript;
  const cgpa = t.length ? t[t.length - 1]!.cgpa : 0;
  return {
    programmeId,
    strategy,
    seed,
    graduated: d.phase === 'graduated',
    withdrawn: d.phase === 'withdrawn',
    cgpa,
    sessions: d.clock.year,
    brokeTimes: d.stats.brokeTimes,
    clearanceDays: d.clearance.endDay ? d.clearance.endDay - d.clearance.startDay + 1 : null,
    carryovers: t.flatMap((x) => x.courses).filter((x) => x.grade === 'F').length,
    repeated,
    decisions,
  };
}
