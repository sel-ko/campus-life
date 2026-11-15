// A big-head block character with an idle bob and a simple walk.
// Skin, hair, outfit and colours all come from the `look` prop.
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { vertexColourMaterials } from '../three-utils';
import { HIP, SHOULDER, characterModel, type LimbGeometry } from './buildCharacter';
import type { CharacterLook } from './look';

function Limb({ geo, material, renderOrder = 0 }: { geo: LimbGeometry; material?: THREE.Material; renderOrder?: number }) {
  return (
    <>
      {geo.smooth && <mesh geometry={geo.smooth} material={material ?? vertexColourMaterials.smooth} renderOrder={renderOrder} />}
      {geo.flat && <mesh geometry={geo.flat} material={material ?? vertexColourMaterials.flat} renderOrder={renderOrder} />}
    </>
  );
}

export interface CharacterProps {
  look: CharacterLook;
  /** Set .current to true while the character is moving. */
  walking?: { current: boolean };
  /** Offsets the animation so a crowd does not bob in step. */
  phase?: number;
  /** Draw every part with this material instead (used for the see-through silhouette). */
  material?: THREE.Material;
  /** Draw order; the player uses this so its silhouette draws first. */
  renderOrder?: number;
}

export function Character({ look, walking, phase = 0, material, renderOrder = 0 }: CharacterProps) {
  const model = useMemo(() => characterModel(look), [look]);
  const body = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const blend = useRef(0);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime + phase;
    const target = walking?.current ? 1 : 0;
    blend.current += (target - blend.current) * Math.min(1, dt * 8);
    const w = blend.current;
    const swing = Math.sin(t * 9) * 0.6 * w;
    if (legL.current) legL.current.rotation.x = swing;
    if (legR.current) legR.current.rotation.x = -swing;
    if (armL.current) armL.current.rotation.x = -swing * 0.8;
    if (armR.current) armR.current.rotation.x = swing * 0.8;
    if (body.current) {
      // Idle: slow breathing bob. Walking: a bounce on each step.
      body.current.position.y = Math.sin(t * 1.8) * 0.03 * (1 - w) + Math.abs(Math.sin(t * 9)) * 0.08 * w;
    }
  });

  return (
    <group ref={body}>
      <Limb geo={model.body} material={material} renderOrder={renderOrder} />
      <group ref={legL} position={[-HIP[0], HIP[1], 0]}>
        <Limb geo={model.legs[0]} material={material} renderOrder={renderOrder} />
      </group>
      <group ref={legR} position={[HIP[0], HIP[1], 0]}>
        <Limb geo={model.legs[1]} material={material} renderOrder={renderOrder} />
      </group>
      <group ref={armL} position={[-SHOULDER[0], SHOULDER[1], 0]}>
        <group rotation={[0, 0, -model.armTilt[0]]}>
          <Limb geo={model.arms[0]} material={material} renderOrder={renderOrder} />
        </group>
      </group>
      <group ref={armR} position={[SHOULDER[0], SHOULDER[1], 0]}>
        <group rotation={[0, 0, model.armTilt[1]]}>
          <Limb geo={model.arms[1]} material={material} renderOrder={renderOrder} />
        </group>
      </group>
    </group>
  );
}
