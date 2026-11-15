// Every building from the planner layout, built in code from boxes only
// (rectangles and squares), each one different: wall colour, window style,
// floor height, floors, and extras picked from its id (balconies, stair
// towers, setback top floors, water tanks, walkways, porticos, awnings...).
//
// Geometry is written straight into a few merged meshes: one per window style
// (walls, with window rows lined up to the floors) and one for everything else.
// Taps find the building from the triangle hit; closed places are dimmed by
// recolouring their part of the mesh.
import type { ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { getPlace, PLACES } from '../../content/places';
import { placeHasSomethingNow } from '../../game/interactions';
import { buildings, isRoad, type Block, type MapBuilding, type PlannerKind, type Rect } from '../../content/campusMap';
import { useGameStore } from '../../store/gameStore';
import { gesture } from '../shared';

// ---------- window textures (one bay wide, one floor tall; drawn at runtime) ----------

export type WindowStyle = 'punched' | 'ribbon' | 'tall' | 'louvre' | 'shop';
const STYLES: WindowStyle[] = ['punched', 'ribbon', 'tall', 'louvre', 'shop'];

function paintBay(ctx: CanvasRenderingContext2D, style: WindowStyle, glow: boolean) {
  const S = 128;
  ctx.fillStyle = glow ? '#000000' : '#FFFFFF';
  ctx.fillRect(0, 0, S, S);
  const glass = glow ? '#FFD27A' : '#3D586A';
  const frame = glow ? '#000000' : '#E3DDD0';
  const pane = (x: number, y: number, w: number, h: number) => {
    if (!glow) {
      ctx.fillStyle = frame;
      ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
    }
    ctx.fillStyle = glass;
    ctx.fillRect(x, y, w, h);
  };
  if (style === 'punched') {
    pane(38, 30, 52, 56);
    if (!glow) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(62, 30, 4, 56);
    }
  } else if (style === 'ribbon') {
    pane(0, 36, 128, 46);
    if (!glow) {
      ctx.fillStyle = frame;
      for (let x = 0; x < 128; x += 32) ctx.fillRect(x, 36, 4, 46);
    }
  } else if (style === 'tall') {
    pane(20, 14, 34, 92);
    pane(74, 14, 34, 92);
  } else if (style === 'louvre') {
    // Breeze blocks: a grid of small openings.
    ctx.fillStyle = glow ? '#7A5A20' : '#6F7F88';
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) ctx.fillRect(10 + i * 23, 10 + j * 22, 15, 14);
  } else {
    // Shopfront: big glass with a door frame.
    pane(10, 26, 108, 94);
    if (!glow) {
      ctx.fillStyle = frame;
      ctx.fillRect(62, 26, 5, 94);
    }
  }
  if (!glow) {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, 120, 128, 8); // floor line
  }
}

function makeTexture(style: WindowStyle, glow: boolean): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  paintBay(c.getContext('2d')!, style, glow);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 2;
  return t;
}

/** Wall materials, one per window style. Their glow is set per time of day. */
export const wallMaterials: Record<WindowStyle, THREE.MeshLambertMaterial> = Object.fromEntries(
  STYLES.map((s) => [
    s,
    new THREE.MeshLambertMaterial({
      vertexColors: true,
      map: makeTexture(s, false),
      emissive: new THREE.Color('#FFD27A'),
      emissiveMap: makeTexture(s, true),
      emissiveIntensity: 0,
    }),
  ]),
) as Record<WindowStyle, THREE.MeshLambertMaterial>;
const plainMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

export function setCampusGlow(intensity: number): void {
  for (const m of Object.values(wallMaterials)) m.emissiveIntensity = intensity;
}

// ---------- geometry accumulator ----------

interface Range {
  start: number;
  count: number;
  id: string;
}

const tmpColour = new THREE.Color();

class Acc {
  pos: number[] = [];
  nor: number[] = [];
  uv: number[] = [];
  col: number[] = [];
  ranges: Range[] = [];
  private openId: string | null = null;
  private openStart = 0;

  begin(id: string) {
    this.openId = id;
    this.openStart = this.pos.length / 3;
  }
  end() {
    const count = this.pos.length / 3 - this.openStart;
    if (this.openId && count > 0) this.ranges.push({ start: this.openStart, count, id: this.openId });
    this.openId = null;
  }

  /** A quad a-b-c-d (counter-clockwise seen from outside) with a flat normal. */
  quad(a: number[], b: number[], c: number[], d: number[], n: number[], colour: string, uvs?: number[][]) {
    tmpColour.set(colour);
    for (const [i, v] of ([a, b, c, a, c, d] as number[][]).entries()) {
      this.pos.push(v[0]!, v[1]!, v[2]!);
      this.nor.push(n[0]!, n[1]!, n[2]!);
      this.col.push(tmpColour.r, tmpColour.g, tmpColour.b);
      if (uvs) {
        const k = [0, 1, 2, 0, 2, 3][i]!;
        this.uv.push(uvs[k]![0]!, uvs[k]![1]!);
      }
    }
  }

