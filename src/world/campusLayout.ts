// Turns the raw Uni map data (metres, real distances) into what the scene
// draws (scene units, zones pulled closer, cleaned outlines). Pure TypeScript:
// no three.js, so it is easy to test.
//
// Coordinates: x is east, z is south, as in the data. Scene coordinates put
// the estate centre at 0, 0 and multiply metres by WORLD_SCALE.
import * as data from '../content/campus-data';
import type { BuildingKind, CampusBuilding, CampusRoad, ZoneId } from '../content/campus-data';
import { buildingOverrides, type BuildingOverride } from '../content/campus-overrides';

export type Pt = [number, number];

/** Scene units per metre. Chosen so the PS section is about 60 units wide
 *  (its buildings span 561 m). Tune this to change walking distances. */
export const WORLD_SCALE = 60 / 561;

export const ZONES: ZoneId[] = ['ps', 'ts', 'estate'];

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface LayoutBuilding {
  id: string;
  zone: ZoneId;
  kind: BuildingKind;
  name: string;
  floors: number;
  playable: boolean;
  /** Scene units. */
  center: Pt;
  size: Pt;
  footprint: Pt[];
  /** True when the outline was unusable and a rectangle was drawn instead. */
  usedFallback: boolean;
}

export interface LayoutRoad {
  zone: CampusRoad['zone'];
  name: string;
  width: number;
  points: Pt[];
  certainty: CampusRoad['certainty'];
}

export interface CampusLayout {
  gapShrink: number;
  worldScale: number;
  buildings: LayoutBuilding[];
  roads: LayoutRoad[];
  openGround: Array<{ zone: ZoneId; points: Pt[] }>;
  track: Pt[];
  markers: Array<{ zone: ZoneId; name: string; at: Pt }>;
  zoneCentres: Record<ZoneId, Pt>;
  zoneBounds: Record<ZoneId, Bounds>;
  bounds: Bounds;
}

// ---------- pulling zones together ----------

const ESTATE = data.zoneCentres.estate;

/** How far a whole zone moves, in metres, for a given GAP_SHRINK. */
export function zoneShift(zone: ZoneId, gapShrink: number): Pt {
  if (zone === 'estate') return [0, 0];
  const c = data.zoneCentres[zone];
  return [(c[0] - ESTATE[0]) * (gapShrink - 1), (c[1] - ESTATE[1]) * (gapShrink - 1)];
}

/** Moves a point with its zone (metres in, metres out). gapShrink 1 = no change. */
export function shrinkPoint(p: Pt, zone: ZoneId, gapShrink: number): Pt {
  const [dx, dz] = zoneShift(zone, gapShrink);
  return [p[0] + dx, p[1] + dz];
}

/**
 * Link roads join the estate to another zone. The end nearer that zone moves
 * with it, the estate end stays put, and points in between move in proportion
 * to how far along the road they are, so the road stays connected.
 */
export function shrinkLinkRoad(points: Pt[], gapShrink: number): Pt[] {
  if (points.length === 0) return [];
  const first = points[0]!;
  const last = points[points.length - 1]!;
  // Which zone does this road lead to? The one whose centre is nearest either end.
  let zone: ZoneId = 'ps';
  let zoneEndIsLast = true;
  let best = Infinity;
  for (const z of ['ps', 'ts'] as const) {
    const c = data.zoneCentres[z];
    for (const [end, isLast] of [[first, false], [last, true]] as const) {
      const d = Math.hypot(end[0] - c[0], end[1] - c[1]);
      if (d < best) {
        best = d;
        zone = z;
        zoneEndIsLast = isLast;
      }
    }
  }
  const lengths = [0];
  for (let i = 1; i < points.length; i++) {
    lengths.push(lengths[i - 1]! + Math.hypot(points[i]![0] - points[i - 1]![0], points[i]![1] - points[i - 1]![1]));
  }
  const total = lengths[lengths.length - 1] || 1;
  const [sx, sz] = zoneShift(zone, gapShrink);
  return points.map((p, i) => {
    const along = lengths[i]! / total;
    const t = zoneEndIsLast ? along : 1 - along;
    return [p[0] + sx * t, p[1] + sz * t];
  });
}

// ---------- cleaning outlines ----------

function area(points: Pt[]): number {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, z1] = points[i]!;
    const [x2, z2] = points[(i + 1) % points.length]!;
    a += x1 * z2 - x2 * z1;
  }
  return a / 2;
}

