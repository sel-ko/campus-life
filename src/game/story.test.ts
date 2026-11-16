import { describe, expect, it } from 'vitest';
import { PLACES } from '../content/places';
import { getInteractions, performInteraction, travelOptions } from './interactions';
import { feelings, moodOf, tickNeeds } from './needs';
import { dayPlan } from './planner';
import { crowdLevel, placeStatus } from './status';
import { currentChapter, nextStep } from './story';
import { at, signAll, testGame, veteranGame } from './testkit';

describe('hygiene and the bladder', () => {
  it('drop every slot, and you can bathe and use the toilet in your room', () => {
    const d = structuredClone(testGame());
    const start = { ...d.needs };
    tickNeeds(d);
    expect(d.needs.hygiene).toBeLessThan(start.hygiene);
    expect(d.needs.bladder).toBeGreaterThan(start.bladder);
    d.needs.bladder = 60;
    d.room.water = true;
    const list = getInteractions(d, d.room.placeId);
    expect(list.find((i) => i.kind === 'bath')?.target.type).toBe('shower');
    const washed = performInteraction(d, d.room.placeId, 'bath');
    expect(washed.needs.hygiene).toBe(100);
    expect(washed.clock.slot).toBe(d.clock.slot); // quick: no slot used, just minutes
    const relieved = performInteraction(washed, d.room.placeId, 'toilet');
    expect(relieved.needs.bladder).toBe(0);
  });

  it('holding it too long ends badly', () => {
    const d = structuredClone(testGame());
    d.needs.bladder = 95;
    d.needs.hygiene = 80;
    tickNeeds(d);
    expect(d.needs.bladder).toBe(0);
    expect(d.needs.hygiene).toBeLessThan(50);
  });

  it('feelings explain the mood', () => {
    const d = structuredClone(testGame());
    d.needs.hygiene = 5;
    d.needs.bladder = 90;
    const ids = feelings(d).map((f) => f.id);
    expect(ids).toContain('smelly');
    expect(ids).toContain('pressed');
    const bad = moodOf(d).score;
    d.needs.hygiene = 100;
    d.needs.bladder = 0;
    expect(moodOf(d).score).toBeGreaterThan(bad);
  });

  it('every action says what it does to you', () => {
    const d = structuredClone(testGame());
    const list = getInteractions(d, d.room.placeId);
    expect(list.find((i) => i.kind === 'sleep')?.effects).toContain('+Energy');
  });
});

describe('the story', () => {
  it('starts with the fresher chapter: freshen up first, then clearance', () => {
    const d = structuredClone(testGame());
    const ch = currentChapter(d);
    expect(ch.number).toBe(1);
    expect(nextStep(d)?.id).toBe('bath');
    d.room.water = true;
    const after = performInteraction(d, d.room.placeId, 'bath');
    expect(nextStep(after)?.id).toBe('eat');
    expect(after.money).toBe(d.money + 300); // the step's reward, once
    const again = performInteraction(after, after.room.placeId, 'toilet');
    expect(again.money).toBe(after.money);
  });

  it('adds a follow-up step when an office turns you back', () => {
    const d = structuredClone(testGame());
    d.flags.bathed = 1;
    d.stats.meals = 1;
    d.flags.acceptance_paid = 1;
    d.inventory.photocopy = 1; // documents bought, but no passport photograph
    d.inventory.passport = 0;
    const steps = currentChapter(d).steps;
    const sub = steps.find((s) => s.sub && s.id.startsWith('docs_admissions'));
    expect(sub?.label).toMatch(/passport/);
    expect(nextStep(d)?.sub).toBe(true);
    d.inventory.passport = 2;
    expect(currentChapter(d).steps.some((s) => s.id === 'docs_admissions')).toBe(false);
  });

  it('keeps the town and night life closed until the clearance form is done', () => {
    const d = structuredClone(testGame());
    const club = PLACES.find((p) => p.venue === 'club')!;
    expect(travelOptions(d, club.id).every((o) => !o.available)).toBe(true);
    signAll(d);
    expect(travelOptions(d, club.id).some((o) => o.available)).toBe(true);
  });

  it('moves on to semester chapters once clearance and the first steps are done', () => {
    const d = veteranGame();
    const ch = currentChapter(d);
    expect(ch.title).toMatch(/200 Level/);
    expect(ch.steps.length).toBeGreaterThan(2);
  });
});

describe('the day planner and live status', () => {
  it('always has something in every part of the day', () => {
    const d = structuredClone(testGame());
    for (let day = 1; day <= 14; day++) {
      const plan = dayPlan(d, day);
      expect(new Set(plan.map((p) => p.slot)).size).toBe(4);
    }
    // Freshers' week shows orientation and clearance office hours.
    const kinds = dayPlan(d, 2).map((p) => p.kind);
    expect(kinds).toContain('clearance');
  });

  it('shows classes from the timetable, and rooms fill up for them', () => {
    const d = veteranGame();
    const c = d.academics.courses.find((x) => x.meetings.length)!;
    const m = c.meetings[0]!;
    at(d, m.day, m.slot);
    expect(dayPlan(d, m.day).some((p) => p.kind === 'class' || p.kind === 'test')).toBe(true);
    expect(placeStatus(d, m.placeId).tone).toBe('live');
    expect(crowdLevel(d, m.placeId)).toBeGreaterThan(0.5);
  });
});