  geometry(withUv: boolean): THREE.BufferGeometry | null {
    if (!this.pos.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    if (withUv) g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeBoundingSphere();
    return g;
  }
}

/** A box from (x0,y0,z0) to (x1,y1,z1), top and four sides (no bottom). */
function box(acc: Acc, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, colour: string, topColour = colour) {
  acc.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], topColour);
  acc.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], colour);
  acc.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], colour);
  acc.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], colour);
  acc.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], colour);
}

/** Four textured walls; texture repeats once per bay (about `bay` m) and once per floor. */
function walls(acc: Acc, r: Rect, y0: number, y1: number, floors: number, bay: number, colour: string) {
  const v = Math.max(1, floors);
  const bays = (len: number) => Math.max(1, Math.round(len / bay));
  const side = (a: number[], b: number[], n: number[], len: number) => {
    const u = bays(len);
    acc.quad([a[0]!, y0, a[1]!], [b[0]!, y0, b[1]!], [b[0]!, y1, b[1]!], [a[0]!, y1, a[1]!], n, colour, [
      [0, 0],
      [u, 0],
      [u, v],
      [0, v],
    ]);
  };
  const w = r.x1 - r.x0;
  const d = r.z1 - r.z0;
  side([r.x0, r.z1], [r.x1, r.z1], [0, 0, 1], w);
  side([r.x1, r.z0], [r.x0, r.z0], [0, 0, -1], w);
  side([r.x1, r.z1], [r.x1, r.z0], [1, 0, 0], d);
  side([r.x0, r.z0], [r.x0, r.z1], [-1, 0, 0], d);
}

// ---------- palettes and design choices ----------

interface Palette {
  walls: string[];
  trims: string[];
  styles: WindowStyle[];
  floorH: [number, number];
}

const PALETTES: Partial<Record<PlannerKind, Palette>> = {
  apartment: {
    walls: ['#F3E9D2', '#F6D2B8', '#CFE6D4', '#CFE0F0', '#E8D8F0', '#F2E2A6', '#E9CFC3', '#DCE8C4'],
    trims: ['#B5543C', '#3F6E9E', '#4E8A55', '#8B5E3C', '#7B5EA7', '#C98A12'],
    styles: ['punched', 'tall', 'punched', 'louvre'],
    floorH: [2.9, 3.3],
  },
  classroom: { walls: ['#F2D27A', '#EEDFC0', '#F5F0E6', '#E9C48A', '#F0E6C8'], trims: ['#2F5D8A', '#8B5E3C', '#B5543C', '#3F6E9E'], styles: ['ribbon', 'punched', 'tall'], floorH: [3.4, 3.8] },
  lecture: { walls: ['#E8A33D', '#D9C3A0', '#F0E2C8', '#E3B68C'], trims: ['#6A4C93', '#2F5D8A', '#7A4E2D'], styles: ['tall'], floorH: [7, 8.5] },
  library: { walls: ['#BCD3EA', '#D8E4EE', '#C9D6CF'], trims: ['#2F5D8A', '#1F3F66'], styles: ['ribbon', 'tall'], floorH: [3.6, 4] },
  faculty: { walls: ['#E3B68C', '#F0D9B5', '#D9A77A', '#EAD7BE'], trims: ['#7A4E2D', '#2F5D8A', '#4E8A55'], styles: ['punched', 'ribbon'], floorH: [3.5, 3.8] },
  lab: { walls: ['#D9CCEB', '#E6E6EE', '#CBD9E8'], trims: ['#6A4C93', '#3F6E9E'], styles: ['ribbon', 'punched'], floorH: [3.6, 4] },
  admin: { walls: ['#F4F0E6', '#E6E1D3', '#EDE3CF'], trims: ['#1F4E9C', '#8B5E3C', '#2E6B4E'], styles: ['tall', 'punched'], floorH: [3.6, 4] },
  clinic: { walls: ['#F7F7F2', '#EAF4EE'], trims: ['#2E8B57', '#D7263D'], styles: ['punched', 'ribbon'], floorH: [3.4, 3.6] },
  business: {
    walls: ['#2FA58F', '#F2C230', '#E8742A', '#3E7CC9', '#D9482B', '#8E3B8A', '#F4EFE6', '#4FAE5A', '#F29BC1'],
    trims: ['#F4EFE6', '#1B2A37', '#F2C230', '#D9482B'],
    styles: ['shop'],
    floorH: [3.2, 3.4],
  },
  buka: { walls: ['#F0B85A', '#E9C48A'], trims: ['#C2462E', '#2E8B57'], styles: ['shop'], floorH: [3.2, 3.4] },
};

