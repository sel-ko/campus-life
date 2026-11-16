// Floor plans for every kind of room. A layout lists fixtures: what they look
// like (built from furniture.ts), the footprint you cannot walk through, the
// interaction target they stand for, and the spot you walk up to use them.
// No rules here: which interactions exist comes from the interaction API.
import type { Occupant, TargetType } from '../../game/interactions';
import type { PlaceType } from '../../game/types';
import { Parts } from '../three-utils';
import * as F from './furniture';

export type Target = { type: TargetType; id?: string };
export type V2 = [number, number];

export interface Fixture {
  key: string;
  target?: Target;
  /** Where you stand to use it. */
  use: V2;
  /** Footprint you cannot walk through: [x0, z0, x1, z1]. */
  solid?: [number, number, number, number];
  /** Height of the tap box above it. */
  height: number;
  /** Where people of this kind stand or sit: extra spots next to `use`. */
  people?: Array<[number, number, number]>;
}

export interface RoomLayout {
  w: number;
  d: number;
  floor: string;
  wall: string;
  /** Outdoor spaces have no walls or ceiling. */
  outdoor?: boolean;
  fixtures: Fixture[];
  build: (p: Parts) => void;
  spawn: V2;
}

const solidOf = (x: number, z: number, w: number, d: number, pad = 0): [number, number, number, number] => [x - w / 2 - pad, z - d / 2 - pad, x + w / 2 + pad, z + d / 2 + pad];

// ---------------------------------------------------------------- the dorm

const SHEETS = ['#5B8DEF', '#E8742A', '#2E8B57', '#B23A79'];
const WOODS = ['#8B5E3C', '#A0703F', '#6E4B2F', '#9C6A2E'];
const CHAIRS = ['#D9482B', '#2F7FC1', '#F2C230', '#2E8B57'];
const CASES = ['#1F4E9C', '#C0202E', '#2E3A44', '#8E3B8A'];

