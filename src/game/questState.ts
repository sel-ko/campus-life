// The small, low-level part of the quest log: reputation (XP and level),
// counters of things done, and starting a side quest. Kept apart from
// quests.ts so effects.ts and goals.ts can use it without import loops.
import { REP_LEVELS, getSideQuest } from '../content/quests';
import { clamp, log } from './draft';
import { blankQuests } from './state';
import type { GameState, QuestState } from './types';

/** The quest log, created on old saves that have none. */
export function questsOf(d: GameState): QuestState {
  return (d.quests ??= blankQuests());
}

export interface RepLevel {
  level: number;
  title: string;
  xp: number;
  /** XP where this level started and where the next begins (null at the top). */
  floor: number;
  next: number | null;
}

export function levelInfo(xp: number): RepLevel {
  let i = 0;
  while (i + 1 < REP_LEVELS.length && xp >= REP_LEVELS[i + 1]!.xp) i++;
  return { level: i + 1, title: REP_LEVELS[i]!.title, xp, floor: REP_LEVELS[i]!.xp, next: REP_LEVELS[i + 1]?.xp ?? null };
}

/** Adds reputation points; a new level lifts your mood and says so. */
export function addXpMut(d: GameState, xp: number): void {
  if (!xp) return;
  const q = questsOf(d);
  q.xp = Math.max(0, q.xp + xp);
  const now = levelInfo(q.xp);
  if (now.level > q.level) {
    q.level = now.level;
    d.needs.stress = clamp(d.needs.stress - 5);
    log(d, `⭐ Level up! You are now level ${now.level}: ${now.title}.`);
  }
}

/** Counts something done (by interaction kind, and kind:target). */
export function countMut(d: GameState, ...keys: string[]): void {
  const c = questsOf(d).counts;
  for (const k of keys) c[k] = (c[k] ?? 0) + 1;
}

/** dayCount of day 1 of this semester. */
export function semesterStartDay(d: GameState): number {
  return d.clock.dayCount - d.clock.day + 1;
}

/** Can this side quest be picked up now? (Not running, not done, or repeatable in a new semester.) */
export function canStartSide(d: GameState, id: string): boolean {
  const def = getSideQuest(id);
  if (!def || d.phase !== 'playing') return false;
  const q = questsOf(d);
  if (q.side.some((s) => s.status === 'active' && s.id === id)) return false;
  if (q.side.filter((s) => s.status === 'active').length >= 3) return false;
  const last = [...q.side].reverse().find((s) => s.id === id);
  if (!last) return true;
  return !!def.repeat && (last.end ?? last.start) < semesterStartDay(d);
}

/** Starts a side quest. Returns true if it started. */
export function startSideQuestMut(d: GameState, id: string): boolean {
  if (!canStartSide(d, id)) return false;
  const def = getSideQuest(id)!;
  const q = questsOf(d);
  const base: Record<string, number> = {};
  for (const o of def.objectives) if (o.check.kind === 'count') base[o.check.key] = q.counts[o.check.key] ?? 0;
  q.side.push({ id, start: d.clock.dayCount, base, status: 'active', ...(def.days ? { due: d.clock.dayCount + def.days } : {}) });
  // Keep the list short: drop old finished ones.
  const finished = q.side.filter((s) => s.status !== 'active');
  if (finished.length > 12) q.side = q.side.filter((s) => s.status === 'active' || finished.indexOf(s) >= finished.length - 12);
  log(d, `New side quest: ${def.title}. ${def.objectives.map((o) => o.label).join('; ')}.${def.helpsText ? ` Helps with ${def.helpsText}.` : ''}`);
  return true;
}
