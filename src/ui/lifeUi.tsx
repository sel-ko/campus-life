// Small shared pieces of the life interface: the needs panel, effect chips,
// the quest chip (your story's next step) and the day planner timetable.
import { useState } from 'react';
import { placeName } from '../content/places';
import { naira } from '../game/format';
import { feelings, moodLine, type Feeling } from '../game/needs';
import { attendance } from '../game/academics';
import { PLAN_ICON, dayPlan } from '../game/planner';
import { currentChapter } from '../game/story';
import { journal } from '../game/journal';
import { PERIODS, academicCalendar, dayLabel, dayLabel as dayLabelOf, examTime, meetingPeriod, meetingTime, movedText, sessionDates, todayLabel as todayLabelOf } from '../game/calendar';
import { absMin, classAlerts, classState, examWindow, nowAbs } from '../game/periods';
import { currentObjectives } from '../game/quests';
import { SEMESTER_DAYS } from '../game/config';
import { clockTime } from '../game/time';
import { QuestTracker } from './QuestTracker';
import type { GameState } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { PILL } from './theme';


/** Coloured chips for what an action does: green is good for you, red costs you. */
export function EffectChips({ effects, small = false }: { effects?: string[]; small?: boolean }) {
  if (!effects?.length) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {effects.map((e) => {
        // "+10 Energy" or "Energy +10" is good, a minus is bad; for hunger, stress and bladder it is the other way round.
        const sign = e.match(/(?:^|\s)([+-])\s*[₦\d]/)?.[1] ?? (e.startsWith('+') || e.startsWith('-') ? e[0] : null);
        const reversed = /Hunger|Stress|Bladder/.test(e);
        const lose = /^Lose |less|colder/.test(e);
        const good = lose ? false : sign ? (sign === '+') !== reversed : true;
        return (
          <span key={e} className={`rounded-full px-2 ${small ? 'py-0 text-[10px]' : 'py-0.5 text-[11px]'} font-bold ${good ? 'bg-emerald-400/20 text-emerald-200' : 'bg-red-400/20 text-red-200'}`}>
            {e}
          </span>
        );
      })}
    </span>
  );
}

type NeedKey = 'energy' | 'hunger' | 'hygiene' | 'bladder' | 'stress' | 'health';
export type Tone = 'good' | 'warn' | 'bad';

/**
 * The six needs as meters. Every bar fills with its real value (0 to 100).
 * For energy, hygiene and health a full bar is good; for hunger, stress and
 * bladder a full bar is bad (bladder 100 is an accident), so their colour
 * runs green to amber to red as the bar fills.
 */
export const NEED_DEFS: Array<{ key: NeedKey; label: string; icon: string; highIsBad: boolean; word: (v: number, game: GameState) => [string, Tone] }> = [
  { key: 'energy', label: 'Energy', icon: '⚡', highIsBad: false, word: (v) => (v >= 70 ? ['Rested', 'good'] : v >= 40 ? ['Okay', 'good'] : v >= 20 ? ['Tired', 'warn'] : ['Exhausted', 'bad']) },
  { key: 'hunger', label: 'Hunger', icon: '🍲', highIsBad: true, word: (v) => (v <= 25 ? ['Full', 'good'] : v <= 55 ? ['Peckish', 'good'] : v < 80 ? ['Hungry', 'warn'] : ['Starving', 'bad']) },
  { key: 'hygiene', label: 'Hygiene', icon: '🧼', highIsBad: false, word: (v) => (v >= 70 ? ['Fresh', 'good'] : v >= 45 ? ['Okay', 'good'] : v >= 25 ? ['Need a bath', 'warn'] : ['Smelly', 'bad']) },
  { key: 'bladder', label: 'Bladder', icon: '🚽', highIsBad: true, word: (v) => (v < 50 ? ['Fine', 'good'] : v < 75 ? ['Need to go', 'warn'] : ['Pressed!', 'bad']) },
  { key: 'stress', label: 'Stress', icon: '😤', highIsBad: true, word: (v) => (v <= 30 ? ['Calm', 'good'] : v <= 55 ? ['Okay', 'good'] : v < 75 ? ['Tense', 'warn'] : ['Stressed', 'bad']) },
  { key: 'health', label: 'Health', icon: '❤️', highIsBad: false, word: (v, g) => (g.ill ? ['Sick', 'bad'] : v >= 75 ? ['Strong', 'good'] : v >= 50 ? ['Okay', 'good'] : v >= 35 ? ['Run down', 'warn'] : ['Weak', 'bad']) },
];

