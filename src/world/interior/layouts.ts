// Floor plans for every kind of room. A layout lists fixtures: what they look
// like (built from furniture.ts), the footprint you cannot walk through, the
// interaction target they stand for, the spot you walk up to, and where your
// character goes (and in what pose) while using it: lying in bed, sitting at
// the desk, under the shower. Rooms also list spots for other people, so a
// busy room looks busy. No rules here: which interactions exist comes from the
// interaction API.
import type { Occupant, TargetType } from '../../game/interactions';
import type { PlaceType } from '../../game/types';
import type { Pose } from '../characters/Character';
import { Parts } from '../three-utils';
import * as F from './furniture';

export type Target = { type: TargetType; id?: string };
export type V2 = [number, number];

/** Characters are drawn small so rooms feel roomy (about 1.3 m tall, big head). */
export const CHAR_SCALE = 0.45;
/** Hip height of the character, unscaled. */
const HIP = 0.68;
/** Where to put a character so it sits on a seat whose top is at `top`. */
export const sitY = (top: number) => top - HIP * CHAR_SCALE + 0.03;

/** Where a body goes, which way it faces, and what it is doing. */
export interface Spot {
  x: number;
  z: number;
  rot: number;
  pose?: Pose;
  y?: number;
  /** Lying in bed: the colour of the wrapper pulled over you. */
  blanket?: string;
  /** Gone through a door (toilets). */
  hide?: boolean;
}

export interface Fixture {
  key: string;
  target?: Target;
  /** Where you stand to use it. */
  use: V2;
  /** Footprint you cannot walk through: [x0, z0, x1, z1]. */
  solid?: [number, number, number, number];
  /** Height of the tap box above it. */
  height: number;
  /** Where your character goes while using it (else: stand at `use`). */
  act?: Spot;
  /** Where people of this kind stand or sit. */
  people?: Spot[];
  /** Always marked (it shows information, like the timetable). */
  info?: 'timetable';
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
  /** Spots for nameless students when the room is busy. */
  crowd?: Spot[];
  /** Where the doorway is in the front wall (default: where you appear). */
  doorX?: number;
}

const solidOf = (x: number, z: number, w: number, d: number, pad = 0): [number, number, number, number] => [x - w / 2 - pad, z - d / 2 - pad, x + w / 2 + pad, z + d / 2 + pad];

/** Offset (lx, lz) in a piece's own frame turned by rot, like furniture.ts does it. */
const turn = (x: number, z: number, rot: number, lx: number, lz: number): V2 => [x + lx * Math.cos(rot) + lz * Math.sin(rot), z - lx * Math.sin(rot) + lz * Math.cos(rot)];

/** Lying in a bed placed at (x, z, rot): head on the pillow. */
function inBed(x: number, z: number, rot: number, blanket: string, top = 0.57): Spot {
  // Head (about 2.05 units up the unscaled body) on the pillow, 0.72 m from the bed's middle.
  const [bx, bz] = turn(x, z, rot, 0, 2.05 * CHAR_SCALE - 0.72);
  return { x: bx, z: bz, rot, pose: 'lie', y: top + 0.36 * CHAR_SCALE, blanket };
}

/** Seated on the chair of F.desk placed at (x, z, rot), facing the desk. */
function atDesk(x: number, z: number, rot: number, pose: Pose = 'write'): Spot {
  const [cx, cz] = turn(x, z, rot, 0, 0.6);
  return { x: cx, z: cz, rot: rot + Math.PI, pose, y: sitY(0.51) };
}

/** The two chairs of F.tableWithChairs at (x, z, rot). */
function atTable(x: number, z: number, rot: number, pose: Pose): Spot[] {
  return [-0.65, 0.65].map((lz) => {
    const [cx, cz] = turn(x, z, rot, 0, lz);
    return { x: cx, z: cz, rot: rot + (lz < 0 ? 0 : Math.PI), pose, y: sitY(0.45) };
  });
}

/** Seats of F.seatRow at (x, z) facing the front (rot = PI). */
function rowSeats(x: number, z: number, n: number, pose: Pose): Spot[] {
  const w = n * 0.7;
  return Array.from({ length: n }, (_, i) => ({ x: x - (-w / 2 + 0.35 + i * 0.7), z: z - 0.1, rot: Math.PI, pose, y: sitY(0.48) }));
}

/** People sitting along F.bench at (x, z). */
function onBench(x: number, z: number, w: number, rot: number, n: number, pose: Pose = 'sit'): Spot[] {
  return Array.from({ length: n }, (_, i) => ({ x: x - w / 2 + (i + 0.5) * (w / n), z, rot, pose, y: sitY(0.5) }));
}

/** A public toilet door on the right wall. */
function wcDoor(W: number, z: number): { fixture: Fixture; build: (p: Parts) => void } {
  return {
    fixture: { key: 'wc', target: { type: 'toilet' }, use: [W / 2 - 1.0, z], height: 2.1, act: { x: W / 2 - 0.25, z, rot: Math.PI / 2, hide: true } },
    build: (p) => F.door(p, { x: W / 2 - 0.04, z, rot: -Math.PI / 2 }, '#5D7FA3', '#F4EFE6'),
  };
}

