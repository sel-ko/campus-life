// Benches, a water tank, a signpost, street lamps, billboards and vendor stalls.
import { useMemo } from 'react';
import * as THREE from 'three';
import { university } from '../content/university';
import { AD_SPOTS, roads } from './layout';
import { Parts, WINDOW, box, cylinder, material, roundedBox, signTexture } from './three-utils';

function bench(p: Parts, x: number, z: number, angle: number) {
  p.add(roundedBox(2, 0.15, 0.6, 0.05), '#A86B3C', x, 0.55, z, [0, angle, 0]);
  p.add(roundedBox(2, 0.5, 0.12, 0.04), '#A86B3C', x - Math.sin(angle) * 0.3, 0.85, z - Math.cos(angle) * 0.3, [0, angle, 0]);
  for (const s of [-0.8, 0.8]) {
    p.add(box(0.12, 0.5, 0.5), '#4A4A4A', x + Math.cos(angle) * s, 0.25, z - Math.sin(angle) * s, [0, angle, 0]);
  }
}

function lamp(p: Parts, x: number, z: number) {
  p.add(cylinder(0.08, 0.1, 3.4, 6), '#3A3F45', x, 1.7, z);
  p.add(roundedBox(0.5, 0.3, 0.5, 0.06), WINDOW, x, 3.5, z);
}

function stall(p: Parts, x: number, z: number) {
  const { primary, accent } = university.colours;
  p.add(roundedBox(2.6, 1, 1.2, 0.08), '#F4EFE6', x, 0.5, z);
  for (const s of [-1.2, 1.2]) p.add(cylinder(0.06, 0.06, 2.2, 6), '#555', x + s, 1.1, z - 0.5);
  for (let i = 0; i < 4; i++) p.add(box(0.7, 0.18, 1.6), i % 2 ? primary : accent, x - 1.05 + i * 0.7, 2.2, z, [0.2, 0, 0]);
}

function buildProps() {
  const p = new Parts();
  // Benches around each hub.
  for (const site of university.sites) {
    const [cx, cz] = site.centre;
    bench(p, cx + 4.5, cz - 3.5, -0.6);
    bench(p, cx - 4.5, cz + 3.5, 2.5);
  }
  // Water tank at the estate.
  const crown = university.sites.find((s) => s.id === 'crown') ?? university.sites[0]!;
  const [tx, tz] = [crown.centre[0] - 4, crown.centre[1] - 1];
  for (const [dx, dz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]] as const) {
    p.add(box(0.2, 3, 0.2), '#6E747A', tx + dx, 1.5, tz + dz);
  }
  p.add(roundedBox(2.4, 0.2, 2.4, 0.05), '#6E747A', tx, 3.05, tz);
  p.add(cylinder(1.2, 1.2, 1.8, 14), '#2E3A44', tx, 4.05, tz);
  p.add(cylinder(1.25, 1.25, 0.15, 14), '#1E2830', tx, 5, tz);
  // Signpost at the estate hub, pointing to the other sites.
  const [sx, sz] = [crown.centre[0] + 3.4, crown.centre[1] + 2.4];
  p.add(cylinder(0.1, 0.12, 3.2, 6), '#6B4423', sx, 1.6, sz);
  university.sites
    .filter((s) => s.id !== crown.id)
    .forEach((s, i) => {
      const angle = Math.atan2(s.centre[0] - sx, s.centre[1] - sz) - Math.PI / 2;
      p.add(roundedBox(1.6, 0.4, 0.1, 0.04), i ? university.colours.accent : '#F4EFE6', sx, 2.7 - i * 0.55, sz, [0, angle, 0]);
    });
  // Street lamps along the main roads.
  for (const r of roads()) {
    const len = Math.hypot(r.to[0] - r.from[0], r.to[1] - r.from[1]);
    const nx = -(r.to[1] - r.from[1]) / len;
    const nz = (r.to[0] - r.from[0]) / len;
    for (let d = 8; d < len - 6; d += 10) {
      const t = d / len;
      lamp(p, r.from[0] + (r.to[0] - r.from[0]) * t + nx * 2.4, r.from[1] + (r.to[1] - r.from[1]) * t + nz * 2.4);
    }
  }
  // Billboard frames and vendor stalls next to the cafeteria and the gate.
  for (const loc of university.locations) {
    const spot = AD_SPOTS[loc.type];
    if (!spot) continue;
    const [bx, bz] = [loc.position[0] + spot.billboard[0], loc.position[1] + spot.billboard[1]];
    for (const s of [-1.4, 1.4]) p.add(cylinder(0.12, 0.12, 3.4, 6), '#3A3F45', bx + s, 1.7, bz);
    p.add(roundedBox(4.2, 2.4, 0.2, 0.06), '#2A2F35', bx, 3.9, bz - 0.12);
    stall(p, loc.position[0] + spot.stall[0], loc.position[1] + spot.stall[1]);
  }
  return p.merge();
}

const boardGeo = new THREE.PlaneGeometry(4, 2.2);

export function Props() {
  const parts = useMemo(buildProps, []);
  const boardMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: signTexture(['YOUR AD HERE', 'Advertise on Campus Life'], university.colours.accent, '#14202B'),
      }),
    [],
  );
  const boards = university.locations
    .map((loc) => ({ loc, spot: AD_SPOTS[loc.type] }))
    .filter((b) => b.spot);

  return (
    <group>
      {parts.map((part, i) => (
        <mesh key={i} geometry={part.geometry} material={material(part.color, part.flat)} />
      ))}
      {boards.map(({ loc, spot }) => (
        <mesh
          key={loc.id}
          geometry={boardGeo}
          material={boardMat}
          position={[loc.position[0] + spot!.billboard[0], 3.9, loc.position[1] + spot!.billboard[1] + 0.01]}
        />
      ))}
    </group>
  );
}
