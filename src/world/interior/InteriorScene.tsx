// A walkable 3D room, drawn like a little diorama on a patch of ground. Your
// character moves with the joystick (or walks to whatever you tap), bumps into
// furniture, and the screen is told what you are standing at. When you do
// something, your character walks to it and does it where you can see it:
// lies down in bed under the wrapper, bathes under the tap, sits at the desk
// writing. Roommates, lecturers and other students are doing things too. No
// rules here.
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getPerson } from '../../content/people';
import type { Interaction, Occupant } from '../../game/interactions';
import type { Quality } from '../../store/settingsStore';
import { Character, type Pose } from '../characters/Character';
import { presetLook, randomLook } from '../characters/look';
import { joystick } from '../input';
import { Parts, mergeWithVertexColours, vertexColourMaterials } from '../three-utils';
import { Label } from '../Label';
import { CHAR_SCALE, crowdSpots, fixtureFor, placePeople, type Fixture, type RoomLayout, type Spot, type Target, type V2 } from './layouts';

const SPEED = 2.6; // metres per second
const RADIUS = 0.22;
const NEAR = 1.2;
const WALL_H = 2.7;

/** What your character is busy doing (set by the screen). */
export interface Activity {
  target: Target;
  pose: Pose;
  /** 'walk': on the way. 'act': doing it. */
  stage: 'walk' | 'act';
}

export interface InteriorProps {
  layout: RoomLayout;
  interactions: Interaction[];
  occupants: Occupant[];
  characterId: string;
  selected: Target | null;
  onSelect: (t: Target | null) => void;
  onNear: (t: Target | null) => void;
  activity: Activity | null;
  /** The character reached the thing it is about to use. */
  onArrive: () => void;
  /** The joystick took over in the middle of an activity. */
  onCancel: () => void;
  /** You walked out through the doorway. */
  onExit?: () => void;
  /** 0 = empty, 1 = packed. */
  crowd: number;
  /** What to do next, floating over your head (a quest step for here). */
  questTag?: string | null;
  /** Your character's look (from the creator). */
  look?: Look;
  /** Students in your own room share your gender. */
  crowdGender?: 'male' | 'female';
  paused: boolean;
  quality: Quality;
  night: boolean;
}

const same = (a: Target | null, b: Target | null) => !!a && !!b && a.type === b.type && (a.id ?? '') === (b.id ?? '');
const hitMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });

// ---------------------------------------------------------------- the room