const pick = <T,>(list: T[], seed: number): T => list[seed % list.length]!;
function shadeHex(hex: string, f: number): string {
  return `#${tmpColour.set(hex).multiplyScalar(f).getHexString()}`;
}

const DOOR = '#4A3324';
const CONCRETE = '#C9C2B4';
const DARK = '#2E3A44';

/** One block of a building: plinth, walls, roof and its extras. */
function buildBlock(wallAcc: Record<WindowStyle, Acc>, plain: Acc, b: MapBuilding, blk: Block, hasDoor: boolean) {
  const pal = PALETTES[b.kind];
  if (!pal) return;
  const s = blk.seed;
  const wall = pick(pal.walls, s);
  const trim = pick(pal.trims, s >>> 4);
  const style = pick(pal.styles, s >>> 8);
  const floorH = pal.floorH[0] + ((s >>> 12) % 5) * ((pal.floorH[1] - pal.floorH[0]) / 4);
  const floors = Math.max(1, blk.floors);
  const r = blk.rect;
  const PLINTH = 0.45;
  const top = PLINTH + floors * floorH;
  const bay = style === 'shop' ? 6 : style === 'ribbon' ? 4.5 : 3.6;
  const feature = (bit: number) => ((s >>> (16 + bit)) & 1) === 1;

  // Plinth, slightly wider than the walls.
  box(plain, r.x0 - 0.4, 0, r.z0 - 0.4, r.x1 + 0.4, PLINTH, r.z1 + 0.4, CONCRETE);

  // Main walls; some tall blocks set their top floor back.
  const setback = floors >= 3 && ['apartment', 'faculty', 'admin', 'library'].includes(b.kind) && feature(0);
  const bodyFloors = setback ? floors - 1 : floors;
  const bodyTop = PLINTH + bodyFloors * floorH;
  walls(wallAcc[style], r, PLINTH, bodyTop, bodyFloors, bay, wall);
  let roofRect = r;
  let roofY = bodyTop;
  if (setback) {
    const inset = Math.min(3, (r.x1 - r.x0) / 4, (r.z1 - r.z0) / 4);
    roofRect = { x0: r.x0 + inset, z0: r.z0 + inset, x1: r.x1 - inset, z1: r.z1 - inset };
    box(plain, r.x0, bodyTop, r.z0, r.x1, bodyTop + 0.3, r.z1, shadeHex(wall, 0.8));
    walls(wallAcc[style], roofRect, bodyTop + 0.3, top + 0.3, 1, bay, shadeHex(wall, 0.95));
    roofY = top + 0.3;
  }

  // Floor bands on some blocks.
  if (floors >= 2 && feature(1) && b.kind !== 'business') {
    for (let f = 1; f < bodyFloors; f++) {
      const y = PLINTH + f * floorH;
      box(plain, r.x0 - 0.15, y - 0.15, r.z0 - 0.15, r.x1 + 0.15, y + 0.12, r.z1 + 0.15, trim);
    }
  }

  // Flat roof with a parapet.
  const roofColour = b.kind === 'apartment' ? trim : shadeHex(wall, 0.72);
  box(plain, roofRect.x0 - 0.3, roofY, roofRect.z0 - 0.3, roofRect.x1 + 0.3, roofY + 0.35, roofRect.z1 + 0.3, shadeHex(roofColour, 0.9), roofColour);
  const P = 0.3;
  const ph = roofY + 1.1;
  box(plain, roofRect.x0 - 0.3, roofY, roofRect.z0 - 0.3, roofRect.x1 + 0.3, ph, roofRect.z0 - 0.3 + P, shadeHex(wall, 0.85));
  box(plain, roofRect.x0 - 0.3, roofY, roofRect.z1 + 0.3 - P, roofRect.x1 + 0.3, ph, roofRect.z1 + 0.3, shadeHex(wall, 0.85));
  box(plain, roofRect.x0 - 0.3, roofY, roofRect.z0 - 0.3, roofRect.x0 - 0.3 + P, ph, roofRect.z1 + 0.3, shadeHex(wall, 0.85));
  box(plain, roofRect.x1 + 0.3 - P, roofY, roofRect.z0 - 0.3, roofRect.x1 + 0.3, ph, roofRect.z1 + 0.3, shadeHex(wall, 0.85));

  const w = r.x1 - r.x0;
  const d = r.z1 - r.z0;
  const cx = (r.x0 + r.x1) / 2;
  const cz = (r.z0 + r.z1) / 2;
  const side = b.doorSide;
  // The face that looks at the road: its outward direction and its span.
  const out = side === 's' ? [0, 1] : side === 'n' ? [0, -1] : side === 'e' ? [1, 0] : [-1, 0];
  const faceZ = side === 's' ? r.z1 : side === 'n' ? r.z0 : cz;
  const faceX = side === 'e' ? r.x1 : side === 'w' ? r.x0 : cx;
  const alongX = side === 's' || side === 'n';
  const span = alongX ? w : d;
  /** A box sticking out of the road-facing wall: `from`/`to` along the wall (0..1), depth outwards. */
  const front = (from: number, to: number, depth: number, y0: number, y1: number, colour: string, gap = 0) => {
    if (alongX) {
      const a = r.x0 + from * w;
      const bb = r.x0 + to * w;
      const z0 = out[1]! > 0 ? faceZ + gap : faceZ - gap - depth;
      box(plain, a, y0, z0, bb, y1, z0 + depth, colour);
    } else {
      const a = r.z0 + from * d;
      const bb = r.z0 + to * d;
      const x0 = out[0]! > 0 ? faceX + gap : faceX - gap - depth;
      box(plain, x0, y0, a, x0 + depth, y1, bb, colour);
    }
  };

  // Door, with a step and (for named places) a sign above it.
  if (hasDoor) {
    const dw = Math.min(2.4, span * 0.3) / span;
    front(0.5 - dw / 2, 0.5 + dw / 2, 0.25, PLINTH, PLINTH + 2.5, DOOR);
    front(0.5 - dw, 0.5 + dw, 1.2, 0, PLINTH, CONCRETE);
    if (getPlace(b.id)?.label) front(0.5 - 0.18, 0.5 + 0.18, 0.2, PLINTH + 2.9, PLINTH + 3.8, trim, 0.25);
  }

  switch (b.kind) {
    case 'apartment': {
      // Balconies on every floor above the ground, on some blocks.
      if (feature(2) && floors >= 2) {
        for (let f = 1; f < bodyFloors; f++) {
          const y = PLINTH + f * floorH;
          front(0.12, 0.88, 1.3, y - 0.1, y + 0.12, CONCRETE);
          front(0.12, 0.88, 0.12, y + 0.12, y + 1.0, trim, 1.18);
        }
      }
      // A breeze-block stair tower at one end, standing a little proud.
      if (feature(3)) {
        const t = 3.5 / Math.max(span, 4);
        const end = feature(4) ? [0, t] : [1 - t, 1];
        if (alongX) {
          const x0 = r.x0 + end[0]! * w;
          const z0 = out[1]! > 0 ? r.z1 - 1 : r.z0 - 1.2;
          const rr = { x0, x1: x0 + t * w, z0, z1: z0 + 2.2 };
          walls(wallAcc.louvre, rr, PLINTH, top + 1.2, floors, 3, shadeHex(wall, 0.9));
          box(plain, rr.x0 - 0.2, top + 1.2, rr.z0 - 0.2, rr.x1 + 0.2, top + 1.5, rr.z1 + 0.2, roofColour);
        } else {
          const z0 = r.z0 + end[0]! * d;
          const x0 = out[0]! > 0 ? r.x1 - 1 : r.x0 - 1.2;
          const rr = { x0, x1: x0 + 2.2, z0, z1: z0 + t * d };
          walls(wallAcc.louvre, rr, PLINTH, top + 1.2, floors, 3, shadeHex(wall, 0.9));
          box(plain, rr.x0 - 0.2, top + 1.2, rr.z0 - 0.2, rr.x1 + 0.2, top + 1.5, rr.z1 + 0.2, roofColour);
        }
      }
      break;
    }
    case 'classroom':
    case 'lecture': {
      // Covered walkway along the road side, on posts.
      if (b.kind === 'lecture' || feature(2)) {
        const h = Math.min(PLINTH + 3.2, top - 0.5);
        front(0.04, 0.96, 2.6, h, h + 0.25, shadeHex(trim, 1));
        const n = Math.max(2, Math.round(span / 5));
        for (let i = 0; i <= n; i++) {
          const t = 0.06 + (0.88 * i) / n;
          front(t - 0.01, t + 0.01, 0.3, PLINTH, h, CONCRETE, 2.2);
        }
      }
      if (b.kind === 'lecture') {
        // A clerestory band of colour near the top.
        box(plain, r.x0 - 0.1, top - 1.4, r.z0 - 0.1, r.x1 + 0.1, top - 0.8, r.z1 + 0.1, trim);
      }
      break;
    }
    case 'library':
    case 'admin':
    case 'faculty': {
      // A portico of tall pillars and a slab over the entrance.
      if (hasDoor) {
        const h = PLINTH + Math.min(2, floors) * floorH;
        front(0.3, 0.7, 4, h, h + 0.5, trim);
        for (const t of [0.32, 0.43, 0.57, 0.68]) front(t - 0.012, t + 0.012, 0.6, PLINTH, h, '#F4EFE6', 3.2);
      }
      // A central tower rising above the roof.
      if (b.kind === 'admin' || feature(2)) {
        const tw = Math.min(w, d) * 0.35;
        const rr = { x0: cx - tw / 2, x1: cx + tw / 2, z0: cz - tw / 2, z1: cz + tw / 2 };
        const extra = b.kind === 'admin' ? 2 : 1;
        walls(wallAcc[style], rr, roofY + 0.35, roofY + 0.35 + extra * floorH, extra, bay, shadeHex(wall, 0.95));
        box(plain, rr.x0 - 0.3, roofY + 0.35 + extra * floorH, rr.z0 - 0.3, rr.x1 + 0.3, roofY + 0.75 + extra * floorH, rr.z1 + 0.3, trim);
      }
      break;
    }
    case 'lab': {
      // Rooftop vents and plant boxes.
      for (let i = 0; i < 3; i++) {
        const vx = r.x0 + w * (0.25 + 0.25 * i);
        box(plain, vx - 1, roofY + 0.35, cz - 1, vx + 1, roofY + 1.6 + (i % 2) * 0.6, cz + 1, '#9AA3AD');
      }
      break;
    }
    case 'clinic': {
      // Entrance canopy and a red cross sign.
      front(0.25, 0.75, 3, PLINTH + 2.8, PLINTH + 3.1, '#2E8B57');
      const y = top - 1.6;
      front(0.47, 0.53, 0.15, y - 0.9, y + 0.9, '#D7263D', 0.05);
      front(0.42, 0.58, 0.15, y - 0.3, y + 0.3, '#D7263D', 0.05);
      break;
    }
    case 'business':
    case 'buka': {
      // Awning in stripes over the shopfront, and a signboard on the roof edge.
      const stripes = 6;
      for (let i = 0; i < stripes; i++) {
        front(0.05 + (0.9 * i) / stripes, 0.05 + (0.9 * (i + 1)) / stripes, 1.8, PLINTH + 2.7, PLINTH + 2.95, i % 2 ? '#F4EFE6' : trim);
      }
      front(0.1, 0.9, 0.25, top + 0.3, top + 1.5, pick(['#F2C230', '#D9482B', '#1F4E9C', '#2E8B57', '#F4EFE6'], s >>> 6), 0);
      if (b.kind === 'buka') {
        // Tables and benches out front.
        for (const t of [0.25, 0.75]) {
          front(t - 0.08, t + 0.08, 1.2, 0, 0.8, '#A86B3C', 2.6);
          front(t - 0.1, t + 0.1, 0.4, 0, 0.45, '#6B4423', 4.1);
        }
      }
      break;
    }
  }

  // Square water tanks on stands on some apartment and classroom roofs.
  if (['apartment', 'classroom', 'faculty'].includes(b.kind) && feature(5)) {
    const tx = feature(6) ? roofRect.x0 + 2.5 : roofRect.x1 - 2.5;
    const tz = feature(7) ? roofRect.z0 + 2.5 : roofRect.z1 - 2.5;
    for (const [dx, dz] of [
      [-0.8, -0.8],
      [0.8, -0.8],
      [-0.8, 0.8],
      [0.8, 0.8],
    ] as const) {
      box(plain, tx + dx - 0.1, roofY + 0.35, tz + dz - 0.1, tx + dx + 0.1, roofY + 1.6, tz + dz + 0.1, '#5B6470');
    }
    box(plain, tx - 1.1, roofY + 1.6, tz - 1.1, tx + 1.1, roofY + 3.2, tz + 1.1, DARK);
  }
}

