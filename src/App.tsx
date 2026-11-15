import { useState } from 'react';
import { useGameStore } from './store/gameStore';
import { AdmissionFlow } from './ui/admission/AdmissionFlow';
import { LeaderboardScreen } from './ui/LeaderboardScreen';
import { PlayScreen } from './ui/PlayScreen';
import { SummaryScreen } from './ui/SummaryScreen';

// Picks which screen to show from the saved game.
function Screen() {
  const game = useGameStore((s) => s.game);
  const reset = useGameStore((s) => s.reset);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  if (showLeaderboard) return <LeaderboardScreen onBack={() => setShowLeaderboard(false)} />;
  if (!game) return <AdmissionFlow onLeaderboard={() => setShowLeaderboard(true)} />;
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
