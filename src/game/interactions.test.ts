import { describe, expect, it } from 'vitest';
import { PLACES, getPlace, mainBuka, mainLibrary, medicalCentre, officePlace } from '../content/places';
import { getInteractions, getMenu, getOccupants, getQueueLength, performInteraction, travel, travelOptions, type Interaction } from './interactions';
import { getFee } from './money';
import { at, signAll, testGame } from './testkit';
import type { GameState, PlaceType } from './types';

const TARGETS = ['seat', 'lecturer', 'desk', 'counter', 'bed', 'locker', 'shelf', 'bench', 'stove', 'board', 'door', 'shower', 'toilet', 'copier', 'camera', 'printer', 'charger', 'person'];

function check(list: Interaction[]): void {
  for (const i of list) {
    expect(TARGETS).toContain(i.target.type);
    expect(i.label.length).toBeGreaterThan(3);
    if (!i.available) expect(i.reason, i.id).toBeTruthy();
  }
}

function lectureNow(): { d: GameState; placeId: string; code: string } {
  const d = structuredClone(testGame());
  d.academics.registered = true;
  const c = d.academics.courses.find((x) => x.kind === 'lecture' && x.meetings.some((m) => m.status === 'scheduled'))!;
  const m = c.meetings.find((x) => x.status === 'scheduled')!;
  at(d, m.day, m.slot);
  return { d, placeId: m.placeId, code: c.code };
}

describe('the interaction API, by place type', () => {
  it('lecture_hall: attend the lecture on the timetable, with the lecturer present', () => {
    const { d, placeId, code } = lectureNow();
    const list = getInteractions(d, placeId);
    check(list);
    expect(list.find((i) => i.id === `attend:${code}`)?.available).toBe(true);
    const occ = getOccupants(d, placeId);
    expect(occ.some((o) => o.spot.type === 'lecturer')).toBe(true);
    const after = performInteraction(d, placeId, `attend:${code}`);
    expect(after.clock.slot).not.toBe(d.clock.slot);
    expect(after.academics.courses.find((c) => c.code === code)!.meetings.some((m) => m.attended)).toBe(true);
    // The original state is never changed.
    expect(d.academics.courses.find((c) => c.code === code)!.meetings.some((m) => m.attended)).toBe(false);
  });

  it('admin_office: clearance desks, with a queue and an officer', () => {
    const d = at(structuredClone(testGame()), 3, 0);
    const place = officePlace('registry', 'nas');
    const list = getInteractions(d, place.id);
    check(list);
    expect(list.map((i) => i.id)).toContain('office:registry');
    expect(getQueueLength(d, place.id)).toBeGreaterThanOrEqual(0);
    expect(getOccupants(d, place.id).some((o) => o.role === 'officer')).toBe(true);
  });

  it('restaurant: a menu of Nigerian dishes and the always-open plate washing', () => {
    const d = structuredClone(testGame());
    const buka = mainBuka();
    const menu = getMenu(d, buka.id);
    expect(menu.length).toBeGreaterThanOrEqual(10);
    expect(menu.map((m) => m.name).join(' ')).toMatch(/Jollof/);
    const list = getInteractions(d, buka.id);
    check(list);
    expect(list.find((i) => i.id === 'wash_plates')?.available).toBe(true);
    d.needs.hunger = 80;
    const after = performInteraction(d, buka.id, 'eat:jollof');
    expect(after.needs.hunger).toBeLessThan(80);
    expect(after.clock.slot).toBe(d.clock.slot);
  });

  it('hostel_room: bed, locker, stove and desk in your own room only', () => {
    const d = structuredClone(testGame());
    d.inventory.noodles = 2;
    const list = getInteractions(d, d.room.placeId);
    check(list);
    for (const id of ['nap', 'errands', 'food:noodles', 'hustle:snacks']) expect(list.map((i) => i.id)).toContain(id);
    const other = PLACES.find((p) => p.type === 'hostel_room' && p.id !== d.room.placeId)!;
    expect(getInteractions(d, other.id).map((i) => i.id)).not.toContain('nap');
  });

  it('lab: practicals on the timetable', () => {
    for (let seed = 1; seed < 20; seed++) {
      const d = structuredClone(testGame({ seed }));
      const c = d.academics.courses.find((x) => x.kind === 'practical' && x.meetings.some((m) => m.status === 'scheduled'));
      if (!c) continue;
      const m = c.meetings.find((x) => x.status === 'scheduled')!;
      at(d, m.day, m.slot);
      expect(getPlace(m.placeId)?.type).toBe('lab');
      const list = getInteractions(d, m.placeId);
      check(list);
      expect(list.map((i) => i.id)).toContain(`attend:${c.code}`);
      return;
    }
    throw new Error('no practical found');
  });

  it('library: reading on shelves, assignments, registration', () => {
    const d = at(structuredClone(testGame()), 4, 1);
    d.inventory.passport = 1;
    const lib = mainLibrary();
    const list = getInteractions(d, lib.id);
    check(list);
    expect(list.filter((i) => i.kind === 'read').length).toBe(d.academics.courses.length);
    expect(list.find((i) => i.id === 'library_register')?.available).toBe(true);
    const after = performInteraction(d, lib.id, 'library_register');
    expect(after.clearance.library).toBe(true);
  });

  it('clinic: see the doctor, and the Medical Centre clearance desk', () => {
    const d = at(structuredClone(testGame()), 3, 0);
    d.ill = true;
    d.needs.health = 30;
    const mc = medicalCentre();
    const list = getInteractions(d, mc.id);
    check(list);
    expect(list.find((i) => i.id === 'treat')?.available).toBe(true);
    expect(list.map((i) => i.id)).toContain('office:medical');
    const after = performInteraction(d, mc.id, 'treat');
    expect(after.needs.health).toBeGreaterThan(30);
  });

  it('every enterable place answers, and "wait" is always possible', () => {
    const d = structuredClone(testGame());
    const types = new Set<PlaceType>();
    for (const p of PLACES.filter((x) => x.enterable)) {
      const list = getInteractions(d, p.id);
      check(list);
      expect(list.find((i) => i.kind === 'wait')?.available).toBe(true);
      types.add(p.type);
    }
    for (const t of ['lecture_hall', 'admin_office', 'restaurant', 'hostel_room', 'lab', 'library', 'clinic'] as const) expect(types.has(t)).toBe(true);
  });

  it('refuses an unavailable interaction without changing anything', () => {
    const d = structuredClone(testGame());
    const after = performInteraction(d, d.room.placeId, 'sleep'); // morning: not allowed
    expect(after).toEqual(d);
  });
});