function Room({ layout, night }: { layout: RoomLayout; night: boolean }) {
  const geo = useMemo(() => {
    const p = new Parts();
    layout.build(p);
    return mergeWithVertexColours(p);
  }, [layout]);
  const { w, d, wall, floor, outdoor } = layout;
  const side = useMemo(() => new THREE.Color(wall).multiplyScalar(0.9), [wall]);
  const cap = useMemo(() => new THREE.Color(wall).multiplyScalar(0.62), [wall]);
  const gap = layout.doorX ?? layout.spawn[0];
  const leftW = gap - 0.8 + w / 2;
  const rightW = w / 2 - (gap + 0.8);
  return (
    <group>
      {/* The ground the building stands on. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <planeGeometry args={[w + 60, d + 60]} />
        <meshLambertMaterial color={night ? '#3E5A3A' : '#8CC174'} />
      </mesh>
      {!outdoor && (
        <mesh position={[0, -0.12, 0]}>
          <boxGeometry args={[w + 0.8, 0.3, d + 0.8]} />
          <meshLambertMaterial color="#B9B2A4" />
        </mesh>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]}>
        <planeGeometry args={[w, d]} />
        <meshLambertMaterial color={floor} />
      </mesh>
      {!outdoor && (
        <>
          <mesh position={[0, WALL_H / 2, -d / 2 - 0.1]}>
            <boxGeometry args={[w + 0.4, WALL_H, 0.2]} />
            <meshLambertMaterial color={wall} />
          </mesh>
          <mesh position={[-w / 2 - 0.1, WALL_H / 2, 0]}>
            <boxGeometry args={[0.2, WALL_H, d]} />
            <meshLambertMaterial color={side} />
          </mesh>
          <mesh position={[w / 2 + 0.1, WALL_H / 2, 0]}>
            <boxGeometry args={[0.2, WALL_H, d]} />
            <meshLambertMaterial color={side} />
          </mesh>
          {/* Dark tops on the cut walls, like a doll's house. */}
          <mesh position={[0, WALL_H + 0.02, -d / 2 - 0.1]}>
            <boxGeometry args={[w + 0.44, 0.05, 0.24]} />
            <meshLambertMaterial color={cap} />
          </mesh>
          {[-1, 1].map((sx) => (
            <mesh key={sx} position={[sx * (w / 2 + 0.1), WALL_H + 0.02, 0]}>
              <boxGeometry args={[0.24, 0.05, d]} />
              <meshLambertMaterial color={cap} />
            </mesh>
          ))}
          {/* A low front wall either side of the doorway, so the camera can see in. */}
          <mesh position={[-w / 2 + leftW / 2, 0.3, d / 2 + 0.1]}>
            <boxGeometry args={[leftW, 0.6, 0.2]} />
            <meshLambertMaterial color={wall} />
          </mesh>
          <mesh position={[w / 2 - rightW / 2, 0.3, d / 2 + 0.1]}>
            <boxGeometry args={[rightW, 0.6, 0.2]} />
            <meshLambertMaterial color={wall} />
          </mesh>
          <mesh position={[0, 0.07, -d / 2 + 0.02]}>
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

function Marker({ at, active, info }: { at: [number, number, number]; active: boolean; info?: boolean }) {
  const m = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!m.current) return;
    m.current.position.y = at[1] + 0.35 + Math.sin(clock.elapsedTime * 3) * 0.08;
    m.current.rotation.y = clock.elapsedTime * 1.5;
  });
  return (
    <mesh ref={m} position={at} scale={active ? 1.3 : 0.9}>
      <octahedronGeometry args={[0.14]} />
      <meshBasicMaterial color={active ? '#FFFFFF' : info ? '#7FD4FF' : '#F5B83D'} />
    </mesh>
  );
}

// ---------------------------------------------------------------- bodies

let zTexture: THREE.CanvasTexture | null = null;
function zzz(): THREE.CanvasTexture | null {
  if (zTexture || typeof document === 'undefined') return zTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  if (!g) return null;
  g.font = 'bold 54px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 8;
  g.strokeStyle = '#1B2A4A';
  g.strokeText('z', 32, 34);
  g.fillStyle = '#FFFFFF';
  g.fillText('z', 32, 34);
  zTexture = new THREE.CanvasTexture(c);
  return zTexture;
}

/** Little z's floating up from a sleeper's head. */
function Zzz() {
  const tex = useMemo(zzz, []);
  const refs = useRef<Array<THREE.Sprite | null>>([]);
  useFrame(({ clock }) => {
    refs.current.forEach((s, i) => {
      if (!s) return;
      const t = (clock.elapsedTime * 0.45 + i / 3) % 1;
      s.position.set(Math.sin(t * 6 + i) * 0.12, 0.35 + t * 0.9, -1.0 - t * 0.2);
      const k = 0.16 + t * 0.18;
      s.scale.set(k, k, k);
      (s.material as THREE.SpriteMaterial).opacity = Math.sin(t * Math.PI);
    });
  });
  if (!tex) return null;
  return (
    <>
      {[0, 1, 2].map((i) => (
        <sprite
          key={i}
          ref={(s) => {
            refs.current[i] = s;
          }}
        >
          <spriteMaterial map={tex} transparent depthWrite={false} />
        </sprite>
      ))}
    </>
  );
}

