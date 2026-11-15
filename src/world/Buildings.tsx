// Every campus building, with its label. Tapping one asks the store to walk
// the player there; the scene itself never applies a game rule.
import type { ThreeEvent } from '@react-three/fiber';
import { university, type CampusLocation } from '../content/university';
import { hasAvailableAction } from '../game/engine';
import { useGameStore } from '../store/gameStore';
import { Label } from './Label';
import { modelFor } from './layout';
import { gesture } from './shared';
import { material } from './three-utils';

function Building({ location, dimmed }: { location: CampusLocation; dimmed: boolean }) {
  const travelTo = useGameStore((s) => s.travelTo);
  const model = modelFor(location);

  function onClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    // A drag or pinch that ends over a building is not a tap.
    if (gesture.moved || e.delta > 10) return;
    travelTo(location.id);
  }

  return (
    <group
      position={[location.position[0], 0, location.position[1]]}
      onClick={onClick}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      {model.parts.map((part, i) => (
        <mesh key={i} geometry={part.geometry} material={material(part.color, part.flat, dimmed)} />
      ))}
      <Label text={location.name} y={model.labelY} dimmed={dimmed} />
    </group>
  );
}

export function Buildings() {
  const game = useGameStore((s) => s.game);
  return (
    <group>
      {university.locations.map((loc) => (
        <Building key={loc.id} location={loc} dimmed={!game || !hasAvailableAction(game, loc.type)} />
      ))}
    </group>
  );
}