/** Four corners, four students: bed, wardrobe and desk each. Corner 0 is yours. */
function dorm(): RoomLayout {
  const W = 10;
  const D = 8.6;
  const corners: Array<{ sx: number; sz: number }> = [
    { sx: -1, sz: -1 },
    { sx: 1, sz: -1 },
    { sx: -1, sz: 1 },
    { sx: 1, sz: 1 },
  ];
  const fixtures: Fixture[] = [];
  const builds: Array<(p: Parts) => void> = [];
  corners.forEach(({ sx, sz }, i) => {
    const bedX = sx * (W / 2 - 0.6);
    const bedZ = sz * (D / 2 - 1.25);
    const wallZ = sz * (D / 2 - 0.35);
    const faceIn = sz < 0 ? 0 : Math.PI; // furniture on the back wall faces +z
    const wardX = sx * (W / 2 - 1.85);
    const deskX = sx * (W / 2 - 3.2);
    const bedRot = sz < 0 ? 0 : Math.PI;
    builds.push((p) => {
      F.bed(p, { x: bedX, z: bedZ, rot: bedRot }, SHEETS[i]!, WOODS[i]);
      F.wardrobe(p, { x: wardX, z: wallZ, rot: faceIn }, WOODS[(i + 1) % 4]!, CASES[i]);
      F.desk(p, { x: deskX, z: wallZ + sz * -0.05, rot: faceIn }, WOODS[(i + 2) % 4]!, CHAIRS[i]!, ['#D9482B', '#2F5D8A', '#F2C230', '#2E8B57'].slice(0, 2 + i));
      F.slippers(p, { x: bedX - sx * 0.85, z: bedZ + sz * 0.6 }, CHAIRS[(i + 1) % 4]!);
      if (sz < 0) F.poster(p, { x: sx * (W / 2 - 0.9), z: -D / 2 + 0.03 }, ['#3E7CC9', '#E0407A', '#F2C230', '#2E8B57'][i]!, 1.9);
    });
    const own = i === 0;
    fixtures.push({
      key: `bed-${i + 1}`,
      target: own ? { type: 'bed', id: 'bed-1' } : undefined,
      use: [bedX - sx * 0.95, bedZ],
      solid: solidOf(bedX, bedZ, 1.15, 2.2),
      height: 0.8,
      people: [[bedX, bedZ - sz * 0.2, bedRot]],
    });
    fixtures.push({
      key: `wardrobe-${i + 1}`,
      target: own ? { type: 'locker' } : undefined,
      use: [wardX, wallZ - sz * 0.95],
      solid: solidOf(wardX, wallZ, 1.05, 0.65),
      height: 2.1,
    });
    fixtures.push({
      key: `desk-${i + 1}`,
      target: own ? { type: 'desk' } : undefined,
      use: [deskX, wallZ - sz * 1.3],
      solid: solidOf(deskX, wallZ, 1.3, 0.7),
      height: 0.9,
    });
  });
  // Shared: cooking corner on the left wall, shelf and window on the back wall.
  fixtures.push({ key: 'stove', target: { type: 'stove' }, use: [-W / 2 + 1.5, 0], solid: solidOf(-W / 2 + 0.5, 0, 0.8, 1.6), height: 1.1 });
  fixtures.push({ key: 'shelf', use: [0, -D / 2 + 1], solid: solidOf(0, -D / 2 + 0.3, 1.45, 0.42), height: 1.1 });
  fixtures.push({ key: 'door', target: { type: 'door' }, use: [0, D / 2 - 0.7], height: 2.2 });
  return {
    w: W,
    d: D,
    floor: '#C79A68',
    wall: '#EADFC8',
    spawn: [0, D / 2 - 1],
    fixtures,
    build: (p) => {
      for (const b of builds) b(p);
      F.cookingCorner(p, { x: -W / 2 + 0.5, z: 0, rot: Math.PI / 2 });
      F.shelf(p, { x: 0, z: -D / 2 + 0.3 }, '#7A4E2D');
      F.windowOn(p, { x: 0, z: -D / 2 + 0.02 }, '#E0407A');
      F.rug(p, { x: 0.3, z: 0.2 }, '#8E3B8A', 3.4, 2.6);
      F.clothesLine(p, { x: 1.5, z: 0.4 }, 5, ['#F2C230', '#2F7FC1', '#F4EFE6', '#D9482B']);
      // A mirror and a mat by the door.
      F.rug(p, { x: 0, z: D / 2 - 0.6 }, '#6E4B2F', 1.2, 0.6);
    },
  };
}

// ---------------------------------------------------------------- other rooms

