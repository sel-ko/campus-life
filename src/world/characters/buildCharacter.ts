// Turns a CharacterLook into geometry. Ported from reference/characters.html
// with the same sizes and face. Shapes are sorted into five groups so the
// legs and arms can swing: body, left leg, right leg, left arm, right arm.
import type * as THREE from 'three';
import {
  Parts,
  box,
  cylinder,
  ico,
  mergeWithVertexColours,
  roundedBox,
  shade,
  torus,
} from '../three-utils';
import type { CharacterLook } from './look';

/** Head centre height and face depth, as in the reference. */
export const HY = 2.05;
export const FZ = 0.7;
/** Hip and shoulder pivots, where legs and arms rotate. */
export const HIP: [number, number] = [0.2, 0.68];
export const SHOULDER: [number, number] = [0.5, 1.3];
const SEG = 4;

type Rot = [number, number, number];

/** Helpers with the reference file's argument order. */
class Builder {
  constructor(public p: Parts) {}
  /** Bevelled, smooth box. */
  rbox(w: number, h: number, d: number, r: number, color: string, x = 0, y = 0, z = 0, rot?: Rot) {
    this.p.add(roundedBox(w, h, d, r, SEG), color, x, y, z, rot);
  }
  /** Sharp, flat-shaded box. */
  box(w: number, h: number, d: number, color: string, x = 0, y = 0, z = 0, rot?: Rot) {
    this.p.add(box(w, h, d), color, x, y, z, rot, true);
  }
  cyl(rt: number, rb: number, h: number, seg: number, color: string, x = 0, y = 0, z = 0) {
    this.p.add(cylinder(rt, rb, h, seg), color, x, y, z);
  }
  ico(r: number, detail: number, color: string, x = 0, y = 0, z = 0) {
    this.p.add(ico(r, detail), color, x, y, z, [0, 0, 0], true);
  }
}

export interface LimbGeometry {
  smooth: THREE.BufferGeometry | null;
  flat: THREE.BufferGeometry | null;
}

export interface CharacterModel {
  body: LimbGeometry;
  legs: [LimbGeometry, LimbGeometry];
  arms: [LimbGeometry, LimbGeometry];
  /** Sideways tilt of each arm (left, right). */
  armTilt: [number, number];
}

function head(b: Builder, look: CharacterLook) {
  const skin = look.skin;
  b.rbox(1.5, 1.4, 1.4, 0.17, skin, 0, HY, 0);
  b.rbox(0.3, 0.14, 0.3, 0.05, skin, 0, 1.36, 0);
  const dark = shade(skin, 0.8);
  for (const s of [-1, 1]) {
    b.box(0.27, 0.23, 0.04, '#FBF7EE', s * 0.34, HY + 0.05, FZ + 0.005);
    b.box(0.13, 0.16, 0.04, '#2A1810', s * 0.33, HY + 0.04, FZ + 0.02);
    b.box(0.04, 0.04, 0.04, '#FFFFFF', s * 0.33 + 0.035, HY + 0.085, FZ + 0.035);
    b.box(0.33, 0.07, 0.05, look.hairColor, s * 0.34, HY + 0.28, FZ + 0.01, [0, 0, -s * look.brow]);
    if (look.lashes) b.box(0.12, 0.05, 0.04, '#1B120D', s * 0.5, HY + 0.18, FZ + 0.012, [0, 0, s * 0.5]);
    b.rbox(0.13, 0.32, 0.24, 0.05, skin, s * 0.79, HY - 0.02, 0);
    b.box(0.03, 0.16, 0.1, dark, s * 0.855, HY - 0.02, 0.01);
    b.box(0.08, 0.06, 0.04, look.lip, s * 0.17, HY - 0.355, FZ + 0.01);
  }
  b.rbox(0.17, 0.15, 0.12, 0.04, dark, 0, HY - 0.13, FZ + 0.03);
  b.box(0.3, 0.06, 0.04, look.lip, 0, HY - 0.39, FZ + 0.01);
}

/** One arm, in the arm's own space (origin at the shoulder). */
function arm(b: Builder, sleeve: string, sleeveLen: number, skin: string) {
  b.rbox(0.25, sleeveLen, 0.29, 0.06, sleeve, 0, -sleeveLen / 2, 0);
  const rest = 0.44 - sleeveLen;
  if (rest > 0.02) b.rbox(0.21, rest + 0.06, 0.24, 0.05, skin, 0, -sleeveLen - rest / 2, 0);
  b.rbox(0.23, 0.18, 0.26, 0.07, skin, 0, -0.52, 0);
}

