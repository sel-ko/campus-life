import { university } from '../content/university';
import { hasAvailableAction } from '../game/engine';
import type { GameState } from '../game/types';
import { useGameStore } from '../store/gameStore';

// A plain list of campus places, grouped by site. It stands in for the 3D map
// until Phase 3, and stays as the fallback when a phone has no WebGL.
export function LocationList({ game }: { game: GameState }) {
  const tapLocation = useGameStore((s) => s.tapLocation);

  return (
    <div className="flex flex-col gap-4">
      {university.sites.map((site) => (
        <section key={site.id} className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
            {site.shortName === site.name ? site.name : `${site.shortName} · ${site.name}`}
          </h2>
          <ul className="grid grid-cols-2 gap-3">
            {university.locations
              .filter((loc) => loc.siteId === site.id)
              .map((loc) => {
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
        </section>
      ))}
    </div>
  );
}
