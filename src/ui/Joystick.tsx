import { useRef, useState } from 'react';
import { useGlass } from '../store/settingsStore';
import { joystick } from '../world/input';

const RADIUS = 52; // how far the knob can travel, in pixels

// On-screen thumbstick for walking in the close-up view. It writes its
// direction into a shared object that the 3D player reads every frame.
export function Joystick() {
  const glass = useGlass();
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  function update(e: React.PointerEvent) {
    const rect = base.current!.getBoundingClientRect();
    let dx = e.clientX - (rect.left + rect.width / 2);
    let dy = e.clientY - (rect.top + rect.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS;
      dy = (dy / len) * RADIUS;
    }
    setKnob({ x: dx, y: dy });
    joystick.x = dx / RADIUS;
    joystick.y = dy / RADIUS;
    joystick.active = true;
  }

  function release() {
    setKnob({ x: 0, y: 0 });
    joystick.x = 0;
    joystick.y = 0;
    joystick.active = false;
  }

  return (
    <div
      ref={base}
      role="application"
      aria-label="Joystick: drag to walk"
      className={`pointer-events-auto relative size-32 touch-none rounded-full ${glass}`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e);
      }}
      onPointerMove={(e) => joystick.active && update(e)}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div
        className="absolute top-1/2 left-1/2 size-14 rounded-full border border-white/40 bg-white/70 shadow-lg"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  );
}