/** Water poured over your head while you bathe. */
function Splash() {
  const refs = useRef<Array<THREE.Mesh | null>>([]);
  useFrame(({ clock }) => {
    refs.current.forEach((m, i) => {
      if (!m) return;
      const t = (clock.elapsedTime * 1.4 + i / 7) % 1;
      const a = i * 2.1;
      m.position.set(Math.cos(a) * 0.18 * (0.4 + t), 1.75 - t * 1.7, Math.sin(a) * 0.18 * (0.4 + t));
    });
  });
  return (
    <>
      {Array.from({ length: 7 }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            refs.current[i] = m;
          }}
        >
          <sphereGeometry args={[0.035, 6, 5]} />
          <meshBasicMaterial color="#8FD3F4" />
        </mesh>
      ))}
    </>
  );
}

type Look = ReturnType<typeof presetLook>;

/** A character at a spot, in a pose (lying ones are tucked in). */
function Body({ look, spot, phase = 0, walking }: { look: Look; spot: Spot; phase?: number; walking?: { current: boolean } }) {
  const pose = spot.pose ?? 'stand';
  if (spot.hide) return null;
  if (pose === 'lie') {
    return (
      <group>
        <group rotation={[-Math.PI / 2, 0, 0]}>
          <group scale={CHAR_SCALE}>
            <Character look={look} pose="lie" phase={phase} />
          </group>
        </group>
        <mesh position={[0, 0.08, -0.36]}>
          <boxGeometry args={[0.95, 0.16, 0.95]} />
          <meshLambertMaterial color={spot.blanket ?? '#2F5D8A'} />
        </mesh>
        <Zzz />
      </group>
    );
  }
  return (
    <>
      <group scale={CHAR_SCALE}>
        <Character look={look} pose={pose} seated={spot.y !== undefined} phase={phase} walking={walking} />
      </group>
      {pose === 'bathe' && <Splash />}
    </>
  );
}

// ---------------------------------------------------------------- you

/** Half the width of the doorway in the front wall. */
const DOOR_HALF = 0.75;

function inDoorway(layout: RoomLayout, x: number, z: number): boolean {
  return !layout.outdoor && z > layout.d / 2 - 1 && Math.abs(x - (layout.doorX ?? layout.spawn[0])) < DOOR_HALF - RADIUS;
}

function blocked(layout: RoomLayout, x: number, z: number): boolean {
  // The doorway lets you walk out of the front of the room.
  if (inDoorway(layout, x, z)) return z > layout.d / 2 + 1.5;
  if (!layout.outdoor && (Math.abs(x) > layout.w / 2 - RADIUS || Math.abs(z) > layout.d / 2 - RADIUS)) return true;
  if (layout.outdoor && (Math.abs(x) > layout.w / 2 + 6 || Math.abs(z) > layout.d / 2 + 6)) return true;
  for (const f of layout.fixtures) {
    const s = f.solid;
    if (s && x > s[0] - RADIUS && x < s[2] + RADIUS && z > s[1] - RADIUS && z < s[3] + RADIUS) return true;
  }
  return false;
}

/**
 * A walking route round the furniture: a search over a 25 cm grid of the
 * room, then straightened where the way is clear.
 */
