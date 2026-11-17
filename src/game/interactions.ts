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
  OFFICE_OPEN,
  beforeOfficeHours,
  canCollectAllocation,
  canRegisterLibrary,
  canVisitOffice,
  checkClearanceDone,
  collectAllocationMut,
  officeMinutes,
  officesOpen,
  officeQueue,
  officerRel,
  officeName,
  registerLibraryMut,
  visitOfficeMut,
} from './clearance';
import { answerMut, markReadMut } from './chat';
import { ASSIGNMENT, BANK_LOAN, DRIVE_FUEL, ERRAND_PAY, WASH_PLATES_PAY, FARES, HOSPITAL_TREATMENT, ORIENTATION_DAYS, PHONE, TOWN_TRIP } from './config';
import { clamp, log, produce } from './draft';
import { storyRewardsMut } from './story';
import { offerTalkQuestMut } from './quests';
import { countMut } from './questState';
import { classState, classWindow, firstClassOn } from './periods';
import { EXAM_FORM_DAYS, EXAM_FORM_LATE_FEE, dayLabel } from './calendar';
import { addDataMut, askParentMut, canBuyData, chargeMut, overnightChargeMut, phoneProblem, usePhoneMut, type AskReason } from './phone';
import { addRel, applyEffects } from './effects';
import { addMinutes, advance } from './engine';
import { chooseEventMut, maybeEventMut } from './events';
import { checkObjectivesMut } from './goals';
import { naira } from './format';
import { canEatProvision, eatProvisionMut, payLevyMut } from './hostel';
import { canHustle, canSetUp, errandsMut, hustleMut, setUpMut, washPlatesMut } from './hustle';
import { clearanceFormDone, feePaid, portalPayFullMut, portalPayMut, portalRegisterMut, resolveDebitMut, spend } from './money';
import { batheMut, canBathe, eatMut, napMut, sleepMut, toiletMut, TREATMENT, treatMut } from './needs';
import { canTalk, doFavourMut, favoursFor, talkMut } from './people';
import { SLOT_END, SLOT_START, clockMin, formatTime, isWeekend, minutesLeftInSlot, slotName, stamp } from './time';
import type { FeeId, GameState, OfficeId, PlaceType, TravelMode } from './types';

export type TargetType = 'seat' | 'lecturer' | 'desk' | 'counter' | 'bed' | 'locker' | 'shelf' | 'bench' | 'stove' | 'board' | 'door' | 'shower' | 'toilet' | 'copier' | 'camera' | 'printer' | 'charger' | 'person';

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
  | 'party'
  | 'vip'
  | 'chill'
  | 'movie'
  | 'owambe'
  | 'bank_loan'
  | 'bath'
  | 'toilet'
  | 'charge'
  | 'wait_open'
  | 'exam_form'
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
  /** For quick things: how many minutes it takes (else the usual for its kind). */
  minutes?: number;
  /** You choose how many (photocopies): price per one, and the most at a time. */
  qty?: { unit: number; max: number };
  /** Short chips for what it does to you ('+Energy', '-Hunger'...). */
  effects?: string[];
}

/** What each kind of action does, shown as chips on the action cards. */
const EFFECTS: Partial<Record<InteractionKind, string[]>> = {
  attend: ['+Knowledge', '-Energy'],
  test: ['+Marks', '-Energy', '+Stress'],
  exam: ['+Grade', '-Energy', '+Stress'],
  orientation: ['+Know-how', '+Friends'],
  read: ['+Knowledge', '-Energy'],
  assignment: ['+Marks', '-Energy'],
  handout: ['+Knowledge'],
  project: ['+Project', '-Energy'],
  supervisor: ['+Approval'],
  plead: ['+Attendance?'],
  office: ['+Signature'],
  debit: ['+Fees fixed'],
  issue: ['+Grade fixed'],
  allocation: ['+Bed space'],
  library: ['+Library card'],
  eat: ['-Hunger', '+Energy'],
  buy: ['+Item'],
  wash_plates: [`+${naira(WASH_PLATES_PAY)}`, '-Hunger', '-Hygiene'],
  errands: [`+${naira(ERRAND_PAY)}`, '-Energy'],
  sleep: ['+Energy', '-Stress'],
  nap: ['+Energy'],
  cook: ['-Hunger'],
  levy: ['+Peace'],
  hustle: ['+Money', '-Energy'],
  setup: ['+Hustle'],
  treat: ['+Health'],
  talk: ['+Friendship'],
  favour: ['+Friendship'],
  hangout: ['-Stress', '+Friends'],
  exercise: ['+Health', '-Stress', '-Hygiene'],
  campaign: ['+Votes', '-Energy'],
  party: ['-Stress', '+Fame', '-Energy', '-Hygiene'],
  vip: ['+Fame', '-Stress'],
  chill: ['-Stress', '+Friends'],
  movie: ['-Stress'],
  owambe: ['-Hunger', '-Stress', '+Friends'],
  bank_loan: [`+${naira(BANK_LOAN.amount)}`, 'Debt'],
  bath: ['+Hygiene', '-Stress'],
  toilet: ['-Bladder'],
  wait: [],
};

