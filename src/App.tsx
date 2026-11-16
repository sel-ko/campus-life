import { useEffect, useState } from 'react';
import { naira } from './game/format';
import { slotName } from './game/time';
import { useGameStore } from './store/gameStore';
import { useSettings } from './store/settingsStore';
import { AdmissionFlow } from './ui/admission/AdmissionFlow';
import { LeaderboardScreen } from './ui/LeaderboardScreen';
import { PlayScreen } from './ui/PlayScreen';
import { SummaryScreen } from './ui/SummaryScreen';

// While developing, every page load starts a brand-new game from the
// admission screen (and shows the tour again). The published game keeps the
// save and opens on a start menu instead.
// (Hot reloads while editing keep the game: only a real page load resets.)
const fresh = window as { __campusFresh?: boolean };
if (import.meta.env.DEV && !fresh.__campusFresh) {
  fresh.__campusFresh = true;
  useGameStore.getState().reset();
  useSettings.getState().setTourDone(false);
}

// Picks which screen to show from the saved game.
function Screen() {
  const game = useGameStore((s) => s.game);
  const reset = useGameStore((s) => s.reset);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  // Every page load opens on the start menu, even with a saved game.
  const [started, setStarted] = useState(false);
  // A game made in this visit (after the admission test) goes straight in.
  useEffect(() => {
    if (!game) setStarted(true);
  }, [game]);

  if (showLeaderboard) return <LeaderboardScreen onBack={() => setShowLeaderboard(false)} />;
  if (!game) return <AdmissionFlow onLeaderboard={() => setShowLeaderboard(true)} />;
  if (!started) {
    return (
      <main className="mx-auto flex min-h-full max-w-md flex-col gap-4 px-4 py-6">
        <header className="flex flex-col gap-2 pt-10">
          <p className="text-sm font-semibold tracking-wide text-sun">Admission to university</p>
          <h1 className="text-5xl font-extrabold">Campus Life</h1>
        </header>
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">Saved game</p>
          <p className="mt-1 text-lg font-bold">{game.player.name}</p>
          <p className="text-sm text-muted">
            {game.academics.level}00 level · day {game.clock.day}, {slotName(game.clock).toLowerCase()} · {naira(game.money)}
          </p>
        </section>
        <button onClick={() => setStarted(true)} className="min-h-12 rounded-xl bg-sun px-6 font-bold text-night">
          Continue
        </button>
        <button
          onClick={() => {
            if (window.confirm('Start a new game? This saved game will be lost.')) reset();
          }}
          className="min-h-12 rounded-xl border border-white/20 px-6 font-semibold"
        >
          New game
        </button>
        <button
          onClick={() => {
            useSettings.getState().setTourDone(false);
            setStarted(true);
          }}
          className="min-h-11 self-center px-4 text-sm font-semibold text-muted underline"
        >
          Continue with the tour
        </button>
        <p className="mt-auto pt-4 text-center text-xs text-muted">Unofficial fan-made game. Not affiliated with any real university.</p>
      </main>
    );
  }
  if (game.phase !== 'playing' && game.summaries.length === 0) {
    return (
      <main className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-xl font-bold">{game.phase === 'graduated' ? 'You have graduated!' : 'This degree has ended.'}</p>
        <button onClick={reset} className="min-h-12 rounded-xl bg-sun px-6 font-bold text-night">
          Start a new life
        </button>
      </main>
    );
  }
  return (
    <>
      <PlayScreen game={game} />
      {game.summaries.length > 0 && <SummaryScreen game={game} />}
    </>
  );
}

export default function App() {
  return <Screen />;
}
