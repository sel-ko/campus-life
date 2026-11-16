// The place card: tap any building and it opens at the bottom, showing what
// the place is, what is happening there now, what you can do inside, and how
// to get there (keke, cab or walk; your car if you have one). Picking a way
// closes it and sets you off.
import { getPlace, sectionName } from '../content/places';
import { naira } from '../game/format';
import { getInteractions, travelOptions } from '../game/interactions';
import { placeEmoji, placeOpen, placeStatus } from '../game/status';
import type { GameState } from '../game/types';
import { useGameStore } from '../store/gameStore';

const ICONS = { keke: '🛺', cab: '🚕', walk: '🚶', drive: '🚗' } as const;
const NAMES = { keke: 'Keke', cab: 'Cab', walk: 'Walk', drive: 'Drive' } as const;
const KIND_LABEL: Partial<Record<string, string>> = {
  eat: '🍲 Eat',
  buy: '🛒 Shop',
  read: '📖 Read',
  assignment: '✍️ Assignments',
  attend: '📘 Class now',
  test: '✏️ Test now',
  exam: '📝 Exam now',
  office: '🗂️ Clearance',
  hustle: '💼 Work',
  wash_plates: '🍽️ Wash plates',
  treat: '🩺 See a doctor',
  sleep: '🛏️ Sleep',
  nap: '🛏️ Nap',
  bath: '🧼 Bathe',
  party: '🪩 Party',
  hangout: '🗣️ Hang out',
  exercise: '🏃 Exercise',
};
const TONE = { live: 'bg-red-400', open: 'bg-emerald-400', closed: 'bg-zinc-400', quiet: 'bg-sky-300' } as const;

export function TravelSheet({ game }: { game: GameState }) {
  const id = useGameStore((s) => s.travelSheetId);
  const choose = useGameStore((s) => s.chooseTravel);
  const close = useGameStore((s) => s.closeTravelSheet);
  const place = id ? getPlace(id) : undefined;
  if (!place || !id) return null;
  const options = travelOptions(game, id);
  const across = place.sectionId !== game.location.sectionId;
  const status = placeStatus(game, id);
  const can = getInteractions(game, id).filter((i) => i.available && !['wait', 'toilet', 'talk'].includes(i.kind));
  const things = [...new Set(can.map((i) => KIND_LABEL[i.kind] ?? i.label.split(':')[0]!))].slice(0, 5);

  return (
    <div className="fixed inset-0 z-30 bg-black/30" onClick={close}>
      <section
        role="dialog"
        aria-label={`Go to ${place.name}`}
        className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-3xl border border-white/10 bg-[#14202B] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-2xl" aria-hidden="true">
            {placeEmoji(game, id)}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg leading-tight font-bold">{place.name}</h2>
            <p className="truncate text-xs text-muted">
              {sectionName(place.sectionId)}
              {across ? ` · you are on ${sectionName(game.location.sectionId)}` : ' · close by'}
            </p>
            {status.text && (
              <p className="mt-0.5 flex items-center gap-1.5 text-sm">
                <span className={`inline-block size-2 rounded-full ${TONE[status.tone]}`} />
                {status.text}
              </p>
            )}
          </div>
          <button onClick={close} className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-sm" aria-label="Close">
            ✕
          </button>
        </div>

        {!placeOpen(game, id).open && <p className="mt-3 rounded-2xl bg-white/8 px-3 py-2 text-sm font-semibold">🔒 {placeOpen(game, id).reason}. You can still go there.</p>}
        {things.length > 0 && placeOpen(game, id).open && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {things.map((t) => (
              <span key={t} className="rounded-full bg-white/8 px-2.5 py-1 text-xs">
                {t}
              </span>
            ))}
          </div>
        )}

        <p className="mt-3 mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">Go there by</p>
        <div className="grid grid-cols-3 gap-2">
          {options.map((o) => (
            <button
              key={o.mode}
              disabled={!o.available}
              onClick={() => choose(o.mode)}
              title={o.available ? o.detail : o.reason}
              className="flex min-h-20 flex-col items-center justify-center gap-0.5 rounded-2xl border border-white/10 bg-white/6 px-1 py-2 text-center enabled:active:bg-white/15 disabled:opacity-40"
            >
              <span className="text-2xl" aria-hidden="true">
                {ICONS[o.mode]}
              </span>
              <span className="text-sm font-bold">{NAMES[o.mode]}</span>
              <span className="text-[11px] leading-tight text-muted">
                {!o.available ? (o.reason ?? 'Not now') : o.cost.money ? naira(o.cost.money) : o.cost.slots ? `Free · ${o.cost.slots === 1 ? '1 slot' : `${o.cost.slots} slots`}` : 'Free'}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
