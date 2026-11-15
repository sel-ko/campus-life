// The apps inside the in-game phone.
import { useEffect, useMemo, useRef, useState } from 'react';
import { getDepartment, getLocation, university } from '../../content/university';
import { getAction } from '../../game/actions';
import { CLASS_REP, QUICK_REPLIES, chatTime } from '../../game/chat';
import { ALLOWANCE_DAYS, BACKGROUNDS, DAY_NAMES, SEMESTER_DAYS, WEEKEND_DAYS } from '../../game/config';
import { currentSlot } from '../../game/engine';
import { naira } from '../../game/format';
import { SLOTS, type GameState } from '../../game/types';
import { fetchVendors, type Vendor } from '../../online/supabase';
import { useGameStore } from '../../store/gameStore';
import { useSettings, type Quality } from '../../store/settingsStore';
import { LeaderboardScreen } from '../LeaderboardScreen';
import { LocationList } from '../LocationList';
import { GAME_NAME } from '../site';
import { useChat } from '../useChat';
import { VendorCard } from '../VendorSection';

// ---------- Messages: the department group chat ----------

const NAME_COLOURS = ['#F5B83D', '#7DD3FC', '#F9A8D4', '#86EFAC', '#FDBA74', '#C4B5FD', '#FCA5A5', '#5EEAD4'];
function nameColour(name: string): string {
  if (name === CLASS_REP) return '#F5B83D';
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return NAME_COLOURS[h % NAME_COLOURS.length]!;
}

