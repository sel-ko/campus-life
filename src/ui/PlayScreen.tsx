import { lazy, Suspense, useEffect, useState } from 'react';
import type { GameState } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { ErrorBoundary } from './ErrorBoundary';
import { BottomBar } from './BottomBar';
import { EventCard } from './EventCard';
import { Hud } from './Hud';
import { InsideScreen } from './InsideScreen';
import { JournalSheet } from './JournalSheet';
import { FloatingJoystick, useJoystickHandlers } from './Joystick';
import { Phone } from './phone/Phone';
import { PlacesApp } from './phone/PhoneApps';
import { ProfileSheet } from './ProfileSheet';
import { Tour } from './Tour';
import { TravelSheet } from './TravelSheet';
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
// with floating controls; buildings open the inside screen.
export function PlayScreen({ game }: { game: GameState }) {
  const visible = usePageVisible();
  const [mapFailed, setMapFailed] = useState(false);
  const showMap = hasWebGL() && !mapFailed;
  const inside = useGameStore((s) => s.insidePlaceId !== null);
  const phoneOpen = useGameStore((s) => s.phoneApp !== null);
  const profileOpen = useGameStore((s) => s.profileOpen);
  const journalOpen = useGameStore((s) => s.journalOpen);
  const travelOpen = useGameStore((s) => s.travelSheetId !== null);
  const walkTarget = useGameStore((s) => s.walkTargetId);
  const arrive = useGameStore((s) => s.arrive);
  const tapPlace = useGameStore((s) => s.tapPlace);
  const closePhone = useGameStore((s) => s.closePhone);
  const cameraMode = useGameStore((s) => s.cameraMode);

  // Without the 3D map there is no walk to watch: arrive straight away.
  useEffect(() => {
    if (!showMap && walkTarget) arrive();
  }, [showMap, walkTarget, arrive]);

  const covered = inside || phoneOpen || profileOpen || journalOpen || game.pendingEvent !== null || game.summaries.length > 0;
  const paused = !visible || covered;
  const joystickHandlers = useJoystickHandlers(showMap && cameraMode === 'follow' && !paused && !travelOpen);

  function pickPlace(id: string) {
    closePhone();
    tapPlace(id);
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-night">
      {showMap ? (
        <div className="absolute inset-0" {...joystickHandlers}>
          <ErrorBoundary fallback={null} onError={() => setMapFailed(true)}>
            <Suspense fallback={<MapLoading />}>
              <CampusScene paused={paused} />
            </Suspense>
          </ErrorBoundary>
        </div>
      ) : (
        <div className="absolute inset-0 overflow-y-auto px-4 pt-28 pb-32">
          <div className="mx-auto max-w-md">
            <PlacesApp game={game} onPick={pickPlace} />
          </div>
        </div>
      )}

      <Hud game={game} showMap={showMap} />
      <FloatingJoystick />
      <TravelSheet game={game} />
      <InsideScreen game={game} />
      <BottomBar game={game} showMap={showMap} />
      <JournalSheet game={game} />
      <ProfileSheet game={game} />
      <Phone game={game} onPickPlace={pickPlace} />
      <EventCard game={game} />
      {game.phase === 'playing' && !game.pendingEvent && <Tour />}
    </div>
  );
}
