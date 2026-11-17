// The degree path as a ring: one segment per semester of the programme,
// filled as you go (the current one fills day by day), a marker where you
// are now, and a dot at the end of each year for that year's ambition
// milestone (green done, red missed). Everything comes from the live state.
import { getAmbition } from '../content/ambitions';
import { getProgramme } from '../content/courses';
import { SEMESTER_DAYS } from '../game/config';
import type { GameState } from '../game/types';
import type { ReactNode } from 'react';

export interface DegreeProgress {
  years: number;
  semesters: number;
  /** Semesters fully behind you. */
  done: number;
  /** Share of the current semester gone, 0 to 1. */
  partial: number;
  /** Share of the whole degree, 0 to 1. */
  share: number;
}

/** Where you are in the degree, worked out from level, semester and day. */
export function degreeProgress(game: GameState): DegreeProgress {
  const years = Math.max(1, getProgramme(game.player.programmeId).years);
  const semesters = years * 2;
  if (game.phase === 'graduated') return { years, semesters, done: semesters, partial: 0, share: 1 };
  const done = Math.min(semesters - 1, Math.max(0, (game.academics.level - 1) * 2 + (game.clock.semester - 1)));
  const partial = Math.max(0, Math.min(1, (game.clock.day - 1 + game.clock.slot / 4) / SEMESTER_DAYS));
  return { years, semesters, done, partial, share: Math.min(1, (done + partial) / semesters) };
}

function point(c: number, r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [c + r * Math.cos(a), c + r * Math.sin(a)];
}

function arc(c: number, r: number, from: number, to: number): string {
  const [x0, y0] = point(c, r, from);
  const [x1, y1] = point(c, r, to);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/**
 * `size` is the box in px. `labels` adds the level names round the outside
 * and the text in the middle (the profile); without it the ring is a plain
 * frame (the avatar button) and `children` sit in the middle.
 */
export function DegreeRing({ game, size = 200, labels = true, children }: { game: GameState; size?: number; labels?: boolean; children?: ReactNode }) {
  const p = degreeProgress(game);
  const c = size / 2;
  const stroke = labels ? Math.max(8, size * 0.06) : Math.max(4, size * 0.085);
  const r = labels ? c - stroke / 2 - size * 0.09 : c - stroke / 2 - 1;
  const gap = labels ? 5 : 4;
  const seg = 360 / p.semesters;
  const amb = getAmbition(game.goals.ambition);
  const [mx, my] = point(c, r, p.done * seg + gap / 2 + (seg - gap) * p.partial);

  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id={`ring-fill-${size}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFD873" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
        </defs>
        {Array.from({ length: p.semesters }, (_, i) => {
          const from = i * seg + gap / 2;
          const to = (i + 1) * seg - gap / 2;
          const fill = i < p.done ? 1 : i === p.done ? p.partial : 0;
          return (
            <g key={i}>
              <path d={arc(c, r, from, to)} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
              {fill > 0 && (
                <path
                  d={arc(c, r, from, from + (to - from) * Math.max(0.02, fill))}
                  fill="none"
                  stroke={i === p.done ? `url(#ring-fill-${size})` : '#F5B83D'}
                  strokeOpacity={i === p.done ? 1 : 0.85}
                  strokeWidth={stroke}
                />
              )}
            </g>
          );
        })}
        {/* Year-end milestones: one dot per year, on the gap after its second semester. */}
        {labels &&
          Array.from({ length: p.years }, (_, y) => {
            const deg = (y + 1) * 2 * seg;
            const [x, yy] = point(c, r, deg % 360);
            const level: number | 'final' = y + 1 === p.years ? 'final' : y + 1;
            const ms = amb.milestones.find((m) => m.level === level);
            const st = ms ? game.goals.milestones[ms.id] : undefined;
            const colour = st === 'done' ? '#34D399' : st === 'missed' ? '#F87171' : '#2A3A48';
            return (
              <g key={y}>
                <circle cx={x} cy={yy} r={stroke * 0.75} fill={colour} stroke={y + 1 === p.years ? '#F5B83D' : 'rgba(255,255,255,0.6)'} strokeWidth={1.5} />
                {y + 1 === p.years && (
                  <text x={x} y={yy + stroke * 0.32} textAnchor="middle" fontSize={stroke * 0.9}>
                    🎓
                  </text>
                )}
              </g>
            );
          })}
        {labels &&
          Array.from({ length: p.years }, (_, y) => {
            const [x, yy] = point(c, r + stroke / 2 + 8, (y * 2 + 1) * seg);
            const here = game.academics.level === y + 1;
            return (
              <text key={y} x={x} y={yy + 3.5} textAnchor="middle" fontSize={9} fontWeight={here ? 800 : 600} fill={here ? '#F5B83D' : '#B4C2CC'}>
                {(y + 1) * 100}L
              </text>
            );
          })}
        {/* You are here. */}
        {game.phase !== 'graduated' && (
          <>
            <circle cx={mx} cy={my} r={stroke * 0.95} fill="#F5B83D" opacity={0.35} className="ring-pulse" style={{ transformOrigin: `${mx}px ${my}px` }} />
            <circle cx={mx} cy={my} r={stroke * 0.62} fill="#FFFFFF" stroke="#F5B83D" strokeWidth={2} />
          </>
        )}
      </svg>
      {labels ? (
        <span className="relative flex flex-col items-center text-center leading-tight">
          <span className="text-[10px] font-semibold tracking-wider text-muted uppercase">{game.phase === 'graduated' ? 'Graduated' : 'Level'}</span>
          <span className="text-3xl font-black text-sun">{game.academics.level}00</span>
          <span className="text-[10px] font-semibold">
            Sem {game.clock.semester} · Day {Math.min(game.clock.day, SEMESTER_DAYS)}/{SEMESTER_DAYS}
          </span>
          <span className="mt-0.5 rounded-full bg-white/10 px-2 py-px text-[10px] font-bold text-muted">{Math.round(p.share * 100)}% of degree</span>
        </span>
      ) : (
        children
      )}
    </span>
  );
}
