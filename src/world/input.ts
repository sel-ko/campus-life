// The on-screen joystick writes here; the player reads it every frame.
// No three.js import, so the 2D interface can use it without pulling in 3D.
export const joystick = {
  /** -1 (left) to 1 (right). */
  x: 0,
  /** -1 (up the screen, north) to 1 (down the screen, south). */
  y: 0,
  active: false,
};
