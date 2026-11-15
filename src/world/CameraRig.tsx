// Fixed angled camera with two modes, no rotation:
// - follow ("Me"): close on the player; pinch zooms a little; the joystick moves.
// - overview ("Map"): fits the whole campus; drag pans, pinch zooms in.
// Switching modes glides smoothly between them.
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { campusBounds, zoneAt, zoneBounds } from './campus/navigation';
import { cameraState, gesture, playerWorld } from './shared';

const TILT = THREE.MathUtils.degToRad(60); // angle above the ground
const FOLLOW = { start: 75, min: 25, max: 180 };
const TAP_SLOP = 8; // pixels a finger can wobble and still count as a tap

/** Distance at which an area (the player's section, or the whole campus) fits on screen. */
function fitDistance(cam: THREE.PerspectiveCamera, width: number, height: number, b = zoneBounds(zoneAt(playerWorld.pos.x, playerWorld.pos.z))): number {
  const aspect = width / Math.max(height, 1);
  const t = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
  const w = b.maxX - b.minX + 6;
  const d = b.maxZ - b.minZ + 6;
  return Math.max(w / (2 * t * aspect), (d * Math.sin(TILT)) / (2 * t));
}

export function CameraRig({ start }: { start: [number, number] }) {
  const { camera, gl, size } = useThree();
  const mode = useGameStore((s) => s.cameraMode);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // Where the camera is now, and where each mode wants it.
  // Start over the player (the Player component has already placed itself).
  const view = useRef({ x: playerWorld.pos.x || start[0], z: playerWorld.pos.z || start[1], dist: FOLLOW.start });
  const goal = useRef({ followDist: FOLLOW.start, overviewDist: 0, ox: 0, oz: 0 });

  // Entering the map view: centre on the player's section, zoomed out to fit it.
  useEffect(() => {
    if (mode !== 'overview') return;
    const b = zoneBounds(zoneAt(playerWorld.pos.x, playerWorld.pos.z));
    goal.current.ox = (b.minX + b.maxX) / 2;
    goal.current.oz = (b.minZ + b.maxZ) / 2;
    goal.current.overviewDist = fitDistance(camera as THREE.PerspectiveCamera, size.width, size.height);
  }, [mode, camera, size.width, size.height]);

  useEffect(() => {
    const el = gl.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    let downAt = { x: 0, y: 0 };
    let pinchStart = 0;
    let distStart = 0;

    const worldPerPixel = () => {
      const cam = camera as THREE.PerspectiveCamera;
      return (2 * view.current.dist * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2)) / el.clientHeight;
    };
    const pinchDistance = () => {
      const [a, b] = [...pointers.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };
    // Pinching out in the map view can go as far as the whole campus.
    const maxOverview = () => fitDistance(camera as THREE.PerspectiveCamera, el.clientWidth, el.clientHeight, campusBounds()) * 1.05;
    const setDist = (d: number) => {
      const g = goal.current;
      if (modeRef.current === 'follow') g.followDist = THREE.MathUtils.clamp(d, FOLLOW.min, FOLLOW.max);
      else g.overviewDist = THREE.MathUtils.clamp(d, 40, maxOverview());
    };
    const currentGoalDist = () => (modeRef.current === 'follow' ? goal.current.followDist : goal.current.overviewDist);

    const onDown = (e: PointerEvent) => {
      if (pointers.size === 0) {
        gesture.moved = false;
        downAt = { x: e.clientX, y: e.clientY };
      }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      gesture.active = true;
      if (pointers.size === 2) {
        pinchStart = pinchDistance();
        distStart = currentGoalDist();
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
        // Only the map view pans; in close-up the joystick moves the player.
        if (!gesture.moved || modeRef.current !== 'overview') return;
        const wpp = worldPerPixel();
        goal.current.ox -= (now.x - prev.x) * wpp;
        goal.current.oz -= ((now.y - prev.y) * wpp) / Math.sin(TILT);
      } else if (pointers.size === 2 && pinchStart > 0) {
        setDist((distStart * pinchStart) / Math.max(pinchDistance(), 1));
      }
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchStart = 0;
      if (pointers.size === 0) gesture.active = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setDist(currentGoalDist() * (1 + e.deltaY * 0.001));
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

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const v = view.current;
    const g = goal.current;
    // Panning stays within the player's section (with a small margin), unless
    // zoomed out past it.
    const zb = zoneBounds(zoneAt(playerWorld.pos.x, playerWorld.pos.z));
    const b = g.overviewDist > fitDistance(camera as THREE.PerspectiveCamera, size.width, size.height) * 1.2 ? campusBounds() : zb;
    g.ox = THREE.MathUtils.clamp(g.ox, b.minX, b.maxX);
    g.oz = THREE.MathUtils.clamp(g.oz, b.minZ, b.maxZ);

    const follow = modeRef.current === 'follow';
    const tx = follow ? playerWorld.pos.x : g.ox;
    const tz = follow ? playerWorld.pos.z : g.oz;
    const td = follow ? g.followDist : g.overviewDist || v.dist;
    // Follow the player tightly; glide more slowly when changing modes.
    const k = 1 - Math.exp(-dt * (follow ? 6 : 4));
    v.x += (tx - v.x) * k;
    v.z += (tz - v.z) * k;
    v.dist += (td - v.dist) * (1 - Math.exp(-dt * 4));

    camera.position.set(v.x, v.dist * Math.sin(TILT), v.z + v.dist * Math.cos(TILT));
    camera.lookAt(v.x, 0, v.z);
    cameraState.dist = v.dist;

    // Keep the depth range tight around what is on screen, so roads lying just
    // above the grass do not flicker when zoomed far out.
    const cam = camera as THREE.PerspectiveCamera;
    const near = Math.max(0.5, v.dist * 0.04);
    const far = v.dist * 6 + 400;
    if (Math.abs(cam.near - near) > near * 0.15 || Math.abs(cam.far - far) > far * 0.15) {
      cam.near = near;
      cam.far = far;
      cam.updateProjectionMatrix();
    }
  });

  return null;
}
