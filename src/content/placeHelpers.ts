// Small helpers that combine places with the game rules (read-only).
import { actionsAt, hasAvailableAction } from '../game/legacy/engine';
import type { ActionDef, GameState } from '../game/legacy/types';
import type { CampusPlace } from './campusMap';

/** Every action offered at a place (a classroom block offers lectures and meetings). */
export function placeActions(place: CampusPlace): ActionDef[] {
  return place.actionTypes.flatMap((t) => actionsAt(t));
}

/** True if something can be done at this place right now. */
export function placeIsOpen(game: GameState, place: CampusPlace): boolean {
  return place.actionTypes.some((t) => hasAvailableAction(game, t));
}
