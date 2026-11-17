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
import { QUICK_MINUTES, actionMinutes, getInteractions, getOccupants, getQueueLength, isOwnRoom, officesAt, type Interaction, type InteractionKind, type TargetType } from '../game/interactions';
import { crowdLevel, placeEmoji, placeStatus } from '../game/status';
import { todayLabel } from '../game/calendar';
import { moodOf } from '../game/needs';
import { nextStep } from '../game/story';
import { SLOT_START, clockMin, formatDuration, formatTime } from '../game/time';
import type { GameState } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { useSettings } from '../store/settingsStore';
import type { Pose } from '../world/characters/Character';
import type { Activity } from '../world/interior/InteriorScene';
import { roomLayout, type Target } from '../world/interior/layouts';
import { SHOP_ITEMS } from '../content/food';
import { ErrorBoundary } from './ErrorBoundary';
import { FloatingJoystick, useJoystickHandlers } from './Joystick';
import { EffectChips, InfoStack, TodayClasses } from './lifeUi';
import { usePageVisible } from './usePageVisible';
import { hasWebGL } from './webgl';
import { SHEET } from './theme';
import { BOTTOM_BAR_SPACE } from './BottomBar';

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
  copier: 'Photocopier',
  camera: 'Passport photos',
  printer: 'Printing',
  charger: 'Charging station',
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
  charge: 'read',
  wait_open: 'sit',
  exam_form: 'chat',
};

/** Business-centre stations have their own icons. */
const EMOJI_AT: Partial<Record<TargetType, string>> = { copier: '📠', camera: '📸', printer: '🖨️', charger: '🔌' };

/** At the business centre the station says what is happening. */
const DOING_AT: Partial<Record<TargetType, string>> = { copier: 'Making photocopies', camera: 'Smile! Taking passport photos', printer: 'Printing', charger: 'Charging your phone' };

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
  charge: 'Charging your phone',
  wait_open: 'Waiting for 8:00',
  exam_form: 'Signing the exam form',
  buy: 'Paying',
};

/** How long the animation runs: longer things look longer. */
function durationMs(i: Interaction): number {
  if (i.kind === 'sleep') return 5200;
  if (i.kind === 'nap' || i.kind === 'exam' || i.kind === 'test') return 4200;
  if (i.cost?.slots) return 3600;
  return Math.min(3400, 900 + (QUICK_MINUTES[i.kind] ?? 10) * 45);
}


const EMOJI: Partial<Record<InteractionKind, string>> = {
  attend: '📘',
  test: '✏️',
  exam: '📝',
  orientation: '🎤',
  read: '📖',
  assignment: '✍️',
  handout: '📄',
  project: '📑',
  supervisor: '👨🏾‍🏫',
  plead: '🙏🏾',
  office: '🗂️',
  debit: '🧾',
  issue: '⚠️',
  allocation: '🔑',
  library: '🪪',
  eat: '🍲',
  buy: '🛒',
  wash_plates: '🍽️',
  errands: '🏃🏾',
  sleep: '🛏️',
  nap: '😴',
  cook: '🍳',
  levy: '💸',
  hustle: '💼',
  setup: '🛠️',
  treat: '🩺',
  talk: '💬',
  favour: '🤝🏾',
  hangout: '🗣️',
  exercise: '🏃🏾',
  campaign: '📣',
  party: '🪩',
  vip: '🍾',
  chill: '🍹',
  movie: '🎬',
  owambe: '🎊',
  bank_loan: '🏦',
  bath: '🧼',
  toilet: '🚽',
  charge: '🔌',
  wait_open: '⏳',
  exam_form: '✍🏾',
  wait: '⏳',
};

/** Only these keep their extra line; for the rest the chips say it all. */
const KEEP_DETAIL: InteractionKind[] = ['hustle', 'setup', 'project', 'handout', 'plead', 'library'];

/** People queue at these. */
const QUEUED: InteractionKind[] = ['office', 'debit', 'issue', 'allocation', 'plead', 'treat', 'library', 'exam_form'];

/** About six minutes a person in the queue. */
const queueText = (n: number) => (n > 0 ? `⏳ ${n} ahead · ~${Math.max(5, n * 6)} min` : '');

