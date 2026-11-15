// Trees and bushes (instanced), the main gate, signposts at the other
// markers, and a billboard plus vendor stall at the buka and the gate.
import type { ThreeEvent } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { campus, campusPlaces } from '../../content/campusPlaces';
import { university } from '../../content/university';
import { useGameStore } from '../../store/gameStore';
import { distToSegment, pointInPolygon, type Pt } from '../campusLayout';
import { gesture } from '../shared';
import { Parts, box, cylinder, ico, material, roundedBox, seededRandom, signTexture } from '../three-utils';
import { isBlocked } from './navigation';

// ---------- trees ----------

const LEAF_COLOURS = ['#3F8F4A', '#4FA35A', '#2F7A3E', '#5CAF4E', '#6B9E3A'];
const trunkGeo = cylinder(0.35, 0.5, 3, 6);
const leafGeo = ico(2.6, 0);
const bushGeo = ico(1.3, 0);
const trunkMat = new THREE.MeshLambertMaterial({ color: '#6B4423' });
const leafMat = new THREE.MeshLambertMaterial({ color: '#FFFFFF', flatShading: true });

interface Spot {
  x: number;
  z: number;
  s: number;
}

/** Road segments bucketed on a grid, so "is this near a road?" is quick. */
function roadIndex() {
  const CELL = 60;
  const grid = new Map<string, Array<{ a: Pt; b: Pt; w: number }>>();
  for (const r of campus.roads) {
    for (let i = 1; i < r.points.length; i++) {
      const a = r.points[i - 1]!;
      const b = r.points[i]!;
      const seg = { a, b, w: r.width };
      const x0 = Math.floor((Math.min(a[0], b[0]) - 20) / CELL);
      const x1 = Math.floor((Math.max(a[0], b[0]) + 20) / CELL);
      const z0 = Math.floor((Math.min(a[1], b[1]) - 20) / CELL);
      const z1 = Math.floor((Math.max(a[1], b[1]) + 20) / CELL);
      for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) (grid.get(`${x},${z}`) ?? grid.set(`${x},${z}`, []).get(`${x},${z}`)!).push(seg);
    }
  }
  return (p: Pt, extra: number) =>
    (grid.get(`${Math.floor(p[0] / CELL)},${Math.floor(p[1] / CELL)}`) ?? []).some((s) => distToSegment(p, s.a, s.b) < s.w / 2 + extra);
}

