// Small shared pieces of the life interface: the needs panel, effect chips,
// the quest chip (your story's next step) and the day planner timetable.
import { useState } from 'react';
import { placeName } from '../content/places';
import { naira } from '../game/format';
import { feelings, moodOf } from '../game/needs';
import { PLAN_ICON, dayPlan } from '../game/planner';
import { currentChapter } from '../game/story';
import { dayName, slotName } from '../game/time';
import type { GameState } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { PILL } from './theme';

const SLOTS = ['Morning', 'Afternoon', 'Evening', 'Night'];

/** Coloured chips for what an action does: green is good for you, red costs you. */
export function EffectChips({ effects, small = false }: { effects?: string[]; small?: boolean }) {
  if (!effects?.length) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {effects.map((e) => {
        // "+Energy" is good, "-Energy" is bad; for hunger, stress and bladder it is the other way round.
        const up = e.startsWith('+');
        const reversed = /Hunger|Stress|Bladder/.test(e);
        const good = e.startsWith('+') || e.startsWith('-') ? up !== reversed : true;
        return (
          <span key={e} className={`rounded-full px-2 ${small ? 'py-0 text-[10px]' : 'py-0.5 text-[11px]'} font-bold ${good ? 'bg-emerald-400/20 text-emerald-200' : 'bg-red-400/20 text-red-200'}`}>
            {e}
          </span>
        );
      })}
    </span>
  );
}

const NEEDS: Array<{ key: 'energy' | 'hunger' | 'hygiene' | 'bladder' | 'stress' | 'health'; label: string; icon: string; invert?: boolean }> = [
  { key: 'energy', label: 'Energy', icon: '⚡' },
  { key: 'hunger', label: 'Hunger', icon: '🍲', invert: true },
  { key: 'hygiene', label: 'Hygiene', icon: '🧼' },
  { key: 'bladder', label: 'Bladder', icon: '🚽', invert: true },
  { key: 'stress', label: 'Stress', icon: '😤', invert: true },
  { key: 'health', label: 'Health', icon: '❤️' },
];

