// Inside a building: the room fills the screen and you walk around in it.
// Walk up to (or tap) something with a marker and a small card shows what you
// can do with it. Everything comes from the interaction API
// (src/game/interactions.ts). Without 3D, or from "All actions", the same
// interactions are shown as a list.
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { getPerson } from '../content/people';
import { getPlace, sectionName } from '../content/places';
import { naira } from '../game/format';
import { getInteractions, getOccupants, getQueueLength, isOwnRoom, officesAt, type Interaction, type TargetType } from '../game/interactions';
import { slotName } from '../game/time';
import type { GameState } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { useSettings } from '../store/settingsStore';
import { roomLayout, type Target } from '../world/interior/layouts';
import { useNow } from './clock';
import { ErrorBoundary } from './ErrorBoundary';
import { BackIcon } from './icons';
import { FloatingJoystick, useJoystickHandlers } from './Joystick';
import { usePageVisible } from './usePageVisible';
import { hasWebGL } from './webgl';
import { SHEET } from './theme';
import { SHOP_ITEMS } from '../content/food';

const InteriorScene = lazy(() => import('../world/interior/InteriorScene'));

const TARGET_NAMES: Record<TargetType, string> = {
  seat: 'Seats',
  lecturer: 'Lectern',
  desk: 'Desk',
  counter: 'Counter',
  bed: 'Your bed',
  locker: 'Your wardrobe',
  shelf: 'Shelves',
  bench: 'Benches',
  stove: 'Cooking corner',
  board: 'Notice board',
  door: 'Door',
  person: 'Person',
};

function costText(i: Interaction): string {
  const parts: string[] = [];
  if (i.cost?.money) parts.push(naira(i.cost.money));
  if (i.cost?.slots) parts.push(i.cost.slots === 1 ? 'takes the slot' : `${i.cost.slots} slots`);
  return parts.join(' · ');
}

function Row({ i, onDo }: { i: Interaction; onDo: (id: string) => void }) {
  return (
    <li>
      <button
        onClick={() => onDo(i.id)}
        disabled={!i.available}
        className="flex min-h-12 w-full flex-col items-start rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-left enabled:active:bg-white/15 disabled:opacity-50"
      >
        <span className="flex w-full items-baseline justify-between gap-2">
          <span className="font-semibold">{i.label}</span>
          <span className="shrink-0 text-xs text-sun">{costText(i)}</span>
        </span>
        {i.detail && <span className="text-xs text-muted">{i.detail}</span>}
        {!i.available && i.reason && <span className="text-xs font-semibold text-red-300">{i.reason}</span>}
      </button>
    </li>
  );
}

function matches(i: Interaction, t: Target): boolean {
  if (t.type === 'person') return i.target.type === 'person' && i.target.id === t.id;
  return i.target.type === t.type && (!t.id || !i.target.id || i.target.id === t.id);
}

/** Everything at once, grouped (the fallback without 3D, and "All actions"). */
function AllActions({ list, onDo }: { list: Interaction[]; onDo: (id: string) => void }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {list.map((i) => (
        <Row key={i.id} i={i} onDo={onDo} />
      ))}
    </ul>
  );
}

function Locker({ game }: { game: GameState }) {
  const items = Object.entries(game.inventory).filter(([k, n]) => n > 0 && k !== 'car');
  return (
    <p className="text-xs text-muted">
      In your wardrobe: {items.length ? items.map(([k, n]) => `${SHOP_ITEMS[k]?.name.replace(/ \(.*\)/, '') ?? k} ×${n}`).join(' · ') : 'nothing yet'} ·{' '}
      {game.room.padlock ? '🔒 padlocked' : '🔓 no padlock'} · {game.room.light ? 'light on' : 'no light'} · {game.room.water ? 'water running' : 'no water'}
    </p>
  );
}

