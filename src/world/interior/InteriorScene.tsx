// A walkable 3D room. Your character moves with the joystick (or walks to
// whatever you tap), bumps into furniture and walls, and the screen is told
// which interaction target you are standing at. People stand or sit at the
// spots the interaction API gives them. No rules here.
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getPerson } from '../../content/people';
import type { Interaction, Occupant } from '../../game/interactions';
import type { Quality } from '../../store/settingsStore';
import { Character } from '../characters/Character';
import { presetLook } from '../characters/look';
import { joystick } from '../input';
import { Parts, mergeWithVertexColours, vertexColourMaterials } from '../three-utils';
import { fixtureFor, placePeople, type Fixture, type RoomLayout, type Target, type V2 } from './layouts';

const SCALE = 0.75; // characters about 1.8 m tall
const SPEED = 3.4; // metres per second
const RADIUS = 0.3;
const NEAR = 1.35;

export interface InteriorProps {
  layout: RoomLayout;
  interactions: Interaction[];
  occupants: Occupant[];
  characterId: string;
  selected: Target | null;
  onSelect: (t: Target | null) => void;
  onNear: (t: Target | null) => void;
  paused: boolean;
  quality: Quality;
  night: boolean;
}

const same = (a: Target | null, b: Target | null) => !!a && !!b && a.type === b.type && (a.id ?? '') === (b.id ?? '');
const hitMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });

function Room({ layout }: { layout: RoomLayout }) {
  const geo = useMemo(() => {
    const p = new Parts();
    layout.build(p);
    return mergeWithVertexColours(p);
  }, [layout]);
  const { w, d, wall, floor, outdoor } = layout;
  const H = 3.2;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[outdoor ? w + 30 : w, outdoor ? d + 30 : d]} />
        <meshLambertMaterial color={floor} />
      </mesh>
      {!outdoor && (
        <>
          <mesh position={[0, H / 2, -d / 2 - 0.1]}>
            <boxGeometry args={[w + 0.4, H, 0.2]} />
            <meshLambertMaterial color={wall} />
          </mesh>
          <mesh position={[-w / 2 - 0.1, H / 2, 0]}>
            <boxGeometry args={[0.2, H, d]} />
            <meshLambertMaterial color={new THREE.Color(wall).multiplyScalar(0.92)} />
          </mesh>
          <mesh position={[w / 2 + 0.1, H / 2, 0]}>
            <boxGeometry args={[0.2, H, d]} />
            <meshLambertMaterial color={new THREE.Color(wall).multiplyScalar(0.92)} />
          </mesh>
          {/* A low front wall either side of the door, so the camera can see in. */}
          <mesh position={[-w / 4 - 0.4, 0.35, d / 2 + 0.1]}>
            <boxGeometry args={[w / 2 - 0.8, 0.7, 0.2]} />
            <meshLambertMaterial color={wall} />
          </mesh>
          <mesh position={[w / 4 + 0.4, 0.35, d / 2 + 0.1]}>
            <boxGeometry args={[w / 2 - 0.8, 0.7, 0.2]} />
            <meshLambertMaterial color={wall} />
          </mesh>
          {/* Skirting along the walls. */}
          <mesh position={[0, 0.06, -d / 2 + 0.02]}>
            <boxGeometry args={[w, 0.12, 0.04]} />
            <meshLambertMaterial color="#5B4636" />
          </mesh>
        </>
      )}
      {geo.smooth && <mesh geometry={geo.smooth} material={vertexColourMaterials.smooth} />}
      {geo.flat && <mesh geometry={geo.flat} material={vertexColourMaterials.flat} />}
    </group>
  );
}

function Marker({ at, active }: { at: [number, number, number]; active: boolean }) {
  const m = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!m.current) return;
    m.current.position.y = at[1] + 0.45 + Math.sin(clock.elapsedTime * 3) * 0.1;
    m.current.rotation.y = clock.elapsedTime * 1.5;
  });
  return (
    <mesh ref={m} position={at} scale={active ? 1.4 : 1}>
      <octahedronGeometry args={[0.16]} />
      <meshBasicMaterial color={active ? '#FFFFFF' : '#F5B83D'} />
    </mesh>
  );
}

