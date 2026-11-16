// The floating controls over the map. Top: the real clock with the game day
// and slot, the journal, and money. Bottom: your picture (profile), Home / Me
// / Map, and the phone. A toast shows what just happened.
import { useEffect, useRef, useState } from 'react';
import { getPlace } from '../content/places';
import { campusEvent } from '../game/campus';
import { totalUnread } from '../game/chat';
import { naira } from '../game/format';
import { journal } from '../game/journal';
import { healthLabel } from '../game/needs';
import { dayName, slotName } from '../game/time';
import type { GameState } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { presetLook } from '../world/characters/look';
import { useNow } from './clock';
import { DoorIcon, MapIcon, MoonIcon, SunIcon, SunriseIcon, SunsetIcon, UserIcon } from './icons';
import { Portrait } from './Portrait';
import { NeedsPanel, QuestChip } from './lifeUi';
import { PILL } from './theme';

const ACTIVE = 'bg-[#3A2F5C] text-white';
const SLOT_ICONS = [SunriseIcon, SunIcon, SunsetIcon, MoonIcon];

function Toast({ game }: { game: GameState }) {
  const [text, setText] = useState<string | null>(null);
  const seen = useRef(game.log.length ? game.log[game.log.length - 1]!.text + game.log.length : '');
  useEffect(() => {
    const last = game.log[game.log.length - 1];
    if (!last) return;
    const key = last.text + game.log.length;
    if (key === seen.current) return;
    seen.current = key;
    setText(last.text);
    const id = window.setTimeout(() => setText(null), 4200);
    return () => window.clearTimeout(id);
  }, [game.log]);
  if (!text) return null;
  return (
    <div role="status" className={`mx-auto max-w-sm rounded-2xl px-4 py-2 text-center text-sm ${PILL}`}>
      {text}
    </div>
  );
}

function HomeIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function MiniPhone() {
  return (
    <span className="block h-8 w-5 rotate-[-12deg] rounded-[6px] border-2 border-[#0B0C10] bg-gradient-to-b from-[#7C5CFF] to-[#2C1F66] shadow-md">
      <span className="mx-auto mt-0.5 block h-0.5 w-2 rounded-full bg-black/60" />
    </span>
  );
}

export function Hud({ game, showMap }: { game: GameState; showMap: boolean }) {
  const [statsOpen, setStatsOpen] = useState(false);
  const now = useNow();
  const cameraMode = useGameStore((s) => s.cameraMode);
  const setCameraMode = useGameStore((s) => s.setCameraMode);
  const openPhone = useGameStore((s) => s.openPhone);
  const setProfileOpen = useGameStore((s) => s.setProfileOpen);
  const setJournalOpen = useGameStore((s) => s.setJournalOpen);
  const nearbyId = useGameStore((s) => s.nearbyPlaceId);
  const inside = useGameStore((s) => s.insidePlaceId !== null);
  const walking = useGameStore((s) => s.walkTargetId !== null);
  const tapPlace = useGameStore((s) => s.tapPlace);
  const wait = useGameStore((s) => s.wait);
  const nearby = nearbyId ? getPlace(nearbyId) : undefined;
  const SlotIcon = SLOT_ICONS[game.clock.slot]!;
  const unread = totalUnread(game);
  const tasks = journal(game);
  const urgent = tasks.filter((t) => t.urgent).length;
  const n = game.needs;
  const warn = n.energy <= 20 || n.hunger >= 80 || n.stress >= 80 || n.hygiene <= 20 || n.bladder >= 80 || game.ill;
  const week = campusEvent(game);
  const follow = showMap && cameraMode === 'follow';

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setStatsOpen((o) => !o)}
            aria-expanded={statsOpen}
            className={`flex h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold ${PILL}`}
            aria-label={`${now.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' })}. Day ${game.clock.day}, ${slotName(game.clock)}. Show your needs`}
          >
            <SlotIcon size={18} className="text-sun" />
            <span>{now.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' })}</span>
            <span className="text-xs text-muted">
              {dayName(game.clock.day)} {slotName(game.clock)}
            </span>
          </button>

          <button onClick={() => setJournalOpen(true)} className={`relative flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold ${PILL}`} aria-label={`Journal: ${tasks.length} tasks`}>
            <span aria-hidden="true">📓</span> {tasks.length}
            {urgent > 0 && <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">{urgent}</span>}
          </button>

          <button onClick={() => openPhone('wallet')} className={`flex h-11 items-center rounded-full px-4 text-sm font-bold ${PILL}`} aria-label={`Money ${naira(game.money)}. Open wallet`}>
            {naira(game.money)}
          </button>
        </div>

        {statsOpen && (
          <div className={`mx-auto flex w-full max-w-sm flex-col gap-2 rounded-3xl p-4 ${PILL}`}>
            <p className="text-sm font-semibold">
              {game.academics.level}00 level · semester {game.clock.semester} · day {game.clock.day} of 14 · {slotName(game.clock)}
            </p>
            <NeedsPanel game={game} />
            <p className="text-xs text-muted">
              Health: <b className="text-ink">{healthLabel(game)}</b>
              {game.room.light ? '' : ' · no light in the hostel'}
              {game.room.water ? '' : ' · no water'}
            </p>
            {week && week.id !== 'normal' && (
              <p className="rounded-xl bg-white/8 p-2 text-xs">
                <b>This week on campus: {week.title}.</b> {week.text}
              </p>
            )}
            <button onClick={wait} className="min-h-11 rounded-xl border border-white/20 text-sm font-semibold">
              Let the {slotName(game.clock).toLowerCase()} pass
            </button>
          </div>
        )}
        {!inside && <QuestChip game={game} />}
        <Toast game={game} />
      </div>

      <div className="flex flex-col items-center gap-3">
        {follow && !inside && nearby?.enterable && !walking && (
          <button onClick={() => tapPlace(nearby.id, true)} className="pointer-events-auto flex min-h-12 items-center gap-2 rounded-full bg-sun px-5 font-bold text-night shadow-lg">
            <DoorIcon size={20} /> Enter {nearby.name}
          </button>
        )}
        <div className="flex w-full items-center justify-between gap-2">
          <button
            onClick={() => setProfileOpen(true)}
            aria-label={`${game.player.name}: your profile. Energy ${Math.round(n.energy)}`}
            className="pointer-events-auto relative grid size-[60px] shrink-0 place-items-center rounded-full shadow-lg shadow-black/30"
            style={{ background: `conic-gradient(${n.energy > 30 ? '#34D399' : '#F87171'} ${n.energy * 3.6}deg, #3A3F4D 0)` }}
          >
            <span className="grid size-[50px] place-items-center overflow-hidden rounded-full bg-[#2B4558]">
              <Portrait look={presetLook(game.player.characterId)} size={46} />
            </span>
            {warn && <span className="absolute top-0 right-0 size-3.5 rounded-full border-2 border-night bg-red-400" />}
          </button>

          <nav className={`flex h-14 min-w-0 flex-1 items-center justify-between gap-1 rounded-full p-1.5 ${PILL}`} aria-label="Map controls">
            <button onClick={() => tapPlace(game.room.placeId)} aria-label="Go to your room" className="grid h-11 flex-1 place-items-center rounded-full text-muted">
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

          <button onClick={() => openPhone('home')} aria-label={`Phone${unread ? `, ${unread} unread messages` : ''}`} className={`relative grid size-[60px] shrink-0 place-items-center rounded-full ${PILL}`}>
            <MiniPhone />
            {unread > 0 && <span className="absolute -top-0.5 -right-0.5 grid min-w-6 place-items-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">{unread > 99 ? '99+' : unread}</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