/** One leg with its shoe, in the leg's own space (origin at the hip). */
function leg(b: Builder, color: string, shoe: string, w = 0.34) {
  b.rbox(w, 0.52, w + 0.04, 0.06, color, 0, 0.42 - HIP[1], 0);
  b.rbox(w + 0.02, 0.2, 0.5, 0.07, shoe, 0, 0.1 - HIP[1], 0.06);
}

function hairCap(b: Builder, color: string, sideH: number, backH: number) {
  b.rbox(1.56, 0.3, 1.46, 0.1, color, 0, HY + 0.68, 0);
  b.box(1.46, 0.16, 0.06, color, 0, HY + 0.56, FZ + 0.012);
  for (const s of [-1, 1]) {
    b.box(0.06, sideH, 1.3, color, s * 0.755, HY + 0.62 - sideH / 2, -0.04);
    b.box(0.14, 0.26, 0.06, color, s * 0.66, HY + 0.38, FZ + 0.012);
  }
  b.box(1.46, backH, 0.06, color, 0, HY + 0.62 - backH / 2, -0.705);
}

function hair(b: Builder, look: CharacterLook) {
  const h = look.hairColor;
  const { accent, extra } = look.colors;
  const worn = look.accessories ?? {};
  const hat = !!(worn.cap || worn.beanie || worn.gele);
  // Puffs tuck under a beanie or a gele.
  const tucked = !!(worn.beanie || worn.gele);
  switch (look.hairStyle) {
    case 'fade':
      hairCap(b, h, 0.34, 0.75);
      b.rbox(1.1, 0.14, 1.0, 0.06, h, 0, HY + 0.86, -0.05);
      break;
    case 'beard-cap':
      for (const s of [-1, 1]) {
        b.box(0.06, 0.3, 1.3, h, s * 0.755, HY + 0.4, -0.04);
        b.box(0.06, 0.62, 0.34, h, s * 0.755, HY - 0.36, 0.5);
      }
      b.box(1.46, 0.5, 0.06, h, 0, HY + 0.3, -0.705);
      b.box(1.5, 0.15, 0.06, h, 0, HY - 0.62, FZ + 0.012);
      b.box(0.36, 0.07, 0.05, h, 0, HY - 0.28, FZ + 0.02);
      if (!hat) {
        b.rbox(1.44, 0.5, 1.36, 0.12, extra, 0, HY + 0.84, 0);
        b.rbox(1.5, 0.1, 1.42, 0.04, accent, 0, HY + 0.62, 0);
      }
      break;
    case 'puffs':
      hairCap(b, h, 0.3, 1.0);
      for (const s of [-1, 1]) {
        if (!tucked) {
          b.ico(0.5, 1, h, s * 0.72, HY + 1.0, -0.08);
          b.cyl(0.16, 0.16, 0.1, 8, accent, s * 0.5, HY + 0.8, -0.06);
        }
        b.p.add(torus(0.11, 0.03), accent, s * 0.82, HY - 0.27, 0.02, [0, Math.PI / 2, 0]);
      }
      break;
    case 'braids':
      hairCap(b, h, 0.3, 0.6);
      b.box(0.03, 0.02, 1.2, shade(look.skin, 0.9), 0, HY + 0.835, 0.05);
      for (let i = -4; i <= 4; i++) {
        const len = 1.75 - (Math.abs(i) % 2) * 0.12;
        b.box(0.13, len, 0.12, h, i * 0.165, HY + 0.7 - len / 2, -0.76);
      }
      for (const s of [-1, 1]) {
        b.box(0.12, 1.6, 0.12, h, s * 0.8, HY + 0.7 - 0.8, -0.55);
        b.box(0.12, 1.5, 0.12, h, s * 0.8, HY + 0.7 - 0.75, -0.32);
        b.box(0.11, 1.15, 0.11, h, s * 0.78, HY + 0.62 - 0.575, 0.52);
        b.box(0.13, 0.07, 0.13, accent, s * 0.78, HY - 0.45, 0.52);
        b.cyl(0.05, 0.05, 0.05, 8, accent, s * 0.82, HY - 0.22, 0.03);
      }
      break;
  }
}

