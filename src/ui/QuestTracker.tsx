// The on-screen quest tracker (top left, under the top bar): your level, the
// main quest you are on and its next step with progress, and a line for each
// side quest. Tap to fold it away to one small chip; tap the step to go there.
import { useState } from 'react';
import { placeName } from '../content/places';
import { currentObjectives, questLog, type TrackedObjective } from '../game/quests';
import type { GameState } from '../game/types';
import { useGameStore } from '../store/gameStore';

const KEY = 'campus-life:quest-tracker-open';

function readOpen(): boolean {
  try {
    return localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
}

function Progress({ have, need }: { have: number; need: number }) {
  const pct = need ? Math.min(100, Math.round((have / need) * 100)) : 0;
  return (
    <span className="mt-0.5 flex items-center gap-1.5">
      <span className="h-1 w-16 overflow-hidden rounded-full bg-white/15">
        <span className="block h-full bg-sun" style={{ width: `${Math.max(4, pct)}%` }} />
      </span>
      <span className="text-[10px] text-muted">
        {have}/{need}
      </span>
    </span>
  );
}

export function QuestTracker({ game }: { game: GameState }) {
  const [open, setOpen] = useState(readOpen);
  const tapPlace = useGameStore((s) => s.tapPlace);
  const openPhone = useGameStore((s) => s.openPhone);
  const leave = useGameStore((s) => s.leave);
  const insideId = useGameStore((s) => s.insidePlaceId);
  const log = questLog(game);
  const objectives = currentObjectives(game);
  const main = objectives.filter((o) => o.kind === 'main');
  const side = objectives.filter((o) => o.kind === 'side');
  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(KEY, next ? '1' : '0');
    } catch {
      /* private mode: just do not remember */
    }
  };
  const go = (o: TrackedObjective) => {
    if (o.portal) openPhone('school');
    else if (o.placeId && o.placeId !== insideId) {
      leave();
      tapPlace(o.placeId);
    }
  };
  const canGo = (o: TrackedObjective) => o.portal || (!!o.placeId && o.placeId !== insideId);
  const quest = log.current;
  const done = quest ? quest.objectives.filter((o) => o.done && !o.sub).length : 0;
  const total = quest ? quest.objectives.filter((o) => !o.sub).length : 0;

  if (!open) {
    return (
      <button onClick={toggle} aria-expanded={false} aria-label="Show quest tracker" className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/10 bg-[#16181F]/90 px-2.5 py-1 text-xs font-semibold shadow-lg">
        <span className="grid size-5 place-items-center rounded-full bg-sun text-[10px] font-black text-night">{log.rep.level}</span>
        <span className="max-w-[10rem] truncate">🧭 {quest?.title ?? 'Quests'}</span>
      </button>
    );
  }

  return (
    <div className="pointer-events-auto w-[min(17rem,calc(100vw-5rem))] rounded-2xl border border-white/10 bg-[#16181F]/90 text-left shadow-lg">
      <button onClick={toggle} aria-expanded={true} aria-label="Fold the quest tracker" className="flex w-full items-center gap-2 px-2.5 pt-1.5 pb-1">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-sun text-[11px] font-black text-night" title={`Level ${log.rep.level}`}>
          {log.rep.level}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[10px] text-muted">
            {log.rep.title} · {log.rep.xp}
            {log.rep.next !== null ? `/${log.rep.next}` : ''} rep
          </span>
          <span className="block truncate text-xs font-bold">
            {quest ? `${quest.title}` : 'All quests done'}
            {quest && total > 1 ? <span className="font-normal text-muted"> · {done}/{total}</span> : null}
          </span>
        </span>
        <span className="text-[10px] text-muted" aria-hidden="true">
          ▴
        </span>
      </button>
      <ul className="flex flex-col gap-1 px-2.5 pb-2">
        {main.map((o, i) => (
          <li key={`m${i}`}>
            <button onClick={() => go(o)} disabled={!canGo(o)} className="flex w-full items-start gap-1.5 text-left disabled:cursor-default">
              <span aria-hidden="true" className="text-xs">
                {o.sub ? '↳' : '👉'}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-xs ${o.sub ? 'text-amber-200' : 'font-semibold'} line-clamp-2`}>{o.label}</span>
                {o.progress && o.progress.need > 1 ? <Progress have={o.progress.have} need={o.progress.need} /> : null}
                {i === 0 && o.hint ? <span className="block truncate text-[10px] text-muted">{o.hint}</span> : null}
              </span>
              {canGo(o) && <span className="shrink-0 rounded-full bg-sun px-1.5 text-[10px] font-bold text-night">{o.portal ? 'App' : 'Go'}</span>}
            </button>
          </li>
        ))}
        {side.map((o) => (
          <li key={o.questId}>
            <button onClick={() => go(o)} disabled={!canGo(o)} className="flex w-full items-start gap-1.5 text-left disabled:cursor-default" title={o.placeId ? placeName(o.placeId) : undefined}>
              <span aria-hidden="true" className="text-xs">
                ✦
              </span>
              <span className="min-w-0 flex-1 text-[11px] text-muted">
                <span className="font-semibold text-white/90">{o.questTitle}:</span> {o.label}
                {o.progress ? ` (${o.progress.have}/${o.progress.need})` : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