/** How long it takes, on the game clock: "20 min", or "2 hrs 40 min · till 12:00 pm". */
function timeLabel(game: GameState, i: Interaction): string {
  if (i.kind === 'sleep') return `Till ${formatTime(SLOT_START[0]!)}`;
  const m = actionMinutes(game, i);
  if (i.cost?.slots) return `${formatDuration(m)} · till ${formatTime(clockMin(game.clock) + m)}`;
  return formatDuration(m);
}

function ActionRow({ i, onDo, queue = 0, time }: { i: Interaction; onDo: (i: Interaction) => void; queue?: number; time: string }) {
  const q = QUEUED.includes(i.kind) ? queueText(queue) : '';
  const [n, setN] = useState(2);
  const pay = i.label.startsWith('Pay');
  const total = i.qty ? i.qty.unit * n : i.cost?.money;
  const go = () => onDo(i.qty ? { ...i, id: `${i.id}:${n}`, cost: { ...i.cost, money: total } } : i);
  return (
    <li className={`rounded-xl border border-white/10 bg-white/6 p-2 ${i.available ? '' : 'opacity-60'}`}>
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-xl" aria-hidden="true">
          {EMOJI_AT[i.target.type] ?? EMOJI[i.kind] ?? '•'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-tight font-semibold">{i.label.replace(/^Get your clearance form signed: /, 'Clearance: ')}</p>
          {i.detail && KEEP_DETAIL.includes(i.kind) && <p className="text-xs text-muted">{i.detail}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold">⏱ {time}</span>
            {q && <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-semibold text-amber-200">{q}</span>}
            {total ? <span className="rounded-full bg-sun/20 px-2 py-0.5 text-[11px] font-bold text-sun">{naira(total)}{i.qty ? ` · ${naira(i.qty.unit)} each` : ''}</span> : null}
            <EffectChips effects={i.effects} />
          </div>
          {!i.available && i.reason && <p className="mt-1 text-xs font-semibold text-red-300">{i.reason}</p>}
        </div>
        {i.qty && (
          <span className="flex shrink-0 items-center gap-0.5 rounded-xl bg-white/8 p-0.5" aria-label="How many">
            <button onClick={() => setN((x) => Math.max(1, x - 1))} className="grid size-8 place-items-center rounded-lg bg-white/10 font-bold" aria-label="One fewer">
              −
            </button>
            <input
              type="number"
              min={1}
              max={i.qty.max}
              value={n}
              onChange={(e) => setN(Math.max(1, Math.min(i.qty!.max, Number(e.target.value) || 1)))}
              className="w-8 bg-transparent text-center text-sm font-bold [appearance:textfield]"
              aria-label="Number of copies"
            />
            <button onClick={() => setN((x) => Math.min(i.qty!.max, x + 1))} className="grid size-8 place-items-center rounded-lg bg-white/10 font-bold" aria-label="One more">
              +
            </button>
          </span>
        )}
        <button onClick={go} disabled={!i.available} className="min-h-10 shrink-0 rounded-xl bg-sun px-2.5 text-sm font-bold text-night disabled:bg-white/10 disabled:text-muted">
          {pay ? 'Pay' : i.kind === 'buy' || i.kind === 'eat' ? 'Buy' : 'Do it'}
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

/** Your room's state at a glance: water, light, padlock, and any levy owed. */
function RoomCondition({ game }: { game: GameState }) {
  const r = game.room;
  const items: Array<[string, string, boolean]> = [
    ['💧', r.water ? 'Water running' : 'No water', r.water],
    ['💡', r.light ? 'Light on' : 'No light (NEPA)', r.light],
    [r.padlock ? '🔒' : '🔓', r.padlock ? 'Padlocked' : 'No padlock', r.padlock],
  ];
  if (r.levy) items.push(['💸', `Levy owed: ${naira(r.levy)}`, false]);
  return (
    <div className="flex flex-col gap-1" aria-label="Room condition">
      {items.map(([icon, label, good]) => (
        <span key={label} title={label} aria-label={label} className={`relative grid size-9 place-items-center rounded-full text-base ${good ? 'bg-black/55' : 'bg-red-500/70'}`}>
          {icon}
          {!good && icon !== '💸' && <span className="absolute inset-x-1.5 top-1/2 h-0.5 -rotate-45 rounded bg-white/90" />}
        </span>
      ))}
    </div>
  );
}

interface Doing {
  i: Interaction;
  activity: Activity;
  /** Waiting in the queue first (on the benches), with this many people ahead. */
  queue?: number;
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
  const perform = useGameStore((s) => s.perform);
  const leave = useGameStore((s) => s.leave);
  const wait = useGameStore((s) => s.wait);
  const openPhone = useGameStore((s) => s.openPhone);
  const quality = useSettings((s) => s.quality);
  const visible = usePageVisible();
  const [selected, setSelected] = useState<Target | null>(null);
  const [near, setNear] = useState<Target | null>(null);
  // After doing something, its card stays closed until you walk to something else.
  const [dismissed, setDismissed] = useState<Target | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [doing, setDoing] = useState<Doing | null>(null);
  const [float, setFloat] = useState<Float | null>(null);
  const [progress, setProgress] = useState(0);
  // Before you sleep: a look back at the day (then sleep).
  const [recap, setRecap] = useState<Interaction | null>(null);
  const place = placeId ? getPlace(placeId) : undefined;
  const interactions = useMemo(() => (placeId ? getInteractions(game, placeId) : []), [game, placeId]);
  const occupants = useMemo(() => (placeId ? getOccupants(game, placeId) : []), [game, placeId]);
  // Your decorations show in your own room.
  const decorKey = placeId && game.room.placeId === placeId ? ['poster', 'plant', 'fairy_lights', 'duvet', 'rug_decor'].filter((k) => (game.inventory[k] ?? 0) > 0).join(',') : '';
  const layout = useMemo(
    () => (place ? roomLayout(place.type, { venue: place.venue, offices: officesAt(game, place.id), business: !!place.stock?.includes('photocopy'), decor: decorKey ? decorKey.split(',') : [] }) : null),
    // The room only changes when you enter another place (or decorate yours).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [place?.id, decorKey],
  );
  // A new room starts with nothing selected.
  useEffect(() => {
    setSelected(null);
    setNear(null);
    setDoing(null);
  }, [placeId]);

  const doingRef = useRef(doing);
  doingRef.current = doing;
  const nearRef = useRef(near);
  nearRef.current = near;

  function finish() {
    const d = doingRef.current;
    if (!d) return;
    doingRef.current = null;
    const before = useGameStore.getState().game;
    // Things change while you queue (the office closes at 4): say so instead of silently doing nothing.
    const now = before && placeId ? getInteractions(before, placeId).find((x) => x.id === d.i.id || d.i.id.startsWith(`${x.id}:`)) : undefined;
    setDoing(null);
    setSelected(null);
    setDismissed(d.i.target);
    setProgress(0);
    if (d.i.kind !== 'wait' && (!now || !now.available)) {
      setFloat({ key: Date.now(), lines: ['❌ Not done'], text: now?.reason ?? 'That is not possible any more.' });
      return;
    }
    if (d.i.kind === 'wait') wait();
    else perform(d.i.id);
    const after = useGameStore.getState().game;
    if (before && after && after !== before) {
      const last = after.log[after.log.length - 1];
      const office = d.i.kind === 'office' ? (d.i.target.id as keyof typeof after.clearance.signed) : null;
      const failed = office && !after.clearance.signed[office] ? ['❌ Not signed'] : office ? ['✅ Signed'] : [];
      setFloat({ key: Date.now(), lines: [...failed, ...diff(before, after)].slice(0, 4), text: after.log.length !== before.log.length ? (last?.text ?? '') : '' });
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
      if (p >= 1 && d.queue !== undefined) {
        // Your turn: off the bench and up to the desk.
        const next: Doing = { i: d.i, activity: { target: d.i.target, pose: POSES[d.i.kind] ?? 'chat', stage: 'walk' }, startedAt: null, ms: durationMs(d.i) };
        doingRef.current = next;
        setProgress(0);
        setDoing(next);
      } else if (p >= 1) finish();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doing?.startedAt]);

  const eventOpen = game.pendingEvent !== null;
  const queue = placeId ? getQueueLength(game, placeId) : 0;
  const can3d = hasWebGL();
  // The joystick always works in a room, even mid-activity (walking off stops
  // it). Sheets and cards drawn on top take their own touches.
  const handlers = useJoystickHandlers(!!place && can3d);
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
    const q = QUEUED.includes(i.kind) ? queue : 0;
    if (q > 0 && layout?.fixtures.some((f) => f.target?.type === 'bench')) {
      setDoing({ i, queue: q, activity: { target: { type: 'bench' }, pose: 'sit', stage: 'walk' }, startedAt: null, ms: Math.min(1500 + q * 450, 6000) });
      return;
    }
    setDoing({ i, activity: { target: i.target, pose: POSES[i.kind] ?? 'stand', stage: 'walk' }, startedAt: null, ms: durationMs(i) });
  }

  const sameTarget = (a: Target | null, b: Target | null) => !!a && !!b && a.type === b.type && (a.id ?? '') === (b.id ?? '');
  const focus = doing ? null : (selected ?? (near && !sameTarget(near, dismissed) ? near : null));
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
  // A quest step for this room, or a follow-up you were just given, floats over your head.
  const next = nextStep(game);
  // A follow-up shows over your head only in the building where you were told; a step for this building shows here.
  const tagHere = next && (next.sub ? next.at === placeId : next.placeId === placeId);
  const questTag = next && tagHere ? (next.label.length > 40 ? `${next.label.slice(0, 38)}…` : next.label) : null;
  const night = game.clock.slot === 3;
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
                look={game.player.look}
                crowdGender={ownRoom ? (game.player.gender ?? 'male') : undefined}
                questTag={questTag}
                selected={selected}
                onSelect={(t) => {
                  if (doingRef.current) return;
                  setSelected(t);
                  // Tapping anywhere else closes the card you were looking at.
                  if (!t) setDismissed(nearRef.current);
                }}
                onNear={(t) => {
                  setNear(t);
                  setDismissed((x) => (x && t && x.type === t.type && (x.id ?? '') === (t.id ?? '') ? x : null));
                }}
                activity={doing?.activity ?? null}
                onArrive={() => setDoing((d) => (d && !d.startedAt ? { ...d, activity: { ...d.activity, stage: 'act' }, startedAt: performance.now() } : d))}
                onCancel={() => {
                  if (!doingRef.current) return;
                  doingRef.current = null;
                  setDoing(null);
                  setProgress(0);
                }}
                onExit={leave}
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
              <ActionRow key={i.id} i={i} onDo={(x) => (x.kind === "sleep" ? (setShowAll(false), setRecap(x)) : start(x))} queue={queue} time={timeLabel(game, i)} />
            ))}
          </ul>
        </div>
      )}

      {/* Night falls while you sleep. */}
      <div className={`pointer-events-none absolute inset-0 bg-[#060B18] transition-opacity duration-[2500ms] ${sleeping ? 'opacity-70' : 'opacity-0'}`} />

      {/* Top: back, the place and what is happening, your status. */}
      {/* Under the top bar (time, journal, money): where you are and what is going on. Leave with the bottom bar. */}
      <header className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-2 px-3 pt-[calc(max(0.75rem,env(safe-area-inset-top))+3.25rem)]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col items-start gap-2">
            {/* Where you are: a small chip like the quest one. */}
            <div className="pointer-events-auto flex w-fit max-w-[min(20rem,calc(100vw-5rem))] items-center gap-2 rounded-2xl border border-white/10 bg-[#16181F]/90 px-3 py-1.5 text-white shadow-lg">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/10 text-sm" aria-hidden="true">
                {placeEmoji(game, placeId)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{place.name}</span>
                <span className="flex items-center gap-1 truncate text-[11px] text-white/75">
                  <span className={`inline-block size-1.5 shrink-0 rounded-full ${status.tone === 'live' ? 'bg-red-400' : status.tone === 'open' ? 'bg-emerald-400' : status.tone === 'closed' ? 'bg-zinc-400' : 'bg-sky-300'}`} />
                  <span className="truncate">{status.text || sectionName(place.sectionId)}</span>
                </span>
              </span>
            </div>
            <InfoStack game={game} />
          </div>
          <div className="pointer-events-auto flex shrink-0 flex-col items-end gap-1.5">
            <button onClick={() => setShowAll(true)} className="h-10 rounded-full bg-black/60 px-3 text-sm font-semibold text-white" aria-label="All actions">
              ⋯
            </button>
            {ownRoom && <RoomCondition game={game} />}
          </div>
        </div>
      </header>

      {can3d && <FloatingJoystick />}

      {/* What just happened, floating up. */}
      {float && <FloatUp key={float.key} float={float} onDone={() => setFloat(null)} />}

      {/* Bottom: the activity in progress, or what you can do here. */}
      {can3d && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-3" style={{ paddingBottom: BOTTOM_BAR_SPACE }}>
          <div className="pointer-events-auto mx-auto max-w-md">
            {doing ? (
              <section className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-[#14202B]/95 p-2.5 shadow-2xl">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    {doing.queue !== undefined
                      ? doing.startedAt
                        ? `Waiting in the queue · ${Math.max(1, Math.ceil(doing.queue * (1 - progress)))} ahead`
                        : 'Joining the queue…'
                      : doing.startedAt
                        ? `${EMOJI[doing.i.kind] ?? ''} ${DOING_AT[doing.i.target.type] ?? DOING[doing.i.kind] ?? 'Busy'}…`
                        : 'On my way…'}
                    {sleeping && ' 🌙'}
                  </p>
                  <p className="truncate text-xs text-muted">{doing.i.label}</p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
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
              <ScrollCard>
                <div className="flex shrink-0 items-center justify-between gap-2">
                  <h3 className="min-w-0 truncate text-sm font-bold">
                    {focusName}
                    {person && <span className="ml-2 text-xs font-normal text-muted">{person.role.replace('_', ' ')}</span>}
                  </h3>
                  {selected && (
                    <button onClick={() => setSelected(null)} className="grid size-10 shrink-0 place-items-center text-sm text-muted" aria-label="Close">
                      ✕
                    </button>
                  )}
                </div>
                {focus.type === 'locker' && ownRoom && <Locker game={game} />}
                {showTimetable && <TodayClasses game={game} />}
                {focusList.length ? (
                  <TabbedActions key={`${focus.type}:${focus.id ?? ''}`} list={focusList} render={(i) => <ActionRow key={i.id} i={i} onDo={(x) => (x.kind === 'sleep' ? setRecap(x) : start(x))} queue={queue} time={timeLabel(game, i)} />} />
                ) : (
                  !showTimetable && <p className="text-sm text-muted">Nothing to do with this right now.</p>
                )}
                {showTimetable && (
                  <button onClick={() => openPhone('school')} className="min-h-10 rounded-xl border border-white/20 text-sm font-semibold">
                    See the whole timetable
                  </button>
                )}
              </ScrollCard>
            ) : null}
          </div>
        </div>
      )}

      {recap && (
        <DayRecap
          game={game}
          onSleep={() => {
            const i = recap;
            setRecap(null);
            start(i);
          }}
          onCancel={() => setRecap(null)}
        />
      )}

      {showAll && (
        <div className="fixed inset-0 z-30 bg-black/45" onClick={() => setShowAll(false)}>
          <section
            className={SHEET}
            // Between the top bar and the bottom bar, never over them; the list scrolls.
            style={{ bottom: BOTTOM_BAR_SPACE, maxHeight: `min(70dvh, calc(100dvh - ${BOTTOM_BAR_SPACE} - 5rem))` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky -top-4 z-10 -mx-4 -mt-4 mb-1 flex items-center justify-between bg-[#14202B] px-4 pt-2">
              <h2 className="text-base font-bold">Everything here</h2>
              <button onClick={() => setShowAll(false)} className="min-h-10 px-3 text-sm text-muted">
                Close
              </button>
            </div>
            {ownRoom && <Locker game={game} />}
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {interactions.map((i) => (
                <ActionRow key={i.id} i={i} onDo={(x) => (x.kind === "sleep" ? (setShowAll(false), setRecap(x)) : start(x))} queue={queue} time={timeLabel(game, i)} />
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

/** The action card: scrolls when it is long, with a hint that there is more below. */
function ScrollCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [more, setMore] = useState(false);
  const check = () => {
    const el = ref.current;
    if (el) setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 12);
  };
  useEffect(check);
  return (
    <div className="relative">
      <section ref={ref} onScroll={check} className="card-scroll flex max-h-[min(42dvh,calc(100dvh-17rem))] min-h-0 flex-col gap-1.5 overflow-y-auto rounded-2xl border border-white/10 bg-[#14202B]/95 p-2.5 pr-1.5 shadow-2xl">
        {children}
      </section>
      {more && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-10 items-end justify-center rounded-b-2xl bg-gradient-to-t from-[#14202B] to-transparent pb-1.5">
          <span className="rounded-full bg-sun/90 px-2.5 py-0.5 text-[11px] font-bold text-night">↓ More</span>
        </div>
      )}
    </div>
  );
}

const GROUPS: Array<{ id: string; label: string; kinds: InteractionKind[] }> = [
  { id: 'read', label: '📖 Read', kinds: ['read'] },
  { id: 'assignment', label: '✍️ Assignments', kinds: ['assignment'] },
  { id: 'project', label: '📑 Project', kinds: ['project', 'supervisor'] },
  { id: 'food', label: '🍲 Food', kinds: ['eat', 'cook'] },
  { id: 'buy', label: '🛒 Buy', kinds: ['buy'] },
  { id: 'work', label: '💼 Work', kinds: ['hustle', 'setup', 'wash_plates'] },
  { id: 'phone', label: '🔌 Phone', kinds: ['charge'] },
];

/** Many actions at one thing (the desk): split them into tabs. */
function TabbedActions({ list, render }: { list: Interaction[]; render: (i: Interaction) => React.ReactNode }) {
  const groups = GROUPS.map((g) => ({ ...g, items: list.filter((i) => g.kinds.includes(i.kind)) })).filter((g) => g.items.length);
  const rest = list.filter((i) => !GROUPS.some((g) => g.kinds.includes(i.kind)));
  if (rest.length) groups.push({ id: 'other', label: '⋯ Other', kinds: [], items: rest });
  const [tab, setTab] = useState(groups[0]?.id ?? '');
  const tabbed = list.length > 4 && groups.length > 1;
  const shown = tabbed ? (groups.find((g) => g.id === tab) ?? groups[0]!).items : list;
  return (
    <>
      {tabbed && (
        // shrink-0: in the scrolling card a scrollable row would otherwise be squeezed to nothing.
        // Sticky, so the tabs stay in sight while the list under them scrolls.
        <div className="no-scrollbar sticky -top-2.5 z-10 -mr-1.5 -ml-2.5 flex shrink-0 snap-x gap-1.5 overflow-x-auto bg-[#14202B] py-1.5 pr-1.5 pl-2.5" role="tablist" aria-label="Kinds of things to do">
          {groups.map((g) => (
            <button
              key={g.id}
              role="tab"
              aria-selected={tab === g.id}
              onClick={(e) => {
                setTab(g.id);
                e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
              }}
              className={`min-h-9 shrink-0 snap-start rounded-full border px-3 text-[13px] font-semibold whitespace-nowrap ${tab === g.id ? 'border-sun bg-sun text-night' : 'border-white/20 bg-white/12 text-white'}`}
            >
              {g.label}
              {g.items.length > 1 && <span className={`ml-1 ${tab === g.id ? 'text-night/70' : 'text-white/70'}`}>{g.items.length}</span>}
            </button>
          ))}
        </div>
      )}
      <ul className="flex shrink-0 flex-col gap-1.5">{shown.map(render)}</ul>
    </>
  );
}

/** Before sleeping: what you did today, how you feel, and your money. */
function DayRecap({ game, onSleep, onCancel }: { game: GameState; onSleep: () => void; onCancel: () => void }) {
  const today = game.log.filter((e) => Math.floor(e.at / 4) === game.clock.dayCount);
  const classes = game.academics.courses.flatMap((c) => c.meetings.filter((m) => m.day === game.clock.day && m.status === 'scheduled').map((m) => ({ c, m })));
  const mood = moodOf(game);
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4" onClick={onCancel}>
      <section role="dialog" aria-label="Your day" className="card-scroll max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-[#14202B] p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="text-xs font-semibold tracking-wide text-sun uppercase">Your day</p>
        <h2 className="text-xl font-bold">{todayLabel(game)}</h2>
        <p className="mt-1 text-sm text-muted">
          {mood.emoji} Feeling {mood.label.toLowerCase()} · {naira(game.money)} left
        </p>
        {classes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {classes.map(({ c, m }) => (
              <span key={`${c.code}${m.slot}`} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${m.attended ? 'bg-emerald-400/20 text-emerald-200' : 'bg-red-400/20 text-red-200'}`}>
                {m.attended ? '✅' : '❌'} {c.code}
              </span>
            ))}
          </div>
        )}
        <ul className="mt-3 flex flex-col gap-1.5">
          {today.length === 0 && <li className="text-sm text-muted">A quiet day.</li>}
          {today.slice(-12).map((e, i) => (
            <li key={i} className="rounded-xl bg-white/5 px-3 py-2 text-sm">
              {e.text}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-2">
          <button onClick={onCancel} className="min-h-11 rounded-xl border border-white/20 px-4 font-semibold">
            Not yet
          </button>
          <button onClick={onSleep} className="min-h-11 flex-1 rounded-xl bg-sun font-bold text-night">
            🌙 Good night
          </button>
        </div>
      </section>
    </div>
  );
}
