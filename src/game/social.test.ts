import { describe, expect, it } from 'vitest';
import { CAMPUS_WEEKS } from '../content/campusWeek';
import { CHAT_SCRIPTS } from '../content/chatScripts';
import { EVENTS } from '../content/events';
import { campusWeekFor, isoWeekKey, syncCampusWeekMut } from './campus';
import { answerMut, chatDayMut, totalUnread } from './chat';
import { applyEffects } from './effects';
import { beginDay } from './engine';
import { chooseEventMut, dueEventsMut, eligibleEvents, maybeEventMut } from './events';
import { doFavourMut, favoursFor, loansDayMut, talkMut } from './people';
import { Rng } from './rng';
import { at, testGame } from './testkit';

describe('event content', () => {
  it('has at least 80 events, all drafts, covering every category', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(80);
    expect(EVENTS.every((e) => e.draft)).toBe(true);
    const cats = new Set(EVENTS.map((e) => e.category));
    for (const c of ['clearance', 'portal', 'gst', 'lectures', 'tests', 'roommates', 'money', 'utilities', 'health', 'friends', 'travel', 'later_years']) {
      expect(cats.has(c as never), c).toBe(true);
    }
    const ids = new Set(EVENTS.map((e) => e.id));
    expect(ids.size).toBe(EVENTS.length);
    for (const e of EVENTS) for (const ch of e.choices) if (ch.followUp) expect(ids.has(ch.followUp.event), ch.followUp.event).toBe(true);
    expect(CHAT_SCRIPTS.every((s) => s.draft)).toBe(true);
  });
});

describe('events', () => {
  it('only offers cards whose conditions match', () => {
    const d = structuredClone(testGame());
    const atOffice = eligibleEvents(d, 'admin_office').map((e) => e.id);
    expect(atOffice).toContain('clr_queue_friend');
    expect(atOffice).not.toContain('rm_music');
    d.clearance.active = false;
    expect(eligibleEvents(d, 'admin_office').map((e) => e.id)).not.toContain('clr_queue_friend');
  });

  it('fires at most one random event a day', () => {
    const d = structuredClone(testGame());
    const r = new Rng(1);
    for (let i = 0; i < 50 && !d.pendingEvent; i++) maybeEventMut(d, r, 'admin_office', null);
    expect(d.pendingEvent).not.toBeNull();
    chooseEventMut(d, 1);
    maybeEventMut(d, new Rng(2), 'admin_office', null);
    for (let i = 0; i < 50; i++) maybeEventMut(d, r, 'admin_office', null);
    expect(d.pendingEvent).toBeNull();
  });

  it('chains a follow-up some days later', () => {
    const d = structuredClone(testGame());
    d.pendingEvent = { id: 'clr_tout', placeId: null };
    const money = d.money;
    chooseEventMut(d, 0);
    expect(d.money).toBe(money - 5000);
    expect(d.scheduled).toEqual([{ eventId: 'clr_tout_gone', dayCount: d.clock.dayCount + 2 }]);
    dueEventsMut(d);
    expect(d.pendingEvent).toBeNull();
    d.clock.dayCount += 2;
    dueEventsMut(d);
    expect(d.pendingEvent?.id).toBe('clr_tout_gone');
  });

  it('refuses a choice the player cannot afford', () => {
    const d = structuredClone(testGame());
    d.money = 100;
    d.pendingEvent = { id: 'clr_tout', placeId: null };
    chooseEventMut(d, 0);
    expect(d.pendingEvent).not.toBeNull();
  });

  it('brings up a confrontation the morning after a theft', () => {
    const d = structuredClone(testGame());
    d.flags.theft = d.clock.dayCount - 1;
    dueEventsMut(d);
    expect(d.pendingEvent?.id).toBe('rm_theft');
  });
});

