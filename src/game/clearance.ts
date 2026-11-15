// Year-one clearance: a form signed at eight offices in any order, then fees,
// a hostel allocation and library registration. Each office visit takes a
// slot and ends one way: signed, officer not on seat, "come back tomorrow",
// closed, a document missing, or another signature needed first.
import { DOC_NAMES, OFFICES, OFFICE_ORDER } from '../content/offices';
import { getProgramme } from '../content/courses';
import { mainLibrary, officePlace } from '../content/places';
import { CLEARANCE_WEIGHTS, MEDICAL_TEST_FEE } from './config';
import { log } from './draft';
import { naira } from './format';
import { clearanceFormDone, feePaid, spend } from './money';
import { hashUnit, type Rng } from './rng';
import { allocateRoomMut } from './hostel';
import { isWeekend, weekday } from './time';
import type { Availability, DocId, GameState, OfficeId } from './types';

export type VisitOutcome = 'signed' | 'not_on_seat' | 'come_back_tomorrow' | 'closed' | 'missing_doc' | 'need_other';

export function officeName(id: OfficeId): string {
  return OFFICES[id].name;
}

/** Where the player goes for an office (College Office and HOD depend on the college). */
export function officePlaceId(d: GameState, id: OfficeId): string {
  return officePlace(id, getProgramme(d.player.programmeId).collegeId).id;
}

export function officerRel(d: GameState, id: OfficeId): number {
  return d.people[OFFICES[id].officerId]?.rel ?? 0;
}

/** People waiting at an office: same for everyone at the same time; long in clearance week. */
export function officeQueue(d: GameState, id: OfficeId): number {
  const base = Math.floor(hashUnit(`${d.clock.dayCount}:${d.clock.slot}:${id}`) * 7);
  const rush = d.clock.year === 1 && d.clock.semester === 1 && d.clock.day <= 6 ? 6 : 0;
  const morning = d.clock.slot === 0 ? 2 : 0;
  return Math.max(0, base + rush + morning - Math.floor(officerRel(d, id) / 15));
}

export function officesOpen(d: GameState): boolean {
  return !isWeekend(d.clock.day) && d.clock.slot <= 1;
}

export function canVisitOffice(d: GameState, id: OfficeId): Availability {
  if (!d.clearance.active) return { ok: false, reason: 'Your clearance is done' };
  if (d.clearance.signed[id]) return { ok: false, reason: 'Already signed' };
  if (d.clock.slot === 3) return { ok: false, reason: 'Offices are locked at night' };
  return { ok: true };
}

/** Documents this office needs that the player does not have. */
export function missingDocs(d: GameState, id: OfficeId): DocId[] {
  const out: DocId[] = [];
  for (const [doc, n] of Object.entries(OFFICES[id].docs) as Array<[DocId, number]>) {
    if ((d.inventory[doc] ?? 0) < n) out.push(doc);
  }
  return out;
}

/** Signatures (or payments) needed before this office will sign. */
export function blockedBy(d: GameState, id: OfficeId): string | null {
  const office = OFFICES[id];
  for (const need of office.needs ?? []) if (!d.clearance.signed[need]) return `${officeName(need)} must sign first`;
  const extra = d.clearance.extraPrereq[id];
  if (extra && !d.clearance.signed[extra]) return `${officeName(extra)} must sign first`;
  if (office.needsAcceptance && !feePaid(d, 'acceptance')) return 'Pay the acceptance fee on the portal first';
  return null;
}

function wasted(d: GameState, text: string, outcome: VisitOutcome): VisitOutcome {
  d.clearance.wasted += 1;
  d.clearance.lastOutcome = text;
  log(d, text);
  return outcome;
}

/** One visit to an office. The caller spends the slot. */
export function visitOfficeMut(d: GameState, r: Rng, id: OfficeId): VisitOutcome {
  const c = d.clearance;
  const name = officeName(id);
  c.visits += 1;
  const W = CLEARANCE_WEIGHTS;

  if (isWeekend(d.clock.day)) return wasted(d, `${name} is closed for the weekend. Even the gateman laughed.`, 'closed');
  if (d.clock.slot === 2 && r.chance(W.eveningClosed)) return wasted(d, `${name} has closed for the day. "Come early tomorrow."`, 'closed');
  if ((c.backOn[id] ?? 0) > d.clock.dayCount) return wasted(d, `${name}: "Did I not say tomorrow?"`, 'come_back_tomorrow');

  const blocked = blockedBy(d, id);
  if (blocked) return wasted(d, `${name}: ${blocked}.`, 'need_other');

  const missing = missingDocs(d, id);
  if (missing.length) {
    return wasted(d, `${name}: "Where is your ${DOC_NAMES[missing[0] as 'photocopy']}?" Buy one at a business centre and come back.`, 'missing_doc');
  }
  const fee = OFFICES[id].fee ?? 0;
  if (fee && !c.medicalFeePaid) {
    if (!spend(d, fee)) return wasted(d, `${name}: the medical test costs ${naira(MEDICAL_TEST_FEE)}. Come back with it.`, 'missing_doc');
    c.medicalFeePaid = true;
    log(d, `You paid ${naira(fee)} for the medical test.`);
  }

  // Luck, weighted by the slot, the day and how well you know the officer.
  const rel = officerRel(d, id);
  const queue = officeQueue(d, id);
  const others = OFFICE_ORDER.filter((o) => o !== id && !c.signed[o] && !(OFFICES[o].needs ?? []).includes(id));
  const outcome = r.weighted<VisitOutcome>([
    ['signed', W.signed + rel * W.relBonus + (d.clock.slot === 0 ? W.morningBonus : 0) - (queue > 8 ? W.longQueue : 0)],
    ['not_on_seat', W.notOnSeat + (d.clock.slot === 1 ? W.afternoonNotOnSeat : 0)],
    ['come_back_tomorrow', W.comeBackTomorrow + (weekday(d.clock.day) === 4 ? W.fridayTomorrow : 0)],
    ['need_other', others.length ? W.needOther : 0],
    ['missing_doc', W.missingDoc],
    ['closed', W.closed],
  ]);

  switch (outcome) {
    case 'not_on_seat':
      return wasted(d, `${name}: the officer is "not on seat". Somebody said they went to a meeting. Or to eat.`, outcome);
    case 'come_back_tomorrow':
      c.backOn[id] = d.clock.dayCount + 1;
      return wasted(d, `${name}: "Come back tomorrow." The magic words.`, outcome);
    case 'closed':
      return wasted(d, `${name} closed early today for "an urgent meeting".`, outcome);
    case 'need_other': {
      const other = r.pick(others);
      c.extraPrereq[id] = other;
      return wasted(d, `${name}: "Go and get ${officeName(other)}'s signature first." News to you.`, outcome);
    }
    case 'missing_doc': {
      // They now want one extra photocopy. A spare one saves the day.
      if ((d.inventory.photocopy ?? 0) > (OFFICES[id].docs.photocopy ?? 0)) {
        d.inventory.photocopy! -= 1;
        log(d, `${name} asked for one extra photocopy. Good thing you had a spare.`);
        break;
      }
      return wasted(d, `${name}: "We now need one extra photocopy." Of course you do not have it.`, outcome);
    }
    default:
      break;
  }
  return sign(d, id);
}

