// Floating names: each section's name over its corner, and names for the
// places that have one (library, lecture theatres, market, buka, field,
// keke stops, gate, and anything you named yourself in the planner).
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { cameraState } from '../shared';
import { buildingById, campusPlaces, sections } from '../../content/campusMap';
import { placeIsOpen } from '../../content/placeHelpers';
import { useGameStore } from '../../store/gameStore';
import { Label } from '../Label';
import { campusGeometry } from './CampusBuildings';

export function CampusLabels() {
  const game = useGameStore((s) => s.game);
  const { heights } = useMemo(campusGeometry, []);
  const labelled = useMemo(() => campusPlaces.filter((p) => p.label), []);
  // Building names only once zoomed in a little; zoomed right out they would
  // cover the map. Section names always show.
  const names = useRef<THREE.Group>(null);
  useFrame(() => {
    if (names.current) names.current.visible = cameraState.dist < 230;
  });
  return (
    <group>
      {sections.map((s) => (
        <Label key={s.id} text={s.name} position={[(s.rect.x0 + s.rect.x1) / 2, 14, s.rect.z0 + 6]} size={1.25} />
      ))}
      <group ref={names}>
      {labelled.map((p) => {
        const b = buildingById.get(p.buildingId)!;
        const x = (b.plot.x0 + b.plot.x1) / 2;
        const z = (b.plot.z0 + b.plot.z1) / 2;
        const dimmed = !!game && p.actionTypes.length > 0 && !placeIsOpen(game, p);
        return <Label key={p.id} text={p.name} position={[x, (heights.get(b.id) ?? 4) + 3, z]} dimmed={dimmed} />;
      })}
      </group>
    </group>
  );
}
