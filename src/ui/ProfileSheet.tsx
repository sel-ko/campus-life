// The student profile, all from the live state: the degree ring (where you
// are in the degree), standing (CGPA, class, units, attendance), then tabs
// for how you are (needs, phone, room, friends), studies (clearance, courses
// with knowledge and attendance, the attendance calendar), money (balance,
// fees, loans, hustles) and goals (ambition, objectives, stats).
import { useState, type ReactNode } from 'react';
import { getAmbition } from '../content/ambitions';
import { getCollege, getProgramme } from '../content/courses';
import { HUSTLES } from '../content/hustles';
import { getPerson, TRAIT_LABELS } from '../content/people';
import { placeName } from '../content/places';
import { attendance, classOfDegree, currentCgpa } from '../game/academics';
import { dayLabel } from '../game/calendar';
import { clearanceSteps } from '../game/clearance';
import { BACKGROUNDS, SEMESTER_DAYS } from '../game/config';
import { naira } from '../game/format';
import { friendsCount } from '../game/people';
import { moodOf } from '../game/needs';
import type { GameState } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { lookOf } from '../world/characters/look';
import { bagItems } from './BagSheet';
import { DegreeRing, degreeProgress } from './DegreeRing';
import { CloseIcon } from './icons';
import { CourseList, NeedsPanel } from './lifeUi';
import { Portrait } from './Portrait';
import { CARD_SOFT, LABEL } from './theme';

type Tab = 'me' | 'studies' | 'money' | 'goals';
const TABS: Array<[Tab, string]> = [
  ['me', '🙂 Me'],
  ['studies', '📚 Studies'],
  ['money', '💸 Money'],
  ['goals', '🏆 Goals'],
];

/** Lecture attendance across every course so far (null before any class was held). */
export function overallAttendance(game: GameState): { attended: number; held: number; pct: number | null } {
  let attended = 0;
  let held = 0;
  for (const c of game.academics.courses) {
    const a = attendance(game, c);
    attended += a.attended;
    held += a.held;
  }
  return { attended, held, pct: held ? Math.round((attended / held) * 100) : null };
}

/** A thin bar for a 0-100 value. */
function Bar({ value, colour }: { value: number; colour: string }) {
  const v = Math.round(Math.max(0, Math.min(100, value)));
  return (
    <span className="block h-1.5 overflow-hidden rounded-full bg-white/10" role="meter" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <span className={`block h-full rounded-full transition-[width] duration-500 ${colour}`} style={{ width: `${v}%` }} />
    </span>
  );
}

function Stat({ value, label, tone = '' }: { value: ReactNode; label: string; tone?: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-white/6 px-2 py-1.5">
      <p className={`truncate text-base leading-tight font-extrabold ${tone}`}>{value}</p>
      <p className="truncate text-[10px] text-muted">{label}</p>
    </div>
  );
}