function findRoomPath(layout: RoomLayout, from: V2, to: V2): V2[] {
  const STEP = 0.25;
  const W = layout.w + (layout.outdoor ? 12 : 0);
  const D = layout.d + (layout.outdoor ? 12 : 0);
  const cols = Math.ceil(W / STEP);
  const rows = Math.ceil(D / STEP);
  const cell = (x: number, z: number): [number, number] => [Math.round((x + W / 2) / STEP), Math.round((z + D / 2) / STEP)];
  const pt = (c: number, r: number): V2 => [c * STEP - W / 2, r * STEP - D / 2];
  const free = (c: number, r: number) => c >= 0 && r >= 0 && c <= cols && r <= rows && !blocked(layout, ...pt(c, r));
  const clear = (a: V2, b: V2) => {
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.1);
    for (let i = 1; i <= n; i++) if (blocked(layout, a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n)) return false;
    return true;
  };
  if (clear(from, to)) return [to];
  // Nearest free square to the goal (a use point can sit right against furniture).
  let [gc, gr] = cell(...to);
  if (!free(gc, gr)) {
    let best: [number, number] | null = null;
    for (let rad = 1; rad < 8 && !best; rad++) for (let dc = -rad; dc <= rad; dc++) for (let dr = -rad; dr <= rad; dr++) if (!best && free(gc + dc, gr + dr)) best = [gc + dc, gr + dr];
    if (!best) return [to];
    [gc, gr] = best;
  }
  const [sc, sr] = cell(...from);
  const key = (c: number, r: number) => r * (cols + 1) + c;
  const prev = new Map<number, number>();
  const queue: Array<[number, number]> = [[sc, sr]];
  prev.set(key(sc, sr), -1);
  let found = false;
  while (queue.length) {
    const [c, r] = queue.shift()!;
    if (c === gc && r === gr) {
      found = true;
      break;
    }
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
      const nc = c + dc;
      const nr = r + dr;
      if (prev.has(key(nc, nr)) || !free(nc, nr)) continue;
      prev.set(key(nc, nr), key(c, r));
      queue.push([nc, nr]);
    }
  }
  if (!found) return [to];
  const cells: V2[] = [];
  for (let k = key(gc, gr); k !== -1; k = prev.get(k)!) cells.push(pt(k % (cols + 1), Math.floor(k / (cols + 1))));
  cells.reverse();
  // Straighten: keep only the corners you cannot see past.
  const out: V2[] = [];
  let anchor = from;
  for (let i = 1; i < cells.length; i++) {
    if (!clear(anchor, cells[i]!)) {
      out.push(cells[i - 1]!);
      anchor = cells[i - 1]!;
    }
  }
  out.push(to);
  return out;
}

type PersonTarget = { target: Target; at: V2 };

interface WalkerProps extends Pick<InteriorProps, 'layout' | 'characterId' | 'onNear' | 'onSelect' | 'activity' | 'onArrive' | 'onCancel' | 'questTag' | 'onExit'> {
  look?: Look;
  goal: { current: V2 | null };
  live: Array<{ target: Target; use: V2 }>;
  people: PersonTarget[];
}

/** Where to be and how, when doing an activity. */
function actSpot(layout: RoomLayout, a: Activity, people: PersonTarget[], from: THREE.Vector3): { spot: Spot; back: V2 } {
  const here: V2 = [from.x, from.z];
  if (a.target.type === 'person') {
    const p = people.find((x) => same(x.target, a.target));
    return { spot: { x: from.x, z: from.z, rot: p ? Math.atan2(p.at[0] - from.x, p.at[1] - from.z) : Math.PI, pose: a.pose }, back: here };
  }
  const f = fixtureFor(layout, a.target);
  if (!f) return { spot: { x: from.x, z: from.z, rot: Math.PI, pose: a.pose }, back: here };
  if (f.act) {
    // The fixture says where; the action says what (but lying stays lying).
    const pose = f.act.pose === 'lie' || f.act.hide || a.pose === 'stand' ? (f.act.pose ?? a.pose) : a.pose;
    return { spot: { ...f.act, pose: pose ?? a.pose }, back: f.use };
  }
  const s = f.solid;
  const cx = s ? (s[0] + s[2]) / 2 : f.use[0];
  const cz = s ? (s[1] + s[3]) / 2 : f.use[1] - 1;
  return { spot: { x: f.use[0], z: f.use[1], rot: Math.atan2(cx - f.use[0], cz - f.use[1]), pose: a.pose }, back: f.use };
}

