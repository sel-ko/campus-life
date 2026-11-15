// Save format versioning. A saved game carries `version`; anything older
// than SAVE_VERSION is not migrated (the rules changed too much) and the
// player starts again with a friendly note.
import { SAVE_VERSION } from './config';
import type { GameState } from './types';

export const RESET_NOTICE =
  'Campus Life has been rebuilt into a full degree, from admission to graduation. ' +
  'Your old semester could not come along, so you are starting fresh. Sorry o!';

export function isCurrentSave(game: unknown): game is GameState {
  return !!game && typeof game === 'object' && (game as { version?: unknown }).version === SAVE_VERSION;
}

/** Returns the game if it can be loaded, or null plus whether to show the reset notice. */
export function loadSave(game: unknown): { game: GameState | null; wasReset: boolean } {
  if (game == null) return { game: null, wasReset: false };
  if (isCurrentSave(game)) return { game, wasReset: false };
  return { game: null, wasReset: true };
}
