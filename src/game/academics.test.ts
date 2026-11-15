import { describe, expect, it } from 'vitest';
import {
  attendMut,
  attendance,
  barred,
  canWriteExam,
  cgpaOf,
  classOfDegree,
  endOfSession,
  gpa,
  gradeFor,
  meetingsNow,
  resolveIssueMut,
  semesterResults,
  writeExamMut,
} from './academics';
import { getFee } from './money';
import { Rng } from './rng';
import { at, testGame, veteranGame } from './testkit';
import type { CourseState, GameState } from './types';

function registeredGame(programmeId = 'computer_science'): GameState {
  const d = veteranGame({ programmeId });
  d.academics.registered = true;
  getFee(d, 'school1')!.paid = true;
  d.flags.formDoneDay = 1; // clearance done: attendance counts from day 1
  return d;
}

function course(d: GameState, kind = 'lecture'): CourseState {
  return d.academics.courses.find((c) => c.kind === kind && c.meetings.filter((m) => m.status === 'scheduled').length >= 3)!;
}

describe('the timetable', () => {
  it('starts lectures in week two for new freshers and keeps exams in the last days', () => {
    const d = testGame();
    for (const c of d.academics.courses) {
      for (const m of c.meetings) expect(m.day).toBeGreaterThanOrEqual(8);
      expect(c.exam.day).toBeGreaterThanOrEqual(11);
    }
    const examSlots = d.academics.courses.map((c) => `${c.exam.day}:${c.exam.slot}`);
    expect(new Set(examSlots).size).toBe(examSlots.length);
  });

  it('meets on weekdays except for lectures fixed for a weekend', () => {
    let weekend = 0;
    for (let seed = 1; seed <= 30; seed++) {
      for (const c of veteranGame({ seed }).academics.courses) {
        for (const m of c.meetings) {
          if ([6, 7, 13, 14].includes(m.day)) {
            weekend++;
            expect(m.moved).toBe(true);
          }
        }
      }
    }
    expect(weekend).toBeGreaterThan(0);
  });

  it('holds general courses in the big halls and gives each lecture course a test day', () => {
    const d = testGame();
    const gst = d.academics.courses.filter((c) => c.kind === 'gst');
    expect(gst.map((c) => c.code)).toEqual(['GST 111', 'GST 112', 'GST 113']);
    for (const c of veteranGame().academics.courses.filter((x) => x.kind === 'lecture')) {
      if (c.meetings.some((m) => m.status === 'scheduled')) expect(c.meetings.filter((m) => m.test)).toHaveLength(1);
    }
  });
});

describe('attendance and the 75% rule', () => {
  it("does not count a new fresher's missed lectures before the clearance form is done", () => {
    const d = structuredClone(testGame());
    const c = d.academics.courses.find((x) => x.meetings.length >= 2)!;
    expect(barred(d, c)).toBe(false);
    d.flags.formDoneDay = 1;
    c.meetings.push({ ...c.meetings[0]!, day: 9 }, { ...c.meetings[0]!, day: 10 });
    expect(barred(d, c)).toBe(true);
  });

  it('counts attended over held and bars below 75%', () => {
    const d = registeredGame();
    const c = course(d);
    const live = c.meetings.filter((m) => m.status === 'scheduled');
    live.forEach((m, i) => (m.attended = i < Math.ceil(live.length * 0.75)));
    expect(attendance(d, c, true).pct).toBeGreaterThanOrEqual(0.75);
    expect(barred(d, c)).toBe(false);
    live.forEach((m, i) => (m.attended = i < 1));
    expect(barred(d, c)).toBe(true);
    c.covered = true;
    expect(barred(d, c)).toBe(false);
  });

  it('raises knowledge and attendance when you attend', () => {
    const d = registeredGame();
    const c = course(d);
    const m = c.meetings.find((x) => x.status === 'scheduled')!;
    at(d, m.day, m.slot);
    expect(meetingsNow(d).some((x) => x.course.code === c.code)).toBe(true);
    const before = c.knowledge;
    attendMut(d, new Rng(1), c.code);
    expect(c.knowledge).toBeGreaterThan(before);
    expect(m.attended).toBe(true);
  });

  it('teaches less when you stand outside a full GST hall', () => {
    const d1 = registeredGame();
    const d2 = registeredGame();
    const pick = (d: GameState) => d.academics.courses.find((c) => c.kind === 'gst' && c.meetings.some((m) => m.status === 'scheduled'))!;
    const m1 = pick(d1).meetings.find((m) => m.status === 'scheduled')!;
    at(d1, m1.day, m1.slot);
    at(d2, m1.day, m1.slot);
    attendMut(d1, new Rng(1), pick(d1).code, false);
    attendMut(d2, new Rng(1), pick(d2).code, true);
    expect(pick(d1).knowledge).toBeGreaterThan(pick(d2).knowledge);
  });
});