function scatter(): { trees: Spot[]; bushes: Spot[] } {
  const rand = seededRandom(11);
  const nearRoad = roadIndex();
  const b = campus.bounds;
  const inZone = (x: number, z: number) =>
    (['ps', 'ts', 'estate'] as const).some((k) => {
      const zb = campus.zoneBounds[k];
      return x > zb.minX && x < zb.maxX && z > zb.minZ && z < zb.maxZ;
    });
  const clear = (p: Pt, margin: number) =>
    !nearRoad(p, margin) &&
    !isBlocked(p[0], p[1]) &&
    !isBlocked(p[0] + margin, p[1]) &&
    !isBlocked(p[0] - margin, p[1]) &&
    !isBlocked(p[0], p[1] + margin) &&
    !isBlocked(p[0], p[1] - margin) &&
    !campus.openGround.some((o) => pointInPolygon(p, o.points)) &&
    !pointInPolygon(p, campus.track) &&
    !campusPlaces.some((pl) => Math.hypot(pl.position[0] - p[0], pl.position[1] - p[1]) < 6);

  const trees: Spot[] = [];
  const bushes: Spot[] = [];
  const STEP = 16;
  for (let x = b.minX - 120; x < b.maxX + 120; x += STEP) {
    for (let z = b.minZ - 120; z < b.maxZ + 120; z += STEP) {
      const p: Pt = [x + (rand() - 0.5) * STEP, z + (rand() - 0.5) * STEP];
      // Thicker bush between the sections, lighter planting inside them.
      const chance = inZone(p[0], p[1]) ? 0.22 : 0.5;
      const roll = rand();
      if (roll < chance && trees.length < 1600 && clear(p, 4)) trees.push({ x: p[0], z: p[1], s: 0.7 + rand() * 0.7 });
      else if (roll < chance + 0.08 && bushes.length < 700 && clear(p, 2)) bushes.push({ x: p[0], z: p[1], s: 0.7 + rand() * 0.6 });
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
  return <instancedMesh ref={ref} args={[geo, mat, spots.length]} />;
}

// ---------- gate, signposts, billboards, stalls ----------

/** Direction of the nearest road at a point, as an angle about Y. */
function roadAngleNear(p: Pt): number {
  let best = Infinity;
  let angle = 0;
  for (const r of campus.roads) {
    for (let i = 1; i < r.points.length; i++) {
      const a = r.points[i - 1]!;
      const b = r.points[i]!;
      const d = distToSegment(p, a, b);
      if (d < best) {
        best = d;
        angle = Math.atan2(b[0] - a[0], b[1] - a[1]);
      }
    }
  }
  return angle;
}

function buildProps() {
  const p = new Parts();
  const gatePart = new Parts();
  const { primary, accent } = university.colours;
  for (const m of campus.markers) {
    const [x, z] = m.at;
    const angle = roadAngleNear(m.at);
    if (m.name === 'Main entrance') {
      // Two pillars either side of the road and a beam across it.
      const across: Pt = [Math.cos(angle), -Math.sin(angle)];
      for (const s of [-1, 1]) {
        gatePart.add(roundedBox(2.2, 7, 2.2, 0.2), '#E8E0D0', x + across[0] * 13 * s, 3.5, z + across[1] * 13 * s);
        gatePart.add(roundedBox(2.6, 0.5, 2.6, 0.1), primary, x + across[0] * 13 * s, 7.2, z + across[1] * 13 * s);
      }
      gatePart.add(roundedBox(28, 1.6, 1.6, 0.2), primary, x, 7.8, z, [0, angle + Math.PI / 2, 0]);
      gatePart.add(box(28.1, 0.4, 1.62), accent, x, 7.2, z, [0, angle + Math.PI / 2, 0]);
      gatePart.add(roundedBox(3.4, 3, 3.4, 0.2), '#E8E0D0', x + across[0] * 17, 1.5, z + across[1] * 17);
    } else {
      // A signpost beside the road.
      p.add(cylinder(0.15, 0.18, 4, 6), '#6B4423', x, 2, z);
      p.add(roundedBox(3, 0.8, 0.15, 0.05), '#F4EFE6', x, 3.6, z, [0, angle + Math.PI / 2, 0]);
    }
  }
  // Billboard frame and stall near the buka and the gate (where ads and vendors go).
  for (const id of ['buka-place', 'gate']) {
    const place = id === 'gate' ? campusPlaces.find((pl) => pl.id === 'gate') : campusPlaces.find((pl) => pl.type === 'cafeteria');
    if (!place) continue;
    const [x, z] = place.position;
    const angle = roadAngleNear(place.position);
    const side: Pt = [Math.cos(angle), -Math.sin(angle)];
    const bx = x + side[0] * 9;
    const bz = z + side[1] * 9;
    for (const s of [-1.8, 1.8]) p.add(cylinder(0.15, 0.15, 4.5, 6), '#3A3F45', bx + side[0] * s, 2.25, bz + side[1] * s);
    p.add(roundedBox(5.2, 2.9, 0.25, 0.06), '#2A2F35', bx, 5.3, bz, [0, angle + Math.PI / 2, 0]);
    const sx = x - side[0] * 7;
    const sz = z - side[1] * 7;
    p.add(roundedBox(3, 1.1, 1.4, 0.08), '#F4EFE6', sx, 0.55, sz, [0, angle, 0]);
    for (let i = 0; i < 4; i++) {
      p.add(box(0.8, 0.2, 1.8), i % 2 ? primary : accent, sx + side[0] * (-1.2 + i * 0.8), 2.4, sz + side[1] * (-1.2 + i * 0.8), [0.2, angle + Math.PI / 2, 0]);
    }
  }
  return { other: p.merge(), gate: gatePart.merge() };
}

const boardGeo = new THREE.PlaneGeometry(5, 2.7);

export function CampusScenery({ quality }: { quality: 'high' | 'battery' }) {
  const { trees, bushes } = useMemo(scatter, []);
  const props = useMemo(buildProps, []);
  const travelTo = useGameStore((s) => s.travelTo);
  const boardMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: signTexture(['YOUR AD HERE', 'Advertise on Campus Life'], university.colours.accent, '#14202B'), side: THREE.DoubleSide }),
    [],
  );
  const boards = useMemo(
    () =>
      ['cafeteria', 'gate'].flatMap((kind) => {
        const place = campusPlaces.find((pl) => (kind === 'gate' ? pl.id === 'gate' : pl.type === 'cafeteria'));
        if (!place) return [];
        const angle = roadAngleNear(place.position);
        const side: Pt = [Math.cos(angle), -Math.sin(angle)];
        return [{ key: kind, x: place.position[0] + side[0] * 9, z: place.position[1] + side[1] * 9, angle: angle + Math.PI / 2 }];
      }),
    [],
  );
  // Battery saver: fewer trees.
  const shownTrees = quality === 'high' ? trees : trees.filter((_, i) => i % 2 === 0);

  function onGate(e: ThreeEvent<MouseEvent>) {
    if (gesture.moved || e.delta > 10) return;
    e.stopPropagation();
    travelTo('gate');
  }

  return (
    <group>
      <Instanced spots={shownTrees} geo={trunkGeo} mat={trunkMat} y={1.5} />
      <Instanced spots={shownTrees} geo={leafGeo} mat={leafMat} y={5} coloured />
      <Instanced spots={bushes} geo={bushGeo} mat={leafMat} y={0.8} coloured />
      {props.other.map((part, i) => (
        <mesh key={i} geometry={part.geometry} material={material(part.color, part.flat)} />
      ))}
      <group onClick={onGate}>
        {props.gate.map((part, i) => (
          <mesh key={i} geometry={part.geometry} material={material(part.color, part.flat)} />
        ))}
      </group>
      {boards.map((b) => (
        <mesh key={b.key} geometry={boardGeo} material={boardMat} position={[b.x, 5.3, b.z]} rotation={[0, b.angle, 0]} />
      ))}
    </group>
  );
}
