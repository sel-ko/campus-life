// Furniture for the inside rooms, built like the characters: chunky rounded
// blocks in flat colours, merged with vertex colours so a whole room is only a
// couple of draw calls. Every function adds shapes to a Parts collection at a
// position (x, z on the floor) and a turn (rot, around the vertical axis).
import { box as boxGeo, cylinder, roundedBox, type Parts } from '../three-utils';

export interface At {
  x: number;
  z: number;
  /** Turn around the vertical axis, radians. 0 = facing +z (towards the camera). */
  rot?: number;
}

/** Adds a rounded block given in the piece's own coordinates. */
function blk(p: Parts, at: At, w: number, h: number, d: number, colour: string, lx: number, ly: number, lz: number, r = 0.05, flat = false) {
  const rot = at.rot ?? 0;
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const x = at.x + lx * c + lz * s;
  const z = at.z - lx * s + lz * c;
  const geo = r > 0 ? roundedBox(w, h, d, Math.min(r, w / 2.2, h / 2.2, d / 2.2), 2) : boxGeo(w, h, d);
  p.add(geo, colour, x, ly + h / 2, z, [0, rot, 0], flat);
}

function cyl(p: Parts, at: At, radius: number, h: number, colour: string, lx: number, ly: number, lz: number) {
  const rot = at.rot ?? 0;
  const x = at.x + lx * Math.cos(rot) + lz * Math.sin(rot);
  const z = at.z - lx * Math.sin(rot) + lz * Math.cos(rot);
  p.add(cylinder(radius, radius, h, 12), colour, x, ly + h / 2, z);
}

// ---------- the dorm ----------

/** Single bed on a wooden frame: mattress, sheet, pillow, folded wrapper. */
export function bed(p: Parts, at: At, sheet: string, frame = '#8B5E3C') {
  blk(p, at, 1.05, 0.35, 2.15, frame, 0, 0, 0, 0.04);
  for (const [lx, lz] of [[-0.45, -1.0], [0.45, -1.0], [-0.45, 1.0], [0.45, 1.0]] as const) blk(p, at, 0.1, 0.25, 0.1, shade(frame, 0.8), lx, 0, lz, 0.02);
  blk(p, at, 1.15, 0.9, 0.12, frame, 0, 0, -1.06, 0.04); // headboard
  blk(p, at, 0.98, 0.22, 2.0, '#F4F1EA', 0, 0.35, 0.02, 0.08); // mattress
  blk(p, at, 1.0, 0.08, 1.45, sheet, 0, 0.57, 0.3, 0.04); // sheet
  blk(p, at, 0.7, 0.16, 0.38, '#FFFFFF', 0, 0.57, -0.72, 0.08); // pillow
  blk(p, at, 0.5, 0.1, 0.35, shade(sheet, 0.75), 0.15, 0.65, 0.75, 0.04); // folded wrapper
}

/** Tall wardrobe with two doors, handles and a suitcase on top. */
export function wardrobe(p: Parts, at: At, wood: string, suitcase?: string) {
  blk(p, at, 1.0, 2.05, 0.6, wood, 0, 0, 0, 0.04);
  blk(p, at, 0.47, 1.9, 0.04, shade(wood, 1.1), -0.245, 0.08, 0.3, 0.02);
  blk(p, at, 0.47, 1.9, 0.04, shade(wood, 1.1), 0.245, 0.08, 0.3, 0.02);
  blk(p, at, 0.04, 0.22, 0.05, '#D9C27A', -0.04, 1.0, 0.33, 0.01);
  blk(p, at, 0.04, 0.22, 0.05, '#D9C27A', 0.04, 1.0, 0.33, 0.01);
  if (suitcase) blk(p, at, 0.75, 0.3, 0.5, suitcase, 0, 2.05, 0, 0.06);
}

