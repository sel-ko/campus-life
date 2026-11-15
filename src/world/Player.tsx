// The player on the map. Two ways to move:
// - tap a building: walk there in a straight line with a little hop, then the
//   store opens that building's sheet;
// - the joystick (close-up view): walk freely, blocked by building walls.
// Standing near a door tells the store, so the UI can offer "Enter".
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { getLocation, university } from '../content/university';
import { useGameStore } from '../store/gameStore';
import { Character } from './characters/Character';
import type { CharacterLook } from './characters/look';
import { joystick } from './input';
import { campusBounds, doorPoint, isBlocked, nearestDoor } from './layout';
import { playerWorld } from './shared';

const TRAVEL_SPEED = 11; // metres per second, after tapping a building
const WALK_SPEED = 7; // metres per second at full joystick
const HOP = 0.35;
const DOOR_RANGE = 2.6; // how close to a door counts as "at" it
const SCALE = 0.95;

export const blobGeometry = new THREE.CircleGeometry(0.9, 20).rotateX(-Math.PI / 2);
export const blobMaterial = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.22, depthWrite: false });

/** Soft dark circle under a character, instead of a real-time shadow. */
export function Blob({ scale = 1 }: { scale?: number }) {
  return <mesh geometry={blobGeometry} material={blobMaterial} position={[0, 0.2, 0]} scale={scale} />;
}

function startPoint(): THREE.Vector3 {
  const { playerLocationId, game } = useGameStore.getState();
  const id = playerLocationId ?? game?.player.homeId ?? university.locations[0]?.id;
  const loc = id ? getLocation(id) : undefined;
  const [x, z] = loc ? doorPoint(loc) : [0, 0];
  return new THREE.Vector3(x, 0, z);
}

/** The player's character. */
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

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const store = useGameStore.getState();
    const g = group.current;
    const p = pos.current!;
    if (!g || !body.current) return;
    let moving = false;

    const stick = Math.hypot(joystick.x, joystick.y);
    if (joystick.active && stick > 0.12 && store.cameraMode === 'follow' && !store.selectedLocationId) {
      // ---- free walking with the joystick ----
      store.cancelTravel();
      const speed = WALK_SPEED * Math.min(stick, 1) * dt;
      const dx = (joystick.x / stick) * speed;
      const dz = (joystick.y / stick) * speed;
      const b = campusBounds();
      const blockedNow = isBlocked(p.x, p.z);
      // Try the full step, then slide along walls one axis at a time.
      // (If somehow already inside a wall, let the player walk out.)
      const nx = THREE.MathUtils.clamp(p.x + dx, b.minX - 6, b.maxX + 6);
      const nz = THREE.MathUtils.clamp(p.z + dz, b.minZ - 6, b.maxZ + 6);
      if (blockedNow || !isBlocked(nx, nz)) p.set(nx, 0, nz);
      else if (!isBlocked(nx, p.z)) p.x = nx;
      else if (!isBlocked(p.x, nz)) p.z = nz;
      g.rotation.y = Math.atan2(dx, dz);
      travelled.current += speed;
      moving = true;
    } else {
      // ---- walking to a tapped building ----
      const target = store.travelTargetId ? getLocation(store.travelTargetId) : undefined;
      if (target) {
        const [tx, tz] = doorPoint(target);
        const dx = tx - p.x;
        const dz = tz - p.z;
        const dist = Math.hypot(dx, dz);
        const step = TRAVEL_SPEED * dt;
        if (dist <= step) {
          p.set(tx, 0, tz);
          travelled.current = 0;
          store.arrive();
        } else {
          p.x += (dx / dist) * step;
          p.z += (dz / dist) * step;
          travelled.current += step;
          g.rotation.y = Math.atan2(dx, dz);
          moving = true;
        }
      } else {
        // Standing still: turn to face the camera.
        g.rotation.y += (0 - g.rotation.y) * Math.min(1, dt * 6);
      }
    }

    body.current.position.y = moving ? Math.abs(Math.sin(travelled.current * 1.6)) * HOP : 0;
    walking.current = moving;
    playerWorld.moving = moving;

    // Which door is the player at? Leaving a building clears "at".
    const near = nearestDoor(p.x, p.z, DOOR_RANGE);
    store.setNearby(near);
    if (!near && moving) store.leaveLocation();

    g.position.copy(p);
    playerWorld.pos.copy(p);
  });

  return (
    <group ref={group}>
      <Blob scale={1.1} />
      <group ref={body} scale={SCALE}>
        <Character look={look} walking={walking} />
      </group>
    </group>
  );
}
