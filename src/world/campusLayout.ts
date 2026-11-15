// Turns the raw Uni map data (metres, real distances) into what the scene
// draws: zones pulled closer, cleaned outlines, doors, heights. Pure
// TypeScript: no three.js, so it is easy to test.
//
// Coordinates: x is east, z is south, as in the data. Scene coordinates put
// the estate centre at 0, 0 and multiply metres by WORLD_SCALE.
import * as data from '../content/campus-data';
import type { BuildingKind, CampusBuilding, CampusRoad, ZoneId } from '../content/campus-data';
import { buildingOverrides, type BuildingOverride } from '../content/campus-overrides';

export type Pt = [number, number];

/** Scene units per metre. 1 keeps buildings and characters in proportion
 *  (a character is about one storey tall). Walking speed is tuned instead. */
export const WORLD_SCALE = 1;

/** However hard GAP_SHRINK pulls, a zone's buildings stay at least this many
 *  metres from the estate's buildings. */
export const ZONE_CLEARANCE_M = 20;

export const METRES_PER_FLOOR = 3.2;

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
  /** Height in scene units. */
  height: number;
  playable: boolean;
  /** Scene units. */
  center: Pt;
  size: Pt;
  footprint: Pt[];
  /** Footprint area in square metres. */
  areaM2: number;
  /** True when the outline was unusable and a rectangle was drawn instead. */
  usedFallback: boolean;
  /** Middle of the wall facing the nearest road, and the outward direction. */
  doorWall: Pt;
  doorNormal: Pt;
  /** Where a person stands to go in (just outside the door). */
  door: Pt;
  /**
   * Set for very large, irregular hostel outlines, which are compounds of
   * several houses traced as one shape: drawn as a low wall on the outline
   * with separate blocks inside.
   */
  compound?: { blocks: Array<{ footprint: Pt[]; floors: number }> };
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
  /** The shrink actually used per zone (never closer than the clearance allows). */
  zoneGap: Record<ZoneId, number>;
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

// ---------- geometry helpers ----------

export function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / len2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dz));
}

export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i]!;
    const [xj, zj] = poly[j]!;
    if (zi > p[1] !== zj > p[1] && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function area(points: Pt[]): number {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, z1] = points[i]!;
    const [x2, z2] = points[(i + 1) % points.length]!;
    a += x1 * z2 - x2 * z1;
  }
  return a / 2;
}

function centroid(points: Pt[]): Pt {
  const n = points.length || 1;
  return [points.reduce((s, p) => s + p[0], 0) / n, points.reduce((s, p) => s + p[1], 0) / n];
}

function bboxOf(points: Pt[]): Bounds {
  const b = emptyBounds();
  for (const p of points) grow(b, p);
  return b;
}

