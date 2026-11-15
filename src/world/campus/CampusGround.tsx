// Grass, open ground, the PS running track and every road, from the map data.
import type { ThreeEvent } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { campus } from '../../content/campusPlaces';
import { useGameStore } from '../../store/gameStore';
import type { LayoutRoad, Pt } from '../campusLayout';
import { gesture } from '../shared';

const vertexMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
/** The grass is pushed back a little in depth so roads never flicker into it. */
const grassMaterials = new Map<string, THREE.Material>();
function grassMaterial(colour: string): THREE.Material {
  let m = grassMaterials.get(colour);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color: colour, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 4 });
    grassMaterials.set(colour, m);
  }
  return m;
}

function coloured(g: THREE.BufferGeometry, colour: string): THREE.BufferGeometry {
  const src = g.index ? g.toNonIndexed() : g;
  for (const name of Object.keys(src.attributes)) if (name !== 'position' && name !== 'normal') src.deleteAttribute(name);
  const c = new THREE.Color(colour);
  const n = src.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
  src.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return src;
}

/** A flat polygon lying on the ground at height y. */
function flatPolygon(points: Pt[], y: number): THREE.BufferGeometry {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

/** A flat strip along a line, with round discs at the joins and ends. */
function ribbon(points: Pt[], width: number, y: number, closed = false): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  const pts = closed ? [...points, points[0]!] : points;
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1]!;
    const [bx, bz] = pts[i]!;
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 0.01) continue;
    const g = new THREE.PlaneGeometry(width, len);
    g.rotateX(-Math.PI / 2);
    g.rotateY(Math.atan2(bx - ax, bz - az));
    g.translate((ax + bx) / 2, y, (az + bz) / 2);
    out.push(g);
  }
  for (const [x, z] of pts) {
    const disc = new THREE.CircleGeometry(width / 2, 10);
    disc.rotateX(-Math.PI / 2);
    disc.translate(x, y, z);
    out.push(disc);
  }
  return out;
}

const ROAD_LOOK: Record<LayoutRoad['certainty'], { colour: string; widthScale: number; y: number }> = {
  traced: { colour: '#4E555F', widthScale: 1, y: 0.09 },
  inferred: { colour: '#5A616B', widthScale: 0.7, y: 0.08 },
  unknown: { colour: '#B08A5E', widthScale: 0.8, y: 0.07 }, // dirt track
};

function buildGround() {
  const pieces: THREE.BufferGeometry[] = [];
  // Roads, with a pale kerb underneath traced ones.
  for (const r of campus.roads) {
    const look = ROAD_LOOK[r.certainty];
    const w = Math.max(r.width * look.widthScale, 3);
    if (r.certainty === 'traced') for (const g of ribbon(r.points, w + 1.2, 0.05)) pieces.push(coloured(g, '#CFC8B8'));
    for (const g of ribbon(r.points, w, look.y)) pieces.push(coloured(g, look.colour));
  }
  // Open ground: a lighter, scrubby green.
  for (const o of campus.openGround) pieces.push(coloured(flatPolygon(o.points, 0.03), '#A9C97E'));
  const ground = mergeGeometries(pieces, false)!;
  pieces.forEach((g) => g.dispose());

  // The running track: a red oval with a green infield.
  const track = mergeGeometries(
    [coloured(flatPolygon(campus.track, 0.04), '#6DBE5A'), ...ribbon(campus.track, 7, 0.06, true).map((g) => coloured(g, '#C1502E'))],
    false,
  )!;
  return { ground, track };
}

let cache: ReturnType<typeof buildGround> | null = null;

export function CampusGround({ grass }: { grass: string }) {
  const { ground, track } = useMemo(() => (cache ??= buildGround()), []);
  const travelTo = useGameStore((s) => s.travelTo);
  const plane = useMemo(() => {
    const b = campus.bounds;
    const size = Math.max(b.maxX - b.minX, b.maxZ - b.minZ) + 1200;
    const g = new THREE.PlaneGeometry(size, size);
    g.rotateX(-Math.PI / 2);
    g.translate((b.minX + b.maxX) / 2, 0, (b.minZ + b.maxZ) / 2);
    return g;
  }, []);

  function onTrack(e: ThreeEvent<MouseEvent>) {
    if (gesture.moved || e.delta > 10) return;
    e.stopPropagation();
    travelTo('field');
  }

  return (
    <group>
      <mesh geometry={plane} material={grassMaterial(grass)} />
      <mesh geometry={ground} material={vertexMaterial} />
      <mesh geometry={track} material={vertexMaterial} onClick={onTrack} />
    </group>
  );
}