// ---------------------------------------------------------------- the dorm

const SHEETS = ['#5B8DEF', '#E8742A', '#2E8B57', '#B23A79'];
const WRAPPERS = ['#2F5D8A', '#C9692C', '#1F6F45', '#8A2C5E'];
const WOODS = ['#8B5E3C', '#A0703F', '#6E4B2F', '#9C6A2E'];
const CHAIRS = ['#D9482B', '#2F7FC1', '#F2C230', '#2E8B57'];
const CASES = ['#1F4E9C', '#C0202E', '#2E3A44', '#8E3B8A'];

/**
 * A shared room for four: each corner has a bed, a wardrobe and a desk, and
 * the back-right corner is a small bathroom (bucket bath and a WC) behind low
 * walls. Corner 0, back left, is yours.
 */
function dorm(): RoomLayout {
  const W = 13;
  const D = 10;
  const PI = Math.PI;
  const fixtures: Fixture[] = [];
  const builds: Array<(p: Parts) => void> = [];

  // Each corner: bed, wardrobe, desk as [x, z, rot].
  const corners = [
    { bed: [-5.85, -3.7, 0], ward: [-4.55, -4.65, 0], desk: [-3.1, -4.6, 0] },
    { bed: [2.6, -3.7, 0], ward: [1.3, -4.65, 0], desk: [-0.15, -4.6, 0] },
    { bed: [-5.85, 3.3, PI], ward: [-6.15, 0.9, PI / 2], desk: [-3.9, 4.45, PI] },
    { bed: [5.85, 3.3, PI], ward: [6.15, 0.3, -PI / 2], desk: [3.9, 4.45, PI] },
  ] as const;
  corners.forEach((c, i) => {
    const [bx, bz, br] = c.bed;
    const [wx, wz, wr] = c.ward;
    const [dx, dz, dr] = c.desk;
    const own = i === 0;
    builds.push((p) => {
      F.bed(p, { x: bx, z: bz, rot: br }, SHEETS[i]!, WOODS[i]);
      F.wardrobe(p, { x: wx, z: wz, rot: wr }, WOODS[(i + 1) % 4]!, CASES[i]);
      F.desk(p, { x: dx, z: dz, rot: dr }, WOODS[(i + 2) % 4]!, CHAIRS[i]!, ['#D9482B', '#2F5D8A', '#F2C230', '#2E8B57'].slice(0, 2 + i));
      const [sx, sz] = turn(bx, bz, br, bx < 0 ? 0.75 : -0.75, 0.7);
      F.slippers(p, { x: sx, z: sz, rot: br }, CHAIRS[(i + 1) % 4]!);
      const [ex, ez] = turn(dx, dz, dr, -0.55, -0.2);
      F.extension(p, { x: ex, z: ez, rot: dr });
    });
    const [ux, uz] = turn(bx, bz, br, bx < 0 ? 1.0 : -1.0, 0.2);
    fixtures.push({
      key: `bed-${i + 1}`,
      target: own ? { type: 'bed', id: 'bed-1' } : undefined,
      use: [ux, uz],
      solid: solidOf(bx, bz, 1.15, 2.25),
      height: 0.8,
      act: own ? inBed(bx, bz, br, WRAPPERS[i]!) : undefined,
      people: [inBed(bx, bz, br, WRAPPERS[i]!)],
    });
    const [wux, wuz] = turn(wx, wz, wr, 0, 0.95);
    const [wax, waz] = turn(wx, wz, wr, 0, 0.65);
    const wardSolid = Math.abs(Math.sin(wr)) > 0.5 ? solidOf(wx, wz, 0.65, 1.05) : solidOf(wx, wz, 1.05, 0.65);
    fixtures.push({ key: `wardrobe-${i + 1}`, target: own ? { type: 'locker' } : undefined, use: [wux, wuz], solid: wardSolid, height: 2.1, act: own ? { x: wax, z: waz, rot: wr + PI, pose: 'stand' } : undefined });
    const [dux, duz] = turn(dx, dz, dr, 0, 1.35);
    const seat = atDesk(dx, dz, dr);
    const [cx, cz] = turn(dx, dz, dr, 0, 0.3);
    fixtures.push({
      key: `desk-${i + 1}`,
      target: own ? { type: 'desk' } : undefined,
      use: [dux, duz],
      solid: solidOf(cx, cz, 1.3, 1.25),
      height: 0.9,
      act: own ? seat : undefined,
      people: [{ ...seat, pose: 'read' }],
    });
  });

  // The bathroom: low walls, tiles, bucket-bath corner, WC and a sink.
  const bx0 = 3.4;
  const bzFront = -1.2;
  fixtures.push({ key: 'bath-wall', use: [bx0, -4], solid: solidOf(bx0, -4.0, 0.15, 2.0), height: 0 });
  fixtures.push({ key: 'bath-front', use: [4.95, bzFront], solid: solidOf(4.95, bzFront, 3.1, 0.15), height: 0 });
  fixtures.push({ key: 'shower', target: { type: 'shower' }, use: [4.3, -3.0], solid: solidOf(4.75, -4.75, 0.5, 0.45), height: 1.9, act: { x: 4.15, z: -4.25, rot: PI, pose: 'bathe' } });
  fixtures.push({ key: 'toilet', target: { type: 'toilet' }, use: [5.9, -3.0], solid: solidOf(6.0, -4.55, 0.5, 0.75), height: 0.9, act: { x: 6.0, z: -4.3, rot: 0, pose: 'sit', y: sitY(0.43) } });
  fixtures.push({ key: 'sink', use: [5.8, -2.2], solid: solidOf(6.25, -2.2, 0.45, 0.6), height: 0 });

  // Cooking corner against the bathroom wall, provisions in a cooler beside it.
  fixtures.push({
    key: 'stove',
    target: { type: 'stove' },
    use: [4.75, 0.55],
    solid: solidOf(5.05, -0.75, 1.5, 0.9),
    height: 1.1,
    act: { x: 4.75, z: -0.05, rot: PI, pose: 'cook' },
    people: [{ x: 5.45, z: -0.05, rot: PI, pose: 'cook' }],
  });
  fixtures.push({ key: 'cooler', use: [3.85, -0.2], solid: solidOf(3.85, -0.75, 0.65, 0.5), height: 0 });

  // Shelf under the timetable on the back wall.
  fixtures.push({ key: 'shelf', use: [-1.6, -3.8], solid: solidOf(-1.6, -4.7, 1.45, 0.45), height: 0 });
  fixtures.push({ key: 'timetable', target: { type: 'board' }, use: [-1.6, -3.7], height: 2.1, info: 'timetable', act: { x: -1.6, z: -4.1, rot: PI, pose: 'stand' } });
  fixtures.push({ key: 'door', target: { type: 'door' }, use: [0.6, 4.2], height: 1.4, act: { x: 0.6, z: 4.6, rot: 0, pose: 'stand' } });

  // Other freshers on the transit bunks, before you have roommates of your own.
  const others = fixtures.filter((f) => /^(bed|desk)-[234]$/.test(f.key)).map((f) => f.people![0]!);
  return {
    w: W,
    d: D,
    crowd: [others[0]!, others[3]!, others[4]!, { x: 5.45, z: -0.05, rot: PI, pose: 'cook' }, others[1]!, others[2]!, others[5]!],
    floor: '#C79A68',
    wall: '#EADFC8',
    // You start by your own bed and wardrobe; the doorway is in the front wall.
    spawn: [-4.4, -2.4],
    doorX: 0.6,
    fixtures,
    build: (p) => {
      for (const b of builds) b(p);
      // Bathroom.
      F.tiles(p, { x: (bx0 + W / 2) / 2, z: (-D / 2 + bzFront) / 2 }, W / 2 - bx0, bzFront + D / 2);
      F.partition(p, { x: bx0, z: -4.0, rot: PI / 2 }, 2.0, '#D7E4EA');
      F.partition(p, { x: 4.95, z: bzFront }, 3.1, '#D7E4EA');
      F.showerCorner(p, { x: 4.3, z: -D / 2 + 0.05 });
      F.toilet(p, { x: 6.0, z: -4.55 });
      F.sink(p, { x: 6.3, z: -2.2, rot: -PI / 2 });
      // Kitchen bits.
      F.cookingCorner(p, { x: 4.75, z: -0.75 });
      F.cooler(p, { x: 3.85, z: -0.75 }, '#2F7FC1');
      // Back wall: shelf, timetable, clock, posters; windows on the side walls.
      F.shelf(p, { x: -1.6, z: -4.7 }, '#7A4E2D');
      F.timetableBoard(p, { x: -1.6, z: -D / 2 + 0.03 });
      F.wallClock(p, { x: -1.6, z: -D / 2 + 0.05 });
      F.poster(p, { x: -5.85, z: -D / 2 + 0.03 }, '#3E7CC9', 1.7);
      F.poster(p, { x: 2.6, z: -D / 2 + 0.03 }, '#E0407A', 1.7);
      F.windowOn(p, { x: -W / 2 + 0.03, z: -1.1, rot: PI / 2 }, '#E0407A');
      F.windowOn(p, { x: W / 2 - 0.03, z: 1.9, rot: -PI / 2 }, '#2E8B57');
      // Middle of the room: rug and the door mat.
      F.rug(p, { x: -1.2, z: 0.9 }, '#8E3B8A', 3.6, 2.6);
      F.rug(p, { x: 0.6, z: 4.5 }, '#6E4B2F', 1.3, 0.6);
    },
  };
}

