// Pop-up card for an event. Time waits until the player chooses.
import { canChoose, pendingEventDef } from '../game/events';
import { describeEffects, naira } from '../game/format';
import type { GameState } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { EffectChips } from './lifeUi';

export function EventCard({ game }: { game: GameState }) {
  const chooseEvent = useGameStore((s) => s.chooseEvent);
  const event = pendingEventDef(game);
  if (!event) return null;

  return (
    <div className="fade-in fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <section role="alertdialog" aria-labelledby="event-title" className="pop-in flex max-h-[85dvh] w-full max-w-sm flex-col gap-2.5 overflow-y-auto overscroll-contain rounded-3xl border border-sun/50 bg-panel p-4 shadow-2xl">
        <p className="text-[10px] font-bold tracking-wide text-sun uppercase">{event.category.replace('_', ' ')}</p>
        <h2 id="event-title" className="text-lg leading-tight font-bold">
          {event.title}
        </h2>
        <p className="text-sm text-white/85">{event.text}</p>
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
                <span className="text-sm font-semibold">{choice.label}</span>
                <EffectChips effects={describeEffects(choice.effects)} small />
                {!ok && <span className="text-xs font-semibold text-red-300">You need {naira(choice.cost ?? 0)}</span>}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