function emptyBounds(): Bounds {
  return { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
}
function grow(b: Bounds, p: Pt): void {
  b.minX = Math.min(b.minX, p[0]);
  b.maxX = Math.max(b.maxX, p[0]);
  b.minZ = Math.min(b.minZ, p[1]);
  b.maxZ = Math.max(b.maxZ, p[1]);
}

// ---------- pulling zones together ----------

const ESTATE = data.zoneCentres.estate;

/** How far a whole zone moves, in metres, for a given shrink. */
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

function segmentDistance(a: Pt, b: Pt, c: Pt, d: Pt): number {
  if (segmentsCross(a, b, c, d)) return 0;
  return Math.min(distToSegment(a, c, d), distToSegment(b, c, d), distToSegment(c, a, b), distToSegment(d, a, b));
}

/** True if two outlines touch or come within `gap` metres of each other. */
function polygonsNear(p: Pt[], q: Pt[], gap: number): boolean {
  if (pointInPolygon(p[0]!, q) || pointInPolygon(q[0]!, p)) return true;
  for (let i = 0; i < p.length; i++) {
    for (let j = 0; j < q.length; j++) {
      if (segmentDistance(p[i]!, p[(i + 1) % p.length]!, q[j]!, q[(j + 1) % q.length]!) < gap) return true;
    }
  }
  return false;
}

/**
 * The smallest shrink (in steps of 0.01) at which none of this zone's
 * buildings comes within `clearance` metres of an estate building (real
 * outlines, not just their boxes).
 */
export function tightestGap(zone: ZoneId, clearance: number, buildings: CampusBuilding[] = data.buildings): number {
  if (zone === 'estate') return 1;
  const mine = buildings.filter((b) => b.zone === zone).map((b) => ({ poly: b.footprint, box: bboxOf(b.footprint) }));
  const estate = buildings.filter((b) => b.zone === 'estate').map((b) => ({ poly: b.footprint, box: bboxOf(b.footprint) }));
  const clashes = (g: number) => {
    const [dx, dz] = zoneShift(zone, g);
    return mine.some((m) =>
      estate.some((e) => {
        const near =
          m.box.minX + dx < e.box.maxX + clearance &&
          e.box.minX - clearance < m.box.maxX + dx &&
          m.box.minZ + dz < e.box.maxZ + clearance &&
          e.box.minZ - clearance < m.box.maxZ + dz;
        return near && polygonsNear(m.poly.map((p) => [p[0] + dx, p[1] + dz] as Pt), e.poly, clearance);
      }),
    );
  };
  // Binary search to 0.01: moving a zone further out only ever clears it.
  let lo = 0;
  let hi = 1;
  if (clashes(hi - 0.01)) return 1;
  while (hi - lo > 0.01) {
    const mid = (lo + hi) / 2;
    if (clashes(mid)) lo = mid;
    else hi = mid;
  }
  return Math.ceil(hi * 100) / 100;
}

/**
 * Link roads join the estate to another zone. The end nearer that zone moves
 * with it, the estate end stays, and points in between move in proportion to
 * how far along the road they are, so the road stays connected.
 */
export function shrinkLinkRoad(points: Pt[], gapFor: number | Record<ZoneId, number>): Pt[] {
  if (points.length === 0) return [];
  const first = points[0]!;
  const last = points[points.length - 1]!;
  let zone: ZoneId = 'ps';
  let zoneEndIsLast = true;
  let best = Infinity;
  for (const z of ['ps', 'ts'] as const) {
    const c = data.zoneCentres[z];
    for (const [end, isLast] of [
      [first, false],
      [last, true],
    ] as const) {
      const d = Math.hypot(end[0] - c[0], end[1] - c[1]);
      if (d < best) {
        best = d;
        zone = z;
        zoneEndIsLast = isLast;
      }
    }
  }
  const gap = typeof gapFor === 'number' ? gapFor : gapFor[zone];
  const lengths = [0];
  for (let i = 1; i < points.length; i++) {
    lengths.push(lengths[i - 1]! + Math.hypot(points[i]![0] - points[i - 1]![0], points[i]![1] - points[i - 1]![1]));
  }
  const total = lengths[lengths.length - 1] || 1;
  const [sx, sz] = zoneShift(zone, gap);
  return points.map((p, i) => {
    const along = lengths[i]! / total;
    const t = zoneEndIsLast ? along : 1 - along;
    return [p[0] + sx * t, p[1] + sz * t];
  });
}

// ---------- cleaning outlines ----------

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
      if ((j + 1) % n === i || (i + 1) % n === j) continue;
      if (segmentsCross(points[i]!, points[(i + 1) % n]!, points[j]!, points[(j + 1) % n]!)) return true;
    }
  }
  return false;
}

function bboxRect(points: Pt[]): Pt[] {
  const b = bboxOf(points);
  return [
    [b.minX, b.minZ],
    [b.maxX, b.minZ],
    [b.maxX, b.maxZ],
    [b.minX, b.maxZ],
  ];
}

const DUPLICATE_M = 0.5;
const COLLINEAR_M = 0.75;
const MIN_AREA_M2 = 4;

/**
 * Tidies an outline: drops duplicate and near-collinear points, makes the
 * winding consistent (positive shoelace area in x/z), and falls back to the
 * bounding rectangle if what is left is not a valid simple polygon.
 * Input and output are in metres.
 */
