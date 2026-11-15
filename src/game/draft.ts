// How rules change state while staying pure from the outside: every public
// rule function copies the state, lets the internal helpers change the copy
// (with the generator seeded from state.rng), stores the generator's new
// position and returns the copy. The caller's state is never touched.
import { LOG_LIMIT } from './config';
import { Rng } from './rng';
import { stamp } from './time';
import type { GameState } from './types';

export function produce(state: GameState, fn: (d: GameState, r: Rng) => void): GameState {
  const d = structuredClone(state);
  const r = new Rng(d.rng);
  fn(d, r);
  d.rng = r.seed;
  return d;
}

export function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

/** Adds a line to the game log (the newest is shown as a toast). */
export function log(d: GameState, text: string): void {
  d.log.push({ at: stamp(d.clock), text });
  if (d.log.length > LOG_LIMIT) d.log.splice(0, d.log.length - LOG_LIMIT);
}

export function flag(d: GameState, name: string): number {
  return d.flags[name] ?? 0;
}