function lectureHall(lab: boolean): RoomLayout {
  const W = 14;
  const D = 12;
  const fixtures: Fixture[] = [];
  const rows = [-1.2, 0.6, 2.4];
  const people: Array<[number, number, number]> = [];
  rows.forEach((z) => [-3.2, 3.2].forEach((x) => [-0.7, 0, 0.7].forEach((dx) => people.push([x + dx, z + 0.1, Math.PI]))));
  fixtures.push({ key: 'board', target: { type: 'board' }, use: [0, -D / 2 + 1.6], height: 2.6 });
  fixtures.push({ key: 'lectern', target: { type: 'lecturer' }, use: [-3.5, -D / 2 + 3], solid: solidOf(-3.5, -D / 2 + 2.2, 0.9, 0.65), height: 1.2, people: [[-3.5, -D / 2 + 1.5, 0]] });
  fixtures.push({ key: 'seats', target: { type: 'seat' }, use: [0, rows[1]! + 0.9], height: 1, people });
  fixtures.push({ key: 'exam-desk', target: { type: 'desk' }, use: [3.6, -D / 2 + 3], solid: solidOf(3.6, -D / 2 + 2.2, 1.7, 0.8), height: 1 });
  fixtures.push({ key: 'bench', target: { type: 'bench' }, use: [-5.5, D / 2 - 2], solid: solidOf(-5.5, D / 2 - 1.2, 2.5, 0.5), height: 0.9 });
  for (const z of rows) for (const x of [-3.2, 3.2]) fixtures.push({ key: `row-${x}-${z}`, use: [x, z], solid: solidOf(x, z - 0.15, 2.2, 0.8), height: 0 });
  if (lab) fixtures.push({ key: 'shelf', target: { type: 'shelf' }, use: [W / 2 - 1.4, 0], solid: solidOf(W / 2 - 0.4, 0, 0.5, 3), height: 2.2 });
  return {
    w: W,
    d: D,
    floor: lab ? '#D5DCE0' : '#B9935F',
    wall: lab ? '#EEF2F5' : '#F2E6CC',
    spawn: [0, D / 2 - 1],
    fixtures,
    build: (p) => {
      F.board(p, { x: 0, z: -D / 2 + 0.05 }, lab ? '#F4F7F9' : '#24433A', 5);
      F.lectern(p, { x: -3.5, z: -D / 2 + 2.2 });
      F.officeDesk(p, { x: 3.6, z: -D / 2 + 2.2, rot: Math.PI }, '#8B5E3C');
      for (const z of rows) {
        for (const x of [-3.2, 3.2]) {
          if (lab) F.labBench(p, { x, z: z - 0.15, rot: Math.PI }, 2.2);
          else F.seatRow(p, { x, z, rot: Math.PI }, 3, ['#2F5D8A', '#7A4E2D', '#2E8B57'][Math.abs(Math.round(z)) % 3]!);
        }
      }
      F.bench(p, { x: -5.5, z: D / 2 - 1.2, rot: Math.PI }, 2.4, '#5D6F7C');
      if (lab) F.bookshelf(p, { x: W / 2 - 0.4, z: 0, rot: -Math.PI / 2 }, 3);
      F.plant(p, { x: W / 2 - 1, z: D / 2 - 1 });
    },
  };
}

function library(): RoomLayout {
  const W = 14;
  const D = 11;
  const fixtures: Fixture[] = [];
  const shelvesX = [-4.5, -1.5, 1.5, 4.5];
  for (const x of shelvesX) fixtures.push({ key: `shelf-${x}`, target: { type: 'shelf' }, use: [x, -D / 2 + 1.5], solid: solidOf(x, -D / 2 + 0.4, 2.6, 0.5), height: 2.2, people: [[x + 0.6, -D / 2 + 1.4, Math.PI]] });
  const tables: V2[] = [[-3, 0.5], [3, 0.5], [-3, 2.8], [3, 2.8]];
  tables.forEach(([x, z], i) => fixtures.push({ key: `table-${i}`, target: { type: 'desk' }, use: [x + 1.1, z], solid: solidOf(x, z, 1.3, 2.0), height: 0.9, people: [[x - 0.9, z, Math.PI / 2]] }));
  fixtures.push({ key: 'counter', target: { type: 'counter' }, use: [5.2, D / 2 - 2.6], solid: solidOf(5.2, D / 2 - 1.5, 2.4, 0.8), height: 1.2, people: [[5.2, D / 2 - 0.8, Math.PI]] });
  fixtures.push({ key: 'bench', target: { type: 'bench' }, use: [-5.5, D / 2 - 2], solid: solidOf(-5.5, D / 2 - 1.2, 2.5, 0.5), height: 0.9, people: [[-5.5, D / 2 - 1.2, Math.PI]] });
  return {
    w: W,
    d: D,
    floor: '#8A6A47',
    wall: '#E9E2D2',
    spawn: [0, D / 2 - 1],
    fixtures,
    build: (p) => {
      for (const x of shelvesX) F.bookshelf(p, { x, z: -D / 2 + 0.4 }, 2.5);
      for (const [x, z] of tables) {
        F.tableWithChairs(p, { x, z, rot: Math.PI / 2 }, '#B98A55', '#2F5D8A');
        F.tableWithChairs(p, { x, z: z + 0.0, rot: -Math.PI / 2 }, '#B98A55', '#2F5D8A');
      }
      F.counter(p, { x: 5.2, z: D / 2 - 1.5, rot: Math.PI }, 2.4, '#7A4E2D', '#A0703F');
      F.bench(p, { x: -5.5, z: D / 2 - 1.2, rot: Math.PI }, 2.4, '#5D6F7C');
      F.plant(p, { x: -W / 2 + 0.8, z: 0 });
      F.plant(p, { x: W / 2 - 0.8, z: 0 });
    },
  };
}

