import { describe, expect, it } from 'vitest';
import { canDoAssignment, assignmentGiven } from './academics';
import { academicCalendar, movedText } from './calendar';
import { KNOWLEDGE } from './config';
import { waitSlot } from './engine';
import { chooseEvent, getInteractions, performInteraction } from './interactions';
import { journal } from './journal';
import { feelings } from './needs';
import { classAlerts, classWindow } from './periods';
import { currentObjectives, mainQuests, questLog, questsMut } from './quests';
import { loadSave } from './save';
import { startSideQuestMut } from './questState';
import { currentChapter } from './story';
import { at, signAll, testGame, veteranGame } from './testkit';
import type { CourseState, GameState, Meeting } from './types';

function firstMeeting(d: GameState, pred: (c: CourseState, m: Meeting) => boolean = () => true) {
  for (const c of d.academics.courses) for (const m of c.meetings) if (m.status === 'scheduled' && pred(c, m)) return { c, m };
  throw new Error('no meeting');
}

describe('the main story as connected quests', () => {
  it('runs arrival → fees → clearance → settle in → register → first classes → ... → results', () => {
    const d = structuredClone(testGame());
    const bases = mainQuests(d).map((q) => q.id.split(':')[1]);
    expect(bases).toEqual(['arrival', 'fees', 'clearance', 'settle_in', 'register', 'first_classes', 'first_assignment', 'first_test', 'exam_ready', 'exams', 'results']);
    expect(mainQuests(d).filter((q) => q.status === 'active')).toHaveLength(1);
    expect(questLog(d).current?.title).toBe('Welcome, fresher');
    expect(mainQuests(d)[1]!.status).toBe('locked');
  });

  it('finishing a quest pays XP once and opens the next one', () => {
    const d = structuredClone(testGame());
    d.flags.bathed = 1;
    d.stats.meals = 1;
    questsMut(d);
    expect(d.quests.xp).toBeGreaterThan(0);
    expect(questLog(d).current?.id.endsWith(':fees')).toBe(true);
    const xp = d.quests.xp;
    questsMut(d);
    expect(d.quests.xp).toBe(xp);
    expect(d.log.some((l) => l.text.includes('Quest complete: Welcome, fresher'))).toBe(true);
  });

  it('shows clearance progress as signatures out of eight', () => {
    const d = structuredClone(testGame());
    d.flags.bathed = 1;
    d.stats.meals = 1;
    d.flags.acceptance_paid = 1;
    for (const f of d.finance.fees) if (f.dueSemester === 1) f.paid = true;
    d.inventory.photocopy = 10;
    d.inventory.passport = 4;
    d.inventory.receipt = 2;
    d.clearance.signed.admissions = true;
    d.clearance.signed.registry = true;
    d.clearance.signed.bursary = true;
    const q = questLog(d).current!;
    expect(q.title).toBe('The clearance walk');
    const sig = q.objectives.find((o) => o.progress?.need === 8)!;
    expect(sig.progress).toEqual({ have: 3, need: 8 });
    expect(sig.label).toMatch(/Signature 4\/8/);
    expect(currentObjectives(d)[0]!.kind).toBe('main');
  });

  it('later semesters start from results day and a new semester', () => {
    const d = veteranGame();
    const bases = mainQuests(d).map((q) => q.id.split(':')[1]);
    expect(bases.slice(0, 4)).toEqual(['new_semester', 'classes', 'assignments', 'tests']);
    expect(currentChapter(d).title).toMatch(/200 Level/);
  });
});

describe('side quests hook into the story', () => {
  it('an event choice starts one, doing things moves it on, and its reward helps', () => {
    const d = veteranGame();
    d.pendingEvent = { id: 'health_jogging', placeId: null };
    const after = chooseEvent(d, 0);
    const side = questLog(after).side;
    expect(side.map((s) => s.title)).toContain('Morning jogger');
    expect(side[0]!.helps).toBeTruthy();
    // Two runs round the track finish it.
    const x = structuredClone(after);
    x.quests.counts.exercise = (x.quests.counts.exercise ?? 0) + 2;
    const health = x.needs.health;
    questsMut(x);
    expect(x.quests.side.find((s) => s.id === 'fit_life')?.status).toBe('done');
    expect(x.needs.health).toBeGreaterThan(health - 1);
    expect(questLog(x).sideDone.length).toBe(1);
  });

  it('a study quest from the efiko adds knowledge for the next test', () => {
    const d = veteranGame();
    expect(startSideQuestMut(d, 'ify_study')).toBe(true);
    expect(startSideQuestMut(d, 'ify_study')).toBe(false); // already running
    const before = d.academics.courses.map((c) => c.knowledge).reduce((a, b) => a + b, 0);
    d.quests.counts.read = (d.quests.counts.read ?? 0) + 3;
    d.quests.counts['talk:ify'] = (d.quests.counts['talk:ify'] ?? 0) + 1;
    questsMut(d);
    const after = d.academics.courses.map((c) => c.knowledge).reduce((a, b) => a + b, 0);
    expect(after).toBe(before + 8);
    expect(journal(d).some((t) => t.id.startsWith('side:'))).toBe(false);
  });

  it('old saves get a quest log without being paid again', () => {
    const d = structuredClone(testGame());
    d.flags.bathed = 1;
    d.stats.meals = 1;
    const old = structuredClone(d) as Partial<GameState>;
    delete old.quests;
    const loaded = loadSave(old).game!;
    expect(loaded.quests).toBeTruthy();
    expect(loaded.money).toBe(d.money);
    expect(loaded.quests.main['y1s1:arrival']).toBeTruthy();
  });
});

