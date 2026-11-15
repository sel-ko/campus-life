import { useGameStore } from './store/gameStore';
import { PlayScreen } from './ui/PlayScreen';
import { ResultsScreen } from './ui/ResultsScreen';
import { StartScreen } from './ui/StartScreen';

// Picks which screen to show from the saved game.
export default function App() {
  const game = useGameStore((s) => s.game);
  if (!game) return <StartScreen />;
  if (game.finished) return <ResultsScreen game={game} />;
  return <PlayScreen game={game} />;
}
