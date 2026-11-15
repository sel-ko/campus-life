// Applies an Effects object (from events, chat replies, people) to a draft.
import { ALL_PEOPLE } from '../content/people';
import { worstAttendance, coverAttendanceMut } from './academics';
import { clamp, log } from './draft';
import { addMoney, earn, spend } from './money';
import type { Effects, GameState } from './types';

export function addRel(d: GameState, personId: string, delta: number): void {
  const p = (d.people[personId] ??= { rel: 0, lastTalk: 0, favours: {} });
  p.rel = clamp(p.rel + delta, -100, 100);
}

/** People matched by an id or a role name. */
function targets(d: GameState, key: string): string[] {
  if (key === 'roommate') return d.room.roommates;
  const byRole = ALL_PEOPLE.filter((p) => p.role === key).map((p) => p.id);
  if (byRole.length) return byRole.filter((id) => id in d.people || key !== 'lecturer');
  return [key];
}

export function applyEffects(d: GameState, e: Effects): void {
  if (e.money) addMoney(d, e.money);
  const n = d.needs;
  if (e.energy) n.energy = clamp(n.energy + e.energy);
  if (e.hunger) n.hunger = clamp(n.hunger + e.hunger);
  if (e.stress) n.stress = clamp(n.stress + e.stress);
  if (e.health) n.health = clamp(n.health + e.health);
  if (e.knowledge) for (const c of d.academics.courses) c.knowledge = clamp(c.knowledge + e.knowledge);
  if (e.goodwill) for (const c of d.academics.courses) c.goodwill = clamp(c.goodwill + e.goodwill, -50, 50);
  if (e.rel) for (const [key, delta] of Object.entries(e.rel)) for (const id of targets(d, key)) addRel(d, id, delta);
  if (e.roommates) for (const id of d.room.roommates) addRel(d, id, e.roommates);
  if (e.items) {
    for (const [item, count] of Object.entries(e.items)) {
      if (item === 'padlock' && count > 0) d.room.padlock = true;
      d.inventory[item] = Math.max(0, (d.inventory[item] ?? 0) + count);
    }
  }
  if (e.loseSlots) d.lostSlots += e.loseSlots;
  if (e.setFlag) d.flags[e.setFlag] = d.clock.dayCount;
  if (e.clearFlag) delete d.flags[e.clearFlag];
  if (e.attendanceCover) {
    const c = worstAttendance(d);
    if (c) {
      coverAttendanceMut(d, c.code);
      log(d, `Your attendance in ${c.code} has been covered.`);
    }
  }
  if (e.borrow) {
    earn(d, e.borrow.amount);
    d.loans.push({
      id: `loan-${d.clock.dayCount}-${e.borrow.from}-${d.loans.length}`,
      personId: e.borrow.from,
      amount: e.borrow.amount,
      due: d.clock.dayCount + e.borrow.days,
      playerOwes: true,
    });
  }
  if (e.lend && spend(d, e.lend.amount)) {
    d.loans.push({
      id: `lend-${d.clock.dayCount}-${e.lend.to}-${d.loans.length}`,
      personId: e.lend.to,
      amount: e.lend.amount,
      due: d.clock.dayCount + e.lend.days,
      playerOwes: false,
    });
  }
}
