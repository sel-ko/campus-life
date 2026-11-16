// The floating controls over the map. Top: the real clock with the game day
// and slot, the journal, and money. Bottom: your picture (profile), Home / Me
// / Map, and the phone. A toast shows what just happened.
import { useEffect, useRef, useState } from 'react';
import { getPlace } from '../content/places';
import { campusEvent } from '../game/campus';
import { naira } from '../game/format';
import { journal } from '../game/journal';
import { healthLabel } from '../game/needs';
import { dayName, slotName } from '../game/time';
import type { GameState } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { useNow } from './clock';
import { DoorIcon, MoonIcon, SunIcon, SunriseIcon, SunsetIcon } from './icons';
import { NeedsPanel, QuestChip } from './lifeUi';
import { PILL } from './theme';

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



export function Hud({ game, showMap }: { game: GameState; showMap: boolean }) {
  const cameraMode = useGameStore((s) => s.cameraMode);
  const nearbyId = useGameStore((s) => s.nearbyPlaceId);
  const inside = useGameStore((s) => s.insidePlaceId !== null);
  const walking = useGameStore((s) => s.walkTargetId !== null);
  const tapPlace = useGameStore((s) => s.tapPlace);
  const nearby = nearbyId ? getPlace(nearbyId) : undefined;
  const follow = showMap && cameraMode === 'follow';

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 pt-[calc(max(0.75rem,env(safe-area-inset-top))+3.25rem)] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-col gap-2">
        {!inside && <QuestChip game={game} />}
        <Toast game={game} />
      </div>

      <div className="flex flex-col items-center gap-3">
        {follow && !inside && nearby?.enterable && !walking && (
          <button onClick={() => tapPlace(nearby.id, true)} className="pointer-events-auto flex min-h-12 items-center gap-2 rounded-full bg-sun px-5 font-bold text-night shadow-lg">
            <DoorIcon size={20} /> Enter {nearby.name}
          </button>
        )}
        {/* The bottom bar lives in BottomBar.tsx so it shows in rooms too. */}
        <div className="h-[60px]" />
      </div>
    </div>
  );
}

/**
 * The top bar, always on screen (on the map and inside rooms): the real
 * clock with the game day and part of day (tap for your needs and to let
 * time pass), the journal, and your money (tap for the wallet).
 */
export function TopBar({ game }: { game: GameState }) {
  const [statsOpen, setStatsOpen] = useState(false);
  const now = useNow();
  const openPhone = useGameStore((s) => s.openPhone);
  const setJournalOpen = useGameStore((s) => s.setJournalOpen);
  const wait = useGameStore((s) => s.wait);
  const SlotIcon = SLOT_ICONS[game.clock.slot]!;
  const tasks = journal(game);
  const urgent = tasks.filter((t) => t.urgent).length;
  const week = campusEvent(game);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[25] flex flex-col gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
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

        {statsOpen && <div className="pointer-events-auto fixed inset-0" onClick={() => setStatsOpen(false)} aria-hidden="true" />}
        {statsOpen && (
          <div className={`relative mx-auto flex w-full max-w-sm flex-col gap-2 rounded-3xl p-4 ${PILL}`}>
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
            <button
              onClick={() => {
                setStatsOpen(false);
                wait();
              }}
              className="min-h-11 rounded-xl border border-white/20 text-sm font-semibold">
              Let the {slotName(game.clock).toLowerCase()} pass
            </button>
          </div>
        )}
    </div>
  );
}
