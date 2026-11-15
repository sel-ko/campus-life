// The player's room: allocation, roommates, light and water, the locker.
import { ROOMMATE_POOL, getPerson } from '../content/people';
import { hostels } from '../content/places';
import { KEEP_ROOMMATE_CHANCE } from './config';
import { log } from './draft';
import type { Rng } from './rng';
import type { GameState, Trait } from './types';

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
  const names = roommates.map((id) => getPerson(id)?.name.split(' ')[0]).join(', ');
  log(
    d,
    `Room allocated: ${hall.name}, room ${d.room.roomNo}. Your roommates: ${names}.` +
      (kept.length ? ` ${getPerson(kept[0]!)?.name.split(' ')[0]} is still with you!` : ''),
  );
}