describe('assignments come from class, not on day one', () => {
  it('a new game has no assignments at all', () => {
    const d = testGame();
    expect(d.academics.courses.length).toBeGreaterThan(0);
    for (const c of d.academics.courses) {
      expect(assignmentGiven(c)).toBe(false);
      expect(canDoAssignment(d, c).ok).toBe(false);
    }
    expect(journal(d).some((t) => t.id.startsWith('assignment:'))).toBe(false);
    expect(academicCalendar(d).some((e) => /assignment/.test(e.title))).toBe(false);
    expect(getInteractions(d, d.room.placeId).some((i) => i.kind === 'assignment')).toBe(false);
  });

  it('the lecturer gives it at the class, with a due day and time', () => {
    const d = veteranGame();
    const { c, m } = firstMeeting(d, (_c, x) => !!x.assign);
    at(d, m.day, m.slot);
    const after = performInteraction(d, m.placeId, `attend:${c.code}`);
    const course = after.academics.courses.find((x) => x.code === c.code)!;
    expect(assignmentGiven(course)).toBe(true);
    expect(course.assignmentDue).toBeGreaterThan(m.day);
    expect(course.assignmentDueMin).toBe(17 * 60);
    expect(after.log.some((l) => /gave an assignment: due/.test(l.text))).toBe(true);
  });

  it('miss that class and the course rep passes it on in the class group', () => {
    const d = veteranGame();
    const { c, m } = firstMeeting(d, (_c, x) => !!x.assign);
    at(d, m.day, m.slot);
    const after = waitSlot(d);
    const course = after.academics.courses.find((x) => x.code === c.code)!;
    expect(assignmentGiven(course)).toBe(true);
    expect(after.chat.threads.class!.messages.some((x) => x.text.includes(`${c.code} assignment`))).toBe(true);
  });
});

describe('attending class teaches you', () => {
  it('attending raises the course knowledge noticeably; skipping does not', () => {
    const d = veteranGame();
    const { c, m } = firstMeeting(d, (cc) => cc.kind === 'lecture');
    at(d, m.day, m.slot);
    d.needs.energy = 80;
    d.needs.hunger = 20;
    const k = c.knowledge;
    const went = performInteraction(d, m.placeId, `attend:${c.code}`);
    const gained = went.academics.courses.find((x) => x.code === c.code)!.knowledge - k;
    expect(gained).toBeGreaterThanOrEqual(KNOWLEDGE.lectureMin - 1);
    const skipped = waitSlot(d);
    expect(skipped.academics.courses.find((x) => x.code === c.code)!.knowledge).toBeLessThanOrEqual(k);
  });
});

describe('moved classes and exact times', () => {
  it('a moved class says its new day, time and hall', () => {
    const d = veteranGame();
    const { c, m } = firstMeeting(d, (_c, x) => x.day >= 3 && x.day <= 5);
    m.from = { day: m.day, slot: m.slot, placeId: m.placeId };
    m.slot = m.slot === 1 ? 2 : 1;
    m.moved = true;
    const text = movedText(d, c, m);
    expect(text).toMatch(new RegExp(`^${c.code} moved to \\w{3} \\d+ \\w{3}, \\d+:\\d{2} (am|pm) at .+ \\(was \\w{3} \\d+ \\w{3}, \\d+:\\d{2} (am|pm)\\)`));
    expect(text).toContain(m.slot === 1 ? '1:00 pm' : '4:00 pm');
  });

  it('is not "late" at 5 am for a class later that morning, only after it starts', () => {
    const d = veteranGame();
    const { c, m } = firstMeeting(d, (_c, x) => x.slot === 0);
    const w = classWindow(c, m);
    at(d, m.day, 0);
    d.clock.min = w.start - 5 * 60; // e.g. 5 am (alarm) for a 10 am class
    let alerts = classAlerts(d, null).filter((a) => a.code === c.code);
    expect(alerts.some((a) => a.kind === 'late')).toBe(false);
    expect(alerts.find((a) => a.kind === 'soon')?.text).toMatch(/in 5 h$/);
    // Ten minutes after it starts, and you are not there: late.
    d.clock.min = w.start + 10;
    alerts = classAlerts(d, null).filter((a) => a.code === c.code);
    expect(alerts[0]?.kind).toBe('late');
    // In the hall: no alert. After it ends: no alert, and you cannot attend.
    expect(classAlerts(d, m.placeId).some((a) => a.code === c.code && a.kind === 'late')).toBe(false);
    d.clock.min = w.end + 5;
    expect(classAlerts(d, null).some((a) => a.id === `late:${c.code}:${m.day}`)).toBe(false);
    expect(getInteractions(d, m.placeId).find((i) => i.id === `attend:${c.code}`)?.available).toBe(false);
  });
});

describe('no fake stats', () => {
  it('the power cut feeling shows the real phone battery', () => {
    const d = structuredClone(testGame());
    signAll(d);
    d.room.light = false;
    d.phone.battery = 37;
    expect(feelings(d).find((f) => f.id === 'no_light')?.text).toContain('37%');
  });
});
