import { useMemo, useState } from 'react';
import { getDepartment } from '../content/university';
import { finalResult } from '../game/engine';
import { naira } from '../game/format';
import type { GameState } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { ShareSheet } from './ShareSheet';
import type { ShareCardData } from './shareCard';
import { gameUrl } from './site';

export function ResultsScreen({ game }: { game: GameState }) {
  const reset = useGameStore((s) => s.reset);
  const [sharing, setSharing] = useState(false);
  const result = useMemo(() => finalResult(game), [game]);
  const department = getDepartment(game.player.departmentId)?.name ?? '';

  const shareData: ShareCardData = useMemo(
    () => ({ nickname: game.player.nickname, department, result, money: game.money, url: gameUrl() }),
    // Everything here comes from the finished game, which no longer changes.
    [game, department, result],
  );

  const stats = [
    ['Social', String(game.meters.social)],
    ['Stress', String(game.meters.stress)],
    ['Money', naira(game.money)],
  ] as const;

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col gap-6 px-4 py-8">
      <header className="flex flex-col items-center gap-1 text-center">
        <p className="text-muted">{game.player.nickname}, your semester is over</p>
        <p className="text-7xl font-extrabold text-sun">{result.cgpa.toFixed(2)}</p>
        <p className="text-xl font-bold">{result.className}</p>
      </header>

      <section className="flex flex-col items-center gap-1 rounded-2xl border border-sun/50 bg-panel p-4 text-center">
        <p className="text-xs font-bold tracking-wide text-muted uppercase">Your title</p>
        <p className="text-2xl font-extrabold text-sun">{result.title}</p>
        <p className="text-sm text-muted">{result.titleBlurb}</p>
      </section>

      <dl className="grid grid-cols-3 gap-3 text-center">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line bg-panel p-3">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="text-lg font-bold">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-auto flex flex-col gap-3">
        <button onClick={() => setSharing(true)} className="min-h-12 rounded-lg bg-sun font-bold text-night">
          Share my result
        </button>
        <button onClick={reset} className="min-h-12 rounded-lg border border-line bg-panel font-bold">
          Play again
        </button>
      </div>

      {sharing && <ShareSheet data={shareData} onClose={() => setSharing(false)} />}
    </main>
  );
}
