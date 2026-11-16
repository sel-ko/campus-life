// The player on the map. Two ways to move:
// - tap a place: walk there along the roads (shortest route), with a little
//   hop, then the store opens that place's sheet;
// - the joystick (close-up view): walk freely, blocked by building walls.
// Standing near a door tells the store, so the UI can offer "Enter".
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { freshersHall, getPlace } from '../content/places';
import { useGameStore } from '../store/gameStore';
import type { Pt } from '../content/campusMap';
import { findPath, isBlocked, nearestDoor, campusBounds } from './campus/navigation';
import { Character } from './characters/Character';
import type { CharacterLook } from './characters/look';
import { joystick } from './input';
import { cameraState, playerWorld } from './shared';

const WALK_SPEED = 8; // metres per second at full joystick
const MIN_TRAVEL_SPEED = 14; // metres per second after tapping a place
const MAX_TRAVEL_SECONDS = 6; // long trips speed up so none takes longer than this
const ON_FOOT_SPEED = 6; // choosing to walk: a real walk, seen in first person
const MAX_ON_FOOT_SECONDS = 22;
const HOP = 0.3;
const DOOR_RANGE = 5;
const SCALE = 0.7; // a character is about one storey tall

/**
 * A see-through silhouette of the player, so buildings between the camera
 * and the player never hide them. It draws after the buildings but before the
 * player (render order 1, then 2) and only where something is in front
 * (GreaterDepth), so it never covers the player's own visible parts.
 */
const silhouetteMaterial = new THREE.MeshBasicMaterial({ color: '#FFE7A3', depthWrite: false, depthFunc: THREE.GreaterDepth });

export const blobGeometry = new THREE.CircleGeometry(0.9, 20).rotateX(-Math.PI / 2);
export const blobMaterial = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.22, depthWrite: false });

/** Soft dark circle under a character, instead of a real-time shadow. */
export function Blob({ scale = 1 }: { scale?: number }) {
  return <mesh geometry={blobGeometry} material={blobMaterial} position={[0, 0.15, 0]} scale={scale} />;
}

function startPoint(): THREE.Vector3 {
  const { game } = useGameStore.getState();
  const loc = (game ? getPlace(game.location.placeId) : undefined) ?? freshersHall();
  const [x, z] = loc ? loc.position : [0, 0];
  return new THREE.Vector3(x, 0, z);
}

function pathLength(from: Pt, path: Pt[]): number {
  let len = 0;
  let prev = from;
  for (const p of path) {
    len += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    prev = p;
  }
  return len;
}

export function Player({ look }: { look: CharacterLook }) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const pos = useRef<THREE.Vector3 | null>(null);
  if (!pos.current) {
    pos.current = startPoint();
    playerWorld.pos.copy(pos.current);
  }
  const travelled = useRef(0);
  const walking = useRef(false);
  // The route being walked after a tap.
  const route = useRef<{ target: string; points: Pt[]; speed: number } | null>(null);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const store = useGameStore.getState();
    const g = group.current;
    const p = pos.current!;
    if (!g || !body.current) return;
    let moving = false;

    const stick = Math.hypot(joystick.x, joystick.y);
    if (joystick.active && stick > 0.12 && store.cameraMode === 'follow' && !store.insidePlaceId && !store.travelSheetId) {
      // ---- free walking with the joystick ----
      store.cancelWalk();
      route.current = null;
      const speed = WALK_SPEED * Math.min(stick, 1) * dt;
      // Relative to the screen: "up" on the stick is away from the camera, however the view is turned.
      const jx = (joystick.x / stick) * speed;
      const jz = (joystick.y / stick) * speed;
      const cy = Math.cos(cameraState.yaw);
      const sy = Math.sin(cameraState.yaw);
      const dx = jx * cy + jz * sy;
      const dz = -jx * sy + jz * cy;
      const b = campusBounds();
      const nx = THREE.MathUtils.clamp(p.x + dx, b.minX, b.maxX);
      const nz = THREE.MathUtils.clamp(p.z + dz, b.minZ, b.maxZ);
      // Try the full step, then slide along walls one axis at a time.
      // (If somehow already inside a wall, let the player walk out.)
      if (isBlocked(p.x, p.z) || !isBlocked(nx, nz)) p.set(nx, 0, nz);
      else if (!isBlocked(nx, p.z)) p.x = nx;
      else if (!isBlocked(p.x, nz)) p.z = nz;
      g.rotation.y = Math.atan2(dx, dz);
      travelled.current += speed;
      moving = true;
    } else if (store.walkTargetId) {
      // ---- walking to a tapped place along the roads (or riding a keke) ----
      const target = getPlace(store.walkTargetId);
      if (!target) {
        store.cancelWalk();
      } else if (store.riding && store.rideStop) {
        // A keke ride drops you at the keke park nearest the place; walk the rest.
        p.set(store.rideStop[0], 0, store.rideStop[1]);
        route.current = null;
        store.reachStop();
      } else if (store.riding) {
        // A cab (or your car): to the door; the camera glides over.
        p.set(target.position[0], 0, target.position[1]);
        route.current = null;
        store.arrive();
      } else {
        if (!route.current || route.current.target !== target.id) {
          const points = findPath([p.x, p.z], target.position);
          const len = pathLength([p.x, p.z], points);
          const onFoot = store.travelMode === 'walk';
          route.current = { target: target.id, points, speed: onFoot ? Math.max(ON_FOOT_SPEED, len / MAX_ON_FOOT_SECONDS) : Math.max(MIN_TRAVEL_SPEED, len / MAX_TRAVEL_SECONDS) };
        }
        const r = route.current;
        let step = r.speed * dt;
        while (step > 0 && r.points.length) {
          const [tx, tz] = r.points[0]!;
          const dx = tx - p.x;
          const dz = tz - p.z;
          const dist = Math.hypot(dx, dz);
          if (dist <= step) {
            p.set(tx, 0, tz);
            step -= dist;
            r.points.shift();
          } else {
            p.x += (dx / dist) * step;
            p.z += (dz / dist) * step;
            g.rotation.y = Math.atan2(dx, dz);
            travelled.current += step;
            step = 0;
          }
        }
        if (r.points.length === 0) {
          route.current = null;
          travelled.current = 0;
          store.arrive();
        } else {
          moving = true;
        }
      }
    } else {
      // Standing still: keep facing the way you were going.
      route.current = null;
    }

    body.current.position.y = moving ? Math.abs(Math.sin(travelled.current * 1.6)) * HOP : 0;
    walking.current = moving;
    playerWorld.moving = moving;

    // Which door is the player at? Walking away from a building clears "at".
    store.setNearby(nearestDoor(p.x, p.z, DOOR_RANGE));

    g.position.copy(p);
    playerWorld.pos.copy(p);
    playerWorld.heading = g.rotation.y;
    // Walking somewhere is seen through your own eyes: hide your body.
    g.visible = !(store.walkTargetId && store.travelMode === 'walk');
  });

  return (
    <group ref={group}>
      <Blob scale={0.9} />
      <group ref={body} scale={SCALE}>
        <Character look={look} walking={walking} material={silhouetteMaterial} renderOrder={1} />
        <Character look={look} walking={walking} renderOrder={2} />
      </group>
    </group>
  );
}
