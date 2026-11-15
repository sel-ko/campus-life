// Inside a building. Everything here comes from the interaction API
// (src/game/interactions.ts): what can be done, who is here, the queue, the
// menu. The 3D room on top maps each target (seat, desk, counter, bed...) to
// an object; tapping one filters the list. The list alone is enough to play.
import { lazy, Suspense, useMemo, useState } from 'react';
import { SHOP_ITEMS } from '../content/food';
import { getPlace, sectionName } from '../content/places';
import { naira } from '../game/format';
import { getInteractions, getOccupants, getQueueLength, isOwnRoom, type Interaction, type TargetType } from '../game/interactions';
import { slotName } from '../game/time';
import type { GameState, PlaceType } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { useSettings } from '../store/settingsStore';
import { ErrorBoundary } from './ErrorBoundary';
import { BackIcon } from './icons';
import { usePageVisible } from './usePageVisible';
import { hasWebGL } from './webgl';

const InteriorScene = lazy(() => import('../world/interior/InteriorScene'));

const TYPE_LABEL: Record<PlaceType, string> = {
  lecture_hall: 'Lecture hall',
  admin_office: 'Offices',
  restaurant: 'Food',
  hostel_room: 'Hostel',
  lab: 'Laboratory',
  library: 'Library',
  clinic: 'Clinic',
  shop: 'Shop',
  workplace: 'Workplace',
  residence: 'Residence',
  field: 'Sports',
  busstop: 'Keke park',
  gate: 'Gate',
};

const GROUPS: Array<{ title: string; kinds: Interaction['kind'][] }> = [
  { title: 'Right now', kinds: ['attend', 'test', 'exam', 'orientation'] },
  { title: 'Offices', kinds: ['office', 'debit', 'issue', 'allocation', 'plead', 'supervisor', 'library'] },
  { title: 'Study', kinds: ['read', 'assignment', 'project', 'handout'] },
  { title: 'Food', kinds: ['eat', 'cook', 'wash_plates'] },
  { title: 'Shop', kinds: ['buy'] },
  { title: 'Your room', kinds: ['sleep', 'nap', 'levy', 'errands'] },
  { title: 'Money', kinds: ['hustle', 'setup'] },
  { title: 'Health and fun', kinds: ['treat', 'hangout', 'exercise', 'campaign'] },
  { title: 'People here', kinds: ['talk', 'favour'] },
  { title: 'Other', kinds: ['wait'] },
];

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
        className="flex min-h-12 w-full flex-col items-start rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left enabled:active:bg-white/10 disabled:opacity-50"
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

function Locker({ game }: { game: GameState }) {
  const items = Object.entries(game.inventory).filter(([, n]) => n > 0);
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">
      <h3 className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">Your locker</h3>
      <p>
        {items.length ? items.map(([k, n]) => `${SHOP_ITEMS[k]?.name.replace(/ \(.*\)/, '') ?? k} ×${n}`).join(' · ') : 'Empty. Buy provisions at the market or the provision shop.'}
      </p>
      <p className="mt-1 text-xs text-muted">
        {game.room.padlock ? '🔒 Padlocked' : '🔓 No padlock'} · {game.room.light ? 'Light on' : 'No light'} · {game.room.water ? 'Water running' : 'No water'}
      </p>
    </section>
  );
}

