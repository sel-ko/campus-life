import { canChoose, getPendingEvent } from '../game/engine';
import { describeEffects } from '../game/format';
import type { GameState } from '../game/types';
import { useGameStore } from '../store/gameStore';

// Pop-up card for a random campus event. Time waits until the player chooses.
export function EventCard({ game }: { game: GameState }) {
  const chooseEvent = useGameStore((s) => s.chooseEvent);
  const event = getPendingEvent(game);
  if (!event) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4">
      <section
        role="alertdialog"
        aria-labelledby="event-text"
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-sun/60 bg-panel p-5 shadow-2xl"
      >
        <p className="text-xs font-bold tracking-wide text-sun uppercase">Wahala alert</p>
        <p id="event-text" className="text-lg font-semibold">
          {event.text}
        </p>
        <div className="flex flex-col gap-2">
          {event.choices.map((choice, i) => {
            const check = canChoose(game, choice);
            return (
              <button
                key={choice.label}
                disabled={!check.ok}
                onClick={() => chooseEvent(i as 0 | 1)}
                className="flex min-h-11 flex-col items-start gap-1 rounded-xl border border-line bg-night px-3 py-2 text-left disabled:opacity-50"
              >
                <span className="font-semibold">{choice.label}</span>
                <span className="text-xs text-muted">{describeEffects(choice.effects).join(' · ')}</span>
                {!check.ok && <span className="text-xs font-semibold text-red-300">{check.reason}</span>}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