/** The semester as four weeks of days: each day coloured by how its classes went. */
function AttendanceCalendar({ game }: { game: GameState }) {
  const now = game.clock.day * 4 + game.clock.slot;
  const weeks = Math.ceil(SEMESTER_DAYS / 7);
  const days = Array.from({ length: SEMESTER_DAYS }, (_, i) => {
    const day = i + 1;
    const ms = game.academics.courses.flatMap((c) => c.meetings.filter((m) => m.day === day && m.status === 'scheduled'));
    const exam = game.academics.courses.some((c) => c.exam.day === day);
    const past = ms.filter((m) => m.attended || m.day * 4 + m.slot < now);
    const went = past.filter((m) => m.attended).length;
    let cls = 'bg-white/5 text-muted';
    let what = 'No classes';
    if (exam) {
      cls = 'bg-sun text-night';
      what = 'Exam day';
    } else if (ms.length && !past.length) {
      cls = 'border border-sky-300/60 text-sky-200';
      what = `${ms.length} class${ms.length > 1 ? 'es' : ''} coming`;
    } else if (past.length) {
      cls = went === past.length ? 'bg-emerald-500/80 text-night' : went > 0 ? 'bg-amber-400/85 text-night' : 'bg-red-500/80 text-white';
      what = `${went}/${past.length} attended`;
    }
    return { day, cls, what };
  });
  const all = overallAttendance(game);
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i} className="text-[9px] font-semibold text-muted">
            {d}
          </span>
        ))}
        {days.slice(0, weeks * 7).map((d) => (
          <span
            key={d.day}
            title={`${dayLabel(game, d.day)}: ${d.what}`}
            className={`grid h-7 place-items-center rounded-md text-[10px] font-bold ${d.cls} ${d.day === game.clock.day ? 'ring-2 ring-sun ring-offset-1 ring-offset-panel' : ''}`}
          >
            {d.day}
          </span>
        ))}
      </div>
      <p className="mt-2 flex flex-wrap gap-x-2 text-[10px] text-muted">
        <span>
          Overall <b className="text-ink">{all.pct === null ? '—' : `${all.pct}%`}</b> ({all.attended}/{all.held})
        </span>
        <span className="text-emerald-300">■ all</span>
        <span className="text-amber-300">■ some</span>
        <span className="text-red-300">■ missed</span>
        <span className="text-sun">■ exam</span>
      </p>
    </div>
  );
}

function MeTab({ game }: { game: GameState }) {
  const b = Math.round(game.phone.battery);
  const data = game.phone.data;
  const friends = friendsCount(game);
  const close = Object.entries(game.people)
    .map(([id, s]) => ({ id, rel: s.rel, def: getPerson(id) }))
    .filter((x) => x.def && x.def.role !== 'officer' && x.def.role !== 'lecturer' && x.def.role !== 'doctor' && x.def.role !== 'vendor')
    .sort((a, z) => z.rel - a.rel)
    .slice(0, 4);
  return (
    <>
      <section className={CARD_SOFT}>
        <NeedsPanel game={game} />
      </section>
      <section className={`${CARD_SOFT} grid grid-cols-2 gap-3`}>
        <div className="min-w-0">
          <p className="flex justify-between text-[11px]">
            <span className="font-semibold">🔋 Battery</span>
            <span className={b <= 15 ? 'font-bold text-red-300' : b <= 35 ? 'text-amber-300' : 'text-muted'}>{b <= 0 ? 'Dead' : `${b}%`}</span>
          </p>
          <div className="mt-1">
            <Bar value={b} colour={b <= 15 ? 'bg-red-400' : b <= 35 ? 'bg-amber-400' : 'bg-emerald-400'} />
          </div>
        </div>
        <div className="min-w-0">
          <p className="flex justify-between text-[11px]">
            <span className="font-semibold">📶 Data</span>
            <span className={data <= 0 ? 'font-bold text-red-300' : data <= 100 ? 'text-amber-300' : 'text-muted'}>{data >= 1000 ? `${(data / 1000).toFixed(1)} GB` : `${Math.round(data)} MB`}</span>
          </p>
          <div className="mt-1">
            <Bar value={(data / 1500) * 100} colour={data <= 100 ? 'bg-red-400' : data <= 400 ? 'bg-amber-400' : 'bg-sky-400'} />
          </div>
        </div>
        <p className="col-span-2 text-[11px] text-muted">
          {game.room.light ? 'Light in the hostel: sleep there to charge.' : 'NEPA took light: charge at a business centre.'} {game.room.water ? '' : 'No water in the hostel.'}
        </p>
      </section>
      <section className={CARD_SOFT}>
        <h3 className={LABEL}>Room</h3>
        <p className="text-sm font-semibold">
          {placeName(game.room.placeId)} · {/^\d/.test(game.room.roomNo) ? `room ${game.room.roomNo}` : game.room.roomNo}
          {game.room.temporary ? <span className="text-amber-300"> (temporary)</span> : null}
        </p>
        <ul className="mt-1 flex flex-col gap-0.5 text-xs text-muted">
          {game.room.roommates.map((id) => {
            const p = getPerson(id);
            const rel = game.people[id]?.rel ?? 0;
            return (
              <li key={id} className="flex justify-between gap-2">
                <span className="truncate">
                  {p?.name.split(' ')[0] ?? id} · {(p?.traits ?? []).map((t) => TRAIT_LABELS[t].toLowerCase()).join(', ')}
                </span>
                <span className={rel >= 30 ? 'text-emerald-300' : rel < 0 ? 'text-red-300' : ''}>{rel}</span>
              </li>
            );
          })}
          {game.room.levy > 0 && <li className="text-amber-300">Room levy due: {naira(game.room.levy)}</li>}
        </ul>
      </section>
      <section className={CARD_SOFT}>
        <h3 className={LABEL}>People · {friends} close friend{friends === 1 ? '' : 's'}</h3>
        <ul className="flex flex-col gap-1.5">
          {close.map((x) => (
            <li key={x.id} className="text-xs">
              <span className="flex justify-between">
                <span className="truncate font-semibold">{x.def!.name}</span>
                <span className={x.rel >= 30 ? 'text-emerald-300' : x.rel < 0 ? 'text-red-300' : 'text-muted'}>{x.rel >= 30 ? 'Friend' : x.rel >= 10 ? 'Know well' : x.rel < 0 ? 'Not cool' : 'Acquaintance'}</span>
              </span>
              <span className="mt-0.5 block">
                <Bar value={Math.abs(x.rel)} colour={x.rel < 0 ? 'bg-red-400' : x.rel >= 30 ? 'bg-emerald-400' : 'bg-sky-400'} />
              </span>
            </li>
          ))}
          {close.length === 0 && <li className="text-xs text-muted">Talk to people to make friends.</li>}
        </ul>
      </section>
    </>
  );
}