describe('exams', () => {
  it('blocks the exam hall without fees, registration, or with poor attendance', () => {
    const d = registeredGame();
    const c = course(d);
    for (const m of c.meetings) m.attended = true;
    at(d, c.exam.day, c.exam.slot);
    expect(canWriteExam(d, c).ok).toBe(true);
    getFee(d, 'school1')!.paid = false;
    expect(canWriteExam(d, c)).toMatchObject({ ok: false, reason: expect.stringMatching(/No fees, no exam/) });
    getFee(d, 'school1')!.paid = true;
    d.academics.registered = false;
    expect(canWriteExam(d, c).ok).toBe(false);
    d.academics.registered = true;
    for (const m of c.meetings) m.attended = false;
    expect(canWriteExam(d, c)).toMatchObject({ ok: false, reason: expect.stringMatching(/Barred/) });
  });
});

describe('grading', () => {
  it('uses the grade bands from the brief', () => {
    expect(gradeFor(70)).toEqual({ grade: 'A', points: 5 });
    expect(gradeFor(69)).toEqual({ grade: 'B', points: 4 });
    expect(gradeFor(50)).toEqual({ grade: 'C', points: 3 });
    expect(gradeFor(45)).toEqual({ grade: 'D', points: 2 });
    expect(gradeFor(40)).toEqual({ grade: 'E', points: 1 });
    expect(gradeFor(39)).toEqual({ grade: 'F', points: 0 });
  });

  it('weights GPA and CGPA by units', () => {
    expect(gpa([{ units: 3, points: 5 }, { units: 1, points: 1 }])).toBe(4);
    const rec = (courses: Array<{ units: number; points: number }>) =>
      ({ courses: courses.map((c) => ({ ...c, code: 'X', title: '', ca: 0, exam: 0, score: 0, grade: 'A' as const, carryover: false })) }) as never;
    expect(cgpaOf([rec([{ units: 2, points: 5 }]), rec([{ units: 2, points: 3 }])])).toBe(4);
    expect(classOfDegree(4.5)).toBe('First Class');
    expect(classOfDegree(3.5)).toBe('Second Class Upper');
    expect(classOfDegree(2.4)).toBe('Second Class Lower');
    expect(classOfDegree(1.5)).toBe('Third Class');
    expect(classOfDegree(1.0)).toBe('Pass');
  });

  it('adds 30% continuous assessment to a 70% exam', () => {
    const d = registeredGame();
    const c = course(d);
    for (const m of c.meetings) m.attended = true;
    c.testScore = 15;
    c.assignment = 10;
    c.exam.status = 'written';
    c.exam.score = 70;
    semesterResults(d, new Rng(5));
    const res = d.academics.transcript[0]!.courses.find((x) => x.code === c.code)!;
    expect(res.ca).toBe(30);
    expect(res.exam).toBe(70);
    if (!res.issue) expect(res.grade).toBe('A');
  });
});

