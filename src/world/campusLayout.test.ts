import { describe, expect, it } from 'vitest';
import * as data from '../content/campus-data';
import {
  WORLD_SCALE,
  buildCampusLayout,
  cleanFootprint,
  floorsFor,
  isRectangular,
  pointInPolygon,
  selfIntersects,
  shrinkLinkRoad,
  shrinkPoint,
  zoneOverlaps,
  zoneShift,
  type Pt,
} from './campusLayout';

const E = data.zoneCentres.estate;
const toScene = (p: Pt): Pt => [(p[0] - E[0]) * WORLD_SCALE, (p[1] - E[1]) * WORLD_SCALE];
const close = (a: Pt, b: Pt, digits = 6) => {
  expect(a[0]).toBeCloseTo(b[0], digits);
  expect(a[1]).toBeCloseTo(b[1], digits);
};

describe('GAP_SHRINK', () => {
  it('of 1 leaves every position unchanged', () => {
    for (const z of ['ps', 'ts', 'estate'] as const) close(zoneShift(z, 1), [0, 0]);
    const layout = buildCampusLayout({ gapShrink: 1 });
    for (const b of data.buildings) {
      close(layout.buildings.find((l) => l.id === b.id)!.center, toScene(b.center));
    }
    data.roads.forEach((r, i) => r.points.forEach((p, j) => close(layout.roads[i]!.points[j]!, toScene(p))));
    for (const z of ['ps', 'ts', 'estate'] as const) close(layout.zoneCentres[z], toScene(data.zoneCentres[z]));
  });

  it('of 0.35 pulls the ps and ts centres to 35% of their distance from the estate', () => {
    const layout = buildCampusLayout({ gapShrink: 0.35, clearance: 0 });
    for (const z of ['ps', 'ts'] as const) {
      const c = data.zoneCentres[z];
      const expected: Pt = [(c[0] - E[0]) * 0.35 * WORLD_SCALE, (c[1] - E[1]) * 0.35 * WORLD_SCALE];
      close(layout.zoneCentres[z], expected);
    }
  });

  it('leaves the estate alone', () => {
    const a = buildCampusLayout({ gapShrink: 0.35, clearance: 0 });
    const b = buildCampusLayout({ gapShrink: 1 });
    close(a.zoneCentres.estate, [0, 0]);
    for (const building of a.buildings.filter((x) => x.zone === 'estate')) {
      close(building.center, b.buildings.find((x) => x.id === building.id)!.center);
    }
  });

  it('keeps each zone the same shape and size', () => {
    const lib = data.buildings.find((b) => b.id === 'ps-LIB')!;
    const shrunk = lib.footprint.map((p) => shrinkPoint(p, 'ps', 0.35));
    for (let i = 1; i < shrunk.length; i++) {
      expect(shrunk[i]![0] - shrunk[0]![0]).toBeCloseTo(lib.footprint[i]![0] - lib.footprint[0]![0], 6);
      expect(shrunk[i]![1] - shrunk[0]![1]).toBeCloseTo(lib.footprint[i]![1] - lib.footprint[0]![1], 6);
    }
  });

  it('stretches link roads so they still reach both zones', () => {
    for (const road of data.roads.filter((r) => r.zone === 'link')) {
      const moved = shrinkLinkRoad(road.points, 0.35);
      const ends = [moved[0]!, moved[moved.length - 1]!];
      const original = [road.points[0]!, road.points[road.points.length - 1]!];
      // One end stays (estate), the other moves exactly with its zone.
      const stayed = ends.findIndex((e, i) => Math.hypot(e[0] - original[i]![0], e[1] - original[i]![1]) < 1e-6);
      expect(stayed).toBeGreaterThanOrEqual(0);
      const other = 1 - stayed;
      const zone = Math.hypot(original[other]![0] - data.zoneCentres.ps[0], original[other]![1] - data.zoneCentres.ps[1]) <
        Math.hypot(original[other]![0] - data.zoneCentres.ts[0], original[other]![1] - data.zoneCentres.ts[1])
        ? 'ps'
        : 'ts';
      close(ends[other]!, shrinkPoint(original[other]!, zone, 0.35));
    }
  });
});

describe('WORLD_SCALE', () => {
  it('is one scene unit per metre, so PS is its real 561 m wide', () => {
    expect(WORLD_SCALE).toBe(1);
    const layout = buildCampusLayout({ gapShrink: 1 });
    const xs = layout.buildings.filter((b) => b.zone === 'ps').flatMap((b) => b.footprint.map((p) => p[0]));
    const width = Math.max(...xs) - Math.min(...xs);
    expect(width).toBeGreaterThan(550);
    expect(width).toBeLessThan(570);
  });
});

