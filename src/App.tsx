import { useState } from 'react';
import { useGameStore } from './store/gameStore';
import { DebugLauncher } from './ui/debug/DebugLauncher';
import { LeaderboardScreen } from './ui/LeaderboardScreen';
import { PlayScreen } from './ui/PlayScreen';
import { ResultsScreen } from './ui/ResultsScreen';
import { StartScreen } from './ui/StartScreen';

// Picks which screen to show from the saved game.
function Screen() {
  const game = useGameStore((s) => s.game);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  if (showLeaderboard) {
    return <LeaderboardScreen departmentId={game?.player.departmentId} onBack={() => setShowLeaderboard(false)} />;
  }
  if (!game) return <StartScreen onLeaderboard={() => setShowLeaderboard(true)} />;
  if (game.finished) return <ResultsScreen game={game} onLeaderboard={() => setShowLeaderboard(true)} />;
  return <PlayScreen game={game} />;
}

export default function App() {
  return (
    <>
      <Screen />
      {/* Only appears with ?debug=1 in the address. */}
      <DebugLauncher />
    </>
  );
}