/** Sports field: pitch, lines, goals and a small stand. */
function buildField(plain: Acc, b: MapBuilding) {
  const p = b.plot;
  const r = { x0: p.x0 + 3, z0: p.z0 + 3, x1: p.x1 - 3, z1: p.z1 - 3 };
  box(plain, r.x0, 0, r.z0, r.x1, 0.12, r.z1, '#4FAE5A');
  const L = '#F4F7EE';
  const y = 0.14;
  box(plain, r.x0 + 2, 0.12, r.z0 + 2, r.x1 - 2, y, r.z0 + 2.3, L);
  box(plain, r.x0 + 2, 0.12, r.z1 - 2.3, r.x1 - 2, y, r.z1 - 2, L);
  box(plain, r.x0 + 2, 0.12, r.z0 + 2, r.x0 + 2.3, y, r.z1 - 2, L);
  box(plain, r.x1 - 2.3, 0.12, r.z0 + 2, r.x1 - 2, y, r.z1 - 2, L);
  const cx = (r.x0 + r.x1) / 2;
  const cz = (r.z0 + r.z1) / 2;
  const wide = r.x1 - r.x0 >= r.z1 - r.z0;
  if (wide) box(plain, cx - 0.15, 0.12, r.z0 + 2, cx + 0.15, y, r.z1 - 2, L);
  else box(plain, r.x0 + 2, 0.12, cz - 0.15, r.x1 - 2, y, cz + 0.15, L);
  box(plain, cx - 4, 0.12, cz - 4, cx + 4, y, cz + 4, '#5DBA66');
  // Goals at both ends.
  for (const e of [-1, 1]) {
    if (wide) {
      const gx = e < 0 ? r.x0 + 2 : r.x1 - 2;
      box(plain, gx - 0.15, 0, cz - 3.7, gx + 0.15, 2.4, cz - 3.4, '#FFFFFF');
      box(plain, gx - 0.15, 0, cz + 3.4, gx + 0.15, 2.4, cz + 3.7, '#FFFFFF');
      box(plain, gx - 0.15, 2.2, cz - 3.7, gx + 0.15, 2.5, cz + 3.7, '#FFFFFF');
    } else {
      const gz = e < 0 ? r.z0 + 2 : r.z1 - 2;
      box(plain, cx - 3.7, 0, gz - 0.15, cx - 3.4, 2.4, gz + 0.15, '#FFFFFF');
      box(plain, cx + 3.4, 0, gz - 0.15, cx + 3.7, 2.4, gz + 0.15, '#FFFFFF');
      box(plain, cx - 3.7, 2.2, gz - 0.15, cx + 3.7, 2.5, gz + 0.15, '#FFFFFF');
    }
  }
  // A stepped stand along one long side.
  for (let i = 0; i < 3; i++) {
    if (wide) box(plain, cx - 12, 0, p.z1 - 2.6 + i * 0.8, cx + 12, 0.6 + i * 0.6, p.z1 - 1.8 + i * 0.8, i % 2 ? '#3F6E9E' : '#C9C2B4');
    else box(plain, p.x1 - 2.6 + i * 0.8, 0, cz - 12, p.x1 - 1.8 + i * 0.8, 0.6 + i * 0.6, cz + 12, i % 2 ? '#3F6E9E' : '#C9C2B4');
  }
}

