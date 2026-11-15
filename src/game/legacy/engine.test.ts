import { describe, expect, it } from 'vitest';
import { ACTIONS, getAction } from './actions';
import { EVENTS } from './events';
import { TITLES, pickTitle } from './titles';
import {
  advanceSlot,
  applyEffects,
  canChoose,
  canDoAction,
  getPendingEvent,
  clampMeter,
  computeCgpa,
  currentSlot,
  degreeClass,
  doAction,
  finalResult,
  hasAvailableAction,
  pickEvent,
  resolveEvent,
  startGame,
} from './engine';
import { naira } from './format';
import type { GameEvent, GameState, PlayerSetup } from './types';

const setup: PlayerSetup = {
  nickname: 'Tester',
  departmentId: 'csc',
  background: 'broke',
  characterId: 'm1',
  homeId: 'male-estate',
};

/** A fresh game with some fields overridden. */
function game(overrides: Partial<GameState> = {}): GameState {
  return { ...startGame(setup), log: [], ...overrides };
}

const never = () => 0.99; // rng that never triggers an event
const action = (id: string) => getAction(id)!;

describe('meters and money', () => {
  it('clamps meters between 0 and 100', () => {
    expect(clampMeter(-5)).toBe(0);
    expect(clampMeter(150)).toBe(100);
    expect(clampMeter(42)).toBe(42);

    const s = applyEffects(game(), { energy: 500, stress: -500 });
    expect(s.meters.energy).toBe(100);
    expect(s.meters.stress).toBe(0);
  });

  it('caps energy at 100 after sleeping', () => {
    const s = doAction(game({ slotIndex: 3, meters: { grades: 50, energy: 90, social: 40, stress: 30 } }), 'sleep', never);
    // Sleep +45 is capped at 100; then end of day (no food) takes 20.
    expect(s.meters.energy).toBe(80);
  });

  it('never lets money go below 0', () => {
    expect(applyEffects(game({ money: 100 }), { money: -500 }).money).toBe(0);
  });

  it('formats naira with commas', () => {
    expect(naira(1800)).toBe('₦1,800');
    expect(naira(40000)).toBe('₦40,000');
    expect(naira(-700)).toBe('-₦700');
    expect(naira(0)).toBe('₦0');
  });
});

describe('availability', () => {
  it('disables actions the player cannot afford, with the reason', () => {
    const poor = game({ money: 200 });
    const check = canDoAction(poor, action('cafeteria'));
    expect(check).toEqual({ ok: false, reason: 'You need ₦700' });
    // Trying anyway changes nothing.
    expect(doAction(poor, 'cafeteria', never)).toBe(poor);
  });

  it('respects time slots', () => {
    const morning = game();
    expect(canDoAction(morning, action('lecture')).ok).toBe(true);
    expect(canDoAction(morning, action('sleep'))).toEqual({ ok: false, reason: 'Only in the Night' });
    expect(canDoAction(game({ slotIndex: 3 }), action('sleep')).ok).toBe(true);
  });

  it('has no lectures on weekends but allows hanging out all day', () => {
    const saturdayMorning = game({ day: 6 });
    expect(canDoAction(saturdayMorning, action('lecture'))).toEqual({ ok: false, reason: 'Not on weekends' });
    expect(canDoAction(saturdayMorning, action('hangout')).ok).toBe(true);
    expect(canDoAction(game({ day: 2 }), action('hangout')).ok).toBe(false);
  });

  it('knows when a place has nothing to do', () => {
    const morning = game();
    expect(hasAvailableAction(morning, 'lecture')).toBe(true);
    expect(hasAvailableAction(morning, 'field')).toBe(false);
    expect(hasAvailableAction(morning, 'gate')).toBe(false);
  });
});

