// Cars driving round the roads of campus, the hostels and town: each one
// rolls from road square to road square, keeping to the right, turning at
// junctions (mostly going straight on), never reversing unless it must.
// Decoration only: no rules here, and they do not block anyone.
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { cellCentre, isRoad, roadCells } from '../content/campusMap';

const COLOURS = ['#C0202E', '#1F4E9C', '#F2C230', '#EDE6D6', '#2E3A44', '#2E8B57', '#8E3B8A', '#B8BEC6', '#E8742A'];
const SPEED = 9; // metres per second
const LANE = 1.6; // metres right of the road's middle

type Cell = [number, number];

interface CarState {
  from: Cell;
  to: Cell;
  t: number;
  len: number;
}

function neighbours([x, y]: Cell): Cell[] {
  return ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).map(([dx, dy]) => [x + dx, y + dy] as Cell).filter(([a, b]) => isRoad(a, b));
}

/** Where to go next: straight on most of the time, any other way otherwise, back only at a dead end. */
function nextCell(prev: Cell, here: Cell, rand: () => number): Cell {
  const options = neighbours(here).filter((c) => c[0] !== prev[0] || c[1] !== prev[1]);
  if (!options.length) return prev;
  const ahead: Cell = [here[0] + (here[0] - prev[0]), here[1] + (here[1] - prev[1])];
  const straight = options.find((c) => c[0] === ahead[0] && c[1] === ahead[1]);
  if (straight && rand() < 0.75) return straight;
  return options[Math.floor(rand() * options.length)]!;
}

function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function CarModel({ colour }: { colour: string }) {
  return (
    <group>
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[1.9, 0.8, 4.2]} />
        <meshLambertMaterial color={colour} />
      </mesh>
      <mesh position={[0, 1.4, -0.2]}>
        <boxGeometry args={[1.7, 0.6, 2.2]} />
        <meshLambertMaterial color="#2B3A48" />
      </mesh>
      {(
        [
          [-0.95, 1.3],
          [0.95, 1.3],
          [-0.95, -1.3],
          [0.95, -1.3],
        ] as const
      ).map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.38, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.38, 0.38, 0.3, 10]} />
          <meshLambertMaterial color="#111111" />
        </mesh>
      ))}
      <mesh position={[0, 0.8, 2.11]}>
        <boxGeometry args={[1.4, 0.18, 0.02]} />
        <meshBasicMaterial color="#FFF3C4" />
      </mesh>
    </group>
  );
}

export function Cars({ count }: { count: number }) {
  const rand = useMemo(() => seeded(77), []);
  const cars = useMemo(() => {
    const cells = [...roadCells].map((k) => k.split(',').map(Number) as Cell).filter((c) => neighbours(c).length >= 2);
    return Array.from({ length: count }, (_, i) => {
      const start = cells[Math.floor(rand() * cells.length)]!;
      const to = neighbours(start)[0]!;
      return { colour: COLOURS[i % COLOURS.length]!, state: { from: start, to, t: rand(), len: 10 } as CarState };
    });
  }, [count, rand]);
  const refs = useRef<Array<THREE.Group | null>>([]);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    cars.forEach((car, i) => {
      const g = refs.current[i];
      if (!g) return;
      const s = car.state;
      const a = cellCentre(...s.from);
      const b = cellCentre(...s.to);
      s.len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 10;
      s.t += (SPEED * dt) / s.len;
      if (s.t >= 1) {
        const next = nextCell(s.from, s.to, rand);
        s.from = s.to;
        s.to = next;
        s.t -= 1;
        return;
      }
      const dx = (b[0] - a[0]) / s.len;
      const dz = (b[1] - a[1]) / s.len;
      // Keep to the right of the road's middle.
      g.position.set(a[0] + (b[0] - a[0]) * s.t - dz * LANE, 0, a[1] + (b[1] - a[1]) * s.t + dx * LANE);
      g.rotation.y = Math.atan2(dx, dz);
    });
  });

  return (
    <group>
      {cars.map((car, i) => (
        <group
          key={i}
          ref={(g) => {
            refs.current[i] = g;
          }}
        >
          <CarModel colour={car.colour} />
        </group>
      ))}
    </group>
  );
}