// ---------------------------------------------------------------- other rooms

function lectureHall(lab: boolean): RoomLayout {
  const W = 14;
  const D = 12;
  const rows = [-1.2, 0.6, 2.4];
  const blocks = [-3.2, 3.2];
  const seats: Spot[] = [];
  for (const z of rows) for (const x of blocks) seats.push(...(lab ? [-0.7, 0, 0.7].map((dx): Spot => ({ x: x + dx, z: z + 0.45, rot: Math.PI, pose: 'type' })) : rowSeats(x, z, 3, 'write')));
  const mine = seats[7]!; // middle row, left block, middle seat
  const others = seats.filter((s) => s !== mine);
  const wc = wcDoor(W, 3.6);
  const fixtures: Fixture[] = [
    { key: 'board', target: { type: 'board' }, use: [0, -D / 2 + 1.6], height: 2.6 },
    { key: 'lectern', target: { type: 'lecturer' }, use: [-3.5, -D / 2 + 3], solid: solidOf(-3.5, -D / 2 + 2.2, 0.9, 0.65), height: 1.2, people: [{ x: -3.5, z: -D / 2 + 1.5, rot: 0, pose: 'lecture' }] },
    { key: 'seats', target: { type: 'seat' }, use: [mine.x, mine.z + 0.9], height: 1, act: mine, people: others },
    { key: 'exam-desk', target: { type: 'desk' }, use: [3.6, -D / 2 + 3], solid: solidOf(3.6, -D / 2 + 2.2, 1.7, 0.8), height: 1, act: { x: 3.6, z: -D / 2 + 2.85, rot: Math.PI, pose: 'chat' }, people: [{ x: 3.6, z: -D / 2 + 1.5, rot: 0, pose: 'chat' }] },
    { key: 'bench', target: { type: 'bench' }, use: [-5.5, D / 2 - 2], solid: solidOf(-5.5, D / 2 - 1.2, 2.5, 0.5), height: 0.9, act: { x: -5.5, z: D / 2 - 1.15, rot: Math.PI, pose: 'sit', y: sitY(0.5) }, people: onBench(-5.5, D / 2 - 1.15, 2.4, Math.PI, 3) },
    wc.fixture,
  ];
  for (const z of rows) for (const x of blocks) fixtures.push({ key: `row-${x}-${z}`, use: [x, z], solid: lab ? solidOf(x, z - 0.15, 2.2, 0.8) : solidOf(x, z - 0.2, 2.2, 0.45), height: 0 });
  if (lab) fixtures.push({ key: 'shelf', target: { type: 'shelf' }, use: [W / 2 - 1.4, -1], solid: solidOf(W / 2 - 0.4, -1, 0.5, 3), height: 2.2, act: { x: W / 2 - 0.95, z: -1, rot: Math.PI / 2, pose: 'stand' } });
  return {
    w: W,
    d: D,
    floor: lab ? '#D5DCE0' : '#B9935F',
    wall: lab ? '#EEF2F5' : '#F2E6CC',
    spawn: [0, D / 2 - 1],
    fixtures,
    crowd: [...others, { x: 5.6, z: D / 2 - 1.6, rot: Math.PI, pose: 'chat' }, { x: 6.0, z: D / 2 - 2.2, rot: -2.4, pose: 'chat' }],
    build: (p) => {
      F.board(p, { x: 0, z: -D / 2 + 0.05 }, lab ? '#F4F7F9' : '#24433A', 5);
      F.lectern(p, { x: -3.5, z: -D / 2 + 2.2 });
      F.officeDesk(p, { x: 3.6, z: -D / 2 + 2.2, rot: Math.PI }, '#8B5E3C');
      for (const z of rows) {
        for (const x of blocks) {
          if (lab) F.labBench(p, { x, z: z - 0.15, rot: Math.PI }, 2.2);
          else F.seatRow(p, { x, z, rot: Math.PI }, 3, ['#2F5D8A', '#7A4E2D', '#2E8B57'][Math.abs(Math.round(z)) % 3]!);
        }
      }
      F.bench(p, { x: -5.5, z: D / 2 - 1.2, rot: Math.PI }, 2.4, '#5D6F7C');
      if (lab) F.bookshelf(p, { x: W / 2 - 0.4, z: -1, rot: -Math.PI / 2 }, 3);
      F.wallClock(p, { x: 4, z: -D / 2 + 0.05 });
      F.plant(p, { x: W / 2 - 1, z: D / 2 - 1 });
      wc.build(p);
    },
  };
}