export const TONE_BG: Record<Tone, string> = { good: 'bg-emerald-400', warn: 'bg-amber-400', bad: 'bg-red-400' };
export const TONE_TEXT: Record<Tone, string> = { good: 'text-emerald-300', warn: 'text-amber-300', bad: 'text-red-300' };

/** One need right now: its value, a word for it and how worried to be. */
export function needState(game: GameState, key: NeedKey): { value: number; word: string; tone: Tone } {
  const def = NEED_DEFS.find((n) => n.key === key)!;
  const value = Math.round(Math.max(0, Math.min(100, game.needs[key] ?? 0)));
  const [word, tone] = def.word(value, game);
  return { value, word, tone };
}

/** The rules' feeling texts, with live numbers where the text is fixed. */
function feelingText(game: GameState, f: Feeling): string {
  if (f.id === 'no_light') {
    const b = Math.round(game.phone.battery);
    return b <= 0 ? 'No fan, no charging. Your phone is dead.' : `No fan, no charging. Phone at ${b}%.`;
  }
  return f.text;
}

/** Six labelled meters with a state word each, then why you feel the way you do. */
export function NeedsPanel({ game, showFeelings = true }: { game: GameState; showFeelings?: boolean }) {
  const feels = showFeelings ? feelings(game) : [];
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold">{moodLine(game)}</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {NEED_DEFS.map((n) => {
          const s = needState(game, n.key);
          return (
            <div key={n.key} className="min-w-0">
              <div className="flex items-baseline gap-1 text-[11px] leading-tight">
                <span aria-hidden="true">{n.icon}</span>
                <span className="font-semibold">{n.label}</span>
                <span className={`ml-auto truncate font-semibold ${TONE_TEXT[s.tone]}`}>{s.word}</span>
              </div>
              <span
                className="mt-1 block h-2 overflow-hidden rounded-full bg-white/10"
                role="meter"
                aria-label={`${n.label}: ${s.word}`}
                aria-valuenow={s.value}
                aria-valuemin={0}
                aria-valuemax={100}
                title={`${n.label} ${s.value}/100${n.highIsBad ? ' (lower is better)' : ''}`}
              >
                <span className={`block h-full rounded-full transition-[width] duration-500 ${TONE_BG[s.tone]}`} style={{ width: `${s.value}%` }} />
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] leading-snug text-muted">Keep ⚡ 🧼 ❤️ full. Keep 🍲 😤 🚽 low: a full bladder means find a toilet now.</p>
      {feels.length > 0 && (
        <ul className="flex flex-col gap-1">
          {feels.map((f) => (
            <li key={f.id} className="flex items-center gap-2 rounded-xl bg-white/6 px-2 py-1">
              <span aria-hidden="true">{f.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold">{f.title}</span>
                <span className="block text-[11px] text-muted">{feelingText(game, f)}</span>
              </span>
              <span className={`text-xs font-bold ${f.value > 0 ? 'text-emerald-300' : 'text-red-300'}`}>{f.value > 0 ? `+${f.value}` : f.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}



/** Your story's next step, with a button to go there. */
export function QuestChip({ game }: { game: GameState }) {
  const [open, setOpen] = useState(false);
  const tapPlace = useGameStore((s) => s.tapPlace);
  const openPhone = useGameStore((s) => s.openPhone);
  const leave = useGameStore((s) => s.leave);
  const insideId = useGameStore((s) => s.insidePlaceId);
  const ch = currentChapter(game);
  const next = ch.steps.find((s) => !s.done);
  const done = ch.steps.filter((s) => s.done).length;
  if (!next) return null;
  const go = () => {
    setOpen(false);
    if (next.portal) openPhone('school');
    else if (next.placeId) {
      if (insideId === next.placeId) return;
      leave();
      tapPlace(next.placeId);
    }
  };
  return (
    <div className={`pointer-events-auto w-fit max-w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl ${PILL}`}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-2 px-3 py-1.5 text-left">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sun text-xs font-black text-night">{ch.number}</span>
        <span className="min-w-0">
          <span className="block truncate text-[11px] text-muted">
            {ch.title} · {done}/{ch.steps.length}
          </span>
          <span className="block truncate text-sm font-semibold">
            {next.label}
            {next.reward ? <span className="ml-1 text-xs text-sun">+{naira(next.reward)}</span> : null}
          </span>
        </span>
      </button>
      {open && (
        <div className="flex flex-col gap-1.5 border-t border-white/10 px-3 pt-2 pb-3">
          <p className="text-xs text-muted">{ch.blurb}</p>
          <ol className="no-scrollbar flex max-h-[45vh] flex-col gap-1 overflow-y-auto">
            {ch.steps.map((s) => (
              <li key={s.id} className={`flex gap-2 text-sm ${s.sub ? 'pl-5 text-amber-200' : ''} ${s.done ? 'text-muted line-through' : s === next ? 'font-semibold' : ''}`}>
                <span aria-hidden="true">{s.done ? '✅' : s === next ? '👉' : s.sub ? '↳' : '▫️'}</span>
                <span>
                  {s.label}
                  {s === next && s.hint && <span className="block text-xs font-normal text-muted">{s.hint}</span>}
                </span>
              </li>
            ))}
          </ol>
          {(next.portal || (next.placeId && next.placeId !== insideId)) && (
            <button onClick={go} className="mt-1 min-h-10 rounded-xl bg-sun px-3 text-sm font-bold text-night">
              {next.portal ? 'Open the school app' : `Go to ${placeName(next.placeId!)}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** The timetable as a day planner: every part of every day says what is on. */
export function DayPlanView({ game, onlyToday = false }: { game: GameState; onlyToday?: boolean }) {
  const [w, setW] = useState(Math.ceil(game.clock.day / 7));
  const days = onlyToday ? [game.clock.day] : Array.from({ length: 7 }, (_, i) => (w - 1) * 7 + i + 1);
  const now = nowAbs(game);
  return (
    <div className="flex flex-col gap-2">
      {!onlyToday && (
        <div className="flex gap-1.5">
          {WEEKS.map((n) => (
            <button key={n} onClick={() => setW(n)} aria-pressed={w === n} className={`min-h-9 flex-1 rounded-full text-sm font-semibold ${w === n ? 'bg-sun text-night' : 'bg-white/10'}`}>
              Week {n}
            </button>
          ))}
        </div>
      )}
      {days.map((day) => {
        const plan = dayPlan(game, day);
        const today = day === game.clock.day;
        return (
          <div key={day} className={`rounded-2xl border border-white/10 bg-white/5 p-2.5 ${today ? 'ring-2 ring-sun' : ''} ${day < game.clock.day ? 'opacity-55' : ''}`}>
            <p className="mb-1 text-xs font-bold text-muted">
              {dayLabel(game, day)}
              {today ? ' · TODAY' : ''}
            </p>
            <ul className="flex flex-col gap-1">
              {plan.map((p, i) => {
                const timed = p.kind === 'class' || p.kind === 'test' || p.kind === 'exam';
                const end = timed ? (p.kind === 'exam' ? examWindow(p.slot).end : p.start + 120) : p.start;
                const on = today && timed && now >= absMin(day, p.start) && now < absMin(day, end);
                return (
                  <li key={i} className={`flex items-start gap-2 rounded-lg px-1.5 py-1 text-sm ${on ? 'bg-sun/15' : ''} ${p.note === 'cancelled' ? 'line-through opacity-60' : ''}`}>
                    <span className="w-[5.5rem] shrink-0 text-xs text-muted">{p.time}</span>
                    <span aria-hidden="true">{PLAN_ICON[p.kind]}</span>
                    <span className="min-w-0 flex-1">
                      <span className={p.kind === 'exam' || p.kind === 'test' ? 'font-bold' : ''}>{p.text}</span>
                      {p.placeId && <span className="block text-xs text-muted">{placeName(p.placeId)}</span>}
                      {p.movedText && <span className="block text-xs text-amber-300">⚠️ {p.movedText}</span>}
                    </span>
                    {timed && p.note !== 'cancelled' && <AttendDot now={now} start={absMin(day, p.start)} end={absMin(day, end)} done={!!p.done} />}
                    {p.note === 'moved' && !p.movedText && <span className="text-xs text-amber-300">moved</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      <p className="text-xs text-muted">
        Now: {dayLabel(game, game.clock.day)}, {clockTime(game.clock)}.
      </p>
    </div>
  );
}

const WEEKS = Array.from({ length: Math.ceil(SEMESTER_DAYS / 7) }, (_, i) => i + 1);

/** Class attendance at a glance, by the clock: green attended, red missed, yellow on now. */
function AttendDot({ now, start, end, done }: { now: number; start: number; end: number; done: boolean }) {
  const state = done ? 'attended' : now >= end ? 'missed' : now >= start ? 'on now' : 'coming up';
  const colour = done ? 'bg-emerald-400' : state === 'missed' ? 'bg-red-500' : state === 'on now' ? 'bg-amber-300' : 'bg-white/20';
  return <span className={`mt-1 size-2.5 shrink-0 rounded-full ${colour}`} title={state} aria-label={state} />;
}

const GROUP_ICON: Record<string, string> = { today: '📘', clearance: '🗂️', money: '💸', study: '📚', health: '❤️', people: '🤝🏾', goals: '🏆' };

/**
 * The stack in the top-left corner: your quest, then the big things coming
 * up (a class now, an exam tomorrow, a fee deadline, a dying phone). Tap one
 * to go there.
 */
export function InfoStack({ game }: { game: GameState }) {
  const tapPlace = useGameStore((s) => s.tapPlace);
  const openPhone = useGameStore((s) => s.openPhone);
  const leave = useGameStore((s) => s.leave);
  const insideId = useGameStore((s) => s.insidePlaceId);
  const items: Array<{ id: string; icon: string; text: string; placeId?: string; portal?: boolean; tone: 'red' | 'amber' }> = [];
  if (game.phone.battery <= 15) items.push({ id: 'battery', icon: '🪫', text: game.phone.battery <= 0 ? 'Phone dead: charge it' : `Phone battery ${Math.round(game.phone.battery)}%: charge it`, placeId: game.room.placeId, tone: 'red' });
  else if (game.phone.data <= 100) items.push({ id: 'data', icon: '📶', text: game.phone.data <= 0 ? 'No data: buy a bundle' : 'Data almost finished', tone: 'amber' });
  // Classes and exams by the clock: "late" only between start and end when
  // you are not in the hall; before that, "CSC 101 at 10:00 am in 5 h".
  const alerts = classAlerts(game, insideId);
  for (const a of alerts.filter((x) => x.kind === 'late' || x.kind === 'exam_late').reverse()) {
    items.unshift({ id: a.id, icon: '⏰', text: `${a.text} at ${placeName(a.placeId)}`, placeId: a.placeId, tone: 'red' });
  }
  const soon = alerts.find((x) => x.kind === 'soon' || x.kind === 'exam_soon');
  if (soon && items.length < 3) items.push({ id: soon.id, icon: soon.kind === 'exam_soon' ? '📝' : '📘', text: `${soon.text} · ${placeName(soon.placeId)}`, placeId: soon.placeId, tone: soon.urgent ? 'red' : 'amber' });
  const questPlace = currentObjectives(game)[0]?.placeId;
  const shown = new Set(alerts.map((a) => a.code));
  for (const t of journal(game).filter((t) => t.urgent)) {
    if (items.length >= 3) break;
    if (questPlace && t.placeId && t.placeId === questPlace) continue;
    // Class tasks are already covered by the clock alerts above.
    if (t.group === 'today' && [...shown].some((code) => t.text.includes(code))) continue;
    items.push({ id: t.id, icon: GROUP_ICON[t.group] ?? '❗', text: t.text, placeId: t.placeId, portal: t.portal, tone: t.group === 'today' ? 'amber' : 'red' });
  }
  const go = (placeId?: string, portal?: boolean) => {
    if (portal) openPhone('school');
    else if (placeId && placeId !== insideId) {
      leave();
      tapPlace(placeId);
    }
  };
  return (
    <div className="flex flex-col items-start gap-1.5">
      <QuestTracker game={game} />
      {items.map((i) => (
        <button
          key={i.id}
          onClick={() => go(i.placeId, i.portal)}
          className={`pointer-events-auto flex w-fit max-w-[min(20rem,calc(100vw-5rem))] items-center gap-2 rounded-2xl border px-3 py-1.5 text-left shadow-lg ${i.tone === 'red' ? 'border-red-400/40' : 'border-amber-300/40'} bg-[#16181F]/90`}
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/10 text-sm" aria-hidden="true">
            {i.icon}
          </span>
          <span className="line-clamp-2 text-xs font-semibold">{i.text}</span>
        </button>
      ))}
    </div>
  );
}

// ---------- the timetable ----------

const COURSE_COLOURS = ['#2F7FC1', '#E8742A', '#2E8B57', '#B23A79', '#8E3BFF', '#C9A227', '#D9482B', '#1F9E9A', '#5B6BD6', '#A0703F'];
const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

/** How much you know of a course (0 to 100), in a word and a colour. */
export function knowledgeLevel(knowledge: number): { label: string; colour: string; text: string } {
  if (knowledge >= 75) return { label: 'Strong', colour: 'bg-emerald-400', text: 'text-emerald-300' };
  if (knowledge >= 55) return { label: 'Good', colour: 'bg-lime-400', text: 'text-lime-300' };
  if (knowledge >= 35) return { label: 'Fair', colour: 'bg-amber-400', text: 'text-amber-300' };
  return { label: 'Low', colour: 'bg-red-400', text: 'text-red-300' };
}

/**
 * A school timetable: Monday to Friday across, class periods down (with the
 * lunch break), each class in its hall, coloured by course, with a dot for
 * attended (green), missed (red) or on now (yellow). Week 1 or week 2.
 */
export function TimetableGrid({ game }: { game: GameState }) {
  const [w, setW] = useState(Math.min(WEEKS.length, Math.ceil(game.clock.day / 7)));
  const courses = game.academics.courses;
  const colour = (code: string) => COURSE_COLOURS[courses.findIndex((c) => c.code === code) % COURSE_COLOURS.length]!;
  const days = WEEKDAY_SHORT.map((_, i) => (w - 1) * 7 + i + 1);
  const moved = courses.flatMap((c) => c.meetings.filter((m) => m.moved && m.status === 'scheduled' && days.includes(m.day)).map((m) => ({ c, m })));
  const examWeek = (n: number) => courses.some((c) => Math.ceil(c.exam.day / 7) === n && c.exam.status !== 'written');
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted">
        Now: {dayLabel(game, game.clock.day)}, {clockTime(game.clock)}
      </p>
      <div className="flex gap-1.5">
        {WEEKS.map((n) => (
          <button key={n} onClick={() => setW(n)} aria-pressed={w === n} className={`min-h-9 flex-1 rounded-full text-xs font-semibold ${w === n ? 'bg-sun text-night' : 'bg-white/10'}`}>
            Wk {n}
            {examWeek(n) ? ' · exams' : ''}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] table-fixed border-separate border-spacing-1 text-[11px]">
          <thead>
            <tr>
              <th className="w-14" />
              {days.map((day) => (
                <th key={day} className={`rounded-lg py-1 font-semibold ${day === game.clock.day ? 'bg-sun text-night' : 'bg-white/8'}`}>
                  {dayLabel(game, day).replace(/ \w+$/, '')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((p) => (
              <tr key={p.id}>
                <td className="pr-1 text-right align-top text-muted">{p.label}</td>
                {p.break ? (
                  <td colSpan={5} className="rounded-lg bg-white/5 py-1 text-center text-muted">
                    🍲 Lunch break
                  </td>
                ) : (
                  days.map((day) => {
                    const here = courses.flatMap((c) => c.meetings.filter((m) => m.day === day && meetingPeriod(c, m).id === p.id).map((m) => ({ c, m })));
                    const exam = courses.find((c) => c.exam.day === day && c.exam.slot === p.slot && (p.slot !== 0 || p.id === 'p1'));
                    return (
                      <td key={day} className="h-14 align-top">
                        {here.map(({ c, m }) => {
                          const st = classState(game, c, m);
                          const dot = st === 'attended' ? 'bg-emerald-400' : st === 'on' ? 'bg-amber-300' : st === 'over' ? 'bg-red-500' : '';
                          return (
                            <div key={c.code} title={m.moved ? movedText(game, c, m) : `${c.code} ${meetingTime(c, m)}`} className={`relative h-full rounded-lg p-1 text-white ${m.status === 'cancelled' ? 'opacity-40 line-through' : ''} ${m.moved ? 'ring-2 ring-amber-300' : ''}`} style={{ background: colour(c.code) }}>
                              <p className="font-bold">
                                {c.code}
                                {m.test ? ' TEST' : ''}
                              </p>
                              <p className="truncate opacity-90">{placeName(m.placeId)}</p>
                              {m.moved && <p className="truncate text-[10px] font-bold text-amber-100">moved</p>}
                              {dot && <span className={`absolute top-1 right-1 size-2 rounded-full ring-1 ring-black/30 ${dot}`} />}
                            </div>
                          );
                        })}
                        {exam && !here.length && (
                          <div className="h-full rounded-lg bg-red-500/80 p-1 font-bold text-white">
                            📝 {exam.code} EXAM
                            <p className="truncate font-normal">{examTime(exam.exam.slot)}</p>
                            <p className="truncate font-normal">{placeName(exam.exam.placeId)}</p>
                          </div>
                        )}
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="flex flex-wrap gap-3 text-xs text-muted">
        <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-emerald-400" /> attended</span>
        <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-amber-300" /> on now</span>
        <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-red-500" /> missed</span>
      </p>
      {moved.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-xl border border-amber-300/40 bg-amber-300/10 p-2 text-xs text-amber-100">
          {moved.map(({ c, m }) => (
            <li key={`${c.code}${m.day}`}>⚠️ {movedText(game, c, m)}</li>
          ))}
        </ul>
      )}
      <CourseList game={game} colour={colour} />
    </div>
  );
}

/** Your courses this semester: what, how much you know, and your attendance. */
export function CourseList({ game, colour }: { game: GameState; colour?: (code: string) => string }) {
  const courses = game.academics.courses;
  if (!courses.length) return <p className="text-sm text-muted">No courses yet. Register on the portal once clearance is done.</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {courses.map((c, i) => {
        const know = knowledgeLevel(c.knowledge);
        const k = Math.round(Math.max(0, Math.min(100, c.knowledge)));
        const att = attendance(game, c);
        const attPct = Math.round(att.pct * 100);
        return (
          <li key={c.code} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2">
            <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: colour ? colour(c.code) : COURSE_COLOURS[i % COURSE_COLOURS.length] }} />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-1 text-sm font-bold">
                {c.code}
                <span className="truncate text-[11px] font-normal text-muted">
                  · {c.units} units{c.carryover ? ' · carryover' : ''}
                </span>
                <span className={`ml-auto shrink-0 text-[11px] font-semibold ${!att.held ? 'text-muted' : attPct >= 75 ? 'text-emerald-300' : attPct >= 60 ? 'text-amber-300' : 'text-red-300'}`} title="Attendance so far (75% needed to write the exam)">
                  {att.held ? `${att.attended}/${att.held} classes` : 'no classes yet'}
                </span>
              </span>
              <span className="block truncate text-xs text-muted">{c.title}</span>
              <span className="mt-1 flex items-center gap-2 text-[11px]">
                <span className="text-muted">Knowledge</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10" role="meter" aria-label={`${c.code} knowledge`} aria-valuenow={k} aria-valuemin={0} aria-valuemax={100}>
                  <span className={`block h-full rounded-full ${know.colour}`} style={{ width: `${k}%` }} />
                </span>
                <span className={`w-16 text-right font-semibold ${know.text}`}>
                  {k}% {know.label}
                </span>
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Today's classes, tests and exams with their times and halls (the board in your room). */
export function TodayClasses({ game }: { game: GameState }) {
  const now = nowAbs(game);
  const day = game.clock.day;
  const rows = game.academics.courses
    .flatMap((c) => [
      ...c.meetings
        .filter((m) => m.day === day)
        .map((m) => {
          const p = meetingPeriod(c, m);
          return { key: `${c.code}${m.slot}`, start: absMin(day, p.start), end: absMin(day, p.end), time: meetingTime(c, m), text: `${c.code}${m.test ? ' TEST' : ''}`, place: m.placeId, done: m.attended, off: m.status === 'cancelled', moved: m.moved && m.status === 'scheduled' ? movedText(game, c, m) : '' };
        }),
      ...(c.exam.day === day ? [{ key: `${c.code}x`, start: absMin(day, examWindow(c.exam.slot).start), end: absMin(day, examWindow(c.exam.slot).end), time: examTime(c.exam.slot), text: `${c.code} EXAM`, place: c.exam.placeId, done: c.exam.status !== 'pending', off: false, moved: '' }] : []),
    ])
    .sort((a, b) => a.start - b.start);
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold text-muted">
        {todayLabelOf(game)} · now {clockTime(game.clock)}
      </p>
      {rows.length === 0 && <p className="text-sm text-muted">No classes today.</p>}
      {rows.map((r) => (
        <div key={r.key} className={`flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm ${r.off ? 'line-through opacity-50' : ''}`}>
          <span className="w-24 shrink-0 text-xs text-muted">{r.time}</span>
          <span className="min-w-0 flex-1">
            <b>{r.text}</b>
            <span className="block truncate text-xs text-muted">{placeName(r.place)}</span>
            {r.moved && <span className="block text-xs text-amber-300">⚠️ {r.moved}</span>}
          </span>
          <span className={`size-2.5 rounded-full ${r.done ? 'bg-emerald-400' : now >= r.end ? 'bg-red-500' : now >= r.start ? 'bg-amber-300' : 'bg-white/20'}`} />
        </div>
      ))}
    </div>
  );
}

/** The academic calendar for this semester, with real dates. */
export function CalendarView({ game }: { game: GameState }) {
  const entries = academicCalendar(game);
  const today = game.clock.day;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {sessionDates(game).map((s, i) => (
          <div key={s.label} className={`rounded-2xl border p-2.5 ${i + 1 === game.clock.semester ? 'border-sun/60 bg-sun/10' : 'border-white/10 bg-white/5'}`}>
            <p className="text-xs font-semibold">{s.label}</p>
            <p className="text-[11px] text-muted">
              {s.from} – {s.to}
            </p>
          </div>
        ))}
      </div>
      <ul className="flex flex-col gap-1.5">
        {entries.map((e, i) => {
          const end = e.end ?? e.day;
          const past = end < today;
          const now = e.day <= today && today <= end;
          return (
            <li key={i} className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${now ? 'border-sun/60 bg-sun/10' : 'border-white/10 bg-white/5'} ${past ? 'opacity-45' : ''}`}>
              <span className="w-24 shrink-0 text-xs font-semibold">
                {dayLabelOf(game, e.day)}
                {e.end && e.end !== e.day ? <span className="block font-normal text-muted">to {dayLabelOf(game, e.end)}</span> : null}
              </span>
              <span aria-hidden="true">{e.icon}</span>
              <span className={`min-w-0 flex-1 text-sm ${e.kind === 'exam' || e.kind === 'test' ? 'font-bold' : ''}`}>{e.title}</span>
              {now && <span className="text-[10px] font-bold text-sun uppercase">now</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
