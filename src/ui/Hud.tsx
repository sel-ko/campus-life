// The floating controls over the map. Top bar: time and date, tiny needs
// meters, the journal, the bag and money. Bottom: your picture (profile),
// Home / Me / Map, and the phone. A toast shows what just happened.
import { useEffect, useRef, useState } from 'react';
import { getPlace } from '../content/places';
import { campusEvent } from '../game/campus';
import { naira } from '../game/format';
import { journal } from '../game/journal';
import { healthLabel } from '../game/needs';
import { clockTime, slotName, weekOf } from '../game/time';
import { SEMESTER_DAYS } from '../game/config';
import type { GameState } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { DoorIcon, MoonIcon, SunIcon, SunriseIcon, SunsetIcon } from './icons';
import { NEED_DEFS, NeedsPanel, InfoStack, TONE_BG, needState } from './lifeUi';
import { PILL } from './theme';
import { todayLabel } from '../game/calendar';
import { placeOpen } from '../game/status';
import { BagSheet, bagItems } from './BagSheet';

const SLOT_ICONS = [SunriseIcon, SunIcon, SunsetIcon, MoonIcon];
/** The needs shown as tiny meters in the top bar (the rest are one tap away). */
const MINI_NEEDS = ['energy', 'hunger', 'hygiene', 'bladder', 'stress'] as const;

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
    <div role="status" className={`pop-in mx-auto max-w-sm rounded-2xl px-3 py-1.5 text-center text-xs ${PILL}`}>
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
        {!inside && <InfoStack game={game} />}
        <Notice />
        <Toast game={game} />
      </div>

      <div className="flex flex-col items-center gap-3">
        {follow && !inside && nearby?.enterable && !walking && (
          placeOpen(game, nearby.id).open ? (
            <button onClick={() => tapPlace(nearby.id, true)} className="pop-in pointer-events-auto flex min-h-11 max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full bg-sun px-4 text-sm font-bold text-night shadow-lg">
              <DoorIcon size={20} /> Enter {nearby.name}
            </button>
          ) : (
            <p className={`flex min-h-11 max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full px-4 text-xs font-semibold ${PILL}`}>
              🔒 {nearby.name}: {placeOpen(game, nearby.id).reason}
            </p>
          )
        )}
        {/* The bottom bar lives in BottomBar.tsx so it shows in rooms too. */}
        <div className="h-[52px]" />
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
  const [bagOpen, setBagOpen] = useState(false);
  const bagCount = bagItems(game).reduce((n, i) => n + i.count, 0);
  const openPhone = useGameStore((s) => s.openPhone);
  const setJournalOpen = useGameStore((s) => s.setJournalOpen);
  const wait = useGameStore((s) => s.wait);
  const SlotIcon = SLOT_ICONS[game.clock.slot]!;
  const tasks = journal(game);
  const urgent = tasks.filter((t) => t.urgent).length;
  const week = campusEvent(game);
  const anyBad = MINI_NEEDS.some((k) => needState(game, k).tone === 'bad');
  const b = Math.round(game.phone.battery);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[25] flex flex-col gap-2 px-2 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-3">
      <div className="mx-auto flex h-11 w-full max-w-[560px] items-center gap-1">
        {/* Time and date: tap for your needs and to let time pass. */}
        <button
          onClick={() => setStatsOpen((o) => !o)}
          aria-expanded={statsOpen}
          className={`flex h-10 min-w-0 flex-1 items-center gap-1 rounded-full pr-2 pl-2 text-left ${PILL}`}
          aria-label={`${clockTime(game.clock)}, ${todayLabel(game)}, day ${game.clock.day} of ${SEMESTER_DAYS}. Show your needs`}
        >
          <SlotIcon size={16} className="shrink-0 text-sun" />
          <span className="flex min-w-0 flex-col leading-none">
            <span className="truncate text-[13px] font-bold">{clockTime(game.clock)}</span>
            <span className="truncate text-[10px] text-muted">
              {todayLabel(game)}
            </span>
          </span>
        </button>

        {/* Key needs as tiny meters: a tall red bar means trouble. */}
        <button
          onClick={() => setStatsOpen((o) => !o)}
          aria-expanded={statsOpen}
          aria-label={`Needs: ${MINI_NEEDS.map((k) => `${k} ${needState(game, k).word}`).join(', ')}. Tap for details`}
          className={`relative flex h-10 shrink-0 items-end gap-[2px] rounded-full px-2 pb-1.5 ${PILL}`}
        >
          {MINI_NEEDS.map((k) => {
            const def = NEED_DEFS.find((n) => n.key === k)!;
            const s = needState(game, k);
            return (
              <span key={k} className="flex w-[10px] flex-col items-center gap-px">
                <span className="text-[8px] leading-none" aria-hidden="true">
                  {def.icon}
                </span>
                <span className="relative h-[18px] w-[6px] overflow-hidden rounded-full bg-white/12">
                  <span className={`absolute inset-x-0 bottom-0 rounded-full transition-[height] duration-500 ${TONE_BG[s.tone]} ${s.tone === 'bad' ? 'animate-pulse' : ''}`} style={{ height: `${Math.max(8, s.value)}%` }} />
                </span>
              </span>
            );
          })}
          {(anyBad || game.ill) && <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[#16181F] bg-red-400" />}
        </button>

        <button onClick={() => setJournalOpen(true)} className={`relative grid size-10 shrink-0 place-items-center rounded-full ${PILL}`} aria-label={`Journal: ${tasks.length} tasks${urgent ? `, ${urgent} urgent` : ''}`}>
          <span aria-hidden="true">📓</span>
          {tasks.length > 0 && (
            <span className={`absolute -top-1 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold ${urgent ? 'bg-red-500 text-white' : 'bg-white/90 text-night'}`}>{urgent || tasks.length}</span>
          )}
        </button>

        <button onClick={() => setBagOpen(true)} className={`relative grid size-10 shrink-0 place-items-center rounded-full ${PILL}`} aria-label={`School bag: ${bagCount} things`}>
          <span aria-hidden="true">🎒</span>
          {bagCount > 0 && <span className="absolute -top-1 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-sun px-1 text-[10px] font-bold text-night">{bagCount > 99 ? '99+' : bagCount}</span>}
        </button>

        <button
          onClick={() => openPhone('wallet')}
          className={`flex h-10 max-w-[7rem] shrink-0 items-center rounded-full px-2 text-[13px] font-extrabold ${game.money < 1500 ? 'text-red-300' : 'text-sun'} ${PILL}`}
          aria-label={`Money ${naira(game.money)}. Open wallet`}
        >
          <span className="truncate">{naira(game.money)}</span>
        </button>
      </div>

      {statsOpen && <div className="pointer-events-auto fixed inset-0" onClick={() => setStatsOpen(false)} aria-hidden="true" />}
      {statsOpen && (
        <div className={`pop-in relative mx-auto flex max-h-[calc(100dvh-9rem)] w-full max-w-sm flex-col gap-2 overflow-y-auto overscroll-contain rounded-3xl p-3 ${PILL}`}>
          <p className="flex flex-wrap items-baseline justify-between gap-x-2 text-xs font-semibold">
            <span>
              {game.academics.level}00 level · {game.clock.semester === 1 ? 'first' : 'second'} semester
            </span>
            <span className="text-muted">
              Day {game.clock.day}/{SEMESTER_DAYS} · week {weekOf(game.clock.day)}
            </span>
          </p>
          <NeedsPanel game={game} />
          <p className="text-[11px] text-muted">
            Health: <b className="text-ink">{healthLabel(game)}</b> · 🔋 <b className={b <= 15 ? 'text-red-300' : 'text-ink'}>{b <= 0 ? 'dead' : `${b}%`}</b> · 📶{' '}
            <b className={game.phone.data <= 100 ? 'text-red-300' : 'text-ink'}>{game.phone.data >= 1000 ? `${(game.phone.data / 1000).toFixed(1)} GB` : `${Math.round(game.phone.data)} MB`}</b>
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
            className="min-h-10 shrink-0 rounded-xl border border-white/20 text-sm font-semibold"
          >
            Let the {slotName(game.clock).toLowerCase()} pass
          </button>
        </div>
      )}
      {bagOpen && <BagSheet game={game} onClose={() => setBagOpen(false)} />}
    </div>
  );
}

/** A short message such as "Senate Building: Closed. Opens tomorrow at 7:00 am". */
function Notice() {
  const notice = useGameStore((s) => s.notice);
  const setNotice = useGameStore((s) => s.setNotice);
  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(id);
  }, [notice, setNotice]);
  if (!notice) return null;
  return (
    <div role="status" className={`pop-in mx-auto max-w-sm rounded-2xl px-3 py-1.5 text-center text-xs font-semibold ${PILL}`}>
      🔒 {notice}
    </div>
  );
}
