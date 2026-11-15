// The player's room: allocation, roommates, light and water, the locker.
import { ROOMMATE_POOL, getPerson } from '../content/people';
import { hostels } from '../content/places';
import { modifiers } from './campus';
import { setupRoomChatMut } from './chat';
import { KEEP_ROOMMATE_CHANCE, OUTAGES, OVERSLEEP_CHANCE, THEFT } from './config';
import { clamp, log } from './draft';
import { naira } from './format';
import { addMoney, spend } from './money';
import type { Rng } from './rng';
import type { Availability, GameState, Trait } from './types';

export function roommateTraits(d: GameState): Trait[] {
  return d.room.roommates.flatMap((id) => getPerson(id)?.traits ?? []);
}

export function hasRoommateTrait(d: GameState, t: Trait): boolean {
  return roommateTraits(d).includes(t);
}

/** Three roommates from the pool; with luck one friend from last session stays. */
export function drawRoommates(d: GameState, r: Rng): string[] {
  const old = d.room.roommates;
  const keep: string[] = [];
  if (old.length && r.chance(KEEP_ROOMMATE_CHANCE)) {
    const friend = [...old].sort((a, b) => (d.people[b]?.rel ?? 0) - (d.people[a]?.rel ?? 0))[0]!;
    keep.push(friend);
  }
  const fresh = r.shuffle(ROOMMATE_POOL.filter((p) => !keep.includes(p.id) && !old.includes(p.id))).map((p) => p.id);
  const pool = fresh.length >= 3 - keep.length ? fresh : r.shuffle(ROOMMATE_POOL.map((p) => p.id).filter((id) => !keep.includes(id)));
  return [...keep, ...pool.slice(0, 3 - keep.length)];
}

/** A room in one of the playable hostels, with three roommates. */
export function allocateRoomMut(d: GameState, r: Rng, temporary = false): void {
  const options = hostels().filter((h) => !h.freshers);
  const hall = r.pick(options.length ? options : hostels());
  const roommates = drawRoommates(d, r);
  for (const id of roommates) d.people[id] ??= { rel: 5, lastTalk: 0, favours: {} };
  const kept = roommates.filter((id) => d.room.roommates.includes(id));
  d.room = {
    ...d.room,
    placeId: hall.id,
    roomNo: `${'ABCD'[r.int(0, 3)]}${r.int(1, 40)}`,
    roommates,
    temporary,
    suspect: null,
    levy: 0,
  };
  setupRoomChatMut(d, r);
  const names = roommates.map((id) => getPerson(id)?.name.split(' ')[0]).join(', ');
  log(
    d,
    `Room allocated: ${hall.name}, room ${d.room.roomNo}. Your roommates: ${names}.` +
      (kept.length ? ` ${getPerson(kept[0]!)?.name.split(' ')[0]} is still with you!` : ''),
  );
}

// ---------- daily life in the room ----------

/** Morning: does the hostel have light and water today? */
export function dayOutagesMut(d: GameState, r: Rng): void {
  const mod = modifiers(d);
  const hadLight = d.room.light;
  d.room.light = !r.chance(OUTAGES.light + (mod.lightOut ?? 0));
  d.room.water = !r.chance(OUTAGES.water + (mod.waterOut ?? 0));
  if (!d.room.light && hadLight) log(d, 'No light in the hostel today. Charge your phone wherever you see a socket.');
  if (!d.room.water) log(d, 'No water in the hostel taps today. Sachet water to the rescue.');
}

/** Morning: oversleeping, unless an early-rising roommate wakes you. */
export function oversleepMut(d: GameState, r: Rng): void {
  if (d.flags.slept !== d.clock.dayCount - 1 || d.location.placeId !== d.room.placeId) return;
  // Nobody oversleeps on an exam or test morning: the alarm is set three times.
  const bigMorning = d.academics.courses.some((c) => (c.exam.day === d.clock.day && c.exam.slot === 0) || c.meetings.some((m) => m.test && m.day === d.clock.day && m.slot === 0));
  if (bigMorning || !r.chance(OVERSLEEP_CHANCE)) return;
  if (hasRoommateTrait(d, 'reader') || hasRoommateTrait(d, 'tidy')) {
    log(d, 'You almost overslept, but a roommate shook you awake at 6:30. Bless them.');
    return;
  }
  d.lostSlots += 1;
  log(d, 'You overslept! Nobody woke you, and the morning is gone.');
}