function blocked(layout: RoomLayout, x: number, z: number): boolean {
  if (!layout.outdoor && (Math.abs(x) > layout.w / 2 - RADIUS || Math.abs(z) > layout.d / 2 - RADIUS)) return true;
  if (layout.outdoor && (Math.abs(x) > layout.w / 2 + 8 || Math.abs(z) > layout.d / 2 + 8)) return true;
  for (const f of layout.fixtures) {
    const s = f.solid;
    if (s && x > s[0] - RADIUS && x < s[2] + RADIUS && z > s[1] - RADIUS && z < s[3] + RADIUS) return true;
  }
  return false;
}

interface PlayerProps extends Pick<InteriorProps, 'layout' | 'characterId' | 'onNear' | 'onSelect'> {
  goal: { current: V2 | null };
  live: Array<{ target: Target; use: V2 }>;
  people: Array<{ target: Target; at: V2 }>;
}

function Walker({ layout, characterId, onNear, onSelect, goal, live, people }: PlayerProps) {
  const look = useMemo(() => presetLook(characterId), [characterId]);
  const group = useRef<THREE.Group>(null);
  const walking = useRef(false);
  const pos = useRef(new THREE.Vector3(layout.spawn[0], 0, layout.spawn[1]));
  const near = useRef<Target | null>(null);
  const steering = useRef(false);
  const { camera, size } = useThree();
  const cam = useRef(new THREE.Vector3(layout.spawn[0], 8, layout.spawn[1] + 7));

  useEffect(() => {
    pos.current.set(layout.spawn[0], 0, layout.spawn[1]);
    if (group.current) group.current.rotation.y = Math.PI;
  }, [layout]);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const p = pos.current;
    let dx = 0;
    let dz = 0;
    const stick = Math.hypot(joystick.x, joystick.y);
    if (joystick.active && stick > 0.12) {
      // Walking off with the joystick drops whatever you had tapped.
      if (goal.current || !steering.current) onSelect(null);
      steering.current = true;
      goal.current = null;
      dx = (joystick.x / stick) * Math.min(stick, 1);
      dz = (joystick.y / stick) * Math.min(stick, 1);
    } else if (goal.current) {
      steering.current = false;
      const gx = goal.current[0] - p.x;
      const gz = goal.current[1] - p.z;
      const dist = Math.hypot(gx, gz);
      if (dist < 0.12) goal.current = null;
      else {
        dx = gx / dist;
        dz = gz / dist;
      }
    }
    if (!joystick.active) steering.current = false;
    const moving = dx !== 0 || dz !== 0;
    if (moving) {
      const step = SPEED * dt;
      const nx = p.x + dx * step;
      const nz = p.z + dz * step;
      if (blocked(layout, p.x, p.z) || !blocked(layout, nx, nz)) p.set(nx, 0, nz);
      else if (!blocked(layout, nx, p.z)) p.x = nx;
      else if (!blocked(layout, p.x, nz)) p.z = nz;
      else goal.current = null; // stuck: stop walking into furniture
      if (group.current) group.current.rotation.y = Math.atan2(dx, dz);
    }
    walking.current = moving;
    group.current?.position.copy(p);

    // What are you standing at?
    let best: Target | null = null;
    let bestD = NEAR;
    for (const l of live) {
      const dd = Math.hypot(l.use[0] - p.x, l.use[1] - p.z);
      if (dd < bestD) {
        bestD = dd;
        best = l.target;
      }
    }
    for (const person of people) {
      const dd = Math.hypot(person.at[0] - p.x, person.at[1] - p.z) - 0.25;
      if (dd < bestD) {
        bestD = dd;
        best = person.target;
      }
    }
    if (!same(best, near.current) && !(best === null && near.current === null)) {
      near.current = best;
      onNear(best);
    }

    // Camera: high above and behind, drifting with you but keeping most of
    // the room in view (portrait phones see less across).
    const aspect = size.width / Math.max(size.height, 1);
    // Fit the room's width on screen whatever the shape of the phone.
    const hFov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(27.5)) * aspect);
    const fit = (layout.w * 0.5 + 0.5) / Math.tan(hFov / 2);
    const back = Math.min(Math.max(fit, layout.d * 0.9), 26);
    cam.current.lerp(new THREE.Vector3(p.x * 0.3, back * 0.9, p.z * 0.35 + back * 0.42), 1 - Math.exp(-dt * 4));
    camera.position.copy(cam.current);
    camera.lookAt(p.x * 0.3, 0, p.z * 0.35 - 0.2);
  });

  return (
    <group ref={group}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.45, 20]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.2} depthWrite={false} />
      </mesh>
      <group scale={SCALE}>
        <Character look={look} walking={walking} />
      </group>
    </group>
  );
}

