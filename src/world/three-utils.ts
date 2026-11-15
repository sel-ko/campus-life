// Shared building blocks for the 3D world: cached geometries and materials,
// a "parts" builder that merges many small shapes into a few meshes, and
// canvas-texture labels. Caching means two buildings with the same shapes
// share memory on the GPU.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ---------- geometry ----------

const geoCache = new Map<string, THREE.BufferGeometry>();
function cached(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
}

/** A box with bevelled, smoothly shaded edges (same method as the reference
 *  characters file). `seg` controls smoothness; 4 is plenty at map scale. */
export function roundedBox(w: number, h: number, d: number, r: number, seg = 4): THREE.BufferGeometry {
  return cached(`rb:${w}:${h}:${d}:${r}:${seg}`, () => {
    const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const nor = g.attributes.normal as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    const c = new THREE.Vector3();
    const n = new THREE.Vector3();
    const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      c.set(clamp(v.x, -w / 2 + r, w / 2 - r), clamp(v.y, -h / 2 + r, h / 2 - r), clamp(v.z, -d / 2 + r, d / 2 - r));
      n.copy(v).sub(c);
      if (n.lengthSq() < 1e-10) n.fromBufferAttribute(nor, i);
      else n.normalize();
      pos.setXYZ(i, c.x + n.x * r, c.y + n.y * r, c.z + n.z * r);
      nor.setXYZ(i, n.x, n.y, n.z);
    }
    return g;
  });
}

export function box(w: number, h: number, d: number): THREE.BufferGeometry {
  return cached(`b:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d));
}

export function cylinder(rt: number, rb: number, h: number, seg: number): THREE.BufferGeometry {
  return cached(`c:${rt}:${rb}:${h}:${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));
}

export function ico(r: number, detail: number): THREE.BufferGeometry {
  return cached(`i:${r}:${detail}`, () => new THREE.IcosahedronGeometry(r, detail));
}

export function torus(r: number, tube: number): THREE.BufferGeometry {
  return cached(`t:${r}:${tube}`, () => new THREE.TorusGeometry(r, tube, 6, 12));
}

/** A triangular prism lying along X: a gable roof. */
export function gableRoof(w: number, h: number, d: number): THREE.BufferGeometry {
  return cached(`roof:${w}:${h}:${d}`, () => {
    const g = new THREE.CylinderGeometry(1, 1, w, 3, 1);
    g.rotateZ(Math.PI / 2); // length now runs along X
    g.rotateX(-Math.PI / 2); // point the triangle's tip up
    g.computeBoundingBox();
    const bb = g.boundingBox!;
    g.translate(0, -bb.min.y, 0);
    g.scale(1, h / (bb.max.y - bb.min.y), d / (bb.max.z - bb.min.z));
    return g;
  });
}

// ---------- materials ----------

/** Special colour name for windows: they glow at night. */
export const WINDOW = 'window';

const matCache = new Map<string, THREE.Material>();
const DIM = 0.42;

/** Window materials, one normal and one dimmed; their glow is set per time of day. */
export const windowMaterials = {
  normal: new THREE.MeshLambertMaterial({ color: '#BFE3F2', emissive: '#FFD27A', emissiveIntensity: 0 }),
  dim: new THREE.MeshLambertMaterial({ color: new THREE.Color('#BFE3F2').multiplyScalar(DIM), emissive: '#FFD27A', emissiveIntensity: 0 }),
};

export function setWindowGlow(intensity: number): void {
  windowMaterials.normal.emissiveIntensity = intensity;
  windowMaterials.dim.emissiveIntensity = intensity * 0.3;
}

/** One shared Lambert material per colour (cheaper than PBR on phones). */
export function material(color: string, flat = false, dim = false): THREE.Material {
  if (color === WINDOW) return dim ? windowMaterials.dim : windowMaterials.normal;
  const key = `${color}:${flat ? 'f' : 's'}:${dim ? 'd' : ''}`;
  let m = matCache.get(key);
  if (!m) {
    const c = new THREE.Color(color);
    if (dim) {
      // Darker and greyer, so closed buildings read as "not now".
      const grey = (c.r + c.g + c.b) / 3;
      c.lerp(new THREE.Color(grey, grey, grey), 0.5).multiplyScalar(DIM + 0.1);
    }
    m = new THREE.MeshLambertMaterial({ color: c, flatShading: flat });
    matCache.set(key, m);
  }
  return m;
}

export function shade(color: string, f: number): string {
  return `#${new THREE.Color(color).multiplyScalar(f).getHexString()}`;
}

// ---------- parts builder ----------

export interface MergedPart {
  geometry: THREE.BufferGeometry;
  color: string;
  flat: boolean;
}

interface Part {
  geo: THREE.BufferGeometry;
  color: string;
  flat: boolean;
  matrix: THREE.Matrix4;
}

const tmpEuler = new THREE.Euler();
const tmpQuat = new THREE.Quaternion();
const tmpPos = new THREE.Vector3();
const ONE = new THREE.Vector3(1, 1, 1);

/**
 * Collects shapes in local coordinates, then merges everything of the same
 * colour into one geometry. 40 shapes in 6 colours become 6 meshes.
 */
export class Parts {
  private parts: Part[] = [];

