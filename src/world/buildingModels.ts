// Building designs, built in code from simple shapes. Each design faces south
// (+z, towards the camera). Results are cached, so each design is only built
// once however many times it appears.
import { university } from '../content/university';
import type { LocationType } from '../game/types';
import {
  Parts,
  WINDOW,
  box,
  cylinder,
  gableRoof,
  roundedBox,
  shade,
  torus,
  type MergedPart,
} from './three-utils';

export interface BuildingModel {
  parts: MergedPart[];
  /** Height for the floating name label. */
  labelY: number;
  /** Where people stand to go in, relative to the building centre. */
  door: [x: number, z: number];
  /** Rough half-size, used to keep trees away. */
  radius: number;
  /** Solid areas the player cannot walk through: [centreX, centreZ, width, depth]. */
  blocks: Array<[number, number, number, number]>;
}

interface Palette {
  wall: string;
  roof: string;
  accent: string;
}

const { primary, accent } = university.colours;

/** Colours per type. Types with several buildings (hostels) take turns. */
const PALETTES: Record<LocationType, Palette[]> = {
  lecture: [
    { wall: '#F2E6D0', roof: primary, accent },
    { wall: '#E8D9F0', roof: '#6A4C93', accent },
  ],
  library: [{ wall: '#C9D8E6', roof: '#3B5A7A', accent: '#E07A3F' }],
  faculty: [{ wall: '#E9C9A6', roof: '#8B5E3C', accent }],
  cafeteria: [{ wall: '#F0B85A', roof: '#C2462E', accent: '#FFFFFF' }],
  hostel: [
    { wall: '#BFD8EE', roof: '#2F5D8A', accent: '#F4F4F0' },
    { wall: '#F3C6C1', roof: '#A04A5C', accent: '#F4F4F0' },
    { wall: '#D6E8C3', roof: '#4E7A3A', accent: '#F4F4F0' },
  ],
  field: [{ wall: '#5FB55A', roof: '#6CC566', accent: '#FFFFFF' }],
  business: [{ wall: '#9AD1C8', roof: '#2C7A6B', accent }],
  park: [{ wall: '#F2D16B', roof: '#3F8F5A', accent }],
  gate: [{ wall: '#E8E0D0', roof: primary, accent }],
};

const DOOR = '#5A3B2A';
const WHITE = '#F4EFE6';

function lecture(c: Palette): BuildingModel {
  const p = new Parts();
  p.add(roundedBox(10, 4.2, 6, 0.25), c.wall, 0, 2.1, 0);
  p.add(gableRoof(10.6, 2, 6.8), c.roof, 0, 4.2, 0, [0, 0, 0], true);
  for (const x of [-3.6, -1.2, 1.2, 3.6]) p.add(cylinder(0.25, 0.25, 3.6, 8), WHITE, x, 1.8, 3.6);
  p.add(roundedBox(9, 0.45, 1.5, 0.1), c.accent, 0, 3.8, 3.45);
  p.add(box(8.4, 0.3, 1.8), '#CFC8BA', 0, 0.15, 3.7);
  p.add(box(2, 2.6, 0.1), DOOR, 0, 1.3, 3.02);
  for (const x of [-4, -2.6, 2.6, 4]) p.add(box(0.9, 1.4, 0.08), WINDOW, x, 2.4, 3.02);
  return { parts: p.merge(), labelY: 7.4, door: [0, 5], radius: 6, blocks: [[0, 0.2, 10.6, 7.2]] };
}

function library(c: Palette): BuildingModel {
  const p = new Parts();
  p.add(roundedBox(7, 7, 7, 0.3), c.wall, 0, 3.5, 0);
  p.add(roundedBox(7.8, 0.5, 7.8, 0.15), c.roof, 0, 7.25, 0);
  p.add(box(7.06, 0.8, 7.06), c.accent, 0, 6.2, 0);
  for (const x of [-2.4, 0, 2.4]) p.add(box(1.2, 2.4, 0.08), WINDOW, x, 4.2, 3.52);
  p.add(box(1.8, 2.4, 0.1), DOOR, 0, 1.2, 3.52);
  p.add(box(4, 0.3, 1.4), '#CFC8BA', 0, 0.15, 4.1);
  // Book spines by the door.
  ['#C2462E', '#2F5D8A', '#E3B341'].forEach((col, i) => p.add(roundedBox(0.5, 1.6, 0.5, 0.06), col, 2.4 + i * 0.55, 0.8, 4));
  return { parts: p.merge(), labelY: 9.2, door: [0, 5.5], radius: 5, blocks: [[0, 0, 7.8, 7.8]] };
}

