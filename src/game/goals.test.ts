import { describe, expect, it } from 'vitest';
import { AMBITIONS } from '../content/ambitions';
import { checkMilestonesMut, checkObjectivesMut, electionMut, finalMilestonesMut, newWeekMut } from './goals';
import { journal } from './journal';
import { Rng } from './rng';
import { at, testGame } from './testkit';

describe('ambitions', () => {
  it('each has yearly milestones and an ending, all drafts', () => {
    expect(AMBITIONS.map((a) => a.id)).toEqual(['first_class', 'big_money', 'su_president', 'soft_life']);
    for (const a of AMBITIONS) {
      expect(a.milestones.some((m) => m.level === 'final')).toBe(true);
      expect(a.ending.win && a.ending.lose).toBeTruthy();
      expect(a.draft).toBe(true);
    }
  });

  it('marks a milestone done or missed at the end of the level', () => {
    const d = structuredClone(testGame());
    d.goals.ambition = 'big_money';
    d.money = 50000;
    checkMilestonesMut(d, 1, false);
    expect(d.goals.milestones.bm1).toBe('done');
    const poor = structuredClone(testGame());
    poor.goals.ambition = 'big_money';
    poor.money = 100;
    checkMilestonesMut(poor, 1, true);
    expect(poor.goals.milestones.bm1).toBeUndefined(); // repeating: decided next time
    checkMilestonesMut(poor, 1, false);
    expect(poor.goals.milestones.bm1).toBe('missed');
    finalMilestonesMut(poor);
    expect(Object.keys(poor.goals.milestones)).toHaveLength(4);
  });

  it('holds elections for the Student Union ambition and rewards popularity', () => {
    const d = at(structuredClone(testGame()), 10, 0);
    d.goals.ambition = 'su_president';
    d.academics.level = 2;
    for (const id of ['tobi', 'ify', 'kelz', 'dami', 'osaze', 'zainab', 'tega']) d.people[id]!.rel = 60;
    electionMut(d, new Rng(1));
    expect(d.goals.position).toBe('class_rep');
    const loner = at(structuredClone(testGame()), 10, 0);
    loner.goals.ambition = 'su_president';
    loner.academics.level = 2;
    electionMut(loner, new Rng(1));
    expect(loner.goals.position).toBe('none');
  });
});

describe('weekly objectives', () => {
  it('draws three different objectives from the situation and ticks them off', () => {
    const d = structuredClone(testGame());
    expect(d.goals.objectives).toHaveLength(3);
    expect(new Set(d.goals.objectives.map((o) => o.metric)).size).toBe(3);
    // A clearance-week objective only appears during clearance.
    for (let s = 1; s < 30; s++) {
      const x = structuredClone(d);
      x.clearance.active = false;
      newWeekMut(x, new Rng(s));
      expect(x.goals.objectives.some((o) => o.metric === 'signatures')).toBe(false);
    }
    d.goals.objectives = [{ id: 'obj_read', label: 'Read 3 times', metric: 'reads', target: 3, done: false }];
    d.week.reads = 3;
    checkObjectivesMut(d);
    expect(d.goals.objectives[0]!.done).toBe(true);
    expect(d.goals.objectivesDone).toBe(1);
  });

  it('puts the next milestone in the journal', () => {
    expect(journal(testGame()).some((t) => t.group === 'goals')).toBe(true);
  });
});
