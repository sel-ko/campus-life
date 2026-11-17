// Energy, Hunger, Stress and hidden Health. Hunger rises every slot; staying
// starving, exhausted or very stressed wears Health down, which leads to
// illness and, at worst, a collapse and a trip to the Medical Centre.
import type { MenuItem } from './contentTypes';
import { modifiers } from './campus';
import {
  BROKE_BELOW,
  COLLAPSE,
  SMELLY_AT,
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
  n.hygiene = clamp((n.hygiene ?? 60) + PER_SLOT.hygiene);
  n.bladder = clamp((n.bladder ?? 20) + PER_SLOT.bladder);
  if (n.hygiene < SMELLY_AT) n.stress = clamp(n.stress + 2);
  if (n.bladder >= 100) {
    n.bladder = 0;
    n.hygiene = clamp(n.hygiene - 40);
    n.stress = clamp(n.stress + 15);
    log(d, 'You held it too long and... let us not talk about it. Go and freshen up.');
  }
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
  // A night's sleep fills you up: all the way, less what disturbed it.
  n.energy = clamp(Math.max(n.energy, 100 + energy - SLEEP.energy));
  d.flags.wake_energy = n.energy;
  n.stress = clamp(n.stress + SLEEP.stress);
  d.flags.slept = d.clock.dayCount;
  log(d, notes.length ? `You slept, but ${notes.join(' and ')}.` : 'You slept well.');
}

/** A nap; `share` is how much of a full nap (a short one with an alarm gives less). */
export function napMut(d: GameState, share = 1): void {
  d.needs.energy = clamp(d.needs.energy + Math.round(NAP.energy * Math.max(0.5, share * 1.3)));
  d.needs.stress = clamp(d.needs.stress + Math.round(NAP.stress * share));
  log(d, share < 1 ? 'The alarm rang. Short nap, but you feel better.' : 'You took a nap. Small sleep, big difference.');
}

/** End of day: no sleep at all costs extra. */
export function nightWithoutSleep(d: GameState): void {
  if (d.flags.slept === d.clock.dayCount) return;
  d.needs.energy = clamp(d.needs.energy - 15);
  d.needs.stress = clamp(d.needs.stress + 5);
  log(d, 'You did not sleep last night. Your eyes are red like palm oil.');
}

/** Morning after a party: a hangover. */
export function hangoverMut(d: GameState): void {
  if (d.flags.partied !== d.clock.dayCount - 1) return;
  d.needs.energy = clamp(d.needs.energy - 15);
  d.needs.health = clamp(d.needs.health - 3);
  log(d, 'Hangover. Your head is a talking drum and the sun is too bright.');
}

export const TREATMENT = { medicalCentre: 1500, sickBay: 800 };

export function treatMut(d: GameState, price: number): void {
  addMoney(d, -Math.min(price, d.money));
  d.needs.health = clamp(d.needs.health + 35);
  if (d.needs.health >= ILL_AT) d.ill = false;
  d.needs.stress = clamp(d.needs.stress - 3);
  log(d, d.ill ? 'The doctor treated you. Rest well and come back if it continues.' : 'The doctor treated you. You feel better already.');
}

/** Freshen up: a bucket bath (needs running water or a bag of sachet water). */
export function canBathe(d: GameState): { ok: boolean; reason?: string } {
  if (!d.room.water && !(d.inventory.water_bag ?? 0)) return { ok: false, reason: 'No water. Buy a bag of sachet water' };
  return { ok: true };
}

export function batheMut(d: GameState): void {
  if (!d.room.water) d.inventory.water_bag = Math.max(0, (d.inventory.water_bag ?? 0) - 1);
  d.needs.hygiene = 100;
  d.needs.stress = clamp(d.needs.stress - 4);
  log(d, d.room.water ? 'You had a proper bucket bath. Fresh like Sunday morning.' : 'You bathed with sachet water, one sachet at a time. Still fresh.');
}

export function toiletMut(d: GameState): void {
  d.needs.bladder = 0;
  d.needs.hygiene = clamp(d.needs.hygiene - 3);
  log(d, 'You used the toilet. Relief.');
}

export interface Feeling {
  id: string;
  emoji: string;
  title: string;
  text: string;
  /** How much it lifts (+) or sinks (-) your mood. */
  value: number;
}

