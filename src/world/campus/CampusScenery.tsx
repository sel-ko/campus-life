// Trees and bushes: packed into the gardens you drew, scattered lightly on
// open ground inside sections, and thicker in the bush around the campus.
// Instanced, so all of them are three draw calls.
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CELL, COLS, ROWS, buildings, cellRect, isRoad } from '../../content/campusMap';
import { cylinder, ico, seededRandom } from '../three-utils';

const LEAF_COLOURS = ['#3F8F4A', '#4FA35A', '#2F7A3E', '#5CAF4E', '#6B9E3A'];
const trunkGeo = cylinder(0.3, 0.45, 3, 6);
const leafGeo = ico(2.4, 0);
const bushGeo = ico(1.2, 0);
const trunkMat = new THREE.MeshLambertMaterial({ color: '#6B4423' });
const leafMat = new THREE.MeshLambertMaterial({ color: '#FFFFFF', flatShading: true });

interface Spot {
  x: number;
  z: number;
  s: number;
}

function scatter(): { trees: Spot[]; bushes: Spot[] } {
  const rand = seededRandom(23);
  const trees: Spot[] = [];
  const bushes: Spot[] = [];
  // Which planner squares hold something (so trees stay off them).
  const taken = new Set<string>();
  for (const b of buildings) {
    if (b.kind === 'trees') continue;
    for (let x = b.cells.x; x < b.cells.x + b.cells.w; x++) for (let y = b.cells.y; y < b.cells.y + b.cells.h; y++) taken.add(`${x},${y}`);
  }
  // Gardens: packed with trees.
  for (const b of buildings.filter((k) => k.kind === 'trees')) {
    const p = b.plot;
    for (let x = p.x0 + 3; x < p.x1 - 2; x += 5.5) {
      for (let z = p.z0 + 3; z < p.z1 - 2; z += 5.5) {
        trees.push({ x: x + (rand() - 0.5) * 2.5, z: z + (rand() - 0.5) * 2.5, s: 0.75 + rand() * 0.5 });
        if (rand() < 0.4) bushes.push({ x: x + 2.5, z: z + 2, s: 0.7 + rand() * 0.4 });
      }
    }
  }
  // Empty squares on the map (a few trees) and the bush around it (many).
  const MARGIN = 12;
  for (let x = -MARGIN; x < COLS + MARGIN; x++) {
    for (let y = -MARGIN; y < ROWS + MARGIN; y++) {
      if (taken.has(`${x},${y}`) || isRoad(x, y)) continue;
      // Keep a clear verge beside roads.
      if (isRoad(x - 1, y) || isRoad(x + 1, y) || isRoad(x, y - 1) || isRoad(x, y + 1)) continue;
      const inside = x >= 0 && y >= 0 && x < COLS && y < ROWS;
      const chance = inside ? 0.18 : 0.7;
      if (rand() > chance) continue;
      const r = cellRect(x, y, 1, 1);
      const count = inside ? 1 : 1 + Math.floor(rand() * 2);
      for (let i = 0; i < count; i++) {
        const px = r.x0 + 2 + rand() * (CELL - 4);
        const pz = r.z0 + 2 + rand() * (CELL - 4);
        if (rand() < 0.75) trees.push({ x: px, z: pz, s: 0.7 + rand() * 0.6 });
        else bushes.push({ x: px, z: pz, s: 0.7 + rand() * 0.5 });
      }
    }
  }
  return { trees, bushes };
}

function Instanced({ spots, geo, mat, y, coloured }: { spots: Spot[]; geo: THREE.BufferGeometry; mat: THREE.Material; y: number; coloured?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const c = new THREE.Color();
    spots.forEach((t, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * 1.7);
      m.compose(new THREE.Vector3(t.x, y * t.s, t.z), q, new THREE.Vector3(t.s, t.s, t.s));
      ref.current!.setMatrixAt(i, m);
      if (coloured) ref.current!.setColorAt(i, c.set(LEAF_COLOURS[i % LEAF_COLOURS.length]!));
    });
    ref.current!.instanceMatrix.needsUpdate = true;
    if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true;
    ref.current!.computeBoundingSphere();
  }, [spots, y, coloured]);
  return <instancedMesh ref={ref} args={[geo, mat, Math.max(1, spots.length)]} />;
}

export function CampusScenery({ quality }: { quality: 'high' | 'battery' }) {
  const { trees, bushes } = useMemo(scatter, []);
  // Battery saver: half the trees.
  const shown = quality === 'high' ? trees : trees.filter((_, i) => i % 2 === 0);
  return (
    <group>
      <Instanced spots={shown} geo={trunkGeo} mat={trunkMat} y={1.5} />
      <Instanced spots={shown} geo={leafGeo} mat={leafMat} y={4.6} coloured />
      <Instanced spots={bushes} geo={bushGeo} mat={leafMat} y={0.8} coloured />
    </group>
  );
}
