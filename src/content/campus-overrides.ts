// Corrections to the campus map data, keyed by building id. The data file
// (campus-data.ts) is never hand-edited; put fixes here instead.
//
// Example:
//   'estate-H08': { name: 'Crown Estate Block B', playable: true, floors: 3 },
//   'ps-U1': { name: 'Business Centre', kind: 'special' },
import type { BuildingKind } from './campus-data';

export interface BuildingOverride {
  name?: string;
  kind?: BuildingKind;
  floors?: number;
  /** True: tapping it opens an action sheet. Hostels default to scenery. */
  playable?: boolean;
}

export const buildingOverrides: Record<string, BuildingOverride> = {};
