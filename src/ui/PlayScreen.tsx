import { lazy, Suspense, useState } from 'react';
import type { GameState } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { ErrorBoundary } from './ErrorBoundary';
import { EventCard } from './EventCard';
import { LocationList } from './LocationList';
import { LocationSheet } from './LocationSheet';
import { MapChrome } from './MapChrome';
import { Phone } from './phone/Phone';
import { ProfileSheet } from './ProfileSheet';
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

// Full-screen play: the 3D campus (or a plain list on phones without WebGL)
// with floating glass controls on top. Everything else opens over it.
export function PlayScreen({ game }: { game: GameState }) {
  const visible = usePageVisible();
  const [mapFailed, setMapFailed] = useState(false);
  const showMap = hasWebGL() && !mapFailed;

  const sheetOpen = useGameStore((s) => s.selectedLocationId !== null);
  const phoneOpen = useGameStore((s) => s.phoneApp !== null);
  const profileOpen = useGameStore((s) => s.profileOpen);
  const travelTo = useGameStore((s) => s.travelTo);
  const tapLocation = useGameStore((s) => s.tapLocation);
  const closePhone = useGameStore((s) => s.closePhone);

  // Drawing stops while the tab is hidden or anything covers the map.
  const paused = !visible || sheetOpen || phoneOpen || profileOpen || game.pendingEventId !== null;

  // From the phone's Places app: walk there on the map, or open it directly.
  function pickPlace(id: string) {
    if (showMap) {
      closePhone();
      travelTo(id);
    } else {
      tapLocation(id);
    }
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-night">
      {showMap ? (
        <div className="absolute inset-0">
          <ErrorBoundary fallback={null} onError={() => setMapFailed(true)}>
            <Suspense fallback={<MapLoading />}>
              <CampusScene paused={paused} />
            </Suspense>
          </ErrorBoundary>
        </div>
      ) : (
        <div className="absolute inset-0 overflow-y-auto px-4 pt-28 pb-32">
          <div className="mx-auto max-w-md">
            <LocationList game={game} />
          </div>
        </div>
      )}

      <MapChrome game={game} showMap={showMap} />

      <LocationSheet game={game} />
      <EventCard game={game} />
      <ProfileSheet game={game} />
      <Phone game={game} onPickPlace={pickPlace} />
    </div>
  );
}
