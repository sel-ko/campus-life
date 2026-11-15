// Every building from the map data, extruded from its real outline.
//
// Axis mapping (checked with an L-shaped block): THREE.Shape is drawn in X/Y
// and ExtrudeGeometry pushes it along +Z. We draw each outline as (x, -z),
// extrude by the height, then rotate -90° about X, which maps
// (x, y, h) -> (x, h, -y) = (x, h, z): standing up, +z south, not mirrored.
//
// Per zone everything is merged into two meshes: walls (with a window texture
// made on a canvas) and "plain" (roofs, plinths, doors, signs, bus stops).
// Taps are matched to buildings by which triangles were hit, so no extra hit
// boxes are drawn.
import type { ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { campus, placeByBuilding } from '../../content/campusPlaces';
import type { ZoneId } from '../../content/campus-data';
import { placeIsOpen } from '../../content/placeHelpers';
import { useGameStore } from '../../store/gameStore';
import type { LayoutBuilding, Pt } from '../campusLayout';
import { KIND_COLOURS } from '../campusStyle';
import { gesture } from '../shared';
import { shade } from '../three-utils';

// ---------- textures (drawn at runtime, 128 px, no image files) ----------

function windowTextures(): { map: THREE.CanvasTexture; glow: THREE.CanvasTexture } {
  const make = (paint: (ctx: CanvasRenderingContext2D) => void) => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    paint(c.getContext('2d')!);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    // One window per 4 m along the wall and per 3.2 m storey.
    t.repeat.set(1 / 4, 1 / 3.2);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const map = make((ctx) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#E6E1D8';
    ctx.fillRect(0, 112, 128, 16); // floor band
    ctx.fillStyle = '#4F6B7D';
    ctx.fillRect(30, 34, 68, 56); // glass
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(62, 34, 4, 56); // mullion
  });
  const glow = make((ctx) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#FFD27A';
    ctx.fillRect(30, 34, 68, 56);
  });
  return { map, glow };
}

const textures = typeof document !== 'undefined' ? windowTextures() : null;

/** Walls: vertex colours times the window texture; windows glow at night. */
export const campusWallMaterial = new THREE.MeshLambertMaterial({
  vertexColors: true,
  map: textures?.map ?? null,
  emissive: new THREE.Color('#FFD27A'),
  emissiveMap: textures?.glow ?? null,
  emissiveIntensity: 0,
});
const plainMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
const plainFlatMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

// ---------- geometry building ----------

const ROOF_COLOURS = ['#B5543C', '#3F6E9E', '#4E8A55', '#8B5E3C', '#A63D2F'];

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function shapeOf(points: Pt[], grow = 0): THREE.Shape {
  // Optionally push the outline out from its middle (for the plinth).
  const cx = points.reduce((s, p) => s + p[0], 0) / points.length;
  const cz = points.reduce((s, p) => s + p[1], 0) / points.length;
  const shape = new THREE.Shape();
  points.forEach(([x, z], i) => {
    const d = Math.hypot(x - cx, z - cz) || 1;
    const gx = x + ((x - cx) / d) * grow;
    const gz = z + ((z - cz) / d) * grow;
    if (i === 0) shape.moveTo(gx, -gz);
    else shape.lineTo(gx, -gz);
  });
  shape.closePath();
  return shape;
}

/** Extrudes an outline from y0 to y0 + height; returns the side walls and the caps separately. */
function extrude(points: Pt[], height: number, y0 = 0, grow = 0): { sides: THREE.BufferGeometry; caps: THREE.BufferGeometry } {
  const g = new THREE.ExtrudeGeometry(shapeOf(points, grow), { depth: height, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  const parts = splitGroups(g);
  g.dispose();
  return { caps: parts[0]!, sides: parts[1]! };
}

/** ExtrudeGeometry stores caps and sides as groups 0 and 1; pull them apart. */
function splitGroups(g: THREE.BufferGeometry): THREE.BufferGeometry[] {
  const src = g.index ? g.toNonIndexed() : g;
  return src.groups.map((grp) => {
    const out = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'uv']) {
      const attr = src.getAttribute(name) as THREE.BufferAttribute | undefined;
      if (!attr) continue;
      const size = attr.itemSize;
      out.setAttribute(name, new THREE.BufferAttribute(attr.array.slice(grp.start * size, (grp.start + grp.count) * size) as Float32Array, size));
    }
    return out;
  });
}

/** A box placed at x, y, z and turned to face `angle` (radians about Y). */
function box(w: number, h: number, d: number, x: number, y: number, z: number, angle = 0): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  g.rotateY(angle);
  g.translate(x, y, z);
  return g;
}