function faculty(c: Palette): BuildingModel {
  const p = new Parts();
  p.add(roundedBox(9, 6, 5, 0.25), c.wall, 0, 3, 0);
  p.add(roundedBox(4, 6, 4, 0.25), shade(c.wall, 0.92), 3.5, 3, -4);
  p.add(roundedBox(9.6, 0.4, 5.6, 0.12), c.roof, 0, 6.2, 0);
  p.add(roundedBox(4.6, 0.4, 4.6, 0.12), c.roof, 3.5, 6.2, -4);
  p.add(box(9.05, 0.3, 5.05), c.accent, 0, 3.1, 0);
  for (const x of [-3.2, -1.4, 0.4, 2.2, 3.6]) p.add(box(1, 1.1, 0.08), WINDOW, x, 4.6, 2.52);
  for (const x of [0.4, 2.2, 3.6]) p.add(box(1, 1.1, 0.08), WINDOW, x, 1.7, 2.52);
  p.add(box(1.8, 2.4, 0.1), DOOR, -2.4, 1.2, 2.52);
  // Notice board by the door.
  p.add(box(1.4, 1, 0.1), '#7A5536', -0.6, 1.6, 2.6);
  return { parts: p.merge(), labelY: 8.4, door: [-2.4, 4], radius: 6, blocks: [[0, 0, 9.6, 5.6], [3.5, -4, 4.6, 4.6]] };
}

function cafeteria(c: Palette): BuildingModel {
  const p = new Parts();
  p.add(box(8, 0.2, 5), '#CDB89A', 0, 0.1, 0);
  for (const [x, z] of [[-3.8, -2.3], [3.8, -2.3], [-3.8, 2.3], [3.8, 2.3]] as const) {
    p.add(cylinder(0.15, 0.15, 3, 6), '#6B4423', x, 1.6, z);
  }
  p.add(roundedBox(8.8, 0.25, 5.8, 0.08), c.roof, 0, 3.2, 0, [-0.1, 0, 0]);
  // Striped awning along the front.
  for (let i = 0; i < 8; i++) p.add(box(1.1, 0.55, 0.12), i % 2 ? c.accent : c.roof, -3.85 + i * 1.1, 2.85, 2.95);
  p.add(roundedBox(5, 1.1, 1, 0.1), c.wall, 0, 0.75, -1.5);
  // Coolers and pots on the counter.
  p.add(cylinder(0.35, 0.35, 0.5, 10), '#C0C6CC', -1.5, 1.55, -1.5);
  p.add(cylinder(0.35, 0.35, 0.5, 10), '#C0C6CC', 0, 1.55, -1.5);
  p.add(roundedBox(0.9, 0.6, 0.6, 0.08), '#2F7FC1', 1.6, 1.6, -1.5);
  for (const x of [-2, 2]) {
    p.add(cylinder(0.75, 0.75, 0.12, 10), WHITE, x, 0.95, 0.9);
    p.add(cylinder(0.1, 0.1, 0.8, 6), '#6B4423', x, 0.5, 0.9);
    for (const dx of [-1, 1]) p.add(cylinder(0.25, 0.25, 0.5, 8), c.roof, x + dx, 0.45, 0.9);
  }
  return { parts: p.merge(), labelY: 5.4, door: [0, 4], radius: 5, blocks: [[0, 0, 8.8, 5.8]] };
}

function hostel(c: Palette): BuildingModel {
  const p = new Parts();
  p.add(roundedBox(12, 7.5, 5, 0.25), c.wall, 0, 3.75, 0);
  p.add(gableRoof(12.6, 1.8, 5.8), c.roof, 0, 7.5, 0, [0, 0, 0], true);
  for (const y of [2.5, 5]) {
    p.add(box(12.05, 0.25, 5.05), shade(c.wall, 0.85), 0, y, 0);
    p.add(box(11, 0.5, 0.12), c.accent, 0, y + 0.45, 3.05); // balcony rail
    p.add(box(11, 0.12, 0.6), shade(c.wall, 0.8), 0, y + 0.06, 2.8); // balcony floor
  }
  for (const y of [1.3, 3.8, 6.3]) {
    for (const x of [-4.8, -2.4, 0, 2.4, 4.8]) {
      if (y < 2 && x === 0) continue; // door goes here
      p.add(box(1, 1.1, 0.08), WINDOW, x, y, 2.52);
    }
  }
  p.add(box(1.6, 2.2, 0.1), DOOR, 0, 1.1, 2.52);
  // Clothes drying on the balcony line.
  ['#E8742A', '#F2C230', '#2E8B57', '#8E3B8A'].forEach((col, i) => p.add(box(0.6, 0.8, 0.05), col, -4 + i * 2.6, 4.2, 3.12));
  return { parts: p.merge(), labelY: 10.6, door: [0, 4], radius: 7, blocks: [[0, 0, 12.6, 5.8]] };
}

