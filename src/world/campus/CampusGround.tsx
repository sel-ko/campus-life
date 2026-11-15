// Grass, a pad for each section, and the roads drawn square by square from
// the planner (kerbs on open edges, dashes down the middle of straight runs).
import { useMemo } from 'react';
import * as THREE from 'three';
import { CELL, cellRect, isRoad, mapBounds, roadCells, sections } from '../../content/campusMap';

const groundMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });

/** Grass is pushed back a little in depth so the flat layers above never flicker. */
const grassMaterials = new Map<string, THREE.Material>();
function grassMaterial(colour: string): THREE.Material {
  let m = grassMaterials.get(colour);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color: colour, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 4 });
    grassMaterials.set(colour, m);
  }
  return m;
}

function buildGround(): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const c = new THREE.Color();
  const flat = (x0: number, z0: number, x1: number, z1: number, y: number, colour: string) => {
    c.set(colour);
    for (const [x, z] of [
      [x0, z1],
      [x1, z1],
      [x1, z0],
      [x0, z1],
      [x1, z0],
      [x0, z0],
    ] as const) {
      pos.push(x, y, z);
      nor.push(0, 1, 0);
      col.push(c.r, c.g, c.b);
    }
  };
  const kerb = (x0: number, z0: number, x1: number, z1: number) => {
    // A low pale strip: top plus the outer faces are enough from above.
    flat(x0, z0, x1, z1, 0.22, '#D6D0C2');
  };

  // Section pads: a paler, paved-looking ground tinted by the section's colour.
  for (const s of sections) {
    const tint = new THREE.Color('#E3D6B4').lerp(new THREE.Color(s.color), 0.12);
    flat(s.rect.x0, s.rect.z0, s.rect.x1, s.rect.z1, 0.03, `#${tint.getHexString()}`);
  }

  // Roads, one planner square at a time.
  for (const key of roadCells) {
    const [x, y] = key.split(',').map(Number) as [number, number];
    const r = cellRect(x, y, 1, 1);
    flat(r.x0, r.z0, r.x1, r.z1, 0.08, '#4E555F');
    const n = isRoad(x, y - 1);
    const s = isRoad(x, y + 1);
    const w = isRoad(x - 1, y);
    const e = isRoad(x + 1, y);
    const K = 0.6;
    if (!n) kerb(r.x0, r.z0, r.x1, r.z0 + K);
    if (!s) kerb(r.x0, r.z1 - K, r.x1, r.z1);
    if (!w) kerb(r.x0, r.z0, r.x0 + K, r.z1);
    if (!e) kerb(r.x1 - K, r.z0, r.x1, r.z1);
    const cx = (r.x0 + r.x1) / 2;
    const cz = (r.z0 + r.z1) / 2;
    if ((w || e) && !n && !s) flat(r.x0 + 2, cz - 0.15, r.x1 - 2, cz + 0.15, 0.12, '#E9E1C9');
    else if ((n || s) && !w && !e) flat(cx - 0.15, r.z0 + 2, cx + 0.15, r.z1 - 2, 0.12, '#E9E1C9');
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeBoundingSphere();
  return g;
}

let cache: THREE.BufferGeometry | null = null;

export function CampusGround({ grass }: { grass: string }) {
  const ground = useMemo(() => (cache ??= buildGround()), []);
  const plane = useMemo(() => {
    const size = Math.max(mapBounds.x1 - mapBounds.x0, mapBounds.z1 - mapBounds.z0) + 400 * CELL;
    const g = new THREE.PlaneGeometry(size, size);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  return (
    <group>
      <mesh geometry={plane} material={grassMaterial(grass)} />
      <mesh geometry={ground} material={groundMaterial} />
    </group>
  );
}
