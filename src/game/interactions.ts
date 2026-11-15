// THE interaction API: the only way the screens (2D lists now, 3D interiors
// too) talk to the rules. For any place and state it lists what can be done,
// who is there, the queue and the menu; performInteraction does one thing.
// Every interaction names a target (seat, lecturer, desk, counter, bed,
// locker, shelf, bench, stove, board, door or a person) so a 3D room can map
// it to an object.
import { DISHES, MENUS, SHOP_ITEMS } from '../content/food';
import { HUSTLES, HUSTLE_ORDER } from '../content/hustles';
import { OFFICES } from '../content/offices';
import { CAST, getPerson } from '../content/people';
import { getCollege, getProgramme } from '../content/courses';
import { getPlace, medicalCentre, type PlaceDef } from '../content/places';
import type { MenuItem, ShopItem } from './contentTypes';
import {
  assignmentMut,
  attendMut,
  barred,
  buyHandoutMut,
  canDoAssignment,
  canWriteExam,
  coverAttendanceMut,
  examsNow,
  gstSeatFree,
  meetingsNow,
  meetSupervisorMut,
  readMut,
  resolveIssueMut,
  attendance,
  writeExamMut,
  writeProjectMut,
} from './academics';
import { modifiers, syncCampusWeekMut } from './campus';
import {
  canCollectAllocation,
  canRegisterLibrary,
  canVisitOffice,
  checkClearanceDone,
  collectAllocationMut,
  officeQueue,
  officerRel,
  officeName,
  registerLibraryMut,
  visitOfficeMut,
} from './clearance';
import { answerMut, markReadMut } from './chat';
import { FARES, ORIENTATION_DAYS } from './config';
import { clamp, log, produce } from './draft';
import { addRel, applyEffects } from './effects';
import { advance } from './engine';
import { chooseEventMut, maybeEventMut } from './events';
import { checkObjectivesMut } from './goals';
import { naira } from './format';
import { canEatProvision, eatProvisionMut, payLevyMut } from './hostel';
import { canHustle, canSetUp, errandsMut, hustleMut, setUpMut, washPlatesMut } from './hustle';
import { feePaid, portalPayMut, portalRegisterMut, resolveDebitMut, spend } from './money';
import { eatMut, napMut, sleepMut, TREATMENT, treatMut } from './needs';
import { canTalk, doFavourMut, favoursFor, talkMut } from './people';
import { isWeekend, slotName, stamp } from './time';
import type { FeeId, GameState, OfficeId, PlaceType, TravelMode } from './types';

export type TargetType = 'seat' | 'lecturer' | 'desk' | 'counter' | 'bed' | 'locker' | 'shelf' | 'bench' | 'stove' | 'board' | 'door' | 'person';

export type InteractionKind =
  | 'attend'
  | 'test'
  | 'exam'
  | 'orientation'
  | 'read'
  | 'assignment'
  | 'handout'
  | 'project'
  | 'supervisor'
  | 'plead'
  | 'office'
  | 'debit'
  | 'issue'
  | 'allocation'
  | 'library'
  | 'eat'
  | 'buy'
  | 'wash_plates'
  | 'errands'
  | 'sleep'
  | 'nap'
  | 'cook'
  | 'levy'
  | 'hustle'
  | 'setup'
  | 'treat'
  | 'talk'
  | 'favour'
  | 'hangout'
  | 'exercise'
  | 'campaign'
  | 'wait';

export interface Interaction {
  id: string;
  kind: InteractionKind;
  label: string;
  /** A short extra line (queue, price, what it does). */
  detail?: string;
  target: { type: TargetType; id?: string };
  available: boolean;
  reason?: string;
  cost?: { money?: number; slots?: number };
}

export interface Occupant {
  personId: string;
  name: string;
  role: string;
  spot: { type: TargetType; id?: string };
}

const SLOT = { slots: 1 };
const yes = { available: true } as const;
const no = (reason: string) => ({ available: false, reason }) as const;
const ok = (a: { ok: boolean; reason?: string }) => (a.ok ? yes : no(a.reason ?? 'Not now'));