export default function InteriorScene(props: InteriorProps) {
  const { layout, interactions, occupants, characterId, selected, onSelect, onNear, paused, quality, night } = props;
  const goal = useRef<V2 | null>(null);

  // Fixtures with something available right now get a marker.
  const live = useMemo(() => {
    const out: Array<{ target: Target; use: V2; f: Fixture }> = [];
    for (const f of layout.fixtures) {
      const t = f.target;
      if (!t) continue;
      const has = interactions.some((i) => i.available && i.kind !== 'wait' && i.target.type === t.type && (!i.target.id || !t.id || i.target.id === t.id));
      if (has) out.push({ target: t, use: f.use, f });
    }
    return out;
  }, [layout, interactions]);

  const people = useMemo(() => placePeople(layout, occupants), [layout, occupants]);
  const peopleTargets = useMemo(() => people.map(({ o, at }) => ({ target: { type: 'person' as const, id: o.personId }, at: [at[0], at[1]] as V2 })), [people]);

  function tapFixture(f: Fixture) {
    if (!f.target) return;
    onSelect(f.target);
    goal.current = f.use;
  }

  const selectedFixture = selected && selected.type !== 'person' ? fixtureFor(layout, selected) : undefined;
  const club = layout.floor === '#2C2545';

  return (
    <Canvas
      dpr={quality === 'high' ? [1, 1.5] : 1}
      frameloop={paused ? 'never' : 'always'}
      camera={{ fov: 55, position: [0, 14, 8], near: 0.3, far: 150 }}
      style={{ touchAction: 'none' }}
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={[layout.outdoor ? (night ? '#16223F' : '#9ED8F5') : '#0E161E']} />
      <hemisphereLight args={[club ? '#D8B8FF' : '#FFF4E0', club ? '#5A3A7A' : '#40362C', club ? 2.2 : night && layout.outdoor ? 0.9 : 1.7]} />
      <directionalLight position={[4, 10, 6]} intensity={club ? 1.4 : 1.3} color={club ? '#FFB0E8' : '#FFFFFF'} />
      <Room layout={layout} />

      {/* Invisible tap boxes over everything you can use. */}
      {layout.fixtures
        .filter((f) => f.target)
        .map((f) => {
          const s = f.solid;
          const cx = s ? (s[0] + s[2]) / 2 : f.use[0];
          const cz = s ? (s[1] + s[3]) / 2 : f.use[1] - 0.6;
          const w = s ? s[2] - s[0] : 1.2;
          const dd = s ? s[3] - s[1] : 1.2;
          const h = Math.max(0.6, f.height);
          return (
            <mesh
              key={f.key}
              position={[cx, h / 2, cz]}
              material={hitMaterial}
              onClick={(e) => {
                e.stopPropagation();
                tapFixture(f);
              }}
            >
              <boxGeometry args={[w, h, dd]} />
            </mesh>
          );
        })}

      {live.map(({ f }) => {
        const s = f.solid;
        const x = s ? (s[0] + s[2]) / 2 : f.use[0];
        const z = s ? (s[1] + s[3]) / 2 : f.use[1] - 0.6;
        return <Marker key={f.key} at={[x, Math.max(0.6, f.height), z]} active={same(selected, f.target ?? null)} />;
      })}

      {selectedFixture && (
        <mesh position={[selectedFixture.use[0], 0.03, selectedFixture.use[1]]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.38, 0.5, 28]} />
          <meshBasicMaterial color="#F5B83D" />
        </mesh>
      )}

      {people.map(({ o, at }, i) => {
        const def = getPerson(o.personId);
        const chosen = selected?.type === 'person' && selected.id === o.personId;
        return (
          <group
            key={o.personId}
            position={[at[0], 0, at[1]]}
            rotation={[0, at[2], 0]}
            onClick={(e) => {
              e.stopPropagation();
              onSelect({ type: 'person', id: o.personId });
              goal.current = [at[0], at[1] + (at[1] > 0 ? -0.9 : 0.9)];
            }}
          >
            <group scale={SCALE}>
              <Character look={presetLook(def?.look ?? 'm1')} phase={i * 0.9} />
            </group>
            <mesh position={[0, 2.3, 0]} visible={chosen}>
              <octahedronGeometry args={[0.16]} />
              <meshBasicMaterial color="#F5B83D" />
            </mesh>
          </group>
        );
      })}

      <Walker layout={layout} characterId={characterId} onNear={onNear} onSelect={onSelect} goal={goal} live={live} people={peopleTargets} />
    </Canvas>
  );
}
