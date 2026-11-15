import { describe, expect, it } from 'vitest';
import { BACKGROUNDS, FEES } from './config';
import { newGame, passSlots } from './engine';
import { canRegister, examFeeBlock, getFee, portalPay, portalPayMut, portalRegister, resolveDebitMut, sessionFees } from './money';
import { Rng } from './rng';
import type { GameState } from './types';

export function testGame(over: Partial<{ programmeId: string; background: 'broke' | 'average' | 'comfortable'; seed: number }> = {}): GameState {
  return newGame({
    name: 'Ada',
    characterId: 'f1',
    background: over.background ?? 'average',
    choiceId: over.programmeId ?? 'computer_science',
    programmeId: over.programmeId ?? 'computer_science',
    admissionScore: 8,
    ambition: 'first_class',
    seed: over.seed ?? 42,
    startYear: 2026,
  });
}

/** Finds a generator position that makes the next portal payment end a given way. */
function rngFor(game: GameState, outcome: 'ok' | 'down' | 'unrecorded'): number {
  for (let seed = 1; seed < 5000; seed++) {
    const d = structuredClone(game);
    const got = portalPayMut(d, new Rng(seed), 'acceptance');
    if (got === outcome) return seed;
  }
  throw new Error(`no seed gives ${outcome}`);
}

describe('fees', () => {
  it('charges competitive courses more, and acceptance only in year one', () => {
    const plain = sessionFees('computer_science', true);
    const comp = sessionFees('medicine', true);
    const total = (f: typeof plain) => f.reduce((s, x) => s + x.amount, 0);
    expect(total(comp)).toBeGreaterThan(total(plain));
    expect(plain.map((f) => f.id)).toEqual(['acceptance', 'school1', 'school2', 'dues', 'hostel']);
    expect(sessionFees('computer_science', false).some((f) => f.id === 'acceptance')).toBe(false);
    expect(plain.find((f) => f.id === 'school1')!.amount * 2).toBe(FEES.school[0]);
  });

  it('starts with the family fee money (a share of it for broke families)', () => {
    const avg = testGame();
    const broke = testGame({ background: 'broke' });
    const dueNow = avg.finance.fees.filter((f) => f.dueSemester === 1).reduce((s, f) => s + f.amount, 0);
    expect(avg.money).toBeGreaterThanOrEqual(BACKGROUNDS.average.startMoney + dueNow);
    expect(broke.money).toBeLessThan(BACKGROUNDS.broke.startMoney + dueNow + BACKGROUNDS.broke.allowance);
  });
});

describe('the portal', () => {
  it('can succeed: money goes and the fee shows paid', () => {
    const g = testGame();
    const after = portalPay({ ...g, rng: rngFor(g, 'ok') }, 'acceptance');
    expect(getFee(after, 'acceptance')!.paid).toBe(true);
    expect(after.money).toBe(g.money - getFee(g, 'acceptance')!.amount);
    expect(after.finance.lastPortal?.outcome).toBe('ok');
  });

  it('can be down: nothing changes, and it stays down for the rest of the slot', () => {
    const g = testGame();
    const after = portalPay({ ...g, rng: rngFor(g, 'down') }, 'acceptance');
    expect(after.money).toBe(g.money);
    expect(getFee(after, 'acceptance')!.paid).toBe(false);
    const again = portalPay({ ...after, rng: rngFor(g, 'ok') }, 'acceptance');
    expect(again.finance.lastPortal?.outcome).toBe('down');
    // Next slot it works again.
    const later = structuredClone(again);
    passSlots(later, new Rng(1), 1);
    const ok = portalPay({ ...later, rng: rngFor(later, 'ok') }, 'acceptance');
    expect(getFee(ok, 'acceptance')!.paid).toBe(true);
  });

  it('can debit without recording, which the Bursary then fixes', () => {
    const g = testGame();
    const after = portalPay({ ...g, rng: rngFor(g, 'unrecorded') }, 'acceptance');
    expect(after.money).toBe(g.money - getFee(g, 'acceptance')!.amount);
    expect(getFee(after, 'acceptance')!.paid).toBe(false);
    expect(after.finance.debits).toHaveLength(1);
    // Paying again is blocked while the Bursary is checking.
    expect(portalPay(after, 'acceptance').finance.lastPortal?.outcome).toBe('refused');
    const d = structuredClone(after);
    const r = new Rng(3);
    let visits = 0;
    while (d.finance.debits.length && visits < 30) {
      resolveDebitMut(d, r, d.finance.debits[0]!.id);
      visits++;
    }
    expect(getFee(d, 'acceptance')!.paid).toBe(true);
    expect(d.money).toBe(after.money);
  });

  it('fails more often near a deadline', () => {
    const count = (day: number) => {
      let bad = 0;
      for (let seed = 1; seed <= 400; seed++) {
        const g = testGame();
        const d = structuredClone(g);
        d.clock.day = day;
        if (portalPayMut(d, new Rng(seed), 'school1') !== 'ok') bad++;
      }
      return bad;
    };
    expect(count(10)).toBeGreaterThan(count(3) * 1.5);
  });

  it('blocks registration until clearance is done, then charges a late fee after the deadline', () => {
    const g = testGame();
    expect(canRegister(g)).toEqual({ ok: false, reason: 'Finish your clearance form first' });
    const d = structuredClone(g);
    for (const k of Object.keys(d.clearance.signed) as Array<keyof typeof d.clearance.signed>) d.clearance.signed[k] = true;
    expect(canRegister(d).ok).toBe(true);
    // Skip to the day after the fresher deadline.
    passSlots(d, new Rng(9), 4 * 8);
    expect(d.clock.day).toBe(9);
    expect(getFee(d, 'late_reg')).toBeDefined();
    expect(canRegister(d).ok).toBe(false);
    getFee(d, 'late_reg')!.paid = true;
    expect(canRegister(d).ok).toBe(true);
    let after = d;
    for (let i = 0; i < 10 && !after.academics.registered; i++) after = portalRegister({ ...after, finance: { ...after.finance, portalDownUntil: 0 } });
    expect(after.academics.registered).toBe(true);
    expect(after.academics.lateRegistration).toBe(true);
  });
});

describe('no fees, no exam', () => {
  it('blocks exams while the instalment is unpaid', () => {
    const g = testGame();
    expect(examFeeBlock(g)).toMatch(/No fees, no exam/);
    const d = structuredClone(g);
    getFee(d, 'school1')!.paid = true;
    expect(examFeeBlock(d)).toBeNull();
  });
});
