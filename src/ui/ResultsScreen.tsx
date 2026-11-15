import { finalResult } from '../game/engine';
import { naira } from '../game/format';
import type { GameState } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { RecentLog } from './RecentLog';

// Simple end screen. Phase 2 adds titles, stats and the share card.
export function ResultsScreen({ game }: { game: GameState }) {
  const reset = useGameStore((s) => s.reset);
  const result = finalResult(game);

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-1 text-center">
        <p className="text-muted">{game.player.nickname}, your semester is over</p>
        <p className="text-6xl font-extrabold text-sun">{result.cgpa.toFixed(2)}</p>
        <p className="text-xl font-bold">{result.className}</p>
      </header>

      <dl className="grid grid-cols-2 gap-3 text-center">
        {(
          [
            ['Energy', game.meters.energy],
            ['Social', game.meters.social],
            ['Stress', game.meters.stress],
            ['Money', naira(game.money)],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line bg-panel p-3">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="text-lg font-bold">{value}</dd>
          </div>
        ))}
      </dl>

      <RecentLog game={game} count={4} />

      <button onClick={reset} className="min-h-12 rounded-lg bg-sun font-bold text-night">
        Play again
      </button>
    </main>
  );
}
