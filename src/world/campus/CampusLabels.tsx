// Name labels for named places (library, hospital, bank, mosque, church,
// hotel, morgue, bus stops, playable hostels, buka, field, gate...). Unnamed
// classroom blocks and scenery hostels get none.
import { useMemo } from 'react';
import { campus, campusPlaces } from '../../content/campusPlaces';
import { placeIsOpen } from '../../content/placeHelpers';
import { useGameStore } from '../../store/gameStore';
import { Label } from '../Label';

const heightOf = new Map(campus.buildings.map((b) => [b.id, b.height]));
const centreOf = new Map(campus.buildings.map((b) => [b.id, b.center]));

export function CampusLabels() {
  const game = useGameStore((s) => s.game);
  const labelled = useMemo(() => campusPlaces.filter((p) => p.label), []);
  return (
    <group>
      {labelled.map((p) => {
        const [x, z] = p.buildingId ? centreOf.get(p.buildingId)! : p.position;
        const y = (p.buildingId ? heightOf.get(p.buildingId) ?? 4 : 6) + 5;
        const dimmed = !!game && p.actionTypes.length > 0 && !placeIsOpen(game, p);
        return <Label key={p.id} text={p.name} position={[x, y, z]} dimmed={dimmed} />;
      })}
    </group>
  );
}