export function MessagesApp({ game }: { game: GameState }) {
  const [open, setOpen] = useState(false);
  const { lines, classmateCount, unread } = useChat(game);
  const markChatRead = useGameStore((s) => s.markChatRead);
  const sendReply = useGameStore((s) => s.sendReply);
  const end = useRef<HTMLDivElement>(null);
  const dept = getDepartment(game.player.departmentId)?.name ?? 'Class';
  const groupName = `${dept} Class Group`;

  useEffect(() => {
    if (!open) return;
    markChatRead(classmateCount);
    end.current?.scrollIntoView({ block: 'end' });
  }, [open, classmateCount, lines.length, markChatRead]);

  const last = lines[lines.length - 1];

  if (!open) {
    return (
      <ul className="flex flex-col">
        <li>
          <button onClick={() => setOpen(true)} className="flex min-h-16 w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-white/5">
            <span className="grid size-12 shrink-0 place-items-center rounded-full font-extrabold text-night" style={{ background: university.colours.accent }}>
              {dept.slice(0, 2).toUpperCase()}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-semibold">{groupName}</span>
              <span className="truncate text-sm text-muted">{last ? `${last.from}: ${last.text}` : 'No messages yet'}</span>
            </span>
            {unread > 0 && <span className="grid min-w-6 place-items-center rounded-full bg-emerald-400 px-1.5 text-xs font-bold text-night">{unread}</span>}
          </button>
        </li>
        <li className="px-2 pt-6 text-center text-xs text-muted">Classmates in your department chat here as the semester goes on.</li>
      </ul>
    );
  }

  let lastDay = 0;
  return (
    <div className="flex h-full flex-col">
      <button onClick={() => setOpen(false)} className="mb-2 flex min-h-11 items-center gap-2 text-left">
        <span className="text-xl">‹</span>
        <span className="flex flex-col">
          <span className="font-semibold">{groupName}</span>
          <span className="text-xs text-muted">Class Rep and classmates</span>
        </span>
      </button>
      <div className="-mx-1 flex-1 overflow-y-auto px-1">
        <ul className="flex flex-col gap-2 pb-2">
          {lines.map((l) => {
            const showDay = l.day !== lastDay;
            lastDay = l.day;
            return (
              <li key={l.id} className="flex flex-col gap-2">
                {showDay && (
                  <p className="self-center rounded-full bg-white/10 px-3 py-0.5 text-[11px] text-muted">
                    {DAY_NAMES[(l.day - 1) % 7]} · Day {l.day}
                  </p>
                )}
                <div className={`flex max-w-[85%] flex-col rounded-2xl px-3 py-2 text-sm ${l.mine ? 'self-end rounded-br-md bg-sun text-night' : 'self-start rounded-bl-md bg-white/12'}`}>
                  {!l.mine && (
                    <span className="text-xs font-bold" style={{ color: nameColour(l.from) }}>
                      {l.from}
                    </span>
                  )}
                  <span>{l.text}</span>
                  <span className={`self-end text-[10px] ${l.mine ? 'text-night/60' : 'text-muted'}`}>{chatTime(l.day, l.slot)}</span>
                </div>
              </li>
            );
          })}
        </ul>
        <div ref={end} />
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pt-2">
        {QUICK_REPLIES.map((r) => (
          <button key={r} onClick={() => sendReply(r)} className="min-h-11 shrink-0 rounded-full border border-white/25 bg-white/10 px-3 text-sm">
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- Calendar ----------

export function CalendarApp({ game }: { game: GameState }) {
  const weeks = Math.ceil(SEMESTER_DAYS / 7);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
        {DAY_NAMES.map((d) => (
          <span key={d}>{d}</span>
        ))}
        {Array.from({ length: weeks * 7 }, (_, i) => {
          const day = i + 1;
          if (day > SEMESTER_DAYS) return <span key={day} />;
          const today = day === game.day;
          const past = day < game.day;
          const weekend = WEEKEND_DAYS.includes(day);
          return (
            <div
              key={day}
              className={`flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-semibold ${
                today ? 'bg-sun text-night' : weekend ? 'bg-white/15' : 'bg-white/8'
              } ${past ? 'opacity-45' : ''}`}
            >
              {day}
              <span className="text-[10px] leading-none">{ALLOWANCE_DAYS.includes(day) ? '₦' : day === SEMESTER_DAYS ? '🎓' : ''}</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5" aria-label="Today's time slots">
        {SLOTS.map((s, i) => (
          <span key={s} className={`flex-1 rounded-full px-1 py-1 text-center text-[11px] font-semibold ${i === game.slotIndex ? 'bg-sun text-night' : i < game.slotIndex ? 'bg-white/10 text-muted' : 'bg-white/15'}`}>
            {s}
          </span>
        ))}
      </div>
      <ul className="flex flex-col gap-1 text-sm text-muted">
        <li>
          <b className="text-ink">₦</b> Allowance lands on days {ALLOWANCE_DAYS.join(' and ')}.
        </li>
        <li>Lighter squares are weekends: no lectures, hang out any time.</li>
        <li>🎓 Day {SEMESTER_DAYS}: results day. {SEMESTER_DAYS - game.day} days to go.</li>
      </ul>
    </div>
  );
}

// ---------- Wallet ----------

export function WalletApp({ game }: { game: GameState }) {
  const bg = BACKGROUNDS[game.player.background];
  const next = ALLOWANCE_DAYS.find((d) => d > game.day);
  const cost = (id: string) => -(getAction(id)?.effects.money ?? 0);
  const earn = (id: string) => getAction(id)?.effects.money ?? 0;
  const rows: Array<[string, string]> = [
    ['Buka meal', naira(cost('cafeteria'))],
    ['Cook noodles', naira(cost('noodles'))],
    ['Hang out', naira(cost('hangout'))],
    ['Sell snacks', `+${naira(earn('sell-snacks'))}`],
    ['Print and type', `+${naira(earn('print-type'))}`],
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl p-5" style={{ background: `linear-gradient(135deg, ${university.colours.primary}, #14202B)` }}>
        <p className="text-sm text-muted">Balance</p>
        <p className="text-4xl font-extrabold text-sun">{naira(game.money)}</p>
        <p className="mt-2 text-sm">
          {bg.label} background · {naira(bg.weeklyAllowance)} a week
        </p>
        <p className="text-sm text-muted">{next ? `Next allowance: Day ${next} morning` : 'No more allowance this semester'}</p>
      </div>
      <section>
        <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Prices and hustles</h3>
        <dl className="flex flex-col divide-y divide-white/10 rounded-2xl bg-white/8 px-3">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between py-2 text-sm">
              <dt>{k}</dt>
              <dd className={`font-semibold ${v.startsWith('+') ? 'text-emerald-300' : ''}`}>{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

// ---------- Updates (everything that happened) ----------

export function UpdatesApp({ game }: { game: GameState }) {
  const entries = [...game.log].reverse();
  if (entries.length === 0) return <p className="text-muted">Nothing has happened yet.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {entries.map((e, i) => (
        <li key={game.log.length - i} className="rounded-2xl bg-white/8 px-3 py-2 text-sm">
          <span className="block text-[11px] text-muted">
            Day {e.day} · {e.slot}
          </span>
          {e.text}
        </li>
      ))}
    </ul>
  );
}

// ---------- Places ----------

export function PlacesApp({ game, onPick }: { game: GameState; onPick: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">Tap a place to go there. Dimmed places have nothing open this {currentSlot(game).toLowerCase()}.</p>
      <LocationList game={game} onPick={onPick} />
    </div>
  );
}

// ---------- Market: every real vendor ----------

export function MarketApp({ game }: { game: GameState }) {
  const [vendors, setVendors] = useState<Vendor[] | null | 'loading'>('loading');
  useEffect(() => {
    let alive = true;
    void fetchVendors().then((v) => alive && setVendors(v));
    return () => {
      alive = false;
    };
  }, []);
  const byPlace = useMemo(() => {
    if (!Array.isArray(vendors)) return [];
    return university.locations
      .map((loc) => ({ loc, list: vendors.filter((v) => v.locationId === loc.id) }))
      .filter((g) => g.list.length > 0);
  }, [vendors]);

  if (vendors === 'loading') return <p className="text-muted">Loading the market…</p>;
  if (vendors === null) return <p className="text-muted">The market is offline right now. Your game still works.</p>;
  if (byPlace.length === 0) return <p className="text-muted">No vendors yet. Check back soon.</p>;
  return (
    <div className="flex flex-col gap-4">
      {byPlace.map(({ loc, list }) => (
        <section key={loc.id} className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">{loc.name}</h3>
          <ul className="flex flex-col gap-2">
            {list.map((v) => (
              <VendorCard key={v.id} vendor={v} homeId={game.player.homeId} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

// ---------- Leaderboard ----------

export function LeaderboardApp({ game }: { game: GameState }) {
  return <LeaderboardScreen departmentId={game.player.departmentId} embedded />;
}

// ---------- Settings ----------

const QUALITY_OPTIONS: Array<{ id: Quality; label: string; blurb: string }> = [
  { id: 'high', label: 'Best looks', blurb: 'Sharper map, glass effects, more students walking about.' },
  { id: 'battery', label: 'Battery saver', blurb: 'Smoother on cheaper phones and kinder to your battery.' },
];

export function SettingsApp() {
  const quality = useSettings((s) => s.quality);
  const setQuality = useSettings((s) => s.setQuality);
  const reset = useGameStore((s) => s.reset);
  const home = useGameStore((s) => (s.game ? getLocation(s.game.player.homeId)?.name : undefined));

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Display</h3>
        {QUALITY_OPTIONS.map((o) => (
          <label key={o.id} className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border p-3 ${quality === o.id ? 'border-sun bg-white/8' : 'border-white/15'}`}>
            <input type="radio" name="quality" checked={quality === o.id} onChange={() => setQuality(o.id)} className="mt-1 size-5 accent-sun" />
            <span className="flex flex-col">
              <span className="font-semibold">{o.label}</span>
              <span className="text-sm text-muted">{o.blurb}</span>
            </span>
          </label>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Game</h3>
        <p className="text-sm text-muted">Your name, stats and look are in your profile: tap your picture on the map.{home ? ` You stay at ${home}.` : ''}</p>
        <button
          onClick={() => {
            if (window.confirm('Start over? Your current semester will be lost.')) reset();
          }}
          className="min-h-11 rounded-2xl border border-red-400/60 font-semibold text-red-300"
        >
          Start over
        </button>
      </section>

      <section className="flex flex-col gap-1 text-sm text-muted">
        <h3 className="text-xs font-semibold tracking-wide uppercase">About</h3>
        <p>
          {GAME_NAME} · version 0.2
        </p>
        <p>Unofficial fan-made game, not affiliated with {university.shortName}.</p>
      </section>
    </div>
  );
}
