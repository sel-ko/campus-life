import { lazy, Suspense, useState } from 'react';
import type { GameState } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { ErrorBoundary } from './ErrorBoundary';
import { EventCard } from './EventCard';
import { Hud } from './Hud';
import { LocationList } from './LocationList';
import { LocationSheet } from './LocationSheet';
import { RecentLog } from './RecentLog';
import { usePageVisible } from './usePageVisible';
import { hasWebGL } from './webgl';

// The 3D code is a separate download, fetched only when the map is shown.
const CampusScene = lazy(() => import('../world/CampusScene'));

function MapLoading() {
  return (
    <div className="flex h-full items-center justify-center bg-[#9ED8F5] text-night">
      <p className="animate-pulse font-semibold">Building the campus…</p>
    </div>
  );
}

export function PlayScreen({ game }: { game: GameState }) {
  const reset = useGameStore((s) => s.reset);
  const sheetOpen = useGameStore((s) => s.selectedLocationId !== null);
  const visible = usePageVisible();
  const [view, setView] = useState<'map' | 'list'>(() => (hasWebGL() ? 'map' : 'list'));

  function quit() {
    if (window.confirm('Start over? Your current semester will be lost.')) reset();
  }

  const overlays = (
    <>
      <LocationSheet game={game} />
      <EventCard game={game} />
    </>
  );

  if (view === 'list') {
    return (
      <div className="mx-auto flex min-h-full max-w-md flex-col">
        <Hud game={game} />
        <main className="flex flex-1 flex-col gap-5 px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted">Where are you going? Dimmed places have nothing open now.</p>
            {hasWebGL() && (
              <button onClick={() => setView('map')} className="min-h-11 shrink-0 rounded-lg border border-line px-3 text-sm font-semibold">
                Map
              </button>
            )}
          </div>
          <LocationList game={game} />
          <RecentLog game={game} />
          <button onClick={quit} className="mt-auto min-h-11 self-center px-4 text-sm text-muted underline">
            Start over
          </button>
        </main>
        {overlays}
      </div>
    );
  }

  // Map view: the 3D campus fills the screen; HUD and log float on top.
  // Drawing stops while the tab is hidden or a sheet or event covers the map.
  const paused = !visible || sheetOpen || game.pendingEventId !== null;
  const lastLog = game.log[game.log.length - 1];

  return (
    <div className="fixed inset-0 overflow-hidden">
      <div className="absolute inset-0">
        <ErrorBoundary fallback={null} onError={() => setView('list')}>
          <Suspense fallback={<MapLoading />}>
            <CampusScene paused={paused} />
          </Suspense>
        </ErrorBoundary>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto max-w-md">
        <div className="pointer-events-auto">
          <Hud game={game} />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto flex max-w-md flex-col gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {lastLog && (
          <p className="rounded-lg bg-night/80 px-3 py-2 text-sm">
            <span className="text-xs text-muted">
              D{lastLog.day} {lastLog.slot}:
            </span>{' '}
            {lastLog.text}
          </p>
        )}
        <div className="pointer-events-auto flex justify-between gap-2">
          <button onClick={() => setView('list')} className="min-h-11 rounded-lg bg-night/85 px-4 text-sm font-semibold">
            List of places
          </button>
          <button onClick={quit} className="min-h-11 rounded-lg bg-night/85 px-4 text-sm text-muted">
            Start over
          </button>
        </div>
      </div>

      {overlays}
    </div>
  );
}