function collegeId(d: GameState): string {
  return getProgramme(d.player.programmeId).collegeId;
}

/** Offices in this place that serve this player (college offices only for your college). */
function officesHere(d: GameState, place: PlaceDef): OfficeId[] {
  return (place.offices ?? []).filter((o) => !['college_office', 'hod'].includes(o) || !place.colleges || place.colleges.includes(collegeId(d)));
}

export function isOwnRoom(d: GameState, placeId: string): boolean {
  return d.room.placeId === placeId;
}

function foodPrice(d: GameState, price: number): number {
  return Math.round((price * (modifiers(d).foodPrice ?? 1)) / 50) * 50;
}

export function getMenu(state: GameState, placeId: string): Array<MenuItem & { price: number }> {
  const place = getPlace(placeId);
  if (!place?.menu) return [];
  return (MENUS[place.menu] ?? []).map((id) => DISHES[id]!).map((dish) => ({ ...dish, price: foodPrice(state, dish.price) }));
}

export function getShop(_state: GameState, placeId: string): ShopItem[] {
  const place = getPlace(placeId);
  return (place?.stock ?? []).map((id) => SHOP_ITEMS[id]!).filter(Boolean);
}

export function getQueueLength(state: GameState, placeId: string): number {
  const place = getPlace(placeId);
  if (!place) return 0;
  const offices = officesHere(state, place);
  if (offices.length) return Math.max(...offices.map((o) => officeQueue(state, o)));
  if (place.type === 'restaurant') return state.clock.slot === 1 ? 6 : 2;
  return 0;
}

// ---------- who is here ----------

export function getOccupants(d: GameState, placeId: string): Occupant[] {
  const place = getPlace(placeId);
  if (!place) return [];
  const out: Occupant[] = [];
  const add = (personId: string, spot: Occupant['spot']) => {
    const p = getPerson(personId);
    if (p && !out.some((o) => o.personId === personId)) out.push({ personId, name: p.name, role: p.role, spot });
  };
  const slot = d.clock.slot;
  const lecture = meetingsNow(d, placeId);
  for (const { course } of lecture) {
    if (course.kind !== 'it' && course.kind !== 'chambers') add(course.lecturerId, { type: 'lecturer' });
  }
  const classmates = CAST.filter((p) => ['course_rep', 'efiko', 'coursemate', 'hustle_partner'].includes(p.role));
  if (lecture.length || examsNow(d, placeId).length) classmates.forEach((p, i) => add(p.id, { type: 'seat', id: `seat-${i + 1}` }));
  for (const o of officesHere(d, place)) {
    const officer = OFFICES[o].officerId;
    const offDuty = isWeekend(d.clock.day) || slot >= 2;
    if (!offDuty) add(officer, { type: 'desk', id: o });
  }
  if (place.medicalCentre || place.type === 'clinic') add('doctor', { type: 'desk' });
  if (place.menu === 'buka') add('mama_blessing', { type: 'counter' });
  if (place.type === 'library' && slot >= 1) add('ify', { type: 'shelf' });
  if (place.type === 'library' && slot === 1) add('ejiro', { type: 'bench' });
  if (place.type === 'field' && slot === 2) {
    add('ejiro', { type: 'bench' });
    add('tega', { type: 'bench' });
    add('osaze', { type: 'bench' });
  }
  if (place.type === 'restaurant' && slot === 1) add('dami', { type: 'bench' });
  if (place.hustles?.includes('typing') && slot <= 1) add('kelz', { type: 'counter' });
  if (isOwnRoom(d, placeId)) {
    d.room.roommates.forEach((id, i) => {
      const crawler = getPerson(id)?.traits?.includes('night_crawler');
      if (slot === 0 || (slot === 3 && !crawler) || (slot === 2 && i % 2 === 0)) add(id, { type: 'bed', id: `bed-${i + 2}` });
    });
  }
  return out;
}

// ---------- what can be done ----------