/** Market: paved floor, rows of stalls with coloured roofs, and goods on the counters. */
function buildMarket(plain: Acc, b: MapBuilding) {
  const p = b.plot;
  const r = { x0: p.x0 + 2, z0: p.z0 + 2, x1: p.x1 - 2, z1: p.z1 - 2 };
  box(plain, r.x0, 0, r.z0, r.x1, 0.15, r.z1, '#D8CBB0');
  const ROOFS = ['#E2683C', '#F2C230', '#2F7FC1', '#2E8B57', '#D9482B', '#8E3B8A'];
  const GOODS = ['#E8742A', '#F2C230', '#5DBA66', '#D9482B', '#F4EFE6'];
  let i = 0;
  for (let x = r.x0 + 1; x + 4 <= r.x1; x += 5.5) {
    for (let z = r.z0 + 1; z + 3 <= r.z1; z += 5) {
      box(plain, x, 0.15, z + 1.6, x + 4, 1.1, z + 2.6, '#A86B3C');
      for (let g = 0; g < 3; g++) box(plain, x + 0.4 + g * 1.2, 1.1, z + 1.8, x + 1.2 + g * 1.2, 1.5, z + 2.4, GOODS[(i + g) % GOODS.length]!);
      for (const [px, pz] of [
        [x, z],
        [x + 4, z],
        [x, z + 3],
        [x + 4, z + 3],
      ] as const) {
        box(plain, px - 0.08, 0.15, pz - 0.08, px + 0.08, 2.6, pz + 0.08, '#5B4636');
      }
      box(plain, x - 0.3, 2.6, z - 0.3, x + 4.3, 2.8, z + 3.3, ROOFS[i % ROOFS.length]!);
      i++;
    }
  }
}

