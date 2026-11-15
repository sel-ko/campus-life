// The floating controls over the map, laid out like the reference: a top row
// (time, a stats drop-down, money) and a bottom row (avatar, Home/Me/Map
// navigation, phone). A short toast shows what just happened.
import { useEffect, useRef, useState } from 'react';
import { getLocation } from '../content/university';
import { SEMESTER_DAYS } from '../game/legacy/config';
import { currentSlot, dayName } from '../game/legacy/engine';
import { naira } from '../game/legacy/format';
import type { GameState, MeterKey, Slot } from '../game/legacy/types';
import { useGameStore } from '../store/gameStore';
import { presetLook } from '../world/characters/look';
import { SLOT_CLOCK } from './clock';
import { DoorIcon, MapIcon, MoonIcon, SunIcon, SunriseIcon, SunsetIcon, UserIcon } from './icons';
import { Portrait } from './Portrait';
import { useChat } from './useChat';

/** Dark rounded pill, the shared look of every control. */
const PILL = 'pointer-events-auto bg-[#16181F]/90 border border-white/10 shadow-lg shadow-black/30 text-ink';
const ACTIVE = 'bg-[#3A2F5C] text-white';

const SLOT_ICONS: Record<Slot, (p: { size?: number; className?: string }) => React.ReactElement> = {
  Morning: SunriseIcon,
  Afternoon: SunIcon,
  Evening: SunsetIcon,
  Night: MoonIcon,
};

const METERS: Array<{ key: MeterKey; label: string; colour: string }> = [
  { key: 'grades', label: 'Grades', colour: 'bg-sky-400' },
  { key: 'energy', label: 'Energy', colour: 'bg-emerald-400' },
  { key: 'social', label: 'Social', colour: 'bg-pink-400' },
  { key: 'stress', label: 'Stress', colour: 'bg-red-400' },
];

function HomeIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}

/** Shows the newest log line for a few seconds after it appears. */
function Toast({ game }: { game: GameState }) {
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
    <div role="status" className={`mx-auto max-w-sm rounded-2xl px-4 py-2 text-center text-sm ${PILL}`}>
      {text}
    </div>
  );
}

/** A small tilted phone, drawn in CSS, for the phone button. */
function MiniPhone() {
  return (
    <span className="block h-8 w-5 rotate-[-12deg] rounded-[6px] border-2 border-[#0B0C10] bg-gradient-to-b from-[#7C5CFF] to-[#2C1F66] shadow-md">
      <span className="mx-auto mt-0.5 block h-0.5 w-2 rounded-full bg-black/60" />
    </span>
  );
}

