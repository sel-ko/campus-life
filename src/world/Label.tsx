// A floating name tag that always faces the camera and stays the same size on
// screen at any zoom (so names are readable on the full-section view too).
import { useMemo } from 'react';
import { labelTexture } from './three-utils';

/** Height as a fraction of the screen (sprites without size attenuation). */
const SCREEN_HEIGHT = 0.034;

export function Label({ text, position, dimmed = false, size = 1 }: { text: string; position: [number, number, number]; dimmed?: boolean; size?: number }) {
  const { texture, aspect } = useMemo(() => labelTexture(text), [text]);
  return (
    <sprite position={position} scale={[SCREEN_HEIGHT * size * aspect, SCREEN_HEIGHT * size, 1]} renderOrder={10}>
      <spriteMaterial map={texture} transparent depthTest={false} sizeAttenuation={false} opacity={dimmed ? 0.6 : 1} />
    </sprite>
  );
}
