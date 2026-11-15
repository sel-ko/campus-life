// Which real buildings are game places, and what you can do there.
// Every building in the map data is drawn; only the places listed here can be
// tapped. Built once from the map layout when the game loads.
import type { LocationType } from '../game/types';
import { buildCampusLayout, type LayoutBuilding, type Pt } from '../world/campusLayout';
import { buildingOverrides } from './campus-overrides';

/** The whole campus, ready to draw (scene units = metres). */
export const campus = buildCampusLayout();

export interface CampusPlace {
  id: string;
  name: string;
  type: LocationType;
  /** Which action lists this place offers; empty = nothing to do yet. */
  actionTypes: LocationType[];
  siteId: string;
  /** Where people stand to go in (scene units). */
  position: Pt;
  /** The building this place is, if it is one (for taps and dimming). */
  buildingId?: string;
  /** Draw a floating name label. */
  label: boolean;
  /** Shown in the sheet when there is nothing to do. */
  note?: string;
}

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const marker = (name: string) => campus.markers.find((m) => m.name === name);
const suffix = (id: string) => id.split('-').slice(1).join('-');

function place(b: LayoutBuilding, type: LocationType, actionTypes: LocationType[], name: string, label: boolean, note?: string): CampusPlace {
  return { id: b.id, name, type, actionTypes, siteId: b.zone, position: b.door, buildingId: b.id, label, note };
}

const NOTHING = 'Nothing to do here right now.';
const places: CampusPlace[] = [];
const used = new Set<string>();

// ---- buildings by kind ----
const hospitals = campus.buildings.filter((b) => b.kind === 'hospital').sort((a, b) => b.areaM2 - a.areaM2);
for (const b of campus.buildings) {
  const named = buildingOverrides[b.id]?.name;
  switch (b.kind) {
    case 'class':
      places.push(place(b, 'lecture', ['lecture', 'faculty'], named ?? `Classroom Block ${suffix(b.id)}`, !!named));
      break;
    case 'lab':
      // A lab works like a lecture building for now.
      places.push(place(b, 'lab', ['lecture'], named ?? `Labs ${suffix(b.id)}`, !!named));
      break;
    case 'library':
      places.push(place(b, 'library', ['library'], named ?? 'University Library', true));
      break;
    case 'admin':
      places.push(place(b, 'admin', [], named ?? 'Administration', !!named, NOTHING));
      break;
    case 'hospital':
      places.push(place(b, 'hospital', [], named ?? 'Teaching Hospital', b === hospitals[0] || !!named, NOTHING));
      break;
    case 'busstop':
      places.push(place(b, 'busstop', [], named ?? `${b.zone.toUpperCase()} Bus Stop`, true, 'Bus travel between sections is coming soon.'));
      break;
    case 'special': {
      const isBank = /bank/i.test(b.name);
      places.push(
        place(b, isBank ? 'bank' : 'special', [], named ?? b.name, true, isBank ? 'Check your balance in the phone Wallet.' : NOTHING),
      );
      break;
    }
    default:
      continue;
  }
  used.add(b.id);
}

// ---- hostels: the ones flagged playable, or until then the three largest in the estate ----
let hostels = campus.buildings.filter((b) => b.kind === 'hostel' && b.playable);
const placeholderHostels = hostels.length === 0;
if (placeholderHostels) {
  hostels = campus.buildings
    // Real single blocks, not the big traced compounds.
    .filter((b) => b.kind === 'hostel' && b.zone === 'estate' && !b.compound)
    .sort((a, b) => b.areaM2 - a.areaM2)
    .slice(0, 3);
}
hostels.forEach((b, i) => {
  const name = buildingOverrides[b.id]?.name ?? `Crown Estate Hostel ${String.fromCharCode(65 + i)}`;
  places.push(place(b, 'hostel', ['hostel'], name, true));
  used.add(b.id);
});

// ---- places the old game had that the map has no building for ----
// Buka: the unidentified estate building nearest the Supermall junction.
const junction = marker('Supermall junction');
const bukaBuilding = campus.buildings
  .filter((b) => b.zone === 'estate' && b.kind === 'other' && !used.has(b.id))
  .sort((a, b) => dist(a.center, junction?.at ?? [0, 0]) - dist(b.center, junction?.at ?? [0, 0]))[0];
if (bukaBuilding) {
  places.push(place(bukaBuilding, 'cafeteria', ['cafeteria'], buildingOverrides[bukaBuilding.id]?.name ?? 'Estate Buka', true));
  used.add(bukaBuilding.id);
}

// Business centre: the small PS unit nearest the PS bus stop.
const psStop = campus.buildings.find((b) => b.id === 'ps-BUS');
const bizBuilding = campus.buildings
  .filter((b) => b.zone === 'ps' && b.kind === 'unit' && !used.has(b.id))
  .sort((a, b) => dist(a.center, psStop?.center ?? [0, 0]) - dist(b.center, psStop?.center ?? [0, 0]))[0];
if (bizBuilding) {
  places.push(place(bizBuilding, 'business', ['business'], buildingOverrides[bizBuilding.id]?.name ?? 'Business Centre', true));
  used.add(bizBuilding.id);
}

// Sports field: the running track in PS. People stand at its edge nearest a road.
const trackCentre: Pt = [
  campus.track.reduce((s, p) => s + p[0], 0) / (campus.track.length || 1),
  campus.track.reduce((s, p) => s + p[1], 0) / (campus.track.length || 1),
];
const trackEdge = [...campus.track].sort((a, b) => {
  const near = (p: Pt) => Math.min(...campus.roads.flatMap((r) => r.points.map((q) => dist(p, q))));
  return near(a) - near(b);
})[0];
if (trackEdge) {
  const out: Pt = [trackEdge[0] + (trackEdge[0] - trackCentre[0]) * 0.08, trackEdge[1] + (trackEdge[1] - trackCentre[1]) * 0.08];
  places.push({ id: 'field', name: 'Sports Field', type: 'field', actionTypes: ['field'], siteId: 'ps', position: out, label: true });
}

// Main gate: at the main entrance marker.
const gate = marker('Main entrance');
if (gate) {
  places.push({ id: 'gate', name: 'Main Gate', type: 'gate', actionTypes: [], siteId: gate.zone, position: gate.at, label: true, note: NOTHING });
}

// Crown Estate's bus stop: the Supermall junction (no bus stop in the data).
if (junction) {
  places.push({
    id: 'estate-stop',
    name: 'Supermall Junction Stop',
    type: 'busstop',
    actionTypes: [],
    siteId: 'estate',
    position: junction.at,
    label: true,
    note: 'Bus travel between sections is coming soon.',
  });
}

export const campusPlaces: CampusPlace[] = places;
export const usingPlaceholderHostels = placeholderHostels;

/** Building id -> place, for taps on the 3D map. */
export const placeByBuilding = new Map(places.filter((p) => p.buildingId).map((p) => [p.buildingId!, p]));
