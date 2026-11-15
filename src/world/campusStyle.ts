// Colours for the campus by building kind and road certainty. Pure data, used
// by the debug map now and the 3D buildings later.
import type { BuildingKind, CampusRoad } from '../content/campus-data';

export const KIND_COLOURS: Record<BuildingKind, string> = {
  class: '#F2C94C', // warm yellow
  lab: '#9B6BD3', // purple
  admin: '#4CAF6A', // green
  hospital: '#BFE6C8', // pale green
  library: '#3E7CC9', // blue
  busstop: '#5B6470', // paved grey
  special: '#F08A3C', // orange
  hostel: '#F3E9D2', // cream
  unit: '#F29BC1', // pink
  other: '#9A8FB0', // grey-purple
};

export const ROAD_COLOURS: Record<CampusRoad['certainty'], string> = {
  traced: '#5B6470',
  inferred: '#7E8794',
  unknown: '#B08A5E', // dirt track
};