describe('carryovers, repeating and probation', () => {
  it('turns an F into a carryover for the same semester next year', () => {
    const d = registeredGame();
    semesterResults(d, new Rng(5)); // nothing written: everything fails
    expect(d.academics.carryovers.length).toBeGreaterThan(0);
    expect(d.academics.carryovers.every((c) => c.semester === 1)).toBe(true);
    expect(d.academics.lowCgpaRun).toBe(0); // the first semester does not count towards probation
  });

  it('repeats the year after failing too many units, and progresses otherwise', () => {
    const d = registeredGame();
    semesterResults(d, new Rng(5));
    d.clock.semester = 2;
    d.academics.courses = structuredClone(registeredGame().academics.courses);
    semesterResults(d, new Rng(6));
    endOfSession(d);
    expect(d.academics.repeating).toBe(true);
    expect(d.academics.level).toBe(2);

    const ok = registeredGame();
    for (const c of ok.academics.courses) {
      for (const m of c.meetings) m.attended = true;
      c.testScore = 12;
      c.assignment = 8;
      c.exam = { ...c.exam, status: 'written', score: 50 };
    }
    semesterResults(ok, new Rng(5));
    ok.clock.semester = 2;
    endOfSession(ok);
    expect(ok.academics.level).toBe(3);
  });

  it('repeats the year when nothing was registered all session', () => {
    const d = registeredGame();
    d.academics.registered = false;
    semesterResults(d, new Rng(1));
    expect(d.academics.transcript).toHaveLength(0);
    expect(d.academics.carryovers.length).toBeGreaterThan(0);
    d.clock.semester = 2;
    endOfSession(d);
    expect(d.academics.repeating).toBe(true);
    expect(d.academics.level).toBe(2);
  });

  it('puts the player on probation, then withdraws them', () => {
    const d = registeredGame();
    const fail = () => {
      d.academics.courses = structuredClone(registeredGame().academics.courses);
      semesterResults(d, new Rng(5));
    };
    fail(); // first semester: grace
    fail();
    fail();
    expect(d.academics.probation).toBe(true);
    fail();
    expect(d.phase).toBe('withdrawn');
    expect(d.summaries).toContainEqual({ kind: 'withdrawn' });
  });

  it('fixes a missing script after office visits', () => {
    const d = registeredGame();
    for (const c of d.academics.courses) c.exam = { ...c.exam, status: 'written', score: 60 };
    let seed = 1;
    while (!d.academics.issues.length && seed < 400) {
      const copy = structuredClone(registeredGame());
      for (const c of copy.academics.courses) c.exam = { ...c.exam, status: 'written', score: 60 };
      semesterResults(copy, new Rng(seed++));
      if (copy.academics.issues.length) Object.assign(d, copy);
    }
    const issue = d.academics.issues[0]!;
    const before = d.academics.transcript[0]!.courses.find((c) => c.code === issue.code)!.score;
    const r = new Rng(3);
    for (let i = 0; i < 30 && d.academics.issues.length; i++) resolveIssueMut(d, r, issue.id);
    const after = d.academics.transcript[0]!.courses.find((c) => c.code === issue.code)!;
    expect(after.issue).toBeUndefined();
    expect(after.score).toBeGreaterThan(before);
  });
});

describe('graduation', () => {
  it('graduates a final-year student with no carryovers and a passed project', () => {
    const d = registeredGame();
    d.academics.level = 4;
    d.clock.semester = 2;
    d.academics.transcript = [
      {
        year: 4,
        level: 4,
        semester: 2,
        units: 6,
        failedUnits: 0,
        gpa: 4,
        cgpa: 4,
        courses: [{ code: 'CSC 425', title: 'Final Year Project', units: 6, ca: 25, exam: 40, score: 65, grade: 'B', points: 4, carryover: false }],
      },
    ];
    endOfSession(d);
    expect(d.phase).toBe('graduated');
    expect(d.summaries).toContainEqual({ kind: 'graduation' });
  });

  it('spills over when carryovers remain in the final year', () => {
    const d = registeredGame();
    d.academics.level = 4;
    d.clock.semester = 2;
    d.academics.carryovers = [{ code: 'CHM 111', title: 'General Chemistry I', units: 3, kind: 'lecture', semester: 1 }];
    endOfSession(d);
    expect(d.phase).toBe('playing');
    expect(d.academics.spillover).toBe(true);
  });

  it('marks a pending exam as written with a score', () => {
    const d = registeredGame();
    const c = course(d);
    for (const m of c.meetings) m.attended = true;
    at(d, c.exam.day, c.exam.slot);
    writeExamMut(d, new Rng(1), c.code);
    expect(c.exam.status).toBe('written');
    expect(c.exam.score).toBeGreaterThanOrEqual(0);
  });
});