function library(): RoomLayout {
  const W = 14;
  const D = 11;
  const fixtures: Fixture[] = [];
  const shelvesX = [-4.5, -1.5, 1.5, 4.5];
  for (const x of shelvesX) fixtures.push({ key: `shelf-${x}`, target: { type: 'shelf' }, use: [x, -D / 2 + 1.5], solid: solidOf(x, -D / 2 + 0.4, 2.6, 0.5), height: 2.2, act: { x, z: -D / 2 + 1.05, rot: Math.PI, pose: 'stand' }, people: [{ x: x + 0.7, z: -D / 2 + 1.1, rot: Math.PI, pose: 'stand' }] });
  const tables: V2[] = [[-3, 0.5], [3, 0.5], [-3, 2.8], [3, 2.8]];
  const tableSeats = tables.flatMap(([x, z]) => atTable(x, z, Math.PI / 2, 'read'));
  tables.forEach(([x, z], i) =>
    fixtures.push({ key: `table-${i}`, target: { type: 'desk' }, use: [x + 1.3, z + 0.6], solid: solidOf(x, z, 1.9, 0.95), height: 0.9, act: atTable(x, z, Math.PI / 2, 'write')[1], people: [atTable(x, z, Math.PI / 2, 'read')[0]!] }),
  );
  const wc = wcDoor(W, 1.6);
  fixtures.push(wc.fixture);
  fixtures.push({ key: 'counter', target: { type: 'counter' }, use: [5.2, D / 2 - 2.6], solid: solidOf(5.2, D / 2 - 1.5, 2.4, 0.8), height: 1.2, act: { x: 5.2, z: D / 2 - 2.3, rot: Math.PI, pose: 'chat' }, people: [{ x: 5.2, z: D / 2 - 0.8, rot: Math.PI, pose: 'type' }] });
  fixtures.push({ key: 'bench', target: { type: 'bench' }, use: [-5.5, D / 2 - 2], solid: solidOf(-5.5, D / 2 - 1.2, 2.5, 0.5), height: 0.9, act: { x: -5.5, z: D / 2 - 1.15, rot: Math.PI, pose: 'sit', y: sitY(0.5) }, people: onBench(-5.5, D / 2 - 1.15, 2.4, Math.PI, 3, 'read') });
  return {
    w: W,
    d: D,
    floor: '#8A6A47',
    wall: '#E9E2D2',
    spawn: [0, D / 2 - 1],
    fixtures,
    crowd: tableSeats,
    build: (p) => {
      for (const x of shelvesX) F.bookshelf(p, { x, z: -D / 2 + 0.4 }, 2.5);
      for (const [x, z] of tables) F.tableWithChairs(p, { x, z, rot: Math.PI / 2 }, '#B98A55', '#2F5D8A');
      F.counter(p, { x: 5.2, z: D / 2 - 1.5, rot: Math.PI }, 2.4, '#7A4E2D', '#A0703F');
      F.bench(p, { x: -5.5, z: D / 2 - 1.2, rot: Math.PI }, 2.4, '#5D6F7C');
      F.plant(p, { x: -W / 2 + 0.8, z: 0 });
      F.wallClock(p, { x: 0, z: -D / 2 + 0.05 });
      wc.build(p);
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
    fixtures.push({ key: `desk-${id}`, target: { type: 'desk', id: id || undefined }, use: [x, -D / 2 + 3], solid: solidOf(x, -D / 2 + 1.8, 1.7, 1.6), height: 1.3, act: { x, z: -D / 2 + 2.85, rot: Math.PI, pose: 'chat' }, people: [{ x, z: -D / 2 + 1.05, rot: 0, pose: 'type' }] });
  });
  const queue = onBench(0, D / 2 - 1.45, 7, Math.PI, 7);
  const wc = wcDoor(W, 1.2);
  fixtures.push({ key: 'bench', target: { type: 'bench' }, use: [0, D / 2 - 2.6], solid: solidOf(0, D / 2 - 1.5, 7, 0.5), height: 0.9, act: queue[3], people: queue });
  fixtures.push({ key: 'board', target: { type: 'board' }, use: [-W / 2 + 1.5, 0], height: 2.4, act: { x: -W / 2 + 1.0, z: 0, rot: -Math.PI / 2, pose: 'stand' } });
  fixtures.push(wc.fixture);
  return {
    w: W,
    d: D,
    floor: '#C9C2B4',
    wall: '#EFE8DA',
    spawn: [-W / 2 + 1.5, D / 2 - 1],
    fixtures,
    crowd: [...queue, { x: -4, z: 0.5, rot: Math.PI, pose: 'stand' }, { x: -3.3, z: 1.2, rot: Math.PI, pose: 'stand' }, { x: 3.5, z: 0.4, rot: Math.PI, pose: 'chat' }],
    build: (p) => {
      ids.forEach((_, i) => F.officeDesk(p, { x: xs[i]!, z: -D / 2 + 1.8 }, ['#8E6A44', '#7A4E2D', '#9C6A2E'][i % 3]!));
      for (const x of [-2.4, 0, 2.4]) F.bench(p, { x, z: D / 2 - 1.5, rot: Math.PI }, 2.2, '#5D6F7C');
      F.board(p, { x: -W / 2 + 0.05, z: 0, rot: Math.PI / 2 }, '#F4EFE6', 2.4);
      F.wallClock(p, { x: 0, z: -D / 2 + 0.05 });
      F.plant(p, { x: -W / 2 + 0.8, z: -D / 2 + 0.8 });
      F.plant(p, { x: W / 2 - 0.8, z: -D / 2 + 0.8 });
      wc.build(p);
    },
  };
}

