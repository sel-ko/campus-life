// Inside a building: the room fills the screen and you walk around in it.
// Walk up to (or tap) something with a marker and an activity card shows
// what you can do with it, with its price, how long it takes and what it does
// to you. Pick one and your character walks over and does it in front of you
// (sleeps in the bed, bathes, sits down to write) while a timer runs; then
// the result floats up. Everything comes from the interaction API
// (src/game/interactions.ts). Without 3D, or from "All actions", the same
// interactions are shown as a list.
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { getPerson } from '../content/people';
import { getPlace, sectionName } from '../content/places';
import { naira } from '../game/format';
import { getInteractions, getOccupants, isOwnRoom, officesAt, type Interaction, type InteractionKind, type TargetType } from '../game/interactions';
import { crowdLevel, placeEmoji, placeStatus } from '../game/status';
import { slotName } from '../game/time';
import type { GameState } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { useSettings } from '../store/settingsStore';
import type { Pose } from '../world/characters/Character';
import type { Activity } from '../world/interior/InteriorScene';
import { roomLayout, type Target } from '../world/interior/layouts';
import { SHOP_ITEMS } from '../content/food';
import { useNow } from './clock';
import { ErrorBoundary } from './ErrorBoundary';
import { BackIcon } from './icons';
import { FloatingJoystick, useJoystickHandlers } from './Joystick';
import { DayPlanView, EffectChips, NeedsPanel, NeedsStrip, QuestChip, StatusPill } from './lifeUi';
import { usePageVisible } from './usePageVisible';
import { hasWebGL } from './webgl';
import { SHEET } from './theme';

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
  shower: 'Bathroom',
  toilet: 'Toilet',
  person: 'Person',
};

/** How your body looks while doing each kind of thing. */
const POSES: Partial<Record<InteractionKind, Pose>> = {
  sleep: 'lie',
  nap: 'lie',
  bath: 'bathe',
  toilet: 'sit',
  attend: 'write',
  test: 'write',
  exam: 'write',
  orientation: 'sit',
  read: 'read',
  assignment: 'write',
  project: 'write',
  eat: 'eat',
  cook: 'cook',
  wash_plates: 'cook',
  hustle: 'type',
  exercise: 'jog',
  party: 'dance',
  vip: 'cheer',
  owambe: 'dance',
  chill: 'sit',
  movie: 'sit',
  hangout: 'chat',
  talk: 'chat',
  favour: 'chat',
  campaign: 'chat',
  office: 'chat',
  wait: 'sit',
  treat: 'lie',
};

/** What the screen says while you do it. */
const DOING: Partial<Record<InteractionKind, string>> = {
  sleep: 'Sleeping',
  nap: 'Napping',
  bath: 'Bathing',
  toilet: 'In the toilet',
  attend: 'In class',
  test: 'Writing the test',
  exam: 'Writing the exam',
  orientation: 'Listening',
  read: 'Reading',
  assignment: 'Doing the assignment',
  project: 'Writing',
  eat: 'Eating',
  cook: 'Cooking',
  wash_plates: 'Washing plates',
  hustle: 'Working',
  exercise: 'Running laps',
  party: 'Dancing',
  vip: 'Popping bottles',
  owambe: 'Dancing',
  chill: 'Chilling',
  movie: 'Watching the film',
  hangout: 'Gisting',
  talk: 'Talking',
  favour: 'Asking',
  office: 'At the desk',
  wait: 'Waiting',
  treat: 'With the doctor',
};

function durationMs(i: Interaction): number {
  if (i.kind === 'sleep') return 5200;
  if (i.kind === 'nap' || i.kind === 'exam' || i.kind === 'test') return 4200;
  if (i.cost?.slots) return 3400;
  return i.kind === 'buy' || i.kind === 'levy' ? 1200 : 2200;
}

function timeText(i: Interaction): string {
  if (i.kind === 'sleep') return '⏱ Till morning';
  const s = i.cost?.slots ?? 0;
  return s ? `⏱ ${s === 1 ? 'The whole slot' : `${s} slots`}` : '⏱ Quick';
}

