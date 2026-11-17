import { useEffect, useState } from 'react';
import { useGameStore } from './store/gameStore';
import { useSettings } from './store/settingsStore';
import { Landing } from './ui/admission/Landing';
import { SavedGameMenu } from './ui/admission/SavedGameMenu';
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
  if (!game) return <Landing onLeaderboard={() => setShowLeaderboard(true)} />;
  if (!started) {
    return (
      <SavedGameMenu
        onContinue={(tour) => {
          if (tour) useSettings.getState().setTourDone(false);
          setStarted(true);
        }}
        onLeaderboard={() => setShowLeaderboard(true)}
      />
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