export function getInteractions(d: GameState, placeId: string): Interaction[] {
  const place = getPlace(placeId);
  if (!place || d.phase !== 'playing') return [];
  const list: Interaction[] = [];
  const add = (i: Interaction) => list.push(i);
  const slot = d.clock.slot;
  const a = d.academics;

  // Lectures, tests, postings and placements happening here now.
  for (const { course, meeting } of meetingsNow(d, placeId)) {
    const label =
      course.kind === 'it'
        ? `Work at your IT placement (${course.code})`
        : course.kind === 'posting'
          ? `Clinical posting: ${course.title}`
          : course.kind === 'chambers'
            ? `Chambers attachment (${course.code})`
            : meeting.test
              ? `Write the ${course.code} test`
              : `Attend ${course.code}: ${course.title}`;
    add({
      id: `attend:${course.code}`,
      kind: meeting.test ? 'test' : 'attend',
      label,
      detail: course.kind === 'gst' ? 'The hall is packed: come early to get a seat.' : meeting.moved ? 'Moved here at short notice.' : undefined,
      target: { type: 'seat' },
      cost: SLOT,
      ...(meeting.attended ? no('Already here') : yes),
    });
    if (course.handout.price > 0 && course.handout.status === 'none') {
      add({
        id: `handout:${course.code}`,
        kind: 'handout',
        label: `Buy the ${course.code} handout from ${getPerson(course.lecturerId)?.name ?? 'the lecturer'}`,
        target: { type: 'lecturer', id: course.lecturerId },
        cost: { money: course.handout.price },
        ...(d.money >= course.handout.price ? yes : no(`You need ${naira(course.handout.price)}`)),
      });
    }
  }
  for (const course of examsNow(d, placeId)) {
    add({
      id: `exam:${course.code}`,
      kind: 'exam',
      label: course.kind === 'project' ? 'Defend your final-year project' : `Write the ${course.code} exam`,
      detail: course.title,
      target: { type: 'desk' },
      cost: SLOT,
      ...ok(canWriteExam(d, course)),
    });
  }
  if (place.gst && a.level === 1 && d.clock.year === 1 && d.clock.semester === 1 && ORIENTATION_DAYS.includes(d.clock.day) && !a.orientation) {
    add({ id: 'orientation', kind: 'orientation', label: 'Attend freshers\' orientation', target: { type: 'seat' }, cost: SLOT, ...(slot <= 1 ? yes : no('Orientation is in the morning and afternoon')) });
  }

  // Reading, assignments and the project.
  const readHere = place.type === 'library' || (place.type === 'hostel_room' && isOwnRoom(d, placeId));
  if (readHere) {
    for (const c of a.courses.filter((x) => !['it', 'chambers', 'project'].includes(x.kind))) {
      add({ id: `read:${c.code}`, kind: 'read', label: `Read ${c.code}`, detail: `${c.title} · knowledge ${Math.round(c.knowledge)}`, target: { type: place.type === 'library' ? 'shelf' : 'desk' }, cost: SLOT, ...yes });
    }
    for (const c of a.courses) {
      const can = canDoAssignment(d, c);
      if (can.ok) add({ id: `assignment:${c.code}`, kind: 'assignment', label: `Do the ${c.code} assignment`, detail: `Due day ${c.assignmentDue}`, target: { type: 'desk' }, cost: SLOT, ...yes });
    }
    const p = a.project;
    if (p && !p.defended) {
      add({ id: 'project', kind: 'project', label: `Write chapter ${p.chapters + 1} of your project`, detail: `${p.chapters}/5 approved · draft ${p.draft}%`, target: { type: 'desk' }, cost: SLOT, ...(p.awaiting ? no('Waiting for your supervisor to read the last chapter') : yes) });
    }
  }
  if (place.mainLibrary && !d.clearance.library) {
    add({ id: 'library_register', kind: 'library', label: 'Register at the library', detail: 'Bring one passport photograph', target: { type: 'counter' }, cost: SLOT, ...ok(canRegisterLibrary(d)) });
  }

  // Offices.
  for (const office of officesHere(d, place)) {
    const queue = officeQueue(d, office);
    if (d.clearance.active && !d.clearance.signed[office]) {
      add({
        id: `office:${office}`,
        kind: 'office',
        label: `Get your clearance form signed: ${officeName(office)}`,
        detail: `${queue} people in the queue${slot >= 2 ? ' · offices close by 4 p.m.' : ''}`,
        target: { type: 'desk', id: office },
        cost: SLOT,
        ...ok(canVisitOffice(d, office)),
      });
    }
    if (office === 'bursary') {
      for (const debit of d.finance.debits) {
        add({ id: `debit:${debit.id}`, kind: 'debit', label: `Show your bank alert (${naira(debit.amount)} not recorded)`, target: { type: 'desk', id: office }, cost: SLOT, ...(slot <= 1 && !isWeekend(d.clock.day) ? yes : no('The Bursary is closed now')) });
      }
    }
    for (const issue of a.issues.filter((i) => i.officeId === office)) {
      add({ id: `issue:${issue.id}`, kind: 'issue', label: `${issue.kind === 'missing_script' ? 'Report your missing script' : 'Complain about a wrong grade'}: ${issue.code}`, target: { type: 'desk', id: office }, cost: SLOT, ...(slot <= 1 && !isWeekend(d.clock.day) ? yes : no('Closed now')) });
    }
    if (office === 'student_affairs' && d.clearance.active && !d.clearance.allocation) {
      add({ id: 'allocation', kind: 'allocation', label: 'Collect your hostel allocation', target: { type: 'desk', id: office }, cost: SLOT, ...ok(canCollectAllocation(d)) });
    }
    if (office === 'college_office') {
      for (const c of a.courses.filter((x) => !x.covered && x.meetings.length && attendance(d, x).pct < 0.75)) {
        add({ id: `plead:${c.code}`, kind: 'plead', label: `Plead about your ${c.code} attendance`, detail: 'Bring a good story. It may or may not work.', target: { type: 'desk', id: office }, cost: SLOT, ...(slot <= 1 && !isWeekend(d.clock.day) ? yes : no('Closed now')) });
      }
      if (a.project && !a.project.defended) {
        add({ id: 'supervisor', kind: 'supervisor', label: `Meet your supervisor, ${getPerson(a.project.supervisorId)?.name}`, target: { type: 'person', id: a.project.supervisorId }, cost: SLOT, ...(a.project.awaiting ? yes : no('Write the next chapter first')) });
      }
    }
  }

  // Food.
  for (const dish of getMenu(d, placeId)) {
    add({ id: `eat:${dish.id}`, kind: 'eat', label: `${dish.name}`, detail: dish.snack ? 'Snack' : `Fills you up`, target: { type: 'counter' }, cost: { money: dish.price }, ...(d.money >= dish.price ? yes : no(`You need ${naira(dish.price)}`)) });
  }
  if (place.type === 'restaurant') {
    add({ id: 'wash_plates', kind: 'wash_plates', label: 'Wash plates for cash and a free plate', detail: '₦500 and a meal', target: { type: 'counter' }, cost: SLOT, ...(slot === 3 ? no('Closed at night') : yes) });
  }
  for (const item of getShop(d, placeId)) {
    const needsAcceptance = item.id === 'receipt' && !feePaid(d, 'acceptance');
    add({
      id: `buy:${item.id}`,
      kind: 'buy',
      label: `Buy ${item.name.toLowerCase()}`,
      target: { type: 'counter' },
      cost: { money: item.price },
      ...(needsAcceptance ? no('Pay the acceptance fee first') : item.id === 'padlock' && d.room.padlock ? no('You already have one') : d.money >= item.price ? yes : no(`You need ${naira(item.price)}`)),
    });
  }

  // Hustles.
  for (const id of HUSTLE_ORDER) {
    if (!place.hustles?.includes(id)) continue;
    if (id === 'snacks' && !isOwnRoom(d, placeId)) continue;
    const h = HUSTLES[id];
    if (d.hustle.owned.includes(id)) {
      add({ id: `hustle:${id}`, kind: 'hustle', label: h.name, detail: `Stock ${naira(h.stockCost)} · usually ${naira(h.revenue[0] - h.stockCost)} to ${naira(h.revenue[1] - h.stockCost)} profit`, target: { type: id === 'snacks' ? 'locker' : 'counter' }, cost: { ...SLOT, money: h.stockCost }, ...ok(canHustle(d, id, place)) });
    } else {
      add({ id: `setup:${id}`, kind: 'setup', label: `Start a new hustle: ${h.name}`, detail: h.blurb, target: { type: 'counter' }, cost: { money: h.setupCost }, ...ok(canSetUp(d, id)) });
    }
  }

  // Your room.
  if (place.type === 'hostel_room') {
    if (isOwnRoom(d, placeId)) {
      add({ id: 'sleep', kind: 'sleep', label: 'Sleep till morning', target: { type: 'bed', id: 'bed-1' }, cost: SLOT, ...(slot === 3 ? yes : no('Sleep is for the night; take a nap')) });
      add({ id: 'nap', kind: 'nap', label: 'Take a nap', target: { type: 'bed', id: 'bed-1' }, cost: SLOT, ...(slot === 3 ? no('It is night: sleep properly') : yes) });
      for (const [item, count] of Object.entries(d.inventory)) {
        const food = SHOP_ITEMS[item]?.food;
        if (!food || count <= 0) continue;
        add({ id: `food:${item}`, kind: 'cook', label: `${food.cook ? 'Cook' : 'Eat'} ${item.replace('_', ' ')} (${count} left)`, target: { type: food.cook ? 'stove' : 'locker' }, ...ok(canEatProvision(d, item, food)) });
      }
      if (d.room.levy) add({ id: 'levy', kind: 'levy', label: `Pay the room levy (${naira(d.room.levy)})`, target: { type: 'locker' }, cost: { money: d.room.levy }, ...(d.money >= d.room.levy ? yes : no('Not enough money')) });
      add({ id: 'errands', kind: 'errands', label: 'Run errands for seniors', detail: '₦400. Always available.', target: { type: 'door' }, cost: SLOT, ...(slot === 3 ? no('Everyone is asleep') : yes) });
    }
  }

  // Clinics.
  if (place.type === 'clinic') {
    const price = place.medicalCentre ? TREATMENT.medicalCentre : TREATMENT.sickBay;
    add({ id: 'treat', kind: 'treat', label: `See the doctor (${naira(price)})`, detail: d.ill ? 'You are sick' : 'A check-up and some drugs', target: { type: 'desk' }, cost: { ...SLOT, money: price }, ...(d.needs.health >= 90 && !d.ill ? no('You are healthy') : yes) });
  }

  // The sports complex.
  if (place.type === 'field') {
    const weekend = isWeekend(d.clock.day);
    add({ id: 'hangout', kind: 'hangout', label: 'Hang out with friends', detail: '₦500 for drinks · less stress, more friends', target: { type: 'bench' }, cost: { ...SLOT, money: 500 }, ...(slot === 2 || weekend ? (d.money >= 500 ? yes : no('You need ₦500')) : no('Friends hang out in the evening (any time at weekends)')) });
    add({ id: 'exercise', kind: 'exercise', label: 'Exercise round the track', target: { type: 'bench' }, cost: SLOT, ...(slot === 3 ? no('Too dark') : d.needs.energy < 20 ? no('Too tired') : yes) });
    if (d.goals.ambition === 'su_president') {
      add({ id: 'campaign', kind: 'campaign', label: 'Campaign: posters and handshakes', detail: '₦1,000', target: { type: 'board' }, cost: { ...SLOT, money: 1000 }, ...(d.money >= 1000 && slot <= 2 ? yes : no(slot > 2 ? 'Nobody is around' : 'You need ₦1,000')) });
    }
  }

  // People here.
  for (const o of getOccupants(d, placeId)) {
    const role = getPerson(o.personId)?.role;
    if (role === 'lecturer') continue;
    add({ id: `talk:${o.personId}`, kind: 'talk', label: `Talk to ${o.name}`, target: { type: 'person', id: o.personId }, ...ok(canTalk(d, o.personId)) });
    for (const f of favoursFor(d, o.personId)) {
      add({ id: `favour:${o.personId}:${f.id}`, kind: 'favour', label: f.label, target: { type: 'person', id: o.personId }, cost: { ...(f.slot ? SLOT : {}), ...(f.cost ? { money: f.cost } : {}) }, available: f.available, reason: f.reason });
    }
  }

  add({ id: 'wait', kind: 'wait', label: `Wait here (let the ${slotName(d.clock).toLowerCase()} pass)`, target: { type: 'bench' }, cost: SLOT, ...yes });
  return list;
}