export function InsideScreen({ game }: { game: GameState }) {
  const placeId = useGameStore((s) => s.insidePlaceId);
  const leave = useGameStore((s) => s.leave);
  const perform = useGameStore((s) => s.perform);
  const wait = useGameStore((s) => s.wait);
  const openPhone = useGameStore((s) => s.openPhone);
  const setJournalOpen = useGameStore((s) => s.setJournalOpen);
  const quality = useSettings((s) => s.quality);
  const visible = usePageVisible();
  const now = useNow();
  const [selected, setSelected] = useState<Target | null>(null);
  const [near, setNear] = useState<Target | null>(null);
  const [showAll, setShowAll] = useState(false);
  const place = placeId ? getPlace(placeId) : undefined;
  const interactions = useMemo(() => (placeId ? getInteractions(game, placeId) : []), [game, placeId]);
  const occupants = useMemo(() => (placeId ? getOccupants(game, placeId) : []), [game, placeId]);
  const layout = useMemo(
    () => (place ? roomLayout(place.type, { venue: place.venue, offices: officesAt(game, place.id) }) : null),
    // The room only changes when you enter another place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [place?.id],
  );
  // A new room starts with nothing selected.
  useEffect(() => {
    setSelected(null);
    setNear(null);
  }, [placeId]);
  const eventOpen = game.pendingEvent !== null;
  const can3d = hasWebGL();
  const handlers = useJoystickHandlers(!!place && can3d && !eventOpen && !showAll);
  if (!place || !placeId || !layout) return null;

  const focus = selected ?? near;
  const focusList = focus ? interactions.filter((i) => matches(i, focus)) : [];
  const focusName = focus
    ? focus.type === 'person'
      ? (getPerson(focus.id ?? '')?.name ?? 'Someone')
      : focus.type === 'lecturer'
        ? (occupants.find((o) => o.spot.type === 'lecturer')?.name ?? 'Lectern')
        : focus.type === 'desk' && focus.id && place.type === 'admin_office'
          ? (interactions.find((i) => i.target.id === focus.id)?.label.split(': ').pop() ?? 'Desk')
          : focus.type === 'desk' && !isOwnRoom(game, placeId)
            ? 'Desk'
            : TARGET_NAMES[focus.type]
    : '';
  const queue = getQueueLength(game, placeId);
  const ownRoom = isOwnRoom(game, placeId);
  const night = now.getHours() < 6 || now.getHours() >= 19;

  function doIt(id: string) {
    perform(id);
    setSelected(null);
  }

  return (
    <div className="fixed inset-0 z-20 bg-[#0E161E]">
      {can3d ? (
        <div className="absolute inset-0" {...handlers}>
          <ErrorBoundary fallback={<p className="p-6 pt-24 text-sm text-muted">The room could not load. Use "All actions".</p>}>
            <Suspense fallback={<p className="p-6 pt-24 text-sm text-muted">Setting up the room…</p>}>
              <InteriorScene
                layout={layout}
                interactions={interactions}
                occupants={occupants}
                characterId={game.player.characterId}
                selected={selected}
                onSelect={setSelected}
                onNear={setNear}
                paused={!visible || eventOpen}
                quality={quality}
                night={night}
              />
            </Suspense>
          </ErrorBoundary>
        </div>
      ) : (
        <div className="absolute inset-0 overflow-y-auto px-3 pt-20 pb-8">
          <div className="mx-auto max-w-md">
            <AllActions list={interactions} onDo={doIt} />
          </div>
        </div>
      )}

      {/* Top bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-2 px-3 pt-[max(0.6rem,env(safe-area-inset-top))]">
        <button onClick={leave} className="pointer-events-auto grid size-11 place-items-center rounded-full bg-black/55 text-white" aria-label="Leave the building">
          <BackIcon />
        </button>
        <div className="min-w-0 flex-1 rounded-2xl bg-black/45 px-3 py-1.5">
          <p className="truncate text-sm font-bold">{place.name}</p>
          <p className="truncate text-[11px] text-white/75">
            {sectionName(place.sectionId)} · day {game.clock.day}, {slotName(game.clock).toLowerCase()}
            {queue > 0 ? ` · ${queue} in the queue` : ''} · {naira(game.money)}
          </p>
        </div>
        <button onClick={() => setJournalOpen(true)} className="pointer-events-auto grid size-11 place-items-center rounded-full bg-black/55" aria-label="Journal">
          📓
        </button>
        <button onClick={() => openPhone('home')} className="pointer-events-auto grid size-11 place-items-center rounded-full bg-black/55" aria-label="Phone">
          📱
        </button>
        <button onClick={() => setShowAll(true)} className="pointer-events-auto h-11 rounded-full bg-black/55 px-3 text-sm font-semibold text-white" aria-label="All actions">
          ⋯
        </button>
      </header>

      {can3d && <FloatingJoystick />}

      {/* What you are standing at */}
      {can3d && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="pointer-events-auto mx-auto max-w-md">
            {focus ? (
              <section className="flex max-h-[32vh] flex-col gap-2 overflow-y-auto rounded-3xl border border-white/10 bg-[#14202B]/95 p-3 shadow-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">{focusName}</h3>
                  {selected && (
                    <button onClick={() => setSelected(null)} className="min-h-9 px-2 text-sm text-muted" aria-label="Close">
                      ✕
                    </button>
                  )}
                </div>
                {focus.type === 'locker' && ownRoom && <Locker game={game} />}
                {focusList.length ? (
                  <ul className="flex flex-col gap-1.5">
                    {focusList.map((i) => (
                      <Row key={i.id} i={i} onDo={doIt} />
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">Nothing to do with this right now.</p>
                )}
              </section>
            ) : (
              <p className="mx-auto w-fit rounded-full bg-black/55 px-4 py-2 text-center text-xs text-white/85">
                Drag to walk · go up to anything with a ◆ marker, or tap it
              </p>
            )}
          </div>
        </div>
      )}

      {showAll && (
        <div className="fixed inset-0 z-30 bg-black/45" onClick={() => setShowAll(false)}>
          <section className={SHEET} onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-bold">Everything here</h2>
              <button onClick={() => setShowAll(false)} className="min-h-11 px-3 text-sm text-muted">
                Close
              </button>
            </div>
            {ownRoom && <Locker game={game} />}
            <div className="mt-2">
              <AllActions
                list={interactions.filter((i) => i.kind !== 'wait')}
                onDo={(id) => {
                  setShowAll(false);
                  doIt(id);
                }}
              />
            </div>
            <button
              onClick={() => {
                setShowAll(false);
                wait();
              }}
              className="mt-3 min-h-11 w-full rounded-xl border border-white/20 font-semibold"
            >
              Wait here (let the {slotName(game.clock).toLowerCase()} pass)
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
