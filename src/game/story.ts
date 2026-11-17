// The story as "chapters" for the screens that show one list of steps (the
// journal's quest tab, the quest tag over your head, the map marker). It is
// a view of the quest log in quests.ts: the chapter is the main quest you
// are on, its steps are that quest's objectives. Pure.
import { activeMainQuest, questsMut, questLog } from './quests';
import type { GameState } from './types';

export interface StoryStep {
  id: string;
  label: string;
  done: boolean;
  /** Where to go for it. */
  placeId?: string;
  /** Done on the phone (portal). */
  portal?: boolean;
  /** A little more explanation for the quest card. */
  hint?: string;
  /** Paid once, the first time the step is done. */
  reward?: number;
  /** A follow-up that came out of the step below it ("no passport? get one"). */
  sub?: boolean;
  /** For a follow-up: the place where you were told (it floats over your head there). */
  at?: string;
}

export interface Chapter {
  id: string;
  /** Quest number in the whole story (1 = the first quest of the game). */
  number: number;
  title: string;
  blurb: string;
  steps: StoryStep[];
}

/** The main quest you are on now, as a chapter. */
export function currentChapter(d: GameState): Chapter {
  const log = questLog(d);
  const q = log.current ?? log.main[log.main.length - 1]!;
  const steps: StoryStep[] = q.objectives.map((o) => ({
    id: o.id,
    label: o.progress && o.progress.need > 1 && !/\d+\/\d+/.test(o.label) ? `${o.label} (${o.progress.have}/${o.progress.need})` : o.label,
    done: o.done,
    placeId: o.placeId,
    portal: o.portal,
    hint: o.hint,
    reward: o.reward,
    sub: o.sub,
    at: o.at,
  }));
  // The quest's own reward shows on its last step.
  const last = [...steps].reverse().find((s) => !s.sub);
  if (last && q.reward.money && !last.reward) last.reward = q.reward.money;
  return { id: q.id, number: log.finished + 1, title: q.title, blurb: `${q.blurb} Reward: ${q.reward.text}.`, steps };
}

/** The next unfinished step of the current main quest (optional ones last). */
export function nextStep(d: GameState): StoryStep | null {
  const q = activeMainQuest(d);
  if (!q) return null;
  const ch = currentChapter(d);
  const required = new Set(q.objectives.filter((o) => !o.optional).map((o) => o.id));
  return ch.steps.find((s) => !s.done && required.has(s.id)) ?? ch.steps.find((s) => !s.done) ?? null;
}

/** Pays finished quests and objectives (kept under its old name for callers). */
export function storyRewardsMut(d: GameState): void {
  questsMut(d);
}
