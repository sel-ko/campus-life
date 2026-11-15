// Grass, a sandy pad for each site, roads between sites and footpaths to doors.
// All of it is merged into a handful of meshes.
import { useMemo } from 'react';
import * as THREE from 'three';
import { university } from '../content/university';
import { footpaths, roads, siteRadius, type Segment } from './layout';
import { Parts, box, cylinder, material } from './three-utils';

const PAD_COLOURS: string[] = ['#E6D3A3', '#DCCFA8', '#E2C9A8'];
const ROAD = '#5B6470';
const ROAD_EDGE = '#D8D2C4';
const PATH = '#CDBE98';

function addSegment(p: Parts, s: Segment, color: string, y: number, h: number) {
  const dx = s.to[0] - s.from[0];
  const dz = s.to[1] - s.from[1];
  const len = Math.hypot(dx, dz);
  const angle = Math.atan2(dx, dz);
  p.add(box(s.width, h, len + s.width * 0.5), color, (s.from[0] + s.to[0]) / 2, y, (s.from[1] + s.to[1]) / 2, [0, angle, 0]);
}

function buildGround() {
  const p = new Parts();
  university.sites.forEach((site, i) => {
    const r = Math.round(siteRadius(site.id));
    p.add(cylinder(r, r, 0.1, 40), PAD_COLOURS[i % PAD_COLOURS.length]!, site.centre[0], 0.05, site.centre[1]);
  });
  for (const s of footpaths()) addSegment(p, s, PATH, 0.12, 0.04);
  for (const s of roads()) {
    addSegment(p, { ...s, width: s.width + 0.5 }, ROAD_EDGE, 0.13, 0.04);
    addSegment(p, s, ROAD, 0.15, 0.04);
  }
  // A roundabout at each hub.
  for (const site of university.sites) {
    p.add(cylinder(2.6, 2.6, 0.06, 20), ROAD, site.centre[0], 0.16, site.centre[1]);
    p.add(cylinder(1.3, 1.3, 0.3, 16), '#6CC566', site.centre[0], 0.25, site.centre[1]);
  }
  return p.merge();
}

const grassGeometry = new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2);

export function Ground({ grass }: { grass: string }) {
  const parts = useMemo(buildGround, []);
  return (
    <group>
      <mesh geometry={grassGeometry} material={material(grass)} />
      {parts.map((part, i) => (
        <mesh key={i} geometry={part.geometry} material={material(part.color, part.flat)} />
      ))}
    </group>
  );
}