/** Study desk with books, a reading lamp and a plastic chair. */
export function desk(p: Parts, at: At, wood: string, chair: string, books: string[]) {
  blk(p, at, 1.25, 0.06, 0.62, wood, 0, 0.72, 0, 0.02);
  for (const [lx, lz] of [[-0.56, -0.25], [0.56, -0.25], [-0.56, 0.25], [0.56, 0.25]] as const) blk(p, at, 0.06, 0.72, 0.06, shade(wood, 0.7), lx, 0, lz, 0.01);
  blk(p, at, 0.4, 0.5, 0.55, shade(wood, 0.9), 0.38, 0.2, 0, 0.02); // drawers
  books.forEach((c, i) => blk(p, at, 0.06, 0.3, 0.22, c, -0.5 + i * 0.07, 0.78, -0.15, 0.01));
  blk(p, at, 0.4, 0.03, 0.3, '#F4F1EA', -0.05, 0.78, 0.05, 0.005); // open notebook
  // Lamp
  blk(p, at, 0.16, 0.03, 0.16, '#2E3A44', 0.45, 0.78, -0.15, 0.01);
  blk(p, at, 0.03, 0.35, 0.03, '#2E3A44', 0.45, 0.8, -0.15, 0);
  blk(p, at, 0.18, 0.12, 0.18, '#F5B83D', 0.45, 1.12, -0.12, 0.04);
  // Plastic chair in front of the desk.
  blk(p, at, 0.48, 0.06, 0.45, chair, 0, 0.45, 0.62, 0.04);
  blk(p, at, 0.48, 0.5, 0.06, chair, 0, 0.5, 0.86, 0.04);
  for (const [lx, lz] of [[-0.2, 0.42], [0.2, 0.42], [-0.2, 0.82], [0.2, 0.82]] as const) blk(p, at, 0.05, 0.45, 0.05, shade(chair, 0.8), lx, 0, lz, 0.01);
}

/** Kerosene/electric stove on a small table with a pot, plus a water bucket. */
export function cookingCorner(p: Parts, at: At) {
  blk(p, at, 0.7, 0.75, 0.9, '#7A4E2D', 0, 0, 0, 0.03);
  blk(p, at, 0.5, 0.12, 0.5, '#3C3F45', 0, 0.75, -0.1, 0.03);
  cyl(p, at, 0.17, 0.2, '#B8BEC6', 0, 0.87, -0.1);
  blk(p, at, 0.3, 0.06, 0.3, '#9AA3AD', 0, 0.75, 0.3, 0.02);
  cyl(p, at, 0.2, 0.4, '#2F7FC1', 0.62, 0, 0); // bucket of water beside it
  cyl(p, at, 0.17, 0.02, '#8FD3F4', 0.62, 0.38, 0);
  blk(p, at, 0.22, 0.3, 0.16, '#F2C230', -0.2, 0.75, 0.25, 0.03); // a tin of Milo
}

/** A rug in the middle of the room. */
export function rug(p: Parts, at: At, colour: string, w = 3, d = 2.4) {
  blk(p, at, w, 0.02, d, colour, 0, 0.005, 0, 0);
  blk(p, at, w - 0.4, 0.025, d - 0.4, shade(colour, 1.2), 0, 0.006, 0, 0);
}

/** Low shelf of books and a radio under the window. */
export function shelf(p: Parts, at: At, wood: string) {
  blk(p, at, 1.4, 0.9, 0.38, wood, 0, 0, 0, 0.03);
  ['#D9482B', '#2F5D8A', '#F2C230', '#2E8B57', '#8E3B8A', '#F4EFE6'].forEach((c, i) => blk(p, at, 0.08, 0.28, 0.25, c, -0.55 + i * 0.1, 0.9, 0, 0.01));
  blk(p, at, 0.4, 0.22, 0.18, '#1B1E22', 0.4, 0.9, 0, 0.03); // radio
}