describe('zone clearance', () => {
  it('pulls zones in as far as it can without any buildings overlapping', () => {
    const layout = buildCampusLayout({ gapShrink: 0.35 });
    expect(zoneOverlaps(layout)).toEqual([]);
    // Closer than the 0.6 a single shared value needed.
    expect(layout.zoneGap.ps).toBeLessThan(0.6);
    expect(layout.zoneGap.ts).toBeLessThan(0.6);
    expect(layout.zoneGap.estate).toBe(1);
  });

  it('never pushes a zone further than GAP_SHRINK asks', () => {
    const layout = buildCampusLayout({ gapShrink: 0.9 });
    expect(layout.zoneGap.ps).toBe(0.9);
    expect(layout.zoneGap.ts).toBe(0.9);
  });
});

describe('heights and doors', () => {
  it('makes rectangular buildings 3 storeys', () => {
    const square: Pt[] = [
      [0, 0],
      [30, 0],
      [30, 20],
      [0, 20],
    ];
    expect(isRectangular(square)).toBe(true);
    expect(isRectangular([[0, 0], [30, 0], [20, 20], [0, 20]])).toBe(false);
    expect(floorsFor({ id: 'x', kind: 'class', floors: 1 }, true)).toBe(3);
    expect(floorsFor({ id: 'x', kind: 'class', floors: 1 }, false)).toBe(2);
    expect(floorsFor({ id: 'x', kind: 'library', floors: 1 }, false)).toBe(3);
    expect(floorsFor({ id: 'x', kind: 'busstop', floors: 1 }, true)).toBe(0);
  });

  it('puts every door outside its building', () => {
    for (const b of buildCampusLayout().buildings) {
      expect(pointInPolygon(b.door, b.footprint), b.id).toBe(false);
    }
  });
});

describe('cleaning outlines', () => {
  it('drops duplicate and collinear points and fixes the winding', () => {
    // A square drawn clockwise with a duplicate and a point mid-edge.
    const raw: Pt[] = [
      [0, 0],
      [0, 0.1],
      [0, 10],
      [5, 10.05],
      [10, 10],
      [10, 0],
      [0, 0],
    ];
    const { points, usedFallback } = cleanFootprint(raw);
    expect(usedFallback).toBe(false);
    expect(points).toHaveLength(4);
    // Positive shoelace area in x/z.
    let a = 0;
    points.forEach((p, i) => {
      const q = points[(i + 1) % points.length]!;
      a += p[0] * q[1] - q[0] * p[1];
    });
    expect(a).toBeGreaterThan(0);
  });

  it('keeps an L shape as an L', () => {
    const L: Pt[] = [
      [0, 0],
      [20, 0],
      [20, 8],
      [8, 8],
      [8, 20],
      [0, 20],
    ];
    const { points, usedFallback } = cleanFootprint(L);
    expect(usedFallback).toBe(false);
    expect(points).toHaveLength(6);
  });

  it('falls back to the bounding rectangle for a self-crossing outline', () => {
    const bowtie: Pt[] = [
      [0, 0],
      [10, 10],
      [10, 0],
      [0, 10],
    ];
    expect(selfIntersects(bowtie)).toBe(true);
    const { points, usedFallback } = cleanFootprint(bowtie);
    expect(usedFallback).toBe(true);
    expect(points).toHaveLength(4);
    const xs = points.map((p) => p[0]);
    const zs = points.map((p) => p[1]);
    expect([Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]).toEqual([0, 10, 0, 10]);
  });

  it('falls back to centre and size when there are too few points', () => {
    const { points, usedFallback } = cleanFootprint([[5, 5]], [5, 5], [6, 4]);
    expect(usedFallback).toBe(true);
    const xs = points.map((p) => p[0]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(6);
  });

  it('gives every real building a usable outline', () => {
    const layout = buildCampusLayout();
    for (const b of layout.buildings) {
      expect(b.footprint.length, b.id).toBeGreaterThanOrEqual(3);
      expect(selfIntersects(b.footprint), b.id).toBe(false);
    }
  });
});

describe('overrides', () => {
  it('apply name, kind, floors and playable', () => {
    const layout = buildCampusLayout({ overrides: { 'ps-U1': { name: 'Business Centre', kind: 'special', floors: 2, playable: true } } });
    const b = layout.buildings.find((x) => x.id === 'ps-U1')!;
    expect(b).toMatchObject({ name: 'Business Centre', kind: 'special', floors: 2, playable: true });
    expect(layout.buildings.find((x) => x.id === 'ps-U2')!.playable).toBe(false);
  });
});
