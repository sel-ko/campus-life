// One-off screens the rules queue in state.summaries: clearance done,
// semester results, end of year, graduation, withdrawal. Each can be shared.
import { useState, type ReactNode } from 'react';
import { getAmbition } from '../content/ambitions';
import { getProgramme } from '../content/courses';
import { classOfDegree, currentCgpa } from '../game/academics';
import { clearanceDays } from '../game/clearance';
import { naira } from '../game/format';
import type { GameState, Summary } from '../game/types';
import { onlineConfigured, submitResult } from '../online/supabase';
import { useGameStore } from '../store/gameStore';
import type { ShareCardData } from './shareCard';
import { ShareSheet } from './ShareSheet';
import { gameUrl } from './site';
import { BTN_PRIMARY } from './theme';

function card(game: GameState, s: Summary): ShareCardData | null {
  const p = getProgramme(game.player.programmeId);
  const base = { name: game.player.name, subtitle: `${p.name} · ${game.academics.level}00 level`, url: gameUrl() };
  const cgpa = currentCgpa(game);
  switch (s.kind) {
    case 'clearance': {
      const c = game.clearance;
      const days = clearanceDays(game);
      return {
        ...base,
        kicker: 'CLEARANCE COMPLETE',
        big: `${days} day${days === 1 ? '' : 's'}`,
        bigLabel: 'TO GET CLEARED',
        lines: [`${c.visits} office visits, ${c.wasted} wasted`, `Money spent: ${naira(c.spent)}`, '"Come back tomorrow" survived ✊'],
        message: `I finished my clearance in ${days} days with ${c.wasted} wasted office visits in Campus Life. Beat that! ${gameUrl()}`,
      };
    }
    case 'semester': {
      const r = game.academics.transcript[s.record];
      if (!r) return null;
      const fails = r.courses.filter((x) => x.grade === 'F').length;
      return {
        ...base,
        kicker: `${r.level}00 LEVEL · SEMESTER ${r.semester} RESULTS`,
        big: r.gpa.toFixed(2),
        bigLabel: 'SEMESTER GPA',
        badge: `CGPA ${r.cgpa.toFixed(2)}`,
        lines: [`${r.units} units · ${r.courses.filter((x) => x.grade === 'A').length} A's`, fails ? `${fails} carryover${fails > 1 ? 's' : ''} 😬` : 'No carryovers 🎉'],
        message: `My ${r.level}00 level semester ${r.semester} GPA in Campus Life: ${r.gpa.toFixed(2)} (CGPA ${r.cgpa.toFixed(2)}). ${gameUrl()}`,
      };
    }
    case 'graduation': {
      const amb = getAmbition(game.goals.ambition);
      const final = amb.milestones.find((m) => m.level === 'final');
      const won = final ? game.goals.milestones[final.id] === 'done' : false;
      return {
        ...base,
        subtitle: p.name,
        kicker: 'GRADUATED!',
        big: cgpa.toFixed(2),
        bigLabel: 'FINAL CGPA',
        badge: classOfDegree(cgpa),
        lines: [`${game.clock.year} sessions · ${amb.name}: ${won ? 'achieved' : 'not quite'}`, `Left school with ${naira(game.money)}`],
        message: `I graduated in Campus Life with a ${classOfDegree(cgpa)} (CGPA ${cgpa.toFixed(2)})! ${gameUrl()}`,
      };
    }
    default:
      return null;
  }
}

const BOX = 'rounded-2xl border border-white/10 bg-white/5 p-3';

/**
 * A centred card over everything else (menus included), with a dimmed
 * backdrop: the title stays at the top, the details scroll, and Continue
 * stays at the bottom.
 */
