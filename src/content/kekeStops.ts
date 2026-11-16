// Extra keke stops, so a keke can drop you near wherever you are going (it
// never drops you at the door: you walk from the stop). Worked out from the
// planner layout: in each part of campus, garden squares beside a road, as far
// as possible from the keke parks already there and from each other.
import planner from './campus-layout.json';
import type { BuildingRole } from './campus-overrides';
import type { TownItem } from './town';

interface Item {
  id: string;
  kind: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const items = planner.items as Item[];
const roads = new Set(planner.roads as string[]);
// Squares with a building on them. Gardens (trees) do not count: a stop can
// take the roadside corner of a garden.
const taken = new Set<string>();
for (const i of items) {
  if (i.kind === 'trees') continue;
  for (let x = i.x; x < i.x + i.w; x++) for (let y = i.y; y < i.y + i.h; y++) taken.add(`${x},${y}`);
}

const STOPS_PER_SECTION = 3;

function pickStops(): TownItem[] {
  const out: TownItem[] = [];
  const existing = items.filter((i) => i.kind === 'busstop').map((i) => [i.x, i.y] as const);
  for (const s of planner.sections) {
    const candidates: Array<[number, number]> = [];
    for (let x = s.x; x < s.x + s.w; x++) {
      for (let y = s.y; y < s.y + s.h; y++) {
        const k = `${x},${y}`;
        if (roads.has(k) || taken.has(k)) continue;
        const byRoad = [`${x + 1},${y}`, `${x - 1},${y}`, `${x},${y + 1}`, `${x},${y - 1}`].some((n) => roads.has(n));
        if (byRoad) candidates.push([x, y]);
      }
    }
    const chosen: Array<readonly [number, number]> = [...existing];
    for (let n = 0; n < STOPS_PER_SECTION && candidates.length; n++) {
      // The square furthest from every stop so far.
      let best = candidates[0]!;
      let bestD = -1;
      for (const c of candidates) {
        const d = Math.min(...chosen.map(([x, y]) => Math.hypot(c[0] - x, c[1] - y)), 99);
        if (d > bestD) {
          bestD = d;
          best = c;
        }
      }
      if (bestD < 5) break; // close enough to a stop already
      chosen.push(best);
      taken.add(`${best[0]},${best[1]}`);
      out.push({ id: `keke-${s.id}-${n + 1}`, kind: 'busstop', name: 'Keke Stop', x: best[0], y: best[1], w: 1, h: 1, floors: 0 });
    }
  }
  return out;
}

export const KEKE_ITEMS: TownItem[] = pickStops();

export const KEKE_ROLES: Record<string, BuildingRole> = Object.fromEntries(KEKE_ITEMS.map((k, i) => [k.id, { name: `Keke Stop ${i + 1}`, type: 'busstop' }]));