/** Builds the outfit and returns sleeve length and arm tilts. */
function outfit(body: Builder, legL: Builder, legR: Builder, look: CharacterLook): { sleeve: number; tilt: [number, number] } {
  const { top, bottom, shoes, accent, extra } = look.colors;
  switch (look.outfit) {
    case 'hoodie':
      leg(legL, bottom, shoes);
      leg(legR, bottom, shoes);
      body.rbox(0.86, 0.78, 0.6, 0.12, top, 0, 0.98, 0);
      body.rbox(0.5, 0.2, 0.06, 0.03, shade(top, 0.82), 0, 0.8, 0.3);
      body.rbox(0.82, 0.3, 0.34, 0.1, top, 0, 1.36, -0.3);
      body.box(0.035, 0.26, 0.03, '#F1EFE8', -0.1, 1.16, 0.31);
      body.box(0.035, 0.26, 0.03, '#F1EFE8', 0.1, 1.16, 0.31);
      body.rbox(0.64, 0.62, 0.28, 0.08, accent, 0, 0.98, -0.44);
      body.rbox(0.36, 0.22, 0.06, 0.03, extra, 0, 0.86, -0.59);
      return { sleeve: 0.44, tilt: [0.42, 0.42] };
    case 'kaftan':
      leg(legL, bottom, shoes);
      leg(legR, bottom, shoes);
      body.rbox(0.9, 1.0, 0.62, 0.12, top, 0, 0.86, 0);
      body.box(0.14, 0.5, 0.03, accent, 0, 1.06, 0.312);
      body.box(0.38, 0.06, 0.03, accent, 0, 1.3, 0.3);
      body.box(0.86, 0.05, 0.03, accent, 0, 0.42, 0.312);
      return { sleeve: 0.44, tilt: [0.42, 0.42] };
    case 'tee-jeans':
      leg(legL, bottom, shoes, 0.38);
      leg(legR, bottom, shoes, 0.38);
      body.rbox(0.82, 0.26, 0.58, 0.08, bottom, 0, 0.7, 0);
      body.rbox(0.8, 0.6, 0.56, 0.12, top, 0, 1.08, 0);
      body.rbox(0.14, 0.46, 0.5, 0.05, extra, 0.86, 0.62, 0.02);
      body.box(0.04, 0.5, 0.05, extra, 0.72, 1.05, 0.02, [0, 0, 0.3]);
      return { sleeve: 0.2, tilt: [0.42, 0.5] };
    case 'gown':
      for (const l of [legL, legR]) {
        l.rbox(0.2, 0.26, 0.22, 0.05, look.skin, 0, 0.2 - HIP[1], 0);
        l.rbox(0.24, 0.12, 0.44, 0.05, shoes, 0, 0.06 - HIP[1], 0.06);
      }
      body.rbox(0.8, 0.62, 0.56, 0.12, top, 0, 1.07, 0);
      body.rbox(0.82, 0.12, 0.58, 0.04, extra, 0, 0.74, 0);
      body.cyl(0.42, 0.66, 0.44, 12, top, 0, 0.48, 0);
      body.cyl(0.66, 0.68, 0.07, 12, extra, 0, 0.24, 0);
      return { sleeve: 0.18, tilt: [0.42, 0.42] };
  }
}

