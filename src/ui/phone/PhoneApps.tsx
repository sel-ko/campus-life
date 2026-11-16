// The apps inside the in-game phone. They read the state and call the store
// (which calls the rules); none of them decides anything.
import { useEffect, useMemo, useRef, useState } from 'react';
import { HUSTLES } from '../../content/hustles';
import { ALL_PEOPLE, getPerson } from '../../content/people';
import { PLACES, getPlace, placeName, sectionName } from '../../content/places';
import { sections } from '../../content/campusMap';
import { attendance, classOfDegree, currentCgpa } from '../../game/academics';
import { BACKGROUNDS, DAY_NAMES, EXAM_DAYS, SEMESTER_DAYS, WEEKEND_DAYS } from '../../game/config';
import { naira } from '../../game/format';
import { canPay, canRegister, portalIsDown, registrationDeadline } from '../../game/money';
import { placeHasSomethingNow } from '../../game/interactions';
import { slotName } from '../../game/time';
import { SLOTS, type GameState } from '../../game/types';
import { fetchVendors, type Vendor } from '../../online/supabase';
import { useGameStore } from '../../store/gameStore';
import { useSettings, type Quality } from '../../store/settingsStore';
import { drawCourseForm, downloadCanvas } from '../courseForm';
import { LeaderboardScreen } from '../LeaderboardScreen';
import { GAME_NAME } from '../site';
import { VendorCard } from '../VendorSection';
import { getProgramme } from '../../content/courses';

const tab = (on: boolean) => `min-h-10 shrink-0 rounded-full px-3 text-sm font-semibold ${on ? 'bg-sun text-night' : 'bg-white/10'}`;
const box = 'rounded-2xl bg-white/8 p-3';

// ---------- School app: the student portal ----------

type SchoolTab = 'fees' | 'register' | 'timetable' | 'results';