export function MapChrome({ game, showMap }: { game: GameState; showMap: boolean }) {
  const [statsOpen, setStatsOpen] = useState(false);
  const slot = currentSlot(game);
  const SlotIcon = SLOT_ICONS[slot];
  const clock = SLOT_CLOCK[slot];
  const { unread } = useChat(game);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const setCameraMode = useGameStore((s) => s.setCameraMode);
  const openPhone = useGameStore((s) => s.openPhone);
  const setProfileOpen = useGameStore((s) => s.setProfileOpen);
  const nearbyId = useGameStore((s) => s.nearbyLocationId);
  const sheetOpen = useGameStore((s) => s.selectedLocationId !== null);
  const travelling = useGameStore((s) => s.travelTargetId !== null);
  const tapLocation = useGameStore((s) => s.tapLocation);
  const travelTo = useGameStore((s) => s.travelTo);
  const nearby = nearbyId ? getLocation(nearbyId) : undefined;
  const energy = game.meters.energy;
  const warn = energy <= 20 || game.meters.stress >= 80;
  const follow = showMap && cameraMode === 'follow';

  function goHome() {
    if (showMap) {
      setCameraMode('follow');
      travelTo(game.player.homeId);
    } else {
      tapLocation(game.player.homeId);
    }
  }

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {/* ---- Top row: time · stats drop-down · money ---- */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => openPhone('calendar')}
            className={`flex h-11 items-center gap-2 rounded-full px-3.5 text-sm font-semibold ${PILL}`}
            aria-label={`${dayName(game.day)} ${slot}, day ${game.day} of ${SEMESTER_DAYS}. Open calendar`}
          >
            <SlotIcon size={18} className="text-sun" />
            <span>
              {clock.time} <span className="text-xs text-muted">{clock.ampm}</span>
            </span>
          </button>

          <button
            onClick={() => setStatsOpen((o) => !o)}
            aria-expanded={statsOpen}
            aria-label="Show today and your stats"
            className={`grid h-11 w-16 place-items-center rounded-full ${PILL}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" className={`transition-transform ${statsOpen ? 'rotate-180' : ''}`} aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          <div className={`flex h-11 items-center gap-2 rounded-full pr-1 pl-4 ${PILL}`}>
            <button onClick={() => openPhone('wallet')} className="text-sm font-bold" aria-label={`Money ${naira(game.money)}. Open wallet`}>
              {naira(game.money)}
            </button>
            <button onClick={() => openPhone('wallet')} aria-label="Ways to make money" className="grid size-9 place-items-center rounded-full bg-[#CDB8FF] text-[#2C1F66]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
        </div>

        {statsOpen && (
          <div className={`mx-auto flex w-full max-w-sm flex-col gap-2 rounded-3xl p-4 ${PILL}`}>
            <p className="text-sm font-semibold">
              {dayName(game.day)} · Day {game.day} of {SEMESTER_DAYS} · {slot}
            </p>
            {METERS.map((m) => (
              <div key={m.key} className="flex items-center gap-2 text-xs">
                <span className="w-12 text-muted">{m.label}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                  <span className={`block h-full ${m.colour}`} style={{ width: `${game.meters[m.key]}%` }} />
                </span>
                <span className="w-7 text-right font-bold">{game.meters[m.key]}</span>
              </div>
            ))}
          </div>
        )}
        <Toast game={game} />
      </div>

      {/* ---- Bottom: Enter button, then avatar · navigation · phone ---- */}
      <div className="flex flex-col items-center gap-3">
        {follow && !sheetOpen && nearby && !travelling && (
          <button
            onClick={() => tapLocation(nearby.id)}
            className="pointer-events-auto flex min-h-12 items-center gap-2 rounded-full bg-sun px-5 font-bold text-night shadow-lg"
          >
            <DoorIcon size={20} /> Enter {nearby.name}
          </button>
        )}

        <div className="flex w-full items-center justify-between gap-2">
          <button
            onClick={() => setProfileOpen(true)}
            aria-label={`${game.player.nickname}: stats and profile. Energy ${energy}`}
            className="pointer-events-auto relative grid size-[60px] shrink-0 place-items-center rounded-full shadow-lg shadow-black/30"
            style={{ background: `conic-gradient(${energy > 30 ? '#34D399' : '#F87171'} ${energy * 3.6}deg, #3A3F4D 0)` }}
          >
            <span className="grid size-[50px] place-items-center overflow-hidden rounded-full bg-[#2B4558]">
              <Portrait look={presetLook(game.player.characterId)} size={46} />
            </span>
            {warn && <span className="absolute top-0 right-0 size-3.5 rounded-full border-2 border-night bg-red-400" />}
          </button>

          <nav className={`flex h-14 min-w-0 flex-1 items-center justify-between gap-1 rounded-full p-1.5 ${PILL}`} aria-label="Map controls">
            <button onClick={goHome} aria-label="Go home" className="grid h-11 flex-1 place-items-center rounded-full text-muted">
              <HomeIcon />
            </button>
            {showMap &&
              (
                [
                  ['follow', 'Me', UserIcon],
                  ['overview', 'Map', MapIcon],
                ] as const
              ).map(([mode, label, Icon]) => {
                const active = cameraMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setCameraMode(mode)}
                    aria-pressed={active}
                    aria-label={mode === 'follow' ? 'Close-up on me' : 'Whole campus map'}
                    className={`flex h-11 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold ${active ? `${ACTIVE} flex-[1.6]` : 'flex-1 text-muted'}`}
                  >
                    <Icon size={20} />
                    {active && <span>{label}</span>}
                  </button>
                );
              })}
          </nav>

          <button
            onClick={() => openPhone('home')}
            aria-label={`Phone${unread ? `, ${unread} unread messages` : ''}`}
            className={`relative grid size-[60px] shrink-0 place-items-center rounded-full ${PILL}`}
          >
            <MiniPhone />
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
