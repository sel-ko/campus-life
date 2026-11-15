// A floating name tag that always faces the camera. It grows when the camera
// zooms out so names stay readable on the full-campus view.
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { cameraState } from './shared';
import { labelTexture } from './three-utils';

const HEIGHT = 2;

export function Label({ text, y, dimmed = false }: { text: string; y: number; dimmed?: boolean }) {
  const { texture, aspect } = useMemo(() => labelTexture(text), [text]);
  const sprite = useRef<THREE.Sprite>(null);

  useFrame(() => {
    const s = HEIGHT * Math.min(Math.max(cameraState.dist / 50, 1), 1.6);
    sprite.current?.scale.set(s * aspect, s, 1);
  });

  return (
    <sprite ref={sprite} position={[0, y, 0]} scale={[HEIGHT * aspect, HEIGHT, 1]} renderOrder={10}>
      <spriteMaterial map={texture} transparent depthTest={false} opacity={dimmed ? 0.55 : 1} />
    </sprite>
  );
}