function eatery(food: boolean): RoomLayout {
  const W = 12;
  const D = 10;
  const tables: V2[] = [[-3.5, 1], [0, 1], [3.5, 1], [-3.5, 3.4], [0.3, 3.4]];
  const seats = tables.flatMap(([x, z]) => atTable(x, z, Math.PI / 2, food ? 'eat' : 'chat'));
  const mine = seats[2]!;
  const wc = wcDoor(W, 3.4);
  const fixtures: Fixture[] = [
    { key: 'counter', target: { type: 'counter' }, use: [0, -D / 2 + 2.6], solid: solidOf(0, -D / 2 + 1.5, 6.2, 0.9), height: 1.2, act: food ? mine : { x: 0, z: -D / 2 + 2.3, rot: Math.PI, pose: 'chat' }, people: [{ x: 0, z: -D / 2 + 0.75, rot: 0, pose: food ? 'cook' : 'chat' }, { x: 2, z: -D / 2 + 0.75, rot: 0, pose: 'cook' }] },
    { key: 'shelf', target: { type: 'shelf' }, use: [0, -D / 2 + 2.6], height: 0 },
    { key: 'bench', target: { type: 'bench' }, use: [-3.5, 2.2], height: 0.9, act: seats[0], people: seats.filter((s) => s !== mine) },
    ...tables.map(([x, z], i): Fixture => ({ key: `table-${i}`, use: [x, z], solid: solidOf(x, z, 1.9, 0.95), height: 0 })),
    wc.fixture,
  ];
  return {
    w: W,
    d: D,
    floor: food ? '#C08A52' : '#D5DCE0',
    wall: food ? '#F4E4C1' : '#EEF2F5',
    spawn: [0, D / 2 - 1],
    fixtures,
    crowd: food ? seats.filter((s) => s !== mine) : [{ x: -2, z: -1.6, rot: Math.PI, pose: 'chat' }, { x: 2.4, z: -1.5, rot: Math.PI, pose: 'stand' }, { x: -4.5, z: 0, rot: 1, pose: 'chat' }],
    build: (p) => {
      F.counter(p, { x: 0, z: -D / 2 + 1.5 }, 6, food ? '#7A4E2D' : '#2E3A44', food ? '#C9692C' : '#2F7FC1');
      if (food) {
        // Coolers of food on the counter.
        for (let i = 0; i < 5; i++) F.cooler(p, { x: -2.4 + i * 1.2, z: -D / 2 + 1.5 }, ['#D9482B', '#F2C230', '#2E8B57', '#E8742A', '#2F7FC1'][i]!);
      } else {
        F.bookshelf(p, { x: -3, z: -D / 2 + 0.3 }, 3);
        F.bookshelf(p, { x: 3, z: -D / 2 + 0.3 }, 3);
      }
      for (const [x, z] of tables) F.tableWithChairs(p, { x, z, rot: Math.PI / 2 }, food ? '#F4EFE6' : '#B98A55', food ? '#D9482B' : '#2F5D8A');
      F.plant(p, { x: -W / 2 + 0.8, z: D / 2 - 0.8 });
      wc.build(p);
    },
  };
}

