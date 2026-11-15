// Admission: the entrance test, the cut-off and the letter. Pure.
import { PROGRAMMES, getCollege, getProgramme } from '../content/courses';
import { QUESTIONS } from '../content/questions';
import type { Question } from './contentTypes';
import { Rng } from './rng';

export const TEST_LENGTH = 10;

/** Ten different questions, picked by the seed. */
export function drawTest(seed: number): Question[] {
  return new Rng(seed).shuffle(QUESTIONS).slice(0, TEST_LENGTH);
}

/** Correct answers, out of the number of questions. */
export function scoreTest(questions: Question[], answers: Array<number | null>): number {
  return questions.reduce((s, q, i) => s + (answers[i] === q.answer ? 1 : 0), 0);
}

export interface AdmissionResult {
  choiceId: string;
  programmeId: string;
  admittedToChoice: boolean;
  score: number;
  cutoff: number;
}

/** Meeting the cut-off admits the player to their choice; missing it admits
 *  them to a random course that is not competitive. */
export function decideAdmission(choiceId: string, score: number, seed: number): AdmissionResult {
  const choice = getProgramme(choiceId);
  if (score >= choice.cutoff) {
    return { choiceId, programmeId: choiceId, admittedToChoice: true, score, cutoff: choice.cutoff };
  }
  const open = PROGRAMMES.filter((p) => !p.competitive && p.id !== choiceId);
  const programmeId = new Rng(seed ^ 0x9e3779b9).pick(open).id;
  return { choiceId, programmeId, admittedToChoice: false, score, cutoff: choice.cutoff };
}

export function matricNumber(programmeId: string, seed: number, startYear: number): string {
  const p = getProgramme(programmeId);
  const serial = String(new Rng(seed ^ 0x51ed27).int(1, 2999)).padStart(4, '0');
  return `UNI/${String(startYear).slice(-2)}/${p.prefix}/${serial}`;
}

export interface AdmissionLetter {
  name: string;
  matric: string;
  programme: string;
  college: string;
  years: number;
  admittedToChoice: boolean;
  firstChoice: string;
  score: number;
  cutoff: number;
}

export function admissionLetter(name: string, result: AdmissionResult, matric: string): AdmissionLetter {
  const p = getProgramme(result.programmeId);
  return {
    name,
    matric,
    programme: p.name,
    college: getCollege(p.collegeId).name,
    years: p.years,
    admittedToChoice: result.admittedToChoice,
    firstChoice: getProgramme(result.choiceId).name,
    score: result.score,
    cutoff: result.cutoff,
  };
}
