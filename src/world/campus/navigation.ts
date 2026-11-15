// Getting around the real campus: a road network for walking to a tapped
// building, wall collision for the joystick, and "which door am I near".
// Pure TypeScript, no three.js. Scene units are metres.
import { campus, campusPlaces } from '../../content/campusPlaces';
import type { ZoneId } from '../../content/campus-data';
import { distToSegment, pointInPolygon, type Bounds, type LayoutBuilding, type Pt } from '../campusLayout';

// ---------- road network ----------

export interface RoadNode {
  at: Pt;
  /** Indexes of the nodes joined to this one. */
  next: number[];
}

const STEP = 12; // a node every 12 m along each road
const JOIN = 10; // road ends this close (plus half the widths) to another road are joined to it
const CROSS = 3; // nodes of different roads this close are joined (crossings)

function buildGraph(): RoadNode[] {
  const nodes: RoadNode[] = [];
  const roadOf: number[] = [];
  const ends: number[] = [];
  const link = (a: number, b: number) => {
    if (a === b || nodes[a]!.next.includes(b)) return;
    nodes[a]!.next.push(b);
    nodes[b]!.next.push(a);
  };
  campus.roads.forEach((road, r) => {
    let prev = -1;
    for (let i = 0; i < road.points.length; i++) {
      const a = road.points[i]!;
      const b = road.points[i + 1];
      const pieces = b ? Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / STEP)) : 1;
      for (let k = 0; k < pieces; k++) {
        if (!b && k > 0) break;
        const t = k / pieces;
        const at: Pt = b ? [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] : a;
        nodes.push({ at, next: [] });
        roadOf.push(r);
        const idx = nodes.length - 1;
        if (prev >= 0) link(prev, idx);
        if (prev < 0) ends.push(idx);
        prev = idx;
      }
    }
    if (prev >= 0) ends.push(prev);
  });

  // Spatial hash so joining roads is quick.
  const CELL = 30;
  const grid = new Map<string, number[]>();
  const key = (x: number, z: number) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
  nodes.forEach((n, i) => {
    const k = key(n.at[0], n.at[1]);
    (grid.get(k) ?? grid.set(k, []).get(k)!).push(i);
  });
  const near = (p: Pt, radius: number): number[] => {
    const out: number[] = [];
    const r = Math.ceil(radius / CELL);
    const cx = Math.floor(p[0] / CELL);
    const cz = Math.floor(p[1] / CELL);
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) out.push(...(grid.get(`${cx + dx},${cz + dz}`) ?? []));
    return out;
  };

  // Road ends join the nearest node of any other road nearby (T-junctions).
  for (const e of ends) {
    const road = campus.roads[roadOf[e]!]!;
    let best = -1;
    let bestD = Infinity;
    for (const j of near(nodes[e]!.at, JOIN + 20)) {
      if (roadOf[j] === roadOf[e]) continue;
      const d = Math.hypot(nodes[j]!.at[0] - nodes[e]!.at[0], nodes[j]!.at[1] - nodes[e]!.at[1]);
      const reach = JOIN + road.width / 2 + campus.roads[roadOf[j]!]!.width / 2;
      if (d < reach && d < bestD) {
        bestD = d;
        best = j;
      }
    }
    if (best >= 0) link(e, best);
  }
  // Crossings: nodes of different roads very close together.
  nodes.forEach((n, i) => {
    for (const j of near(n.at, CROSS)) {
      if (j > i && roadOf[j] !== roadOf[i] && Math.hypot(nodes[j]!.at[0] - n.at[0], nodes[j]!.at[1] - n.at[1]) < CROSS) link(i, j);
    }
  });

  // Traced roads do not always quite meet. Join every stranded piece of road
  // to the main network at the closest pair of points, so every place can be
  // reached (the last bit is a short walk across open ground).
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
        for (const nb of nodes[cur]!.next) if (comp[nb] === -1) (comp[nb] = id), stack.push(nb);
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

/**
 * Waypoints from `from` to `to` along the roads: walk to the nearest road,
 * follow the shortest route, then walk to `to`. If the roads do not connect,
 * just `[to]` (a straight line).
 */