describe('travel', () => {
  it('is free inside a section and costs a fare or a slot across sections', () => {
    const d = structuredClone(testGame());
    signAll(d);
    getFee(d, 'acceptance')!.paid = true;
    const same = PLACES.find((p) => p.sectionId === d.location.sectionId && p.id !== d.location.placeId)!;
    const near = travelOptions(d, same.id);
    expect(near.map((o) => o.mode)).toEqual(['walk', 'keke', 'cab']);
    expect(near[0]!.cost).toEqual({});
    // A short keke hop costs half the fare and no time.
    const hop = travel(d, same.id, 'keke');
    expect(hop.money).toBe(d.money - near[1]!.cost.money!);
    expect(hop.clock.slot).toBe(d.clock.slot);
    const far = PLACES.find((p) => p.sectionId !== d.location.sectionId && p.type === 'library')!;
    const modes = travelOptions(d, far.id).map((o) => o.mode);
    expect(modes).toEqual(['keke', 'cab', 'walk']);
    const byKeke = travel(d, far.id, 'keke');
    expect(byKeke.money).toBeLessThan(d.money);
    expect(byKeke.clock.slot).toBe(d.clock.slot);
    expect(byKeke.location.placeId).toBe(far.id);
    const onFoot = travel(d, far.id, 'walk');
    expect(onFoot.money).toBe(d.money);
    expect(onFoot.clock.slot).toBe(d.clock.slot + 1);
  });
});

describe('the town', () => {
  const placeOf = (pred: (p: (typeof PLACES)[number]) => boolean) => PLACES.find(pred)!;

  it('is far: dearer rides, a two-slot walk, or your own car', () => {
    const d = structuredClone(testGame());
    signAll(d);
    const club = placeOf((p) => p.venue === 'club');
    expect(club.sectionId).toBe('town');
    const opts = travelOptions(d, club.id);
    expect(opts.find((o) => o.mode === 'walk')!.cost.slots).toBe(2);
    expect(opts.find((o) => o.mode === 'keke')!.cost.money).toBeGreaterThan(150);
    expect(opts.some((o) => o.mode === 'drive')).toBe(false);
    d.inventory.car = 1;
    expect(travelOptions(d, club.id)[0]!.mode).toBe('drive');
    const walked = travel(d, club.id, 'walk');
    expect(walked.clock.slot).toBe(d.clock.slot + 2);
  });

  it('has night life that opens at night', () => {
    const d = structuredClone(testGame());
    expect(getInteractions(d, PLACES.find((p) => p.venue === 'club')!.id).find((i) => i.id === 'party')?.reason).toMatch(/clearance/);
    signAll(d);
    const club = placeOf((p) => p.venue === 'club');
    expect(getInteractions(d, club.id).find((i) => i.id === 'party')?.available).toBe(false);
    at(d, 3, 3);
    d.money = 50000;
    expect(getInteractions(d, club.id).find((i) => i.id === 'party')?.available).toBe(true);
    const after = performInteraction(d, club.id, 'party');
    expect(after.needs.stress).toBeLessThan(d.needs.stress + 1);
    expect(after.flags.partied).toBe(d.clock.dayCount);
    const owambe = placeOf((p) => p.venue === 'event_centre');
    expect(getInteractions(at(structuredClone(d), 6, 1), owambe.id).find((i) => i.id === 'owambe')?.available).toBe(true);
  });

  it('lends money at the bank, to be paid back with interest', () => {
    const d = at(structuredClone(testGame()), 3, 0);
    const bank = placeOf((p) => !!p.bank);
    const after = performInteraction(d, bank.id, 'bank_loan');
    expect(after.money).toBe(d.money + 20000);
    expect(after.loans.find((l) => l.personId === 'bank_officer')?.amount).toBe(24000);
    expect(getInteractions(after, bank.id).find((i) => i.id === 'bank_loan')?.available).toBe(false);
  });

  it('sells a car that then appears as a travel option', () => {
    const d = at(structuredClone(testGame()), 3, 1);
    d.money = 200000;
    const shop = placeOf((p) => !!p.stock?.includes('car'));
    const after = performInteraction(d, shop.id, 'buy:car');
    expect(after.inventory.car).toBe(1);
  });
});