function segmentsCross(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const orient = (p: Pt, q: Pt, r: Pt) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

/** True if any two non-neighbouring edges cross. */
export function selfIntersects(points: Pt[]): boolean {
  const n = points.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (j === i || (j + 1) % n === i || (i + 1) % n === j) continue;
      if (segmentsCross(points[i]!, points[(i + 1) % n]!, points[j]!, points[(j + 1) % n]!)) return true;
    }
  }
  return false;
}

function bboxRect(points: Pt[]): Pt[] {
  const xs = points.map((p) => p[0]);
  const zs = points.map((p) => p[1]);
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

const DUPLICATE_M = 0.5; // points closer than this are the same point
const COLLINEAR_M = 0.75; // a point this close to the line through its neighbours adds nothing
const MIN_AREA_M2 = 4;

/**
 * Tidies an outline: drops duplicate and near-collinear points, makes the
 * winding consistent (positive shoelace area in x/z), and falls back to the
 * bounding rectangle if what is left is not a valid simple polygon.
 * Input and output are in metres.
 */
export function cleanFootprint(raw: Pt[], fallbackCenter?: Pt, fallbackSize?: Pt): { points: Pt[]; usedFallback: boolean } {
  let pts: Pt[] = [];
  for (const p of raw) {
    const prev = pts[pts.length - 1];
    if (!prev || Math.hypot(p[0] - prev[0], p[1] - prev[1]) > DUPLICATE_M) pts.push([p[0], p[1]]);
  }
  while (pts.length > 1 && Math.hypot(pts[0]![0] - pts[pts.length - 1]![0], pts[0]![1] - pts[pts.length - 1]![1]) <= DUPLICATE_M) pts.pop();

  // Remove points that sit (almost) on the line between their neighbours,
  // and spikes where the outline doubles back on itself.
  let changed = true;
  while (changed && pts.length > 3) {
    changed = false;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[(i - 1 + pts.length) % pts.length]!;
      const b = pts[i]!;
      const c = pts[(i + 1) % pts.length]!;
      const ac = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const cross = Math.abs((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0]));
      const offLine = ac > 1e-6 ? cross / ac : 0;
      if (ac <= DUPLICATE_M || offLine < COLLINEAR_M) {
        pts.splice(i, 1);
        changed = true;
        break;
      }
    }
  }

  const valid = pts.length >= 3 && Math.abs(area(pts)) >= MIN_AREA_M2 && !selfIntersects(pts);
  if (!valid) {
    let rect: Pt[];
    const distinct = raw.length >= 2 && bboxArea(raw) >= MIN_AREA_M2;
    if (distinct) rect = bboxRect(raw);
    else {
      const c = fallbackCenter ?? raw[0] ?? [0, 0];
      const s = fallbackSize ?? [4, 4];
      rect = bboxRect([
        [c[0] - s[0] / 2, c[1] - s[1] / 2],
        [c[0] + s[0] / 2, c[1] + s[1] / 2],
      ]);
    }
    return { points: area(rect) < 0 ? rect.reverse() : rect, usedFallback: true };
  }
  if (area(pts) < 0) pts.reverse();
  return { points: pts, usedFallback: false };
}

function bboxArea(points: Pt[]): number {
  const xs = points.map((p) => p[0]);
  const zs = points.map((p) => p[1]);
  return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...zs) - Math.min(...zs));
}

// ---------- the whole layout ----------

