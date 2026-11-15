// Small mutable objects shared between 3D components every frame. Kept out of
// React state on purpose: changing them must not cause re-renders.
import * as THREE from 'three';

/** Set by the camera controls while the finger is dragging or pinching, so a
 *  drag that ends over a building does not count as a tap. */
export const gesture = { moved: false, active: false };

/** Where the player character is, so the camera can follow it. */
export const playerWorld = { pos: new THREE.Vector3(), moving: false };
