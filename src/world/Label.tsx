// A floating name tag that always faces the camera.
import { useMemo } from 'react';
import { labelTexture } from './three-utils';

const HEIGHT = 2;

export function Label({ text, y, dimmed = false }: { text: string; y: number; dimmed?: boolean }) {
  const { texture, aspect } = useMemo(() => labelTexture(text), [text]);
  return (
    <sprite position={[0, y, 0]} scale={[HEIGHT * aspect, HEIGHT, 1]} renderOrder={10}>
      <spriteMaterial map={texture} transparent depthTest={false} opacity={dimmed ? 0.55 : 1} />
    </sprite>
  );
}
