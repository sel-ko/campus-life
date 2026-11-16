// Your school bag: what you are carrying. Clearance papers, books and
// handouts, food, medicine and other things, each with how many you have.
import { SHOP_ITEMS } from '../content/food';
import type { GameState } from '../game/types';

const ITEMS: Record<string, { emoji: string; group: 'Papers' | 'Books' | 'Food' | 'Health' | 'Other' }> = {
  photocopy: { emoji: '📄', group: 'Papers' },
  passport: { emoji: '🖼️', group: 'Papers' },
  receipt: { emoji: '🧾', group: 'Papers' },
  manual: { emoji: '📗', group: 'Books' },
  noodles: { emoji: '🍜', group: 'Food' },
  garri: { emoji: '🥣', group: 'Food' },
  bread: { emoji: '🍞', group: 'Food' },
  eggs: { emoji: '🥚', group: 'Food' },
  water_bag: { emoji: '💧', group: 'Food' },
  paracetamol: { emoji: '💊', group: 'Health' },
  vitamins: { emoji: '🧴', group: 'Health' },
  padlock: { emoji: '🔒', group: 'Other' },
  car: { emoji: '🚗', group: 'Other' },
  phone_upgrade: { emoji: '📱', group: 'Other' },
};

const GROUPS = ['Papers', 'Books', 'Food', 'Health', 'Other'] as const;

/** Everything in the bag, plus handouts and course books you own. */
export function bagItems(game: GameState): Array<{ id: string; name: string; emoji: string; count: number; group: (typeof GROUPS)[number] }> {
  const out = Object.entries(game.inventory)
    .filter(([id, n]) => n > 0 && id !== 'airtime')
    .map(([id, n]) => ({
      id,
      name: SHOP_ITEMS[id]?.name.replace(/ \(.*\)/, '') ?? id,
      emoji: ITEMS[id]?.emoji ?? '📦',
      count: n,
      group: ITEMS[id]?.group ?? ('Other' as const),
    }));
  for (const c of game.academics.courses) {
    if (c.handout.status === 'bought') out.push({ id: `handout-${c.code}`, name: `${c.code} handout`, emoji: '📘', count: 1, group: 'Books' });
  }
  if (game.clearance.library) out.push({ id: 'library-card', name: 'Library card', emoji: '🪪', count: 1, group: 'Papers' });
  return out;
}

/** The bag opens as a dropdown under the top bar: each thing once, with how many. */
export function BagSheet({ game, onClose }: { game: GameState; onClose: () => void }) {
  const items = bagItems(game);
  return (
    <>
      <div className="pointer-events-auto fixed inset-0 z-30" onClick={onClose} aria-hidden="true" />
      <section
        role="dialog"
        aria-label="Your school bag"
        className="pointer-events-auto fixed top-[calc(max(0.75rem,env(safe-area-inset-top))+3.25rem)] right-3 z-30 max-h-[60vh] w-[min(18rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-white/10 bg-[#16181F]/95 p-3 shadow-2xl"
      >
        <p className="mb-2 text-sm font-bold">🎒 School bag</p>
        {items.length === 0 && <p className="text-xs text-muted">Empty. Photocopies and passport photos are at the business centre.</p>}
        {GROUPS.map((g) => {
          const list = items.filter((i) => i.group === g);
          if (!list.length) return null;
          return (
            <div key={g} className="mb-2">
              <p className="mb-1 text-[10px] font-semibold tracking-wide text-muted uppercase">{g}</p>
              <ul className="flex flex-col gap-1">
                {list.map((i) => (
                  <li key={i.id} className="flex items-center gap-2 rounded-xl bg-white/5 px-2 py-1.5">
                    <span className="text-lg" aria-hidden="true">
                      {i.emoji}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{i.name}</span>
                    <span className="rounded-full bg-sun/20 px-2 text-xs font-bold text-sun">×{i.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </>
  );
}
