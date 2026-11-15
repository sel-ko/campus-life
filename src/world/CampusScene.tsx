// The 3D campus. Loaded lazily (its own download) after the start screen.
// It reads the store and sends "walk to building X"; it holds no game rules.
import { Canvas } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { getLocation } from '../content/university';
import { currentSlot } from '../game/engine';
import { useGameStore } from '../store/gameStore';
import { useSettings } from '../store/settingsStore';
import { Buildings } from './Buildings';
import { CameraRig } from './CameraRig';
import { Ground } from './Ground';
import { doorPoint } from './layout';
import { SLOT_LOOKS } from './lighting';
import { presetLook } from './characters/look';
import { Npcs } from './Npcs';
import { Player } from './Player';
import { Props } from './Props';
import { setWindowGlow } from './three-utils';
import { Trees } from './Trees';

export default function CampusScene({ paused }: { paused: boolean }) {
  const slot = useGameStore((s) => (s.game ? currentSlot(s.game) : 'Morning'));
  const look = SLOT_LOOKS[slot];
  const characterId = useGameStore((s) => s.game?.player.characterId ?? 'm1');
  const look3d = useMemo(() => presetLook(characterId), [characterId]);
  // Battery saver: lower resolution, no edge smoothing, fewer students.
  const quality = useSettings((s) => s.quality);
  const high = quality === 'high';

  useEffect(() => setWindowGlow(look.glow), [look]);

  // Start the camera over the player.
  const start = useMemo<[number, number]>(() => {
    const id = useGameStore.getState().playerLocationId;
    const loc = id ? getLocation(id) : undefined;
    return loc ? doorPoint(loc) : [0, 0];
  }, []);

  return (
    <Canvas
      // A new canvas when quality changes, because smoothing is fixed at creation.
      key={quality}
      dpr={high ? [1, 1.5] : 1}
      frameloop={paused ? 'never' : 'always'}
      camera={{ fov: 45, near: 1, far: 600, position: [0, 40, 40] }}
      gl={{ antialias: high, powerPreference: 'default' }}
      style={{ touchAction: 'none' }}
      onCreated={({ gl }) => {
        // Development only: lets you check draw calls in the console with
        // __gl.info.render.calls
        if (import.meta.env.DEV) (window as unknown as { __gl: unknown }).__gl = gl;
      }}
    >
      <color attach="background" args={[look.sky]} />
      <hemisphereLight args={[look.hemiSky, look.hemiGround, look.hemiIntensity]} />
      <directionalLight position={look.sunPos} color={look.sunColor} intensity={look.sunIntensity} />
      <CameraRig start={start} />
      <Ground grass={look.grass} />
      <Trees />
      <Props />
      <Buildings />
      <Npcs count={high ? 6 : 3} />
      <Player look={look3d} />
    </Canvas>
  );
}
