// Pop-up card for an event. Time waits until the player chooses.
import { canChoose, pendingEventDef } from '../game/events';
import { describeEffects, naira } from '../game/format';
import type { GameState } from '../game/types';
import { useGameStore } from '../store/gameStore';

export function EventCard({ game }: { game: GameState }) {
  const chooseEvent = useGameStore((s) => s.chooseEvent);
  const event = pendingEventDef(game);
  if (!event) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
      <section role="alertdialog" aria-labelledby="event-title" className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-sun/60 bg-panel p-5 shadow-2xl">
        <p className="text-xs font-bold tracking-wide text-sun uppercase">{event.category.replace('_', ' ')}</p>
        <h2 id="event-title" className="text-xl font-bold">
          {event.title}
        </h2>
        <p>{event.text}</p>
        <div className="flex flex-col gap-2">
          {event.choices.map((choice, i) => {
            const ok = canChoose(game, i);
            return (
              <button
                key={choice.label}
                disabled={!ok}
                onClick={() => chooseEvent(i)}
                className="flex min-h-11 flex-col items-start gap-1 rounded-xl border border-line bg-night px-3 py-2 text-left disabled:opacity-50"
              >
                <span className="font-semibold">{choice.label}</span>
                <span className="text-xs text-muted">{describeEffects(choice.effects).join(' · ')}</span>
                {!ok && <span className="text-xs font-semibold text-red-300">You need {naira(choice.cost ?? 0)}</span>}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