export function InsideScreen({ game }: { game: GameState }) {
  const placeId = useGameStore((s) => s.insidePlaceId);
  const leave = useGameStore((s) => s.leave);
  const perform = useGameStore((s) => s.perform);
  const quality = useSettings((s) => s.quality);
  const visible = usePageVisible();
  const [target, setTarget] = useState<{ type: TargetType; id?: string } | null>(null);
  const [show3d, setShow3d] = useState(true);
  const place = placeId ? getPlace(placeId) : undefined;
  const interactions = useMemo(() => (placeId ? getInteractions(game, placeId) : []), [game, placeId]);
  const occupants = useMemo(() => (placeId ? getOccupants(game, placeId) : []), [game, placeId]);
  if (!place || !placeId) return null;

  const queue = getQueueLength(game, placeId);
  const ownRoom = isOwnRoom(game, placeId);
  const filtered = target ? interactions.filter((i) => i.target.type === target.type && (!target.id || !i.target.id || i.target.id === target.id)) : interactions;
  const can3d = hasWebGL() && show3d;
  const eventOpen = game.pendingEvent !== null;

  function onDo(id: string) {
    perform(id);
    setTarget(null);
  }

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-night">
      <header className="flex items-center gap-2 border-b border-white/10 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
        <button onClick={leave} className="grid min-h-11 min-w-11 place-items-center rounded-full bg-white/10" aria-label="Leave the building">
          <BackIcon />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold">{place.name}</h2>
          <p className="truncate text-xs text-muted">
            {TYPE_LABEL[place.type]} · {sectionName(place.sectionId)} · day {game.clock.day}, {slotName(game.clock).toLowerCase()}
            {queue > 0 ? ` · ${queue} in the queue` : ''}
          </p>
        </div>
        <span className="text-sm font-bold text-sun">{naira(game.money)}</span>
      </header>

      {can3d && (
        <div className="relative h-[38vh] shrink-0 border-b border-white/10 bg-[#0E161E]">
          <ErrorBoundary fallback={<p className="p-4 text-sm text-muted">The 3D room could not load. Use the list below.</p>}>
            <Suspense fallback={<p className="p-4 text-sm text-muted">Setting up the room…</p>}>
              <InteriorScene
                placeType={place.type}
                ownRoom={ownRoom}
                occupants={occupants}
                interactions={interactions}
                characterId={game.player.characterId}
                selected={target}
                onTarget={setTarget}
                paused={!visible || eventOpen}
                quality={quality}
              />
            </Suspense>
          </ErrorBoundary>
          <button onClick={() => setShow3d(false)} className="absolute top-2 right-2 min-h-9 rounded-full bg-black/50 px-3 text-xs font-semibold">
            List only
          </button>
          <p className="pointer-events-none absolute bottom-2 left-3 text-xs text-white/70">Tap an object or a person</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="mx-auto flex max-w-md flex-col gap-4 pb-8">
          {!can3d && hasWebGL() && (
            <button onClick={() => setShow3d(true)} className="self-start text-sm font-semibold text-sun underline">
              Show the 3D room
            </button>
          )}
          {occupants.length > 0 && (
            <section>
              <h3 className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">Here now</h3>
              <div className="flex flex-wrap gap-1.5">
                {occupants.map((o) => (
                  <button
                    key={o.personId}
                    onClick={() => setTarget({ type: 'person', id: o.personId })}
                    className={`min-h-9 rounded-full border px-3 text-sm ${target?.id === o.personId ? 'border-sun text-sun' : 'border-white/15'}`}
                  >
                    {o.name}
                  </button>
                ))}
              </div>
            </section>
          )}

          {target && (
            <button onClick={() => setTarget(null)} className="self-start rounded-full bg-sun/15 px-3 py-1 text-sm font-semibold text-sun">
              Showing: {target.type === 'person' ? occupants.find((o) => o.personId === target.id)?.name : target.type} ✕
            </button>
          )}

          {ownRoom && !target && <Locker game={game} />}

          {GROUPS.map((g) => {
            const items = filtered.filter((i) => g.kinds.includes(i.kind));
            if (!items.length) return null;
            return (
              <section key={g.title}>
                <h3 className="mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">{g.title}</h3>
                <ul className="flex flex-col gap-1.5">
                  {items.map((i) => (
                    <Row key={i.id} i={i} onDo={onDo} />
                  ))}
                </ul>
              </section>
            );
          })}
          {filtered.length === 0 && <p className="text-sm text-muted">Nothing to do with that right now.</p>}
          {place.type === 'hostel_room' && !ownRoom && <p className="text-sm text-muted">This is not your hall. Your room is in {getPlace(game.room.placeId)?.name}.</p>}
        </div>
      </div>
    </div>
  );
}