/** Window with frame, burglary bars and curtains (on the back wall). */
export function windowOn(p: Parts, at: At, curtain: string) {
  blk(p, at, 1.8, 1.2, 0.08, '#BFE6FF', 0, 1.2, 0, 0);
  blk(p, at, 1.9, 0.08, 0.1, '#F4EFE6', 0, 2.4, 0, 0);
  blk(p, at, 1.9, 0.08, 0.1, '#F4EFE6', 0, 1.15, 0, 0);
  for (let i = -3; i <= 3; i++) blk(p, at, 0.03, 1.2, 0.04, '#2E3A44', i * 0.26, 1.2, 0.06, 0);
  blk(p, at, 0.35, 1.4, 0.06, curtain, -1.05, 1.1, 0.1, 0.02);
  blk(p, at, 0.35, 1.4, 0.06, curtain, 1.05, 1.1, 0.1, 0.02);
}

/** Wall poster. */
export function poster(p: Parts, at: At, colour: string, y = 1.5) {
  blk(p, at, 0.6, 0.8, 0.02, colour, 0, y, 0, 0);
  blk(p, at, 0.45, 0.3, 0.025, '#F4EFE6', 0, y + 0.35, 0, 0);
}

/** Clothes line across the room with hanging clothes. */
export function clothesLine(p: Parts, at: At, length: number, colours: string[]) {
  blk(p, at, length, 0.02, 0.02, '#D9D2C2', 0, 2.3, 0, 0);
  colours.forEach((c, i) => blk(p, at, 0.4, 0.55, 0.04, c, -length / 2 + 0.6 + i * (length - 1.2) / Math.max(1, colours.length - 1), 1.75, 0, 0.03));
}

/** Slippers and a bucket by a bed. */
export function slippers(p: Parts, at: At, colour: string) {
  blk(p, at, 0.12, 0.04, 0.28, colour, -0.08, 0, 0, 0.02);
  blk(p, at, 0.12, 0.04, 0.28, colour, 0.08, 0, 0.02, 0.02);
}

/** Ceiling fan seen from above. */
export function fan(p: Parts, at: At) {
  cyl(p, at, 0.12, 0.15, '#E7ECEF', 0, 2.75, 0);
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    blk(p, { x: at.x, z: at.z, rot: a }, 0.18, 0.02, 1.0, '#C9C2B4', 0, 2.78, 0.55, 0.01);
  }
}

// ---------- other rooms ----------

export function counter(p: Parts, at: At, w: number, top: string, front: string) {
  blk(p, at, w, 1.05, 0.7, front, 0, 0, 0, 0.04);
  blk(p, at, w + 0.1, 0.06, 0.8, top, 0, 1.05, 0, 0.02);
}

export function officeDesk(p: Parts, at: At, wood: string) {
  blk(p, at, 1.6, 0.75, 0.8, wood, 0, 0, 0, 0.03);
  blk(p, at, 0.55, 0.38, 0.05, '#1B1E22', 0, 0.75, -0.2, 0.02); // monitor
  blk(p, at, 0.1, 0.12, 0.1, '#1B1E22', 0, 0.75, -0.2, 0);
  for (let i = 0; i < 4; i++) blk(p, at, 0.32, 0.03 + i * 0.002, 0.24, i % 2 ? '#F4F1EA' : '#E8DFC8', 0.5, 0.75 + i * 0.03, 0.05, 0); // paper pile
  blk(p, at, 0.5, 0.9, 0.5, '#2E3A44', 0, 0, -0.75, 0.06); // officer's chair
}

export function bench(p: Parts, at: At, w: number, colour: string) {
  blk(p, at, w, 0.08, 0.45, colour, 0, 0.42, 0, 0.03);
  blk(p, at, w, 0.4, 0.06, colour, 0, 0.5, -0.2, 0.03);
  for (const lx of [-w / 2 + 0.1, w / 2 - 0.1]) blk(p, at, 0.06, 0.42, 0.4, shade(colour, 0.7), lx, 0, 0, 0.01);
}