describe('taking an action', () => {
  it('applies effects and moves to the next slot', () => {
    const s = doAction(game(), 'lecture', never);
    expect(s.meters).toEqual({ grades: 54, energy: 60, social: 40, stress: 33 });
    expect(currentSlot(s)).toBe('Afternoon');
    expect(s.today.studied).toBe(true);
  });

  it('records eating', () => {
    const s = doAction(game(), 'noodles', never);
    expect(s.today.ate).toBe(true);
    expect(s.money).toBe(8000 - 300);
  });
});

describe('collapse', () => {
  it('loses the next slot and adds stress when energy hits 0', () => {
    const tired = game({ meters: { grades: 50, energy: 10, social: 40, stress: 30 } });
    const s = doAction(tired, 'lecture', never);
    expect(s.meters.energy).toBe(0);
    expect(s.meters.stress).toBe(30 + 3 + 15);
    // Morning action, Afternoon lost, now Evening.
    expect(currentSlot(s)).toBe('Evening');
    expect(s.skipNextSlot).toBe(false);
    expect(s.log.some((l) => l.text.includes('collapsed'))).toBe(true);
  });

  it('a collapse at night costs the next morning', () => {
    const tired = game({ slotIndex: 3, today: { ate: true, studied: false }, meters: { grades: 50, energy: 20, social: 40, stress: 30 } });
    const s = doAction(tired, 'night-class', never);
    expect(s.day).toBe(2);
    expect(currentSlot(s)).toBe('Afternoon');
  });
});

describe('end of day', () => {
  it('punishes no study and no food', () => {
    const night = game({ slotIndex: 3 });
    const s = doAction(night, 'sleep', never);
    expect(s.day).toBe(2);
    expect(currentSlot(s)).toBe('Morning');
    expect(s.meters).toEqual({
      grades: 49, // no study -1
      energy: 80, // 70 + 45 = 100 (capped), no food -20
      social: 38, // daily -2
      stress: 30, // 30 - 10 sleep + 10 no food
    });
    expect(s.today).toEqual({ ate: false, studied: false });
  });

  it('only takes social when the player studied and ate', () => {
    const night = game({ slotIndex: 3, today: { ate: true, studied: true } });
    const s = doAction(night, 'sleep', never);
    expect(s.meters).toEqual({ grades: 50, energy: 100, social: 38, stress: 20 });
  });

  it('burns out at stress 90 or more', () => {
    const stressed = game({ slotIndex: 3, today: { ate: true, studied: false }, meters: { grades: 50, energy: 70, social: 40, stress: 85 } });
    const s = doAction(stressed, 'night-class', never);
    // +8 night class, -5 burnout (stress 93 at end of day). Studied, so no -1.
    expect(s.meters.grades).toBe(50 + 8 - 5);
    expect(s.log.some((l) => l.text.includes('burnout'))).toBe(true);
  });

  it('does not burn out below 90', () => {
    const s = doAction(game({ slotIndex: 3, today: { ate: true, studied: true }, meters: { grades: 50, energy: 70, social: 40, stress: 89 } }), 'noodles', never);
    expect(s.meters.grades).toBe(50);
  });
});

describe('allowance', () => {
  it('pays on the morning of day 1', () => {
    const s = startGame(setup);
    expect(s.money).toBe(5000 + 3000);
    expect(startGame({ ...setup, background: 'comfortable' }).money).toBe(40000 + 20000);
  });

  it('pays again on day 8 and on no other day', () => {
    const day7night = game({ day: 7, slotIndex: 3, money: 1000 });
    expect(doAction(day7night, 'sleep', never).money).toBe(1000 + 3000);

    const day3night = game({ day: 3, slotIndex: 3, money: 1000 });
    expect(doAction(day3night, 'sleep', never).money).toBe(1000);
  });
});