/** Why you feel the way you do: short reasons worked out from the state. */
export function feelings(d: GameState): Feeling[] {
  const n = d.needs;
  const out: Feeling[] = [];
  const f = (id: string, emoji: string, title: string, text: string, value: number) => out.push({ id, emoji, title, text, value });
  if ((n.bladder ?? 0) >= 75) f('pressed', '😬', 'Pressed', 'Find a toilet. Now.', -18);
  if ((n.hygiene ?? 100) < SMELLY_AT) f('smelly', '🤢', 'Smelly', 'People are keeping their distance…', -15);
  else if (d.flags.bathed === d.clock.dayCount) f('fresh', '🧼', 'Fresh', 'Bathed and smelling nice.', 8);
  if (n.hunger >= 80) f('starving', '😵', 'Starving', 'Belle dey make noise.', -15);
  else if (n.hunger <= 20) f('full', '😋', 'Belle full', 'That food entered well.', 8);
  if (n.energy <= 20) f('exhausted', '🥱', 'Exhausted', 'Your eyes are closing by themselves.', -12);
  else if (n.energy >= 85) f('rested', '😌', 'Well rested', 'You slept like a baby.', 8);
  if (n.stress >= 75) f('stressed', '🤯', 'Stressed', 'Too much on your head.', -12);
  if (d.ill) f('sick', '🤒', 'Sick', 'Go and see a doctor.', -15);
  if (d.money < 1500) f('broke', '🪫', 'Broke', 'Your account is crying.', -10);
  if (d.clearance.active && d.clock.dayCount > 3) f('clearance', '🗂️', 'Clearance wahala', 'Office to office, queue to queue.', -6);
  const decor = Object.entries(d.inventory).filter(([k, n]) => n > 0 && ['poster', 'plant', 'fairy_lights', 'duvet', 'rug_decor'].includes(k)).length;
  if (decor >= 2) f('cosy', '🪴', 'Cosy corner', 'Your space feels like home.', 3 + decor * 2);
  if (!d.room.water) f('no_water', '🚱', 'No water', 'The taps are dry in the hostel.', -5);
  if (!d.room.light) {
    const battery = Math.round(d.phone?.battery ?? 100);
    f('no_light', '🕯️', 'NEPA took light', battery <= 0 ? 'Phone dead, no fan, no charging.' : `Phone at ${battery}% and nowhere to charge.`, -5);
  }
  if (d.flags.party_night === d.clock.dayCount || d.flags.party_night === d.clock.dayCount - 1) f('party', '🪩', 'Last night was mad', 'Still feeling the music.', 10);
  return out.sort((a, b) => a.value - b.value);
}

/** One word for how you feel, from all your needs together. */
export function moodOf(d: GameState): { label: string; emoji: string; score: number } {
  const n = d.needs;
  const parts = [n.energy, 100 - n.hunger, 100 - n.stress, n.hygiene ?? 60, 100 - (n.bladder ?? 20), n.health];
  const score = parts.reduce((s, x) => s + x, 0) / parts.length - (d.ill ? 15 : 0) + feelings(d).reduce((s, x) => s + x.value, 0) * 0.3;
  if (score >= 75) return { label: 'Great', emoji: '😄', score };
  if (score >= 62) return { label: 'Good', emoji: '🙂', score };
  if (score >= 48) return { label: 'Okay', emoji: '😐', score };
  if (score >= 35) return { label: 'Pressed', emoji: '😩', score };
  return { label: 'Miserable', emoji: '😫', score };
}

export function healthLabel(d: GameState): string {
  const h = d.needs.health;
  if (d.ill) return 'Sick';
  if (h >= 75) return 'Strong';
  if (h >= 50) return 'Okay';
  return 'Run down';
}

/** How you are, in words, updated with every action: "Pressed · tired, hungry". */
export function moodLine(d: GameState): string {
  const mood = moodOf(d);
  const n = d.needs;
  const words: string[] = [];
  if (n.energy <= 15) words.push('exhausted');
  else if (n.energy <= 35) words.push('tired');
  if (n.hunger >= 80) words.push('starving');
  else if (n.hunger >= 60) words.push('hungry');
  if ((n.hygiene ?? 100) < 25) words.push('smelly');
  if ((n.bladder ?? 0) >= 75) words.push('pressed');
  if (n.stress >= 75) words.push('stressed');
  if (d.ill) words.push('sick');
  if (n.health < 40 && !d.ill) words.push('weak');
  return `${mood.emoji} ${mood.label}${words.length ? ` · ${words.slice(0, 3).join(', ')}` : ''}`;
}