/** How many minutes the quick things take (things that do not use up a part of the day). */
export const QUICK_MINUTES: Partial<Record<InteractionKind, number>> = {
  bath: 15,
  toilet: 5,
  eat: 20,
  buy: 5,
  cook: 35,
  levy: 2,
  talk: 10,
  favour: 10,
  setup: 30,
  handout: 5,
  bank_loan: 20,
  charge: 60,
};

/** How long an action takes from now, in minutes (a slot action runs to the end of the part of the day). */
export function actionMinutes(d: GameState, i: Interaction): number {
  if (i.cost?.slots) {
    let left = minutesLeftInSlot(d.clock);
    for (let k = 1; k < i.cost.slots; k++) left += SLOT_END[(d.clock.slot + k) % 4]! - SLOT_START[(d.clock.slot + k) % 4]!;
    return left;
  }
  return i.minutes ?? QUICK_MINUTES[i.kind] ?? 10;
}

/** Business-centre services and where in the room they are done. */
const SERVICE_TARGET: Partial<Record<string, TargetType>> = { photocopy: 'copier', passport: 'camera', receipt: 'printer', course_form: 'printer' };

/** Flag for this semester's exam form. */
export function examFormKey(d: GameState): string {
  return `examform_${d.clock.year}_${d.clock.semester}`;
}

/** Some actions leave you sweaty. */
const HYGIENE_COST: Partial<Record<InteractionKind, number>> = { exercise: 25, party: 25, wash_plates: 15, hustle: 8, errands: 10, owambe: 15, campaign: 10 };

/** Places nearer than this (metres) are walking distance. */
const CLOSE_BY = 70;

/** Nothing fun before you are a proper student: clearance first. */
export function stillClearing(d: GameState): boolean {
  return d.clearance.active && !clearanceFormDone(d);
}

/** Places with a public toilet. */
const TOILET_PLACES: PlaceType[] = ['lecture_hall', 'library', 'admin_office', 'restaurant', 'clinic', 'nightlife', 'workplace', 'field'];

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
export function officesAt(d: GameState, placeId: string): OfficeId[] {
  const place = getPlace(placeId);
  return place ? officesHere(d, place) : [];
}

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

export function getShop(state: GameState, placeId: string): ShopItem[] {
  const place = getPlace(placeId);
  return (place?.stock ?? [])
    .filter((id) => id !== 'manual' || manualDropped(state))
    .map((id) => SHOP_ITEMS[id]!)
    .filter(Boolean);
}