/** Keke stop: shelter, bench, sign, and parked kekes. */
function buildKekeStop(plain: Acc, b: MapBuilding) {
  const p = b.plot;
  const cx = (p.x0 + p.x1) / 2;
  const cz = (p.z0 + p.z1) / 2;
  const vertical = p.z1 - p.z0 > p.x1 - p.x0;
  box(plain, p.x0 + 1, 0, p.z0 + 1, p.x1 - 1, 0.15, p.z1 - 1, '#8A919B');
  const sw = vertical ? [2.5, 6] : [6, 2.5];
  for (const [dx, dz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    box(plain, cx + (dx * sw[0]!) / 2 - 0.1, 0.15, cz + (dz * sw[1]!) / 2 - 0.1, cx + (dx * sw[0]!) / 2 + 0.1, 2.8, cz + (dz * sw[1]!) / 2 + 0.1, '#3A3F45');
  }
  box(plain, cx - sw[0]! / 2 - 0.3, 2.8, cz - sw[1]! / 2 - 0.3, cx + sw[0]! / 2 + 0.3, 3.05, cz + sw[1]! / 2 + 0.3, '#2F7FC1');
  box(plain, cx - sw[0]! / 3, 0.15, cz - sw[1]! / 3, cx + sw[0]! / 3, 0.6, cz + sw[1]! / 3, '#A86B3C');
  // Kekes (tricycle taxis): yellow body, black roof, three wheels.
  const n = Math.max(1, Math.floor(Math.max(p.x1 - p.x0, p.z1 - p.z0) / 12));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const kx = vertical ? p.x1 - 2.2 : p.x0 + t * (p.x1 - p.x0);
    const kz = vertical ? p.z0 + t * (p.z1 - p.z0) : p.z1 - 2.2;
    const [hw, hd] = vertical ? [0.75, 1.3] : [1.3, 0.75];
    box(plain, kx - hw, 0.45, kz - hd, kx + hw, 1.6, kz + hd, '#F2C230');
    box(plain, kx - hw, 0.75, kz - hd - 0.02, kx + hw, 0.95, kz + hd + 0.02, '#2E8B57');
    box(plain, kx - hw - 0.05, 1.9, kz - hd - 0.05, kx + hw + 0.05, 2.05, kz + hd + 0.05, '#1B1E22');
    box(plain, kx - hw + 0.1, 1.6, kz - hd + 0.1, kx - hw + 0.2, 1.9, kz - hd + 0.2, '#1B1E22');
    box(plain, kx + hw - 0.2, 1.6, kz + hd - 0.2, kx + hw - 0.1, 1.9, kz + hd - 0.1, '#1B1E22');
    for (const [wx, wz] of vertical
      ? ([
          [-0.8, 0.9],
          [0.8, 0.9],
          [0, -1.1],
        ] as const)
      : ([
          [0.9, -0.8],
          [0.9, 0.8],
          [-1.1, 0],
        ] as const)) {
      box(plain, kx + wx - 0.25, 0, kz + wz - 0.25, kx + wx + 0.25, 0.5, kz + wz + 0.25, '#1B1E22');
    }
  }
  box(plain, cx + sw[0]! / 2 + 1, 0, cz - 0.1, cx + sw[0]! / 2 + 1.2, 3.4, cz + 0.1, '#3A3F45');
  box(plain, cx + sw[0]! / 2 + 0.5, 3.4, cz - 0.6, cx + sw[0]! / 2 + 1.7, 4.4, cz + 0.6, '#F5B83D');
}