/** A row of lecture seats with a writing ledge. */
export function seatRow(p: Parts, at: At, n: number, colour: string) {
  const w = n * 0.7;
  blk(p, at, w, 0.05, 0.35, '#A8754A', 0, 0.75, -0.35, 0.02);
  for (let i = 0; i < n; i++) {
    const lx = -w / 2 + 0.35 + i * 0.7;
    blk(p, at, 0.5, 0.06, 0.45, colour, lx, 0.42, 0.1, 0.03);
    blk(p, at, 0.5, 0.5, 0.06, colour, lx, 0.45, 0.33, 0.03);
  }
  blk(p, at, w, 0.42, 0.08, shade(colour, 0.6), 0, 0, 0.1, 0.01);
}

export function lectern(p: Parts, at: At) {
  blk(p, at, 0.8, 1.1, 0.55, '#7A4E2D', 0, 0, 0, 0.04);
  blk(p, at, 0.9, 0.06, 0.65, '#8B5E3C', 0, 1.1, 0, 0.02);
}

export function board(p: Parts, at: At, colour: string, w = 4) {
  blk(p, at, w + 0.2, 1.5, 0.06, '#C9C2B4', 0, 1.0, 0, 0);
  blk(p, at, w, 1.3, 0.07, colour, 0, 1.1, 0, 0);
}

export function bookshelf(p: Parts, at: At, w: number) {
  blk(p, at, w, 2.1, 0.45, '#6E4B2F', 0, 0, 0, 0.03);
  const colours = ['#D9482B', '#2F5D8A', '#F2C230', '#2E8B57', '#8E3B8A', '#F4EFE6', '#E8742A'];
  for (let row = 0; row < 4; row++) {
    for (let i = 0; i < Math.floor(w / 0.12); i++) {
      if ((i + row) % 7 === 3) continue;
      blk(p, at, 0.09, 0.32, 0.3, colours[(i * 3 + row) % colours.length]!, -w / 2 + 0.1 + i * 0.12, 0.12 + row * 0.5, 0.05, 0.01);
    }
  }
}

export function tableWithChairs(p: Parts, at: At, top: string, chair: string) {
  blk(p, at, 1.2, 0.05, 0.8, top, 0, 0.74, 0, 0.02);
  blk(p, at, 0.12, 0.74, 0.12, shade(top, 0.6), 0, 0, 0, 0.01);
  for (const lz of [-0.65, 0.65]) blk(p, at, 0.45, 0.45, 0.45, chair, 0, 0, lz, 0.06);
}

export function hospitalBed(p: Parts, at: At) {
  blk(p, at, 1.0, 0.6, 2.0, '#D8DEE3', 0, 0, 0, 0.03);
  blk(p, at, 0.95, 0.15, 1.9, '#FFFFFF', 0, 0.6, 0, 0.06);
  blk(p, at, 0.95, 0.08, 1.2, '#9FC3DA', 0, 0.72, 0.3, 0.03);
  blk(p, at, 0.06, 1.6, 0.06, '#B8BEC6', 0.65, 0, -0.9, 0); // drip stand
  blk(p, at, 0.15, 0.25, 0.08, '#E6F4FF', 0.65, 1.45, -0.9, 0.02);
}

export function labBench(p: Parts, at: At, w: number) {
  blk(p, at, w, 0.9, 0.8, '#E7ECEF', 0, 0, 0, 0.03);
  blk(p, at, w + 0.1, 0.05, 0.9, '#2E3A44', 0, 0.9, 0, 0.01);
  for (let i = 0; i < Math.floor(w / 0.6); i++) {
    cyl(p, at, 0.06, 0.25, ['#8FD3F4', '#B4FF3E', '#F29BC1'][i % 3]!, -w / 2 + 0.3 + i * 0.6, 0.95, 0);
    blk(p, at, 0.2, 0.3, 0.2, '#1B1E22', -w / 2 + 0.45 + i * 0.6, 0.95, -0.2, 0.02);
  }
}

export function sofa(p: Parts, at: At, w: number, colour: string) {
  blk(p, at, w, 0.42, 0.85, colour, 0, 0, 0, 0.12);
  blk(p, at, w, 0.5, 0.2, shade(colour, 0.85), 0, 0.42, -0.33, 0.1);
  blk(p, at, 0.2, 0.3, 0.85, shade(colour, 0.85), -w / 2 + 0.1, 0.42, 0, 0.08);
  blk(p, at, 0.2, 0.3, 0.85, shade(colour, 0.85), w / 2 - 0.1, 0.42, 0, 0.08);
}

