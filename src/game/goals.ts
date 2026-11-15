// Goals: the ambition's yearly milestones (checked at the end of each
// session and at graduation), student elections for the Student Union
// ambition, and three weekly objectives drawn from the player's situation.
import { AMBITIONS, OBJECTIVES, getAmbition } from '../content/ambitions';
import { getProgramme } from '../content/courses';
import type { MilestoneDef, ObjectiveDef } from './contentTypes';
import { currentCgpa } from './academics';
import { scriptMut, postMut } from './chat';
import { clamp, log } from './draft';
import { feesDueNow } from './money';
import { friendsCount } from './people';
import type { Rng } from './rng';
import type { GameState, Objective, Position } from './types';

const RANK: Record<Position, number> = { none: 0, class_rep: 1, dept_president: 2, su_president: 3 };

export function averageStress(d: GameState): number {
  return d.stats.stressSamples ? d.stats.stressSum / d.stats.stressSamples : d.needs.stress;
}

export function milestoneMet(d: GameState, m: MilestoneDef): boolean {
  const c = m.check;
  if (c.cgpaAtLeast !== undefined && currentCgpa(d) < c.cgpaAtLeast) return false;
  if (c.moneyAtLeast !== undefined && d.money < c.moneyAtLeast) return false;
  if (c.hustle && !d.hustle.owned.includes(c.hustle)) return false;
  if (c.friendsAtLeast !== undefined && friendsCount(d) < c.friendsAtLeast) return false;
  if (c.position && RANK[d.goals.position] < RANK[c.position]) return false;
  if (c.calmAtLeast !== undefined && 100 - averageStress(d) < c.calmAtLeast) return false;
  if (c.brokeAtMost !== undefined && d.stats.brokeTimes > c.brokeAtMost) return false;
  return true;
}

/** End of a session: decide the milestone for the level just finished. */
export function checkMilestonesMut(d: GameState, levelFinished: number, repeated: boolean): void {
  const amb = getAmbition(d.goals.ambition);
  for (const m of amb.milestones) {
    if (m.level !== levelFinished || d.goals.milestones[m.id]) continue;
    if (milestoneMet(d, m)) {
      d.goals.milestones[m.id] = 'done';
      log(d, `Milestone reached: ${m.label}!`);
    } else if (!repeated) {
      d.goals.milestones[m.id] = 'missed';
      log(d, `Milestone missed: ${m.label}. Keep going.`);
    }
  }
}

/** At graduation: the final milestone, and anything left undecided. */
export function finalMilestonesMut(d: GameState): void {
  const amb = getAmbition(d.goals.ambition);
  for (const m of amb.milestones) {
    if (d.goals.milestones[m.id]) continue;
    d.goals.milestones[m.id] = milestoneMet(d, m) ? 'done' : 'missed';
  }
}

export function nextMilestone(d: GameState): MilestoneDef | undefined {
  return getAmbition(d.goals.ambition).milestones.find((m) => !d.goals.milestones[m.id]);
}

// ---------- elections ----------

interface Election {
  position: Exclude<Position, 'none'>;
  label: string;
  level: (years: number) => number;
  threshold: number;
}

const ELECTIONS: Election[] = [
  { position: 'class_rep', label: 'class rep', level: () => 2, threshold: 30 },
  { position: 'dept_president', label: 'departmental president', level: () => 3, threshold: 45 },
  { position: 'su_president', label: 'Student Union president', level: (years) => years, threshold: 60 },
];
export const ELECTION_DAY = 10;

export function popularity(d: GameState): number {
  const friends = friendsCount(d, 25);
  const warmth = ['tobi', 'ify', 'kelz', 'dami', 'osaze', 'zainab', 'tega'].reduce((s, id) => s + Math.max(0, d.people[id]?.rel ?? 0), 0) / 10;
  return friends * 6 + warmth + d.goals.campaign;
}

export function upcomingElection(d: GameState): Election | undefined {
  if (d.goals.ambition !== 'su_president' || d.clock.semester !== 1) return undefined;
  const years = getProgramme(d.player.programmeId).years;
  return ELECTIONS.find((e) => e.level(years) === d.academics.level && RANK[d.goals.position] < RANK[e.position]);
}

