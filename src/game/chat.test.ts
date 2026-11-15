import { describe, expect, it } from 'vitest';
import { CLASS_REP, chatFeed, mergeReplies } from './chat';
import { startGame } from './engine';
import { nextHint } from './hints';
import type { GameState } from './types';

const player = { nickname: 'Tester', departmentId: 'law' };

describe('department group chat', () => {
  it('opens with the class rep welcoming the department', () => {
    const feed = chatFeed({ day: 1, slotIndex: 0, player });
    expect(feed[0]!.from).toBe(CLASS_REP);
    expect(feed[0]!.text).toContain('Law');
  });

  it('is the same every time for the same player', () => {
    const a = chatFeed({ day: 6, slotIndex: 2, player });
    const b = chatFeed({ day: 6, slotIndex: 2, player });
    expect(a).toEqual(b);
  });

  it('only grows as time passes, and never shows the future', () => {
    const early = chatFeed({ day: 3, slotIndex: 1, player });
    const later = chatFeed({ day: 9, slotIndex: 3, player });
    expect(later.length).toBeGreaterThan(early.length);
    expect(later.slice(0, early.length)).toEqual(early);
    expect(early.every((l) => l.day < 3 || (l.day === 3 && ['Morning', 'Afternoon'].includes(l.slot)))).toBe(true);
  });

  it('fills in slang and never leaves a {placeholder}', () => {
    const feed = chatFeed({ day: 14, slotIndex: 3, player });
    expect(feed.length).toBeGreaterThan(20);
    expect(feed.some((l) => /\{\w+\}/.test(l.text))).toBe(false);
  });

  it('places the player’s replies in time order', () => {
    const feed = chatFeed({ day: 2, slotIndex: 1, player });
    const merged = mergeReplies(feed, [{ day: 1, slot: 'Evening', text: 'I dey come' }]);
    const mine = merged.findIndex((l) => l.mine);
    expect(merged[mine]!.text).toBe('I dey come');
    expect(merged.slice(mine + 1).every((l) => l.day >= 2 || l.slot === 'Night' || l.slot === 'Evening')).toBe(true);
  });
});

describe('phone hints', () => {
  const base = (overrides: Partial<GameState>): GameState => ({
    ...startGame({ ...player, background: 'average', characterId: 'm1', homeId: 'male-estate' }),
    ...overrides,
  });

  it('warns about low energy first', () => {
    expect(nextHint(base({ meters: { grades: 50, energy: 10, social: 40, stress: 30 } })).title).toBe('Energy low');
  });

  it('reminds the player to eat in the evening', () => {
    expect(nextHint(base({ slotIndex: 2 })).title).toBe('You never chop today');
  });

  it('nudges reading on a weekday morning', () => {
    expect(nextHint(base({})).title).toBe('No reading yet');
  });

  it('mentions the weekend', () => {
    expect(nextHint(base({ day: 6, today: { ate: true, studied: false } })).title).toBe('Weekend');
  });
});
