// One-off screens the rules queue in state.summaries: clearance done,
// semester results, end of year, graduation, withdrawal. Each can be shared.
import { useState } from 'react';
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
import { BTN_GHOST, BTN_PRIMARY } from './theme';

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
        message: `I finished my Uni clearance in ${days} days with ${c.wasted} wasted office visits in Campus Life. Beat that! ${gameUrl()}`,
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
        message: `I graduated from Uni in Campus Life with a ${classOfDegree(cgpa)} (CGPA ${cgpa.toFixed(2)})! ${gameUrl()}`,
      };
    }
    default:
      return null;
  }
}

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

  let body: React.ReactNode = null;
  if (s.kind === 'clearance') {
    body = (
      <>
        <h1 className="text-3xl font-extrabold">Clearance complete!</h1>
        <p className="text-muted">You are now officially a student. It took {clearanceDays(game)} days, {game.clearance.visits} office visits ({game.clearance.wasted} wasted) and {naira(game.clearance.spent)}.</p>
      </>
    );
  } else if (s.kind === 'semester') {
    const r = game.academics.transcript[s.record]!;
    body = (
      <>
        <h1 className="text-3xl font-extrabold">
          {r.level}00 level, semester {r.semester} results
        </h1>
        <p className="text-lg">
          GPA <b className="text-sun">{r.gpa.toFixed(2)}</b> · CGPA <b className="text-sun">{r.cgpa.toFixed(2)}</b>
        </p>
        <ul className="flex flex-col gap-1 rounded-2xl bg-white/5 p-3 text-sm">
          {r.courses.map((c) => (
            <li key={c.code} className="flex gap-2">
              <span className="w-20 shrink-0 font-semibold">{c.code}</span>
              <span className="flex-1 truncate text-muted">{c.title}</span>
              <span className="w-8 text-right">{c.score}</span>
              <b className={`w-6 text-right ${c.grade === 'F' ? 'text-red-300' : c.grade === 'A' ? 'text-emerald-300' : ''}`}>{c.issue === 'missing_script' ? 'MS' : c.grade}</b>
            </li>
          ))}
        </ul>
        {game.academics.issues.length > 0 && <p className="text-sm text-amber-300">Something looks wrong with a result. Check your journal: you can sort it out at the office.</p>}
      </>
    );
  } else if (s.kind === 'year') {
    const amb = getAmbition(game.goals.ambition);
    const ms = amb.milestones.find((m) => m.level === s.level);
    body = (
      <>
        <h1 className="text-3xl font-extrabold">End of {s.level}00 level</h1>
        <p className="text-muted">
          {s.repeated ? `You failed too many units and will repeat ${s.level}00 level. Deep breath. You can do this.` : game.academics.spillover ? 'You have carryovers left, so one more session to clear them.' : `On to ${game.academics.level}00 level. New room, new roommates, same hustle.`}
        </p>
        <p>
          CGPA so far: <b className="text-sun">{cgpa.toFixed(2)}</b> ({classOfDegree(cgpa)}){s.probation ? ' · on probation' : ''}
        </p>
        {ms && (
          <p className="rounded-2xl bg-white/5 p-3 text-sm">
            {amb.name} milestone: {ms.label} — <b>{game.goals.milestones[ms.id] === 'done' ? 'achieved ✓' : 'missed'}</b>
          </p>
        )}
        <p className="text-sm text-muted">
          Money {naira(game.money)} · {game.stats.lecturesAttended} lectures attended so far · broke {game.stats.brokeTimes} times
        </p>
      </>
    );
  } else if (s.kind === 'graduation') {
    const amb = getAmbition(game.goals.ambition);
    const final = amb.milestones.find((m) => m.level === 'final');
    const won = final ? game.goals.milestones[final.id] === 'done' : false;
    body = (
      <>
        <p className="text-5xl">🎓</p>
        <h1 className="text-3xl font-extrabold">Congratulations, graduate!</h1>
        <p className="text-lg">
          {p.name}: <b className="text-sun">{classOfDegree(cgpa)}</b> (CGPA {cgpa.toFixed(2)})
        </p>
        <p className="rounded-2xl bg-white/5 p-3">{won ? amb.ending.win : amb.ending.lose}</p>
        <p className="text-sm text-muted">
          {game.clock.year} sessions · {game.stats.lecturesAttended} lectures · {game.stats.hustleShifts} hustle shifts · left with {naira(game.money)}
        </p>
      </>
    );
  } else if (s.kind === 'withdrawn') {
    body = (
      <>
        <h1 className="text-3xl font-extrabold">Withdrawn</h1>
        <p className="text-muted">Your CGPA stayed below 1.00 for too long and the university has withdrawn you. It happens to real people too, and many of them start again and do great. Want another go?</p>
      </>
    );
  }

  const ended = game.phase !== 'playing';
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-night">
      <main className="mx-auto flex min-h-full max-w-md flex-col gap-4 px-4 py-8">
        {body}
        <div className="mt-2 flex flex-col gap-2">
          {share && (
            <button onClick={() => setSharing(true)} className={BTN_GHOST}>
              Share card
            </button>
          )}
          {onlineConfigured() && (s.kind === 'semester' || s.kind === 'graduation') && (
            <button disabled={posted !== 'idle'} onClick={() => void post()} className={BTN_GHOST}>
              {posted === 'done' ? 'Posted to the leaderboard ✓' : posted === 'failed' ? 'Could not post' : posted === 'posting' ? 'Posting…' : 'Post my CGPA to the leaderboard'}
            </button>
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
        </div>
      </main>
      {sharing && share && <ShareSheet data={share} onClose={() => setSharing(false)} />}
    </div>
  );
}
