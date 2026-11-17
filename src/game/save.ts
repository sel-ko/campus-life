// Save format versioning. A saved game carries `version`; anything older
// than SAVE_VERSION is not migrated (the rules changed too much) and the
// player starts again with a friendly note.
import { SAVE_VERSION } from './config';
import { questsMut } from './quests';
import { blankQuests } from './state';
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
  if (isCurrentSave(game)) {
    // Saves from before hygiene and bladder existed get them filled in.
    const needs = game.needs as Partial<GameState['needs']> | undefined;
    let out = game;
    if (needs && (needs.hygiene === undefined || needs.bladder === undefined)) {
      out = { ...out, needs: { ...out.needs, hygiene: needs.hygiene ?? 70, bladder: needs.bladder ?? 20 } };
    }
    // Saves from before the phone needed charging and data.
    if (out.needs && !out.phone) out = { ...out, phone: { battery: 80, data: 1500 } };
    // Saves from before the quest log: start one, and mark what is already
    // done as finished without paying it again. (Courses on such saves have no
    // assignmentSet, which counts as "given", so their assignments stay open.)
    if (!out.quests && out.clock && out.academics) {
      const copy = structuredClone(out);
      copy.quests = blankQuests();
      questsMut(copy, true);
      out = copy;
    }
    return { game: out, wasReset: false };
  }
  return { game: null, wasReset: true };
}
