// The campus map, read from the layout drawn in the Campus Planner
// (saved here as campus-layout.json). Pure TypeScript, no three.js: it works out
// sections, buildings (split into blocks), doors, roads and the game places.
//
// Units: metres. One planner square is 10 m. The map is centred on 0, 0,
// with x running east and z running south (north is up on the planner).
import type { LocationType } from '../game/legacy/types';
import raw from './campus-layout.json';

export type Pt = [number, number];
export interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export type PlannerKind =
  | 'classroom'
  | 'lecture'
  | 'library'
  | 'faculty'
  | 'lab'
  | 'apartment'
  | 'business'
  | 'market'
  | 'buka'
  | 'field'
  | 'admin'
  | 'clinic'
  | 'busstop'
  | 'gate'
  | 'trees';

interface RawItem {
  id: string;
  kind: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  floors: number;
}
interface RawSection {
  id: string;
  name: string;
  short?: string;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
interface RawLayout {
  grid: { cols: number; rows: number; cellMetres: number };
  sections: RawSection[];
  items: RawItem[];
  roads: string[];
}

const layout = raw as RawLayout;
export const CELL = layout.grid.cellMetres;
export const COLS = layout.grid.cols;
export const ROWS = layout.grid.rows;
const OX = (COLS * CELL) / 2;
const OZ = (ROWS * CELL) / 2;

/** Planner squares to metres. */
export function cellRect(x: number, y: number, w: number, h: number): Rect {
  return { x0: x * CELL - OX, z0: y * CELL - OZ, x1: (x + w) * CELL - OX, z1: (y + h) * CELL - OZ };
}
export function cellCentre(cx: number, cy: number): Pt {
  return [(cx + 0.5) * CELL - OX, (cy + 0.5) * CELL - OZ];
}
export function cellOf(x: number, z: number): [number, number] {
  return [Math.floor((x + OX) / CELL), Math.floor((z + OZ) / CELL)];
}

/** The planner's default floors per kind (used to tell "left alone" from "set by you"). */
const PLANNER_DEFAULT_FLOORS: Record<PlannerKind, number> = {
  classroom: 2,
  lecture: 1,
  library: 3,
  faculty: 3,
  lab: 2,
  apartment: 3,
  business: 1,
  market: 1,
  buka: 1,
  field: 0,
  admin: 2,
  clinic: 1,
  busstop: 0,
  gate: 0,
  trees: 0,
};

/** Floors chosen when the planner default was left alone, so heights vary. */
const FLOOR_RANGE: Partial<Record<PlannerKind, [number, number]>> = {
  classroom: [2, 3],
  lecture: [1, 1],
  library: [3, 4],
  faculty: [3, 4],
  lab: [1, 3],
  apartment: [2, 5],
  business: [1, 2],
  buka: [1, 1],
  admin: [2, 4],
  clinic: [1, 2],
  market: [1, 1],
};

export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

// ---------- sections ----------

export interface MapSection {
  id: string;
  name: string;
  short: string;
  color: string;
  rect: Rect;
}

export const sections: MapSection[] = layout.sections.map((s) => ({
  id: s.id,
  name: s.name,
  short: s.short || s.name,
  color: s.color,
  rect: cellRect(s.x, s.y, s.w, s.h),
}));

function rectCentre(r: Rect): Pt {
  return [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2];
}
function distToRect(p: Pt, r: Rect): number {
  const dx = Math.max(r.x0 - p[0], 0, p[0] - r.x1);
  const dz = Math.max(r.z0 - p[1], 0, p[1] - r.z1);
  return Math.hypot(dx, dz);
}

/** The section a point is in, or the nearest one. */
export function sectionAt(p: Pt): MapSection {
  let best = sections[0]!;
  let d = Infinity;
  for (const s of sections) {
    const dd = distToRect(p, s.rect);
    if (dd < d) {
      d = dd;
      best = s;
    }
  }
  return best;
}

// ---------- roads ----------

export const roadCells = new Set(layout.roads);
export const isRoad = (cx: number, cy: number) => roadCells.has(`${cx},${cy}`);

// ---------- buildings ----------

export type Side = 'n' | 's' | 'e' | 'w';

export interface Block {
  rect: Rect;
  floors: number;
  /** Picks the design details for this block. */
  seed: number;
}

export interface MapBuilding {
  id: string;
  kind: PlannerKind;
  name: string;
  /** The planner squares it covers, in metres. */
  plot: Rect;
  /** Planner squares (for road checks). */
  cells: { x: number; y: number; w: number; h: number };
  floors: number;
  sectionId: string;
  /** The side facing a road, and where people stand to go in. */
  doorSide: Side;
  door: Pt;
  /** The actual building volumes inside the plot. */
  blocks: Block[];
  seed: number;
}

function floorsFor(item: RawItem, kind: PlannerKind, seed: number): number {
  const range = FLOOR_RANGE[kind];
  if (!range) return item.floors;
  // Set by you in the planner: keep it. Left at the default: vary it.
  if (item.floors !== PLANNER_DEFAULT_FLOORS[kind]) return item.floors;
  return range[0] + (seed % (range[1] - range[0] + 1));
}

/** Sides of the plot, best first: most road along it (ties: south first). */
function doorSidesFor(c: { x: number; y: number; w: number; h: number }): Side[] {
  const count = (cells: Array<[number, number]>) => cells.filter(([x, y]) => isRoad(x, y)).length;
  const along = (side: Side): Array<[number, number]> => {
    const out: Array<[number, number]> = [];
    if (side === 'n') for (let x = c.x; x < c.x + c.w; x++) out.push([x, c.y - 1]);
    if (side === 's') for (let x = c.x; x < c.x + c.w; x++) out.push([x, c.y + c.h]);
    if (side === 'w') for (let y = c.y; y < c.y + c.h; y++) out.push([c.x - 1, y]);
    if (side === 'e') for (let y = c.y; y < c.y + c.h; y++) out.push([c.x + c.w, y]);
    return out;
  };
  const order: Side[] = ['s', 'e', 'w', 'n'];
  const scored = order.map((side, i) => ({ side, score: count(along(side)), i })).sort((a, b) => b.score - a.score || a.i - b.i);
  if (scored[0]!.score > 0) return scored.map((x) => x.side);
  // No road right beside it: face the nearest road square.
  let nearest: Side = 's';
  let d = Infinity;
  const mid: Pt = [c.x + c.w / 2, c.y + c.h / 2];
  for (const key of roadCells) {
    const [x, y] = key.split(',').map(Number) as [number, number];
    const dd = Math.hypot(x + 0.5 - mid[0], y + 0.5 - mid[1]);
    if (dd < d) {
      d = dd;
      const dx = x + 0.5 - mid[0];
      const dy = y + 0.5 - mid[1];
      nearest = Math.abs(dx) * c.h > Math.abs(dy) * c.w ? (dx > 0 ? 'e' : 'w') : dy > 0 ? 's' : 'n';
    }
  }
  return [nearest, ...order.filter((s) => s !== nearest)];
}

const DOOR_OUT = 2.2; // metres in front of the building's wall

/** Where people stand: in front of the middle of the building's wall on that side. */
function doorPoint(body: Rect, side: Side): Pt {
  const [cx, cz] = rectCentre(body);
  if (side === 'n') return [cx, body.z0 - DOOR_OUT];
  if (side === 's') return [cx, body.z1 + DOOR_OUT];
  if (side === 'w') return [body.x0 - DOOR_OUT, cz];
  return [body.x1 + DOOR_OUT, cz];
}

/** The outline around all of a building's blocks (or its plot if it has none). */
function bodyOf(plot: Rect, blocks: Block[]): Rect {
  if (!blocks.length) return plot;
  return {
    x0: Math.min(...blocks.map((k) => k.rect.x0)),
    z0: Math.min(...blocks.map((k) => k.rect.z0)),
    x1: Math.max(...blocks.map((k) => k.rect.x1)),
    z1: Math.max(...blocks.map((k) => k.rect.z1)),
  };
}

/**
 * The building volumes inside a plot: inset from the plot edge (by a varying
 * margin, so neighbours don't touch and sizes differ) and, for long apartment
 * and classroom plots, split into several separate blocks.
 */
function blocksFor(id: string, kind: PlannerKind, plot: Rect, floors: number, seed: number): Block[] {
  if (['field', 'trees', 'busstop', 'gate', 'market'].includes(kind)) return [];
  const small = plot.x1 - plot.x0 <= CELL + 0.01 && plot.z1 - plot.z0 <= CELL + 0.01;
  // A margin that varies by building, but never leaves less than 6 m of building.
  // Single-square shops are 5 m kiosks with alleys between them.
  const minSide = Math.min(plot.x1 - plot.x0, plot.z1 - plot.z0);
  const inset = small ? 2.5 : Math.max(1, Math.min(2 + (seed % 3) * 0.75, (minSide - 6) / 2));
  const r: Rect = { x0: plot.x0 + inset, z0: plot.z0 + inset, x1: plot.x1 - inset, z1: plot.z1 - inset };
  const w = r.x1 - r.x0;
  const d = r.z1 - r.z0;
  if (!['apartment', 'classroom'].includes(kind) || Math.max(w, d) < 42) {
    return [{ rect: r, floors, seed }];
  }
  // Split the long side into pieces about 24-30 m long with 6 m gaps; very
  // deep apartment plots also split across into two rows.
  const GAP = 6;
  const alongX = w >= d;
  const long = alongX ? w : d;
  const across = alongX ? d : w;
  const pieces = Math.max(2, Math.round(long / (24 + (seed % 3) * 3)));
  const rows = kind === 'apartment' && across >= 34 ? 2 : 1;
  const pieceLen = (long - GAP * (pieces - 1)) / pieces;
  const rowLen = (across - GAP * (rows - 1)) / rows;
  const out: Block[] = [];
  for (let i = 0; i < pieces; i++) {
    for (let j = 0; j < rows; j++) {
      const a0 = (alongX ? r.x0 : r.z0) + i * (pieceLen + GAP);
      const b0 = (alongX ? r.z0 : r.x0) + j * (rowLen + GAP);
      const s = hash(`${id}:${i}:${j}`);
      // Each piece a little different: its own height and a slightly shorter footprint.
      const shrink = (s % 4) * 1.2;
      const rect: Rect = alongX
        ? { x0: a0, x1: a0 + pieceLen, z0: b0, z1: b0 + rowLen - (rows === 1 ? 0 : shrink) }
        : { x0: b0, x1: b0 + rowLen - (rows === 1 ? 0 : shrink), z0: a0, z1: a0 + pieceLen };
      const range = FLOOR_RANGE[kind]!;
      const f = kind === 'apartment' && floors === PLANNER_DEFAULT_FLOORS.apartment ? range[0] + (s % (range[1] - range[0] + 1)) : floors;
      out.push({ rect, floors: f, seed: s });
    }
  }
  return out;
}

const KNOWN_KINDS = new Set<PlannerKind>(Object.keys(PLANNER_DEFAULT_FLOORS) as PlannerKind[]);

// Generic planner names get a tidy title and a number when repeated.
const GENERIC_NAMES: Record<string, string> = {
  'Business / shop': 'Shop',
  'Apartment block': 'Apartment Block',
  'Classroom block': 'Classroom Block',
  'Lecture theatre': 'Lecture Theatre',
  'Admin block': 'Admin Block',
  'Faculty block': 'Faculty Block',
  'Trees / garden': 'Garden',
  'Keke / bus stop': 'Keke Stop',
  'Buka / cafeteria': 'Buka',
  'Small market': 'Market',
};

export const buildings: MapBuilding[] = (() => {
  const items = layout.items.filter((i) => KNOWN_KINDS.has(i.kind as PlannerKind));
  // Read order: by section, then north to south, west to east.
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const tidy = sorted.map((i) => GENERIC_NAMES[i.name] ?? i.name);
  const totals = new Map<string, number>();
  for (const n of tidy) totals.set(n, (totals.get(n) ?? 0) + 1);
  const seen = new Map<string, number>();
  return sorted.map((item, idx) => {
    const kind = item.kind as PlannerKind;
    const base = tidy[idx]!;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    const name = totals.get(base)! > 1 ? `${base} ${n}` : base;
    const seed = hash(item.id);
    const plot = cellRect(item.x, item.y, item.w, item.h);
    const floors = floorsFor(item, kind, seed);
    const doorSide = doorSidesFor(item)[0]!;
    const blocks = blocksFor(item.id, kind, plot, floors, seed);
    return {
      id: item.id,
      kind,
      name,
      plot,
      cells: { x: item.x, y: item.y, w: item.w, h: item.h },
      floors,
      sectionId: sectionAt(rectCentre(plot)).id,
      doorSide,
      door: doorPoint(bodyOf(plot, blocks), doorSide),
      blocks,
      seed,
    };
  });
})();

// A door must not open into another building: if the best side is blocked
// (tightly packed kiosks), use the next side that is clear.
(() => {
  const solid = buildings.flatMap((b) => b.blocks.map((k) => ({ id: b.id, r: k.rect })));
  const blocked = (p: Pt, self: string) =>
    solid.some(({ id, r }) => id !== self && p[0] > r.x0 - 1 && p[0] < r.x1 + 1 && p[1] > r.z0 - 1 && p[1] < r.z1 + 1);
  for (const b of buildings) {
    if (!blocked(b.door, b.id)) continue;
    const body = bodyOf(b.plot, b.blocks);
    const free = doorSidesFor(b.cells).find((side) => !blocked(doorPoint(body, side), b.id));
    if (free) {
      b.doorSide = free;
      b.door = doorPoint(body, free);
    }
  }
})();

/** The map's full extent in metres. */
export const mapBounds: Rect = { x0: -OX, z0: -OZ, x1: OX, z1: OZ };

// ---------- game places ----------

export interface CampusPlace {
  id: string;
  name: string;
  type: LocationType;
  /** Which action lists this place offers; empty = nothing to do yet. */
  actionTypes: LocationType[];
  siteId: string;
  /** Where people stand to go in. */
  position: Pt;
  buildingId: string;
  /** Draw a floating name label. */
  label: boolean;
  /** Shown in the sheet when there is nothing to do. */
  note?: string;
}

const NOTHING = 'Nothing to do here right now.';

const PLACE_KINDS: Partial<Record<PlannerKind, { type: LocationType; actions: LocationType[]; note?: string }>> = {
  classroom: { type: 'lecture', actions: ['lecture', 'faculty'] },
  lecture: { type: 'lecture', actions: ['lecture'] },
  library: { type: 'library', actions: ['library'] },
  faculty: { type: 'faculty', actions: ['faculty'] },
  lab: { type: 'lab', actions: ['lecture'] },
  apartment: { type: 'hostel', actions: ['hostel'] },
  business: { type: 'business', actions: ['business'] },
  market: { type: 'market', actions: ['cafeteria'] },
  buka: { type: 'cafeteria', actions: ['cafeteria'] },
  field: { type: 'field', actions: ['field'] },
  admin: { type: 'admin', actions: [], note: NOTHING },
  clinic: { type: 'clinic', actions: [], note: NOTHING },
  busstop: { type: 'busstop', actions: [], note: 'Ride a keke to another stop.' },
  gate: { type: 'gate', actions: [], note: NOTHING },
};

/** Kinds that always get a floating name; others only when you named them yourself. */
const ALWAYS_LABEL = new Set<PlannerKind>(['library', 'lecture', 'faculty', 'admin', 'clinic', 'market', 'buka', 'field', 'gate', 'busstop']);

export const campusPlaces: CampusPlace[] = buildings.flatMap((b) => {
  const k = PLACE_KINDS[b.kind];
  if (!k) return [];
  const raw = layout.items.find((i) => i.id === b.id)!;
  const named = !GENERIC_NAMES[raw.name];
  return [
    {
      id: b.id,
      name: b.name,
      type: k.type,
      actionTypes: k.actions,
      siteId: b.sectionId,
      position: b.door,
      buildingId: b.id,
      label: ALWAYS_LABEL.has(b.kind) || named,
      note: k.note,
    },
  ];
});

export const placeByBuilding = new Map(campusPlaces.map((p) => [p.buildingId, p]));
export const buildingById = new Map(buildings.map((b) => [b.id, b]));