function sign(d: GameState, id: OfficeId): VisitOutcome {
  const c = d.clearance;
  for (const [doc, n] of Object.entries(OFFICES[id].docs) as Array<[DocId, number]>) d.inventory[doc] = (d.inventory[doc] ?? 0) - n;
  c.signed[id] = true;
  d.week.signatures += 1;
  c.lastOutcome = `${officeName(id)} signed your form.`;
  log(d, `${officeName(id)} signed your clearance form! ${signedCount(d)} of 8.`);
  if (clearanceFormDone(d)) log(d, 'Clearance form complete! Now pay your fees, collect your hostel allocation and register at the library.');
  checkClearanceDone(d);
  return 'signed';
}

export function signedCount(d: GameState): number {
  return Object.values(d.clearance.signed).filter(Boolean).length;
}

// ---------- after the form ----------

export interface ClearanceStep {
  id: string;
  label: string;
  done: boolean;
  placeId?: string;
  /** Done on the phone portal rather than at a place. */
  portal?: boolean;
}

export function clearanceSteps(d: GameState): ClearanceStep[] {
  const c = d.clearance;
  const steps: ClearanceStep[] = [
    { id: 'acceptance', label: 'Pay the acceptance fee', done: feePaid(d, 'acceptance'), portal: true },
    ...OFFICE_ORDER.map((o) => ({
      id: `office:${o}`,
      label: `Signature: ${officeName(o)}`,
      done: c.signed[o],
      placeId: officePlaceId(d, o),
    })),
    { id: 'school1', label: 'Pay school fees (first instalment)', done: feePaid(d, 'school1'), portal: true },
    { id: 'dues', label: 'Pay departmental dues', done: feePaid(d, 'dues'), portal: true },
    { id: 'hostel', label: 'Pay the hostel fee', done: feePaid(d, 'hostel'), portal: true },
    { id: 'allocation', label: 'Collect your hostel allocation (Student Affairs)', done: c.allocation, placeId: officePlaceId(d, 'student_affairs') },
    { id: 'library', label: 'Register at the University Library', done: c.library, placeId: mainLibrary().id },
  ];
  return steps;
}

/** Called after anything that could finish clearance. */
export function checkClearanceDone(d: GameState): void {
  const c = d.clearance;
  if (!c.active || !clearanceSteps(d).every((s) => s.done)) return;
  c.active = false;
  c.endDay = d.clock.dayCount;
  c.spent = d.finance.spent - c.spent;
  d.summaries.push({ kind: 'clearance' });
  log(d, `Clearance done in ${clearanceDays(d)} days! You are now officially a student. Welcome to Uni.`);
}

export function clearanceDays(d: GameState): number {
  const end = d.clearance.endDay ?? d.clock.dayCount;
  return end - d.clearance.startDay + 1;
}

export function canCollectAllocation(d: GameState): Availability {
  if (d.clearance.allocation) return { ok: false, reason: 'Already allocated' };
  if (!clearanceFormDone(d)) return { ok: false, reason: 'Finish your clearance form first' };
  if (!feePaid(d, 'hostel')) return { ok: false, reason: 'Pay the hostel fee first' };
  if (!officesOpen(d)) return { ok: false, reason: 'Student Affairs is closed now' };
  return { ok: true };
}

export function canRegisterLibrary(d: GameState): Availability {
  if (d.clearance.library) return { ok: false, reason: 'Already registered' };
  if ((d.inventory.passport ?? 0) < 1) return { ok: false, reason: 'Bring one passport photograph' };
  if (d.clock.slot === 3) return { ok: false, reason: 'The library desk is closed at night' };
  return { ok: true };
}

export function registerLibraryMut(d: GameState): void {
  d.inventory.passport = (d.inventory.passport ?? 0) - 1;
  d.clearance.library = true;
  d.flags.library_card = 1;
  log(d, 'You registered at the library and got your library card. The librarian said "no eating inside".');
  checkClearanceDone(d);
}

export function collectAllocationMut(d: GameState, r: Rng): void {
  d.clearance.allocation = true;
  allocateRoomMut(d, r);
  checkClearanceDone(d);
}
