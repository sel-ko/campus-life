import { getDepartment, getLocation } from '../content/university';
import { BACKGROUNDS, SEMESTER_DAYS } from '../game/config';
import { currentSlot, dayName } from '../game/engine';
import { naira } from '../game/format';
import type { GameState, MeterKey } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { PRESETS, PRESET_IDS, presetLook } from '../world/characters/look';
import { CheckIcon, CloseIcon } from './icons';
import { Portrait } from './Portrait';

const METERS: Array<{ key: MeterKey; label: string; colour: string; hint: string }> = [
  { key: 'grades', label: 'Grades', colour: 'bg-sky-400', hint: 'Your CGPA at the end is Grades ÷ 20' },
  { key: 'energy', label: 'Energy', colour: 'bg-emerald-400', hint: 'At 0 you collapse and lose a slot' },
  { key: 'social', label: 'Social', colour: 'bg-pink-400', hint: 'Drops a little every day' },
  { key: 'stress', label: 'Stress', colour: 'bg-red-400', hint: '90 or more at night costs grades' },
];

// The player's profile: who they are, their stats, and their look.
export function ProfileSheet({ game }: { game: GameState }) {
  const open = useGameStore((s) => s.profileOpen);
  const setOpen = useGameStore((s) => s.setProfileOpen);
  const setCharacter = useGameStore((s) => s.setCharacter);
  if (!open) return null;

  const p = game.player;
  const facts = [
    ['Department', getDepartment(p.departmentId)?.name ?? p.departmentId],
    ['Stays at', getLocation(p.homeId)?.name ?? '—'],
    ['Background', BACKGROUNDS[p.background].label],
    ['Money', naira(game.money)],
  ];

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end bg-black/50" onClick={() => setOpen(false)}>
      <section
        role="dialog"
        aria-label="Your profile"
        onClick={(e) => e.stopPropagation()}
        className="mx-auto flex max-h-[88%] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-3xl border-t border-line bg-panel px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-16 place-items-center overflow-hidden rounded-2xl bg-[#2B4558]">
            <Portrait look={presetLook(p.characterId)} size={60} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <h2 className="truncate text-xl font-extrabold">{p.nickname}</h2>
            <p className="text-sm text-muted">
              Day {game.day} of {SEMESTER_DAYS} · {dayName(game.day)} {currentSlot(game)}
            </p>
          </div>
          <button onClick={() => setOpen(false)} className="grid min-h-11 min-w-11 place-items-center text-muted" aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <section className="flex flex-col gap-3">
          {METERS.map((m) => (
            <div key={m.key} className="flex flex-col gap-1">
              <div className="flex justify-between text-sm">
                <span className="font-semibold">{m.label}</span>
                <span className="font-bold">{game.meters[m.key]}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-night" role="meter" aria-label={m.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={game.meters[m.key]}>
                <div className={`h-full ${m.colour}`} style={{ width: `${game.meters[m.key]}%` }} />
              </div>
              <p className="text-xs text-muted">{m.hint}</p>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-2 gap-2">
          {[
            ['Eaten today', game.today.ate],
            ['Read today', game.today.studied],
          ].map(([label, done]) => (
            <div key={String(label)} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${done ? 'border-emerald-400/60 text-ink' : 'border-line text-muted'}`}>
              <span className={`grid size-5 place-items-center rounded-full ${done ? 'bg-emerald-400 text-night' : 'border border-line'}`}>
                {done && <CheckIcon size={14} />}
              </span>
              {label}
            </div>
          ))}
        </section>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl border border-line p-3 text-sm">
          {facts.map(([k, v]) => (
            <div key={k} className="flex flex-col">
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="font-semibold">{v}</dd>
            </div>
          ))}
        </dl>

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Your look</h3>
          <div className="grid grid-cols-4 gap-2">
            {PRESET_IDS.map((id) => (
              <button
                key={id}
                onClick={() => setCharacter(id)}
                aria-pressed={p.characterId === id}
                aria-label={PRESETS[id].name}
                className={`flex min-h-11 flex-col items-center gap-1 rounded-xl border-2 bg-[#2B4558] p-1 ${p.characterId === id ? 'border-sun' : 'border-transparent'}`}
              >
                <Portrait look={PRESETS[id].look} size={52} />
              </button>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}
