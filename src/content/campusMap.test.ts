import { describe, expect, it } from 'vitest';
import { findPath, isBlocked, nearestDoor, nearestNode, roadGraph } from '../world/campus/navigation';
import { buildings, sections } from './campusMap';
import raw from './campus-layout.json';
import { BUILDING_ROLES } from './campus-overrides';
import { PLACES, freshersHall, hostels } from './places';

describe('the planner layout', () => {
  it('loads every section and building you drew', () => {
    expect(sections).toHaveLength(raw.sections.length);
    expect(buildings).toHaveLength(raw.items.length);
  });

  it('gives every building except gardens a role and a unique name', () => {
    const named = raw.items.filter((i) => i.kind !== 'trees');
    for (const i of named) expect(BUILDING_ROLES[i.id], i.id).toBeDefined();
    const names = PLACES.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('renames the sections', () => {
    expect(sections.map((s) => s.name).sort()).toEqual(['2nd Campus', 'Campus Hostel', 'First Campus', 'Off-campus']);
  });

  it('has playable hostels', () => {
    expect(hostels().length).toBeGreaterThan(5);
    expect(freshersHall().hostel).toBe(true);
  });
});

describe('buildings', () => {
  it('keeps every block inside its plot, as a rectangle with some size', () => {
    for (const b of buildings) {
      for (const k of b.blocks) {
        expect(k.rect.x1 - k.rect.x0, b.id).toBeGreaterThan(3);
        expect(k.rect.z1 - k.rect.z0, b.id).toBeGreaterThan(3);
        expect(k.rect.x0, b.id).toBeGreaterThanOrEqual(b.plot.x0);
        expect(k.rect.x1, b.id).toBeLessThanOrEqual(b.plot.x1);
        expect(k.rect.z0, b.id).toBeGreaterThanOrEqual(b.plot.z0);
        expect(k.rect.z1, b.id).toBeLessThanOrEqual(b.plot.z1);
        expect(k.floors, b.id).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('breaks long apartment plots into several blocks of different heights', () => {
    const big = buildings.filter((b) => b.kind === 'apartment' && b.blocks.length > 1);
    expect(big.length).toBeGreaterThan(0);
    expect(new Set(big.flatMap((b) => b.blocks.map((k) => k.floors))).size).toBeGreaterThan(1);
  });
});

describe('getting around', () => {
  it('lets the player stand at every door, and finds it', () => {
    for (const p of PLACES) {
      expect(isBlocked(p.position[0], p.position[1]), p.id).toBe(false);
      expect(nearestDoor(p.position[0], p.position[1], 1)).toBe(p.id);
    }
  });

  it('joins all the roads into one network', () => {
    const seen = new Set([0]);
    const queue = [0];
    while (queue.length) for (const n of roadGraph[queue.pop()!]!.next) if (!seen.has(n)) seen.add(n), queue.push(n);
    expect(seen.size).toBe(roadGraph.length);
  });

  it('routes from a hostel to every place, ending at its door', () => {
    const home = freshersHall();
    for (const p of PLACES) {
      const path = findPath(home.position, p.position);
      expect(path[path.length - 1], p.id).toEqual(p.position);
      expect(nearestNode(p.position), p.id).toBeGreaterThanOrEqual(0);
    }
  });
});