/** Election day (first semester, day 10) for the Student Union ambition. */
export function electionMut(d: GameState, r: Rng): void {
  if (d.clock.day !== ELECTION_DAY) return;
  const e = upcomingElection(d);
  if (!e) return;
  const votes = popularity(d) + r.int(0, 20);
  if (votes >= e.threshold) {
    d.goals.position = e.position;
    d.needs.stress = clamp(d.needs.stress - 10);
    log(d, `ELECTION RESULT: you won and are now ${e.label}! Your posters were everywhere.`);
    postMut(d, 'class', 'tobi', `Congratulations to our new ${e.label}, ${d.player.name}! 🎉🎉`);
  } else {
    d.needs.stress = clamp(d.needs.stress + 8);
    log(d, `ELECTION RESULT: you lost the ${e.label} election. Make more friends and campaign harder.`);
  }
  d.goals.campaign = 0;
}

// ---------- weekly objectives ----------

function relevant(d: GameState, o: ObjectiveDef): boolean {
  const w = o.when ?? {};
  const lectures = d.academics.courses.some((c) => c.meetings.some((m) => m.day > d.clock.day && m.status === 'scheduled'));
  if (w.clearance !== undefined && d.clearance.active !== w.clearance) return false;
  if (w.lectures && !lectures) return false;
  if (w.hustle && d.hustle.xp < 1 && d.goals.ambition !== 'big_money') return false;
  if (w.project && !d.academics.project) return false;
  if (w.feesDue && !feesDueNow(d).length) return false;
  if (w.examWeek && d.clock.day < 8) return false;
  return true;
}

export function objectiveMet(d: GameState, o: Objective, weekEnd = false): boolean {
  const w = d.week;
  switch (o.metric) {
    case 'attend':
      return w.attended >= o.target;
    case 'reads':
      return w.reads >= o.target;
    case 'shifts':
      return w.shifts >= o.target;
    case 'talks':
      return w.talks >= o.target;
    case 'signatures':
      return w.signatures >= o.target;
    case 'assignments':
      return w.assignments >= o.target;
    case 'chapter':
      return w.chapters >= o.target;
    case 'fees':
      return feesDueNow(d).length === 0;
    case 'save':
      return weekEnd && d.money > w.startMoney;
    case 'calm':
      return weekEnd && d.needs.stress < o.target;
    case 'fed':
      return weekEnd && w.maxHunger < o.target;
    default:
      return false;
  }
}

function reward(d: GameState, o: Objective): void {
  o.done = true;
  d.goals.objectivesDone += 1;
  d.needs.stress = clamp(d.needs.stress - 5);
  log(d, `Objective done: ${o.label}. You feel on top of things.`);
}

/** After each action: tick off objectives that are met. */
export function checkObjectivesMut(d: GameState): void {
  for (const o of d.goals.objectives) if (!o.done && objectiveMet(d, o)) reward(d, o);
}

/** Days 1 and 8: close last week's objectives and draw three new ones. */
export function newWeekMut(d: GameState, r: Rng): void {
  for (const o of d.goals.objectives) if (!o.done && objectiveMet(d, o, true)) reward(d, o);
  d.week = { attended: 0, missed: 0, reads: 0, shifts: 0, talks: 0, signatures: 0, assignments: 0, chapters: 0, maxHunger: d.needs.hunger, startMoney: d.money };
  const pool = OBJECTIVES.filter((o) => relevant(d, o));
  const picks: ObjectiveDef[] = [];
  for (const o of r.shuffle(pool)) {
    if (picks.length >= 3) break;
    if (picks.some((p) => p.metric === o.metric)) continue;
    picks.push(o);
  }
  d.goals.objectives = picks.map((o) => ({ id: o.id, label: o.label, metric: o.metric, target: o.target, done: false, draft: true }));
  if (d.goals.ambition === 'su_president' && upcomingElection(d) && d.clock.day === 8) {
    scriptMut(d, r, 'chatter');
    log(d, `Election season: voting is on day ${ELECTION_DAY}. Campaign at the Sports Complex and make friends.`);
  }
}

export { AMBITIONS };
