import { university } from '../content/university';
import { hasAvailableAction } from '../game/engine';
import type { GameState } from '../game/types';
import { useGameStore } from '../store/gameStore';

// A plain list of campus places. It stands in for the 3D map until Phase 3,
// and stays as the fallback when a phone has no WebGL.
export function LocationList({ game }: { game: GameState }) {
  const tapLocation = useGameStore((s) => s.tapLocation);

  return (
    <ul className="grid grid-cols-2 gap-3">
      {university.locations.map((loc) => {
        const open = hasAvailableAction(game, loc.type);
        return (
          <li key={loc.id}>
            <button
              onClick={() => tapLocation(loc.id)}
              className={`flex min-h-16 w-full items-center rounded-xl border border-line bg-panel px-3 py-2 text-left font-semibold ${
                open ? '' : 'opacity-45'
              }`}
            >
              {loc.name}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
