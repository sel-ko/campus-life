// What the floating joystick looks like right now (screen state only).
// The movement itself goes through world/input.ts so the 3D scene can read
// it every frame without React re-rendering.
import { create } from 'zustand';

interface JoystickView {
  visible: boolean;
  /** Where the finger first touched, in screen pixels. */
  baseX: number;
  baseY: number;
  /** Knob offset from the base, in pixels. */
  knobX: number;
  knobY: number;
  show: (x: number, y: number) => void;
  move: (dx: number, dy: number) => void;
  hide: () => void;
}

export const useJoystickView = create<JoystickView>((set) => ({
  visible: false,
  baseX: 0,
  baseY: 0,
  knobX: 0,
  knobY: 0,
  show: (x, y) => set({ visible: true, baseX: x, baseY: y, knobX: 0, knobY: 0 }),
  move: (dx, dy) => set({ knobX: dx, knobY: dy }),
  hide: () => set({ visible: false, knobX: 0, knobY: 0 }),
}));
