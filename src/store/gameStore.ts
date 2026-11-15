// A thin Zustand wrapper around the engine. No game rules live here: each
// method calls one engine function and stores the result. It also holds a
// little screen state (which sheet is open, where the player is walking).
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { doAction, resolveEvent, startGame } from '../game/engine';
import type { GameState, PlayerSetup } from '../game/types';

interface GameStore {
  /** The saved game, or null before the first start. */
  game: GameState | null;
  /** Which building the player is standing at on the map. Saved. */
  playerLocationId: string | null;
  /** Where the player is walking to on the 3D map. Not saved. */
  travelTargetId: string | null;
  /** Which building's sheet is open. Not saved. */
  selectedLocationId: string | null;

  start: (setup: PlayerSetup) => void;
  /** Opens a building's sheet straight away (list view). */
  tapLocation: (locationId: string) => void;
  /** 3D map: walk to a building; the sheet opens on arrival. */
  travelTo: (locationId: string) => void;
  /** Called by the 3D scene when the walk ends. */
  arrive: () => void;
  closeSheet: () => void;
  act: (actionId: string) => void;
  chooseEvent: (choiceIndex: 0 | 1) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      game: null,
      playerLocationId: null,
      travelTargetId: null,
      selectedLocationId: null,

      start: (setup) =>
        set({
          game: startGame(setup),
          playerLocationId: setup.homeId,
          travelTargetId: null,
          selectedLocationId: null,
        }),

      tapLocation: (locationId) => set({ selectedLocationId: locationId, playerLocationId: locationId }),

      travelTo: (locationId) => {
        const { playerLocationId, game } = get();
        if (!game || game.pendingEventId) return;
        if (locationId === playerLocationId) set({ selectedLocationId: locationId, travelTargetId: null });
        else set({ travelTargetId: locationId, selectedLocationId: null });
      },

      arrive: () => {
        const target = get().travelTargetId;
        if (!target) return;
        set({ playerLocationId: target, selectedLocationId: target, travelTargetId: null });
      },

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

      reset: () => set({ game: null, playerLocationId: null, travelTargetId: null, selectedLocationId: null }),
    }),
    {
      name: 'campus-life-save',
      version: 2,
      partialize: (state) => ({ game: state.game, playerLocationId: state.playerLocationId }),
      // If the save format changes, start fresh rather than crash.
      migrate: () => ({ game: null, playerLocationId: null }),
    },
  ),
);
