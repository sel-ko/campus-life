import { describe, expect, it } from 'vitest';
import { PLACES, getPlace } from '../content/places';
import { travelOptions } from '../game/interactions';
import { getFee } from '../game/money';
import { signAll, testGame } from '../game/testkit';
import { LANDING_ZOOM, MAP_ZOOM, clampToCampus, zoomDistance } from './CameraRig';

describe('map zoom', () => {
  it('runs from the closest view (0%) to the whole campus (100%)', () => {
    expect(zoomDistance(0, 1000)).toBeCloseTo(40);
    expect(zoomDistance(1, 1000)).toBeCloseTo(1000);
    const map = zoomDistance(MAP_ZOOM, 1000);
    const landing = zoomDistance(LANDING_ZOOM, 1000);
    expect(landing).toBeLessThan(map);
    expect(map).toBeLessThan(1000);
  });

  it('keeps the view over the campus while panning', () => {
    const b = { minX: -200, maxX: 200, minZ: -150, maxZ: 150 };
    const view = { dist: 100, yaw: 0, tilt: Math.PI / 3, fov: 45, aspect: 0.5 };
    const c = clampToCampus({ x: 5000, z: -5000 }, view, b);
    expect(c.x).toBeLessThan(200);
    expect(c.z).toBeGreaterThan(-150);
    // Zoomed out wider than the campus: it stays centred.
    expect(clampToCampus({ x: 90, z: 90 }, { ...view, dist: 5000 }, b)).toEqual({ x: 0, z: 0 });
  });
});

describe('close-by travel', () => {
  it('offers trek and a cab, but no keke', () => {
    const d = structuredClone(testGame());
    signAll(d);
    getFee(d, 'acceptance')!.paid = true;
    d.money = 100_000;
    const from = getPlace(d.location.placeId)!;
    const near = PLACES.find((p) => p.id !== from.id && p.sectionId === from.sectionId && Math.hypot(p.position[0] - from.position[0], p.position[1] - from.position[1]) < 70);
    expect(near).toBeDefined();
    const opts = travelOptions(d, near!.id);
    expect(opts.find((o) => o.mode === 'walk')).toMatchObject({ label: 'Trek', available: true });
    expect(opts.find((o) => o.mode === 'keke')?.available).toBe(false);
    expect(opts.find((o) => o.mode === 'cab')?.available).toBe(true);
  });
});
