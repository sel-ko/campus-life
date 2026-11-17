// The start menu when there is a saved game: the same title screen as a
// first visit, floating over the live campus (with your student in it), but
// with Continue, New game and the tour.
import { lazy, Suspense, useEffect } from 'react';
import { naira } from '../../game/format';
import { slotName } from '../../game/time';
import { onlineConfigured } from '../../online/supabase';
import { useGameStore } from '../../store/gameStore';
import { lookOf } from '../../world/characters/look';
import { ErrorBoundary } from '../ErrorBoundary';
import { Portrait } from '../Portrait';
import { hasWebGL } from '../webgl';
import { DISCLAIMER, TITLE_CARD, TITLE_PRIMARY, TITLE_SECONDARY, TitleLayout } from './TitleScreen';

const CampusScene = lazy(() => import('../../world/CampusScene'));

export function SavedGameMenu({ onContinue, onLeaderboard }: { onContinue: (tour: boolean) => void; onLeaderboard: () => void }) {
  const game = useGameStore((s) => s.game);
  const reset = useGameStore((s) => s.reset);
  const setCameraMode = useGameStore((s) => s.setCameraMode);
  // Look over the campus from above while the menu is up.
  useEffect(() => setCameraMode('overview'), [setCameraMode]);
  if (!game) return null;

  const go = (tour: boolean) => {
    setCameraMode('follow');
    onContinue(tour);
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-[radial-gradient(ellipse_at_50%_30%,#2B4558_0%,#14202B_60%,#0B1218_100%)]">
      {hasWebGL() && (
        <div className="absolute inset-0">
          <ErrorBoundary fallback={null}>
            <Suspense fallback={null}>
              <CampusScene paused={false} />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}
      {/* Drags between the logo and the card reach the campus. */}
      <div className="pointer-events-none absolute inset-0 overflow-y-auto px-3">
        <TitleLayout>
          <section className={TITLE_CARD}>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-2 pr-3">
              <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-b from-[#3A5A72] to-[#1C2D3B]">
                <Portrait look={lookOf(game.player)} size={46} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-[10px] font-bold tracking-widest text-sun uppercase">Saved game</span>
                <span className="truncate text-base leading-tight font-bold">{game.player.name}</span>
                <span className="truncate text-xs text-white/65">
                  {game.academics.level}00 level · day {game.clock.day}, {slotName(game.clock).toLowerCase()} · {naira(game.money)}
                </span>
              </span>
            </div>
            <button onClick={() => go(false)} className={TITLE_PRIMARY}>
              Continue <span aria-hidden="true">→</span>
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (window.confirm('Start a new game? This saved game will be lost.')) reset();
                }}
                className={TITLE_SECONDARY}
              >
                <span aria-hidden="true">✨</span> New game
              </button>
              <button onClick={() => go(true)} className={TITLE_SECONDARY}>
                <span aria-hidden="true">🗺️</span> Tour
              </button>
              {onlineConfigured() && (
                <button onClick={onLeaderboard} className={TITLE_SECONDARY.replace('flex-1', 'w-11 flex-none').replace('px-3', 'px-0')} aria-label="Leaderboard">
                  <span aria-hidden="true">🏆</span>
                </button>
              )}
            </div>
            <p className="text-center text-[10px] leading-tight text-white/45">{DISCLAIMER}</p>
          </section>
        </TitleLayout>
      </div>
    </div>
  );
}
