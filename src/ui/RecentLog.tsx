import type { GameState } from '../game/types';

// The last few things that happened, newest first.
export function RecentLog({ game, count = 5 }: { game: GameState; count?: number }) {
  const entries = game.log.slice(-count).reverse();
  if (entries.length === 0) return null;

  return (
    <section aria-label="Recent happenings" className="flex flex-col gap-1">
      <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">Recent</h2>
      <ul className="flex flex-col gap-1 text-sm">
        {entries.map((e, i) => (
          <li key={game.log.length - i} className={i === 0 ? '' : 'text-muted'}>
            <span className="text-xs text-muted">
              D{e.day} {e.slot}:
            </span>{' '}
            {e.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