/** True if something useful (not just waiting) can be done here now. */
export function placeHasSomethingNow(d: GameState, placeId: string): boolean {
  return getInteractions(d, placeId).some((i) => i.available && i.kind !== 'wait' && i.kind !== 'talk');
}

// ---------- doing it ----------

function doInteraction(d: GameState, r: import('./rng').Rng, i: Interaction, place: PlaceDef): void {
  const [, arg = '', arg2 = ''] = i.id.split(':');
  switch (i.kind) {
    case 'attend':
    case 'test': {
      const course = d.academics.courses.find((c) => c.code === arg)!;
      const arrived = d.flags.arrived === stamp(d.clock);
      const outside = course.kind === 'gst' && !gstSeatFree(d, r, arrived);
      attendMut(d, r, arg, outside);
      d.needs.energy = clamp(d.needs.energy - 6);
      d.needs.stress = clamp(d.needs.stress + (i.kind === 'test' ? 6 : 2));
      break;
    }
    case 'exam':
      writeExamMut(d, r, arg);
      d.needs.energy = clamp(d.needs.energy - 8);
      break;
    case 'orientation':
      d.academics.orientation = true;
      addRel(d, 'tobi', 4);
      addRel(d, 'dami', 3);
      addRel(d, 'osaze', 3);
      log(d, 'Orientation: matriculation rules, "no cultism", a long prayer and free biscuits. You made some friends.');
      break;
    case 'read':
      readMut(d, arg, place.type === 'library' ? 'library' : 'room');
      d.needs.energy = clamp(d.needs.energy - 8);
      d.needs.stress = clamp(d.needs.stress + 3);
      break;
    case 'assignment':
      assignmentMut(d, r, arg);
      d.needs.energy = clamp(d.needs.energy - 8);
      d.needs.stress = clamp(d.needs.stress + 3);
      break;
    case 'handout': {
      const course = d.academics.courses.find((c) => c.code === arg)!;
      if (spend(d, course.handout.price)) buyHandoutMut(d, arg);
      break;
    }
    case 'project':
      writeProjectMut(d);
      d.needs.energy = clamp(d.needs.energy - 10);
      d.needs.stress = clamp(d.needs.stress + 3);
      break;
    case 'supervisor':
      meetSupervisorMut(d, r);
      break;
    case 'plead':
      if (r.chance(0.45 + officerRel(d, 'college_office') / 200)) {
        coverAttendanceMut(d, arg);
        log(d, `The College Office accepted your explanation. Your ${arg} attendance bar is lifted. Do not try it again.`);
      } else log(d, `"Attendance is attendance." The College Office did not budge on ${arg}.`);
      break;
    case 'office':
      visitOfficeMut(d, r, arg as OfficeId);
      d.needs.energy = clamp(d.needs.energy - 5);
      d.needs.stress = clamp(d.needs.stress + 3);
      break;
    case 'debit':
      resolveDebitMut(d, r, i.id.slice('debit:'.length), officerRel(d, 'bursary') / 200);
      break;
    case 'issue':
      resolveIssueMut(d, r, i.id.slice('issue:'.length), 0);
      break;
    case 'allocation':
      collectAllocationMut(d, r);
      break;
    case 'library':
      registerLibraryMut(d);
      break;
    case 'eat': {
      const dish = getMenu(d, place.id).find((x) => x.id === arg)!;
      eatMut(d, dish, dish.price);
      break;
    }
    case 'buy': {
      const item = SHOP_ITEMS[arg]!;
      if (!spend(d, item.price)) break;
      if (arg === 'padlock') d.room.padlock = true;
      if (arg === 'paracetamol') applyEffects(d, { health: 6, stress: -2 });
      else if (arg === 'vitamins') applyEffects(d, { health: 12 });
      else if (arg === 'haircut') applyEffects(d, { stress: -5 });
      else if (arg === 'laundry') applyEffects(d, { stress: -4 });
      else if (arg === 'airtime') d.flags.data = d.clock.dayCount;
      else d.inventory[arg] = (d.inventory[arg] ?? 0) + (item.pack ?? 1);
      log(d, `You bought ${item.name.toLowerCase()} for ${naira(item.price)}.`);
      break;
    }
    case 'wash_plates':
      washPlatesMut(d);
      break;
    case 'errands':
      errandsMut(d);
      break;
    case 'sleep':
      sleepMut(d, r);
      break;
    case 'nap':
      napMut(d);
      break;
    case 'cook': {
      const food = SHOP_ITEMS[arg]!.food!;
      eatProvisionMut(d, arg, food);
      break;
    }
    case 'levy':
      payLevyMut(d);
      break;
    case 'hustle':
      hustleMut(d, r, arg as never);
      break;
    case 'setup':
      setUpMut(d, arg as never);
      break;
    case 'treat':
      treatMut(d, place.medicalCentre ? TREATMENT.medicalCentre : TREATMENT.sickBay);
      break;
    case 'hangout':
      spend(d, 500);
      applyEffects(d, { stress: -15, energy: -6, rel: { coursemate: 2 } });
      log(d, 'You hung out with friends at the Sports Complex: gist, suya and too much laughing.');
      break;
    case 'exercise':
      applyEffects(d, { health: 5, energy: -10, stress: -8 });
      log(d, 'You jogged round the track. Your legs are complaining but your head is clear.');
      break;
    case 'campaign':
      spend(d, 1000);
      d.goals.campaign += 5;
      applyEffects(d, { rel: { coursemate: 2, course_rep: 1 }, energy: -6 });
      log(d, 'You campaigned: posters up, hands shaken, promises made.');
      break;
    case 'talk':
      talkMut(d, r, arg);
      break;
    case 'favour':
      doFavourMut(d, r, arg, i.id.split(':').slice(2).join(':') || arg2);
      break;
    case 'wait':
      log(d, `You waited while the ${slotName(d.clock).toLowerCase()} passed.`);
      break;
    default:
      break;
  }
}

