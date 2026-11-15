import { dayName, currentSlot } from '../game/engine';
import { naira } from '../game/format';
import type { GameState, MeterKey } from '../game/types';
import { SEMESTER_DAYS } from '../game/config';

const METERS: Array<{ key: MeterKey; label: string; colour: string }> = [
  { key: 'grades', label: 'Grades', colour: 'bg-sky-400' },
  { key: 'energy', label: 'Energy', colour: 'bg-emerald-400' },
  { key: 'social', label: 'Social', colour: 'bg-pink-400' },
  // Stress is the one meter where high is bad.
  { key: 'stress', label: 'Stress', colour: 'bg-red-400' },
];

export function Hud({ game }: { game: GameState }) {
  return (
    <header className="flex flex-col gap-2 border-b border-line bg-panel/95 px-4 py-3">
      <div className="flex items-baseline justify-between">
        <p className="font-bold">
          Day {game.day}/{SEMESTER_DAYS} · {dayName(game.day)} · {currentSlot(game)}
        </p>
        <p className="font-bold text-sun">{naira(game.money)}</p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {METERS.map((m) => (
          <div key={m.key} className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-muted">
              <span>{m.label}</span>
              <span>{game.meters[m.key]}</span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-night"
              role="meter"
              aria-label={m.label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={game.meters[m.key]}
            >
              <div className={`h-full ${m.colour}`} style={{ width: `${game.meters[m.key]}%` }} />
            </div>
          </div>
        ))}
      </div>
    </header>
  );
}