function clinic(): RoomLayout {
  const W = 12;
  const D = 10;
  const beds: V2[] = [[2.5, -1.5], [4.5, -1.5]];
  const waiting = onBench(-3, D / 2 - 1.35, 4.4, Math.PI, 4);
  const wc = wcDoor(W, 3.2);
  return {
    w: W,
    d: D,
    floor: '#D5DCE0',
    wall: '#F4F8FA',
    spawn: [0, D / 2 - 1],
    crowd: [...waiting, inBed(4.5, -1.5, 0, '#9FC3DA', 0.75)],
    fixtures: [
      { key: 'desk', target: { type: 'desk' }, use: [-3, -D / 2 + 3.2], solid: solidOf(-3, -D / 2 + 2, 1.7, 1.6), height: 1.2, act: { x: -3, z: -D / 2 + 3.0, rot: Math.PI, pose: 'chat' }, people: [{ x: -3, z: -D / 2 + 1.25, rot: 0, pose: 'type' }] },
      ...beds.map(([x, z], i): Fixture => ({ key: `bed-${i}`, target: { type: 'seat' }, use: [x - 1, z + 0.4], solid: solidOf(x, z, 1.1, 2.1), height: 0.9, act: inBed(x, z, 0, '#9FC3DA', 0.75), people: [inBed(x, z, 0, '#9FC3DA', 0.75)] })),
      { key: 'bench', target: { type: 'bench' }, use: [-3, D / 2 - 2.4], solid: solidOf(-3, D / 2 - 1.4, 4.6, 0.5), height: 0.9, act: waiting[1], people: waiting },
      wc.fixture,
    ],
    build: (p) => {
      F.officeDesk(p, { x: -3, z: -D / 2 + 2 }, '#F4F4F0');
      for (const [x, z] of beds) F.hospitalBed(p, { x, z });
      F.bench(p, { x: -4.1, z: D / 2 - 1.4, rot: Math.PI }, 2.2, '#2F7FC1');
      F.bench(p, { x: -1.9, z: D / 2 - 1.4, rot: Math.PI }, 2.2, '#2F7FC1');
      F.poster(p, { x: -W / 2 + 0.05, z: 0, rot: Math.PI / 2 }, '#D7263D');
      F.plant(p, { x: W / 2 - 0.8, z: D / 2 - 0.8 });
      wc.build(p);
    },
  };
}