describe('the campus-wide event', () => {
  it('is the same for everyone in the same real week and changes by week', () => {
    const tues = Date.UTC(2026, 10, 17, 9);
    const thurs = Date.UTC(2026, 10, 19, 22);
    expect(isoWeekKey(tues)).toBe('2026-W47');
    expect(campusWeekFor(tues)).toEqual(campusWeekFor(thurs));
    const seen = new Set<string>();
    for (let w = 0; w < 60; w++) seen.add(campusWeekFor(Date.UTC(2026, 0, 5) + w * 7 * 86400000).event.id);
    expect(seen.size).toBeGreaterThan(CAMPUS_WEEKS.length / 2);
    const d = structuredClone(testGame());
    expect(syncCampusWeekMut(d, tues)).toBe(true);
    expect(syncCampusWeekMut(d, thurs)).toBe(false);
  });
});

describe('chat', () => {
  it('starts with the freshers and class groups', () => {
    const g = testGame();
    expect(Object.keys(g.chat.threads)).toEqual(expect.arrayContaining(['freshers', 'class']));
    expect(totalUnread(g)).toBeGreaterThan(0);
  });

  it('announces tests ahead of time', () => {
    const d = structuredClone(testGame());
    const c = d.academics.courses.find((x) => x.meetings.some((m) => m.test))!;
    const test = c.meetings.find((m) => m.test)!;
    at(d, test.day - 2, 0);
    const before = d.chat.threads.class!.messages.length;
    chatDayMut(d, new Rng(1), []);
    const texts = d.chat.threads.class!.messages.slice(before).map((m) => m.text).join(' ');
    expect(texts).toContain(c.code);
  });

  it('applies the effects of a reply once', () => {
    const d = structuredClone(testGame());
    const t = d.chat.threads.freshers!;
    const m = t.messages.find((x) => x.replies)!;
    const rel = d.people.tega!.rel;
    answerMut(d, 'freshers', m.id, 0, (e) => applyEffects(d, e));
    answerMut(d, 'freshers', m.id, 0, (e) => applyEffects(d, e));
    expect(d.people.tega!.rel).toBe(rel + 2);
    expect(m.answered).toBe(0);
  });

  it('posts announcements through a normal day', () => {
    const d = structuredClone(testGame());
    const before = d.chat.seq;
    for (let i = 0; i < 5; i++) {
      d.clock.day += 1;
      d.clock.dayCount += 1;
      beginDay(d, new Rng(i + 1));
    }
    expect(d.chat.seq).toBeGreaterThan(before);
  });
});

describe('people', () => {
  it('builds relationships by talking, once a day', () => {
    const d = structuredClone(testGame());
    const rel = d.people.ify!.rel;
    talkMut(d, new Rng(1), 'ify');
    expect(d.people.ify!.rel).toBeGreaterThan(rel);
  });

  it('unlocks help with a good relationship', () => {
    const d = structuredClone(testGame());
    expect(favoursFor(d, 'ify').find((f) => f.id === 'notes')?.available).toBe(false);
    d.people.ify!.rel = 30;
    expect(favoursFor(d, 'ify').find((f) => f.id === 'notes')?.available).toBe(true);
    const before = Math.min(...d.academics.courses.map((c) => c.knowledge));
    doFavourMut(d, new Rng(1), 'ify', 'notes');
    expect(Math.max(...d.academics.courses.map((c) => c.knowledge))).toBeGreaterThan(before);
    expect(favoursFor(d, 'ify').find((f) => f.id === 'notes')?.available).toBe(false);
  });

  it('lends money and remembers if you do not pay back', () => {
    const d = structuredClone(testGame());
    d.people.dami!.rel = 25;
    const money = d.money;
    doFavourMut(d, new Rng(1), 'dami', 'loan');
    expect(d.money).toBe(money + 3000);
    expect(favoursFor(d, 'dami').find((f) => f.id === 'loan')?.available).toBe(false);
    d.clock.dayCount += 8;
    loansDayMut(d, new Rng(1));
    expect(d.people.dami!.rel).toBeLessThan(25);
    const repay = favoursFor(d, 'dami').find((f) => f.id.startsWith('repay:'))!;
    doFavourMut(d, new Rng(1), 'dami', repay.id);
    expect(d.loans).toHaveLength(0);
  });
});