/** Does one interaction at a place. Returns the new state (unchanged if not allowed). */
export function performInteraction(state: GameState, placeId: string, interactionId: string): GameState {
  return produce(state, (d, r) => {
    const place = getPlace(placeId);
    const i = place && getInteractions(d, placeId).find((x) => x.id === interactionId);
    if (!place || !i || !i.available || d.pendingEvent) return;
    d.location = { placeId, sectionId: place.sectionId };
    doInteraction(d, r, i, place);
    const slots = i.cost?.slots ?? 0;
    if (slots > 0 && i.kind !== 'wait') maybeEventMut(d, r, place.type, placeId);
    advance(d, r, slots);
    checkClearanceDone(d);
    checkObjectivesMut(d);
  });
}

// ---------- getting around ----------

export interface TravelOption {
  mode: TravelMode;
  label: string;
  detail: string;
  cost: { money?: number; slots?: number };
  available: boolean;
  reason?: string;
}

export function fare(d: GameState, mode: 'keke' | 'cab'): number {
  return Math.round((FARES[mode] * (modifiers(d).fare ?? 1)) / 50) * 50;
}

export function travelOptions(d: GameState, toPlaceId: string): TravelOption[] {
  const to = getPlace(toPlaceId);
  if (!to) return [];
  const across = to.sectionId !== d.location.sectionId;
  const walk: TravelOption = across
    ? { mode: 'walk', label: 'Walk there', detail: 'Free, but it takes the whole slot', cost: { slots: 1 }, available: true }
    : { mode: 'walk', label: 'Walk there', detail: 'Free and quick: same part of campus', cost: {}, available: true };
  if (!across) return [walk];
  const keke = fare(d, 'keke');
  const cab = fare(d, 'cab');
  return [
    { mode: 'keke', label: 'Take a keke', detail: `${naira(keke)} · from the keke park`, cost: { money: keke }, ...(d.clock.slot === 3 ? no('No kekes at night') : d.money < keke ? no(`You need ${naira(keke)}`) : yes) },
    { mode: 'cab', label: 'Call a cab', detail: `${naira(cab)} · door to door`, cost: { money: cab }, ...(d.money < cab ? no(`You need ${naira(cab)}`) : yes) },
    walk,
  ];
}