/** Gate over the road: pillars either side, a beam across, and a guard post. */
function buildGate(plain: Acc, b: MapBuilding) {
  const p = b.plot;
  const { x, y } = b.cells;
  // Which way does the road run through the gate square?
  const northSouth = isRoad(x, y - 1) || isRoad(x, y + 1);
  const cx = (p.x0 + p.x1) / 2;
  const cz = (p.z0 + p.z1) / 2;
  const half = 5.5;
  const pil = (px: number, pz: number) => {
    box(plain, px - 0.9, 0, pz - 0.9, px + 0.9, 6.5, pz + 0.9, '#E8E0D0');
    box(plain, px - 1.1, 6.5, pz - 1.1, px + 1.1, 6.9, pz + 1.1, '#1F4E9C');
  };
  if (northSouth) {
    pil(cx - half, cz);
    pil(cx + half, cz);
    box(plain, cx - half, 6.9, cz - 0.6, cx + half, 8.1, cz + 0.6, '#1F4E9C');
    box(plain, cx - half, 6.6, cz - 0.62, cx + half, 6.9, cz + 0.62, '#F5B83D');
    box(plain, cx + half + 1.5, 0, cz - 1.5, cx + half + 4.5, 2.8, cz + 1.5, '#E8E0D0', '#B5543C');
  } else {
    pil(cx, cz - half);
    pil(cx, cz + half);
    box(plain, cx - 0.6, 6.9, cz - half, cx + 0.6, 8.1, cz + half, '#1F4E9C');
    box(plain, cx - 0.62, 6.6, cz - half, cx + 0.62, 6.9, cz + half, '#F5B83D');
    box(plain, cx - 1.5, 0, cz + half + 1.5, cx + 1.5, 2.8, cz + half + 4.5, '#E8E0D0', '#B5543C');
  }
}

// ---------- building it all ----------

interface Built {
  walls: Array<{ style: WindowStyle; geometry: THREE.BufferGeometry; ranges: Range[]; base: Float32Array }>;
  plain: { geometry: THREE.BufferGeometry; ranges: Range[]; base: Float32Array } | null;
  /** Roof height of each building, for labels. */
  heights: Map<string, number>;
}

