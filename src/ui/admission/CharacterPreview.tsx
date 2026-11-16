// The whole character in 3D, turning slowly, for the character creator.
import { Canvas, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type * as THREE from 'three';
import { Character } from '../../world/characters/Character';
import type { CharacterLook } from '../../world/characters/look';

function Turning({ look }: { look: CharacterLook }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (g.current) g.current.rotation.y = Math.sin(clock.elapsedTime * 0.6) * 0.7;
  });
  return (
    <group ref={g} position={[0, -1.35, 0]}>
      <Character look={look} pose="stand" />
    </group>
  );
}

export default function CharacterPreview({ look }: { look: CharacterLook }) {
  return (
    <Canvas dpr={[1, 1.5]} camera={{ fov: 32, position: [0, 0.4, 7.2] }} style={{ touchAction: 'pan-y' }}>
      <hemisphereLight args={['#FFF4E0', '#40362C', 1.9]} />
      <directionalLight position={[3, 5, 4]} intensity={1.3} />
      <Turning look={look} />
    </Canvas>
  );
}