function ActionRow({ i, onDo }: { i: Interaction; onDo: (i: Interaction) => void }) {
  return (
    <li className={`rounded-2xl border border-white/10 bg-white/6 p-2.5 ${i.available ? '' : 'opacity-60'}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="leading-tight font-semibold">{i.label}</p>
          {i.detail && <p className="text-xs text-muted">{i.detail}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold">{timeText(i)}</span>
            {i.cost?.money ? <span className="rounded-full bg-sun/20 px-2 py-0.5 text-[11px] font-bold text-sun">{naira(i.cost.money)}</span> : null}
            <EffectChips effects={i.effects} />
          </div>
          {!i.available && i.reason && <p className="mt-1 text-xs font-semibold text-red-300">{i.reason}</p>}
        </div>
        <button onClick={() => onDo(i)} disabled={!i.available} className="min-h-10 shrink-0 rounded-xl bg-sun px-3 text-sm font-bold text-night disabled:bg-white/10 disabled:text-muted">
          {i.kind === 'buy' || i.kind === 'eat' ? 'Buy' : 'Do it'}
        </button>
      </div>
    </li>
  );
}

function matches(i: Interaction, t: Target): boolean {
  if (t.type === 'person') return i.target.type === 'person' && i.target.id === t.id;
  return i.target.type === t.type && (!t.id || !i.target.id || i.target.id === t.id);
}

function Locker({ game }: { game: GameState }) {
  const items = Object.entries(game.inventory).filter(([k, n]) => n > 0 && k !== 'car');
  return (
    <p className="text-xs text-muted">
      In your wardrobe: {items.length ? items.map(([k, n]) => `${SHOP_ITEMS[k]?.name.replace(/ \(.*\)/, '') ?? k} ×${n}`).join(' · ') : 'nothing yet'} ·{' '}
      {game.room.padlock ? '🔒 padlocked' : '🔓 no padlock'} · {game.room.light ? '💡 light on' : 'no light'} · {game.room.water ? '🚿 water running' : 'no water'}
    </p>
  );
}

interface Doing {
  i: Interaction;
  activity: Activity;
  /** performance.now() when the doing started (after walking there). */
  startedAt: number | null;
  ms: number;
}

interface Float {
  key: number;
  lines: string[];
  text: string;
}

/** What changed, as short lines: "+30 Energy", "-₦500". */
function diff(before: GameState, after: GameState): string[] {
  const out: string[] = [];
  const n = (k: keyof GameState['needs'], label: string, invert = false) => {
    const d = Math.round((after.needs[k] ?? 0) - (before.needs[k] ?? 0));
    if (Math.abs(d) >= 2) out.push(`${(invert ? -d : d) > 0 ? '+' : '-'}${Math.abs(d)} ${label}`);
  };
  n('energy', 'Energy');
  n('hunger', 'Fullness', true);
  n('hygiene', 'Hygiene');
  n('bladder', 'Relief', true);
  n('stress', 'Calm', true);
  n('health', 'Health');
  const m = after.money - before.money;
  if (m) out.push(`${m > 0 ? '+' : '-'}${naira(Math.abs(m))}`);
  return out.slice(0, 4);
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
  const [showNeeds, setShowNeeds] = useState(false);
  const [doing, setDoing] = useState<Doing | null>(null);
  const [float, setFloat] = useState<Float | null>(null);
  const [progress, setProgress] = useState(0);
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
    setDoing(null);
  }, [placeId]);

  const doingRef = useRef(doing);
  doingRef.current = doing;

  function finish() {
    const d = doingRef.current;
    if (!d) return;
    doingRef.current = null;
    const before = useGameStore.getState().game;
    if (d.i.kind === 'wait') wait();
    else perform(d.i.id);
    const after = useGameStore.getState().game;
    setDoing(null);
    setSelected(null);
    setProgress(0);
    if (before && after && after !== before) {
      const last = after.log[after.log.length - 1];
      setFloat({ key: Date.now(), lines: diff(before, after), text: after.log.length !== before.log.length ? (last?.text ?? '') : '' });
    }
  }

  // The timer while you do something; then the rules run.
  useEffect(() => {
    if (!doing?.startedAt) return;
    let raf = 0;
    const tick = () => {
      const d = doingRef.current;
      if (!d?.startedAt) return;
      const p = Math.min(1, (performance.now() - d.startedAt) / d.ms);
      setProgress(p);
      if (p >= 1) finish();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doing?.startedAt]);

  const eventOpen = game.pendingEvent !== null;
  const can3d = hasWebGL();
  const handlers = useJoystickHandlers(!!place && can3d && !eventOpen && !showAll);
  if (!place || !placeId || !layout) return null;

  function start(i: Interaction) {
    setShowAll(false);
    if (!can3d) {
      if (i.kind === 'wait') wait();
      else perform(i.id);
      setSelected(null);
      return;
    }
    setFloat(null);
    setProgress(0);
    setDoing({ i, activity: { target: i.target, pose: POSES[i.kind] ?? 'stand', stage: 'walk' }, startedAt: null, ms: durationMs(i) });
  }

  const focus = doing ? null : (selected ?? near);
  const focusList = focus ? interactions.filter((i) => matches(i, focus)) : [];
  const ownRoom = isOwnRoom(game, placeId);
  const showTimetable = !!focus && focus.type === 'board' && ownRoom;
  const focusName = focus
    ? focus.type === 'person'
      ? (getPerson(focus.id ?? '')?.name ?? 'Someone')
      : focus.type === 'lecturer'
        ? (occupants.find((o) => o.spot.type === 'lecturer')?.name ?? 'Lectern')
        : focus.type === 'desk' && focus.id && place.type === 'admin_office'
          ? (interactions.find((i) => i.target.id === focus.id)?.label.split(': ').pop() ?? 'Desk')
          : showTimetable
            ? 'Your timetable'
            : focus.type === 'desk' && !ownRoom
              ? 'Desk'
              : TARGET_NAMES[focus.type]
    : '';
  const status = placeStatus(game, placeId);
  const night = game.clock.slot === 3;
  const time = now.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' });
  const sleeping = !!doing?.startedAt && (doing.i.kind === 'sleep' || doing.i.kind === 'nap');
  const person = focus?.type === 'person' ? getPerson(focus.id ?? '') : undefined;

  return (
    <div className="fixed inset-0 z-20 bg-[#CFE8F2]">
      {can3d ? (
        <div className="absolute inset-0" {...handlers}>
          <ErrorBoundary fallback={<p className="p-6 pt-24 text-sm text-night">The room could not load. Use "All actions".</p>}>
            <Suspense fallback={<p className="p-6 pt-24 text-sm text-night">Setting up the room…</p>}>
              <InteriorScene
                layout={layout}
                interactions={interactions}
                occupants={occupants}
                characterId={game.player.characterId}
                selected={selected}
                onSelect={(t) => !doingRef.current && setSelected(t)}
                onNear={setNear}
                activity={doing?.activity ?? null}
                onArrive={() => setDoing((d) => (d && !d.startedAt ? { ...d, activity: { ...d.activity, stage: 'act' }, startedAt: performance.now() } : d))}
                onCancel={() => setDoing((d) => (d && d.startedAt === null ? null : d))}
                crowd={crowdLevel(game, placeId)}
                paused={!visible || eventOpen}
                quality={quality}
                night={night}
              />
            </Suspense>
          </ErrorBoundary>
        </div>
      ) : (
        <div className="absolute inset-0 overflow-y-auto bg-[#0E161E] px-3 pt-28 pb-8">
          <ul className="mx-auto flex max-w-md flex-col gap-1.5">
            {interactions.map((i) => (
              <ActionRow key={i.id} i={i} onDo={start} />
            ))}
          </ul>
        </div>
      )}

      {/* Night falls while you sleep. */}
      <div className={`pointer-events-none absolute inset-0 bg-[#060B18] transition-opacity duration-[2500ms] ${sleeping ? 'opacity-70' : 'opacity-0'}`} />

      {/* Top: back, the place and what is happening, your status. */}
      <header className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-2 px-3 pt-[max(0.6rem,env(safe-area-inset-top))]">
        <div className="flex items-start gap-2">
          <button onClick={leave} disabled={!!doing?.startedAt} className="pointer-events-auto grid size-10 shrink-0 place-items-center rounded-full bg-black/60 text-white disabled:opacity-40" aria-label="Leave the building">
            <BackIcon />
          </button>
          <div className="min-w-0 flex-1 rounded-2xl bg-black/55 px-3 py-1.5 text-white">
            <p className="truncate text-sm font-bold">
              {placeEmoji(game, placeId)} {place.name}
            </p>
            <p className="truncate text-[11px] text-white/80">
              <span className={`mr-1 inline-block size-1.5 rounded-full align-middle ${status.tone === 'live' ? 'bg-red-400' : status.tone === 'open' ? 'bg-emerald-400' : status.tone === 'closed' ? 'bg-zinc-400' : 'bg-sky-300'}`} />
              {status.text || sectionName(place.sectionId)} · day {game.clock.day}, {slotName(game.clock).toLowerCase()}
            </p>
          </div>
          <StatusPill game={game} time={time} onClick={() => setShowNeeds((o) => !o)} />
        </div>
        <div className="flex items-start justify-between gap-2">
          <QuestChip game={game} />
          <div className="pointer-events-auto flex shrink-0 flex-col items-end gap-1.5">
            <button onClick={() => setShowNeeds((o) => !o)} aria-label="Your needs" aria-expanded={showNeeds}>
              <NeedsStrip game={game} />
            </button>
            <div className="flex gap-1.5">
              <button onClick={() => setJournalOpen(true)} className="grid size-10 place-items-center rounded-full bg-black/60" aria-label="Journal">
                📓
              </button>
              <button onClick={() => openPhone('home')} className="grid size-10 place-items-center rounded-full bg-black/60" aria-label="Phone">
                📱
              </button>
              <button onClick={() => setShowAll(true)} className="h-10 rounded-full bg-black/60 px-3 text-sm font-semibold text-white" aria-label="All actions">
                ⋯
              </button>
            </div>
          </div>
        </div>
        {showNeeds && (
          <div className="pointer-events-auto mx-auto w-full max-w-sm rounded-3xl border border-white/10 bg-[#14202B]/95 p-3">
            <NeedsPanel game={game} />
          </div>
        )}
      </header>

      {can3d && !doing && <FloatingJoystick />}

      {/* What just happened, floating up. */}
      {float && <FloatUp key={float.key} float={float} onDone={() => setFloat(null)} />}

      {/* Bottom: the activity in progress, or what you can do here. */}
      {can3d && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="pointer-events-auto mx-auto max-w-md">
            {doing ? (
              <section className="flex items-center gap-3 rounded-3xl border border-white/10 bg-[#14202B]/95 p-3 shadow-2xl">
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    {doing.startedAt ? `${DOING[doing.i.kind] ?? 'Busy'}…` : 'On my way…'}
                    {sleeping && ' 🌙'}
                  </p>
                  <p className="truncate text-xs text-muted">{doing.i.label}</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-sun" style={{ width: `${Math.round(progress * 100)}%` }} />
                  </div>
                </div>
                {doing.startedAt ? (
                  <button onClick={finish} className="min-h-10 rounded-xl border border-white/20 px-3 text-sm font-semibold">
                    Skip
                  </button>
                ) : (
                  <button onClick={() => setDoing(null)} className="min-h-10 rounded-xl border border-white/20 px-3 text-sm font-semibold">
                    Stop
                  </button>
                )}
              </section>
            ) : focus ? (
              <section className="flex max-h-[42vh] flex-col gap-2 overflow-y-auto rounded-3xl border border-white/10 bg-[#14202B]/95 p-3 shadow-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">
                    {focusName}
                    {person && <span className="ml-2 text-xs font-normal text-muted">{person.role.replace('_', ' ')}</span>}
                  </h3>
                  {selected && (
                    <button onClick={() => setSelected(null)} className="min-h-9 px-2 text-sm text-muted" aria-label="Close">
                      ✕
                    </button>
                  )}
                </div>
                {focus.type === 'locker' && ownRoom && <Locker game={game} />}
                {showTimetable && <DayPlanView game={game} onlyToday />}
                {focusList.length ? (
                  <ul className="flex flex-col gap-1.5">
                    {focusList.map((i) => (
                      <ActionRow key={i.id} i={i} onDo={start} />
                    ))}
                  </ul>
                ) : (
                  !showTimetable && <p className="text-sm text-muted">Nothing to do with this right now.</p>
                )}
                {showTimetable && (
                  <button onClick={() => openPhone('school')} className="min-h-10 rounded-xl border border-white/20 text-sm font-semibold">
                    See the whole fortnight
                  </button>
                )}
              </section>
            ) : (
              <p className="mx-auto w-fit rounded-full bg-black/60 px-4 py-2 text-center text-xs text-white/90">Drag to walk · go up to anything with a ◆, or tap it</p>
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
            <ul className="mt-2 flex flex-col gap-1.5">
              {interactions.map((i) => (
                <ActionRow key={i.id} i={i} onDo={start} />
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}

function FloatUp({ float, onDone }: { float: Float; onDone: () => void }) {
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const id = window.setTimeout(() => done.current(), 4200);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <div className="float-up pointer-events-none absolute inset-x-0 top-[34%] flex flex-col items-center gap-1 px-6">
      <div className="flex flex-wrap justify-center gap-1.5">
        {float.lines.map((l) => (
          <span key={l} className={`rounded-full px-3 py-1 text-sm font-black shadow-lg ${l.startsWith('-') ? 'bg-red-500 text-white' : 'bg-emerald-400 text-night'}`}>
            {l}
          </span>
        ))}
      </div>
      {float.text && <p className="max-w-sm rounded-2xl bg-black/70 px-3 py-1.5 text-center text-sm text-white">{float.text}</p>}
    </div>
  );
}