export function plant(p: Parts, at: At) {
  cyl(p, at, 0.22, 0.4, '#B5543C', 0, 0, 0);
  blk(p, at, 0.5, 0.6, 0.5, '#2E8B57', 0, 0.4, 0, 0.22);
}

export function danceFloor(p: Parts, at: At, w: number, d: number) {
  const colours = ['#FF3EA5', '#3EE0FF', '#B4FF3E', '#F2C230', '#8E3BFF'];
  const n = 5;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) blk(p, at, w / n - 0.04, 0.03, d / n - 0.04, colours[(i + j * 2) % colours.length]!, -w / 2 + (i + 0.5) * (w / n), 0.01, -d / 2 + (j + 0.5) * (d / n), 0);
}

export function screenWall(p: Parts, at: At, w: number) {
  blk(p, at, w, 2.6, 0.08, '#E7F1FA', 0, 0.6, 0, 0);
  blk(p, at, w + 0.3, 0.2, 0.12, '#B0182E', 0, 3.2, 0, 0);
}

// ---------- bathroom and room details ----------

/** A low wall (cut-away height, so the camera can see over it). */
export function partition(p: Parts, at: At, length: number, colour: string, h = 1.25) {
  blk(p, at, length, h, 0.12, colour, 0, 0, 0, 0.02);
  blk(p, at, length + 0.02, 0.06, 0.16, shade(colour, 0.8), 0, h, 0, 0.01);
}

/** Small square tiles for a bathroom floor. */
export function tiles(p: Parts, at: At, w: number, d: number, a = '#DDE8EE', b = '#B9CCD8') {
  const n = Math.max(1, Math.round(w / 0.5));
  const m = Math.max(1, Math.round(d / 0.5));
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) blk(p, at, w / n - 0.03, 0.02, d / m - 0.03, (i + j) % 2 ? a : b, -w / 2 + (i + 0.5) * (w / n), 0.008, -d / 2 + (j + 0.5) * (d / m), 0);
}

/** Water closet with a cistern and a seat. */
export function toilet(p: Parts, at: At) {
  blk(p, at, 0.42, 0.38, 0.55, '#F7F9FA', 0, 0, 0.05, 0.12);
  blk(p, at, 0.44, 0.05, 0.5, '#E3E9ED', 0, 0.38, 0.07, 0.04);
  blk(p, at, 0.5, 0.45, 0.2, '#F7F9FA', 0, 0.35, -0.28, 0.05);
  blk(p, at, 0.08, 0.04, 0.05, '#B8BEC6', 0.15, 0.8, -0.28, 0.01);
}

/** Bucket-bath corner: a tap on the wall, a drain, a big bucket and a small bowl. */
export function showerCorner(p: Parts, at: At) {
  blk(p, at, 0.06, 0.06, 0.25, '#B8BEC6', 0, 1.0, -0.1, 0.01); // tap pipe
  blk(p, at, 0.05, 0.12, 0.05, '#B8BEC6', 0, 0.9, 0.02, 0.01);
  blk(p, at, 0.35, 0.18, 0.08, '#B8BEC6', 0, 1.85, -0.18, 0.02); // shower head
  cyl(p, at, 0.06, 0.01, '#5D6F7C', 0, 0.02, 0.35); // drain
  cyl(p, at, 0.24, 0.5, '#2F7FC1', 0.45, 0, 0.1); // bucket
  cyl(p, at, 0.21, 0.02, '#8FD3F4', 0.45, 0.47, 0.1);
  cyl(p, at, 0.1, 0.1, '#F2C230', 0.45, 0.5, 0.1); // bowl floating in it
  blk(p, at, 0.5, 0.06, 0.06, '#8B5E3C', -0.4, 1.4, -0.12, 0.01); // towel rail
  blk(p, at, 0.4, 0.55, 0.03, '#E8742A', -0.4, 0.88, -0.09, 0.02); // towel
}

