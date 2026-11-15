// Getting around the campus: the road squares from the planner form the
// walking network; buildings block the joystick; doors are found by distance.
// Pure TypeScript, no three.js. Units are metres.
import { PLACES } from '../../content/places';
import { buildings, cellCentre, mapBounds, roadCells, sectionAt, type Pt, type Rect } from '../../content/campusMap';

// ---------- road network ----------

export interface RoadNode {
  at: Pt;
  /** Indexes of the nodes joined to this one. */
  next: number[];
}

function buildGraph(): RoadNode[] {
  const index = new Map<string, number>();
  const cells: Array<[number, number]> = [];
  for (const key of roadCells) {
    const [x, y] = key.split(',').map(Number) as [number, number];
    index.set(key, cells.length);
    cells.push([x, y]);
  }
  const nodes: RoadNode[] = cells.map(([x, y]) => ({ at: cellCentre(x, y), next: [] }));
  const link = (a: number, b: number) => {
    if (a === b || nodes[a]!.next.includes(b)) return;
    nodes[a]!.next.push(b);
    nodes[b]!.next.push(a);
  };
  cells.forEach(([x, y], i) => {
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1],
    ] as const) {
      const j = index.get(`${x + dx},${y + dy}`);
      if (j === undefined) continue;
      // Diagonal steps only where they don't cut a corner.
      if (dx && dy && !(index.has(`${x + dx},${y}`) && index.has(`${x},${y + dy}`))) continue;
      link(i, j);
    }
  });

  // Join any separate piece of road to the biggest piece at their closest squares.
  for (;;) {
    const comp = new Int32Array(nodes.length).fill(-1);
    const sizes: number[] = [];
    for (let s = 0; s < nodes.length; s++) {
      if (comp[s] !== -1) continue;
      const id = sizes.length;
      let size = 0;
      const stack = [s];
      comp[s] = id;
      while (stack.length) {
        const cur = stack.pop()!;
        size++;
        for (const nb of nodes[cur]!.next) {
          if (comp[nb] === -1) {
            comp[nb] = id;
            stack.push(nb);
          }
        }
      }
      sizes.push(size);
    }
    if (sizes.length <= 1) break;
    const main = sizes.indexOf(Math.max(...sizes));
    const other = sizes.findIndex((_, i) => i !== main);
    let best: [number, number] = [-1, -1];
    let bestD = Infinity;
    nodes.forEach((a, i) => {
      if (comp[i] !== other) return;
      nodes.forEach((b, j) => {
        if (comp[j] !== main) return;
        const d = Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1]);
        if (d < bestD) {
          bestD = d;
          best = [i, j];
        }
      });
    });
    link(best[0], best[1]);
  }
  return nodes;
}

export const roadGraph: RoadNode[] = buildGraph();

export function nearestNode(p: Pt): number {
  let best = 0;
  let d = Infinity;
  roadGraph.forEach((n, i) => {
    const dd = Math.hypot(n.at[0] - p[0], n.at[1] - p[1]);
    if (dd < d) {
      d = dd;
      best = i;
    }
  });
  return best;
}

/** Drops waypoints that sit on a straight line between their neighbours. */
function simplify(points: Pt[]): Pt[] {
  if (points.length < 3) return points;
  const out: Pt[] = [points[0]!];
  for (let i = 1; i < points.length - 1; i++) {
    const a = out[out.length - 1]!;
    const b = points[i]!;
    const c = points[i + 1]!;
    const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (Math.abs(cross) > 1e-6) out.push(b);
  }
  out.push(points[points.length - 1]!);
  return out;
}

/**
 * Waypoints from `from` to `to` along the roads: walk to the nearest road
 * square, follow the shortest route, then walk to `to`. Short hops are a
 * straight line.
 */
export function findPath(from: Pt, to: Pt): Pt[] {
  if (Math.hypot(to[0] - from[0], to[1] - from[1]) < 18) return [to];
  const start = nearestNode(from);
  const goal = nearestNode(to);
  if (start === goal) return [to];
  const n = roadGraph.length;
  const g = new Float64Array(n).fill(Infinity);
  const f = new Float64Array(n).fill(Infinity);
  const came = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const open = new Set<number>([start]);
  const h = (i: number) => Math.hypot(roadGraph[i]!.at[0] - roadGraph[goal]!.at[0], roadGraph[i]!.at[1] - roadGraph[goal]!.at[1]);
  g[start] = 0;
  f[start] = h(start);
  while (open.size) {
    let cur = -1;
    let best = Infinity;
    for (const i of open) {
      if (f[i]! < best) {
        best = f[i]!;
        cur = i;
      }
    }
    if (cur === goal) break;
    open.delete(cur);
    closed[cur] = 1;
    for (const nb of roadGraph[cur]!.next) {
      if (closed[nb]) continue;
      const step = Math.hypot(roadGraph[nb]!.at[0] - roadGraph[cur]!.at[0], roadGraph[nb]!.at[1] - roadGraph[cur]!.at[1]);
      if (g[cur]! + step < g[nb]!) {
        g[nb] = g[cur]! + step;
        f[nb] = g[nb]! + h(nb);
        came[nb] = cur;
        open.add(nb);
      }
    }
  }
  if (came[goal] === -1) return [to];
  const route: Pt[] = [];
  for (let i = goal; i !== -1; i = came[i]!) route.push(roadGraph[i]!.at);
  route.reverse();
  return [...simplify(route), to];
}

// ---------- walls ----------

/** Every building volume. Fields, gardens, stops, gates and the market can be walked into. */
const solid: Rect[] = buildings.flatMap((b) => b.blocks.map((k) => k.rect));
const PLAYER_RADIUS = 0.6;

/** True if a person standing at x, z would be inside (or touching) a building. */
export function isBlocked(x: number, z: number): boolean {
  const r = PLAYER_RADIUS;
  for (const s of solid) if (x > s.x0 - r && x < s.x1 + r && z > s.z0 - r && z < s.z1 + r) return true;
  return false;
}

// ---------- doors, sections, bounds ----------

/** The place whose door is within `range` metres, nearest first. */
export function nearestDoor(x: number, z: number, range: number): string | null {
  let best: string | null = null;
  let bestD = range;
  for (const p of PLACES) {
    const d = Math.hypot(p.position[0] - x, p.position[1] - z);
    if (d < bestD) {
      bestD = d;
      best = p.id;
    }
  }
  return best;
}

/** Which section a point is in (or nearest to). */
export function zoneAt(x: number, z: number): string {
  return sectionAt([x, z]).id;
}

const MARGIN = 20;

/** The whole map with a small margin, as min/max bounds. */
export function campusBounds(): { minX: number; maxX: number; minZ: number; maxZ: number } {
  return { minX: mapBounds.x0 - MARGIN, maxX: mapBounds.x1 + MARGIN, minZ: mapBounds.z0 - MARGIN, maxZ: mapBounds.z1 + MARGIN };
}
