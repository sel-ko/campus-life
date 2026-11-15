import { describe, expect, it } from 'vitest';
import { SAVE_VERSION } from './config';
import { Rng, hashText } from './rng';
import { loadSave } from './save';
import { START_CLOCK, stepClock } from './time';

describe('seeded randomness', () => {
  it('replays the same numbers from the same seed', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    const xs = Array.from({ length: 20 }, () => a.next());
    expect(Array.from({ length: 20 }, () => b.next())).toEqual(xs);
    expect(new Set(xs).size).toBe(20);
    for (const x of xs) expect(x >= 0 && x < 1).toBe(true);
  });

  it('keeps its whole state in one number, so it can be saved', () => {
    const a = new Rng(7);
    a.next();
    a.next();
    const saved = a.seed;
    const resumed = new Rng(saved);
    expect(resumed.next()).toBe(a.next());
  });

  it('never picks a zero-weight option', () => {
    const r = new Rng(1);
    for (let i = 0; i < 500; i++) expect(r.weighted([['a', 1], ['b', 0], ['c', 2]] as const)).not.toBe('b');
  });

  it('hashes text the same way every time', () => {
    expect(hashText('2026-W46')).toBe(hashText('2026-W46'));
    expect(hashText('2026-W46')).not.toBe(hashText('2026-W47'));
  });
});

describe('the clock', () => {
  it('runs Morning to Night, then the next day', () => {
    let c = START_CLOCK;
    for (let i = 0; i < 3; i++) c = stepClock(c).clock;
    expect(c.slot).toBe(3);
    const step = stepClock(c);
    expect(step.newDay).toBe(true);
    expect(step.clock).toMatchObject({ day: 2, slot: 0, dayCount: 2, semester: 1, year: 1 });
  });

  it('rolls day 14 into the next semester, and semester 2 into the next session', () => {
    const end1 = stepClock({ year: 1, semester: 1, day: 14, slot: 3, dayCount: 14 });
    expect(end1.newSemester).toBe(true);
    expect(end1.clock).toMatchObject({ year: 1, semester: 2, day: 1, dayCount: 15 });
    const end2 = stepClock({ year: 1, semester: 2, day: 14, slot: 3, dayCount: 28 });
    expect(end2.clock).toMatchObject({ year: 2, semester: 1, day: 1, dayCount: 29 });
  });
});

describe('save versions', () => {
  it('loads the current version and resets older ones with a notice', () => {
    expect(loadSave(null)).toEqual({ game: null, wasReset: false });
    expect(loadSave({ version: 1, day: 3 })).toEqual({ game: null, wasReset: true });
    const ok = { version: SAVE_VERSION };
    expect(loadSave(ok).game).toBe(ok);
  });
});