function nightlife(venue: string | undefined): RoomLayout {
  const W = 14;
  const D = 12;
  if (venue === 'cinema') {
    const rows = [-1, 0.8, 2.6];
    const seats = rows.flatMap((z) => rowSeats(0, z, 9, 'sit'));
    const mine = seats[13]!;
    const wc = wcDoor(W, 4);
    return {
      w: W,
      d: D,
      floor: '#3A2D4F',
      wall: '#2B2340',
      spawn: [0, D / 2 - 1],
      crowd: seats.filter((s) => s !== mine),
      fixtures: [
        { key: 'screen', target: { type: 'board' }, use: [0, -D / 2 + 2], height: 3 },
        { key: 'seats', target: { type: 'seat' }, use: [mine.x, D / 2 - 2.2], height: 1, act: mine, people: seats.filter((s) => s !== mine) },
        ...rows.map((z): Fixture => ({ key: `row-${z}`, use: [0, z], solid: solidOf(0, z - 0.2, 6.5, 0.45), height: 0 })),
        wc.fixture,
      ],
      build: (p) => {
        F.screenWall(p, { x: 0, z: -D / 2 + 0.1 }, 9);
        for (const z of rows) F.seatRow(p, { x: 0, z, rot: Math.PI }, 9, '#B0182E');
        wc.build(p);
      },
    };
  }
  const club = venue === 'club';
  const party = venue === 'event_centre';
  const dancers: Spot[] = [];
  for (let i = 0; i < 14; i++) {
    const a = i * 2.39;
    const r = 0.6 + (i % 4) * 0.55;
    dancers.push({ x: Math.cos(a) * r * 1.1, z: 0.3 + Math.sin(a) * r * 0.9, rot: a + Math.PI, pose: party && i % 3 === 0 ? 'cheer' : 'dance' });
  }
  const sofaSeats: Spot[] = [1.5, 3.5].flatMap((z) => [-0.5, 0.5].map((dz): Spot => ({ x: -5.55, z: z + dz * 0.8, rot: Math.PI / 2, pose: 'sit', y: sitY(0.42) })));
  const tables: V2[] = [[3, 2], [3, 4], [-1.2, 4.2]];
  const guests = party ? tables.flatMap(([x, z]) => atTable(x, z, 0, 'eat')) : [];
  const wc = wcDoor(W, 0.5);
  const fixtures: Fixture[] = [
    { key: 'floor', target: { type: 'bench' }, use: [0, 0.5], height: 0.2, act: { x: 0.2, z: 0.5, rot: 0, pose: 'dance' }, people: dancers.slice(0, 4) },
    { key: 'bar', target: { type: 'counter' }, use: [4, -D / 2 + 2.5], solid: solidOf(4, -D / 2 + 1.4, 4.2, 0.9), height: 1.2, act: party ? guests[0] : { x: 4, z: -D / 2 + 2.3, rot: Math.PI, pose: 'chat' }, people: [{ x: 3, z: -D / 2 + 0.6, rot: 0, pose: 'cook' }, { x: 5, z: -D / 2 + 0.6, rot: 0, pose: 'chat' }] },
    { key: 'sofas', target: { type: 'seat' }, use: [-4.4, 2.5], solid: solidOf(-5.6, 2.5, 1.0, 4), height: 0.8, act: sofaSeats[1], people: sofaSeats.filter((_, i) => i !== 1) },
    ...tables.filter(() => party).map(([x, z], i): Fixture => ({ key: `table-${i}`, use: [x, z], solid: solidOf(x, z, 1.3, 1.9), height: 0 })),
    wc.fixture,
  ];
  return {
    w: W,
    d: D,
    floor: club ? '#2C2545' : party ? '#E8DCC8' : '#3A2D4F',
    wall: club ? '#3A2F5C' : party ? '#F7EEE0' : '#2B2340',
    spawn: [0, D / 2 - 1],
    crowd: [...dancers.slice(4), ...sofaSeats.filter((_, i) => i !== 1), ...guests.slice(1)],
    fixtures,
    build: (p) => {
      if (club || venue === 'lounge') F.danceFloor(p, { x: 0, z: 0.3 }, 5, 4.5);
      else F.rug(p, { x: 0, z: 0.3 }, '#C98A12', 6, 4.5);
      F.counter(p, { x: 4, z: -D / 2 + 1.4 }, 4, club ? '#3EE0FF' : '#7A4E2D', club ? '#14262E' : '#8E3B8A');
      F.sofa(p, { x: -5.6, z: 1.5, rot: Math.PI / 2 }, 1.8, club ? '#FF3EA5' : '#8E3B8A');
      F.sofa(p, { x: -5.6, z: 3.5, rot: Math.PI / 2 }, 1.8, club ? '#8E3BFF' : '#C98A12');
      if (party) for (const [x, z] of tables) F.tableWithChairs(p, { x, z }, '#F4EFE6', '#C98A12');
      F.board(p, { x: -2.5, z: -D / 2 + 0.05 }, club ? '#FF3EA5' : '#F2C230', 3); // DJ / stage backdrop
      wc.build(p);
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
  const workers = desks.map(([x, z]): Spot => ({ x, z: z - 0.75, rot: 0, pose: 'type' }));
  const wc = wcDoor(W, 2.8);
  return {
    w: W,
    d: D,
    floor: '#B9C0C8',
    wall: '#EEF2F5',
    spawn: [0, D / 2 - 1],
    crowd: workers.filter((_, i) => i !== 1),
    fixtures: [
      { key: 'desks', target: { type: 'seat' }, use: [0, 0.6], height: 1, act: workers[1], people: workers.filter((_, i) => i !== 1) },
      ...desks.map(([x, z], i): Fixture => ({ key: `desk-${i}`, use: [x, z], solid: solidOf(x, z, 1.7, 0.9), height: 0 })),
      { key: 'bench', target: { type: 'bench' }, use: [-4.5, D / 2 - 2], height: 0.9 },
      wc.fixture,
    ],
    build: (p) => {
      for (const [x, z] of desks) F.officeDesk(p, { x, z }, '#E7ECEF');
      F.plant(p, { x: W / 2 - 0.8, z: D / 2 - 0.8 });
      F.board(p, { x: 0, z: -D / 2 + 0.05 }, '#F4F7F9', 3);
      wc.build(p);
    },
  };
}

function outdoors(): RoomLayout {
  const W = 18;
  const D = 14;
  const benchA = onBench(-4, 1.65, 2.4, Math.PI, 3);
  const benchB = onBench(4, 1.65, 2.4, Math.PI, 3);
  const joggers: Spot[] = [-6, -2.5, 1.5, 5.5].map((x, i) => ({ x, z: -2 + (i % 2) * 0.3, rot: i % 2 ? -Math.PI / 2 : Math.PI / 2, pose: 'jog' }));
  const wc = wcDoor(W, -5);
  return {
    w: W,
    d: D,
    floor: '#5DBA66',
    wall: '#5DBA66',
    outdoor: true,
    spawn: [0, D / 2 - 1.5],
    crowd: [...joggers, ...benchA.slice(1), ...benchB, { x: 0, z: 4, rot: 0, pose: 'cheer' }, { x: 0.8, z: 4.4, rot: -0.6, pose: 'chat' }],
    fixtures: [
      { key: 'benches', target: { type: 'bench' }, use: [-4, 2.6], solid: solidOf(-4, 1.6, 2.6, 0.6), height: 0.9, act: benchA[0], people: [...benchA.slice(1), ...benchB] },
      { key: 'notice', target: { type: 'board' }, use: [5, -3.5], height: 2.2, act: { x: 5, z: -3.8, rot: Math.PI, pose: 'chat' } },
      { key: 'bench-2', use: [4, 2.4], solid: solidOf(4, 1.6, 2.6, 0.6), height: 0 },
      wc.fixture,
    ],
    build: (p) => {
      F.rug(p, { x: 0, z: -2 }, '#C9A98A', 14, 1.4); // track
      F.bench(p, { x: -4, z: 1.6, rot: Math.PI }, 2.4, '#8B5E3C');
      F.bench(p, { x: 4, z: 1.6, rot: Math.PI }, 2.4, '#8B5E3C');
      F.board(p, { x: 5, z: -4.5 }, '#F4EFE6', 2);
      for (const [x, z] of [[-7, -5.8], [-7, 5], [7, 5], [0, -6]] as const) F.plant(p, { x, z });
      wc.build(p);
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

/** What a body does if its spot does not say. */
function defaultPose(o: Occupant): Pose {
  if (o.spot.type === 'lecturer') return 'lecture';
  if (o.spot.type === 'desk' || o.spot.type === 'counter') return 'chat';
  return 'stand';
}

/** Where each person in the room stands or sits, and what they are doing. */
export function placePeople(layout: RoomLayout, occupants: Occupant[]): Array<{ o: Occupant; at: Spot }> {
  const used = new Map<string, number>();
  const out: Array<{ o: Occupant; at: Spot }> = [];
  occupants.forEach((o, i) => {
    let f: Fixture | undefined;
    // Roommates at their own bed or desk.
    if (o.spot.id) f = layout.fixtures.find((x) => x.key === o.spot.id);
    f ??= fixtureFor(layout, o.spot.type === 'person' ? { type: 'bench' } : o.spot);
    f ??= layout.fixtures.find((x) => x.people?.length);
    const n = used.get(f?.key ?? '') ?? 0;
    used.set(f?.key ?? '', n + 1);
    const spot: Spot = f?.people?.length
      ? f.people[n % f.people.length]!
      : f
        ? { x: f.use[0] + (n % 3) - 1, z: f.use[1] + 0.8, rot: Math.PI }
        : { x: -3 + i, z: 2, rot: 0 };
    out.push({ o, at: { pose: defaultPose(o), ...spot } });
  });
  return out;
}

/** Nameless students filling a busy room, avoiding spots already taken. */
export function crowdSpots(layout: RoomLayout, level: number, taken: Spot[]): Spot[] {
  const all = layout.crowd ?? [];
  const free = all.filter((s) => !taken.some((t) => Math.hypot(t.x - s.x, t.z - s.z) < 0.4));
  const n = Math.round(Math.max(0, Math.min(1, level)) * free.length);
  const step = free.length / Math.max(1, n);
  return Array.from({ length: n }, (_, i) => free[Math.floor(i * step)]!);
}
