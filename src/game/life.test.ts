import { describe, expect, it } from 'vitest';
import { getPlace } from '../content/places';
import { advance, passSlots } from './engine';
import { canEatProvision, eatProvisionMut, oversleepMut, roommateNightMut } from './hostel';
import { canHustle, canSetUp, errandsMut, hustleMut, setUpMut } from './hustle';
import { checkCollapse, sleepMut, tickNeeds, treatMut } from './needs';
import { Rng } from './rng';
import { testGame } from './testkit';
import type { GameState } from './types';

function roomWith(roommates: string[], padlock: boolean): GameState {
  const d = structuredClone(testGame());
  d.room = { ...d.room, roommates, temporary: false, padlock };
  for (const id of roommates) d.people[id] = { rel: 5, lastTalk: 0, favours: {} };
  d.inventory = { noodles: 50, garri: 50 };
  d.money = 100000;
  return d;
}

describe('needs and health', () => {
  it('gets hungrier every slot', () => {
    const d = structuredClone(testGame());
    const h = d.needs.hunger;
    tickNeeds(d);
    expect(d.needs.hunger).toBeGreaterThan(h);
  });

  it('wears health down when starving, leading to illness that treatment fixes', () => {
    const d = structuredClone(testGame());
    d.needs.hunger = 100;
    for (let i = 0; i < 40 && !d.ill; i++) tickNeeds(d);
    expect(d.ill).toBe(true);
    d.needs.hunger = 0;
    treatMut(d, 1500);
    treatMut(d, 1500);
    expect(d.ill).toBe(false);
  });

  it('collapses at zero energy and loses the next slot', () => {
    const d = structuredClone(testGame());
    d.needs.energy = 0;
    checkCollapse(d);
    expect(d.lostSlots).toBe(1);
    const day = d.clock.slot;
    advance(d, new Rng(1), 1);
    expect(d.clock.slot).toBe(day + 2);
  });

  it('sleeps worse without light', () => {
    const lit = roomWith([], false);
    const dark = roomWith([], false);
    lit.needs.energy = dark.needs.energy = 20;
    dark.room.light = false;
    sleepMut(lit, new Rng(1));
    sleepMut(dark, new Rng(1));
    expect(lit.needs.energy).toBeGreaterThan(dark.needs.energy);
  });
});

describe('roommates', () => {
  const thefts = (padlock: boolean) => {
    let n = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const d = roomWith(['rm_emeka', 'rm_chidi', 'rm_halima'], padlock);
      const before = d.inventory.noodles! + d.inventory.garri! + d.money;
      roommateNightMut(d, new Rng(seed));
      if (d.inventory.noodles! + d.inventory.garri! + d.money < before) n++;
    }
    return n;
  };

  it('a borrower takes things, and a padlock makes it much rarer', () => {
    const open = thefts(false);
    const locked = thefts(true);
    expect(open).toBeGreaterThan(30);
    expect(locked).toBeLessThan(open / 2);
  });

  it('never steals when nobody borrows', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const d = roomWith(['rm_chidi', 'rm_halima', 'rm_musa'], false);
      roommateNightMut(d, new Rng(seed));
      expect(d.room.suspect).toBeNull();
    }
  });

  it('an early riser wakes you before you oversleep', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const d = roomWith(['rm_efe', 'rm_chidi', 'rm_halima'], false);
      d.location.placeId = d.room.placeId;
      d.flags.slept = d.clock.dayCount - 1;
      oversleepMut(d, new Rng(seed));
      expect(d.lostSlots).toBe(0);
    }
  });

  it('needs water to cook, unless you bought sachet water', () => {
    const d = roomWith([], false);
    d.room.water = false;
    expect(canEatProvision(d, 'noodles', { needsWater: true }).ok).toBe(false);
    d.inventory.water_bag = 1;
    expect(canEatProvision(d, 'noodles', { needsWater: true }).ok).toBe(true);
    const h = (d.needs.hunger = 80);
    eatProvisionMut(d, 'noodles', { fills: 30, needsWater: true, cook: true });
    expect(d.needs.hunger).toBeLessThan(h);
  });
});

describe('hustles', () => {
  it('opens the ladder with experience and money', () => {
    const d = structuredClone(testGame());
    expect(canSetUp(d, 'typing').ok).toBe(false);
    d.hustle.xp = 4;
    d.money = 100000;
    expect(canSetUp(d, 'typing').ok).toBe(true);
    setUpMut(d, 'typing');
    expect(d.hustle.owned).toContain('typing');
    expect(canSetUp(d, 'pos').ok).toBe(false);
  });

  it('earns profit and experience per shift', () => {
    const d = structuredClone(testGame());
    const hostel = getPlace(d.room.placeId)!;
    d.clock.slot = 1;
    expect(canHustle(d, 'snacks', hostel).ok).toBe(true);
    const money = d.money;
    const profit = hustleMut(d, new Rng(4), 'snacks');
    expect(profit).toBeGreaterThan(0);
    expect(d.money).toBe(money + profit);
    expect(d.hustle.xp).toBe(1);
  });

  it('always offers paid errands, even with no money at all', () => {
    const d = structuredClone(testGame());
    d.money = 0;
    errandsMut(d);
    expect(d.money).toBeGreaterThan(0);
  });

  it('plays out a few days without anything breaking', () => {
    const d = structuredClone(testGame());
    passSlots(d, new Rng(1), 4 * 6);
    expect(d.clock.day).toBe(7);
    expect(d.phase).toBe('playing');
  });
});