function StudiesTab({ game, onCourses }: { game: GameState; onCourses: () => void }) {
  const a = game.academics;
  const last = a.transcript.at(-1);
  const steps = game.clearance.active ? clearanceSteps(game) : [];
  const stepsDone = steps.filter((s) => s.done).length;
  const exams = a.courses.filter((c) => c.exam.status === 'pending').sort((x, y) => x.exam.day - y.exam.day || x.exam.slot - y.exam.slot);
  return (
    <>
      {game.clearance.active && (
        <section className={CARD_SOFT}>
          <h3 className={LABEL}>
            Clearance · {stepsDone}/{steps.length} done
          </h3>
          <Bar value={(stepsDone / Math.max(1, steps.length)) * 100} colour="bg-sun" />
          <ul className="mt-2 flex flex-col gap-0.5 text-xs">
            {steps.map((s) => (
              <li key={s.id} className={s.done ? 'text-muted line-through' : ''}>
                {s.done ? '✅' : '▫️'} {s.label}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section>
        <div className="mb-1.5 flex items-center justify-between">
          <h3 className={LABEL}>Courses · knowledge and attendance</h3>
          {!game.clearance.active && a.courses.length > 0 && (
            <button onClick={onCourses} className="min-h-8 rounded-full bg-white/10 px-3 text-[11px] font-semibold">
              Portal →
            </button>
          )}
        </div>
        <CourseList game={game} />
      </section>
      <section className={CARD_SOFT}>
        <h3 className={LABEL}>Lecture attendance this semester</h3>
        <AttendanceCalendar game={game} />
      </section>
      {exams.length > 0 && (
        <section className={CARD_SOFT}>
          <h3 className={LABEL}>Exams</h3>
          <ul className="flex flex-col gap-0.5 text-xs">
            {exams.map((c) => (
              <li key={c.code} className="flex justify-between gap-2">
                <b>{c.code}</b>
                <span className="text-muted">
                  {dayLabel(game, c.exam.day)} · {placeName(c.exam.placeId)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {last && (
        <section className={CARD_SOFT}>
          <h3 className={LABEL}>
            Last results · {last.level}00L sem {last.semester}
          </h3>
          <p className="text-sm">
            GPA <b className="text-sun">{last.gpa.toFixed(2)}</b> · {last.units} units{last.failedUnits ? <span className="text-red-300"> · {last.failedUnits} failed</span> : null}
          </p>
          {a.carryovers.length > 0 && <p className="text-xs text-amber-300">Carryovers: {a.carryovers.map((c) => c.code).join(', ')}</p>}
        </section>
      )}
    </>
  );
}

function MoneyTab({ game }: { game: GameState }) {
  const fees = game.finance.fees;
  const unpaid = fees.filter((f) => !f.paid);
  const owe = game.loans.filter((l) => l.playerOwes);
  const lent = game.loans.filter((l) => !l.playerOwes);
  const bg = BACKGROUNDS[game.player.background];
  const items = bagItems(game);
  return (
    <>
      <section className="rounded-2xl bg-gradient-to-br from-[#1F4E9C] to-[#14202B] p-3">
        <p className="text-[11px] text-muted">Balance</p>
        <p className={`text-3xl font-black ${game.money < 1500 ? 'text-red-300' : 'text-sun'}`}>{naira(game.money)}</p>
        <p className="text-[11px] text-muted">
          Earned {naira(game.finance.earned)} · spent {naira(game.finance.spent)} · {bg.label} family, {naira(bg.allowance)} a week
        </p>
        {game.finance.lateAllowance.length > 0 && <p className="text-[11px] text-amber-300">Late allowance on its way: {naira(game.finance.lateAllowance.reduce((s, x) => s + x.amount, 0))}</p>}
      </section>
      <section className={CARD_SOFT}>
        <h3 className={LABEL}>
          Fees · {fees.length - unpaid.length}/{fees.length} paid{unpaid.length ? ` · ${naira(unpaid.reduce((s, f) => s + f.amount, 0))} left` : ''}
        </h3>
        <ul className="flex flex-col gap-1">
          {fees.map((f) => (
            <li key={f.id} className="flex items-center gap-2 text-xs">
              <span aria-hidden="true">{f.paid ? '✅' : '⏳'}</span>
              <span className="min-w-0 flex-1 truncate">{f.label}</span>
              <span className="text-muted">{f.paid ? naira(f.amount) : `${naira(f.amount)} · ${f.dueSemester === game.clock.semester ? `by ${dayLabel(game, f.dueDay)}` : 'next sem'}`}</span>
            </li>
          ))}
        </ul>
      </section>
      {(owe.length > 0 || lent.length > 0) && (
        <section className={CARD_SOFT}>
          <h3 className={LABEL}>Loans</h3>
          <ul className="flex flex-col gap-0.5 text-xs">
            {owe.map((l) => (
              <li key={l.id} className="text-red-200">
                You owe {getPerson(l.personId)?.name.split(' ')[0]} {naira(l.amount)}
              </li>
            ))}
            {lent.map((l) => (
              <li key={l.id} className="text-emerald-200">
                {getPerson(l.personId)?.name.split(' ')[0]} owes you {naira(l.amount)}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className={CARD_SOFT}>
        <h3 className={LABEL}>Hustles</h3>
        <p className="text-xs">{game.hustle.owned.length ? game.hustle.owned.map((h) => HUSTLES[h].name).join(', ') : 'None yet'}</p>
        <p className="text-[11px] text-muted">
          {game.hustle.xp} shifts · profit this semester {naira(game.hustle.profitSemester)} · all time {naira(game.hustle.profitTotal)}
        </p>
      </section>
      <section className={CARD_SOFT}>
        <h3 className={LABEL}>Bag · {items.reduce((n, i) => n + i.count, 0)} things</h3>
        <p className="flex flex-wrap gap-1 text-xs">
          {items.length === 0 && <span className="text-muted">Empty.</span>}
          {items.map((i) => (
            <span key={i.id} className="rounded-full bg-white/8 px-2 py-0.5">
              {i.emoji} {i.count > 1 ? `×${i.count}` : i.name}
            </span>
          ))}
        </p>
      </section>
    </>
  );
}

function GoalsTab({ game }: { game: GameState }) {
  const amb = getAmbition(game.goals.ambition);
  const s = game.stats;
  const objDone = game.goals.objectives.filter((o) => o.done).length;
  const rows: Array<[string, string | number]> = [
    ['Lectures attended', s.lecturesAttended],
    ['Lectures missed', s.lecturesMissed],
    ['Meals', s.meals],
    ['Hustle shifts', s.hustleShifts],
    ['Times sick', s.sickTimes],
    ['Times broke', s.brokeTimes],
    ['Keke / cab rides', `${s.kekeRides} / ${s.cabRides}`],
    ['Objectives done', game.goals.objectivesDone],
  ];
  return (
    <>
      <section className={CARD_SOFT}>
        <h3 className={LABEL}>Ambition · {amb.name}</h3>
        <ol className="flex flex-col gap-1 text-xs">
          {amb.milestones.map((m) => {
            const st = game.goals.milestones[m.id];
            return (
              <li key={m.id} className={`flex gap-2 rounded-lg px-2 py-1 ${st === 'done' ? 'bg-emerald-400/10 text-emerald-200' : st === 'missed' ? 'bg-red-400/10 text-red-200 line-through' : 'bg-white/5'}`}>
                <span className="w-9 shrink-0 font-bold text-muted">{m.level === 'final' ? 'Final' : `${m.level}00L`}</span>
                <span className="flex-1">{m.label}</span>
                <span>{st === 'done' ? '✓' : st === 'missed' ? '✗' : '○'}</span>
              </li>
            );
          })}
        </ol>
        {game.goals.position !== 'none' && <p className="mt-1 text-xs text-sun">Position: {game.goals.position.replace('_', ' ')}</p>}
      </section>
      {game.goals.objectives.length > 0 && (
        <section className={CARD_SOFT}>
          <h3 className={LABEL}>
            This week · {objDone}/{game.goals.objectives.length}
          </h3>
          <ul className="flex flex-col gap-0.5 text-xs">
            {game.goals.objectives.map((o) => (
              <li key={o.id} className={o.done ? 'text-emerald-300 line-through' : ''}>
                {o.done ? '✓' : '○'} {o.label}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className={`${CARD_SOFT} grid grid-cols-2 gap-x-3 gap-y-1 text-xs`}>
        <h3 className={`${LABEL} col-span-2`}>Your record</h3>
        {rows.map(([k, v]) => (
          <p key={k} className="flex justify-between gap-2">
            <span className="truncate text-muted">{k}</span>
            <b>{v}</b>
          </p>
        ))}
      </section>
    </>
  );
}

export function ProfileSheet({ game }: { game: GameState }) {
  const open = useGameStore((s) => s.profileOpen);
  const setOpen = useGameStore((s) => s.setProfileOpen);
  const openPhone = useGameStore((s) => s.openPhone);
  const [tab, setTab] = useState<Tab>('me');
  if (!open) return null;

  const p = game.player;
  const prog = getProgramme(p.programmeId);
  const a = game.academics;
  const cgpa = currentCgpa(game);
  const hasResults = a.transcript.length > 0;
  const passedUnits = a.transcript.flatMap((t) => t.courses).filter((c) => c.grade !== 'F').reduce((s, c) => s + c.units, 0);
  const att = overallAttendance(game);
  const mood = moodOf(game);
  const deg = degreeProgress(game);
  const badges = [
    a.probation && { t: 'On probation', c: 'bg-red-500/20 text-red-200' },
    a.spillover && { t: 'Spill-over year', c: 'bg-amber-500/20 text-amber-200' },
    a.repeating && { t: 'Repeating', c: 'bg-amber-500/20 text-amber-200' },
    a.carryovers.length > 0 && { t: `${a.carryovers.length} carryover${a.carryovers.length > 1 ? 's' : ''}`, c: 'bg-amber-500/20 text-amber-200' },
    game.clearance.active && { t: 'Clearance in progress', c: 'bg-sky-500/20 text-sky-200' },
    game.ill && { t: 'Sick', c: 'bg-red-500/20 text-red-200' },
  ].filter(Boolean) as Array<{ t: string; c: string }>;

  return (
    <div className="fade-in fixed inset-0 z-30 flex items-end justify-center bg-black/55" onClick={() => setOpen(false)}>
      <section
        role="dialog"
        aria-label="Your profile"
        onClick={(e) => e.stopPropagation()}
        className="sheet-up flex max-h-[calc(100dvh-max(0.75rem,env(safe-area-inset-top)))] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border-t border-white/10 bg-panel shadow-2xl"
      >
        {/* Header: always visible. */}
        <header className="flex shrink-0 items-center gap-2.5 border-b border-white/8 px-3 py-2.5">
          <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[#2B4558] ring-2 ring-sun/60">
            <Portrait look={lookOf(p)} size={40} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base leading-tight font-bold">{p.name}</h2>
            <p className="truncate text-[11px] text-muted">
              {p.matric} · {prog.name}
            </p>
          </div>
          <button onClick={() => setOpen(false)} className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10" aria-label="Close">
            <CloseIcon size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {/* Hero: the degree ring and your standing. */}
          <section className="flex items-center gap-2 rounded-2xl border border-white/10 bg-gradient-to-br from-[#22384A] to-[#172530] p-2.5">
            <DegreeRing game={game} size={150} />
            <div className="grid min-w-0 flex-1 grid-cols-1 gap-1.5">
              <Stat value={hasResults ? cgpa.toFixed(2) : '—'} label={hasResults ? `CGPA · ${classOfDegree(cgpa)}` : 'CGPA · no results yet'} tone="text-sun" />
              <Stat value={att.pct === null ? '—' : `${att.pct}%`} label="Attendance (75% to sit exams)" tone={att.pct === null ? '' : att.pct >= 75 ? 'text-emerald-300' : att.pct >= 60 ? 'text-amber-300' : 'text-red-300'} />
              <Stat value={naira(game.money)} label={`Money · ${mood.emoji} ${mood.label}`} tone={game.money < 1500 ? 'text-red-300' : ''} />
            </div>
          </section>
          <p className="mt-1.5 px-1 text-[11px] text-muted">
            {getCollege(prog.collegeId).name} · {prog.years}-year degree · semester {deg.done + 1} of {deg.semesters} · {passedUnits} units passed · day {game.clock.dayCount} of your life here
          </p>
          {badges.length > 0 && (
            <p className="mt-1.5 flex flex-wrap gap-1 px-1">
              {badges.map((b) => (
                <span key={b.t} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${b.c}`}>
                  {b.t}
                </span>
              ))}
            </p>
          )}

          {/* Tabs stick to the top while the content scrolls. */}
          <div className="sticky -top-3 z-10 -mx-3 mt-2 bg-panel/95 px-3 py-2 backdrop-blur" role="tablist">
            <div className="grid grid-cols-4 gap-1 rounded-full bg-black/25 p-1">
              {TABS.map(([id, label]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`min-h-9 rounded-full text-[11px] font-bold transition-colors ${tab === id ? 'bg-sun text-night shadow' : 'text-muted'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div key={tab} className="pop-in flex flex-col gap-2.5">
            {tab === 'me' && <MeTab game={game} />}
            {tab === 'studies' && (
              <StudiesTab
                game={game}
                onCourses={() => {
                  setOpen(false);
                  openPhone('school');
                }}
              />
            )}
            {tab === 'money' && <MoneyTab game={game} />}
            {tab === 'goals' && <GoalsTab game={game} />}
          </div>
        </div>
      </section>
    </div>
  );
}
