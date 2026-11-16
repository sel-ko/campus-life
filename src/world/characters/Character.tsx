// A big-head block character with an idle bob and a simple walk.
// Skin, hair, outfit and colours all come from the `look` prop.
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { vertexColourMaterials } from '../three-utils';
import { FZ, HIP, HY, SHOULDER, characterModel, type LimbGeometry } from './buildCharacter';
import type { CharacterLook } from './look';

function Limb({ geo, material, renderOrder = 0 }: { geo: LimbGeometry; material?: THREE.Material; renderOrder?: number }) {
  return (
    <>
      {geo.smooth && <mesh geometry={geo.smooth} material={material ?? vertexColourMaterials.smooth} renderOrder={renderOrder} />}
      {geo.flat && <mesh geometry={geo.flat} material={material ?? vertexColourMaterials.flat} renderOrder={renderOrder} />}
    </>
  );
}

/** What the body is doing. The parent places the character (on a chair, a bed...). */
export type Pose = 'stand' | 'walk' | 'sit' | 'lie' | 'read' | 'write' | 'eat' | 'cook' | 'bathe' | 'dance' | 'jog' | 'chat' | 'lecture' | 'type' | 'cheer';


export interface CharacterProps {
  /** Body pose (default: stand, or walk while `walking` is true). */
  pose?: Pose;
  /** Sitting on something: the legs bend forward. */
  seated?: boolean;
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

export function Character({ look, walking, pose = 'stand', seated = false, phase = 0, material, renderOrder = 0 }: CharacterProps) {
  const model = useMemo(() => characterModel(look), [look]);
  const body = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const blend = useRef(0);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime + phase;
    const moving = !!walking?.current || pose === 'walk' || pose === 'jog';
    blend.current += ((moving ? 1 : 0) - blend.current) * Math.min(1, dt * 8);
    const w = blend.current;
    const speed = pose === 'jog' ? 13 : 9;
    const swing = Math.sin(t * speed) * 0.6 * w;
    // Legs: forward over a seat, a little bounce for dancing, else walking.
    let lL = swing;
    let lR = -swing;
    if (seated) {
      lL = -1.45;
      lR = -1.45;
    } else if (pose === 'dance' || pose === 'cheer') {
      lL = Math.max(0, Math.sin(t * 6)) * -0.35;
      lR = Math.max(0, -Math.sin(t * 6)) * -0.35;
    }
    // Arms: x below zero swings them forward, about -3 is straight up.
    let aL = -swing * 0.8;
    let aR = swing * 0.8;
    let zR = 0;
    switch (pose) {
      case 'sit':
        aL = aR = -0.45;
        break;
      case 'read':
        aL = aR = -1.15 + Math.sin(t * 0.7) * 0.03;
        break;
      case 'write':
      case 'type':
        aL = -1.0;
        aR = -1.1 + Math.sin(t * (pose === 'type' ? 14 : 5)) * 0.08;
        break;
      case 'eat':
        aL = -0.9;
        aR = -1.0 - Math.max(0, Math.sin(t * 2.4)) * 1.1;
        break;
      case 'cook':
        aL = -0.7;
        aR = -1.05 + Math.sin(t * 5) * 0.2;
        zR = Math.cos(t * 5) * 0.25;
        break;
      case 'bathe':
        aL = -2.7 + Math.sin(t * 7) * 0.35;
        aR = -2.7 + Math.cos(t * 7) * 0.35;
        break;
      case 'dance':
        aL = -2.4 + Math.sin(t * 6) * 0.6;
        aR = -2.4 - Math.sin(t * 6) * 0.6;
        break;
      case 'cheer':
        aL = aR = -2.9 + Math.sin(t * 8) * 0.15;
        break;
      case 'chat':
        aR = -0.5 + Math.sin(t * 2.2) * 0.35;
        aL = -0.15;
        break;
      case 'lecture':
        aR = -1.7 + Math.sin(t * 1.4) * 0.5;
        aL = -0.2;
        break;
      case 'lie':
        aL = aR = 0;
        lL = lR = 0;
        break;
      default:
        break;
    }
    if (legL.current) legL.current.rotation.x = lL;
    if (legR.current) legR.current.rotation.x = lR;
    if (armL.current) armL.current.rotation.x = aL;
    if (armR.current) {
      armR.current.rotation.x = aR;
      armR.current.rotation.z = zR;
    }
    if (body.current) {
      // Idle: slow breathing bob. Walking: a bounce on each step. Dancing: a bigger bounce.
      body.current.position.y =
        pose === 'lie' || seated
          ? Math.sin(t * 1.2) * 0.015
          : pose === 'dance' || pose === 'cheer'
            ? Math.abs(Math.sin(t * 6)) * 0.18
            : Math.sin(t * 1.8) * 0.03 * (1 - w) + Math.abs(Math.sin(t * speed)) * 0.08 * w;
      body.current.rotation.y = pose === 'dance' ? Math.sin(t * 3) * 0.35 : 0;
    }
  });

  return (
    <group ref={body}>
      <Limb geo={model.body} material={material} renderOrder={renderOrder} />
      {pose === 'lie' && !material && <ClosedEyes skin={look.skin} />}
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

/** Asleep: eyelids down over both eyes, with the lash line showing. */
function ClosedEyes({ skin }: { skin: string }) {
  return (
    <>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.34, HY + 0.05, FZ + 0.045]}>
          <mesh>
            <boxGeometry args={[0.3, 0.27, 0.03]} />
            <meshLambertMaterial color={skin} />
          </mesh>
          <mesh position={[0, -0.05, 0.02]}>
            <boxGeometry args={[0.24, 0.035, 0.02]} />
            <meshBasicMaterial color="#1B120D" />
          </mesh>
        </group>
      ))}
    </>
  );
}
