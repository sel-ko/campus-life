// The 3D campus, built from the layout drawn in the Campus Planner. Loaded lazily (its own
// download) after the start screen. It reads the store and sends "walk to
// place X"; it holds no game rules.
import { Canvas } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { SLOTS } from '../game/types';
import { useSettings } from '../store/settingsStore';
import { CampusBuildings, setCampusGlow } from './campus/CampusBuildings';
import { CampusGround } from './campus/CampusGround';
import { CampusLabels } from './campus/CampusLabels';
import { CampusScenery } from './campus/CampusScenery';
import { CameraRig } from './CameraRig';
import { presetLook } from './characters/look';
import { SLOT_LOOKS } from './lighting';
import { Npcs } from './Npcs';
import { Player } from './Player';
import { playerWorld } from './shared';

export default function CampusScene({ paused }: { paused: boolean }) {
  // The sky follows the game's time of day.
  const slot = SLOTS[useGameStore((s) => s.game?.clock.slot ?? 0)]!;
  const look = SLOT_LOOKS[slot];
  const characterId = useGameStore((s) => s.game?.player.characterId ?? 'm1');
  const look3d = useMemo(() => presetLook(characterId), [characterId]);
  // Battery saver: lower resolution, no edge smoothing, fewer students and trees.
  const quality = useSettings((s) => s.quality);
  const high = quality === 'high';

  // Windows glow in the evening and at night.
  useEffect(() => {
    setCampusGlow(look.glow * 0.9);
  }, [look]);

  return (
    <Canvas
      // A new canvas when quality changes, because smoothing is fixed at creation.
      key={quality}
      dpr={high ? [1, 1.5] : 1}
      frameloop={paused ? 'never' : 'always'}
      camera={{ fov: 45, near: 0.5, far: 9000, position: [0, 60, 60] }}
      gl={{ antialias: high, powerPreference: 'default' }}
      style={{ touchAction: 'none' }}
      onCreated={({ gl, camera }) => {
        // Development only: check draw calls with __gl.info.render, and the camera with __cam.
        if (import.meta.env.DEV) Object.assign(window as object, { __gl: gl, __cam: camera });
      }}
    >
      <color attach="background" args={[look.sky]} />
      <hemisphereLight args={[look.hemiSky, look.hemiGround, look.hemiIntensity]} />
      <directionalLight position={look.sunPos} color={look.sunColor} intensity={look.sunIntensity} />
      {/* The player first, so the camera and students know where they start. */}
      <Player look={look3d} />
      <CameraRig start={[playerWorld.pos.x, playerWorld.pos.z]} />
      <CampusGround grass={look.grass} />
      <CampusBuildings />
      <CampusScenery quality={quality} />
      <CampusLabels />
      <Npcs count={high ? 6 : 3} />
    </Canvas>
  );
}
