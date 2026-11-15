// The camera, with two modes:
// - follow ("Me"): close on the player; the joystick moves them.
// - overview ("Map"): fits the whole campus; one finger drags to pan.
// In both: pinch zooms, twisting two fingers turns the view round, and moving
// two fingers up or down tilts it (mouse: wheel zooms, right-drag or
// Shift-drag turns and tilts). Pressing Me or Map straightens the view.
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { campusBounds } from './campus/navigation';
import { cameraState, gesture, playerWorld } from './shared';

const DEFAULT_TILT = THREE.MathUtils.degToRad(60); // angle above the ground
const TILT_MIN = THREE.MathUtils.degToRad(22);
const TILT_MAX = THREE.MathUtils.degToRad(88);
const FOLLOW = { start: 75, min: 25, max: 180 };
const TAP_SLOP = 8; // pixels a finger can wobble and still count as a tap

/** Distance at which the whole campus fits on screen at a tilt. */
function fitDistance(cam: THREE.PerspectiveCamera, width: number, height: number, tilt = DEFAULT_TILT): number {
  const b = campusBounds();
  const aspect = width / Math.max(height, 1);
  const t = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
  const w = b.maxX - b.minX + 6;
  const d = b.maxZ - b.minZ + 6;
  return Math.max(w / (2 * t * aspect), (d * Math.sin(tilt)) / (2 * t));
}

export function CameraRig({ start }: { start: [number, number] }) {
  const { camera, gl, size } = useThree();
  const mode = useGameStore((s) => s.cameraMode);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const view = useRef({ x: playerWorld.pos.x || start[0], z: playerWorld.pos.z || start[1], dist: FOLLOW.start, yaw: 0, tilt: DEFAULT_TILT });
  const goal = useRef({ followDist: FOLLOW.start, overviewDist: 0, ox: 0, oz: 0, yaw: 0, tilt: DEFAULT_TILT });

  // Changing mode straightens the view; the map view fits the whole campus.
  useEffect(() => {
    const g = goal.current;
    g.yaw = Math.round(view.current.yaw / (Math.PI * 2)) * Math.PI * 2;
    g.tilt = DEFAULT_TILT;
    if (mode !== 'overview') return;
    const b = campusBounds();
    g.ox = (b.minX + b.maxX) / 2;
    g.oz = (b.minZ + b.maxZ) / 2;
    g.overviewDist = fitDistance(camera as THREE.PerspectiveCamera, size.width, size.height);
  }, [mode, camera, size.width, size.height]);

  useEffect(() => {
    const el = gl.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    let downAt = { x: 0, y: 0 };
    let two: { dist: number; angle: number; midY: number; startDist: number; yaw: number; tilt: number } | null = null;
    let rotating = false;

    const worldPerPixel = () => {
      const cam = camera as THREE.PerspectiveCamera;
      return (2 * view.current.dist * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2)) / el.clientHeight;
    };
    const pair = () => {
      const [a, b] = [...pointers.values()];
      if (!a || !b) return null;
      return { dist: Math.hypot(a.x - b.x, a.y - b.y), angle: Math.atan2(b.y - a.y, b.x - a.x), midY: (a.y + b.y) / 2 };
    };
    const maxOverview = () => fitDistance(camera as THREE.PerspectiveCamera, el.clientWidth, el.clientHeight) * 1.05;
    const setDist = (d: number) => {
      const g = goal.current;
      if (modeRef.current === 'follow') g.followDist = THREE.MathUtils.clamp(d, FOLLOW.min, FOLLOW.max);
      else g.overviewDist = THREE.MathUtils.clamp(d, 40, maxOverview());
    };
    const currentGoalDist = () => (modeRef.current === 'follow' ? goal.current.followDist : goal.current.overviewDist);
    const turn = (dYaw: number, dTilt: number) => {
      const g = goal.current;
      g.yaw += dYaw;
      g.tilt = THREE.MathUtils.clamp(g.tilt + dTilt, TILT_MIN, TILT_MAX);
    };

    const onDown = (e: PointerEvent) => {
      if (pointers.size === 0) {
        gesture.moved = false;
        downAt = { x: e.clientX, y: e.clientY };
        rotating = e.pointerType === 'mouse' && (e.button === 2 || e.shiftKey);
      }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      gesture.active = true;
      if (pointers.size === 2) {
        const p = pair()!;
        two = { ...p, startDist: currentGoalDist(), yaw: goal.current.yaw, tilt: goal.current.tilt };
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
        if (rotating) {
          turn(-(now.x - prev.x) * 0.008, (now.y - prev.y) * 0.006);
          return;
        }
        // Only the map view pans with one finger; in close-up the joystick moves the player.
        if (modeRef.current !== 'overview') return;
        const wpp = worldPerPixel();
        const g = goal.current;
        const dx = (now.x - prev.x) * wpp;
        const dy = ((now.y - prev.y) * wpp) / Math.sin(view.current.tilt);
        const c = Math.cos(view.current.yaw);
        const s = Math.sin(view.current.yaw);
        g.ox -= dx * c + dy * s;
        g.oz -= -dx * s + dy * c;
      } else if (pointers.size === 2 && two) {
        const p = pair()!;
        setDist((two.startDist * two.dist) / Math.max(p.dist, 1));
        // Twist turns the view; both fingers sliding up or down tilts it.
        let dAngle = p.angle - two.angle;
        if (dAngle > Math.PI) dAngle -= Math.PI * 2;
        if (dAngle < -Math.PI) dAngle += Math.PI * 2;
        const g = goal.current;
        g.yaw = two.yaw - dAngle;
        g.tilt = THREE.MathUtils.clamp(two.tilt + (p.midY - two.midY) * 0.006, TILT_MIN, TILT_MAX);
      }
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) two = null;
      if (pointers.size === 0) {
        gesture.active = false;
        rotating = false;
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setDist(currentGoalDist() * (1 + e.deltaY * 0.001));
    };
    const noMenu = (e: Event) => e.preventDefault();

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('pointerleave', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('contextmenu', noMenu);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('pointerleave', onUp);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('contextmenu', noMenu);
    };
  }, [camera, gl]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const v = view.current;
    const g = goal.current;
    const b = campusBounds();
    g.ox = THREE.MathUtils.clamp(g.ox, b.minX, b.maxX);
    g.oz = THREE.MathUtils.clamp(g.oz, b.minZ, b.maxZ);

    const follow = modeRef.current === 'follow';
    const tx = follow ? playerWorld.pos.x : g.ox;
    const tz = follow ? playerWorld.pos.z : g.oz;
    const td = follow ? g.followDist : g.overviewDist || v.dist;
    const k = 1 - Math.exp(-dt * (follow ? 6 : 4));
    const kr = 1 - Math.exp(-dt * 10);
    v.x += (tx - v.x) * k;
    v.z += (tz - v.z) * k;
    v.dist += (td - v.dist) * (1 - Math.exp(-dt * 4));
    v.yaw += (g.yaw - v.yaw) * kr;
    v.tilt += (g.tilt - v.tilt) * kr;

    const flat = v.dist * Math.cos(v.tilt);
    camera.position.set(v.x + flat * Math.sin(v.yaw), v.dist * Math.sin(v.tilt), v.z + flat * Math.cos(v.yaw));
    camera.lookAt(v.x, 0, v.z);
    cameraState.dist = v.dist;
    cameraState.yaw = v.yaw;

    // Keep the depth range tight so roads lying just above the grass never flicker.
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
