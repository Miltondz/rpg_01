/**
 * Canonical direction module for the grid + Three.js camera.
 *
 * Single source of truth for N/E/S/W deltas and camera rotation.
 * No more duplicated tables, no more "CORRECTED" comments.
 *
 * Grid convention (right-handed):
 *   x+ = East,  x- = West
 *   z- = North, z+ = South   (Three.js camera default looks toward -Z = North)
 *
 * Camera rotation convention:
 *   camera.rotation.y is applied around world Y axis (up)
 *   Three.js default camera looks at -Z, so rotation.y = 0 == facing North.
 *   Positive y-rotation in Three.js is counterclockwise viewed from +Y (top-down).
 *   East (+X) is therefore rotation.y = -PI/2; West (-X) is +PI/2.
 */

export const Direction = Object.freeze({
  NORTH: 0,
  EAST:  1,
  SOUTH: 2,
  WEST:  3,
});

const NAMES = ['North', 'East', 'South', 'West'];

const DELTAS = [
  { x: 0,  z: -1 }, // North
  { x: 1,  z: 0  }, // East
  { x: 0,  z: 1  }, // South
  { x: -1, z: 0  }, // West
];

const RADIANS = [
  0,             // North: camera looks toward -Z
  -Math.PI / 2,  // East:  camera looks toward +X
  Math.PI,       // South: camera looks toward +Z
  Math.PI / 2,   // West:  camera looks toward -X
];

const norm = (dir) => ((dir % 4) + 4) % 4;

export const Dir = Object.freeze({
  NORTH: 0, EAST: 1, SOUTH: 2, WEST: 3,

  forward:  (dir) => DELTAS[norm(dir)],
  backward: (dir) => DELTAS[norm(dir + 2)],
  left:     (dir) => DELTAS[norm(dir + 3)],
  right:    (dir) => DELTAS[norm(dir + 1)],

  turnLeft:  (dir) => norm(dir + 3),
  turnRight: (dir) => norm(dir + 1),
  opposite:  (dir) => norm(dir + 2),

  name:      (dir) => NAMES[norm(dir)],
  toRadians: (dir) => RADIANS[norm(dir)],

  delta:     (dir) => DELTAS[norm(dir)],
});

if (typeof window !== 'undefined') {
  window.Direction = Direction;
  window.Dir = Dir;
}
