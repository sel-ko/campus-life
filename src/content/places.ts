// The game's places: every building from the planner map, with the name and
// roles from campus-overrides.ts. Pure data plus small lookups.
import type { OfficeId, PlaceType } from '../game/types';
import { buildings, cellRect, COLS, isRoad, ROWS, sections, type Pt, type Rect } from './campusMap';
import { getCollege } from './courses';
import { BUILDING_ROLES, type BuildingRole } from './campus-overrides';
import { TOWN_ROLES } from './town';
import { KEKE_ROLES } from './kekeStops';
import raw from './campus-layout.json';

export interface PlaceDef extends BuildingRole {
  id: string;
  sectionId: string;
  buildingId: string;
  /** Where people stand to go in. */
  position: Pt;
  enterable: boolean;
  label: boolean;
}

/** Kinds of place you can walk into (the brief's seven plus shops and placements). */
export const ENTERABLE: PlaceType[] = [
  'lecture_hall',
  'admin_office',
  'restaurant',
  'hostel_room',
  'lab',
  'library',
  'clinic',
  'shop',
  'workplace',
  'nightlife',
  'field',
];

const LABELLED: PlaceType[] = ['lecture_hall', 'admin_office', 'library', 'lab', 'clinic', 'field', 'busstop', 'gate', 'workplace', 'nightlife'];

export const PLACES: PlaceDef[] = buildings.flatMap((b) => {
  const role = BUILDING_ROLES[b.id] ?? TOWN_ROLES[b.id] ?? KEKE_ROLES[b.id];
  if (!role) return [];
  return [
    {
      ...role,
      id: b.id,
      sectionId: b.sectionId,
      buildingId: b.id,
      position: b.door,
      enterable: ENTERABLE.includes(role.type),
      label: LABELLED.includes(role.type) || role.type === 'restaurant' || !!role.freshers,
    },
  ];
});

const byId = new Map(PLACES.map((p) => [p.id, p]));

export function getPlace(id: string): PlaceDef | undefined {
  return byId.get(id);
}

export function placeName(id: string): string {
  return byId.get(id)?.name ?? 'somewhere on campus';
}

export function sectionName(id: string): string {
  return sections.find((s) => s.id === id)?.name ?? id;
}

/** The place hosting an office. College offices and HODs depend on the college. */
export function officePlace(office: OfficeId, collegeId: string): PlaceDef {
  const all = PLACES.filter((p) => p.offices?.includes(office));
  return all.find((p) => !p.colleges || p.colleges.includes(collegeId)) ?? all[0]!;
}

export function gstHalls(): PlaceDef[] {
  return PLACES.filter((p) => p.gst);
}

/** Lecture rooms (or labs) a college uses. Falls back to any in its section. */
export function collegeVenues(collegeId: string, type: 'lecture_hall' | 'lab'): PlaceDef[] {
  const own = PLACES.filter((p) => p.type === type && !p.gst && p.colleges?.includes(collegeId));
  if (own.length) return own;
  const section = getCollege(collegeId).sectionId;
  return PLACES.filter((p) => p.type === type && !p.gst && p.sectionId === section);
}

export function hostels(): PlaceDef[] {
  return PLACES.filter((p) => p.hostel);
}

export function freshersHall(): PlaceDef {
  return PLACES.find((p) => p.freshers) ?? hostels()[0]!;
}

export function medicalCentre(): PlaceDef {
  return PLACES.find((p) => p.medicalCentre) ?? PLACES.find((p) => p.type === 'clinic')!;
}

export function mainLibrary(): PlaceDef {
  return PLACES.find((p) => p.mainLibrary) ?? PLACES.find((p) => p.type === 'library')!;
}

export function placementFor(kind: 'it' | 'chambers'): PlaceDef {
  return PLACES.find((p) => p.placement === kind) ?? PLACES.find((p) => p.type === 'workplace')!;
}

export function mainBuka(): PlaceDef {
  return PLACES.find((p) => p.menu === 'buka') ?? PLACES.find((p) => p.type === 'restaurant')!;
}

export function fieldPlace(): PlaceDef {
  return PLACES.find((p) => p.type === 'field')!;
}

// ---------- plots of land for sale (highlights only, for a later feature) ----------

export interface Plot {
  id: string;
  rect: Rect;
  cells: { x: number; y: number; w: number; h: number };
}

/** Empty 2x2 squares outside the sections, beside a road. */
export const PLOTS: Plot[] = (() => {
  const layout = raw as { sections: Array<{ x: number; y: number; w: number; h: number }>; items: Array<{ x: number; y: number; w: number; h: number }> };
  const used = new Set<string>();
  const mark = (r: { x: number; y: number; w: number; h: number }, pad = 0) => {
    for (let x = r.x - pad; x < r.x + r.w + pad; x++) for (let y = r.y - pad; y < r.y + r.h + pad; y++) used.add(`${x},${y}`);
  };
  for (const s of layout.sections) mark(s);
  for (const i of layout.items) mark(i);
  const free = (x: number, y: number) => x >= 0 && y >= 0 && x < COLS && y < ROWS && !used.has(`${x},${y}`) && !isRoad(x, y);
  const out: Plot[] = [];
  for (let y = 0; y < ROWS - 1 && out.length < 14; y++) {
    for (let x = 0; x < COLS - 1 && out.length < 14; x++) {
      if (!(free(x, y) && free(x + 1, y) && free(x, y + 1) && free(x + 1, y + 1))) continue;
      let road = false;
      for (let dx = -1; dx <= 2; dx++) for (let dy = -1; dy <= 2; dy++) if (isRoad(x + dx, y + dy)) road = true;
      if (!road) continue;
      out.push({ id: `plot-${out.length + 1}`, rect: cellRect(x, y, 2, 2), cells: { x, y, w: 2, h: 2 } });
      for (let dx = -1; dx <= 2; dx++) for (let dy = -1; dy <= 2; dy++) used.add(`${x + dx},${y + dy}`);
    }
  }
  return out;
})();