/** Moves the player to a place. Inside one section it is free; across sections it costs a fare or a slot. */
export function travel(state: GameState, toPlaceId: string, mode: TravelMode): GameState {
  return produce(state, (d, r) => {
    const to = getPlace(toPlaceId);
    if (!to || d.pendingEvent) return;
    const opt = travelOptions(d, toPlaceId).find((o) => o.mode === mode);
    if (!opt || !opt.available) return;
    const across = to.sectionId !== d.location.sectionId;
    d.location = { placeId: toPlaceId, sectionId: to.sectionId };
    if (!across) return;
    if (mode === 'keke' || mode === 'cab') {
      spend(d, opt.cost.money ?? 0);
      if (mode === 'keke') d.stats.kekeRides += 1;
      else d.stats.cabRides += 1;
      d.flags.arrived = stamp(d.clock);
      log(d, `${mode === 'keke' ? 'Keke' : 'Cab'} to ${to.name}: ${naira(opt.cost.money ?? 0)}.`);
      maybeEventMut(d, r, 'busstop', toPlaceId);
      return;
    }
    d.stats.longWalks += 1;
    d.needs.energy = clamp(d.needs.energy - 6);
    log(d, `You trekked to ${to.name}. Long walk, free ride.`);
    maybeEventMut(d, r, 'busstop', toPlaceId);
    advance(d, r, 1);
    d.flags.arrived = stamp(d.clock);
  });
}

