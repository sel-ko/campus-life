// Floating names: each section's name over its corner, and names for the
// places that have one (library, lecture theatres, market, buka, field,
// keke stops, gate, and anything you named yourself in the planner).
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { cameraState } from '../shared';
import { buildingById, sections } from '../../content/campusMap';
import { PLACES, PLOTS } from '../../content/places';
import { placeHasSomethingNow } from '../../game/interactions';
import { placeEmoji } from '../../game/status';
import { nextStep } from '../../game/story';
import { useGameStore } from '../../store/gameStore';
import { Label } from '../Label';
import { campusGeometry } from './CampusBuildings';

export function CampusLabels() {
  const game = useGameStore((s) => s.game);
  const { heights } = useMemo(campusGeometry, []);
  const labelled = useMemo(() => PLACES.filter((p) => p.label), []);
  // Other places you can go into get a small emoji pin when zoomed in.
  const pinned = useMemo(() => PLACES.filter((p) => !p.label && p.enterable && p.type !== 'hostel_room'), []);
  const small = useRef<THREE.Group>(null);
  const next = game ? nextStep(game) : null;
  const target = next?.placeId ? PLACES.find((p) => p.id === next.placeId) : undefined;
  const home = game ? PLACES.find((p) => p.id === game.room.placeId) : undefined;
  // Building names only once zoomed in a little; zoomed right out they would
  // cover the map. Section names always show.
  const names = useRef<THREE.Group>(null);
  useFrame(() => {
    if (names.current) names.current.visible = cameraState.dist < 230;
    if (small.current) small.current.visible = cameraState.dist < 140;
  });
  const top = (buildingId: string): [number, number, number] => {
    const b = buildingById.get(buildingId)!;
    return [(b.plot.x0 + b.plot.x1) / 2, (heights.get(b.id) ?? 4) + 3, (b.plot.z0 + b.plot.z1) / 2];
  };
  return (
    <group>
      {sections.map((s) => (
        <Label key={s.id} text={s.name} position={[(s.rect.x0 + s.rect.x1) / 2, 14, s.rect.z0 + 6]} size={1.25} />
      ))}
      <group ref={names}>
        {PLOTS.map((p) => (
          <Label key={p.id} text="Plot for sale" position={[(p.rect.x0 + p.rect.x1) / 2, 4, (p.rect.z0 + p.rect.z1) / 2]} size={0.8} />
        ))}
      {labelled.map((p) => {
        const b = buildingById.get(p.buildingId)!;
        const x = (b.plot.x0 + b.plot.x1) / 2;
        const z = (b.plot.z0 + b.plot.z1) / 2;
        const dimmed = !!game && p.enterable && !placeHasSomethingNow(game, p.id);
        return <Label key={p.id} text={`${placeEmoji(game, p.id)} ${p.name}`} position={[x, (heights.get(b.id) ?? 4) + 3, z]} dimmed={dimmed} />;
      })}
      </group>
      <group ref={small}>
        {pinned.map((p) => (
          <Label key={p.id} text={placeEmoji(game, p.id)} position={top(p.buildingId)} size={0.9} dimmed={!!game && !placeHasSomethingNow(game, p.id)} />
        ))}
      </group>
      {home && home.id !== target?.id && <Label text="🏠 Your room" position={[top(home.buildingId)[0], top(home.buildingId)[1] + 3, top(home.buildingId)[2]]} size={1.05} />}
      {target && <QuestHighlight buildingId={target.buildingId} height={heights.get(target.buildingId) ?? 4} />}
    </group>
  );
}

/** The building your story wants you at next glows gold, pulsing gently. */
function QuestHighlight({ buildingId, height }: { buildingId: string; height: number }) {
  const b = buildingById.get(buildingId)!;
  const w = b.plot.x1 - b.plot.x0 + 1.2;
  const d = b.plot.z1 - b.plot.z0 + 1.2;
  const h = height + 0.8;
  const box = useMemo(() => new THREE.BoxGeometry(w, h, d), [w, h, d]);
  const edges = useMemo(() => new THREE.EdgesGeometry(box), [box]);
  const fill = useRef<THREE.MeshBasicMaterial>(null);
  const line = useRef<THREE.LineBasicMaterial>(null);
  useFrame(({ clock }) => {
    const k = (Math.sin(clock.elapsedTime * 3) + 1) / 2;
    if (fill.current) fill.current.opacity = 0.2 + k * 0.25;
    if (line.current) line.current.opacity = 0.55 + k * 0.45;
  });
  return (
    <group position={[(b.plot.x0 + b.plot.x1) / 2, h / 2, (b.plot.z0 + b.plot.z1) / 2]}>
      <mesh geometry={box} renderOrder={5}>
        <meshBasicMaterial ref={fill} color="#F5B83D" transparent opacity={0.2} depthWrite={false} />
      </mesh>
      <lineSegments geometry={edges} renderOrder={6}>
        <lineBasicMaterial ref={line} color="#FFD45C" transparent opacity={1} />
      </lineSegments>
    </group>
  );
}
