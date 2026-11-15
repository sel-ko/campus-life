// The player on the map. Walks in a straight line with a little hop to the
// building that was tapped, then tells the store it has arrived.
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { getLocation } from '../content/university';
import { useGameStore } from '../store/gameStore';
import { Character } from './characters/Character';
import type { CharacterLook } from './characters/look';
import { doorPoint } from './layout';
import { playerWorld } from './shared';

const SPEED = 11; // metres per second
const HOP = 0.35;

export const blobGeometry = new THREE.CircleGeometry(0.9, 20).rotateX(-Math.PI / 2);
export const blobMaterial = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.22, depthWrite: false });

/** Soft dark circle under a character, instead of a real-time shadow. */
export function Blob({ scale = 1 }: { scale?: number }) {
  return <mesh geometry={blobGeometry} material={blobMaterial} position={[0, 0.2, 0]} scale={scale} />;
}

function startPoint(): THREE.Vector3 {
  const id = useGameStore.getState().playerLocationId;
  const loc = id ? getLocation(id) : undefined;
  const [x, z] = loc ? doorPoint(loc) : [0, 0];
  return new THREE.Vector3(x, 0, z);
}

const SCALE = 0.95;

/** The player's character, walking to whichever building was tapped. */
export function Player({ look }: { look: CharacterLook }) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const pos = useRef<THREE.Vector3 | null>(null);
  if (!pos.current) pos.current = startPoint();
  const travelled = useRef(0);
  const walking = useRef(false);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const { travelTargetId, arrive } = useGameStore.getState();
    const target = travelTargetId ? getLocation(travelTargetId) : undefined;
    const g = group.current;
    const p = pos.current!;
    if (!g || !body.current) return;

    if (target) {
      const [tx, tz] = doorPoint(target);
      const dx = tx - p.x;
      const dz = tz - p.z;
      const dist = Math.hypot(dx, dz);
      const step = SPEED * dt;
      if (dist <= step) {
        p.set(tx, 0, tz);
        travelled.current = 0;
        body.current.position.y = 0;
        playerWorld.moving = false;
        walking.current = false;
        arrive();
      } else {
        p.x += (dx / dist) * step;
        p.z += (dz / dist) * step;
        travelled.current += step;
        g.rotation.y = Math.atan2(dx, dz);
        // A small hop on every stride.
        body.current.position.y = Math.abs(Math.sin(travelled.current * 1.6)) * HOP;
        playerWorld.moving = true;
        walking.current = true;
      }
    } else {
      playerWorld.moving = false;
      walking.current = false;
      // Turn to face the camera when standing still.
      g.rotation.y += (0 - g.rotation.y) * Math.min(1, dt * 6);
    }
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
