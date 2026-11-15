// The bottom menu when a far building is tapped: keke, cab or walk.
import { getPlace, sectionName } from '../content/places';
import { travelOptions } from '../game/interactions';
import type { GameState } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { SHEET } from './theme';

const ICONS = { keke: '🛺', cab: '🚕', walk: '🚶' } as const;

export function TravelSheet({ game }: { game: GameState }) {
  const id = useGameStore((s) => s.travelSheetId);
  const choose = useGameStore((s) => s.chooseTravel);
  const close = useGameStore((s) => s.closeTravelSheet);
  const place = id ? getPlace(id) : undefined;
  if (!place || !id) return null;
  const options = travelOptions(game, id);
  const across = place.sectionId !== game.location.sectionId;

  return (
    <div className="fixed inset-0 z-30 bg-black/40" onClick={close}>
      <section role="dialog" aria-label={`Go to ${place.name}`} className={SHEET} onClick={(e) => e.stopPropagation()}>
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">Go to</p>
        <h2 className="text-xl font-bold">{place.name}</h2>
        <p className="mb-3 text-sm text-muted">
          {sectionName(place.sectionId)}
          {across ? ` · you are on ${sectionName(game.location.sectionId)}` : ' · same part of campus'}
        </p>
        <ul className="flex flex-col gap-2">
          {options.map((o) => (
            <li key={o.mode}>
              <button
                disabled={!o.available}
                onClick={() => choose(o.mode)}
                className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 text-left disabled:opacity-45"
              >
                <span className="text-2xl" aria-hidden="true">
                  {ICONS[o.mode]}
                </span>
                <span className="flex flex-1 flex-col">
                  <span className="font-semibold">{o.label}</span>
                  <span className="text-xs text-muted">{o.available ? o.detail : o.reason}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <button onClick={close} className="mt-3 min-h-11 w-full rounded-xl text-sm font-semibold text-muted">
          Cancel
        </button>
      </section>
    </div>
  );
}
