// Energy, Hunger, Stress and hidden Health. Hunger rises every slot; staying
// starving, exhausted or very stressed wears Health down, which leads to
// illness and, at worst, a collapse and a trip to the Medical Centre.
import type { MenuItem } from './contentTypes';
import { modifiers } from './campus';
import {
  BROKE_BELOW,
  COLLAPSE,
  COLLAPSE_HEALTH,
  HEALTH_DROP,
  HEALTH_RECOVER,
  HUNGRY_AT,
  ILL_AT,
  NAP,
  PER_SLOT,
  SLEEP,
  STARVING_DRAIN,
  STRESSED_AT,
  TIRED_AT,
} from './config';
import { clamp, log } from './draft';
import { naira } from './format';
import { hasRoommateTrait } from './hostel';
import { addMoney } from './money';
import type { Rng } from './rng';
import type { GameState } from './types';

/** Every slot that passes. */
export function tickNeeds(d: GameState): void {
  const n = d.needs;
  n.hunger = clamp(n.hunger + PER_SLOT.hunger);
  n.energy = clamp(n.energy + PER_SLOT.energy);
  if (n.hunger >= HUNGRY_AT) {
    n.energy = clamp(n.energy + STARVING_DRAIN.energy);
    n.stress = clamp(n.stress + STARVING_DRAIN.stress);
  }
  const weekStress = modifiers(d).stress ?? 0;
  if (weekStress) n.stress = clamp(n.stress + weekStress);
  const bad = n.hunger >= HUNGRY_AT || n.energy <= TIRED_AT || n.stress >= STRESSED_AT;
  n.health = clamp(n.health + (bad ? -HEALTH_DROP : HEALTH_RECOVER));
  if (!d.ill && n.health < ILL_AT) {
    d.ill = true;
    d.stats.sickTimes += 1;
    log(d, 'You are not feeling well at all: fever, headache, the works. Go to the Medical Centre or the Sick Bay.');
  }
  d.week.maxHunger = Math.max(d.week.maxHunger, n.hunger);
  d.stats.stressSum += n.stress;
  d.stats.stressSamples += 1;
  if (d.money < BROKE_BELOW) d.stats.brokeSlots += 1;
}

/** Energy at zero: you collapse and lose the next slot. Health near zero: the clinic. */
export function checkCollapse(d: GameState): void {
  const n = d.needs;
  if (n.health <= COLLAPSE_HEALTH) {
    d.lostSlots += 2;
    n.health = 50;
    n.energy = Math.max(n.energy, 40);
    d.ill = false;
    const bill = Math.min(d.money, 2000);
    addMoney(d, -bill);
    log(d, `You collapsed and friends rushed you to the Medical Centre. You lost the day${bill ? ` and paid ${naira(bill)}` : ''}. Take care of yourself o.`);
    return;
  }
  if (n.energy <= 0) {
    d.lostSlots += 1;
    n.stress = clamp(n.stress + COLLAPSE.stress);
    n.health = clamp(n.health + COLLAPSE.health);
    n.energy = 15;
    log(d, 'You collapsed from exhaustion and slept where you fell. You lose the next slot.');
  }
}

export function eatMut(d: GameState, item: MenuItem, price: number): void {
  addMoney(d, -price);
  const n = d.needs;
  n.hunger = clamp(n.hunger - item.fills);
  n.energy = clamp(n.energy + (item.energy ?? 0));
  n.stress = clamp(n.stress + (item.stress ?? 0));
  if (!item.snack) d.stats.meals += 1;
  log(d, `You ate ${item.name.toLowerCase()}${price ? ` (${naira(price)})` : ''}.`);
}

export function sleepMut(d: GameState, r: Rng): void {
  const n = d.needs;
  let energy = SLEEP.energy;
  const notes: string[] = [];
  if (!d.room.light) {
    energy += SLEEP.noLight;
    notes.push('no light, so no fan: you sweated all night');
  }
  if (hasRoommateTrait(d, 'noisy') && r.chance(0.5)) {
    energy += SLEEP.noisy;
    notes.push('a roommate played music till 2 a.m.');
  }
  if (d.room.temporary) {
    energy += SLEEP.temporary;
    notes.push('the transit bunk creaks');
  }
  n.energy = clamp(n.energy + energy);
  n.stress = clamp(n.stress + SLEEP.stress);
  d.flags.slept = d.clock.dayCount;
  log(d, notes.length ? `You slept, but ${notes.join(' and ')}.` : 'You slept well.');
}

export function napMut(d: GameState): void {
  d.needs.energy = clamp(d.needs.energy + NAP.energy);
  d.needs.stress = clamp(d.needs.stress + NAP.stress);
  log(d, 'You took a nap. Small sleep, big difference.');
}

/** End of day: no sleep at all costs extra. */
export function nightWithoutSleep(d: GameState): void {
  if (d.flags.slept === d.clock.dayCount) return;
  d.needs.energy = clamp(d.needs.energy - 15);
  d.needs.stress = clamp(d.needs.stress + 5);
  log(d, 'You did not sleep last night. Your eyes are red like palm oil.');
}

export const TREATMENT = { medicalCentre: 1500, sickBay: 800 };

export function treatMut(d: GameState, price: number): void {
  addMoney(d, -Math.min(price, d.money));
  d.needs.health = clamp(d.needs.health + 35);
  if (d.needs.health >= ILL_AT) d.ill = false;
  d.needs.stress = clamp(d.needs.stress - 3);
  log(d, d.ill ? 'The doctor treated you. Rest well and come back if it continues.' : 'The doctor treated you. You feel better already.');
}

export function healthLabel(d: GameState): string {
  const h = d.needs.health;
  if (d.ill) return 'Sick';
  if (h >= 75) return 'Strong';
  if (h >= 50) return 'Okay';
  return 'Run down';
}