function offices(officeIds: string[]): RoomLayout {
  const W = 13;
  const D = 10;
  const ids = officeIds.length ? officeIds : [''];
  const fixtures: Fixture[] = [];
  const xs = ids.map((_, i) => (ids.length === 1 ? 0 : -4 + (8 * i) / (ids.length - 1)));
  ids.forEach((id, i) => {
    const x = xs[i]!;
    fixtures.push({ key: `desk-${id}`, target: { type: 'desk', id: id || undefined }, use: [x, -D / 2 + 3], solid: solidOf(x, -D / 2 + 1.8, 1.7, 1.6), height: 1.3, people: [[x, -D / 2 + 1.05, 0]] });
  });
  fixtures.push({ key: 'bench', target: { type: 'bench' }, use: [0, D / 2 - 2.6], solid: solidOf(0, D / 2 - 1.5, 7, 0.5), height: 0.9, people: [-2.4, -1.2, 0, 1.2, 2.4].map((x) => [x, D / 2 - 1.5, Math.PI] as [number, number, number]) });
  fixtures.push({ key: 'board', target: { type: 'board' }, use: [W / 2 - 1.5, 0], height: 2.4 });
  return {
    w: W,
    d: D,
    floor: '#C9C2B4',
    wall: '#EFE8DA',
    spawn: [-W / 2 + 1.5, D / 2 - 1],
    fixtures,
    build: (p) => {
      ids.forEach((_, i) => F.officeDesk(p, { x: xs[i]!, z: -D / 2 + 1.8 }, ['#8E6A44', '#7A4E2D', '#9C6A2E'][i % 3]!));
      for (const x of [-2.4, 0, 2.4]) F.bench(p, { x, z: D / 2 - 1.5, rot: Math.PI }, 2.2, '#5D6F7C');
      F.board(p, { x: W / 2 - 0.05, z: 0, rot: -Math.PI / 2 }, '#F4EFE6', 2.4);
      F.plant(p, { x: -W / 2 + 0.8, z: -D / 2 + 0.8 });
      F.plant(p, { x: W / 2 - 0.8, z: -D / 2 + 0.8 });
    },
  };
}