export function SchoolApp({ game }: { game: GameState }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [t, setT] = useState<SchoolTab>('fees');
  const payFee = useGameStore((s) => s.payFee);
  const register = useGameStore((s) => s.registerCourses);
  const last = game.finance.lastPortal;
  const down = portalIsDown(game);

  if (!loggedIn) {
    return (
      <div className="flex flex-col gap-3 pt-4">
        <p className="text-center text-lg font-bold">Student Portal</p>
        <label className="flex flex-col gap-1 text-sm">
          Matric number
          <input readOnly value={game.player.matric} className="min-h-11 rounded-lg border border-white/20 bg-black/30 px-3" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input readOnly type="password" value="campuslife" className="min-h-11 rounded-lg border border-white/20 bg-black/30 px-3" />
        </label>
        <button onClick={() => setLoggedIn(true)} className="min-h-11 rounded-xl bg-sun font-bold text-night">
          Log in
        </button>
        <p className="text-center text-xs text-muted">Pretend portal for the game. Never type a real password here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {(
          [
            ['fees', 'Fees'],
            ['register', 'Courses'],
            ['timetable', 'Timetable'],
            ['results', 'Results'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} onClick={() => setT(id)} className={tab(t === id)}>
            {label}
          </button>
        ))}
      </div>
      {down && <p className="rounded-xl bg-red-500/20 p-2 text-sm">⚠️ The portal is down right now. Try again later.</p>}
      {last && (t === 'fees' || t === 'register') && (
        <p className={`rounded-xl p-2 text-sm ${last.outcome === 'ok' ? 'bg-emerald-500/15' : 'bg-amber-500/15'}`}>{last.text}</p>
      )}

      {t === 'fees' && (
        <ul className="flex flex-col gap-2">
          {game.finance.fees.map((f) => {
            const can = canPay(game, f.id);
            const pending = game.finance.debits.some((x) => x.feeId === f.id);
            return (
              <li key={f.id} className={`${box} flex items-center gap-2`}>
                <span className="flex flex-1 flex-col">
                  <span className="font-semibold">{f.label}</span>
                  <span className="text-xs text-muted">
                    {naira(f.amount)} · due day {f.dueDay} of semester {f.dueSemester}
                  </span>
                </span>
                {f.paid ? (
                  <span className="text-sm font-bold text-emerald-300">PAID</span>
                ) : pending ? (
                  <span className="text-xs font-semibold text-amber-300">Debited, not recorded</span>
                ) : (
                  <button disabled={!can.ok} onClick={() => payFee(f.id)} className="min-h-10 rounded-full bg-sun px-4 text-sm font-bold text-night disabled:opacity-40" title={can.ok ? '' : can.reason}>
                    Pay
                  </button>
                )}
              </li>
            );
          })}
          <li className="text-xs text-muted">Balance: {naira(game.money)}</li>
        </ul>
      )}

      {t === 'register' && <CoursesTab game={game} onRegister={register} />}
      {t === 'timetable' && <Timetable game={game} />}
      {t === 'results' && <Results game={game} />}
    </div>
  );
}

function CoursesTab({ game, onRegister }: { game: GameState; onRegister: () => void }) {
  const can = canRegister(game);
  const units = game.academics.courses.reduce((s, c) => s + c.units, 0);
  return (
    <div className="flex flex-col gap-2">
      <div className={box}>
        <p className="font-semibold">{game.academics.registered ? '✅ Registered for this semester' : `Registration deadline: day ${registrationDeadline(game)}`}</p>
        {!game.academics.registered && (
          <>
            <button disabled={!can.ok} onClick={onRegister} className="mt-2 min-h-11 w-full rounded-xl bg-sun font-bold text-night disabled:opacity-40">
              Register {units} units
            </button>
            {!can.ok && <p className="mt-1 text-xs text-red-300">{can.reason}</p>}
          </>
        )}
        <button onClick={() => downloadCanvas(drawCourseForm(game), `course-form-${game.academics.level}00L-sem${game.clock.semester}.png`)} className="mt-2 min-h-11 w-full rounded-xl border border-white/20 font-semibold">
          Download course form
        </button>
      </div>
      <ul className="flex flex-col gap-1 text-sm">
        {game.academics.courses.map((c) => (
          <li key={c.code} className="flex gap-2 border-b border-white/10 py-1">
            <span className="w-20 shrink-0 font-semibold">{c.code}</span>
            <span className="flex-1">
              {c.title}
              {c.carryover && <span className="text-amber-300"> (carryover)</span>}
            </span>
            <span>{c.units}u</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Timetable({ game }: { game: GameState }) {
  const week = game.clock.day <= 7 ? 1 : 2;
  const days = Array.from({ length: 7 }, (_, i) => (week - 1) * 7 + i + 1);
  const cell = (day: number, slot: number) =>
    game.academics.courses.flatMap((c) => c.meetings.filter((m) => m.day === day && m.slot === slot).map((m) => ({ c, m })));
  const exams = [...game.academics.courses].filter((c) => c.exam.status === 'pending').sort((a, b) => a.exam.day - b.exam.day || a.exam.slot - b.exam.slot);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">Week {week}. Struck-through classes are cancelled; ⚠ marks a change.</p>
      <div className="flex flex-col gap-2">
        {days.map((day) => {
          const lines = SLOTS.flatMap((_, s) => cell(day, s).map((x) => ({ ...x, s })));
          return (
            <div key={day} className={`${box} ${day === game.clock.day ? 'ring-2 ring-sun' : ''}`}>
              <p className="text-xs font-bold text-muted">
                {DAY_NAMES[(day - 1) % 7]} · day {day}
                {EXAM_DAYS.includes(day) ? ' · exams' : ''}
              </p>
              {lines.length === 0 && <p className="text-sm text-muted">{WEEKEND_DAYS.includes(day) ? 'Weekend' : 'No classes'}</p>}
              {lines.map(({ c, m, s }) => (
                <p key={`${c.code}${s}`} className={`text-sm ${m.status === 'cancelled' ? 'text-muted line-through' : ''}`}>
                  {slotName(s)}: <b>{c.code}</b>
                  {m.test ? ' (TEST)' : ''} · {placeName(m.placeId)}
                  {m.moved ? ' ⚠' : ''}
                  {m.attended ? ' ✓' : ''}
                </p>
              ))}
            </div>
          );
        })}
      </div>
      {exams.length > 0 && (
        <div className={box}>
          <p className="mb-1 font-semibold">Exam timetable</p>
          {exams.map((c) => (
            <p key={c.code} className="text-sm">
              Day {c.exam.day} {slotName(c.exam.slot)}: <b>{c.code}</b> · {placeName(c.exam.placeId)}
              {c.exam.batchMoved ? ' (moved!)' : ''}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function Results({ game }: { game: GameState }) {
  const t = game.academics.transcript;
  if (!t.length) return <p className="text-muted">No results yet. They come out at the end of each semester.</p>;
  const cgpa = currentCgpa(game);
  return (
    <div className="flex flex-col gap-3">
      <div className={box}>
        <p className="text-sm text-muted">CGPA</p>
        <p className="text-3xl font-extrabold text-sun">{cgpa.toFixed(2)}</p>
        <p className="text-sm">{classOfDegree(cgpa)}</p>
        {game.academics.carryovers.length > 0 && <p className="text-sm text-amber-300">Carryovers: {game.academics.carryovers.map((c) => c.code).join(', ')}</p>}
        {game.academics.probation && <p className="text-sm text-red-300">On academic probation</p>}
      </div>
      {[...t].reverse().map((r) => (
        <div key={`${r.year}-${r.semester}`} className={box}>
          <p className="font-semibold">
            {r.level}00 level, semester {r.semester} · GPA {r.gpa.toFixed(2)}
          </p>
          {r.courses.map((c) => (
            <p key={c.code} className="flex gap-2 text-sm">
              <span className="w-20 shrink-0">{c.code}</span>
              <span className="flex-1 text-muted">
                {c.score} ({c.ca}+{c.exam})
              </span>
              <b className={c.grade === 'F' ? 'text-red-300' : ''}>{c.issue === 'missing_script' ? 'MS' : c.grade}</b>
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------- Chat ----------

export function ChatApp({ game }: { game: GameState }) {
  const [open, setOpen] = useState<string | null>(null);
  const markRead = useGameStore((s) => s.markChatRead);
  const answer = useGameStore((s) => s.answerChat);
  const end = useRef<HTMLDivElement>(null);
  const threads = Object.values(game.chat.threads).sort((a, b) => (b.messages.at(-1)?.at ?? 0) - (a.messages.at(-1)?.at ?? 0));
  const thread = open ? game.chat.threads[open] : undefined;
  const count = thread?.messages.length ?? 0;

  useEffect(() => {
    if (!open) return;
    markRead(open);
    end.current?.scrollIntoView({ block: 'end' });
  }, [open, count, markRead]);

  const name = (id: string) => (id === 'system' ? 'School' : (getPerson(id)?.name.split(' ')[0] ?? id));

  if (!thread) {
    return (
      <ul className="flex flex-col">
        {threads.map((t) => {
          const lastMsg = t.messages.at(-1);
          return (
            <li key={t.id}>
              <button onClick={() => setOpen(t.id)} className="flex min-h-16 w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-white/5">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-sun font-extrabold text-night">{t.title.slice(0, 2).toUpperCase()}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-semibold">{t.title}</span>
                  <span className="truncate text-sm text-muted">{lastMsg ? `${lastMsg.from === 'me' ? 'You' : name(lastMsg.from)}: ${lastMsg.text}` : 'No messages yet'}</span>
                </span>
                {t.unread > 0 && <span className="grid min-w-6 place-items-center rounded-full bg-emerald-400 px-1.5 text-xs font-bold text-night">{t.unread}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <button onClick={() => setOpen(null)} className="mb-2 flex min-h-11 items-center gap-2 text-left">
        <span className="text-xl">‹</span>
        <span className="font-semibold">{thread.title}</span>
      </button>
      <div className="-mx-1 flex-1 overflow-y-auto px-1">
        <ul className="flex flex-col gap-2 pb-2">
          {thread.messages.map((m) => {
            const mine = m.from === 'me';
            return (
              <li key={m.id} className={`flex max-w-[88%] flex-col rounded-2xl px-3 py-2 text-sm ${mine ? 'self-end rounded-br-md bg-sun text-night' : 'self-start rounded-bl-md bg-white/12'}`}>
                {!mine && thread.kind === 'group' && <span className="text-xs font-bold text-sky-300">{name(m.from)}</span>}
                <span>{m.text}</span>
                <span className={`self-end text-[10px] ${mine ? 'text-night/60' : 'text-muted'}`}>
                  Day {Math.floor(m.at / 4) - 0} · {slotName(m.at % 4)}
                </span>
                {m.replies && m.answered === undefined && (
                  <span className="mt-1 flex flex-wrap gap-1">
                    {m.replies.map((r, i) => (
                      <button key={r.label} onClick={() => answer(thread.id, m.id, i)} className="min-h-9 rounded-full border border-white/30 px-3 text-xs font-semibold">
                        {r.label}
                      </button>
                    ))}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        <div ref={end} />
      </div>
    </div>
  );
}

// ---------- Calendar ----------

export function CalendarApp({ game }: { game: GameState }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Session {game.clock.year} · {game.academics.level}00 level · semester {game.clock.semester}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
        {DAY_NAMES.map((d) => (
          <span key={d}>{d}</span>
        ))}
        {Array.from({ length: SEMESTER_DAYS }, (_, i) => {
          const day = i + 1;
          const today = day === game.clock.day;
          return (
            <div key={day} className={`flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-semibold ${today ? 'bg-sun text-night' : WEEKEND_DAYS.includes(day) ? 'bg-white/15' : 'bg-white/8'} ${day < game.clock.day ? 'opacity-45' : ''}`}>
              {day}
              <span className="text-[10px] leading-none">{EXAM_DAYS.includes(day) ? '📝' : day === 1 || day === 8 ? '₦' : ''}</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5">
        {SLOTS.map((s, i) => (
          <span key={s} className={`flex-1 rounded-full px-1 py-1 text-center text-[11px] font-semibold ${i === game.clock.slot ? 'bg-sun text-night' : 'bg-white/10'}`}>
            {s}
          </span>
        ))}
      </div>
      <ul className="flex flex-col gap-1 text-sm text-muted">
        <li>₦ Allowance days. 📝 Exam days (12 to 14).</li>
        <li>Registration deadline: day {registrationDeadline(game)}. Fees due by day 11.</li>
      </ul>
    </div>
  );
}

// ---------- Wallet ----------

export function WalletApp({ game }: { game: GameState }) {
  const bg = BACKGROUNDS[game.player.background];
  const owed = game.loans.filter((l) => l.playerOwes);
  const lent = game.loans.filter((l) => !l.playerOwes);
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl bg-gradient-to-br from-[#1F4E9C] to-[#14202B] p-5">
        <p className="text-sm text-muted">Balance</p>
        <p className="text-4xl font-extrabold text-sun">{naira(game.money)}</p>
        <p className="mt-2 text-sm">
          {bg.label} family · {naira(bg.allowance)} allowance on days 1 and 8
        </p>
        <p className="text-sm text-muted">
          Earned {naira(game.finance.earned)} · spent {naira(game.finance.spent)}
        </p>
      </div>
      <section className={box}>
        <h3 className="mb-1 font-semibold">Hustles</h3>
        {game.hustle.owned.map((h) => (
          <p key={h} className="text-sm">
            ✓ {HUSTLES[h].name}
          </p>
        ))}
        <p className="text-xs text-muted">
          {game.hustle.xp} shifts of experience · profit this semester {naira(game.hustle.profitSemester)}
        </p>
        <p className="mt-1 text-xs text-muted">Snacks in your room, typing and the business centre at the Business Centre, POS at a POS kiosk, tutoring at a library. Errands and plate washing always pay something.</p>
      </section>
      {(owed.length > 0 || lent.length > 0) && (
        <section className={box}>
          <h3 className="mb-1 font-semibold">Loans</h3>
          {owed.map((l) => (
            <p key={l.id} className="text-sm">
              You owe {getPerson(l.personId)?.name}: {naira(l.amount)}
            </p>
          ))}
          {lent.map((l) => (
            <p key={l.id} className="text-sm">
              {getPerson(l.personId)?.name} owes you {naira(l.amount)}
            </p>
          ))}
        </section>
      )}
    </div>
  );
}

// ---------- Contacts ----------

export function PeopleApp({ game }: { game: GameState }) {
  const known = ALL_PEOPLE.filter((p) => game.people[p.id] && (p.role !== 'lecturer' || (game.people[p.id]?.rel ?? 0) !== 0));
  const sorted = [...known].sort((a, b) => (game.people[b.id]?.rel ?? 0) - (game.people[a.id]?.rel ?? 0));
  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((p) => {
        const rel = game.people[p.id]?.rel ?? 0;
        return (
          <li key={p.id} className={box}>
            <p className="flex justify-between font-semibold">
              <span>{p.name}</span>
              <span className={rel >= 30 ? 'text-emerald-300' : rel < 0 ? 'text-red-300' : 'text-muted'}>{rel}</span>
            </p>
            <p className="text-xs text-muted">{game.room.roommates.includes(p.id) ? 'Roommate · ' : ''}{p.blurb}</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className={`h-full ${rel >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`} style={{ width: `${Math.min(100, Math.abs(rel))}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ---------- Places ----------

export function PlacesApp({ game, onPick }: { game: GameState; onPick: (id: string) => void }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => PLACES.filter((p) => p.enterable || p.type === 'field'), []);
  const s = q.trim().toLowerCase();
  return (
    <div className="flex flex-col gap-3">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search places" className="min-h-11 rounded-xl bg-black/35 px-3" />
      {sections.map((sec) => {
        const here = list.filter((p) => p.sectionId === sec.id && (!s || p.name.toLowerCase().includes(s)));
        if (!here.length) return null;
        return (
          <section key={sec.id}>
            <h3 className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">{sec.name}</h3>
            <ul className="flex flex-col gap-1">
              {here.map((p) => (
                <li key={p.id}>
                  <button onClick={() => onPick(p.id)} className={`flex min-h-11 w-full items-center justify-between rounded-xl bg-white/5 px-3 text-left text-sm ${placeHasSomethingNow(game, p.id) ? '' : 'opacity-60'}`}>
                    <span>{p.name}</span>
                    <span className="text-xs text-muted">{p.id === game.room.placeId ? 'Your room' : p.id === game.location.placeId ? 'You are here' : ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

// ---------- Market (real vendors, online) ----------

export function MarketApp({ game }: { game: GameState }) {
  const [vendors, setVendors] = useState<Vendor[] | null | 'loading'>('loading');
  useEffect(() => {
    let alive = true;
    void fetchVendors().then((v) => alive && setVendors(v));
    return () => {
      alive = false;
    };
  }, []);
  if (vendors === 'loading') return <p className="text-muted">Loading the market…</p>;
  if (vendors === null) return <p className="text-muted">The market is offline right now. Your game still works.</p>;
  if (vendors.length === 0) return <p className="text-muted">No vendors yet. Check back soon.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {vendors.map((v) => (
        <VendorCard key={v.id} vendor={v} homeId={game.room.placeId} />
      ))}
      <li className="text-xs text-muted">Stalls appear at: {[...new Set(vendors.map((v) => getPlace(v.locationId)?.name ?? v.locationId))].join(', ')}</li>
    </ul>
  );
}

export function LeaderboardApp({ game }: { game: GameState }) {
  return <LeaderboardScreen departmentId={getProgramme(game.player.programmeId).name} embedded />;
}

// ---------- Settings ----------

const QUALITY_OPTIONS: Array<{ id: Quality; label: string; blurb: string }> = [
  { id: 'high', label: 'Best looks', blurb: 'Sharper map and rooms, more students walking about.' },
  { id: 'battery', label: 'Battery saver', blurb: 'Smoother on cheaper phones and kinder to your battery.' },
];

export function SettingsApp({ game }: { game: GameState }) {
  const quality = useSettings((s) => s.quality);
  const setQuality = useSettings((s) => s.setQuality);
  const reset = useGameStore((s) => s.reset);
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
        <p className="text-sm text-muted">
          {game.player.name} · {game.player.matric} · room {game.room.roomNo}, {sectionName(getPlace(game.room.placeId)?.sectionId ?? '')}
        </p>
        <button
          onClick={() => {
            if (window.confirm('Start over? Your whole degree so far will be lost.')) reset();
          }}
          className="min-h-11 rounded-2xl border border-red-400/60 font-semibold text-red-300"
        >
          Start over
        </button>
      </section>
      <section className="flex flex-col gap-1 text-sm text-muted">
        <h3 className="text-xs font-semibold tracking-wide uppercase">About</h3>
        <p>{GAME_NAME} · version 0.3</p>
        <p>Unofficial fan-made game. Not affiliated with any real university.</p>
      </section>
    </div>
  );
}

export function attendancePct(game: GameState, code: string): number {
  const c = game.academics.courses.find((x) => x.code === code);
  return c ? attendance(game, c).pct : 1;
}
