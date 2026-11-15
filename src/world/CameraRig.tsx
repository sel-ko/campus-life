// Fixed angled camera. One finger drags to pan, two fingers pinch to zoom
// (mouse: drag and wheel). No rotation. Follows the player while walking.
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { campusBounds } from './layout';
import { gesture, playerWorld } from './shared';

const TILT = THREE.MathUtils.degToRad(50); // angle above the ground
const MIN_DIST = 25;
const MAX_DIST = 140;
/** How many metres of campus fit across the screen at the start. */
const START_SPAN = 36;
const TAP_SLOP = 8; // pixels a finger can wobble and still count as a tap

function startDistance(cam: THREE.PerspectiveCamera, size: { width: number; height: number }): number {
  const aspect = size.width / Math.max(size.height, 1);
  const halfFov = THREE.MathUtils.degToRad(cam.fov) / 2;
  const span = Math.min(START_SPAN, START_SPAN * aspect * 2.2); // never zoom out too far on wide screens
  return THREE.MathUtils.clamp(span / (2 * Math.tan(halfFov) * aspect), MIN_DIST, MAX_DIST);
}

export function CameraRig({ start }: { start: [number, number] }) {
  const { camera, gl, size } = useThree();
  // Pick the starting distance so START_SPAN metres fit across the screen,
  // whatever its shape (portrait phones need to be further out).
  const view = useRef({ x: start[0], z: start[1], dist: startDistance(camera as THREE.PerspectiveCamera, size) });

  useEffect(() => {
    const el = gl.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    let downAt = { x: 0, y: 0 };
    let pinchStart = 0;
    let distStart = view.current.dist;

    const worldPerPixel = () => {
      const cam = camera as THREE.PerspectiveCamera;
      const visible = 2 * view.current.dist * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
      return visible / el.clientHeight;
    };
    const pinchDistance = () => {
      const [a, b] = [...pointers.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };

    const onDown = (e: PointerEvent) => {
      if (pointers.size === 0) {
        gesture.moved = false;
        downAt = { x: e.clientX, y: e.clientY };
      }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      gesture.active = true;
      if (pointers.size === 2) {
        pinchStart = pinchDistance();
        distStart = view.current.dist;
        gesture.moved = true;
      }
    };
    const onMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const now = { x: e.clientX, y: e.clientY };
      pointers.set(e.pointerId, now);
      if (pointers.size === 1) {
        if (Math.hypot(now.x - downAt.x, now.y - downAt.y) > TAP_SLOP) gesture.moved = true;
        if (!gesture.moved) return;
        const wpp = worldPerPixel();
        view.current.x -= (now.x - prev.x) * wpp;
        view.current.z -= ((now.y - prev.y) * wpp) / Math.sin(TILT);
      } else if (pointers.size === 2 && pinchStart > 0) {
        view.current.dist = THREE.MathUtils.clamp((distStart * pinchStart) / Math.max(pinchDistance(), 1), MIN_DIST, MAX_DIST);
      }
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchStart = 0;
      if (pointers.size === 0) gesture.active = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      view.current.dist = THREE.MathUtils.clamp(view.current.dist * (1 + e.deltaY * 0.001), MIN_DIST, MAX_DIST);
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('pointerleave', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('pointerleave', onUp);
      el.removeEventListener('wheel', onWheel);
    };
  }, [camera, gl]);

  const bounds = campusBounds();
  useFrame((_, dt) => {
    const v = view.current;
    // Gently follow the player while they walk, unless the finger is down.
    if (playerWorld.moving && !gesture.active) {
      const k = 1 - Math.exp(-dt * 3);
      v.x += (playerWorld.pos.x - v.x) * k;
      v.z += (playerWorld.pos.z - v.z) * k;
    }
    v.x = THREE.MathUtils.clamp(v.x, bounds.minX, bounds.maxX);
    v.z = THREE.MathUtils.clamp(v.z, bounds.minZ, bounds.maxZ);
    camera.position.set(v.x, v.dist * Math.sin(TILT), v.z + v.dist * Math.cos(TILT));
    camera.lookAt(v.x, 0, v.z);
  });

  return null;
}
