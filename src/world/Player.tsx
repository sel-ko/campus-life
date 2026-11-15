// The player on the map. Walks in a straight line with a little hop to the
// building that was tapped, then tells the store it has arrived.
import { useFrame } from '@react-three/fiber';
import { useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { getLocation } from '../content/university';
import { useGameStore } from '../store/gameStore';
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

/**
 * `children` is the character model. It receives nothing; instead the
 * `walking` ref tells animated characters whether to swing their legs.
 */
export function Player({ children, walking }: { children: ReactNode; walking?: { current: boolean } }) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const pos = useRef(startPoint());
  const travelled = useRef(0);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const { travelTargetId, arrive } = useGameStore.getState();
    const target = travelTargetId ? getLocation(travelTargetId) : undefined;
    const g = group.current;
    if (!g || !body.current) return;

    if (target) {
      const [tx, tz] = doorPoint(target);
      const dx = tx - pos.current.x;
      const dz = tz - pos.current.z;
      const dist = Math.hypot(dx, dz);
      const step = SPEED * dt;
      if (dist <= step) {
        pos.current.set(tx, 0, tz);
        travelled.current = 0;
        body.current.position.y = 0;
        playerWorld.moving = false;
        if (walking) walking.current = false;
        arrive();
      } else {
        pos.current.x += (dx / dist) * step;
        pos.current.z += (dz / dist) * step;
        travelled.current += step;
        g.rotation.y = Math.atan2(dx, dz);
        body.current.position.y = Math.abs(Math.sin(travelled.current * 1.6)) * HOP;
        playerWorld.moving = true;
        if (walking) walking.current = true;
      }
    } else {
      playerWorld.moving = false;
      if (walking) walking.current = false;
      // Turn to face the camera when standing still.
      g.rotation.y += (0 - g.rotation.y) * Math.min(1, dt * 6);
    }
    g.position.copy(pos.current);
    playerWorld.pos.copy(pos.current);
  });

  return (
    <group ref={group}>
      <Blob />
      <group ref={body}>{children}</group>
    </group>
  );
}

/** A plain marker used until a character is chosen. */
export function PlayerMarker() {
  const { primary, accent } = { primary: '#F5B83D', accent: '#14202B' };
  return (
    <group>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.45, 0.55, 1.4, 12]} />
        <meshLambertMaterial color={primary} />
      </mesh>
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshLambertMaterial color={accent} />
      </mesh>
    </group>
  );
}