export function cleanFootprint(raw: Pt[], fallbackCenter?: Pt, fallbackSize?: Pt): { points: Pt[]; usedFallback: boolean } {
  const pts: Pt[] = [];
  for (const p of raw) {
    const prev = pts[pts.length - 1];
    if (!prev || Math.hypot(p[0] - prev[0], p[1] - prev[1]) > DUPLICATE_M) pts.push([p[0], p[1]]);
  }
  while (pts.length > 1 && Math.hypot(pts[0]![0] - pts[pts.length - 1]![0], pts[0]![1] - pts[pts.length - 1]![1]) <= DUPLICATE_M) pts.pop();

  // Remove points on (or nearly on) the line between their neighbours, and spikes.
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
    if (raw.length >= 2 && Math.abs(area(bboxRect(raw))) >= MIN_AREA_M2) rect = bboxRect(raw);
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

/** Four corners, each within 15° of a right angle. */
export function isRectangular(points: Pt[]): boolean {
  if (points.length !== 4) return false;
  for (let i = 0; i < 4; i++) {
    const a = points[(i + 3) % 4]!;
    const b = points[i]!;
    const c = points[(i + 1) % 4]!;
    const u: Pt = [a[0] - b[0], a[1] - b[1]];
    const v: Pt = [c[0] - b[0], c[1] - b[1]];
    const cos = (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v) || 1);
    if (Math.abs(cos) > Math.sin((15 * Math.PI) / 180)) return false;
  }
  return true;
}

// ---------- heights ----------

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

const MIN_FLOORS: Partial<Record<BuildingKind, number>> = {
  class: 2,
  lab: 2,
  admin: 2,
  hospital: 3,
  library: 3,
  unit: 1,
  other: 1,
};

/** Floors to draw: rectangular buildings are 3 storeys; otherwise the data's
 *  floors with a minimum by kind. Hostels vary 2 or 3, specials 1 or 2. */
export function floorsFor(b: { id: string; kind: BuildingKind; floors: number }, rectangular: boolean): number {
  if (b.kind === 'busstop') return 0;
  let floors = Math.max(b.floors, MIN_FLOORS[b.kind] ?? 1);
  if (b.kind === 'hostel') floors = Math.max(b.floors, 2 + (hash(b.id) % 2));
  if (b.kind === 'special') floors = Math.max(b.floors, 1 + (hash(b.id) % 2));
  if (rectangular) floors = Math.max(floors, 3);
  return floors;
}

// ---------- doors ----------

const DOOR_OUT_M = 3; // the standing spot is this far outside the wall

/**
 * The wall facing the nearest road gets the door. Outlines are wound the same
 * way (positive area in x/z), so (dz, -dx) along an edge always points out.
 * If the standing spot would fall inside the building (a deep notch), the
 * next-nearest wall is used. Points in scene units.
 */
export function doorFor(footprint: Pt[], roads: LayoutRoad[], scale: number): { doorWall: Pt; doorNormal: Pt; door: Pt } {
  const walls: Array<{ mid: Pt; normal: Pt; road: number }> = [];
  for (let i = 0; i < footprint.length; i++) {
    const a = footprint[i]!;
    const b = footprint[(i + 1) % footprint.length]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 2 * scale) continue;
    const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const normal: Pt = [(b[1] - a[1]) / len, -(b[0] - a[0]) / len];
    let road = Infinity;
    for (const r of roads) {
      for (let k = 1; k < r.points.length; k++) road = Math.min(road, distToSegment(mid, r.points[k - 1]!, r.points[k]!) - r.width / 2);
    }
    walls.push({ mid, normal, road });
  }
  walls.sort((x, y) => x.road - y.road);
  const spot = (w: { mid: Pt; normal: Pt }): Pt => [w.mid[0] + w.normal[0] * DOOR_OUT_M * scale, w.mid[1] + w.normal[1] * DOOR_OUT_M * scale];
  const chosen = walls.find((w) => !pointInPolygon(spot(w), footprint)) ?? walls[0];
  if (!chosen) {
    const c = centroid(footprint);
    return { doorWall: c, doorNormal: [0, 1], door: [c[0], c[1] + 5 * scale] };
  }
  return { doorWall: chosen.mid, doorNormal: chosen.normal, door: spot(chosen) };
}

