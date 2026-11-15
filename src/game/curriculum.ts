// Which courses a student takes in a given level and semester: the general
// courses for the level, the programme's courses (written lists for 100 and
// 200 level, generated from templates above that), and any carryovers.
import { GENERAL_COURSES, getProgramme } from '../content/courses';
import type { CourseDef, CourseTuple, ProgrammeDef } from './contentTypes';
import type { CarryoverCourse, CourseKind } from './types';

export const MIN_UNITS = 16;
export const MAX_UNITS = 22;
/** Most units in one semester including carryovers; extra carryovers wait for a lighter semester. */
export const MAX_LOAD = 26;

function fromTuple(t: CourseTuple): CourseDef {
  return { code: t[0], title: t[1], units: t[2], kind: t[3] ?? 'lecture', draft: true };
}

export function generalCourses(level: number, semester: 1 | 2): CourseDef[] {
  return (GENERAL_COURSES[`${level}-${semester}`] ?? []).map(fromTuple);
}

/** The semester an industrial-training placement takes, if any. */
export function itSemester(p: ProgrammeDef): { level: number; semester: 1 | 2 } | null {
  if (p.track === 'science' || p.track === 'basic_medical') return { level: 3, semester: 2 };
  if (p.track === 'engineering') return { level: 4, semester: 2 };
  return null;
}

/** First level with clinical postings (health courses and pharmacy). */
export function postingsFrom(p: ProgrammeDef): number | null {
  if (p.track !== 'clinical') return null;
  return p.id === 'pharmacy' ? 5 : 4;
}

/** A title from the programme's list, numbered II, III... when the list runs out. */
function advancedTitle(p: ProgrammeDef, k: number): string {
  const n = p.advanced.length;
  const round = Math.floor(k / n);
  const base = p.advanced[k % n]!;
  return round === 0 ? base : `${base} ${['II', 'III', 'IV', 'V'][round - 1] ?? ''}`.trim();
}

function generated(p: ProgrammeDef, level: number, semester: 1 | 2): CourseDef[] {
  const out: CourseDef[] = [];
  let seq = 1;
  const code = (prefix = p.prefix) => `${prefix} ${level}${semester}${seq++}`;
  const add = (title: string, units: number, kind: CourseKind = 'lecture', prefix?: string) =>
    out.push({ code: code(prefix), title, units, kind, draft: true });
  // Running index so every semester gets different titles.
  let k = ((level - 3) * 2 + (semester - 1)) * 6;
  const lectures = (count: number, units = 3) => {
    for (let i = 0; i < count; i++) add(advancedTitle(p, k++), units);
  };
  const final = level === p.years;
  const it = itSemester(p);
  const postFrom = postingsFrom(p);

  if (it && it.level === level && it.semester === semester && !final) {
    add("Students' Industrial Work Experience Scheme (SIWES)", 12, 'it', 'SIW');
    add('Industrial Training Report and Seminar', 4, 'seminar');
    return out;
  }

  if (postFrom !== null && level >= postFrom && p.postings?.length) {
    const postIndex = ((level - postFrom) * 2 + (semester - 1)) * 2;
    const posting = (j: number) => add(p.postings![(postIndex + j) % p.postings!.length]!, 6, 'posting');
    if (final && semester === 2) {
      posting(0);
      lectures(2);
      add('Final Year Project', 6, 'project');
    } else {
      posting(0);
      posting(1);
      lectures(2);
      if (final) add('Research Seminar', 2, 'seminar');
    }
    return out;
  }

  if (p.track === 'law' && level === 4) {
    if (semester === 1) {
      add('Moot Court and Advocacy', 4, 'moot');
      lectures(4);
      lectures(1, 2);
    } else {
      add('Chambers Attachment', 6, 'chambers');
      lectures(4);
    }
    return out;
  }

  if (final) {
    if (semester === 1) {
      lectures(5);
      add('Research Seminar', 2, 'seminar');
    } else {
      lectures(4);
      add('Final Year Project', 6, 'project');
    }
    return out;
  }

  lectures(5);
  lectures(1, 2);
  return out;
}

export function programmeCourses(p: ProgrammeDef, level: number, semester: 1 | 2): CourseDef[] {
  if (level <= 2) return (p.lists[`${level}-${semester}`] ?? []).map(fromTuple);
  return generated(p, Math.min(level, p.years), semester);
}

/** The full load: general + programme courses, plus carryovers for this semester. */
export function semesterLoad(
  programmeId: string,
  level: number,
  semester: 1 | 2,
  carryovers: CarryoverCourse[] = [],
  onlyCarryovers = false,
): Array<CourseDef & { carryover: boolean }> {
  const p = getProgramme(programmeId);
  const normal = onlyCarryovers ? [] : [...generalCourses(level, semester), ...programmeCourses(p, level, semester)];
  const codes = new Set(normal.map((c) => c.code));
  let room = MAX_LOAD - totalUnits(normal);
  const extra = carryovers
    .filter((c) => c.semester === semester && !codes.has(c.code))
    .filter((c) => {
      if (c.units > room) return false;
      room -= c.units;
      return true;
    })
    .map((c) => ({ code: c.code, title: c.title, units: c.units, kind: c.kind, draft: true }));
  return [...normal.map((c) => ({ ...c, carryover: false })), ...extra.map((c) => ({ ...c, carryover: true }))];
}

export function totalUnits(courses: Array<{ units: number }>): number {
  return courses.reduce((s, c) => s + c.units, 0);
}