/** Bathroom sink with a mirror. */
export function sink(p: Parts, at: At) {
  blk(p, at, 0.55, 0.12, 0.4, '#F7F9FA', 0, 0.78, 0, 0.05);
  blk(p, at, 0.1, 0.78, 0.1, '#E3E9ED', 0, 0, -0.05, 0.02);
  blk(p, at, 0.5, 0.65, 0.03, '#CFE8F4', 0, 1.1, -0.18, 0.01);
}

/** Cork board with the timetable pinned on it. */
export function timetableBoard(p: Parts, at: At) {
  blk(p, at, 1.3, 0.85, 0.04, '#B98A55', 0, 1.25, 0, 0.01);
  const colours = ['#F2C230', '#8FD3F4', '#F29BC1', '#B4FF3E', '#F4EFE6'];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) if ((r * 5 + c) % 3 !== 1) blk(p, at, 0.2, 0.15, 0.02, colours[(r + c) % colours.length]!, -0.5 + c * 0.25, 1.33 + r * 0.17, 0.025, 0);
}

/** A door in its frame (flat against a wall). */
export function door(p: Parts, at: At, colour: string, sign?: string) {
  blk(p, at, 1.0, 2.1, 0.06, shade(colour, 0.7), 0, 0, 0, 0.01);
  blk(p, at, 0.86, 2.0, 0.08, colour, 0, 0, 0.01, 0.02);
  blk(p, at, 0.06, 0.06, 0.06, '#D9C27A', 0.3, 1.0, 0.07, 0.01);
  if (sign) blk(p, at, 0.4, 0.25, 0.03, sign, 0, 1.55, 0.06, 0.01);
}

/** Cooler of food and a crate of drinks. */
export function cooler(p: Parts, at: At, colour = '#D9482B') {
  blk(p, at, 0.6, 0.45, 0.42, colour, 0, 0, 0, 0.1);
  blk(p, at, 0.62, 0.08, 0.44, '#F4EFE6', 0, 0.45, 0, 0.04);
}

/** Phone charging extension box with a blinking light. */
export function extension(p: Parts, at: At) {
  blk(p, at, 0.35, 0.06, 0.12, '#F4EFE6', 0, 0.01, 0, 0.02);
  blk(p, at, 0.04, 0.02, 0.04, '#D9482B', 0.12, 0.07, 0, 0);
}

/** Wall clock. */
export function wallClock(p: Parts, at: At) {
  cylinderOnWall(p, at, 0.22, '#F4EFE6', 2.2);
}

function cylinderOnWall(p: Parts, at: At, r: number, colour: string, y: number) {
  blk(p, at, r * 2, r * 2, 0.05, colour, 0, y, 0, r * 0.9);
  blk(p, at, 0.03, r * 0.8, 0.02, '#1B1E22', 0, y + r * 0.6, 0.03, 0);
}

// ---------- business centre ----------

/** Big office photocopier with a lid and paper trays. */
export function photocopier(p: Parts, at: At) {
  blk(p, at, 1.0, 0.95, 0.75, '#D9DEE2', 0, 0, 0, 0.05);
  blk(p, at, 0.95, 0.06, 0.7, '#3C3F45', 0, 0.95, 0, 0.02); // glass
  blk(p, at, 0.95, 0.08, 0.7, '#B8BEC6', 0, 1.01, -0.02, 0.02); // lid
  blk(p, at, 0.3, 0.1, 0.18, '#2E3A44', 0.3, 0.95, 0.28, 0.02); // control panel
  blk(p, at, 0.05, 0.05, 0.02, '#34D399', 0.38, 1.05, 0.38, 0);
  for (const y of [0.2, 0.45]) blk(p, at, 0.8, 0.12, 0.05, '#C9CED3', 0, y, 0.38, 0.02); // trays
  blk(p, at, 0.5, 0.04, 0.35, '#FFFFFF', -0.55, 0.6, 0, 0.01); // output paper
}