function eatery(food: boolean): RoomLayout {
  const W = 12;
  const D = 10;
  const tables: V2[] = [[-3.5, 1], [0, 1], [3.5, 1], [-3.5, 3.4], [3.5, 3.4]];
  const fixtures: Fixture[] = [
    { key: 'counter', target: { type: 'counter' }, use: [0, -D / 2 + 2.6], solid: solidOf(0, -D / 2 + 1.5, 6.2, 0.9), height: 1.2, people: [[0, -D / 2 + 0.7, 0], [2, -D / 2 + 0.7, 0]] },
    { key: 'shelf', target: { type: 'shelf' }, use: [0, -D / 2 + 2.6], height: 0 },
    { key: 'bench', target: { type: 'bench' }, use: [-3.5, 2.1], height: 0.9, people: tables.map(([x, z]) => [x, z + 0.6, Math.PI] as [number, number, number]) },
    ...tables.map(([x, z], i): Fixture => ({ key: `table-${i}`, use: [x, z], solid: solidOf(x, z, 1.3, 1.9), height: 0 })),
  ];
  return {
    w: W,
    d: D,
    floor: food ? '#C08A52' : '#D5DCE0',
    wall: food ? '#F4E4C1' : '#EEF2F5',
    spawn: [0, D / 2 - 1],
    fixtures,
    build: (p) => {
      F.counter(p, { x: 0, z: -D / 2 + 1.5 }, 6, food ? '#7A4E2D' : '#2E3A44', food ? '#C9692C' : '#2F7FC1');
      if (food) {
        // Coolers and pots of food on the counter.
        for (let i = 0; i < 5; i++) F.rug(p, { x: -2.4 + i * 1.2, z: -D / 2 + 1.5 }, ['#D9482B', '#F2C230', '#2E8B57', '#E8742A', '#F4EFE6'][i]!, 0.6, 0.4);
      } else {
        F.bookshelf(p, { x: -3, z: -D / 2 + 0.3 }, 3);
        F.bookshelf(p, { x: 3, z: -D / 2 + 0.3 }, 3);
      }
      for (const [x, z] of tables) F.tableWithChairs(p, { x, z }, food ? '#F4EFE6' : '#B98A55', food ? '#D9482B' : '#2F5D8A');
      F.plant(p, { x: W / 2 - 0.8, z: D / 2 - 0.8 });
    },
  };
}

function clinic(): RoomLayout {
  const W = 12;
  const D = 10;
  const beds: V2[] = [[2.5, -1.5], [4.5, -1.5]];
  return {
    w: W,
    d: D,
    floor: '#D5DCE0',
    wall: '#F4F8FA',
    spawn: [0, D / 2 - 1],
    fixtures: [
      { key: 'desk', target: { type: 'desk' }, use: [-3, -D / 2 + 3.2], solid: solidOf(-3, -D / 2 + 2, 1.7, 1.6), height: 1.2, people: [[-3, -D / 2 + 1.25, 0]] },
      ...beds.map(([x, z], i): Fixture => ({ key: `bed-${i}`, target: { type: 'seat' }, use: [x - 1, z], solid: solidOf(x, z, 1.1, 2.1), height: 0.9, people: [[x, z, 0]] })),
      { key: 'bench', target: { type: 'bench' }, use: [-3, D / 2 - 2.4], solid: solidOf(-3, D / 2 - 1.4, 4.6, 0.5), height: 0.9, people: [[-4, D / 2 - 1.4, Math.PI], [-2, D / 2 - 1.4, Math.PI]] },
    ],
    build: (p) => {
      F.officeDesk(p, { x: -3, z: -D / 2 + 2 }, '#F4F4F0');
      for (const [x, z] of beds) F.hospitalBed(p, { x, z });
      F.bench(p, { x: -4, z: D / 2 - 1.4, rot: Math.PI }, 2.2, '#2F7FC1');
      F.bench(p, { x: -1.8, z: D / 2 - 1.4, rot: Math.PI }, 2.2, '#2F7FC1');
      F.poster(p, { x: -W / 2 + 0.05, z: 0, rot: Math.PI / 2 }, '#D7263D');
      F.plant(p, { x: W / 2 - 0.8, z: D / 2 - 0.8 });
    },
  };
}

