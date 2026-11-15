import { describe, expect, it } from 'vitest';
import { campusPlaces } from '../../content/campusPlaces';
import { findPath, isBlocked, nearestDoor, nearestNode, roadGraph, zoneAt } from './navigation';

/** Nodes reachable from a start node. */
function reachable(start: number): Set<number> {
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    for (const n of roadGraph[queue.pop()!]!.next) {
      if (!seen.has(n)) {
        seen.add(n);
        queue.push(n);
      }
    }
  }
  return seen;
}

describe('road network', () => {
  it('joins the roads of all three sections into one network', () => {
    const home = campusPlaces.find((p) => p.type === 'hostel')!;
    const seen = reachable(nearestNode(home.position));
    for (const p of campusPlaces) {
      expect(seen.has(nearestNode(p.position)), p.id).toBe(true);
    }
  });

  it('finds a route from home to a PS classroom that ends at its door', () => {
    const home = campusPlaces.find((p) => p.type === 'hostel')!;
    const target = campusPlaces.find((p) => p.id === 'ps-C1')!;
    const path = findPath(home.position, target.position);
    expect(path.length).toBeGreaterThan(5);
    expect(path[path.length - 1]).toEqual(target.position);
    // Every step is a reasonable hop (no teleporting across the map).
    let prev = home.position;
    let longest = 0;
    for (const p of path) {
      longest = Math.max(longest, Math.hypot(p[0] - prev[0], p[1] - prev[1]));
      prev = p;
    }
    expect(longest).toBeLessThan(200);
  });

  it('knows which section a place is in', () => {
    for (const p of campusPlaces) expect(zoneAt(p.position[0], p.position[1]), p.id).toBe(p.siteId);
  });
});

describe('doors and walls', () => {
  it('lets the player stand at every door', () => {
    for (const p of campusPlaces) expect(isBlocked(p.position[0], p.position[1]), p.id).toBe(false);
  });

  it('finds the door you are standing at', () => {
    const p = campusPlaces.find((x) => x.type === 'library')!;
    expect(nearestDoor(p.position[0] + 1, p.position[1], 5)).toBe(p.id);
  });

  it('blocks walking into the middle of a building', () => {
    const lib = campusPlaces.find((x) => x.type === 'library')!;
    expect(lib.buildingId).toBeDefined();
  });
});
