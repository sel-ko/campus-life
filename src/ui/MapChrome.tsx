// The floating glass controls over the map: time, money, avatar, Me/Map
// toggle, phone, a short-lived toast for what just happened, the joystick and
// the "Enter" button. They replace the old top bar and bottom strip.
import { useEffect, useRef, useState } from 'react';
import { getLocation } from '../content/university';
import { SEMESTER_DAYS } from '../game/config';
import { currentSlot, dayName } from '../game/engine';
import { naira } from '../game/format';
import type { GameState, Slot } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { useGlass } from '../store/settingsStore';
import { presetLook } from '../world/characters/look';
import { DoorIcon, MapIcon, MoonIcon, PhoneIcon, SunIcon, SunriseIcon, SunsetIcon, UserIcon } from './icons';
import { Joystick } from './Joystick';
import { Portrait } from './Portrait';
import { useChat } from './useChat';

const SLOT_ICONS: Record<Slot, (p: { size?: number }) => React.ReactElement> = {
  Morning: SunriseIcon,
  Afternoon: SunIcon,
  Evening: SunsetIcon,
  Night: MoonIcon,
};

/** Shows the newest log line for a few seconds after it appears. */
function Toast({ game, glass }: { game: GameState; glass: string }) {
  const [text, setText] = useState<string | null>(null);
  const seen = useRef(game.log.length);
  useEffect(() => {
    if (game.log.length === seen.current) return;
    seen.current = game.log.length;
    const last = game.log[game.log.length - 1];
    if (!last) return;
    setText(last.text);
    const id = window.setTimeout(() => setText(null), 3800);
    return () => window.clearTimeout(id);
  }, [game.log]);
  if (!text) return null;
  return (
    <div role="status" className={`mx-auto max-w-sm rounded-2xl px-4 py-2 text-center text-sm ${glass}`}>
      {text}
    </div>
  );
}

export function MapChrome({ game, showMap }: { game: GameState; showMap: boolean }) {
  const glass = useGlass();
  const slot = currentSlot(game);
  const SlotIcon = SLOT_ICONS[slot];
  const { unread } = useChat(game);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const setCameraMode = useGameStore((s) => s.setCameraMode);
  const openPhone = useGameStore((s) => s.openPhone);
  const setProfileOpen = useGameStore((s) => s.setProfileOpen);
  const nearbyId = useGameStore((s) => s.nearbyLocationId);
  const sheetOpen = useGameStore((s) => s.selectedLocationId !== null);
  const travelling = useGameStore((s) => s.travelTargetId !== null);
  const tapLocation = useGameStore((s) => s.tapLocation);
  const nearby = nearbyId ? getLocation(nearbyId) : undefined;
  const energy = game.meters.energy;
  const warn = energy <= 20 || game.meters.stress >= 80;
  const follow = showMap && cameraMode === 'follow';

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {/* Top: time and money */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <button
            onClick={() => openPhone('calendar')}
            className={`pointer-events-auto flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold ${glass}`}
            aria-label={`Day ${game.day} of ${SEMESTER_DAYS}, ${dayName(game.day)} ${slot}. Open calendar`}
          >
            <SlotIcon size={18} />
            <span>
              {dayName(game.day)} · {slot}
            </span>
            <span className="text-xs text-muted">
              D{game.day}/{SEMESTER_DAYS}
            </span>
          </button>
          <button
            onClick={() => openPhone('wallet')}
            className={`pointer-events-auto flex min-h-11 items-center rounded-full px-4 text-sm font-bold text-sun ${glass}`}
            aria-label={`Money ${naira(game.money)}. Open wallet`}
          >
            {naira(game.money)}
          </button>
        </div>
        <Toast game={game} glass={glass} />
      </div>

      {/* Bottom: joystick and Enter (close-up only), then the main row */}
      <div className="flex flex-col items-center gap-3">
        {follow && !sheetOpen && nearby && !travelling && (
          <button
            onClick={() => tapLocation(nearby.id)}
            className="pointer-events-auto flex min-h-12 items-center gap-2 rounded-full bg-sun px-5 font-bold text-night shadow-lg"
          >
            <DoorIcon size={20} /> Enter {nearby.name}
          </button>
        )}
        {follow && !sheetOpen && <Joystick />}

        <div className="flex w-full items-end justify-between gap-2">
          <button
            onClick={() => setProfileOpen(true)}
            aria-label={`${game.player.nickname}: stats and profile. Energy ${energy}`}
            className="pointer-events-auto relative grid size-16 place-items-center rounded-full"
            style={{ background: `conic-gradient(${energy > 30 ? '#34D399' : '#F87171'} ${energy * 3.6}deg, rgba(255,255,255,0.18) 0)` }}
          >
            <span className="grid size-[54px] place-items-center overflow-hidden rounded-full bg-[#2B4558]">
              <Portrait look={presetLook(game.player.characterId)} size={50} />
            </span>
            {warn && <span className="absolute top-0 right-0 size-3.5 rounded-full border-2 border-night bg-red-400" />}
          </button>

          {showMap && (
            <div className={`pointer-events-auto flex rounded-full p-1 ${glass}`} role="group" aria-label="Camera">
              {(
                [
                  ['follow', 'Me', UserIcon],
                  ['overview', 'Map', MapIcon],
                ] as const
              ).map(([mode, label, Icon]) => (
                <button
                  key={mode}
                  onClick={() => setCameraMode(mode)}
                  aria-pressed={cameraMode === mode}
                  className={`flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold ${
                    cameraMode === mode ? 'bg-sun text-night' : 'text-ink'
                  }`}
                >
                  <Icon size={18} /> {label}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => openPhone('home')}
            aria-label={`Phone${unread ? `, ${unread} unread messages` : ''}`}
            className={`pointer-events-auto relative grid size-16 place-items-center rounded-full ${glass}`}
          >
            <PhoneIcon size={26} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 grid min-w-6 place-items-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