// ---------- compounds ----------

/** Hostel outlines bigger than this (and not a plain rectangle) are compounds. */
export const COMPOUND_M2 = 3000;
const BLOCK = { w: 24, d: 12, gapW: 9, gapD: 11, edge: 3 };

/**
 * Packs rectangular blocks inside a compound outline, lined up with its
 * longest wall, at least `BLOCK.edge` from the outline and clear of roads.
 * Deterministic. Points in scene units.
 */
export function compoundBlocks(id: string, outline: Pt[], roads: LayoutRoad[], scale: number): Array<{ footprint: Pt[]; floors: number }> {
  // Direction of the longest wall.
  let angle = 0;
  let longest = 0;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i]!;
    const b = outline[(i + 1) % outline.length]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len > longest) {
      longest = len;
      angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    }
  }
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const toLocal = (p: Pt): Pt => [p[0] * cos + p[1] * sin, -p[0] * sin + p[1] * cos];
  const toWorld = (p: Pt): Pt => [p[0] * cos - p[1] * sin, p[0] * sin + p[1] * cos];
  const local = outline.map(toLocal);
  const box = bboxOf(local);
  const [w, d, gw, gd, edge] = [BLOCK.w * scale, BLOCK.d * scale, BLOCK.gapW * scale, BLOCK.gapD * scale, BLOCK.edge * scale];
  const blocks: Array<{ footprint: Pt[]; floors: number }> = [];
  const insideWithMargin = (p: Pt) => {
    if (!pointInPolygon(p, local)) return false;
    for (let i = 0; i < local.length; i++) if (distToSegment(p, local[i]!, local[(i + 1) % local.length]!) < edge) return false;
    return true;
  };
  for (let z = box.minZ + edge; z + d <= box.maxZ - edge; z += d + gd) {
    for (let x = box.minX + edge; x + w <= box.maxX - edge; x += w + gw) {
      const corners: Pt[] = [
        [x, z],
        [x + w, z],
        [x + w, z + d],
        [x, z + d],
      ];
      const checks: Pt[] = [...corners, [x + w / 2, z], [x + w / 2, z + d], [x + w / 2, z + d / 2]];
      if (!checks.every(insideWithMargin)) continue;
      const world = corners.map(toWorld);
      const centre = toWorld([x + w / 2, z + d / 2]);
      const onRoad = roads.some((r) => r.points.some((q, k) => k > 0 && distToSegment(centre, r.points[k - 1]!, q) < r.width / 2 + (w / 2) + 2 * scale));
      if (onRoad) continue;
      // Keep the positive winding used everywhere else.
      blocks.push({ footprint: area(world) < 0 ? world.reverse() : world, floors: 2 + (hash(`${id}:${blocks.length}`) % 2) });
    }
  }
  return blocks;
}

// ---------- the whole layout ----------

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

export interface LayoutOptions {
  gapShrink?: number;
  /** Minimum metres between zones' buildings; 0 applies GAP_SHRINK exactly. */
  clearance?: number;
  worldScale?: number;
  overrides?: Record<string, BuildingOverride>;
  /** Raw data, replaceable in tests. */
  source?: { buildings: CampusBuilding[]; roads: CampusRoad[] };
}