/** Desk with a computer and a printer. */
export function printerDesk(p: Parts, at: At) {
  blk(p, at, 1.6, 0.06, 0.75, '#8B5E3C', 0, 0.74, 0, 0.02);
  for (const [lx, lz] of [[-0.72, -0.3], [0.72, -0.3], [-0.72, 0.3], [0.72, 0.3]] as const) blk(p, at, 0.06, 0.74, 0.06, '#5B3F27', lx, 0, lz, 0.01);
  blk(p, at, 0.55, 0.4, 0.05, '#1B1E22', -0.3, 0.8, -0.2, 0.02); // monitor
  blk(p, at, 0.5, 0.03, 0.18, '#2E3A44', -0.3, 0.8, 0.12, 0.01); // keyboard
  blk(p, at, 0.5, 0.28, 0.4, '#E7ECEF', 0.45, 0.8, -0.05, 0.04); // printer
  blk(p, at, 0.36, 0.03, 0.3, '#FFFFFF', 0.45, 1.08, -0.05, 0.01);
}

/** Passport photo corner: a blue backdrop on a stand. */
export function photoBackdrop(p: Parts, at: At) {
  blk(p, at, 1.6, 2.1, 0.05, '#2F7FC1', 0, 0.05, 0, 0.01);
  blk(p, at, 0.06, 2.2, 0.06, '#2E3A44', -0.82, 0, 0.05, 0);
  blk(p, at, 0.06, 2.2, 0.06, '#2E3A44', 0.82, 0, 0.05, 0);
}

/** A round stool. */
export function stool(p: Parts, at: At, colour = '#D9482B') {
  cyl(p, at, 0.2, 0.06, colour, 0, 0.45, 0);
  cyl(p, at, 0.04, 0.45, '#2E3A44', 0, 0, 0);
}

/** Camera on a tripod, with a flash umbrella. */
export function tripodCamera(p: Parts, at: At) {
  for (const a of [0, 2.1, 4.2]) blk(p, at, 0.04, 1.3, 0.04, '#2E3A44', Math.cos(a) * 0.18, 0, Math.sin(a) * 0.18, 0);
  blk(p, at, 0.3, 0.2, 0.18, '#1B1E22', 0, 1.3, 0, 0.04);
  cyl(p, at, 0.06, 0.12, '#3C3F45', 0, 1.33, 0.12);
  blk(p, at, 0.6, 0.5, 0.05, '#F4EFE6', 0.45, 1.5, -0.2, 0.2); // umbrella
}

/** Charging station: a table with a power strip and phones charging. */
export function chargingStation(p: Parts, at: At) {
  blk(p, at, 1.4, 0.06, 0.6, '#7A4E2D', 0, 0.85, 0, 0.02);
  blk(p, at, 1.3, 0.85, 0.5, '#5B3F27', 0, 0, 0, 0.02);
  blk(p, at, 1.1, 0.05, 0.1, '#F4EFE6', 0, 0.91, -0.15, 0.02); // power strip
  ['#1B1E22', '#2F5D8A', '#B23A79', '#1B1E22'].forEach((c, i) => blk(p, at, 0.12, 0.02, 0.22, c, -0.45 + i * 0.3, 0.92, 0.1, 0.01));
  blk(p, at, 0.6, 0.3, 0.03, '#F2C230', 0, 1.3, -0.28, 0.01); // sign
}

/** A string of coloured fairy lights along a wall. */
export function fairyLights(p: Parts, at: At, length: number) {
  const colours = ['#FFE066', '#FF6B9A', '#7FD4FF', '#B4FF3E'];
  blk(p, at, length, 0.015, 0.015, '#2E3A44', 0, 2.05, 0, 0);
  for (let i = 0; i < Math.floor(length / 0.25); i++) blk(p, at, 0.07, 0.09, 0.07, colours[i % colours.length]!, -length / 2 + 0.12 + i * 0.25, 1.95 - (i % 2) * 0.05, 0.02, 0.03);
}

export function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