/** The practical manual is only on sale once a lecturer drops it at the business centre. */
export function manualDropped(d: GameState): boolean {
  return !!d.flags[`manual_${d.clock.year}_${d.clock.semester}`];
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
  if (place.bank && slot <= 1) add('bank_officer', { type: 'desk' });
  if (place.type === 'nightlife' && slot >= 2) {
    add('dami', { type: 'bench' });
    add('osaze', { type: 'bench' });
    if (place.venue === 'club') add('tega', { type: 'counter' });
    if (place.venue === 'cinema' || place.venue === 'lounge') add('ejiro', { type: 'seat' });
  }
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
    // Roommates live their own lives: asleep, reading at their desk, cooking.
    d.room.roommates.forEach((id, i) => {
      const traits = getPerson(id)?.traits ?? [];
      const bed = { type: 'bed' as const, id: `bed-${i + 2}` };
      const desk = { type: 'desk' as const, id: `desk-${i + 2}` };
      if (slot === 3) {
        if (!traits.includes('night_crawler')) add(id, bed);
      } else if (slot === 0) {
        add(id, i === 1 || traits.includes('reader') ? desk : bed);
      } else if (slot === 1) {
        if (i === 2 || traits.includes('reader')) add(id, desk);
      } else if (i === 0) add(id, { type: 'stove', id: 'stove' });
      else if (i === 1 || traits.includes('reader')) add(id, desk);
      else add(id, bed);
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
    const win = classWindow(course, meeting);
    const state = classState(d, course, meeting);
    const when = `${formatTime(win.start)}–${formatTime(win.end)}`;
    add({
      id: `attend:${course.code}`,
      kind: meeting.test ? 'test' : 'attend',
      label,
      detail: [
        state === 'on' ? `Started at ${formatTime(win.start)}: you are late` : when,
        course.kind === 'gst' ? 'The hall is packed: come early to get a seat.' : meeting.moved ? 'Moved here at short notice.' : '',
        meeting.assign && course.assignmentSet === null ? 'The lecturer is giving an assignment today' : '',
      ]
        .filter(Boolean)
        .join(' · '),
      target: { type: 'seat' },
      cost: SLOT,
      ...(meeting.attended ? no('Already here') : state === 'over' ? no(`It ended at ${formatTime(win.end)}`) : yes),
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
      if (can.ok) add({ id: `assignment:${c.code}`, kind: 'assignment', label: `Do the ${c.code} assignment`, detail: `Due ${dayLabel(d, c.assignmentDue)}, ${formatTime(c.assignmentDueMin ?? ASSIGNMENT.dueMin)}`, target: { type: 'desk' }, minutes: 45, ...yes });
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
        minutes: officeMinutes(d, office),
        ...ok(canVisitOffice(d, office)),
      });
    }
    if (office === 'bursary') {
      for (const debit of d.finance.debits) {
        add({ id: `debit:${debit.id}`, kind: 'debit', label: `Show your bank alert (${naira(debit.amount)} not recorded)`, target: { type: 'desk', id: office }, minutes: 30 + getQueueLength(d, placeId) * 5, ...(slot <= 1 && !isWeekend(d.clock.day) ? yes : no('The Bursary is closed now')) });
      }
    }
    for (const issue of a.issues.filter((i) => i.officeId === office)) {
      add({ id: `issue:${issue.id}`, kind: 'issue', label: `${issue.kind === 'missing_script' ? 'Report your missing script' : 'Complain about a wrong grade'}: ${issue.code}`, target: { type: 'desk', id: office }, minutes: 30 + getQueueLength(d, placeId) * 5, ...(slot <= 1 && !isWeekend(d.clock.day) ? yes : no('Closed now')) });
    }
    if (office === 'student_affairs' && d.clearance.active && !d.clearance.allocation) {
      add({ id: 'allocation', kind: 'allocation', label: 'Collect your hostel allocation', target: { type: 'desk', id: office }, minutes: 30 + getQueueLength(d, placeId) * 5, ...ok(canCollectAllocation(d)) });
    }
    if (office === 'college_office') {
      for (const c of a.courses.filter((x) => !x.covered && x.meetings.length && attendance(d, x).pct < 0.75)) {
        add({ id: `plead:${c.code}`, kind: 'plead', label: `Plead about your ${c.code} attendance`, detail: 'Bring a good story. It may or may not work.', target: { type: 'desk', id: office }, minutes: 30 + getQueueLength(d, placeId) * 5, ...(slot <= 1 && !isWeekend(d.clock.day) ? yes : no('Closed now')) });
      }
      if (a.project && !a.project.defended) {
        add({ id: 'supervisor', kind: 'supervisor', label: `Meet your supervisor, ${getPerson(a.project.supervisorId)?.name}`, target: { type: 'person', id: a.project.supervisorId }, cost: SLOT, ...(a.project.awaiting ? yes : no('Write the next chapter first')) });
      }
    }
  }

  // Food.
  for (const dish of getMenu(d, placeId)) {
    add({
      id: `eat:${dish.id}`,
      kind: 'eat',
      label: `${dish.name}`,
      target: { type: 'counter' },
      cost: { money: dish.price },
      minutes: dish.minutes ?? (dish.snack ? 5 : 20),
      effects: [`+${dish.energy ?? 0} Energy`, `-${dish.fills} Hunger`],
      ...(d.money >= dish.price ? yes : no(`You need ${naira(dish.price)}`)),
    });
  }
  if (place.type === 'restaurant') {
    add({ id: 'wash_plates', kind: 'wash_plates', label: 'Wash plates for cash and a free plate', detail: `${naira(WASH_PLATES_PAY)} and a meal`, target: { type: 'counter' }, cost: SLOT, ...(slot === 3 ? no('Closed at night') : yes) });
  }
  for (const item of getShop(d, placeId)) {
    // Printing the acceptance receipt and admission letter needs the fee paid; the course form needs registration.
    const needsAcceptance = item.id === 'receipt' && !feePaid(d, 'acceptance') && !d.flags.acceptance_paid;
    const needsRegistration = item.id === 'course_form' && !d.academics.registered;
    const service = SERVICE_TARGET[item.id];
    add({
      id: `buy:${item.id}`,
      kind: 'buy',
      label: service ? `Pay for ${item.id === 'photocopy' ? 'photocopies' : item.name.toLowerCase()}` : `Buy ${item.name.toLowerCase()}`,
      target: { type: service ?? 'counter' },
      cost: { money: item.price },
      ...(item.id === 'photocopy' ? { qty: { unit: item.price, max: 20 } } : {}),
      ...(needsAcceptance
        ? no('Pay the acceptance fee on the portal first')
        : needsRegistration
          ? no('Register your courses first')
        : (item.id === 'padlock' && d.room.padlock) || (item.id === 'car' && d.inventory.car) || (item.decor && d.inventory[item.id])
          ? no('You already have one')
          : d.money >= item.price
            ? yes
            : no(`You need ${naira(item.price)}`)),
    });
  }
  // Business centres charge phones for a small fee.
  if (place.stock?.includes('photocopy')) {
    add({ id: 'charge', kind: 'charge', label: `Charge your phone (${naira(PHONE.shopCharge)})`, detail: `Battery ${Math.round(d.phone?.battery ?? 100)}%`, target: { type: 'charger' }, cost: { money: PHONE.shopCharge }, ...((d.phone?.battery ?? 100) >= 100 ? no('Already full') : d.money < PHONE.shopCharge ? no(`You need ${naira(PHONE.shopCharge)}`) : yes) });
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
      const bath = canBathe(d);
      add({ id: 'bath', kind: 'bath', label: d.room.water ? 'Take a bucket bath' : 'Bathe with sachet water', detail: `Hygiene ${Math.round(d.needs.hygiene)}%`, target: { type: 'shower' }, ...(d.needs.hygiene >= 95 ? no('You are already fresh') : ok(bath)) });
      add({ id: 'toilet', kind: 'toilet', label: 'Use the toilet', target: { type: 'toilet' }, ...(d.needs.bladder < 10 ? no('You do not need to go') : yes) });
      add({ id: 'charge', kind: 'charge', label: 'Charge your phone', detail: `Battery ${Math.round(d.phone?.battery ?? 100)}%`, target: { type: 'desk' }, ...(!d.room.light ? no('No light in the hostel (NEPA)') : (d.phone?.battery ?? 100) >= 100 ? no('Already full') : yes) });
      const night = slot === 3 ? yes : no('Sleep is for the night; take a nap');
      const alarm = d.flags.alarm_set;
      const first = firstClassOn(d, d.clock.day + 1);
      const firstText = first ? ` · first: ${first.code} at ${formatTime(first.start)}` : '';
      add({ id: 'sleep', kind: 'sleep', label: 'Sleep till morning', detail: (alarm ? `Alarm set for ${formatTime(alarm)}` : 'No alarm set (set one on your phone): you might oversleep') + firstText, target: { type: 'bed', id: 'bed-1' }, cost: SLOT, ...night });
      const day = slot === 3 ? no('It is night: sleep properly') : yes;
      add({ id: 'nap:30', kind: 'nap', label: 'Power nap', target: { type: 'bed', id: 'bed-1' }, minutes: 30, ...day });
      add({ id: 'nap:60', kind: 'nap', label: 'Nap for an hour', target: { type: 'bed', id: 'bed-1' }, minutes: 60, ...day });
      add({ id: 'nap', kind: 'nap', label: `Nap till ${slotName((slot + 1) % 4).toLowerCase()}`, target: { type: 'bed', id: 'bed-1' }, cost: SLOT, ...day });
      for (const [item, count] of Object.entries(d.inventory)) {
        const food = SHOP_ITEMS[item]?.food;
        if (!food || count <= 0) continue;
        add({
          id: `food:${item}`,
          kind: 'cook',
          label: `${food.cook ? 'Cook' : 'Eat'} ${item.replace('_', ' ')} (${count} left)`,
          target: { type: food.cook ? 'stove' : 'locker' },
          minutes: food.cook ? 35 : 10,
          effects: [`+${food.energy ?? 0} Energy`, `-${food.fills} Hunger`],
          ...ok(canEatProvision(d, item, food)),
        });
      }
      if (!Object.entries(d.inventory).some(([k, n]) => n > 0 && SHOP_ITEMS[k]?.food?.cook)) {
        add({ id: 'cook_hint', kind: 'cook', label: 'Cook a meal', detail: 'Buy rice, beans, noodles or eggs at the market or the provision shop first', target: { type: 'stove' }, minutes: 35, ...no('Nothing to cook: buy provisions first') });
      }
      if (d.room.levy) add({ id: 'levy', kind: 'levy', label: `Pay the room levy (${naira(d.room.levy)})`, target: { type: 'locker' }, cost: { money: d.room.levy }, ...(d.money >= d.room.levy ? yes : no('Not enough money')) });
    }
  }

  // Clinics.
  if (place.type === 'clinic') {
    const price = place.hospital ? HOSPITAL_TREATMENT : place.medicalCentre ? TREATMENT.medicalCentre : TREATMENT.sickBay;
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

  // Night life.
  if (place.type === 'nightlife') {
    const weekend = isWeekend(d.clock.day);
    const night = slot === 3;
    const money = (n: number) => (d.money >= n ? yes : no(`You need ${naira(n)}`));
    switch (place.venue) {
      case 'club':
        add({ id: 'party', kind: 'party', label: 'Party on the dance floor', detail: 'Entry and drinks · stress melts, energy goes', target: { type: 'bench' }, cost: { ...SLOT, money: 3000 }, ...(night || (weekend && slot === 2) ? money(3000) : no('The club opens at night (and weekend evenings)')) });
        add({ id: 'vip', kind: 'vip', label: 'Book a VIP table', detail: 'Everybody will know your name tomorrow', target: { type: 'counter' }, cost: { ...SLOT, money: 15000 }, ...(night ? money(15000) : no('VIP opens at night')) });
        break;
      case 'lounge':
        add({ id: 'chill', kind: 'chill', label: 'Chill with drinks and music', target: { type: 'bench' }, cost: { ...SLOT, money: 1500 }, ...(slot >= 2 ? money(1500) : no('The lounge opens in the evening')) });
        break;
      case 'cinema':
        add({ id: 'movie', kind: 'movie', label: 'Watch the latest Nollywood blockbuster', target: { type: 'seat' }, cost: { ...SLOT, money: 2000 }, ...(slot >= 1 ? money(2000) : no('First show is in the afternoon')) });
        break;
      case 'event_centre':
        add({ id: 'owambe', kind: 'owambe', label: 'Join the owambe (free food!)', detail: 'Somebody is celebrating. Dress well and dance', target: { type: 'counter' }, cost: SLOT, ...(weekend && slot >= 1 ? yes : no('Parties hold at weekends, afternoon to night')) });
        break;
    }
  }

  // The bank: a small student loan.
  if (place.bank) {
    const owing = d.loans.some((l) => l.personId === 'bank_officer');
    add({
      id: 'bank_loan',
      kind: 'bank_loan',
      label: `Take a student loan of ${naira(BANK_LOAN.amount)}`,
      detail: `Pay back ${naira(BANK_LOAN.repay)} within ${BANK_LOAN.days} days`,
      target: { type: 'desk' },
      cost: SLOT,
      ...(owing ? no('Pay back your current loan first') : slot <= 1 && !isWeekend(d.clock.day) ? yes : no('The bank is open weekday mornings and afternoons')),
    });
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

  // Exam forms are signed at the College Office before exams.
  if (officesHere(d, place).includes('college_office') && d.academics.registered && !d.flags[examFormKey(d)] && d.clock.day <= EXAM_FORM_DAYS[EXAM_FORM_DAYS.length - 1]!) {
    const open = EXAM_FORM_DAYS.includes(d.clock.day);
    add({ id: 'exam_form', kind: 'exam_form', label: 'Sign your exam form', detail: `Signing runs ${EXAM_FORM_DAYS.length} days before exams`, target: { type: 'desk', id: 'college_office' }, minutes: officeMinutes(d, 'college_office'), ...(!open ? no('Signing has not started yet') : !officesOpen(d) ? no(beforeOfficeHours(d) ? 'Opens at 8:00 am' : 'The office is closed now') : yes) });
  }

  // Early at an office: sit and wait for 8:00.
  if (officesHere(d, place).length && beforeOfficeHours(d)) {
    const mins = OFFICE_OPEN - clockMin(d.clock);
    add({ id: 'wait_open', kind: 'wait_open', label: 'Wait for the offices to open', detail: `They open at 8:00 am`, target: { type: 'bench' }, minutes: mins, ...yes });
  }

  if (TOILET_PLACES.includes(place.type)) {
    const paid = place.sectionId === 'town' ? 50 : 0;
    add({ id: 'toilet', kind: 'toilet', label: paid ? 'Use the toilet (₦50)' : 'Use the public toilet', target: { type: 'toilet' }, ...(paid ? { cost: { money: paid } } : {}), ...(d.needs.bladder < 10 ? no('You do not need to go') : d.money < paid ? no('You need ₦50') : yes) });
  }

  add({ id: 'wait', kind: 'wait', label: `Wait here (let the ${slotName(d.clock).toLowerCase()} pass)`, target: { type: 'bench' }, cost: SLOT, ...yes });
  if (place.type === 'nightlife' && stillClearing(d)) {
    for (const i of list) if (i.kind !== 'wait' && i.kind !== 'toilet' && i.kind !== 'talk') Object.assign(i, no('Finish your clearance first. You are not even a student yet'));
  }
  for (const i of list) i.effects ??= EFFECTS[i.kind];
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
      if (!d.flags[examFormKey(d)]) {
        spend(d, Math.min(d.money, EXAM_FORM_LATE_FEE));
        d.flags[examFormKey(d)] = d.clock.dayCount;
        log(d, `You never signed your exam form. The invigilator collected a ${naira(EXAM_FORM_LATE_FEE)} late fee before letting you in.`);
      }
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
      const qty = i.qty ? Math.max(1, Math.min(i.qty.max, Number(arg2) || 1)) : 1;
      if (!spend(d, item.price * qty)) break;
      if (qty > 1) {
        d.inventory[arg] = (d.inventory[arg] ?? 0) + qty * (item.pack ?? 1);
        log(d, `You paid ${naira(item.price * qty)} for ${qty} ${item.id === 'photocopy' ? 'photocopies' : item.name.toLowerCase()}.`);
        break;
      }
      if (arg === 'padlock') d.room.padlock = true;
      if (arg === 'paracetamol') applyEffects(d, { health: 6, stress: -2 });
      else if (arg === 'vitamins') applyEffects(d, { health: 12 });
      else if (arg === 'haircut') applyEffects(d, { stress: -5 });
      else if (arg === 'laundry') applyEffects(d, { stress: -4 });
      else if (arg === 'airtime') addDataMut(d);
      else if (arg === 'car') d.inventory.car = 1;
      else if (arg === 'phone_upgrade') {
        applyEffects(d, { stress: -10, rel: { coursemate: 2 } });
        d.flags.new_phone = d.clock.dayCount;
      }
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
      // The phone alarm: no oversleeping, and you are up at that hour.
      if (d.flags.alarm_set) d.flags.alarm = d.flags.alarm_set;
      break;
    case 'nap':
      napMut(d, arg ? Number(arg) / 120 : 1);
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
      treatMut(d, place.hospital ? HOSPITAL_TREATMENT : place.medicalCentre ? TREATMENT.medicalCentre : TREATMENT.sickBay);
      if (place.hospital) applyEffects(d, { health: 25 });
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
    case 'party':
      spend(d, 3000);
      applyEffects(d, { stress: -25, energy: -22, hunger: 8, rel: { coursemate: 3 } });
      d.flags.partied = d.clock.dayCount;
      log(d, 'You partied at Club Afrique till the DJ begged everybody to go home.');
      break;
    case 'vip':
      spend(d, 15000);
      applyEffects(d, { stress: -35, energy: -25, rel: { coursemate: 6, course_rep: 3, senior: 4 } });
      d.goals.campaign += 8;
      d.flags.partied = d.clock.dayCount;
      log(d, 'VIP table, sparklers, the works. Half the campus has your picture now.');
      break;
    case 'chill':
      spend(d, 1500);
      applyEffects(d, { stress: -12, energy: -4 });
      log(d, 'You chilled at the lounge with cold drinks and Afrobeats. Soft life.');
      break;
    case 'movie':
      spend(d, 2000);
      applyEffects(d, { stress: -15, energy: -3 });
      log(d, 'You watched the new Nollywood blockbuster. The twist was obvious but you still gasped.');
      break;
    case 'owambe':
      applyEffects(d, { hunger: -40, stress: -10, energy: -8, rel: { coursemate: 2 } });
      d.stats.meals += 1;
      log(d, 'You entered an owambe you were not invited to. Jollof, small chops, and you danced with the celebrant\'s aunty.');
      break;
    case 'bank_loan':
      spend(d, 0);
      d.money += BANK_LOAN.amount;
      d.finance.earned += BANK_LOAN.amount;
      d.loans.push({ id: `bank-${d.clock.dayCount}`, personId: 'bank_officer', amount: BANK_LOAN.repay, due: d.clock.dayCount + BANK_LOAN.days, playerOwes: true });
      log(d, `The bank gave you ${naira(BANK_LOAN.amount)}. Pay back ${naira(BANK_LOAN.repay)} within ${BANK_LOAN.days} days.`);
      break;
    case 'talk':
      talkMut(d, r, arg);
      break;
    case 'favour':
      doFavourMut(d, r, arg, i.id.split(':').slice(2).join(':') || arg2);
      break;
    case 'bath':
      batheMut(d);
      break;
    case 'charge':
      if (i.cost?.money) spend(d, i.cost.money);
      chargeMut(d, 1);
      break;
    case 'toilet':
      if (i.cost?.money) spend(d, i.cost.money);
      toiletMut(d);
      break;
    case 'exam_form':
      d.flags[examFormKey(d)] = d.clock.dayCount;
      log(d, 'Exam form signed and stamped. One less wahala before exams.');
      break;
    case 'wait_open':
      log(d, 'You sat on the bench until the offices opened. Early bird: the queue is short.');
      break;
    case 'wait':
      log(d, `You waited while the ${slotName(d.clock).toLowerCase()} passed.`);
      break;
    default:
      break;
  }
}

