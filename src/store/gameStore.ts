// A thin Zustand wrapper around the engine. No game rules live here: each
// method calls one engine function and stores the result.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { doAction, resolveEvent, startGame } from '../game/engine';
import type { GameState, PlayerSetup } from '../game/types';

interface GameStore {
  /** The saved game, or null before the first start. */
  game: GameState | null;
  /** Which building's sheet is open. Not saved. */
  selectedLocationId: string | null;

  start: (setup: PlayerSetup) => void;
  /** Called by the location list now, and by the 3D map from Phase 3. */
  tapLocation: (locationId: string) => void;
  closeSheet: () => void;
  act: (actionId: string) => void;
  chooseEvent: (choiceIndex: 0 | 1) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      game: null,
      selectedLocationId: null,

      start: (setup) => set({ game: startGame(setup), selectedLocationId: null }),

      tapLocation: (locationId) => set({ selectedLocationId: locationId }),

      closeSheet: () => set({ selectedLocationId: null }),

      act: (actionId) => {
        const { game } = get();
        if (!game) return;
        // Close the sheet so the player picks the next place.
        set({ game: doAction(game, actionId), selectedLocationId: null });
      },

      chooseEvent: (choiceIndex) => {
        const { game } = get();
        if (!game) return;
        set({ game: resolveEvent(game, choiceIndex) });
      },

      reset: () => set({ game: null, selectedLocationId: null }),
    }),
    {
      name: 'campus-life-save',
      version: 1,
      // Only the game itself is saved; which sheet is open is not.
      partialize: (state) => ({ game: state.game }),
      // If the save format changes in future, start fresh rather than crash.
      migrate: () => ({ game: null }),
    },
  ),
);