function Walker({ layout, characterId, look: custom, onNear, onSelect, goal, live, people, activity, onArrive, onCancel, onExit, questTag }: WalkerProps) {
  const look = useMemo(() => custom ?? presetLook(characterId), [custom, characterId]);
  const group = useRef<THREE.Group>(null);
  const walking = useRef(false);
  const pos = useRef(new THREE.Vector3(layout.spawn[0], 0, layout.spawn[1]));
  const near = useRef<Target | null>(null);
  const steering = useRef(false);
  const arrived = useRef(false);
  const { camera, size } = useThree();
  const cam = useRef(new THREE.Vector3(layout.spawn[0], 8, layout.spawn[1] + 7));
  const focus = useRef(new THREE.Vector3(0, 0, 0));
  const act = useRef<Activity | null>(activity);
  act.current = activity;
  const callbacks = useRef({ onArrive, onCancel, onNear, onSelect, onExit });
  callbacks.current = { onArrive, onCancel, onNear, onSelect, onExit };
  const route = useRef<V2[]>([]);
  const routeFor = useRef<V2 | null>(null);
  const stuck = useRef(0);
  const movedOnce = useRef(false);
  const left = useRef(false);

  // Doing something: work out where once, when the doing starts.
  const doing = useMemo(
    () => (activity?.stage === 'act' ? actSpot(layout, activity, people, pos.current) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activity?.stage, activity?.target.type, activity?.target.id, activity?.pose, layout],
  );
  const spot = doing?.spot ?? null;
  const backTo = useRef<V2 | null>(null);

  useEffect(() => {
    pos.current.set(layout.spawn[0], 0, layout.spawn[1]);
    if (group.current) group.current.rotation.y = Math.PI;
    movedOnce.current = false;
    left.current = false;
    route.current = [];
    routeFor.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  // Heading off to do something: walk to where it is used.
  useEffect(() => {
    arrived.current = false;
    if (activity?.stage !== 'walk') return;
    if (activity.target.type === 'person') {
      const p = people.find((x) => same(x.target, activity.target));
      goal.current = p ? [p.at[0], p.at[1] + (p.at[1] > pos.current.z ? -0.7 : 0.7)] : null;
    } else goal.current = fixtureFor(layout, activity.target)?.use ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity?.stage, activity?.target.type, activity?.target.id]);

  // Done: get up and step back to where you walked up to it.
  useEffect(() => {
    if (doing) {
      backTo.current = doing.back;
      return;
    }
    if (backTo.current) {
      pos.current.set(backTo.current[0], 0, backTo.current[1]);
      backTo.current = null;
    }
  }, [doing]);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const p = pos.current;
    const a = act.current;
    const cb = callbacks.current;
    let dx = 0;
    let dz = 0;
    const stick = Math.hypot(joystick.x, joystick.y);
    if (joystick.active && stick > 0.12) {
      // Walking off with the joystick drops whatever you were doing.
      if (a) cb.onCancel();
      if (goal.current || !steering.current) cb.onSelect(null);
      steering.current = true;
      goal.current = null;
      dx = (joystick.x / stick) * Math.min(stick, 1);
      dz = (joystick.y / stick) * Math.min(stick, 1);
    } else if (goal.current && !(a && a.stage === 'act')) {
      steering.current = false;
      // A new destination: plan a route round the furniture.
      if (goal.current !== routeFor.current) {
        routeFor.current = goal.current;
        route.current = findRoomPath(layout, [p.x, p.z], goal.current);
        stuck.current = 0;
      }
      const next = route.current[0] ?? goal.current;
      const gx = next[0] - p.x;
      const gz = next[1] - p.z;
      const dist = Math.hypot(gx, gz);
      if (dist < 0.12) {
        route.current.shift();
        if (!route.current.length) goal.current = null;
      } else {
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
      const bx = p.x;
      const bz = p.z;
      if (blocked(layout, p.x, p.z) || !blocked(layout, nx, nz)) p.set(nx, 0, nz);
      else if (!blocked(layout, nx, p.z)) p.x = nx;
      else if (!blocked(layout, p.x, nz)) p.z = nz;
      else goal.current = null; // stuck: stop walking into furniture
      // Not getting anywhere for a second: give up on the walk (you are as close as it gets).
      if (Math.hypot(p.x - bx, p.z - bz) < step * 0.2) stuck.current += dt;
      else stuck.current = 0;
      if (stuck.current > 1) goal.current = null;
      if (group.current) group.current.rotation.y = Math.atan2(dx, dz);
      movedOnce.current = true;
      // Out through the doorway: you leave the building.
      if (!layout.outdoor && p.z > layout.d / 2 + 0.6 && !left.current) {
        left.current = true;
        cb.onExit?.();
      }
    }
    walking.current = moving;
    // On the way to do something and got there (or as near as it gets).
    if (a?.stage === 'walk' && !goal.current && !arrived.current) {
      arrived.current = true;
      cb.onArrive();
    }
    if (group.current) {
      if (spot) {
        group.current.position.set(spot.x, spot.y ?? 0, spot.z);
        group.current.rotation.y = spot.rot;
      } else {
        group.current.position.copy(p);
      }
    }

    // What are you standing at? (Only once you have moved: nothing pops up as you walk in.)
    if (!a && movedOnce.current) {
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
        const dd = Math.hypot(person.at[0] - p.x, person.at[1] - p.z) - 0.2;
        if (dd < bestD) {
          bestD = dd;
          best = person.target;
        }
      }
      if (!same(best, near.current) && !(best === null && near.current === null)) {
        near.current = best;
        cb.onNear(best);
      }
    }

    // Camera: above and in front, keeping the room's width in view; it moves
    // in to watch you while you are doing something.
    const aspect = size.width / Math.max(size.height, 1);
    const hFov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(25)) * aspect);
    const fit = (layout.w * 0.5 + 0.6) / Math.tan(hFov / 2);
    let back = Math.min(Math.max(fit * 1.12, layout.d * 1.2), 26);
    let fx = p.x * 0.3;
    let fz = p.z * 0.27;
    if (spot) {
      back = Math.max(7, back * 0.78);
      fx = spot.x * 0.85;
      fz = spot.z * 0.8;
    }
    focus.current.lerp(new THREE.Vector3(fx, 0, fz), 1 - Math.exp(-dt * 3));
    const f = focus.current;
    // About 50 degrees down, like looking into a doll's house.
    cam.current.lerp(new THREE.Vector3(f.x, back * 0.72, f.z + back * 0.68), 1 - Math.exp(-dt * 3));
    camera.position.copy(cam.current);
    camera.lookAt(f.x, 0.3, f.z - 0.6);
  });

  const local: Spot = spot ? { ...spot, x: 0, z: 0, rot: 0, y: spot.y } : { x: 0, z: 0, rot: 0, pose: 'stand' };
  return (
    <group ref={group}>
      {!spot && (
        <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.28, 20]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.2} depthWrite={false} />
        </mesh>
      )}
      <Body look={look} spot={local} walking={walking} />
      {questTag && !spot && <Label text={`👉 ${questTag}`} position={[0, 1.75, 0]} size={0.85} accent />}
    </group>
  );
}