/** Counter keys for one thing done: "read", "read:CSC 101", "read@library"; a test also counts as a class. */
export function questCountKeys(kind: InteractionKind, target: string, placeType: PlaceType): string[] {
  const keys: string[] = [kind];
  if (target && ['talk', 'read', 'attend', 'test', 'hustle', 'favour', 'eat'].includes(kind)) keys.push(`${kind}:${target}`);
  if (kind === 'read') keys.push(`read@${placeType === 'library' ? 'library' : 'room'}`);
  if (kind === 'test') keys.push('attend');
  return keys;
}

/** Does one interaction on a draft (used by the public version and the simulator). Returns false if not allowed. */
export function performMut(d: GameState, r: import('./rng').Rng, placeId: string, interactionId: string): boolean {
  const place = getPlace(placeId);
  const list = place ? getInteractions(d, placeId) : [];
  let i = list.find((x) => x.id === interactionId);
  // "buy:photocopy:5": an amount chosen by the player.
  const parts = interactionId.split(':');
  if (!i && parts.length === 3) {
    const base = list.find((x) => x.id === `${parts[0]}:${parts[1]}` && x.qty);
    const qty = Math.max(1, Math.min(base?.qty?.max ?? 1, Number(parts[2]) || 1));
    if (base?.qty) i = { ...base, id: interactionId, cost: { ...base.cost, money: base.qty.unit * qty }, available: base.available && d.money >= base.qty.unit * qty };
  }
  if (!place || !i || !i.available || d.pendingEvent) return false;
  d.location = { placeId, sectionId: place.sectionId };
  doInteraction(d, r, i, place);
  // The quest log counts what you do (side quests track progress from these).
  const [, target = ''] = i.id.split(':');
  countMut(d, ...questCountKeys(i.kind, target, place.type));
  if (i.kind === 'talk') offerTalkQuestMut(d, target);
  const sweat = HYGIENE_COST[i.kind];
  if (sweat) d.needs.hygiene = clamp(d.needs.hygiene - sweat);
  if (i.kind === 'bath') d.flags.bathed = d.clock.dayCount;
  if (i.kind === 'party' || i.kind === 'vip' || i.kind === 'owambe') d.flags.party_night = d.clock.dayCount;
  const slots = i.cost?.slots ?? 0;
  if (slots > 0 && i.kind !== 'wait') maybeEventMut(d, r, place.type, placeId);
  if (slots > 0) advance(d, r, slots);
  else addMinutes(d, r, i.minutes ?? QUICK_MINUTES[i.kind] ?? 10);
  if (i.kind === 'sleep' && isOwnRoom(d, placeId)) overnightChargeMut(d);
  // You wake up as rested as you slept (the night itself does not tire you).
  if (i.kind === 'sleep' && d.flags.wake_energy) {
    d.needs.energy = Math.max(d.needs.energy, d.flags.wake_energy);
    delete d.flags.wake_energy;
  }
  if (d.flags.alarm) {
    // The alarm rang: the morning starts at that hour.
    if (d.clock.slot === 0 && d.flags.slept === d.clock.dayCount - 1 && !d.lostSlots) d.clock.min = d.flags.alarm;
    delete d.flags.alarm;
  }
  checkClearanceDone(d);
  checkObjectivesMut(d);
  storyRewardsMut(d);
  return true;
}