function paint(g: THREE.BufferGeometry, colour: string, keepUv = false): THREE.BufferGeometry {
  for (const name of Object.keys(g.attributes)) {
    if (name !== 'position' && name !== 'normal' && !(keepUv && name === 'uv')) g.deleteAttribute(name);
  }
  const c = new THREE.Color(colour);
  const n = g.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

interface Range {
  start: number;
  count: number;
  id: string;
}

interface ZoneMesh {
  geometry: THREE.BufferGeometry;
  ranges: Range[];
  baseColours: Float32Array;
}

function mergeTracked(pieces: Array<{ g: THREE.BufferGeometry; id: string }>): ZoneMesh | null {
  if (!pieces.length) return null;
  const ranges: Range[] = [];
  let start = 0;
  for (const p of pieces) {
    const count = p.g.getAttribute('position').count;
    ranges.push({ start, count, id: p.id });
    start += count;
  }
  const geometry = mergeGeometries(pieces.map((p) => p.g), false);
  pieces.forEach((p) => p.g.dispose());
  if (!geometry) return null;
  geometry.computeBoundingSphere();
  return { geometry, ranges, baseColours: (geometry.getAttribute('color').array as Float32Array).slice() };
}

function buildZone(zone: ZoneId): { walls: ZoneMesh | null; plain: ZoneMesh | null } {
  const walls: Array<{ g: THREE.BufferGeometry; id: string }> = [];
  const plain: Array<{ g: THREE.BufferGeometry; id: string }> = [];
  for (const b of campus.buildings.filter((x) => x.zone === zone)) {
    const base = KIND_COLOURS[b.kind];
    const id = b.id;
    if (b.kind === 'busstop') {
      busStop(b, plain);
      continue;
    }
    if (b.compound) {
      compound(b, walls, plain);
      continue;
    }
    // Plinth: a slightly wider, darker base so blocks are not bare extrusions.
    const plinth = extrude(b.footprint, 0.5, 0, 0.6);
    plain.push({ g: paint(plinth.sides, shade(base, 0.62)), id }, { g: paint(plinth.caps, shade(base, 0.62)), id });
    // Body: walls get the window texture; the top cap is the roof.
    const body = extrude(b.footprint, b.height, 0.5);
    walls.push({ g: paint(body.sides, base, true), id });
    const roof = b.kind === 'hostel' ? ROOF_COLOURS[hash(b.id) % ROOF_COLOURS.length]! : shade(base, 0.72);
    plain.push({ g: paint(body.caps, roof), id });
    // A low parapet rim on flat roofs.
    const rim = extrude(b.footprint, 0.35, b.height + 0.5, 0.05);
    plain.push({ g: paint(rim.sides, shade(base, 0.85)), id });
    // Door on the wall facing the road.
    const angle = Math.atan2(b.doorNormal[0], b.doorNormal[1]);
    const [dx, dz] = [b.doorWall[0] + b.doorNormal[0] * 0.15, b.doorWall[1] + b.doorNormal[1] * 0.15];
    plain.push({ g: paint(box(2.2, 2.6, 0.3, dx, 1.8, dz, angle), '#4A3324'), id });
    // A sign over the door for named places.
    const place = placeByBuilding.get(b.id);
    if (place?.label) {
      plain.push({ g: paint(box(5, 1, 0.25, dx + b.doorNormal[0] * 0.1, 3.9, dz + b.doorNormal[1] * 0.1, angle), '#1F4E9C'), id });
    }
    // Teaching hospital: a red cross sign on the roof.
    if (b.kind === 'hospital') {
      const y = b.height + 0.5;
      plain.push({ g: paint(box(5, 0.4, 5, b.center[0], y + 0.3, b.center[1]), '#FFFFFF'), id });
      plain.push({ g: paint(box(3.6, 0.5, 1.1, b.center[0], y + 0.6, b.center[1]), '#D7263D'), id });
      plain.push({ g: paint(box(1.1, 0.5, 3.6, b.center[0], y + 0.6, b.center[1]), '#D7263D'), id });
    }
  }
  return { walls: mergeTracked(walls), plain: mergeTracked(plain) };
}

/** A compound: paved yard and low wall on the real outline, blocks inside. */
function compound(b: LayoutBuilding, walls: Array<{ g: THREE.BufferGeometry; id: string }>, plain: Array<{ g: THREE.BufferGeometry; id: string }>) {
  const id = b.id;
  const base = KIND_COLOURS.hostel;
  const yard = extrude(b.footprint, 0.08, 0);
  plain.push({ g: paint(yard.caps, '#D8CBB0'), id });
  const fence = extrude(b.footprint, 1.8, 0);
  plain.push({ g: paint(fence.sides, '#C9B79A'), id });
  // A gate gap is suggested by a darker post pair at the door.
  const angle = Math.atan2(b.doorNormal[0], b.doorNormal[1]);
  const along: Pt = [Math.cos(angle), -Math.sin(angle)];
  for (const s of [-3, 3]) {
    plain.push({ g: paint(box(0.8, 2.6, 0.8, b.doorWall[0] + along[0] * s, 1.3, b.doorWall[1] + along[1] * s, angle), '#8B5E3C'), id });
  }
  b.compound!.blocks.forEach((block, i) => {
    const height = block.floors * 3.2;
    const plinth = extrude(block.footprint, 0.5, 0, 0.5);
    plain.push({ g: paint(plinth.sides, shade(base, 0.62)), id }, { g: paint(plinth.caps, shade(base, 0.62)), id });
    const body = extrude(block.footprint, height, 0.5);
    walls.push({ g: paint(body.sides, base, true), id });
    plain.push({ g: paint(body.caps, ROOF_COLOURS[(hash(b.id) + i) % ROOF_COLOURS.length]!), id });
  });
}

/** A paved pad on the bus stop's outline, a shelter and a sign. */
function busStop(b: LayoutBuilding, out: Array<{ g: THREE.BufferGeometry; id: string }>) {
  const id = b.id;
  const pad = extrude(b.footprint, 0.2, 0);
  out.push({ g: paint(pad.caps, '#8A919B'), id }, { g: paint(pad.sides, '#6E747A'), id });
  const [cx, cz] = b.center;
  const angle = Math.atan2(b.doorNormal[0], b.doorNormal[1]);
  const along: Pt = [Math.cos(angle), -Math.sin(angle)];
  for (const s of [-2.6, 2.6]) {
    out.push({ g: paint(box(0.25, 3, 0.25, cx + along[0] * s, 1.7, cz + along[1] * s, angle), '#3A3F45'), id });
  }
  out.push({ g: paint(box(6.4, 0.3, 3, cx, 3.3, cz, angle), '#2F7FC1'), id });
  out.push({ g: paint(box(5.2, 0.5, 0.8, cx - b.doorNormal[0] * 1, 0.9, cz - b.doorNormal[1] * 1, angle), '#A86B3C'), id });
  const sx = cx + along[0] * 4.5 + b.doorNormal[0] * 1.5;
  const sz = cz + along[1] * 4.5 + b.doorNormal[1] * 1.5;
  out.push({ g: paint(box(0.15, 3.4, 0.15, sx, 1.7, sz), '#3A3F45'), id });
  out.push({ g: paint(box(1.4, 1.4, 0.15, sx, 3.6, sz, angle), '#F5B83D'), id });
}

// Built once, the first time the 3D map loads.
let built: Record<ZoneId, { walls: ZoneMesh | null; plain: ZoneMesh | null }> | null = null;
function zones() {
  built ??= { ps: buildZone('ps'), ts: buildZone('ts'), estate: buildZone('estate') };
  return built;
}

/** Which building a tapped triangle belongs to. */
function buildingAt(mesh: ZoneMesh, faceIndex: number): string | null {
  const v = faceIndex * 3;
  let lo = 0;
  let hi = mesh.ranges.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const r = mesh.ranges[mid]!;
    if (v < r.start) hi = mid - 1;
    else if (v >= r.start + r.count) lo = mid + 1;
    else return r.id;
  }
  return null;
}