function nightlife(venue: string | undefined): RoomLayout {
  const W = 14;
  const D = 12;
  if (venue === 'cinema') {
    const rows = [-1, 0.8, 2.6];
    const people: Array<[number, number, number]> = [];
    rows.forEach((z) => [-1.4, 0, 1.4].forEach((x) => people.push([x, z + 0.1, Math.PI])));
    return {
      w: W,
      d: D,
      floor: '#3A2D4F',
      wall: '#2B2340',
      spawn: [0, D / 2 - 1],
      fixtures: [
        { key: 'screen', target: { type: 'board' }, use: [0, -D / 2 + 2], height: 3 },
        { key: 'seats', target: { type: 'seat' }, use: [0, D / 2 - 2.2], height: 1, people },
        ...rows.map((z): Fixture => ({ key: `row-${z}`, use: [0, z], solid: solidOf(0, z - 0.1, 6.5, 0.8), height: 0 })),
      ],
      build: (p) => {
        F.screenWall(p, { x: 0, z: -D / 2 + 0.1 }, 9);
        for (const z of rows) F.seatRow(p, { x: 0, z, rot: Math.PI }, 9, '#B0182E');
      },
    };
  }
  const club = venue === 'club';
  const fixtures: Fixture[] = [
    { key: 'floor', target: { type: 'bench' }, use: [0, 0.5], height: 0.2, people: [[-1, 0, 0.5], [1.2, 0.8, 2.5], [0.3, -1, 4], [-1.5, 1.5, 1]] },
    { key: 'bar', target: { type: 'counter' }, use: [4, -D / 2 + 2.5], solid: solidOf(4, -D / 2 + 1.4, 4.2, 0.9), height: 1.2, people: [[3, -D / 2 + 0.6, 0], [5, -D / 2 + 0.6, 0]] },
    { key: 'sofas', target: { type: 'seat' }, use: [-4.5, 2.5], solid: solidOf(-5.6, 2.5, 1.0, 4), height: 0.8, people: [[-5.6, 1.5, Math.PI / 2], [-5.6, 3.4, Math.PI / 2]] },
  ];
  return {
    w: W,
    d: D,
    floor: club ? '#2C2545' : venue === 'event_centre' ? '#E8DCC8' : '#3A2D4F',
    wall: club ? '#3A2F5C' : venue === 'event_centre' ? '#F7EEE0' : '#2B2340',
    spawn: [0, D / 2 - 1],
    fixtures,
    build: (p) => {
      if (club || venue === 'lounge') F.danceFloor(p, { x: 0, z: 0.3 }, 5, 4.5);
      else F.rug(p, { x: 0, z: 0.3 }, '#C98A12', 6, 4.5);
      F.counter(p, { x: 4, z: -D / 2 + 1.4 }, 4, club ? '#3EE0FF' : '#7A4E2D', club ? '#14262E' : '#8E3B8A');
      F.sofa(p, { x: -5.6, z: 1.5, rot: Math.PI / 2 }, 1.8, club ? '#FF3EA5' : '#8E3B8A');
      F.sofa(p, { x: -5.6, z: 3.5, rot: Math.PI / 2 }, 1.8, club ? '#8E3BFF' : '#C98A12');
      if (venue === 'event_centre') for (const [x, z] of [[3, 2], [3, 4], [-1, 4]] as const) F.tableWithChairs(p, { x, z }, '#F4EFE6', '#C98A12');
      F.board(p, { x: -2.5, z: -D / 2 + 0.05 }, club ? '#FF3EA5' : '#F2C230', 3); // DJ / stage backdrop
    },
  };
}

function shop(): RoomLayout {
  const L = eatery(false);
  return { ...L, floor: '#D9D2C2' };
}

function workplace(): RoomLayout {
  const W = 12;
  const D = 9;
  const desks: V2[] = [[-3, -1], [0, -1], [3, -1], [-3, 2], [3, 2]];
  return {
    w: W,
    d: D,
    floor: '#B9C0C8',
    wall: '#EEF2F5',
    spawn: [0, D / 2 - 1],
    fixtures: [
      { key: 'desks', target: { type: 'seat' }, use: [0, 0.6], height: 1, people: desks.map(([x, z]) => [x, z - 0.8, 0] as [number, number, number]) },
      ...desks.map(([x, z], i): Fixture => ({ key: `desk-${i}`, use: [x, z], solid: solidOf(x, z, 1.7, 0.9), height: 0 })),
      { key: 'bench', target: { type: 'bench' }, use: [-4.5, D / 2 - 2], height: 0.9 },
    ],
    build: (p) => {
      for (const [x, z] of desks) F.officeDesk(p, { x, z }, '#E7ECEF');
      F.plant(p, { x: W / 2 - 0.8, z: D / 2 - 0.8 });
      F.board(p, { x: 0, z: -D / 2 + 0.05 }, '#F4F7F9', 3);
    },
  };
}