/** Six bars: full green is good. Hunger, bladder and stress count down to good. */
export function NeedsPanel({ game }: { game: GameState }) {
  const mood = moodOf(game);
  const feels = feelings(game);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold">
        {mood.emoji} Feeling <b>{mood.label}</b>
        {game.ill ? ' · sick' : ''}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {NEEDS.map((n) => {
          const raw = game.needs[n.key] ?? 0;
          const good = n.invert ? 100 - raw : raw;
          const colour = good >= 60 ? 'bg-emerald-400' : good >= 30 ? 'bg-amber-400' : 'bg-red-400';
          return (
            <div key={n.key} className="flex items-center gap-1.5 text-xs">
              <span aria-hidden="true">{n.icon}</span>
              <span className="w-14 text-muted">{n.label}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/10" role="meter" aria-label={n.label} aria-valuenow={Math.round(raw)} aria-valuemin={0} aria-valuemax={100}>
                <span className={`block h-full ${colour}`} style={{ width: `${Math.max(4, good)}%` }} />
              </span>
            </div>
          );
        })}
      </div>
      {feels.length > 0 && (
        <ul className="flex flex-col gap-1">
          {feels.map((f) => (
            <li key={f.id} className="flex items-center gap-2 rounded-xl bg-white/6 px-2 py-1">
              <span aria-hidden="true">{f.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{f.title}</span>
                <span className="block text-xs text-muted">{f.text}</span>
              </span>
              <span className={`text-sm font-bold ${f.value > 0 ? 'text-emerald-300' : 'text-red-300'}`}>{f.value > 0 ? `+${f.value}` : f.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A compact strip of the needs that are getting bad (shown in rooms). */
export function NeedsStrip({ game }: { game: GameState }) {
  return (
    <div className="flex gap-1">
      {NEEDS.slice(0, 5).map((n) => {
        const raw = game.needs[n.key] ?? 0;
        const good = n.invert ? 100 - raw : raw;
        const colour = good >= 60 ? '#34D399' : good >= 30 ? '#FBBF24' : '#F87171';
        return (
          <span key={n.key} title={n.label} className="relative grid size-8 place-items-center rounded-full bg-black/55 text-sm" style={{ background: `conic-gradient(${colour} ${good * 3.6}deg, rgba(0,0,0,0.55) 0)` }}>
            <span className="grid size-6 place-items-center rounded-full bg-[#14202B] text-[13px]" aria-label={`${n.label} ${Math.round(raw)}`}>
              {n.icon}
            </span>
          </span>
        );
      })}
    </div>
  );
}


/** Your story's next step, with a button to go there. */
export function QuestChip({ game }: { game: GameState }) {
  const [open, setOpen] = useState(false);
  const tapPlace = useGameStore((s) => s.tapPlace);
  const openPhone = useGameStore((s) => s.openPhone);
  const leave = useGameStore((s) => s.leave);
  const insideId = useGameStore((s) => s.insidePlaceId);
  const ch = currentChapter(game);
  const next = ch.steps.find((s) => !s.done);
  const done = ch.steps.filter((s) => s.done).length;
  if (!next) return null;
  const go = () => {
    setOpen(false);
    if (next.portal) openPhone('school');
    else if (next.placeId) {
      if (insideId === next.placeId) return;
      leave();
      tapPlace(next.placeId);
    }
  };
  return (
    <div className={`pointer-events-auto w-fit max-w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl ${PILL}`}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-2 px-3 py-1.5 text-left">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sun text-xs font-black text-night">{ch.number}</span>
        <span className="min-w-0">
          <span className="block truncate text-[11px] text-muted">
            {ch.title} · {done}/{ch.steps.length}
          </span>
          <span className="block truncate text-sm font-semibold">
            {next.label}
            {next.reward ? <span className="ml-1 text-xs text-sun">+{naira(next.reward)}</span> : null}
          </span>
        </span>
      </button>
      {open && (
        <div className="flex flex-col gap-1.5 border-t border-white/10 px-3 pt-2 pb-3">
          <p className="text-xs text-muted">{ch.blurb}</p>
          <ol className="flex flex-col gap-1">
            {ch.steps.map((s) => (
              <li key={s.id} className={`flex gap-2 text-sm ${s.done ? 'text-muted line-through' : s === next ? 'font-semibold' : ''}`}>
                <span aria-hidden="true">{s.done ? '✅' : s === next ? '👉' : '▫️'}</span>
                <span>
                  {s.label}
                  {s === next && s.hint && <span className="block text-xs font-normal text-muted">{s.hint}</span>}
                </span>
              </li>
            ))}
          </ol>
          {(next.portal || (next.placeId && next.placeId !== insideId)) && (
            <button onClick={go} className="mt-1 min-h-10 rounded-xl bg-sun px-3 text-sm font-bold text-night">
              {next.portal ? 'Open the school app' : `Go to ${placeName(next.placeId!)}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** The timetable as a day planner: every part of every day says what is on. */
export function DayPlanView({ game, onlyToday = false }: { game: GameState; onlyToday?: boolean }) {
  const week = game.clock.day <= 7 ? 1 : 2;
  const [w, setW] = useState(week);
  const days = onlyToday ? [game.clock.day] : Array.from({ length: 7 }, (_, i) => (w - 1) * 7 + i + 1);
  return (
    <div className="flex flex-col gap-2">
      {!onlyToday && (
        <div className="flex gap-1.5">
          {[1, 2].map((n) => (
            <button key={n} onClick={() => setW(n)} aria-pressed={w === n} className={`min-h-9 flex-1 rounded-full text-sm font-semibold ${w === n ? 'bg-sun text-night' : 'bg-white/10'}`}>
              Week {n}
            </button>
          ))}
        </div>
      )}
      {days.map((day) => {
        const plan = dayPlan(game, day);
        const today = day === game.clock.day;
        return (
          <div key={day} className={`rounded-2xl border border-white/10 bg-white/5 p-2.5 ${today ? 'ring-2 ring-sun' : ''} ${day < game.clock.day ? 'opacity-55' : ''}`}>
            <p className="mb-1 text-xs font-bold text-muted">
              {dayName(day)} · day {day}
              {today ? ' · TODAY' : ''}
            </p>
            <ul className="flex flex-col gap-1">
              {plan.map((p, i) => {
                const now = today && p.slot === game.clock.slot;
                return (
                  <li key={i} className={`flex items-start gap-2 rounded-lg px-1.5 py-1 text-sm ${now ? 'bg-sun/15' : ''} ${p.note === 'cancelled' ? 'line-through opacity-60' : ''}`}>
                    <span className="w-[4.5rem] shrink-0 text-xs text-muted">{SLOTS[p.slot]}</span>
                    <span aria-hidden="true">{PLAN_ICON[p.kind]}</span>
                    <span className="min-w-0 flex-1">
                      <span className={p.kind === 'exam' || p.kind === 'test' ? 'font-bold' : ''}>{p.text}</span>
                      {p.placeId && <span className="block text-xs text-muted">{placeName(p.placeId)}</span>}
                    </span>
                    {p.done && <span aria-label="done">✓</span>}
                    {p.note === 'moved' && <span className="text-xs text-amber-300">moved</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      <p className="text-xs text-muted">
        Now: {dayName(game.clock.day)}, {slotName(game.clock).toLowerCase()}.
      </p>
    </div>
  );
}
