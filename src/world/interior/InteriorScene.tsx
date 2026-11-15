// A simple 3D room for the inside screen. Each kind of place has a layout of
// boxy furniture; every piece is a target from the interaction API (seat,
// lecturer, desk, counter, bed, locker, shelf, bench, stove, board, door), and
// people stand at the spots the API gives them. Tapping a piece or a person
// tells the screen which interactions to show. No rules live here.
import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type * as THREE from 'three';
import type { Interaction, Occupant, TargetType } from '../../game/interactions';
import type { PlaceType } from '../../game/types';
import type { Quality } from '../../store/settingsStore';
import { Character } from '../characters/Character';
import { presetLook } from '../characters/look';
import { getPerson } from '../../content/people';

type Target = { type: TargetType; id?: string };

interface Piece {
  key: string;
  target: Target;
  pos: [number, number, number];
  size: [number, number, number];
  colour: string;
}

const W = 14;
const D = 10;

function grid<T>(cols: number, rows: number, fn: (c: number, r: number, i: number) => T): T[] {
  const out: T[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push(fn(c, r, r * cols + c));
  return out;
}

/** Furniture for each kind of room. */
function layout(type: PlaceType): Piece[] {
  const door: Piece = { key: 'door', target: { type: 'door' }, pos: [W / 2 - 1.5, 1.1, D / 2 - 0.1], size: [1.4, 2.2, 0.15], colour: '#6B4A2E' };
  switch (type) {
    case 'lecture_hall':
    case 'lab':
      return [
        { key: 'board', target: { type: 'board' }, pos: [0, 1.8, -D / 2 + 0.1], size: [6, 1.8, 0.1], colour: type === 'lab' ? '#E8ECEF' : '#24433A' },
        { key: 'lectern', target: { type: 'lecturer' }, pos: [-3.5, 0.55, -D / 2 + 1.6], size: [1.2, 1.1, 0.8], colour: '#7A5634' },
        ...grid(3, 3, (c, r, i) => ({
          key: `seat-${i + 1}`,
          target: { type: 'seat' as const, id: `seat-${i + 1}` },
          pos: [(c - 1) * 3.6, 0.45, -1 + r * 2.2] as [number, number, number],
          size: [3, 0.9, 0.9] as [number, number, number],
          colour: type === 'lab' ? '#D9DEE2' : '#9A6B3F',
        })),
        { key: 'desk', target: { type: 'desk' }, pos: [3.8, 0.4, -D / 2 + 1.6], size: [1.6, 0.8, 0.9], colour: '#B98A55' },
        ...(type === 'lab' ? [{ key: 'shelf', target: { type: 'shelf' as const }, pos: [-W / 2 + 0.4, 1.2, 0] as [number, number, number], size: [0.6, 2.4, 4] as [number, number, number], colour: '#5D7A8C' }] : []),
        door,
      ];
    case 'library':
      return [
        ...grid(4, 1, (c, _r, i) => ({ key: `shelf-${i}`, target: { type: 'shelf' as const }, pos: [-5 + c * 3.3, 1.3, -D / 2 + 0.5] as [number, number, number], size: [2.8, 2.6, 0.7] as [number, number, number], colour: '#6E4B2F' })),
        ...grid(2, 2, (c, r, i) => ({ key: `desk-${i}`, target: { type: 'desk' as const }, pos: [-2.4 + c * 4.8, 0.4, -0.6 + r * 2.6] as [number, number, number], size: [3, 0.8, 1.4] as [number, number, number], colour: '#B98A55' })),
        { key: 'counter', target: { type: 'counter' }, pos: [W / 2 - 2, 0.55, 2.8], size: [2.4, 1.1, 1], colour: '#7A5634' },
        { key: 'bench', target: { type: 'bench' }, pos: [-W / 2 + 1.5, 0.3, 3.2], size: [2.4, 0.6, 0.8], colour: '#8C6A45' },
        door,
      ];
    case 'admin_office':
      return [
        ...grid(3, 1, (c, _r, i) => ({ key: `desk-${i}`, target: { type: 'desk' as const }, pos: [-4.4 + c * 4.4, 0.55, -D / 2 + 1.6] as [number, number, number], size: [2.6, 1.1, 1] as [number, number, number], colour: '#8E6A44' })),
        { key: 'board', target: { type: 'board' }, pos: [0, 2, -D / 2 + 0.1], size: [3.2, 1, 0.08], colour: '#F2EEE3' },
        ...grid(2, 2, (c, r, i) => ({ key: `bench-${i}`, target: { type: 'bench' as const }, pos: [-3 + c * 6, 0.3, 1 + r * 2] as [number, number, number], size: [3.2, 0.6, 0.8] as [number, number, number], colour: '#5D6F7C' })),
        door,
      ];
    case 'restaurant':
      return [
        { key: 'counter', target: { type: 'counter' }, pos: [0, 0.6, -D / 2 + 1.2], size: [7, 1.2, 1.2], colour: '#C9692C' },
        ...grid(3, 2, (c, r, i) => ({ key: `bench-${i}`, target: { type: 'bench' as const }, pos: [-4.2 + c * 4.2, 0.4, 0.4 + r * 2.6] as [number, number, number], size: [2.4, 0.8, 1.2] as [number, number, number], colour: '#3F7A5A' })),
        door,
      ];
    case 'shop':
      return [
        { key: 'counter', target: { type: 'counter' }, pos: [0, 0.6, -0.8], size: [6, 1.2, 1.2], colour: '#2F6FB7' },
        { key: 'shelf', target: { type: 'shelf' }, pos: [0, 1.3, -D / 2 + 0.5], size: [10, 2.6, 0.7], colour: '#6E4B2F' },
        { key: 'bench', target: { type: 'bench' }, pos: [-W / 2 + 1.8, 0.3, 3], size: [2.4, 0.6, 0.8], colour: '#5D6F7C' },
        door,
      ];
    case 'hostel_room':
      return [
        ...grid(2, 2, (c, r, i) => ({ key: `bed-${i + 1}`, target: { type: 'bed' as const, id: `bed-${i + 1}` }, pos: [-4.4 + c * 8.8, 0.45, -2.6 + r * 4.2] as [number, number, number], size: [2.2, 0.9, 3.6] as [number, number, number], colour: i === 0 ? '#4E7FBF' : '#7C8B96' })),
        { key: 'locker', target: { type: 'locker' }, pos: [-1.2, 1, -D / 2 + 0.5], size: [1.4, 2, 0.8], colour: '#8E9AA4' },
        { key: 'stove', target: { type: 'stove' }, pos: [1.2, 0.45, -D / 2 + 0.6], size: [1.2, 0.9, 0.9], colour: '#3C3F45' },
        { key: 'desk', target: { type: 'desk' }, pos: [0, 0.4, 1.2], size: [2.2, 0.8, 1.2], colour: '#B98A55' },
        door,
      ];
    case 'clinic':
      return [
        { key: 'desk', target: { type: 'desk' }, pos: [-3, 0.5, -D / 2 + 1.6], size: [2.6, 1, 1.1], colour: '#F2F2F2' },
        ...grid(2, 1, (c, _r, i) => ({ key: `bed-${i}`, target: { type: 'bed' as const }, pos: [2 + c * 3, 0.4, -1] as [number, number, number], size: [1.6, 0.8, 3.2] as [number, number, number], colour: '#DDE8F0' })),
        { key: 'bench', target: { type: 'bench' }, pos: [-3, 0.3, 2.6], size: [3.2, 0.6, 0.8], colour: '#5D6F7C' },
        door,
      ];
    default:
      return [
        { key: 'desk', target: { type: 'desk' }, pos: [0, 0.5, -1.6], size: [3.2, 1, 1.2], colour: '#8E6A44' },
        { key: 'bench', target: { type: 'bench' }, pos: [-3, 0.3, 2], size: [3.2, 0.6, 0.8], colour: '#5D6F7C' },
        { key: 'seat', target: { type: 'seat' }, pos: [3, 0.4, 1], size: [2, 0.8, 0.8], colour: '#9A6B3F' },
        door,
      ];
  }
}

const FLOOR: Partial<Record<PlaceType, string>> = { hostel_room: '#B88A5E', restaurant: '#A9763F', clinic: '#D5DCE0', library: '#7F5B3A', lab: '#C8CDD0' };

function same(a: Target | null, b: Target): boolean {
  return !!a && a.type === b.type && (!a.id || !b.id || a.id === b.id);
}

/** Where a person stands: next to the piece that matches their spot. */
function spotFor(o: Occupant, pieces: Piece[], index: number, all: Occupant[]): [number, number, number] {
  // Several people at the same kind of spot spread over the matching pieces.
  const same = all.filter((x) => x.spot.type === o.spot.type && !x.spot.id?.startsWith('seat') && !x.spot.id?.startsWith('bed'));
  const nth = same.indexOf(o);
  const pieceList = pieces.filter((p) => p.target.type === o.spot.type);
  if ((o.spot.type === 'desk' || o.spot.type === 'counter') && nth >= 0 && pieceList.length > 1) {
    const pc = pieceList[nth % pieceList.length]!;
    return [pc.pos[0], 0, pc.pos[2] - 1.1];
  }
  const match = pieces.find((p) => p.target.type === o.spot.type && (!o.spot.id || p.target.id === o.spot.id)) ?? pieces.find((p) => p.target.type === o.spot.type);
  if (o.spot.type === 'lecturer') return [-3.5, 0, -D / 2 + 2.6];
  if (o.spot.type === 'desk') return match ? [match.pos[0], 0, match.pos[2] - 1.1] : [0, 0, -2];
  if (o.spot.type === 'counter') return match ? [match.pos[0] + 1.2, 0, match.pos[2] - 1.1] : [0, 0, -3];
  if (match) return [match.pos[0] + ((index % 3) - 1) * 0.8, match.pos[1] + match.size[1] / 2 - 0.1, match.pos[2]];
  return [-4 + (index % 5) * 2, 0, 3];
}

function Marker({ at }: { at: [number, number, number] }) {
  const m = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (m.current) {
      m.current.position.y = at[1] + 0.5 + Math.sin(clock.elapsedTime * 3) * 0.12;
      m.current.rotation.y = clock.elapsedTime * 1.5;
    }
  });
  return (
    <mesh ref={m} position={at}>
      <octahedronGeometry args={[0.22]} />
      <meshBasicMaterial color="#F5B83D" />
    </mesh>
  );
}