function buildAll(): Built {
  const wallAcc = Object.fromEntries(STYLES.map((s) => [s, new Acc()])) as Record<WindowStyle, Acc>;
  const plain = new Acc();
  const heights = new Map<string, number>();
  for (const b of buildings) {
    if (b.kind === 'trees') continue;
    for (const a of [...Object.values(wallAcc), plain]) a.begin(b.id);
    if (b.kind === 'field') buildField(plain, b);
    else if (b.kind === 'market') buildMarket(plain, b);
    else if (b.kind === 'busstop') buildKekeStop(plain, b);
    else if (b.kind === 'gate') buildGate(plain, b);
    else {
      // The block nearest the door point gets the door.
      let doorBlock = 0;
      let best = Infinity;
      b.blocks.forEach((k, i) => {
        const cx = Math.max(k.rect.x0, Math.min(b.door[0], k.rect.x1));
        const cz = Math.max(k.rect.z0, Math.min(b.door[1], k.rect.z1));
        const dd = Math.hypot(cx - b.door[0], cz - b.door[1]);
        if (dd < best) {
          best = dd;
          doorBlock = i;
        }
      });
      b.blocks.forEach((k, i) => buildBlock(wallAcc, plain, b, k, i === doorBlock));
    }
    for (const a of [...Object.values(wallAcc), plain]) a.end();
    const pal = PALETTES[b.kind];
    const maxFloors = Math.max(0, ...b.blocks.map((k) => k.floors));
    heights.set(b.id, pal ? 0.45 + maxFloors * pal.floorH[1] + 2 : 4);
  }
  const walls = STYLES.flatMap((style) => {
    const g = wallAcc[style].geometry(true);
    return g ? [{ style, geometry: g, ranges: wallAcc[style].ranges, base: (g.getAttribute('color').array as Float32Array).slice() }] : [];
  });
  const pg = plain.geometry(false);
  return {
    walls,
    plain: pg ? { geometry: pg, ranges: plain.ranges, base: (pg.getAttribute('color').array as Float32Array).slice() } : null,
    heights,
  };
}

let cache: Built | null = null;
export function campusGeometry(): Built {
  cache ??= buildAll();
  return cache;
}

/** Which building a tapped triangle belongs to. */
function buildingAt(ranges: Range[], faceIndex: number): string | null {
  const v = faceIndex * 3;
  let lo = 0;
  let hi = ranges.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const r = ranges[mid]!;
    if (v < r.start) hi = mid - 1;
    else if (v >= r.start + r.count) lo = mid + 1;
    else return r.id;
  }
  return null;
}

function applyDimming(geometry: THREE.BufferGeometry, ranges: Range[], base: Float32Array, dimmed: Set<string>) {
  const attr = geometry.getAttribute('color') as THREE.BufferAttribute;
  const arr = attr.array as Float32Array;
  for (const r of ranges) {
    const f = dimmed.has(r.id) ? 0.55 : 1;
    for (let i = r.start * 3; i < (r.start + r.count) * 3; i++) arr[i] = base[i]! * f;
  }
  attr.needsUpdate = true;
}

export function CampusBuildings() {
  const built = useMemo(campusGeometry, []);
  const game = useGameStore((s) => s.game);
  const tapPlace = useGameStore((s) => s.tapPlace);

  // Game places with nothing open this slot look dimmed.
  const dimmed = useMemo(() => {
    const set = new Set<string>();
    if (!game) return set;
    for (const place of PLACES) if (place.enterable && !placeHasSomethingNow(game, place.id)) set.add(place.buildingId);
    return set;
  }, [game]);

  useEffect(() => {
    for (const w of built.walls) applyDimming(w.geometry, w.ranges, w.base, dimmed);
    if (built.plain) applyDimming(built.plain.geometry, built.plain.ranges, built.plain.base, dimmed);
  }, [built, dimmed]);

  const onClick = (ranges: Range[]) => (e: ThreeEvent<MouseEvent>) => {
    if (gesture.moved || e.delta > 10 || e.faceIndex == null) return;
    const id = buildingAt(ranges, e.faceIndex);
    const place = id ? getPlace(id) : undefined;
    if (!place) return; // gardens: not tappable
    e.stopPropagation();
    // At its door already: go in. Otherwise the keke / cab / walk menu opens.
    tapPlace(place.id, useGameStore.getState().nearbyPlaceId === place.id);
  };

  return (
    <group>
      {built.walls.map((w) => (
        <mesh key={w.style} geometry={w.geometry} material={wallMaterials[w.style]} onClick={onClick(w.ranges)} />
      ))}
      {built.plain && <mesh geometry={built.plain.geometry} material={plainMaterial} onClick={onClick(built.plain.ranges)} />}
    </group>
  );
}