export function buildCampusLayout(options: LayoutOptions = {}): CampusLayout {
  const gap = options.gapShrink ?? data.GAP_SHRINK;
  const clearance = options.clearance ?? ZONE_CLEARANCE_M;
  const scale = options.worldScale ?? WORLD_SCALE;
  const overrides = options.overrides ?? buildingOverrides;
  const source = options.source ?? data;
  const zoneGap: Record<ZoneId, number> = {
    estate: 1,
    ps: clearance > 0 ? Math.max(gap, tightestGap('ps', clearance, source.buildings)) : gap,
    ts: clearance > 0 ? Math.max(gap, tightestGap('ts', clearance, source.buildings)) : gap,
  };
  const move = (p: Pt, zone: ZoneId) => shrinkPoint(p, zone, zoneGap[zone]);
  // Metres (after shrinking) to scene units, with the estate centre at 0, 0.
  const toScene = (p: Pt): Pt => [(p[0] - ESTATE[0]) * scale, (p[1] - ESTATE[1]) * scale];

  const roads: LayoutRoad[] = source.roads.map((r) => ({
    zone: r.zone,
    name: r.name,
    width: r.width * scale,
    certainty: r.certainty,
    points: (r.zone === 'link' ? shrinkLinkRoad(r.points, zoneGap) : r.points.map((p) => move(p, r.zone as ZoneId))).map(toScene),
  }));

  const buildings: LayoutBuilding[] = source.buildings.map((b) => {
    const o = overrides[b.id] ?? {};
    const { points, usedFallback } = cleanFootprint(b.footprint, b.center, b.size);
    const footprint = points.map((p) => toScene(move(p, b.zone)));
    const kind = o.kind ?? b.kind;
    const floors = o.floors ?? floorsFor({ id: b.id, kind, floors: b.floors }, isRectangular(points));
    const big = kind === 'hostel' && Math.abs(area(points)) > COMPOUND_M2 && !isRectangular(points);
    return {
      id: b.id,
      zone: b.zone,
      kind,
      compound: big ? { blocks: compoundBlocks(b.id, footprint, roads, scale) } : undefined,
      name: o.name ?? b.name,
      floors,
      height: floors * METRES_PER_FLOOR * scale,
      playable: o.playable ?? false,
      center: toScene(move(b.center, b.zone)),
      size: [b.size[0] * scale, b.size[1] * scale],
      footprint,
      areaM2: Math.abs(area(points)),
      usedFallback,
      ...doorFor(footprint, roads, scale),
    };
  });

  const openGround = data.openGround.map((poly) => {
    const zone = nearestZone(centroid(poly));
    return { zone, points: poly.map((p) => toScene(move(p, zone))) };
  });
  const trackZone = nearestZone(centroid(data.track));
  const track = data.track.map((p) => toScene(move(p, trackZone)));
  const markers = data.markers.map((m) => ({ zone: m.zone, name: m.name, at: toScene(move(m.at, m.zone)) }));
  const zoneCentres = Object.fromEntries(ZONES.map((z) => [z, toScene(move(data.zoneCentres[z], z))])) as Record<ZoneId, Pt>;

  const zoneBounds = Object.fromEntries(ZONES.map((z) => [z, emptyBounds()])) as Record<ZoneId, Bounds>;
  const bounds = emptyBounds();
  for (const b of buildings) for (const p of b.footprint) grow(zoneBounds[b.zone], p);
  for (const r of roads) for (const p of r.points) if (r.zone !== 'link') grow(zoneBounds[r.zone], p);
  for (const m of markers) grow(zoneBounds[m.zone], m.at);
  for (const g of openGround) for (const p of g.points) grow(zoneBounds[g.zone], p);
  for (const p of track) grow(zoneBounds[trackZone], p);
  for (const z of ZONES) {
    grow(bounds, [zoneBounds[z].minX, zoneBounds[z].minZ]);
    grow(bounds, [zoneBounds[z].maxX, zoneBounds[z].maxZ]);
  }
  for (const r of roads) for (const p of r.points) grow(bounds, p);

  return { gapShrink: gap, zoneGap, worldScale: scale, buildings, roads, openGround, track, markers, zoneCentres, zoneBounds, bounds };
}

/** Pairs of buildings from different zones whose outlines' boxes overlap. */
export function zoneOverlaps(layout: CampusLayout): Array<[string, string]> {
  const boxes = layout.buildings.map((b) => ({ b, box: bboxOf(b.footprint) }));
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