export function findPath(from: Pt, to: Pt): Pt[] {
  const start = nearestNode(from);
  const goal = nearestNode(to);
  const direct = Math.hypot(to[0] - from[0], to[1] - from[1]);
  if (start === goal || direct < 25) return [to];

  // A* search over the road nodes.
  const n = roadGraph.length;
  const g = new Float64Array(n).fill(Infinity);
  const f = new Float64Array(n).fill(Infinity);
  const came = new Int32Array(n).fill(-1);
  const open = new Set<number>([start]);
  const closed = new Uint8Array(n);
  const h = (i: number) => Math.hypot(roadGraph[i]!.at[0] - roadGraph[goal]!.at[0], roadGraph[i]!.at[1] - roadGraph[goal]!.at[1]);
  g[start] = 0;
  f[start] = h(start);
  while (open.size) {
    let cur = -1;
    let best = Infinity;
    for (const i of open) if (f[i]! < best) (best = f[i]!), (cur = i);
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
  return [...route, to];
}

// ---------- walls ----------

/** Solid outlines the player cannot walk through. Bus stop pads are walkable;
 *  in a compound only its blocks are solid (the yard is open). */
const solid: Array<{ footprint: Pt[] }> = campus.buildings
  .filter((b) => b.kind !== 'busstop')
  .flatMap((b: LayoutBuilding) => (b.compound ? b.compound.blocks : [b]));
const WALL_CELL = 50;
const wallGrid = new Map<string, Array<{ footprint: Pt[] }>>();
for (const b of solid) {
  const xs = b.footprint.map((p) => p[0]);
  const zs = b.footprint.map((p) => p[1]);
  for (let cx = Math.floor(Math.min(...xs) / WALL_CELL); cx <= Math.floor(Math.max(...xs) / WALL_CELL); cx++) {
    for (let cz = Math.floor(Math.min(...zs) / WALL_CELL); cz <= Math.floor(Math.max(...zs) / WALL_CELL); cz++) {
      const k = `${cx},${cz}`;
      (wallGrid.get(k) ?? wallGrid.set(k, []).get(k)!).push(b);
    }
  }
}

const PLAYER_RADIUS = 0.6;

/** True if a person standing at x, z would be inside (or touching) a building. */
export function isBlocked(x: number, z: number): boolean {
  const list = wallGrid.get(`${Math.floor(x / WALL_CELL)},${Math.floor(z / WALL_CELL)}`);
  if (!list) return false;
  const p: Pt = [x, z];
  return list.some((b) => {
    if (pointInPolygon(p, b.footprint)) return true;
    for (let i = 0; i < b.footprint.length; i++) {
      if (distToSegment(p, b.footprint[i]!, b.footprint[(i + 1) % b.footprint.length]!) < PLAYER_RADIUS) return true;
    }
    return false;
  });
}

// ---------- doors and zones ----------

/** The place whose door is within `range` metres, nearest first. */
export function nearestDoor(x: number, z: number, range: number): string | null {
  let best: string | null = null;
  let bestD = range;
  for (const p of campusPlaces) {
    const d = Math.hypot(p.position[0] - x, p.position[1] - z);
    if (d < bestD) {
      bestD = d;
      best = p.id;
    }
  }
  return best;
}

const MARGIN = 40;

/** Which section a point is in: the section of the nearest building. */
export function zoneAt(x: number, z: number): ZoneId {
  let best: ZoneId = 'estate';
  let bestD = Infinity;
  for (const b of campus.buildings) {
    const d = Math.hypot(b.center[0] - x, b.center[1] - z);
    if (d < bestD) {
      bestD = d;
      best = b.zone;
    }
  }
  return best;
}

/** A section's area with a small margin, for keeping the camera on it. */
export function zoneBounds(zone: ZoneId): Bounds {
  const b = campus.zoneBounds[zone];
  return { minX: b.minX - MARGIN, maxX: b.maxX + MARGIN, minZ: b.minZ - MARGIN, maxZ: b.maxZ + MARGIN };
}

export function campusBounds(): Bounds {
  const b = campus.bounds;
  return { minX: b.minX - MARGIN, maxX: b.maxX + MARGIN, minZ: b.minZ - MARGIN, maxZ: b.maxZ + MARGIN };
}
