// Start-screen preview: the four preset characters turning on little stands.
// One canvas for all four (several WebGL canvases are costly on phones).
// Loaded lazily, after the start screen has appeared.
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type * as THREE from 'three';
import { cylinder, material } from '../three-utils';
import { Character } from './Character';
import { PRESETS, PRESET_IDS, type PresetId } from './look';

const SPACING = 2.1;
const SCALE = 0.72;
const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Zooms the orthographic camera so all four fit across the canvas. */
function FitCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    cam.zoom = size.width / (SPACING * PRESET_IDS.length);
    cam.position.set(0, 3, 12);
    cam.lookAt(0, 1.25, 0);
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

const discGeo = cylinder(0.95, 1.02, 0.1, 24);

function Spinner({ id, x, selected, index }: { id: PresetId; x: number; selected: boolean; index: number }) {
  const turn = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (turn.current && !reduceMotion) turn.current.rotation.y += dt * (selected ? 1.1 : 0.5);
  });
  return (
    <group position={[x, 0, 0]}>
      <mesh geometry={discGeo} material={material(selected ? '#F5B83D' : '#3F6B4E')} position={[0, -0.05, 0]} />
      <group ref={turn} rotation={[0, 0.5 - index * 0.3, 0]} scale={SCALE}>
        <Character look={PRESETS[id].look} phase={index * 1.3} />
      </group>
    </group>
  );
}

export default function CharacterPicker({ selected, paused }: { selected: PresetId; paused: boolean }) {
  return (
    <Canvas
      orthographic
      dpr={[1, 1.5]}
      frameloop={paused ? 'never' : 'always'}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 3, 12], zoom: 40, near: 0.1, far: 50 }}
      style={{ pointerEvents: 'none' }}
    >
      <FitCamera />
      <hemisphereLight args={['#DCEBFF', '#3A2A1C', 2.8]} />
      <directionalLight position={[3, 6, 5]} color="#FFE2B0" intensity={3} />
      <directionalLight position={[-4, 3, -4]} color="#7FB4FF" intensity={0.9} />
      {PRESET_IDS.map((id, i) => (
        <Spinner key={id} id={id} index={i} selected={id === selected} x={(i - (PRESET_IDS.length - 1) / 2) * SPACING} />
      ))}
    </Canvas>
  );
}