/** Night: what the roommates get up to. */
export function roommateNightMut(d: GameState, r: Rng): void {
  if (d.room.temporary || !d.room.roommates.length) return;
  const borrower = d.room.roommates.find((id) => getPerson(id)?.traits?.includes('borrower'));
  const theftChance = THEFT.chance * (d.room.padlock ? THEFT.padlockFactor : 1);
  if (borrower && r.chance(theftChance)) {
    const provisions = Object.entries(d.inventory).filter(([k, v]) => v > 0 && FOOD_ITEMS.includes(k));
    const name = getPerson(borrower)?.name.split(' ')[0] ?? 'Someone';
    if (provisions.length && r.chance(0.6)) {
      const [item] = r.pick(provisions);
      d.inventory[item] = (d.inventory[item] ?? 0) - 1;
      log(d, `Some of your ${item.replace('_', ' ')} has disappeared from your locker. ${name} is "not sure what happened".`);
    } else if (d.money > THEFT.cashMin) {
      const amount = Math.min(d.money, r.int(THEFT.cashMin, THEFT.cashMax));
      addMoney(d, -amount);
      log(d, `${naira(amount)} is missing from your bag. ${name} suddenly bought new slippers.`);
    } else return;
    d.room.suspect = borrower;
    d.flags.theft = d.clock.dayCount;
    return;
  }
  const generous = d.room.roommates.find((id) => getPerson(id)?.traits?.includes('generous'));
  if (generous && r.chance(0.2)) {
    d.needs.hunger = clamp(d.needs.hunger - 15);
    log(d, `${getPerson(generous)?.name.split(' ')[0]} shared their food with the room. Blessings.`);
    return;
  }
  const crawler = d.room.roommates.find((id) => getPerson(id)?.traits?.includes('night_crawler'));
  if (crawler && r.chance(0.25)) {
    d.needs.energy = clamp(d.needs.energy - 6);
    log(d, `${getPerson(crawler)?.name.split(' ')[0]} came back at 4 a.m. and woke the whole room.`);
    return;
  }
  if (!d.room.levy && r.chance(0.05)) {
    d.room.levy = 500;
    log(d, 'Room levy: ₦500 each for insecticide and a new broom. Pay in your room.');
  }
}

export function payLevyMut(d: GameState): void {
  if (!spend(d, d.room.levy)) return;
  log(d, `You paid the ${naira(d.room.levy)} room levy. Your roommates nodded with respect.`);
  d.room.levy = 0;
  for (const id of d.room.roommates) {
    const p = d.people[id];
    if (p) p.rel += 3;
  }
}

export const FOOD_ITEMS = ['noodles', 'garri', 'bread', 'eggs'];

/** Can a provision be eaten now? (Water: from the tap or a bag of sachets.) */
export function canEatProvision(d: GameState, item: string, food: { needsWater?: boolean }): Availability {
  if ((d.inventory[item] ?? 0) < 1) return { ok: false, reason: 'None left' };
  if (food.needsWater && !d.room.water && !(d.inventory.water_bag ?? 0)) return { ok: false, reason: 'No water. Buy a bag of sachet water' };
  return { ok: true };
}

export function eatProvisionMut(d: GameState, item: string, food: { fills: number; energy?: number; needsWater?: boolean; cook?: boolean }): void {
  d.inventory[item] = (d.inventory[item] ?? 0) - 1;
  if (food.needsWater && !d.room.water) d.inventory.water_bag = Math.max(0, (d.inventory.water_bag ?? 0) - 1);
  const dark = food.cook && !d.room.light;
  const fills = Math.round(food.fills * (dark ? 0.7 : 1));
  d.needs.hunger = clamp(d.needs.hunger - fills);
  d.needs.energy = clamp(d.needs.energy + (food.energy ?? 0));
  d.stats.meals += 1;
  log(d, dark ? `You cooked ${item} in the dark. Some of it ended up on the floor.` : `You ate your ${item.replace('_', ' ')}. Hostel life.`);
}

/** New session: a new room (temporary until the hostel fee is paid). */
export function reallocateMut(d: GameState, r: Rng): void {
  allocateRoomMut(d, r, true);
  log(d, 'New session, new room. Pay the hostel fee on the portal to make it yours.');
}