describe('events', () => {
  const fixtures: GameEvent[] = [
    {
      id: 'lecture-morning',
      slot: 'Morning',
      locationType: 'lecture',
      text: 'Surprise test!',
      choices: [
        { label: 'Write it', effects: { grades: 3, stress: 5 }, outcome: 'You wrote it.' },
        { label: 'Run', effects: { grades: -3 }, outcome: 'You ran.' },
      ],
    },
    {
      id: 'anywhere',
      slot: 'any',
      locationType: 'any',
      text: 'NEPA took light.',
      choices: [
        { label: 'Sleep', effects: { energy: 5 }, outcome: 'Zzz.' },
        { label: 'Complain', effects: { stress: 5 }, outcome: 'Ah.' },
      ],
    },
  ];

  it('only picks events whose trigger matches', () => {
    const s = game();
    // rng 0 = always passes the chance roll and picks the first match.
    expect(pickEvent(s, 'Morning', 'lecture', () => 0, fixtures)?.id).toBe('lecture-morning');
    expect(pickEvent(s, 'Morning', 'hostel', () => 0, fixtures)?.id).toBe('anywhere');
    expect(pickEvent(s, 'Night', 'lecture', () => 0, fixtures)?.id).toBe('anywhere');
    expect(pickEvent(s, 'Morning', 'lecture', () => 0, [])).toBeNull();
  });

  it('respects the chance roll', () => {
    expect(pickEvent(game(), 'Morning', 'lecture', () => 0.99, fixtures)).toBeNull();
  });

  it('picks randomly between matching events', () => {
    const rolls = [0, 0.9]; // pass chance, then pick the last match
    const rng = () => rolls.shift() ?? 0;
    expect(pickEvent(game(), 'Morning', 'lecture', rng, fixtures)?.id).toBe('anywhere');
  });

  it('allows at most one event per day', () => {
    expect(pickEvent(game({ eventDoneToday: true }), 'Morning', 'lecture', () => 0, fixtures)).toBeNull();
  });

  it('pauses the slot until the player chooses, then applies the choice', () => {
    const s1 = doAction(game(), 'lecture', () => 0, fixtures);
    expect(s1.pendingEventId).toBe('lecture-morning');
    expect(currentSlot(s1)).toBe('Morning');
    expect(canDoAction(s1, action('cafeteria')).ok).toBe(false);

    const s2 = resolveEvent(s1, 0, fixtures);
    expect(s2.pendingEventId).toBeNull();
    expect(currentSlot(s2)).toBe('Afternoon');
    expect(s2.meters.grades).toBe(50 + 4 + 3);

    // Same day, rng would trigger, but the day already had its event.
    const s3 = doAction(s2, 'lecture', () => 0, fixtures);
    expect(s3.pendingEventId).toBeNull();
    expect(currentSlot(s3)).toBe('Evening');
  });

  it('allows a new event the next day', () => {
    const s = advanceSlot(game({ slotIndex: 3, eventDoneToday: true }));
    expect(s.eventDoneToday).toBe(false);
  });
});

describe('CGPA and class', () => {
  it('is grades / 20 to 2 decimal places', () => {
    expect(computeCgpa(50)).toBe(2.5);
    expect(computeCgpa(100)).toBe(5);
    expect(computeCgpa(0)).toBe(0);
    expect(computeCgpa(67)).toBe(3.35);
  });

  it('maps to the right class at each boundary', () => {
    expect(degreeClass(5)).toBe('First Class');
    expect(degreeClass(4.5)).toBe('First Class');
    expect(degreeClass(4.49)).toBe('Second Class Upper');
    expect(degreeClass(3.5)).toBe('Second Class Upper');
    expect(degreeClass(3.45)).toBe('Second Class Lower');
    expect(degreeClass(2.4)).toBe('Second Class Lower');
    expect(degreeClass(2.35)).toBe('Third Class');
    expect(degreeClass(1.5)).toBe('Third Class');
    expect(degreeClass(1.45)).toBe('Probation');
  });

  it('builds the final result from grades', () => {
    const s = game({ meters: { grades: 92, energy: 50, social: 50, stress: 50 } });
    expect(finalResult(s)).toMatchObject({ cgpa: 4.6, className: 'First Class' });
  });
});

