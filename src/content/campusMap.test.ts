import { describe, expect, it } from 'vitest';
import { ACTIONS } from '../game/legacy/actions';
import { canDoAction, doAction, startGame } from '../game/legacy/engine';
import { findPath, isBlocked, nearestDoor, nearestNode, roadGraph } from '../world/campus/navigation';
import { buildings, campusPlaces, sections } from './campusMap';
import raw from './campus-layout.json';
import { placeActions } from './placeHelpers';
import { university } from './university';

describe('the planner layout', () => {
  it('loads every section and building you drew', () => {
    expect(sections).toHaveLength(raw.sections.length);
    expect(buildings).toHaveLength(raw.items.length);
  });

  it('gives every place a unique name', () => {
    const names = campusPlaces.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('offers every action in the game somewhere', () => {
    const offered = new Set(campusPlaces.flatMap((p) => placeActions(p).map((a) => a.id)));
    for (const a of ACTIONS) expect(offered.has(a.id), a.id).toBe(true);
  });

  it('has apartments to live in', () => {
    expect(university.locations.filter((l) => l.type === 'hostel').length).toBeGreaterThan(0);
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
    const heights = new Set(big.flatMap((b) => b.blocks.map((k) => k.floors)));
    expect(heights.size).toBeGreaterThan(1);
  });

  it('varies floors where the planner default was left alone', () => {
    const classFloors = new Set(buildings.filter((b) => b.kind === 'apartment').flatMap((b) => b.blocks.map((k) => k.floors)));
    expect(classFloors.size).toBeGreaterThan(2);
  });
});

describe('getting around', () => {
  it('lets the player stand at every door, and finds it', () => {
    for (const p of campusPlaces) {
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

  it('routes from a home to every place, ending at its door', () => {
    const home = campusPlaces.find((p) => p.type === 'hostel')!;
    for (const p of campusPlaces) {
      const path = findPath(home.position, p.position);
      expect(path[path.length - 1], p.id).toEqual(p.position);
      expect(nearestNode(p.position), p.id).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('a whole semester on this map', () => {
  it('plays to the end using only these places', () => {
    const home = university.locations.find((l) => l.type === 'hostel')!;
    let s = startGame({ nickname: 'T', departmentId: 'law', background: 'average', characterId: 'm1', homeId: home.id });
    let moves = 0;
    for (let i = 0; i < 300 && !s.finished; i++) {
      const options = campusPlaces.flatMap((p) => placeActions(p).filter((a) => canDoAction(s, a).ok));
      expect(options.length, `day ${s.day} slot ${s.slotIndex}`).toBeGreaterThan(0);
      s = doAction(s, options[moves % options.length]!.id, () => 0.99);
      moves++;
    }
    expect(s.finished).toBe(true);
  });
});
