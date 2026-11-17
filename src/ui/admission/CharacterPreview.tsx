// The whole character in 3D on a turntable, for the character creator.
// Drag sideways to spin it (it keeps a little momentum), pinch or scroll to
// zoom between the full body and a close-up of the face. When left alone it
// turns slowly and breathes; after a change it gives a little wave.
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import type * as THREE from 'three';
import { Character, type Pose } from '../../world/characters/Character';
import type { CharacterLook } from '../../world/characters/look';
import { cylinder, material } from '../../world/three-utils';

/** Shared between the pointer handlers (outside the canvas) and the frame loop. */
interface Spin {
  angle: number;
  velocity: number;
  dragging: boolean;
  lastInput: number;
  /** 0 = full body, 1 = close-up of the face. */
  zoom: number;
}

const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const discGeo = cylinder(1.25, 1.32, 0.14, 32);
const ringGeo = cylinder(1.42, 1.42, 0.04, 32);

function Turntable({ look, spin }: { look: CharacterLook; spin: React.RefObject<Spin> }) {
  const turn = useRef<THREE.Group>(null);
  const [pose, setPose] = useState<Pose>('stand');
  const first = useRef(true);
  // Wave after each change (not on the first show).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setPose('chat');
    const id = window.setTimeout(() => setPose('stand'), 1400);
    return () => window.clearTimeout(id);
  }, [look]);

  useFrame(({ camera }, dt) => {
    const s = spin.current;
    if (!s.dragging) {
      s.angle += s.velocity * dt;
      s.velocity *= Math.pow(0.04, dt);
      // Idle: drift slowly once the player has let go for a while.
      if (!reduceMotion && performance.now() / 1000 - s.lastInput > 2.5 && Math.abs(s.velocity) < 0.3) s.angle += dt * 0.35;
    }
    if (turn.current) turn.current.rotation.y = s.angle;
    // Full body: whole figure in view. Close-up: head and shoulders.
    const z = 8.6 - s.zoom * 2.9;
    const y = 0.15 + s.zoom * 0.6;
    camera.position.x = 0;
    camera.position.y += (y + 0.35 - camera.position.y) * Math.min(1, dt * 8);
    camera.position.z += (z - camera.position.z) * Math.min(1, dt * 8);
    camera.lookAt(0, camera.position.y - 0.35, 0);
  });

  return (
    <group position={[0, -1.6, 0]}>
      <mesh geometry={discGeo} material={material('#2A3D4C')} position={[0, -0.08, 0]} />
      <mesh geometry={ringGeo} material={material('#F5B83D')} position={[0, -0.13, 0]} />
      <group ref={turn}>
        <Character look={look} pose={pose} />
      </group>
    </group>
  );
}

export default function CharacterPreview({ look }: { look: CharacterLook }) {
  const spin = useRef<Spin>({ angle: 0.45, velocity: 0, dragging: false, lastInput: 0, zoom: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const last = useRef({ x: 0, t: 0 });
  const [closeUp, setCloseUp] = useState(false);

  const setZoom = (z: number) => {
    spin.current.zoom = Math.max(0, Math.min(1, z));
    setCloseUp(spin.current.zoom > 0.5);
  };
  const touched = () => (spin.current.lastInput = performance.now() / 1000);

  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a!.x - b!.x, a!.y - b!.y), zoom: spin.current.zoom };
    }
    spin.current.dragging = true;
    spin.current.velocity = 0;
    last.current = { x: e.clientX, t: e.timeStamp };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      setZoom(pinch.current.zoom + (d - pinch.current.dist) / 160);
      return;
    }
    const dx = e.clientX - last.current.x;
    const dt = Math.max(1, e.timeStamp - last.current.t) / 1000;
    spin.current.angle += dx * 0.012;
    spin.current.velocity = (dx * 0.012) / dt;
    last.current = { x: e.clientX, t: e.timeStamp };
  };
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) {
      spin.current.dragging = false;
      // A drag that stopped before letting go should not fling.
      if (e.timeStamp - last.current.t > 80) spin.current.velocity = 0;
      spin.current.velocity = Math.max(-8, Math.min(8, spin.current.velocity));
    }
    touched();
  };

  return (
    <div
      className="absolute inset-0 cursor-grab touch-none select-none active:cursor-grabbing"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onWheel={(e) => {
        setZoom(spin.current.zoom - e.deltaY / 600);
        touched();
      }}
    >
      <Canvas dpr={[1, 1.75]} gl={{ alpha: true, antialias: true }} camera={{ fov: 30, position: [0, 0.5, 8.6] }}>
        <hemisphereLight args={['#FFF4E0', '#40362C', 1.9]} />
        <directionalLight position={[3, 5, 4]} intensity={1.4} />
        <directionalLight position={[-4, 3, -3]} color="#7FB4FF" intensity={0.6} />
        <Turntable look={look} spin={spin} />
      </Canvas>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => {
          setZoom(closeUp ? 0 : 1);
          touched();
        }}
        aria-label={closeUp ? 'Show the whole body' : 'Zoom in on the face'}
        className="absolute top-2 right-2 grid size-9 place-items-center rounded-full border border-white/15 bg-black/35 text-base backdrop-blur"
      >
        {closeUp ? '⤢' : '🔍'}
      </button>
    </div>
  );
}
