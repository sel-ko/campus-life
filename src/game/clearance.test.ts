import { describe, expect, it } from 'vitest';
import { OFFICE_ORDER } from '../content/offices';
import {
  canCollectAllocation,
  canRegisterLibrary,
  clearanceDays,
  clearanceSteps,
  collectAllocationMut,
  registerLibraryMut,
  visitOfficeMut,
  type VisitOutcome,
} from './clearance';
import { journal } from './journal';
import { getFee } from './money';
import { Rng } from './rng';
import { at, signAll, testGame } from './testkit';
import type { GameState, OfficeId } from './types';

/** A game on a weekday morning with every document and the acceptance fee paid. */
function ready(): GameState {
  const d = at(structuredClone(testGame()), 3, 0);
  d.inventory = { photocopy: 20, passport: 20, receipt: 5 };
  getFee(d, 'acceptance')!.paid = true;
  return d;
}

function outcomesFor(make: () => GameState, office: OfficeId, tries = 600): Set<VisitOutcome> {
  const seen = new Set<VisitOutcome>();
  for (let seed = 1; seed <= tries; seed++) seen.add(visitOfficeMut(make(), new Rng(seed), office));
  return seen;
}

describe('office visits', () => {
  it('can end in every outcome', () => {
    // Exactly the documents needed, so "one more photocopy" cannot be met.
    const seen = outcomesFor(() => Object.assign(ready(), { inventory: { photocopy: 2 } }), 'registry');
    for (const o of ['signed', 'not_on_seat', 'come_back_tomorrow', 'closed', 'missing_doc', 'need_other'] as const) {
      expect(seen.has(o), o).toBe(true);
    }
  });

  it('is always closed at weekends and usually closed in the evening', () => {
    expect(outcomesFor(() => at(ready(), 6, 0), 'registry', 50)).toEqual(new Set(['closed']));
    let closed = 0;
    for (let s = 1; s <= 200; s++) if (visitOfficeMut(at(ready(), 3, 2), new Rng(s), 'registry') === 'closed') closed++;
    expect(closed).toBeGreaterThan(90);
  });

  it('says "come back tomorrow" again if you return the same day, and signs the next day', () => {
    const d = ready();
    d.clearance.backOn.registry = d.clock.dayCount + 1;
    expect(visitOfficeMut(d, new Rng(1), 'registry')).toBe('come_back_tomorrow');
    at(d, 4, 0);
    const next = new Set<VisitOutcome>();
    for (let s = 1; s < 40; s++) next.add(visitOfficeMut(structuredClone(d), new Rng(s), 'registry'));
    expect(next.has('signed')).toBe(true);
  });

  it('asks for missing documents before anything else', () => {
    const d = ready();
    d.inventory = {};
    expect(outcomesFor(() => structuredClone(d), 'admissions', 30)).toEqual(new Set(['missing_doc']));
  });

  it('needs the acceptance receipt at the Bursary', () => {
    const d = ready();
    getFee(d, 'acceptance')!.paid = false;
    expect(outcomesFor(() => structuredClone(d), 'bursary', 30)).toEqual(new Set(['need_other']));
  });

  it('needs the College Office before the Head of Department', () => {
    const d = ready();
    expect(outcomesFor(() => structuredClone(d), 'hod', 30)).toEqual(new Set(['need_other']));
    d.clearance.signed.college_office = true;
    expect(outcomesFor(() => structuredClone(d), 'hod', 60).has('signed')).toBe(true);
  });

  it('remembers "get another signature first"', () => {
    const d = ready();
    d.clearance.extraPrereq.ict = 'registry';
    expect(outcomesFor(() => structuredClone(d), 'ict', 30)).toEqual(new Set(['need_other']));
  });

  it('charges the medical test fee at the Medical Centre', () => {
    const d = ready();
    d.money = 100;
    expect(outcomesFor(() => structuredClone(d), 'medical', 20)).toEqual(new Set(['missing_doc']));
  });

  it('uses up documents when signing and counts wasted visits', () => {
    const d = ready();
    const r = new Rng(11);
    let tries = 0;
    while (!d.clearance.signed.registry && tries++ < 50) {
      at(d, 3 + (tries % 3), 0);
      visitOfficeMut(d, r, 'registry');
    }
    expect(d.clearance.signed.registry).toBe(true);
    expect(d.inventory.photocopy).toBeLessThanOrEqual(18);
    expect(d.clearance.wasted).toBe(d.clearance.visits - 1);
  });
});

describe('finishing clearance', () => {
  it('needs fees, an allocation and the library after the form', () => {
    const d = ready();
    signAll(d);
    expect(canCollectAllocation(d).ok).toBe(false);
    getFee(d, 'hostel')!.paid = true;
    expect(canCollectAllocation(d).ok).toBe(true);
    collectAllocationMut(d, new Rng(2));
    expect(d.room.roommates).toHaveLength(3);
    expect(d.room.temporary).toBe(false);
    expect(canRegisterLibrary(d).ok).toBe(true);
    registerLibraryMut(d);
    expect(d.clearance.active).toBe(true);
    getFee(d, 'school1')!.paid = true;
    getFee(d, 'dues')!.paid = true;
    // The last step triggers the check.
    d.clearance.library = false;
    registerLibraryMut({ ...d, inventory: { ...d.inventory } } as GameState);
    d.inventory.passport = 1;
    registerLibraryMut(d);
    expect(d.clearance.active).toBe(false);
    expect(d.summaries).toContainEqual({ kind: 'clearance' });
    expect(clearanceDays(d)).toBeGreaterThanOrEqual(1);
  });

  it('lists every step in the journal until it is done', () => {
    const g = testGame();
    const steps = clearanceSteps(g);
    expect(steps).toHaveLength(1 + OFFICE_ORDER.length + 5);
    const tasks = journal(g).map((t) => t.id);
    expect(tasks).toContain('clr:acceptance');
    expect(tasks).toContain('clr:office:medical');
    expect(tasks).toContain('clr:library');
  });
});