// ---------------------------------------------------------------- the scene

/** A tiny repeatable random number from a seed. */
function seeded(n: number): () => number {
  let s = (n * 2654435761) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function InteriorScene(props: InteriorProps) {
  const { layout, interactions, occupants, characterId, selected, onSelect, onNear, paused, quality, night, activity, onArrive, onCancel, crowd } = props;
  const goal = useRef<V2 | null>(null);

  // Fixtures with something available right now get a marker.
  const live = useMemo(() => {
    const out: Array<{ target: Target; use: V2; f: Fixture }> = [];
    for (const f of layout.fixtures) {
      const t = f.target;
      if (!t) continue;
      const has = f.info || interactions.some((i) => i.available && i.kind !== 'wait' && i.target.type === t.type && (!i.target.id || !t.id || i.target.id === t.id));
      if (has) out.push({ target: t, use: f.use, f });
    }
    return out;
  }, [layout, interactions]);

  const people = useMemo(() => placePeople(layout, occupants), [layout, occupants]);
  const peopleTargets = useMemo(() => people.map(({ o, at }) => ({ target: { type: 'person' as const, id: o.personId }, at: [at.x, at.z] as V2 })), [people]);
  const extras = useMemo(() => {
    const yours = layout.fixtures.flatMap((f) => (f.act ? [f.act] : []));
    const spots = crowdSpots(layout, crowd, [...people.map((p) => p.at), ...yours]);
    return spots.map((s, i) => ({ s, look: randomLook(seeded(i * 31 + Math.round(s.x * 10) * 7 + Math.round(s.z * 10)), props.crowdGender) }));
  }, [layout, crowd, people, props.crowdGender]);

  function tapFixture(f: Fixture) {
    if (!f.target || activity) return;
    onSelect(f.target);
    goal.current = f.use;
  }

  const selectedFixture = selected && selected.type !== 'person' ? fixtureFor(layout, selected) : undefined;
  const club = layout.floor === '#2C2545' || layout.floor === '#3A2D4F';
  const dim = night && !layout.outdoor && !club;

  return (
    <Canvas
      dpr={quality === 'high' ? [1, 1.5] : 1}
      frameloop={paused ? 'never' : 'always'}
      camera={{ fov: 50, position: [0, 14, 8], near: 0.3, far: 150 }}
      style={{ touchAction: 'none' }}
      onPointerMissed={() => !activity && onSelect(null)}
    >
      <color attach="background" args={[night ? '#101A2E' : '#CFE8F2']} />
      <hemisphereLight args={[club ? '#D8B8FF' : '#FFF4E0', club ? '#5A3A7A' : '#40362C', club ? 2.2 : dim ? 1.05 : night && layout.outdoor ? 0.9 : 1.75]} />
      <directionalLight position={[4, 10, 6]} intensity={club ? 1.4 : dim ? 0.6 : 1.3} color={club ? '#FFB0E8' : '#FFFFFF'} />
      {dim && <pointLight position={[0, 2.4, 0]} intensity={14} distance={14} color="#FFD9A0" />}
      <Room layout={layout} night={night} />

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

      {!activity &&
        live.map(({ f }) => {
          const s = f.solid;
          const x = s ? (s[0] + s[2]) / 2 : f.use[0];
          const z = s ? (s[1] + s[3]) / 2 : f.use[1] - 0.6;
          return <Marker key={f.key} at={[x, Math.max(0.6, f.height), z]} active={same(selected, f.target ?? null)} info={!!f.info} />;
        })}

      {selectedFixture && !activity && (
        <mesh position={[selectedFixture.use[0], 0.05, selectedFixture.use[1]]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.28, 0.38, 28]} />
          <meshBasicMaterial color="#F5B83D" />
        </mesh>
      )}

      {people.map(({ o, at }, i) => {
        const def = getPerson(o.personId);
        const chosen = selected?.type === 'person' && selected.id === o.personId;
        return (
          <group
            key={o.personId}
            position={[at.x, at.y ?? 0, at.z]}
            rotation={[0, at.rot, 0]}
            onClick={(e) => {
              e.stopPropagation();
              if (activity) return;
              onSelect({ type: 'person', id: o.personId });
              goal.current = [at.x, at.z + (at.z > 0 ? -0.8 : 0.8)];
            }}
          >
            <Body look={presetLook(def?.look ?? 'm1')} spot={{ ...at, x: 0, z: 0, rot: 0 }} phase={i * 0.9} />
            <mesh position={[0, 1.65, 0]} visible={chosen}>
              <octahedronGeometry args={[0.12]} />
              <meshBasicMaterial color="#F5B83D" />
            </mesh>
          </group>
        );
      })}

      {extras.map(({ s, look }, i) => (
        <group key={`x${i}`} position={[s.x, s.y ?? 0, s.z]} rotation={[0, s.rot, 0]}>
          <Body look={look} spot={{ ...s, x: 0, z: 0, rot: 0 }} phase={i * 1.7} />
        </group>
      ))}

      <Walker
        layout={layout}
        characterId={characterId}
        onNear={onNear}
        onSelect={onSelect}
        goal={goal}
        live={live}
        people={peopleTargets}
        activity={activity}
        onArrive={onArrive}
        onCancel={onCancel}
        onExit={props.onExit}
        questTag={props.questTag}
        look={props.look}
      />
    </Canvas>
  );
}