function emptyBounds(): Bounds {
  return { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
}
function grow(b: Bounds, p: Pt): void {
  b.minX = Math.min(b.minX, p[0]);
  b.maxX = Math.max(b.maxX, p[0]);
  b.minZ = Math.min(b.minZ, p[1]);
  b.maxZ = Math.max(b.maxZ, p[1]);
}

function nearestZone(p: Pt): ZoneId {
  let best: ZoneId = 'estate';
  let d = Infinity;
  for (const z of ZONES) {
    const c = data.zoneCentres[z];
    const dz = Math.hypot(p[0] - c[0], p[1] - c[1]);
    if (dz < d) {
      d = dz;
      best = z;
    }
  }
  return best;
}

function centroid(points: Pt[]): Pt {
  const n = points.length || 1;
  return [points.reduce((s, p) => s + p[0], 0) / n, points.reduce((s, p) => s + p[1], 0) / n];
}

export interface LayoutOptions {
  gapShrink?: number;
  worldScale?: number;
  overrides?: Record<string, BuildingOverride>;
  /** Raw data, replaceable in tests. */
  source?: { buildings: CampusBuilding[]; roads: CampusRoad[] };
}

export function buildCampusLayout(options: LayoutOptions = {}): CampusLayout {
  const gap = options.gapShrink ?? data.GAP_SHRINK;
  const scale = options.worldScale ?? WORLD_SCALE;
  const overrides = options.overrides ?? buildingOverrides;
  const source = options.source ?? data;
  // Metres (after shrinking) to scene units, with the estate centre at 0, 0.
  const toScene = (p: Pt): Pt => [(p[0] - ESTATE[0]) * scale, (p[1] - ESTATE[1]) * scale];

  const buildings: LayoutBuilding[] = source.buildings.map((b) => {
    const o = overrides[b.id] ?? {};
    const { points, usedFallback } = cleanFootprint(b.footprint, b.center, b.size);
    return {
      id: b.id,
      zone: b.zone,
      kind: o.kind ?? b.kind,
      name: o.name ?? b.name,
      floors: o.floors ?? b.floors,
      playable: o.playable ?? false,
      center: toScene(shrinkPoint(b.center, b.zone, gap)),
      size: [b.size[0] * scale, b.size[1] * scale],
      footprint: points.map((p) => toScene(shrinkPoint(p, b.zone, gap))),
      usedFallback,
    };
  });

  const roads: LayoutRoad[] = source.roads.map((r) => ({
    zone: r.zone,
    name: r.name,
    width: r.width * scale,
    certainty: r.certainty,
    points: (r.zone === 'link' ? shrinkLinkRoad(r.points, gap) : r.points.map((p) => shrinkPoint(p, r.zone as ZoneId, gap))).map(toScene),
  }));

  const openGround = data.openGround.map((poly) => {
    const zone = nearestZone(centroid(poly));
    return { zone, points: poly.map((p) => toScene(shrinkPoint(p, zone, gap))) };
  });
  const trackZone = nearestZone(centroid(data.track));
  const track = data.track.map((p) => toScene(shrinkPoint(p, trackZone, gap)));
  const markers = data.markers.map((m) => ({ zone: m.zone, name: m.name, at: toScene(shrinkPoint(m.at, m.zone, gap)) }));
  const zoneCentres = Object.fromEntries(ZONES.map((z) => [z, toScene(shrinkPoint(data.zoneCentres[z], z, gap))])) as Record<ZoneId, Pt>;

  const zoneBounds = Object.fromEntries(ZONES.map((z) => [z, emptyBounds()])) as Record<ZoneId, Bounds>;
  const bounds = emptyBounds();
  for (const b of buildings) for (const p of b.footprint) grow(zoneBounds[b.zone], p);
  for (const r of roads) for (const p of r.points) if (r.zone !== 'link') grow(zoneBounds[r.zone], p);
  for (const m of markers) grow(zoneBounds[m.zone], m.at);
  for (const z of ZONES) {
    grow(bounds, [zoneBounds[z].minX, zoneBounds[z].minZ]);
    grow(bounds, [zoneBounds[z].maxX, zoneBounds[z].maxZ]);
  }
  for (const r of roads) for (const p of r.points) grow(bounds, p);

  return { gapShrink: gap, worldScale: scale, buildings, roads, openGround, track, markers, zoneCentres, zoneBounds, bounds };
}

function footprintBounds(b: LayoutBuilding): Bounds {
  const out = emptyBounds();
  for (const p of b.footprint) grow(out, p);
  return out;
}

/** Pairs of buildings from different zones whose outlines' boxes overlap. */
export function zoneOverlaps(layout: CampusLayout): Array<[string, string]> {
  const boxes = layout.buildings.map((b) => ({ b, box: footprintBounds(b) }));
  const hits: Array<[string, string]> = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const A = boxes[i]!;
      const B = boxes[j]!;
      if (A.b.zone === B.b.zone) continue;
      if (A.box.minX < B.box.maxX && B.box.minX < A.box.maxX && A.box.minZ < B.box.maxZ && B.box.minZ < A.box.maxZ) {
        hits.push([A.b.id, B.b.id]);
      }
    }
  }
  return hits;
}

/** The smallest GAP_SHRINK (to 0.05) at which no buildings from different zones overlap. */
export function smallestGapWithoutOverlap(): number {
  for (let g = 0.05; g <= 1.0001; g += 0.05) {
    if (zoneOverlaps(buildCampusLayout({ gapShrink: g })).length === 0) return Math.round(g * 100) / 100;
  }
  return 1;
}
