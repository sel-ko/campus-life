// Hustles: a ladder from selling snacks to running a business centre, opened
// by experience (shifts) and money to set up. Plus the low-paid jobs that are
// always there, so being broke is never a dead end.
import { HUSTLES } from '../content/hustles';
import type { PlaceDef } from '../content/places';
import { ERRAND_PAY, WASH_PLATES_PAY } from './config';
import { clamp, log } from './draft';
import { naira } from './format';
import { earn, spend } from './money';
import type { Rng } from './rng';
import type { Availability, GameState, HustleId } from './types';

export function hasGoodGrade(d: GameState): boolean {
  return d.academics.transcript.some((t) => t.courses.some((c) => c.grade === 'A'));
}

export function canSetUp(d: GameState, id: HustleId): Availability {
  const h = HUSTLES[id];
  if (d.hustle.owned.includes(id)) return { ok: false, reason: 'Already running' };
  if (d.hustle.xp < h.xpNeeded) return { ok: false, reason: `Needs ${h.xpNeeded} hustle shifts of experience (you have ${d.hustle.xp})` };
  if (h.requires === 'good_grade' && !hasGoodGrade(d)) return { ok: false, reason: 'You need an A in some course to tutor it' };
  if (d.money < h.setupCost) return { ok: false, reason: `Setting up costs ${naira(h.setupCost)}` };
  return { ok: true };
}

export function setUpMut(d: GameState, id: HustleId): void {
  const h = HUSTLES[id];
  spend(d, h.setupCost);
  d.hustle.owned.push(id);
  log(d, h.setupCost ? `You invested ${naira(h.setupCost)} and started: ${h.name}!` : `You started: ${h.name}!`);
}

export function canHustle(d: GameState, id: HustleId, place: PlaceDef): Availability {
  const h = HUSTLES[id];
  if (!d.hustle.owned.includes(id)) return { ok: false, reason: 'Set it up first' };
  if (!place.hustles?.includes(id)) return { ok: false, reason: 'Not here' };
  if (d.clock.slot === 3) return { ok: false, reason: 'Nobody is buying at night' };
  if (d.needs.energy < 12) return { ok: false, reason: 'Too tired' };
  if (d.money < h.stockCost) return { ok: false, reason: `Stock costs ${naira(h.stockCost)}` };
  return { ok: true };
}

/** One shift. Returns the profit. */
export function hustleMut(d: GameState, r: Rng, id: HustleId): number {
  const h = HUSTLES[id];
  spend(d, h.stockCost);
  let revenue = r.int(h.revenue[0], h.revenue[1]);
  if ((d.people.kelz?.rel ?? 0) >= 20) revenue = Math.round(revenue * 1.15);
  let note = '';
  if (id === 'pos' && r.chance(0.06)) {
    revenue = -4000;
    note = ' A customer paid with a fake transfer alert. You lost money today.';
  }
  if (revenue > 0) earn(d, revenue);
  else spend(d, Math.min(d.money, -revenue));
  const profit = revenue - h.stockCost;
  d.hustle.xp += 1;
  d.hustle.profitSemester += profit;
  d.hustle.profitTotal += profit;
  d.stats.hustleShifts += 1;
  d.week.shifts += 1;
  d.needs.energy = clamp(d.needs.energy + h.energy);
  d.needs.stress = clamp(d.needs.stress + h.stress);
  if (id === 'tutoring') for (const c of d.academics.courses) c.knowledge = clamp(c.knowledge + 2);
  log(d, `${h.name}: ${profit >= 0 ? `profit of ${naira(profit)}` : `loss of ${naira(-profit)}`}.${note}`);
  return profit;
}

/** Always available in the hostel (except at night): small money for errands. */
export function errandsMut(d: GameState): void {
  earn(d, ERRAND_PAY);
  d.needs.energy = clamp(d.needs.energy - 8);
  d.hustle.xp += 0;
  log(d, `You ran errands for some seniors: fetched water, bought recharge card. +${naira(ERRAND_PAY)}.`);
}

/** Always available at a restaurant (except at night): wash plates for cash and a free plate. */
export function washPlatesMut(d: GameState): void {
  earn(d, WASH_PLATES_PAY);
  d.needs.energy = clamp(d.needs.energy - 10);
  d.needs.hunger = clamp(d.needs.hunger - 30);
  d.stats.meals += 1;
  log(d, `You washed plates at the buka. +${naira(WASH_PLATES_PAY)} and a free plate of rice.`);
}
