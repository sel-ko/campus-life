import { describe, expect, it } from 'vitest';
import { PROGRAMMES, getProgramme } from '../content/courses';
import { QUESTIONS } from '../content/questions';
import { TEST_LENGTH, decideAdmission, drawTest, scoreTest } from './admission';
import { MAX_UNITS, MIN_UNITS, generalCourses, programmeCourses, semesterLoad, totalUnits } from './curriculum';

const codes = (list: Array<{ code: string }>) => list.map((c) => c.code);

describe('general courses by level and semester', () => {
  it('follows the compulsory schedule', () => {
    expect(codes(generalCourses(1, 1))).toEqual(['GST 111', 'GST 112', 'GST 113']);
    expect(codes(generalCourses(1, 2))).toEqual(['GST 121', 'GST 122']);
    expect(codes(generalCourses(2, 1))).toEqual(['GST 211', 'GST 212']);
    expect(codes(generalCourses(2, 2))).toEqual(['GST 221', 'GST 223']);
    expect(codes(generalCourses(3, 1))).toEqual(['EPS 312']);
    expect(generalCourses(3, 2)).toEqual([]);
    expect(generalCourses(4, 1)).toEqual([]);
    for (const c of [...generalCourses(1, 1), ...generalCourses(2, 2)]) expect(c.units).toBe(2);
  });

  it('puts the same general courses on every programme', () => {
    for (const id of ['medicine', 'law', 'computer_science', 'theatre_arts', 'civil_eng']) {
      const load = codes(semesterLoad(id, 1, 1));
      expect(load.slice(0, 3)).toEqual(['GST 111', 'GST 112', 'GST 113']);
      expect(codes(semesterLoad(id, 3, 1))).toContain('EPS 312');
    }
  });
});

describe('programme course lists', () => {
  it('gives every year of every degree a 16 to 22 unit load', () => {
    for (const p of PROGRAMMES) {
      for (let level = 1; level <= p.years; level++) {
        for (const sem of [1, 2] as const) {
          const units = totalUnits(semesterLoad(p.id, level, sem));
          expect(units, `${p.id} ${level}00L sem ${sem}`).toBeGreaterThanOrEqual(MIN_UNITS);
          expect(units, `${p.id} ${level}00L sem ${sem}`).toBeLessThanOrEqual(MAX_UNITS);
        }
      }
    }
  });

  it('numbers codes by level and semester', () => {
    for (const p of PROGRAMMES) {
      for (let level = 1; level <= p.years; level++) {
        for (const sem of [1, 2] as const) {
          for (const c of programmeCourses(p, level, sem)) {
            expect(c.code, `${p.id} ${c.code}`).toMatch(new RegExp(`^[A-Z]{3} ${level}${sem}\\d$`));
          }
        }
      }
    }
  });

  it('has no repeated code within a semester and marks all lists as draft', () => {
    for (const p of PROGRAMMES) {
      expect(p.draft).toBe(true);
      for (let level = 1; level <= p.years; level++) {
        for (const sem of [1, 2] as const) {
          const list = codes(semesterLoad(p.id, level, sem));
          expect(new Set(list).size, `${p.id} ${level}-${sem}`).toBe(list.length);
        }
      }
    }
  });

  it('shares biology, chemistry, physics and maths in science 100 level', () => {
    for (const id of ['medicine', 'pharmacy', 'computer_science', 'microbiology', 'biochemistry']) {
      const list = codes(semesterLoad(id, 1, 1));
      for (const c of ['BIO 111', 'CHM 111', 'PHY 111', 'MTH 111']) expect(list).toContain(c);
    }
  });

  it('adds industrial training, postings, moot court and a final-year project', () => {
    const kinds = (id: string, level: number, sem: 1 | 2) => semesterLoad(id, level, sem).map((c) => c.kind);
    expect(kinds('computer_science', 3, 2)).toContain('it');
    expect(kinds('mechanical_eng', 4, 2)).toContain('it');
    expect(kinds('medicine', 4, 1)).toContain('posting');
    expect(kinds('pharmacy', 5, 1)).toContain('posting');
    expect(kinds('pharmacy', 4, 1)).not.toContain('posting');
    expect(kinds('law', 4, 1)).toContain('moot');
    expect(kinds('law', 4, 2)).toContain('chambers');
    for (const p of PROGRAMMES) expect(kinds(p.id, p.years, 2), p.id).toContain('project');
  });

  it('adds carryovers to the matching semester, on top of the normal load', () => {
    const co = [{ code: 'CHM 111', title: 'General Chemistry I', units: 3, kind: 'lecture' as const, semester: 1 as const }];
    const load = semesterLoad('computer_science', 2, 1, co);
    expect(load.find((c) => c.code === 'CHM 111')?.carryover).toBe(true);
    expect(semesterLoad('computer_science', 2, 2, co).some((c) => c.code === 'CHM 111')).toBe(false);
  });

  it('uses the durations from the brief', () => {
    expect(getProgramme('medicine').years).toBe(6);
    expect(getProgramme('nursing').years).toBe(5);
    expect(getProgramme('law').years).toBe(5);
    expect(getProgramme('electrical_eng').years).toBe(5);
    expect(getProgramme('economics').years).toBe(4);
    expect(PROGRAMMES).toHaveLength(28);
  });
});

describe('admission', () => {
  it('has a bank of at least 60 questions and draws 10 different ones', () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(60);
    expect(new Set(QUESTIONS.map((q) => q.q)).size).toBe(QUESTIONS.length);
    const test = drawTest(123);
    expect(test).toHaveLength(TEST_LENGTH);
    expect(new Set(test.map((q) => q.id)).size).toBe(TEST_LENGTH);
    expect(drawTest(123)).toEqual(test);
  });

  it('scores right answers', () => {
    const test = drawTest(5);
    expect(scoreTest(test, test.map((q) => q.answer))).toBe(10);
    expect(scoreTest(test, test.map(() => null))).toBe(0);
  });

  it('applies the cut-offs', () => {
    expect(getProgramme('medicine').cutoff).toBe(9);
    for (const id of ['pharmacy', 'law', 'nursing', 'mls']) expect(getProgramme(id).cutoff).toBe(8);
    expect(getProgramme('chemical_eng').cutoff).toBe(7);
    expect(getProgramme('sociology').cutoff).toBe(5);

    expect(decideAdmission('medicine', 9, 1)).toMatchObject({ programmeId: 'medicine', admittedToChoice: true });
    expect(decideAdmission('law', 8, 1).admittedToChoice).toBe(true);
    expect(decideAdmission('civil_eng', 7, 1).admittedToChoice).toBe(true);
    expect(decideAdmission('english', 5, 1).admittedToChoice).toBe(true);
  });

  it('sends a near miss to a random course that is not competitive', () => {
    for (let seed = 0; seed < 40; seed++) {
      const r = decideAdmission('medicine', 8, seed);
      expect(r.admittedToChoice).toBe(false);
      expect(getProgramme(r.programmeId).competitive).toBe(false);
    }
    const r = decideAdmission('english', 4, 3);
    expect(r.programmeId).not.toBe('english');
  });
});