// ---------- other public actions ----------

export function chooseEvent(state: GameState, index: number): GameState {
  return produce(state, (d, r) => {
    chooseEventMut(d, index);
    if (d.lostSlots > 0) advance(d, r, 0);
  });
}

export function answerChat(state: GameState, threadId: string, messageId: number, index: number): GameState {
  return produce(state, (d) => answerMut(d, threadId, messageId, index, (e) => applyEffects(d, e)));
}

export function markChatRead(state: GameState, threadId: string): GameState {
  if (!state.chat.threads[threadId]?.unread) return state;
  return produce(state, (d) => markReadMut(d, threadId));
}

export function payFee(state: GameState, id: FeeId): GameState {
  return produce(state, (d, r) => {
    portalPayMut(d, r, id);
    checkClearanceDone(d);
  });
}

export function registerCourses(state: GameState): GameState {
  return produce(state, (d, r) => {
    portalRegisterMut(d, r);
  });
}

/** Brings the campus-wide event up to date with the real date (the store passes Date.now()). */
export function syncCampusWeek(state: GameState, nowMs: number): GameState {
  const copy = structuredClone(state);
  return syncCampusWeekMut(copy, nowMs) ? copy : state;
}

export function dismissSummary(state: GameState): GameState {
  if (!state.summaries.length) return state;
  return produce(state, (d) => {
    d.summaries.shift();
  });
}

export function setCharacter(state: GameState, characterId: string): GameState {
  return produce(state, (d) => {
    d.player.characterId = characterId;
  });
}

/** Where to go for the clinic when sick, and similar shortcuts for the UI. */
export function shortcutPlace(kind: PlaceType): string | null {
  if (kind === 'clinic') return medicalCentre().id;
  return null;
}

export function collegeOf(d: GameState) {
  return getCollege(collegeId(d));
}

export { barred };
