// Where things go on the map, worked out from the content file.
import { university, type CampusLocation } from '../content/university';
import { buildingModel, type BuildingModel } from './buildingModels';

/** Which colour variant a building uses: hostels take turns. */
export function variantFor(location: CampusLocation): number {
  return university.locations.filter((l) => l.type === location.type).indexOf(location);
}

export function modelFor(location: CampusLocation): BuildingModel {
  return buildingModel(location.type, variantFor(location));
}

/** The spot in front of a building where characters stand. */
export function doorPoint(location: CampusLocation): [number, number] {
  const m = modelFor(location);
  return [location.position[0] + m.door[0], location.position[1] + m.door[1]];
}

export interface Segment {
  from: [number, number];
  to: [number, number];
  width: number;
}

/** Main roads join the site hubs; footpaths join each building to its hub. */
export function roads(): Segment[] {
  const out: Segment[] = [];
  const hubs = university.sites;
  for (let i = 0; i < hubs.length; i++) {
    for (let j = i + 1; j < hubs.length; j++) {
      out.push({ from: hubs[i]!.centre, to: hubs[j]!.centre, width: 3 });
    }
  }
  return out;
}

export function footpaths(): Segment[] {
  return university.locations.map((loc) => {
    const site = university.sites.find((s) => s.id === loc.siteId);
    // The road out of the gate is as wide as a main road.
    return { from: site?.centre ?? [0, 0], to: doorPoint(loc), width: loc.type === 'gate' ? 3 : 1.6 };
  });
}

/** Radius of each site's ground pad, big enough to hold its buildings. */
export function siteRadius(siteId: string): number {
  const site = university.sites.find((s) => s.id === siteId);
  if (!site) return 10;
  let r = 8;
  for (const loc of university.locations.filter((l) => l.siteId === siteId)) {
    const d = Math.hypot(loc.position[0] - site.centre[0], loc.position[1] - site.centre[1]);
    r = Math.max(r, d + modelFor(loc).radius * 0.8);
  }
  return r;
}

/** The area the camera may look at. */
export function campusBounds(): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const xs = university.locations.map((l) => l.position[0]);
  const zs = university.locations.map((l) => l.position[1]);
  return {
    minX: Math.min(...xs) - 6,
    maxX: Math.max(...xs) + 6,
    minZ: Math.min(...zs) - 6,
    maxZ: Math.max(...zs) + 6,
  };
}

/** Distance from point p to a line segment. */
export function distToSegment(p: [number, number], s: Segment): number {
  const [px, pz] = p;
  const [ax, az] = s.from;
  const [bx, bz] = s.to;
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len2));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

/** Spots for the billboard and the vendor stall, next to these building types. */
export const AD_SPOTS: Partial<Record<CampusLocation['type'], { billboard: [number, number]; stall: [number, number] }>> = {
  cafeteria: { billboard: [6.2, -1.5], stall: [-5.4, 3.8] },
  gate: { billboard: [-8.2, -1.5], stall: [6.2, 3.6] },
};