/** Darkens buildings that are game places with nothing open right now. */
function applyDimming(mesh: ZoneMesh, dimmed: Set<string>) {
  const attr = mesh.geometry.getAttribute('color') as THREE.BufferAttribute;
  const arr = attr.array as Float32Array;
  for (const r of mesh.ranges) {
    const f = dimmed.has(r.id) ? 0.5 : 1;
    for (let i = r.start * 3; i < (r.start + r.count) * 3; i++) arr[i] = mesh.baseColours[i]! * f;
  }
  attr.needsUpdate = true;
}

function ZoneBuildings({ zone, dimmed }: { zone: ZoneId; dimmed: Set<string> }) {
  const { walls, plain } = zones()[zone];
  const travelTo = useGameStore((s) => s.travelTo);

  useEffect(() => {
    if (walls) applyDimming(walls, dimmed);
    if (plain) applyDimming(plain, dimmed);
  }, [walls, plain, dimmed]);

  const onClick = (mesh: ZoneMesh) => (e: ThreeEvent<MouseEvent>) => {
    if (gesture.moved || e.delta > 10 || e.faceIndex == null) return;
    const id = buildingAt(mesh, e.faceIndex);
    const place = id ? placeByBuilding.get(id) : undefined;
    if (!place) return; // scenery: not tappable
    e.stopPropagation();
    travelTo(place.id);
  };

  return (
    <group>
      {walls && <mesh geometry={walls.geometry} material={campusWallMaterial} onClick={onClick(walls)} />}
      {plain && <mesh geometry={plain.geometry} material={plainFlatMaterial} onClick={onClick(plain)} />}
    </group>
  );
}

export function CampusBuildings() {
  const game = useGameStore((s) => s.game);
  // Game places with nothing open this slot look dimmed.
  const dimmed = useMemo(() => {
    const set = new Set<string>();
    if (!game) return set;
    for (const [id, place] of placeByBuilding) {
      if (place.actionTypes.length && !placeIsOpen(game, place)) set.add(id);
    }
    return set;
  }, [game]);
  return (
    <group>
      <ZoneBuildings zone="ps" dimmed={dimmed} />
      <ZoneBuildings zone="ts" dimmed={dimmed} />
      <ZoneBuildings zone="estate" dimmed={dimmed} />
    </group>
  );
}

export { plainMaterial };
