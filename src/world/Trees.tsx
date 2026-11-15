// Trees drawn with instancing: two draw calls for all of them (trunks and leaves).
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { university } from '../content/university';
import { distToSegment, footpaths, modelFor, roads } from './layout';
import { cylinder, ico, seededRandom } from './three-utils';

const TREE_COUNT = 70;
const LEAF_COLOURS = ['#3F8F4A', '#4FA35A', '#2F7A3E', '#5CAF4E'];

const trunkGeo = cylinder(0.22, 0.32, 1.6, 6);
const leafGeo = ico(1.3, 0);
const trunkMat = new THREE.MeshLambertMaterial({ color: '#6B4423' });
const leafMat = new THREE.MeshLambertMaterial({ color: '#FFFFFF', flatShading: true });

/** Scatters trees, keeping them off buildings, roads and paths. */
function treeSpots(): Array<{ x: number; z: number; s: number }> {
  const rand = seededRandom(7);
  const segs = [...roads(), ...footpaths()];
  const spots: Array<{ x: number; z: number; s: number }> = [];
  for (let tries = 0; spots.length < TREE_COUNT && tries < 3000; tries++) {
    const x = -48 + rand() * 96;
    const z = -40 + rand() * 82;
    const clearOfBuildings = university.locations.every(
      (l) => Math.hypot(x - l.position[0], z - l.position[1]) > modelFor(l).radius + 2.5,
    );
    const clearOfRoads = segs.every((s) => distToSegment([x, z], s) > s.width / 2 + 1.8);
    const clearOfHubs = university.sites.every((s) => Math.hypot(x - s.centre[0], z - s.centre[1]) > 5);
    const clearOfTrees = spots.every((t) => Math.hypot(x - t.x, z - t.z) > 3);
    if (clearOfBuildings && clearOfRoads && clearOfHubs && clearOfTrees) spots.push({ x, z, s: 0.8 + rand() * 0.6 });
  }
  return spots;
}

export function Trees() {
  const spots = useMemo(treeSpots, []);
  const trunks = useRef<THREE.InstancedMesh>(null);
  const leaves = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const c = new THREE.Color();
    spots.forEach((t, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * 1.7);
      m.compose(new THREE.Vector3(t.x, 0.8 * t.s, t.z), q, new THREE.Vector3(t.s, t.s, t.s));
      trunks.current!.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(t.x, 2.3 * t.s, t.z), q, new THREE.Vector3(t.s, t.s * 1.1, t.s));
      leaves.current!.setMatrixAt(i, m);
      leaves.current!.setColorAt(i, c.set(LEAF_COLOURS[i % LEAF_COLOURS.length]!));
    });
    trunks.current!.instanceMatrix.needsUpdate = true;
    leaves.current!.instanceMatrix.needsUpdate = true;
    if (leaves.current!.instanceColor) leaves.current!.instanceColor.needsUpdate = true;
  }, [spots]);

  return (
    <group>
      <instancedMesh ref={trunks} args={[trunkGeo, trunkMat, spots.length]} />
      <instancedMesh ref={leaves} args={[leafGeo, leafMat, spots.length]} />
    </group>
  );
}
