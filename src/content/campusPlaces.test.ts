import { describe, expect, it } from 'vitest';
import { ACTIONS } from '../game/actions';
import { canDoAction, doAction, startGame } from '../game/engine';
import { campus, campusPlaces } from './campusPlaces';
import { placeActions } from './placeHelpers';
import { university } from './university';

describe('places on the real map', () => {
  it('offers every action in the game somewhere', () => {
    const offered = new Set(campusPlaces.flatMap((p) => placeActions(p).map((a) => a.id)));
    for (const a of ACTIONS) expect(offered.has(a.id), a.id).toBe(true);
  });

  it('has three playable hostels for "Where do you stay?"', () => {
    const hostels = university.locations.filter((l) => l.type === 'hostel');
    expect(hostels).toHaveLength(3);
    // None of them is one of the big traced compounds.
    for (const h of hostels) expect(campus.buildings.find((b) => b.id === h.buildingId)?.compound).toBeUndefined();
  });

  it('keeps the buka, business centre, sports field and gate', () => {
    for (const type of ['cafeteria', 'business', 'field', 'gate'] as const) {
      expect(campusPlaces.some((p) => p.type === type), type).toBe(true);
    }
  });

  it('plays a whole semester using only real places', () => {
    const home = university.locations.find((l) => l.type === 'hostel')!;
    let s = startGame({ nickname: 'T', departmentId: 'law', background: 'average', characterId: 'm1', homeId: home.id });
    let moves = 0;
    for (let i = 0; i < 300 && !s.finished; i++) {
      // Visit places in turn and do the first thing open there.
      const options = campusPlaces.flatMap((p) => placeActions(p).filter((a) => canDoAction(s, a).ok));
      expect(options.length, `day ${s.day} slot ${s.slotIndex}`).toBeGreaterThan(0);
      s = doAction(s, options[moves % options.length]!.id, () => 0.99);
      moves++;
    }
    expect(s.finished).toBe(true);
  });
});
