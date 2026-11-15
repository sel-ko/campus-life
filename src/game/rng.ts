// The one random number generator. Its whole state is a single 32-bit number
// kept in the game state (GameState.rng), so a saved game replays exactly and
// tests are repeatable. Algorithm: mulberry32 (small, fast, good enough).

export class Rng {
  constructor(public seed: number) {
    this.seed = seed >>> 0;
  }

  /** 0 (inclusive) to 1 (exclusive), like Math.random. */
  next(): number {
    this.seed = (this.seed + 0x6d2b79f5) >>> 0;
    let t = this.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Whole number from min to max, both included. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)]!;
  }

  /** Picks by weight; weights of 0 or less are never picked. */
  weighted<T>(items: ReadonlyArray<readonly [T, number]>): T {
    const total = items.reduce((s, [, w]) => s + Math.max(0, w), 0);
    let roll = this.next() * total;
    for (const [item, w] of items) {
      if (w <= 0) continue;
      roll -= w;
      if (roll < 0) return item;
    }
    return items.find(([, w]) => w > 0)?.[0] ?? items[0]![0];
  }

  shuffle<T>(items: readonly T[]): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [out[i], out[j]] = [out[j]!, out[i]!];
    }
    return out;
  }

  /** Roughly bell-shaped noise between -spread and +spread. */
  noise(spread: number): number {
    return ((this.next() + this.next() + this.next()) / 3 - 0.5) * 2 * spread;
  }
}

/** A stable 32-bit hash of some text (FNV-1a). Used for fixed, shared picks. */
export function hashText(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** A number from 0 to 1 that is always the same for the same text. */
export function hashUnit(text: string): number {
  return new Rng(hashText(text)).next();
}
