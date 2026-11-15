// Event cards: at most one random event a day, picked from the cards whose
// conditions match the player and the place; plus follow-ups scheduled by
// earlier choices.
import { getProgramme } from '../content/courses';
import { EVENTS, getEvent } from '../content/events';
import { ALL_PEOPLE } from '../content/people';
import type { EventDef, EventWhen } from './contentTypes';
import { EVENT_CHANCE } from './config';
import { log } from './draft';
import { applyEffects } from './effects';
import { hasRoommateTrait } from './hostel';
import type { Rng } from './rng';
import { slotName } from './time';
import type { GameState, PlaceType } from './types';

export function eventMatches(d: GameState, w: EventWhen, place: PlaceType | null): boolean {
  const a = d.academics;
  const n = d.needs;
  if (w.places && (!place || !w.places.includes(place))) return false;
  if (w.slots && !w.slots.includes(slotName(d.clock))) return false;
  if (w.levels && (a.level < w.levels[0] || a.level > w.levels[1])) return false;
  if (w.semesters && !w.semesters.includes(d.clock.semester)) return false;
  if (w.days && (d.clock.day < w.days[0] || d.clock.day > w.days[1])) return false;
  if (w.tracks && !w.tracks.includes(getProgramme(d.player.programmeId).track)) return false;
  if (w.clearance !== undefined && d.clearance.active !== w.clearance) return false;
  if (w.moneyBelow !== undefined && d.money >= w.moneyBelow) return false;
  if (w.moneyAbove !== undefined && d.money <= w.moneyAbove) return false;
  if (w.stressAbove !== undefined && n.stress <= w.stressAbove) return false;
  if (w.hungerAbove !== undefined && n.hunger <= w.hungerAbove) return false;
  if (w.healthBelow !== undefined && n.health >= w.healthBelow) return false;
  if (w.energyBelow !== undefined && n.energy >= w.energyBelow) return false;
  if (w.roommateTrait && (d.room.temporary || !hasRoommateTrait(d, w.roommateTrait))) return false;
  if (w.hasHustle && !d.hustle.owned.includes(w.hasHustle)) return false;
  if (w.lightOff !== undefined && d.room.light === w.lightOff) return false;
  if (w.waterOff !== undefined && d.room.water === w.waterOff) return false;
  if (w.ill !== undefined && d.ill !== w.ill) return false;
  if (w.courseKind && !a.courses.some((c) => c.kind === w.courseKind)) return false;
  if (w.registered !== undefined && a.registered !== w.registered) return false;
  if (w.flag && !d.flags[w.flag]) return false;
  if (w.notFlag && d.flags[w.notFlag]) return false;
  if (w.ambition && d.goals.ambition !== w.ambition) return false;
  if (w.relAbove) {
    const [role, at] = w.relAbove;
    const ids = ALL_PEOPLE.filter((p) => p.role === role).map((p) => p.id);
    if (!ids.some((id) => (d.people[id]?.rel ?? 0) >= at)) return false;
  }
  if (w.hasDebit !== undefined && (d.finance.debits.length > 0) !== w.hasDebit) return false;
  if (w.owesMoney !== undefined && d.loans.some((l) => l.playerOwes) !== w.owesMoney) return false;
  return true;
}

export function eligibleEvents(d: GameState, place: PlaceType | null): EventDef[] {
  return EVENTS.filter(
    (e) => e.kind === 'random' && !(e.once && d.seenEvents[e.id]) && eventMatches(d, e.when, place),
  );
}

/** After an action: maybe one random event (never more than one a day). */
export function maybeEventMut(d: GameState, r: Rng, place: PlaceType | null, placeId: string | null): void {
  if (d.pendingEvent || d.lastEventDay === d.clock.dayCount || d.phase !== 'playing') return;
  if (!r.chance(EVENT_CHANCE)) return;
  const options = eligibleEvents(d, place);
  if (!options.length) return;
  // Cards seen before are less likely to come back.
  const pick = r.weighted(options.map((e) => [e, (e.weight ?? 1) / (1 + (d.seenEvents[e.id] ?? 0) * 2)] as const));
  startEvent(d, pick.id, placeId);
}

function startEvent(d: GameState, id: string, placeId: string | null): void {
  d.pendingEvent = { id, placeId };
  d.lastEventDay = d.clock.dayCount;
  d.seenEvents[id] = (d.seenEvents[id] ?? 0) + 1;
  d.stats.eventsSeen += 1;
}

export function scheduleMut(d: GameState, eventId: string, days: number): void {
  d.scheduled.push({ eventId, dayCount: d.clock.dayCount + days });
}

/** Start of a day: follow-ups that are due, and the theft confrontation. */
export function dueEventsMut(d: GameState): void {
  if (d.flags.theft !== undefined && d.flags.theft === d.clock.dayCount - 1 && !d.pendingEvent) {
    startEvent(d, 'rm_theft', d.room.placeId);
    return;
  }
  const due = d.scheduled.find((s) => s.dayCount <= d.clock.dayCount);
  if (!due || d.pendingEvent) return;
  d.scheduled = d.scheduled.filter((s) => s !== due);
  if (getEvent(due.eventId)) startEvent(d, due.eventId, null);
}

export function pendingEventDef(d: GameState): EventDef | null {
  return d.pendingEvent ? (getEvent(d.pendingEvent.id) ?? null) : null;
}

export function canChoose(d: GameState, index: number): boolean {
  const ev = pendingEventDef(d);
  const choice = ev?.choices[index];
  return !!choice && d.money >= (choice.cost ?? 0);
}

/** The player picks a choice: effects, follow-up, and the outcome line. */
export function chooseEventMut(d: GameState, index: number): void {
  const ev = pendingEventDef(d);
  const choice = ev?.choices[index];
  if (!ev || !choice) {
    d.pendingEvent = null;
    return;
  }
  if (!canChoose(d, index)) return;
  d.pendingEvent = null;
  applyEffects(d, choice.effects);
  if (choice.followUp) scheduleMut(d, choice.followUp.event, choice.followUp.days);
  if (ev.id === 'rm_theft') d.room.suspect = null;
  log(d, choice.outcome);
}