export interface InteriorProps {
  placeType: PlaceType;
  ownRoom: boolean;
  occupants: Occupant[];
  interactions: Interaction[];
  characterId: string;
  selected: Target | null;
  onTarget: (t: Target | null) => void;
  paused: boolean;
  quality: Quality;
}

export default function InteriorScene({ placeType, occupants, interactions, characterId, selected, onTarget, paused, quality }: InteriorProps) {
  const pieces = useMemo(() => layout(placeType), [placeType]);
  const live = (t: Target) => interactions.some((i) => i.available && i.kind !== 'wait' && i.target.type === t.type && (!i.target.id || !t.id || i.target.id === t.id));
  const playerLook = useMemo(() => presetLook(characterId), [characterId]);

  return (
    <Canvas
      dpr={quality === 'high' ? [1, 1.5] : 1}
      frameloop={paused ? 'never' : 'always'}
      camera={{ fov: 40, position: [0, 11, 12], near: 0.5, far: 80 }}
      onCreated={({ camera }) => camera.lookAt(0, 0, 0.5)}
      onPointerMissed={() => onTarget(null)}
    >
      <color attach="background" args={['#0E161E']} />
      <hemisphereLight args={['#FFF4E0', '#40362C', 1.6]} />
      <directionalLight position={[4, 10, 6]} intensity={1.4} />
      {/* Floor and walls */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshLambertMaterial color={FLOOR[placeType] ?? '#9AA4AA'} />
      </mesh>
      <mesh position={[0, 1.6, -D / 2]}>
        <boxGeometry args={[W, 3.2, 0.1]} />
        <meshLambertMaterial color="#E9E0CC" />
      </mesh>
      <mesh position={[-W / 2, 1.6, 0]}>
        <boxGeometry args={[0.1, 3.2, D]} />
        <meshLambertMaterial color="#DDD2BA" />
      </mesh>
      <mesh position={[W / 2, 1.6, 0]}>
        <boxGeometry args={[0.1, 3.2, D]} />
        <meshLambertMaterial color="#DDD2BA" />
      </mesh>

      {pieces.map((p) => {
        const on = same(selected, p.target);
        return (
          <group key={p.key}>
            <mesh
              position={p.pos}
              onClick={(e) => {
                e.stopPropagation();
                onTarget(p.target.type === 'door' ? null : p.target);
              }}
            >
              <boxGeometry args={p.size} />
              <meshLambertMaterial color={p.colour} emissive={on ? '#F5B83D' : '#000000'} emissiveIntensity={on ? 0.45 : 0} />
            </mesh>
            {live(p.target) && <Marker at={[p.pos[0], p.pos[1] + p.size[1] / 2, p.pos[2]]} />}
          </group>
        );
      })}

      {occupants.map((o, i) => {
        const at = spotFor(o, pieces, i, occupants);
        const def = getPerson(o.personId);
        return (
          <group
            key={o.personId}
            position={at}
            rotation={[0, o.spot.type === 'lecturer' || o.spot.type === 'desk' || o.spot.type === 'counter' ? 0 : Math.PI, 0]}
            scale={0.55}
            onClick={(e) => {
              e.stopPropagation();
              onTarget({ type: 'person', id: o.personId });
            }}
          >
            <Character look={presetLook(def?.look ?? 'm1')} phase={i * 0.9} />
            {same(selected, { type: 'person', id: o.personId }) && (
              <mesh position={[0, 4.2, 0]}>
                <octahedronGeometry args={[0.35]} />
                <meshBasicMaterial color="#F5B83D" />
              </mesh>
            )}
          </group>
        );
      })}

      {/* You, just inside the door. */}
      <group position={[W / 2 - 3.8, 0, D / 2 - 1.4]} rotation={[0, Math.PI + 0.6, 0]} scale={0.6}>
        <Character look={playerLook} />
      </group>
    </Canvas>
  );
}