function outdoors(): RoomLayout {
  const W = 18;
  const D = 14;
  return {
    w: W,
    d: D,
    floor: '#5DBA66',
    wall: '#5DBA66',
    outdoor: true,
    spawn: [0, D / 2 - 1.5],
    fixtures: [
      { key: 'benches', target: { type: 'bench' }, use: [-4, 2.4], solid: solidOf(-4, 1.6, 2.6, 0.6), height: 0.9, people: [[-4.6, 1.6, Math.PI], [-3.4, 1.6, Math.PI], [4, 1.6, Math.PI]] },
      { key: 'notice', target: { type: 'board' }, use: [5, -3.5], height: 2.2 },
      { key: 'bench-2', use: [4, 2.4], solid: solidOf(4, 1.6, 2.6, 0.6), height: 0 },
    ],
    build: (p) => {
      F.rug(p, { x: 0, z: -2 }, '#C9A98A', 12, 1.2); // track
      F.bench(p, { x: -4, z: 1.6, rot: Math.PI }, 2.4, '#8B5E3C');
      F.bench(p, { x: 4, z: 1.6, rot: Math.PI }, 2.4, '#8B5E3C');
      F.board(p, { x: 5, z: -4.5 }, '#F4EFE6', 2);
      for (const [x, z] of [[-7, -5], [7, -5], [-7, 5], [7, 5], [0, -6]] as const) F.plant(p, { x, z });
    },
  };
}

export function roomLayout(type: PlaceType, opts: { venue?: string; offices?: string[] }): RoomLayout {
  switch (type) {
    case 'hostel_room':
      return dorm();
    case 'lecture_hall':
      return lectureHall(false);
    case 'lab':
      return lectureHall(true);
    case 'library':
      return library();
    case 'admin_office':
      return offices(opts.offices ?? []);
    case 'restaurant':
      return eatery(true);
    case 'shop':
      return shop();
    case 'clinic':
      return clinic();
    case 'nightlife':
      return nightlife(opts.venue);
    case 'workplace':
      return workplace();
    default:
      return outdoors();
  }
}

/** The fixture that answers a target (exact id first). */
export function fixtureFor(layout: RoomLayout, t: Target): Fixture | undefined {
  return (
    layout.fixtures.find((f) => f.target && f.target.type === t.type && f.target.id === t.id) ??
    layout.fixtures.find((f) => f.target && f.target.type === t.type)
  );
}

/** Where each person in the room stands or sits (and which way they face). */
export function placePeople(layout: RoomLayout, occupants: Occupant[]): Array<{ o: Occupant; at: [number, number, number] }> {
  const used = new Map<string, number>();
  const out: Array<{ o: Occupant; at: [number, number, number] }> = [];
  occupants.forEach((o, i) => {
    let f: Fixture | undefined;
    // Roommates at their own beds.
    if (o.spot.type === 'bed' && o.spot.id) f = layout.fixtures.find((x) => x.key === o.spot.id);
    f ??= fixtureFor(layout, o.spot.type === 'person' ? { type: 'bench' } : o.spot);
    f ??= layout.fixtures.find((x) => x.people?.length);
    const n = used.get(f?.key ?? '') ?? 0;
    used.set(f?.key ?? '', n + 1);
    const spot = f?.people?.[n % (f.people.length || 1)] ?? (f ? [f.use[0] + (n % 3) - 1, f.use[1] + 0.8, Math.PI] : [-3 + i, 2, 0]);
    out.push({ o, at: spot as [number, number, number] });
  });
  return out;
}