export function SummaryScreen({ game }: { game: GameState }) {
  const dismiss = useGameStore((s) => s.dismissSummary);
  const reset = useGameStore((s) => s.reset);
  const [sharing, setSharing] = useState(false);
  const [posted, setPosted] = useState<'idle' | 'posting' | 'done' | 'failed'>('idle');
  const s = game.summaries[0];
  if (!s) return null;
  const share = card(game, s);
  const p = getProgramme(game.player.programmeId);
  const cgpa = currentCgpa(game);

  async function post() {
    setPosted('posting');
    const ok = await submitResult({ nickname: game.player.name, department: p.name, cgpa, money: game.money, title: classOfDegree(cgpa) });
    setPosted(ok ? 'done' : 'failed');
  }

  let icon = '📋';
  let kicker = '';
  let title = '';
  let body: ReactNode = null;
  if (s.kind === 'clearance') {
    icon = '🗂️';
    kicker = 'Milestone';
    title = 'Clearance complete!';
    body = (
      <>
        <p className="text-sm text-muted">You are now officially a student.</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className={BOX}>
            <p className="text-xl font-black text-sun">{clearanceDays(game)}</p>
            <p className="text-[10px] text-muted">days</p>
          </div>
          <div className={BOX}>
            <p className="text-xl font-black">{game.clearance.visits}</p>
            <p className="text-[10px] text-muted">visits ({game.clearance.wasted} wasted)</p>
          </div>
          <div className={BOX}>
            <p className="text-base font-black">{naira(game.clearance.spent)}</p>
            <p className="text-[10px] text-muted">spent</p>
          </div>
        </div>
      </>
    );
  } else if (s.kind === 'semester') {
    const r = game.academics.transcript[s.record]!;
    icon = '📜';
    kicker = `${r.level}00 level · semester ${r.semester}`;
    title = 'Your results are out';
    body = (
      <>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className={BOX}>
            <p className="text-2xl font-black text-sun">{r.gpa.toFixed(2)}</p>
            <p className="text-[10px] text-muted">semester GPA</p>
          </div>
          <div className={BOX}>
            <p className="text-2xl font-black">{r.cgpa.toFixed(2)}</p>
            <p className="text-[10px] text-muted">CGPA · {classOfDegree(r.cgpa)}</p>
          </div>
        </div>
        <ul className={`${BOX} flex flex-col gap-1 text-xs`}>
          {r.courses.map((c) => (
            <li key={c.code} className="flex gap-2">
              <span className="w-16 shrink-0 font-semibold">{c.code}</span>
              <span className="min-w-0 flex-1 truncate text-muted">{c.title}</span>
              <span className="w-7 text-right">{c.score}</span>
              <b className={`w-6 text-right ${c.grade === 'F' ? 'text-red-300' : c.grade === 'A' ? 'text-emerald-300' : ''}`}>{c.issue === 'missing_script' ? 'MS' : c.grade}</b>
            </li>
          ))}
        </ul>
        {game.academics.issues.length > 0 && <p className="text-xs text-amber-300">Something looks wrong with a result. Check your journal: you can sort it out at the office.</p>}
      </>
    );
  } else if (s.kind === 'year') {
    const amb = getAmbition(game.goals.ambition);
    const ms = amb.milestones.find((m) => m.level === s.level);
    icon = s.repeated ? '🔁' : '⬆️';
    kicker = 'End of session';
    title = `End of ${s.level}00 level`;
    body = (
      <>
        <p className="text-sm text-muted">
          {s.repeated ? `You failed too many units and will repeat ${s.level}00 level. Deep breath. You can do this.` : game.academics.spillover ? 'You have carryovers left, so one more session to clear them.' : `On to ${game.academics.level}00 level. New room, new roommates, same hustle.`}
        </p>
        <p className="text-sm">
          CGPA so far: <b className="text-sun">{cgpa.toFixed(2)}</b> ({classOfDegree(cgpa)}){s.probation ? <span className="text-red-300"> · on probation</span> : ''}
        </p>
        {ms && (
          <p className={`${BOX} text-xs`}>
            {amb.name} milestone: {ms.label} — <b className={game.goals.milestones[ms.id] === 'done' ? 'text-emerald-300' : 'text-red-300'}>{game.goals.milestones[ms.id] === 'done' ? 'achieved ✓' : 'missed'}</b>
          </p>
        )}
        <p className="text-xs text-muted">
          Money {naira(game.money)} · {game.stats.lecturesAttended} lectures attended so far · broke {game.stats.brokeTimes} times
        </p>
      </>
    );
  } else if (s.kind === 'graduation') {
    const amb = getAmbition(game.goals.ambition);
    const final = amb.milestones.find((m) => m.level === 'final');
    const won = final ? game.goals.milestones[final.id] === 'done' : false;
    icon = '🎓';
    kicker = p.name;
    title = 'Congratulations, graduate!';
    body = (
      <>
        <p className="text-base">
          <b className="text-sun">{classOfDegree(cgpa)}</b> (CGPA {cgpa.toFixed(2)})
        </p>
        <p className={`${BOX} text-sm`}>{won ? amb.ending.win : amb.ending.lose}</p>
        <p className="text-xs text-muted">
          {game.clock.year} sessions · {game.stats.lecturesAttended} lectures · {game.stats.hustleShifts} hustle shifts · left with {naira(game.money)}
        </p>
      </>
    );
  } else if (s.kind === 'withdrawn') {
    icon = '📭';
    kicker = 'The registry wrote to you';
    title = 'Withdrawn';
    body = <p className="text-sm text-muted">Your CGPA stayed below 1.00 for too long and the university has withdrawn you. It happens to real people too, and many of them start again and do great. Want another go?</p>;
  }

  const ended = game.phase !== 'playing';
  const more = game.summaries.length - 1;
  return (
    <div className="fade-in fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-[2px]">
      <section role="dialog" aria-modal="true" aria-labelledby="summary-title" className="pop-in flex max-h-[80dvh] w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-sun/40 bg-panel shadow-2xl shadow-black/60">
        <header className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-gradient-to-br from-[#2A3F52] to-panel px-4 py-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-sun/15 text-2xl" aria-hidden="true">
            {icon}
          </span>
          <span className="min-w-0 flex-1">
            {kicker && <span className="block truncate text-[10px] font-bold tracking-wide text-sun uppercase">{kicker}</span>}
            <h1 id="summary-title" className="text-lg leading-tight font-extrabold">
              {title}
            </h1>
          </span>
          {more > 0 && <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-muted">+{more} more</span>}
        </header>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-3">{body}</div>
        <footer className="flex shrink-0 flex-col gap-2 border-t border-white/10 bg-panel px-4 py-3">
          {(share || (onlineConfigured() && (s.kind === 'semester' || s.kind === 'graduation'))) && (
            <div className="flex gap-2">
              {share && (
                <button onClick={() => setSharing(true)} className="min-h-10 flex-1 rounded-xl border border-white/20 bg-white/5 px-3 text-sm font-semibold">
                  Share card
                </button>
              )}
              {onlineConfigured() && (s.kind === 'semester' || s.kind === 'graduation') && (
                <button disabled={posted !== 'idle'} onClick={() => void post()} className="min-h-10 flex-1 rounded-xl border border-white/20 bg-white/5 px-3 text-sm font-semibold disabled:opacity-50">
                  {posted === 'done' ? 'Posted ✓' : posted === 'failed' ? 'Could not post' : posted === 'posting' ? 'Posting…' : 'Post CGPA'}
                </button>
              )}
            </div>
          )}
          {ended && game.summaries.length === 1 ? (
            <button onClick={reset} className={BTN_PRIMARY}>
              Start a new life
            </button>
          ) : (
            <button onClick={dismiss} className={BTN_PRIMARY}>
              Continue
            </button>
          )}
        </footer>
      </section>
      {sharing && share && <ShareSheet data={share} onClose={() => setSharing(false)} />}
    </div>
  );
}