/** Does one interaction at a place. Returns the new state (unchanged if not allowed). */
export function performInteraction(state: GameState, placeId: string, interactionId: string): GameState {
  return produce(state, (d, r) => {
    performMut(d, r, placeId, interactionId);
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

export function fare(d: GameState, mode: 'keke' | 'cab', toTown = false): number {
  return Math.round((FARES[mode] * (modifiers(d).fare ?? 1) * (toTown ? TOWN_TRIP.fareFactor : 1)) / 50) * 50;
}

function townTrip(d: GameState, to: PlaceDef): boolean {
  return (to.sectionId === 'town') !== (d.location.sectionId === 'town');
}

export function travelOptions(d: GameState, toPlaceId: string): TravelOption[] {
  const to = getPlace(toPlaceId);
  if (!to) return [];
  const across = to.sectionId !== d.location.sectionId;
  const far = townTrip(d, to);
  if (far && to.sectionId === 'town' && stillClearing(d)) {
    const reason = 'Town can wait: finish your clearance first';
    return [
      { mode: 'keke', label: 'Take a keke', detail: 'The long road to town', cost: {}, ...no(reason) },
      { mode: 'walk', label: 'Walk there', detail: 'The long road to town', cost: {}, ...no(reason) },
    ];
  }
  const walkSlots = far ? TOWN_TRIP.walkSlots : 1;
  const walk: TravelOption = across
    ? { mode: 'walk', label: 'Walk there', detail: far ? 'Free, but the long road takes two slots' : 'Free, but it takes the whole slot', cost: { slots: walkSlots }, available: true }
    : { mode: 'walk', label: 'Walk there', detail: 'Free: it is close by', cost: {}, available: true };
  // Short hops inside one part of campus cost half the fare.
  const hop = across ? 1 : 0.5;
  const keke = Math.round((fare(d, 'keke', far) * hop) / 50) * 50;
  const cab = Math.round((fare(d, 'cab', far) * hop) / 50) * 50;
  const options: TravelOption[] = [];
  if (d.inventory.car) {
    options.push({ mode: 'drive', label: 'Drive your car', detail: `${naira(DRIVE_FUEL)} of fuel`, cost: { money: DRIVE_FUEL }, ...(d.money < DRIVE_FUEL ? no(`You need ${naira(DRIVE_FUEL)} for fuel`) : yes) });
  }
  const ride = across ? '' : ' · a short hop';
  // Right next door: no keke man will carry you that far. Just walk.
  const from = getPlace(d.location.placeId);
  const close = !across && !!from && Math.hypot(from.position[0] - to.position[0], from.position[1] - to.position[1]) < CLOSE_BY;
  if (close) {
    walk.label = 'Trek';
    walk.detail = `${to.name} is close by`;
    return [walk, { mode: 'keke', label: 'Take a keke', detail: '', cost: {}, ...no(`${to.name} is close by: walk`) }, { mode: 'cab', label: 'Call a cab', detail: '', cost: {}, ...no(`${to.name} is close by: walk`) }];
  }
  const rides: TravelOption[] = [
    { mode: 'keke', label: 'Take a keke', detail: `${naira(keke)}${ride || ' · from the keke park'}`, cost: { money: keke }, ...(d.clock.slot === 3 ? no('No kekes at night') : d.money < keke ? no(`You need ${naira(keke)}`) : yes) },
    { mode: 'cab', label: 'Call a cab', detail: `${naira(cab)} · door to door${ride}${d.clock.slot === 3 ? ' (night rides run)' : ''}`, cost: { money: cab }, ...(d.money < cab ? no(`You need ${naira(cab)}`) : yes) },
  ];
  // Close by, walking is the sensible first choice; far away, riding is.
  return across ? [...options, ...rides, walk] : [walk, ...options, ...rides];
}

/** Moves the player on a draft. Returns false if that way is not possible. */
export function travelMut(d: GameState, r: import('./rng').Rng, toPlaceId: string, mode: TravelMode): boolean {
  const to = getPlace(toPlaceId);
  if (!to || d.pendingEvent) return false;
  const opt = travelOptions(d, toPlaceId).find((o) => o.mode === mode);
  if (!opt || !opt.available) return false;
  const across = to.sectionId !== d.location.sectionId;
  d.location = { placeId: toPlaceId, sectionId: to.sectionId };
  if (!across && mode === 'walk') return true;
  if (mode === 'keke' || mode === 'cab' || mode === 'drive') {
    spend(d, opt.cost.money ?? 0);
    if (mode === 'keke') d.stats.kekeRides += 1;
    else if (mode === 'cab') d.stats.cabRides += 1;
    d.flags.arrived = stamp(d.clock);
    log(d, `${mode === 'keke' ? 'Keke' : mode === 'cab' ? 'Cab' : 'You drove'} to ${to.name}: ${naira(opt.cost.money ?? 0)}.`);
    if (across) maybeEventMut(d, r, 'busstop', toPlaceId);
    return true;
  }
  d.stats.longWalks += 1;
  d.needs.energy = clamp(d.needs.energy - 6);
  log(d, `You trekked to ${to.name}. Long walk, free ride.`);
  maybeEventMut(d, r, 'busstop', toPlaceId);
  advance(d, r, opt.cost.slots ?? 1);
  d.flags.arrived = stamp(d.clock);
  return true;
}

/** Moves the player to a place. Inside one section it is free; across sections it costs a fare or a slot. */
export function travel(state: GameState, toPlaceId: string, mode: TravelMode): GameState {
  return produce(state, (d, r) => {
    travelMut(d, r, toPlaceId, mode);
  });
}

// ---------- other public actions ----------

export function chooseEvent(state: GameState, index: number): GameState {
  return produce(state, (d, r) => {
    chooseEventMut(d, index);
    if (d.lostSlots > 0) advance(d, r, 0);
    storyRewardsMut(d);
  });
}

export function answerChat(state: GameState, threadId: string, messageId: number, index: number): GameState {
  return produce(state, (d) => {
    if (phoneProblem(d)) return;
    usePhoneMut(d, PHONE.chatData);
    answerMut(d, threadId, messageId, index, (e) => applyEffects(d, e));
    storyRewardsMut(d);
  });
}

/** Data bundle by the bank's USSD code: works with no data, not with a dead phone. */
export function buyData(state: GameState): GameState {
  return produce(state, (d) => {
    if (!canBuyData(d).ok) return;
    spend(d, PHONE.bundlePrice);
    addDataMut(d);
    log(d, `Data bundle bought with *USSD#: +${PHONE.bundle} MB for ${naira(PHONE.bundlePrice)}.`);
  });
}

function trackMoneyIfAny(d: GameState): void {
  if (d.money > d.stats.maxMoney) d.stats.maxMoney = d.money;
}

/** The phone alarm for the morning (minutes after midnight), or none. */
export function setAlarm(state: GameState, minutes: number | null): GameState {
  return produce(state, (d) => {
    if (minutes) d.flags.alarm_set = minutes;
    else delete d.flags.alarm_set;
  });
}

/** Call Mum or Dad for money. */
export function askParent(state: GameState, who: 'mum' | 'dad', reason: AskReason): GameState {
  return produce(state, (d, r) => {
    askParentMut(d, r, who, reason);
    trackMoneyIfAny(d);
    storyRewardsMut(d);
  });
}

export function payFeesInFull(state: GameState): GameState {
  return produce(state, (d, r) => {
    portalPayFullMut(d, r);
    checkClearanceDone(d);
    storyRewardsMut(d);
  });
}

export function markChatRead(state: GameState, threadId: string): GameState {
  if (!state.chat.threads[threadId]?.unread) return state;
  return produce(state, (d) => markReadMut(d, threadId));
}

export function payFee(state: GameState, id: FeeId): GameState {
  return produce(state, (d, r) => {
    portalPayMut(d, r, id);
    checkClearanceDone(d);
    storyRewardsMut(d);
  });
}

export function registerCourses(state: GameState): GameState {
  return produce(state, (d, r) => {
    portalRegisterMut(d, r);
    storyRewardsMut(d);
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
    storyRewardsMut(d);
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
