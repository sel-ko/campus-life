// Your school bag: what you are carrying. Clearance papers, books and
// handouts, food, medicine and other things, each with how many you have.
import { SHOP_ITEMS } from '../content/food';
import type { GameState } from '../game/types';
import { SHEET } from './theme';

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

export function BagSheet({ game, onClose }: { game: GameState; onClose: () => void }) {
  const items = bagItems(game);
  return (
    <div className="pointer-events-auto fixed inset-0 z-30 bg-black/45" onClick={onClose}>
      <section role="dialog" aria-label="Your school bag" className={SHEET} onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl font-bold">🎒 School bag</h2>
          <button onClick={onClose} className="min-h-11 px-3 text-sm font-semibold text-muted">
            Close
          </button>
        </div>
        {items.length === 0 && <p className="text-sm text-muted">Empty. Buy photocopies and passport photographs at a business centre for clearance.</p>}
        {GROUPS.map((g) => {
          const list = items.filter((i) => i.group === g);
          if (!list.length) return null;
          return (
            <section key={g} className="mb-3">
              <h3 className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">{g}</h3>
              <ul className="grid grid-cols-2 gap-2">
                {list.map((i) => (
                  <li key={i.id} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <span className="text-2xl" aria-hidden="true">
                      {i.emoji}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{i.name}</span>
                    <span className="rounded-full bg-white/10 px-2 text-xs font-bold">×{i.count}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </section>
    </div>
  );
}
