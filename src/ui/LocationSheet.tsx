import { getLocation } from '../content/university';
import { actionsAt, canDoAction } from '../game/engine';
import { describeEffects } from '../game/format';
import type { GameState } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { VendorSection } from './VendorSection';

// Bottom sheet with the actions for the selected place.
export function LocationSheet({ game }: { game: GameState }) {
  const selectedId = useGameStore((s) => s.selectedLocationId);
  const closeSheet = useGameStore((s) => s.closeSheet);
  const act = useGameStore((s) => s.act);

  const location = selectedId ? getLocation(selectedId) : undefined;
  if (!location) return null;

  const actions = actionsAt(location.type);

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-end bg-black/50" onClick={closeSheet}>
      <section
        role="dialog"
        aria-label={location.name}
        onClick={(e) => e.stopPropagation()}
        className="mx-auto flex max-h-[80%] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-t-2xl border-t border-line bg-panel px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{location.name}</h2>
          <button onClick={closeSheet} className="min-h-11 min-w-11 rounded-lg text-2xl text-muted" aria-label="Close">
            ×
          </button>
        </div>

        {actions.length === 0 && <p className="text-muted">Nothing to do here yet.</p>}

        <ul className="flex flex-col gap-2">
          {actions.map((a) => {
            const check = canDoAction(game, a);
            return (
              <li key={a.id}>
                <button
                  disabled={!check.ok}
                  onClick={() => act(a.id)}
                  className="flex min-h-11 w-full flex-col items-start gap-1 rounded-xl border border-line bg-night px-3 py-2 text-left disabled:opacity-50"
                >
                  <span className="font-semibold">{a.label}</span>
                  <span className="text-xs text-muted">{describeEffects(a.effects).join(' · ')}</span>
                  {!check.ok && <span className="text-xs font-semibold text-red-300">{check.reason}</span>}
                </button>
              </li>
            );
          })}
        </ul>

        <VendorSection location={location} homeId={game.player.homeId} />
      </section>
    </div>
  );
}
