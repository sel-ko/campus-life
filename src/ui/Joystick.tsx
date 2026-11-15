// Floating joystick for the close-up ("Me") view. Hidden until the player
// touches and drags on the map; it appears under the finger and disappears on
// release. A quick tap is left alone so buildings can still be tapped.
import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { useJoystickView } from '../store/joystickStore';
import { joystick } from '../world/input';

const RADIUS = 52; // how far the knob can travel, in pixels
const START_AFTER = 10; // pixels of drag before the joystick appears

/** Pointer handlers to spread onto the map's wrapper element. */
export function useJoystickHandlers(enabled: boolean) {
  // Read the store without subscribing, so moving a finger never re-renders
  // the map; only FloatingJoystick below re-renders.
  const view = useJoystickView.getState();
  const touch = useRef<{ id: number; x: number; y: number; active: boolean } | null>(null);
  const fingers = useRef(new Set<number>());

  function reset() {
    touch.current = null;
    joystick.x = 0;
    joystick.y = 0;
    joystick.active = false;
    view.hide();
  }

  return {
    onPointerDown(e: ReactPointerEvent) {
      fingers.current.add(e.pointerId);
      if (!enabled || fingers.current.size > 1) {
        // A second finger means pinch-to-zoom: drop the joystick.
        if (touch.current) reset();
        return;
      }
      touch.current = { id: e.pointerId, x: e.clientX, y: e.clientY, active: false };
    },
    onPointerMove(e: ReactPointerEvent) {
      const t = touch.current;
      if (!t || t.id !== e.pointerId) return;
      let dx = e.clientX - t.x;
      let dy = e.clientY - t.y;
      if (!t.active) {
        if (Math.hypot(dx, dy) < START_AFTER) return;
        t.active = true;
        view.show(t.x, t.y);
      }
      const len = Math.hypot(dx, dy);
      if (len > RADIUS) {
        dx = (dx / len) * RADIUS;
        dy = (dy / len) * RADIUS;
      }
      view.move(dx, dy);
      joystick.x = dx / RADIUS;
      joystick.y = dy / RADIUS;
      joystick.active = true;
    },
    onPointerUp(e: ReactPointerEvent) {
      fingers.current.delete(e.pointerId);
      if (touch.current?.id === e.pointerId) reset();
    },
    onPointerCancel(e: ReactPointerEvent) {
      fingers.current.delete(e.pointerId);
      reset();
    },
  };
}

/** The joystick picture, drawn where the finger went down. */
export function FloatingJoystick() {
  const { visible, baseX, baseY, knobX, knobY } = useJoystickView();
  if (!visible) return null;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed z-10 size-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25 bg-black/30"
      style={{ left: baseX, top: baseY }}
    >
      <div
        className="absolute top-1/2 left-1/2 size-14 rounded-full border border-white/50 bg-white/80 shadow-lg"
        style={{ transform: `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))` }}
      />
    </div>
  );
}
