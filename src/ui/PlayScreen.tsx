import type { GameState } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { EventCard } from './EventCard';
import { Hud } from './Hud';
import { LocationList } from './LocationList';
import { LocationSheet } from './LocationSheet';
import { RecentLog } from './RecentLog';

export function PlayScreen({ game }: { game: GameState }) {
  const reset = useGameStore((s) => s.reset);

  function quit() {
    if (window.confirm('Start over? Your current semester will be lost.')) reset();
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <Hud game={game} />
      <main className="flex flex-1 flex-col gap-5 px-4 py-4">
        <p className="text-sm text-muted">Where are you going? Dimmed places have nothing open right now.</p>
        <LocationList game={game} />
        <RecentLog game={game} />
        <button onClick={quit} className="mt-auto min-h-11 self-center px-4 text-sm text-muted underline">
          Start over
        </button>
      </main>
      <LocationSheet game={game} />
      <EventCard game={game} />
    </div>
  );
}
