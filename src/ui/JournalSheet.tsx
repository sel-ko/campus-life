// The journal: every open task, urgent first, with a "Go" button for tasks
// done at a place and "Open portal" for phone tasks. Plus weekly objectives.
import { getPlace } from '../content/places';
import { journal, type JournalTask } from '../game/journal';
import type { GameState } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { SHEET } from './theme';
import { useState } from 'react';
import { currentChapter } from '../game/story';
import { DayPlanView } from './lifeUi';

const GROUP_TITLES: Record<JournalTask['group'], string> = {
  today: 'Today',
  clearance: 'Clearance',
  money: 'Money',
  study: 'Studies',
  health: 'Health',
  people: 'People',
  goals: 'Goals',
};

export function JournalSheet({ game }: { game: GameState }) {
  const open = useGameStore((s) => s.journalOpen);
  const setOpen = useGameStore((s) => s.setJournalOpen);
  const tapPlace = useGameStore((s) => s.tapPlace);
  const openPhone = useGameStore((s) => s.openPhone);
  const [tab, setTab] = useState<'quest' | 'timetable' | 'tasks'>('quest');
  if (!open) return null;
  const ch = currentChapter(game);
  const next = ch.steps.find((x) => !x.done);
  const go = (placeId?: string, portal?: boolean) => {
    setOpen(false);
    if (portal) openPhone('school');
    else if (placeId) tapPlace(placeId);
  };
  const tasks = journal(game);
  const groups = (Object.keys(GROUP_TITLES) as JournalTask['group'][]).map((g) => [g, tasks.filter((t) => t.group === g)] as const).filter(([, l]) => l.length);

  return (
    <div className="fixed inset-0 z-30 bg-black/45" onClick={() => setOpen(false)}>
      <section role="dialog" aria-label="Journal" className={SHEET} onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl font-bold">Journal</h2>
          <button onClick={() => setOpen(false)} className="min-h-11 px-3 text-sm font-semibold text-muted">
            Close
          </button>
        </div>
        <div className="mb-3 flex gap-1.5" role="tablist">
          {(
            [
              ['quest', '🧭 Quest'],
              ['timetable', '🗓️ Timetable'],
              ['tasks', `📝 Tasks (${tasks.length})`],
            ] as const
          ).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`min-h-10 flex-1 rounded-full text-sm font-semibold ${tab === id ? 'bg-sun text-night' : 'bg-white/10'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'quest' && (
          <section className="flex flex-col gap-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs font-semibold tracking-wide text-sun uppercase">Chapter {ch.number}</p>
              <h3 className="text-lg font-bold">{ch.title}</h3>
              <p className="text-sm text-muted">{ch.blurb}</p>
            </div>
            <ol className="flex flex-col gap-1.5">
              {ch.steps.map((st) => (
                <li key={st.id} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${st.sub ? 'ml-5' : ''} ${st === next ? 'border-sun/60 bg-sun/10' : 'border-white/10 bg-white/5'} ${st.done ? 'opacity-55' : ''}`}>
                  <span aria-hidden="true">{st.done ? '✅' : st === next ? '👉' : st.sub ? '↳' : '▫️'}</span>
                  <span className="min-w-0 flex-1">
                    <span className={st.done ? 'line-through' : st === next ? 'font-semibold' : ''}>{st.label}</span>
                    {st === next && st.hint && <span className="block text-xs text-muted">{st.hint}</span>}
                  </span>
                  {st.reward && !st.done ? <span className="text-xs font-bold text-sun">+₦{st.reward.toLocaleString('en-NG')}</span> : null}
                  {st === next && (st.placeId || st.portal) && (
                    <button onClick={() => go(st.placeId, st.portal)} className="min-h-9 shrink-0 rounded-full bg-sun px-3 text-xs font-bold text-night">
                      {st.portal ? 'Portal' : 'Go'}
                    </button>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        {tab === 'timetable' && (
          <section>
            <p className="mb-2 flex flex-wrap gap-3 text-xs text-muted">
              <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-emerald-400" /> attended</span>
              <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-amber-300" /> on now</span>
              <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-red-500" /> missed</span>
            </p>
            <DayPlanView game={game} />
          </section>
        )}

        {tab === 'tasks' && (
        <>
        {game.goals.objectives.length > 0 && (
          <section className="mb-3 rounded-2xl border border-white/10 bg-white/5 p-3">
            <h3 className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">This week's objectives</h3>
            <ul className="flex flex-col gap-1 text-sm">
              {game.goals.objectives.map((o) => (
                <li key={o.id} className={o.done ? 'text-emerald-300 line-through' : ''}>
                  {o.done ? '✓' : '○'} {o.label}
                </li>
              ))}
            </ul>
          </section>
        )}
        {tasks.length === 0 && <p className="text-muted">Nothing urgent. Read, rest, or make some money.</p>}
        {groups.map(([g, list]) => (
          <section key={g} className="mb-3">
            <h3 className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">{GROUP_TITLES[g]}</h3>
            <ul className="flex flex-col gap-1.5">
              {list.map((t) => (
                <li key={t.id} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${t.urgent ? 'border-red-400/50 bg-red-400/10' : 'border-white/10 bg-white/5'}`}>
                  <span className="flex-1">{t.text}</span>
                  {t.placeId && getPlace(t.placeId) && (
                    <button
                      onClick={() => {
                        setOpen(false);
                        tapPlace(t.placeId!);
                      }}
                      className="min-h-9 shrink-0 rounded-full bg-[#CDB8FF] px-3 text-xs font-bold text-[#2C1F66]"
                    >
                      Go
                    </button>
                  )}
                  {t.portal && (
                    <button onClick={() => openPhone('school')} className="min-h-9 shrink-0 rounded-full bg-sun px-3 text-xs font-bold text-night">
                      Portal
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
        </>
        )}
      </section>
    </div>
  );
}