/** Glasses, hats, bags and jewellery: simple shapes over the head and body. */
function accessories(b: Builder, armL: Builder, look: CharacterLook) {
  const worn = look.accessories ?? {};
  const { glasses, sunglasses, cap, beanie, gele, headphones, backpack, watch, earrings, necklace } = worn;

  const frames = glasses ?? sunglasses;
  if (frames) {
    for (const s of [-1, 1]) {
      const x = s * 0.34;
      const y = HY + 0.06;
      const z = FZ + 0.05;
      if (sunglasses) b.box(0.38, 0.27, 0.03, '#14171B', x, y - 0.01, z);
      b.box(0.42, 0.05, 0.05, frames, x, y + 0.15, z);
      b.box(0.42, 0.04, 0.05, frames, x, y - 0.15, z);
      b.box(0.05, 0.32, 0.05, frames, x - 0.19, y, z);
      b.box(0.05, 0.32, 0.05, frames, x + 0.19, y, z);
      // Arms back to the ears.
      b.box(0.04, 0.05, 0.72, frames, s * 0.79, y + 0.12, FZ - 0.32);
    }
    b.box(0.16, 0.05, 0.05, frames, 0, HY + 0.13, FZ + 0.05);
    if (sunglasses) b.box(0.08, 0.05, 0.02, '#5E6670', -0.42, HY + 0.12, FZ + 0.07);
  }

  if (cap) {
    b.rbox(1.62, 0.44, 1.52, 0.16, cap, 0, HY + 0.82, -0.02);
    b.rbox(1.24, 0.07, 0.62, 0.03, shade(cap, 0.78), 0, HY + 0.62, FZ + 0.24, [-0.08, 0, 0]);
    b.cyl(0.08, 0.08, 0.06, 8, shade(cap, 0.78), 0, HY + 1.05, -0.02);
  } else if (beanie) {
    b.rbox(1.62, 0.56, 1.54, 0.22, beanie, 0, HY + 0.8, 0);
    b.rbox(1.68, 0.18, 1.6, 0.07, shade(beanie, 0.8), 0, HY + 0.56, 0);
    b.ico(0.2, 1, shade(beanie, 1.15), 0, HY + 1.12, 0);
  } else if (gele) {
    const fold = shade(gele, 0.82);
    b.rbox(1.68, 0.56, 1.58, 0.2, gele, 0, HY + 0.82, -0.04);
    b.rbox(1.72, 0.12, 1.62, 0.05, fold, 0, HY + 0.6, -0.04);
    // The tall pleated fan at the back.
    for (let i = -3; i <= 3; i++) {
      b.rbox(0.36, 0.72, 0.1, 0.04, i % 2 ? gele : fold, i * 0.2, HY + 1.22 - Math.abs(i) * 0.05, -0.2 - Math.abs(i) * 0.06, [-0.35, i * 0.18, -i * 0.12]);
    }
    for (const s of [-1, 1]) b.rbox(0.42, 0.22, 0.5, 0.08, gele, s * 0.78, HY + 0.98, -0.45, [0, 0, s * 0.5]);
  }

  if (headphones) {
    const top = cap || beanie || gele ? HY + 1.1 : HY + 1.0;
    b.rbox(1.82, 0.1, 0.18, 0.04, headphones, 0, top, 0);
    for (const s of [-1, 1]) {
      b.rbox(0.1, top - HY - 0.1, 0.16, 0.04, headphones, s * 0.86, (top + HY + 0.1) / 2, 0);
      b.p.add(cylinder(0.25, 0.25, 0.16, 14), headphones, s * 0.9, HY - 0.02, 0, [0, 0, Math.PI / 2]);
      b.p.add(cylinder(0.18, 0.18, 0.04, 14), shade(headphones, 0.6), s * 0.99, HY - 0.02, 0, [0, 0, Math.PI / 2]);
    }
  }

  // The hoodie outfit already comes with its own backpack.
  if (backpack && look.outfit !== 'hoodie') {
    b.rbox(0.66, 0.66, 0.3, 0.09, backpack, 0, 1.0, -0.46);
    b.rbox(0.38, 0.24, 0.07, 0.03, shade(backpack, 0.78), 0, 0.86, -0.63);
    for (const s of [-1, 1]) b.box(0.08, 0.56, 0.04, shade(backpack, 0.78), s * 0.24, 1.08, 0.32);
  }

  if (watch) {
    armL.rbox(0.27, 0.08, 0.31, 0.02, watch, 0, -0.41, 0);
    armL.box(0.04, 0.12, 0.14, '#E9EDF1', -0.14, -0.41, 0);
  }

  if (earrings && look.hairStyle !== 'puffs') {
    for (const s of [-1, 1]) b.p.add(torus(0.1, 0.028), earrings, s * 0.83, HY - 0.26, 0.02, [0, Math.PI / 2, 0]);
  }

  if (necklace) {
    // A V of chain from the collar down to a pendant.
    for (const s of [-1, 1]) b.box(0.035, 0.24, 0.035, necklace, s * 0.075, 1.285, 0.32, [0, 0, -s * 0.72]);
    b.rbox(0.1, 0.13, 0.05, 0.02, necklace, 0, 1.15, 0.33);
  }
}

const cache = new Map<string, CharacterModel>();

/** Geometry for a look. Identical looks share one model. */
export function characterModel(look: CharacterLook): CharacterModel {
  const key = JSON.stringify(look);
  const hit = cache.get(key);
  if (hit) return hit;

  const parts = { body: new Parts(), legL: new Parts(), legR: new Parts(), armL: new Parts(), armR: new Parts() };
  const body = new Builder(parts.body);
  const { sleeve, tilt } = outfit(body, new Builder(parts.legL), new Builder(parts.legR), look);
  const sleeveColour = look.colors.top;
  const armL = new Builder(parts.armL);
  arm(armL, sleeveColour, sleeve, look.skin);
  arm(new Builder(parts.armR), sleeveColour, sleeve, look.skin);
  head(body, look);
  hair(body, look);
  accessories(body, armL, look);

  const model: CharacterModel = {
    body: mergeWithVertexColours(parts.body),
    legs: [mergeWithVertexColours(parts.legL), mergeWithVertexColours(parts.legR)],
    arms: [mergeWithVertexColours(parts.armL), mergeWithVertexColours(parts.armR)],
    armTilt: tilt,
  };
  cache.set(key, model);
  return model;
}