function field(c: Palette): BuildingModel {
  const p = new Parts();
  p.add(box(16, 0.1, 10), c.wall, 0, 0.11, 0);
  for (let i = 0; i < 4; i++) p.add(box(2, 0.02, 10), c.roof, -6 + i * 4, 0.17, 0);
  const line = c.accent;
  p.add(box(16, 0.03, 0.15), line, 0, 0.18, -4.9);
  p.add(box(16, 0.03, 0.15), line, 0, 0.18, 4.9);
  p.add(box(0.15, 0.03, 10), line, -7.9, 0.18, 0);
  p.add(box(0.15, 0.03, 10), line, 7.9, 0.18, 0);
  p.add(box(0.15, 0.03, 10), line, 0, 0.18, 0);
  p.add(torus(1.6, 0.07), line, 0, 0.18, 0, [Math.PI / 2, 0, 0]);
  for (const s of [-1, 1]) {
    for (const z of [-1.4, 1.4]) p.add(cylinder(0.08, 0.08, 1.6, 6), WHITE, s * 7.6, 0.9, z);
    p.add(cylinder(0.08, 0.08, 2.9, 6), WHITE, s * 7.6, 1.7, 0, [Math.PI / 2, 0, 0]);
  }
  return { parts: p.merge(), labelY: 3.2, door: [-6, 6], radius: 9, blocks: [] };
}

function business(c: Palette): BuildingModel {
  const p = new Parts();
  p.add(roundedBox(4, 3, 3.5, 0.2), c.wall, 0, 1.5, 0);
  p.add(roundedBox(4.4, 1.1, 0.25, 0.08), c.accent, 0, 3.6, 1.1);
  p.add(box(4.4, 0.15, 1.4), c.roof, 0, 2.6, 2.3, [0.25, 0, 0]);
  p.add(box(2.4, 1.2, 0.08), WINDOW, 0, 1.8, 1.77);
  p.add(box(1.2, 0.8, 0.8), '#7A7F87', 1.2, 0.4, 2.8);
  p.add(roundedBox(0.7, 0.4, 0.6, 0.05), '#E8E8E8', 1.2, 1, 2.8);
  p.add(box(1, 0.06, 0.6), WHITE, 1.2, 1.25, 2.8);
  return { parts: p.merge(), labelY: 5.6, door: [-1, 3.6], radius: 3, blocks: [[0, 0, 4.4, 3.8], [1.2, 2.8, 1.4, 1]] };
}

function park(c: Palette): BuildingModel {
  const p = new Parts();
  for (const [x, z] of [[-3, -2], [3, -2], [-3, 2], [3, 2]] as const) p.add(cylinder(0.15, 0.15, 3, 6), '#555', x, 1.5, z);
  p.add(roundedBox(7, 0.3, 5, 0.1), c.roof, 0, 3.1, 0);
  p.add(roundedBox(2.4, 1.2, 1.4, 0.2), c.wall, -1.5, 0.75, 0);
  return { parts: p.merge(), labelY: 5, door: [0, 3.5], radius: 4, blocks: [[-1.5, 0, 2.6, 1.6]] };
}

function gate(c: Palette): BuildingModel {
  const p = new Parts();
  for (const s of [-1, 1]) {
    p.add(roundedBox(1.4, 5, 1.4, 0.15), c.wall, s * 4.5, 2.5, 0);
    p.add(roundedBox(1.7, 0.4, 1.7, 0.1), c.roof, s * 4.5, 5.1, 0);
  }
  p.add(roundedBox(10.4, 1.2, 1.2, 0.15), c.roof, 0, 5.6, 0);
  p.add(box(10.42, 0.3, 1.22), c.accent, 0, 5.3, 0);
  // Security post.
  p.add(roundedBox(2, 2.4, 2, 0.15), c.wall, 7, 1.2, -1);
  p.add(roundedBox(2.4, 0.3, 2.4, 0.1), c.roof, 7, 2.55, -1);
  p.add(box(1, 0.8, 0.08), WINDOW, 7, 1.6, 0.02);
  // Barrier arm.
  p.add(box(7, 0.18, 0.18), '#D9482B', 0.2, 1.1, 0.8);
  return { parts: p.merge(), labelY: 8, door: [0, 2.5], radius: 7, blocks: [[-4.5, 0, 1.6, 1.6], [4.5, 0, 1.6, 1.6], [7, -1, 2.4, 2.4]] };
}

const BUILDERS: Record<LocationType, (c: Palette) => BuildingModel> = {
  lecture,
  library,
  faculty,
  cafeteria,
  hostel,
  field,
  business,
  park,
  gate,
};

const modelCache = new Map<string, BuildingModel>();

/** The model for a building of this type; `variant` picks the colour set. */
export function buildingModel(type: LocationType, variant: number): BuildingModel {
  const palettes = PALETTES[type];
  const index = variant % palettes.length;
  const key = `${type}:${index}`;
  let model = modelCache.get(key);
  if (!model) {
    model = BUILDERS[type](palettes[index]!);
    modelCache.set(key, model);
  }
  return model;
}