describe('a whole semester', () => {
  it('runs 14 days to the end', () => {
    let s = startGame(setup);
    let moves = 0;
    while (!s.finished && moves < 200) {
      const next = ACTIONS.find((a) => canDoAction(s, a).ok);
      expect(next).toBeDefined();
      s = doAction(s, next!.id, never);
      moves++;
    }
    expect(s.finished).toBe(true);
    expect(s.day).toBe(14);
    expect(moves).toBeLessThanOrEqual(56);
    // Once finished, nothing else is allowed.
    expect(canDoAction(s, action('noodles')).ok).toBe(false);
  });
});

describe('event data', () => {
  it('has 20 draft events with unique ids', () => {
    expect(EVENTS).toHaveLength(20);
    expect(new Set(EVENTS.map((e) => e.id)).size).toBe(20);
    expect(EVENTS.every((e) => e.draft)).toBe(true);
  });

  it('always offers at least one choice that costs no money', () => {
    for (const e of EVENTS) {
      const free = e.choices.some((c) => (c.effects.money ?? 0) >= 0);
      expect(free, e.id).toBe(true);
    }
  });

  it('disables a choice the player cannot afford', () => {
    const loan = EVENTS.find((e) => e.id === 'friend-loan')!;
    const poor = game({ money: 500, pendingEventId: 'friend-loan' });
    expect(canChoose(poor, loan.choices[0])).toEqual({ ok: false, reason: 'You need ₦2,000' });
    expect(canChoose(poor, loan.choices[1]).ok).toBe(true);
    // Trying the unaffordable choice changes nothing.
    expect(resolveEvent(poor, 0)).toBe(poor);
    expect(resolveEvent(poor, 1).pendingEventId).toBeNull();
  });
});

describe('titles', () => {
  const m = (grades: number, energy: number, social: number, stress: number) => ({ grades, energy, social, stress });

  it('has 8 titles and the last always matches', () => {
    expect(TITLES).toHaveLength(8);
    expect(TITLES[TITLES.length - 1]!.when(m(50, 50, 50, 50), 5000)).toBe(true);
  });

  it('picks titles from the final meters', () => {
    expect(pickTitle(m(90, 50, 10, 30), 5000).title).toBe('Library Ghost');
    expect(pickTitle(m(40, 50, 40, 30), 40000).title).toBe('Hustler of the Semester');
    expect(pickTitle(m(85, 50, 80, 30), 5000).title).toBe('Campus Celebrity Scholar');
    expect(pickTitle(m(40, 50, 90, 30), 5000).title).toBe('Owambe Minister');
    expect(pickTitle(m(60, 50, 50, 80), 5000).title).toBe('Running on Panadol');
    expect(pickTitle(m(60, 10, 50, 30), 5000).title).toBe('Sleep Is a Myth');
    expect(pickTitle(m(60, 50, 50, 30), 500).title).toBe('Surviving on Garri');
    expect(pickTitle(m(60, 50, 50, 30), 5000).title).toBe('Certified Survivor');
  });
});

describe('a whole semester with events', () => {
  it('finishes when an event can fire on every action', () => {
    let s = startGame({ ...setup, background: 'broke' });
    let events = 0;
    for (let i = 0; i < 300 && !s.finished; i++) {
      const pending = getPendingEvent(s);
      if (pending) {
        const pick = canChoose(s, pending.choices[0]).ok ? 0 : 1;
        s = resolveEvent(s, pick);
        events++;
        continue;
      }
      const next = ACTIONS.find((a) => canDoAction(s, a).ok)!;
      s = doAction(s, next.id, () => 0);
    }
    expect(s.finished).toBe(true);
    expect(events).toBeGreaterThan(0);
    expect(events).toBeLessThanOrEqual(14);
  });
});