  add(
    geo: THREE.BufferGeometry,
    color: string,
    x = 0,
    y = 0,
    z = 0,
    rot: [number, number, number] = [0, 0, 0],
    flat = false,
  ): this {
    tmpEuler.set(rot[0], rot[1], rot[2]);
    tmpQuat.setFromEuler(tmpEuler);
    tmpPos.set(x, y, z);
    this.parts.push({ geo, color, flat, matrix: new THREE.Matrix4().compose(tmpPos, tmpQuat, ONE) });
    return this;
  }

  /** The raw shapes, for mergeWithVertexColours. */
  list(): ReadonlyArray<Part> {
    return this.parts;
  }

  merge(): MergedPart[] {
    const groups = new Map<string, Part[]>();
    for (const p of this.parts) {
      const key = `${p.color}|${p.flat}`;
      const list = groups.get(key) ?? [];
      list.push(p);
      groups.set(key, list);
    }
    const out: MergedPart[] = [];
    for (const list of groups.values()) {
      const geos = list.map((p) => {
        // Non-indexed copies so boxes, cylinders and icosahedrons can merge.
        const g = (p.geo.index ? p.geo.toNonIndexed() : p.geo.clone()).applyMatrix4(p.matrix);
        // Keep only the attributes every shape has.
        for (const name of Object.keys(g.attributes)) {
          if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
        }
        return g;
      });
      const merged = mergeGeometries(geos, false);
      geos.forEach((g) => g.dispose());
      if (merged) {
        merged.computeBoundingSphere();
        out.push({ geometry: merged, color: list[0]!.color, flat: list[0]!.flat });
      }
    }
    return out;
  }
}

/** Shared materials for meshes that carry their own colours per vertex. */
export const vertexColourMaterials = {
  smooth: new THREE.MeshLambertMaterial({ vertexColors: true }),
  flat: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
};

/**
 * Like Parts.merge, but bakes each shape's colour into the geometry so a whole
 * group needs only two draw calls (smooth shapes and flat shapes), whatever
 * its colours. Used for characters.
 */
export function mergeWithVertexColours(parts: Parts): { smooth: THREE.BufferGeometry | null; flat: THREE.BufferGeometry | null } {
  const out = { smooth: null as THREE.BufferGeometry | null, flat: null as THREE.BufferGeometry | null };
  const c = new THREE.Color();
  for (const flat of [false, true]) {
    const geos = parts
      .list()
      .filter((p) => p.flat === flat)
      .map((p) => {
        const g = (p.geo.index ? p.geo.toNonIndexed() : p.geo.clone()).applyMatrix4(p.matrix);
        for (const name of Object.keys(g.attributes)) {
          if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
        }
        c.set(p.color);
        const n = g.attributes.position!.count;
        const colours = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) colours.set([c.r, c.g, c.b], i * 3);
        g.setAttribute('color', new THREE.BufferAttribute(colours, 3));
        return g;
      });
    if (geos.length) {
      const merged = mergeGeometries(geos, false);
      geos.forEach((g) => g.dispose());
      if (merged) merged.computeBoundingSphere();
      out[flat ? 'flat' : 'smooth'] = merged;
    }
  }
  return out;
}

// ---------- labels ----------

const labelCache = new Map<string, { texture: THREE.CanvasTexture; aspect: number }>();

/** A rounded name tag drawn on a canvas, used as a sprite texture. */
export function labelTexture(text: string): { texture: THREE.CanvasTexture; aspect: number } {
  let entry = labelCache.get(text);
  if (entry) return entry;
  const scale = 2;
  const font = `700 ${28 * scale}px system-ui, "Segoe UI", Roboto, sans-serif`;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  ctx.font = font;
  const padX = 18 * scale;
  const w = Math.ceil(ctx.measureText(text).width + padX * 2);
  const h = 52 * scale;
  canvas.width = w;
  canvas.height = h;
  ctx.font = font;
  ctx.fillStyle = 'rgba(20, 32, 43, 0.88)';
  const r = h / 2;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(w, 0, w, h, r);
  ctx.arcTo(w, h, 0, h, r);
  ctx.arcTo(0, h, 0, 0, r);
  ctx.arcTo(0, 0, w, 0, r);
  ctx.fill();
  ctx.fillStyle = '#F2EEE3';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + 2 * scale);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 1;
  entry = { texture, aspect: w / h };
  labelCache.set(text, entry);
  return entry;
}

/** A simple painted sign (for billboards and stall boards). */
export function signTexture(lines: string[], bg: string, fg: string, w = 512, h = 256): THREE.CanvasTexture {
  const key = `sign:${lines.join('|')}:${bg}:${fg}:${w}x${h}`;
  const hit = labelCache.get(key);
  if (hit) return hit.texture;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lineH = h / (lines.length + 1);
  lines.forEach((line, i) => {
    ctx.font = `${i === 0 ? 800 : 600} ${Math.round(lineH * (i === 0 ? 0.62 : 0.45))}px system-ui, sans-serif`;
    ctx.fillText(line, w / 2, lineH * (i + 1));
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  labelCache.set(key, { texture, aspect: w / h });
  return texture;
}

/** Repeatable pseudo-random numbers, so trees land in the same place every time. */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
