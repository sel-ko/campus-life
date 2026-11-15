// A thin Zustand wrapper around the engine. No game rules live here: each
// method calls one engine function and stores the result. It also holds the
// screen state (open sheets, camera mode, phone) and the player's chat replies.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getLocation, university } from '../content/university';
import { currentSlot, doAction, resolveEvent, startGame } from '../game/engine';
import type { GameState, PlayerSetup, Slot } from '../game/types';

export type CameraMode = 'follow' | 'overview';
export type PhoneApp =
  | 'home'
  | 'messages'
  | 'calendar'
  | 'wallet'
  | 'updates'
  | 'places'
  | 'market'
  | 'leaderboard'
  | 'settings';

interface GameStore {
  /** The saved game, or null before the first start. */
  game: GameState | null;
  /** Which building the player is standing at, or null when out walking. Saved. */
  playerLocationId: string | null;
  /** True once this semester's result is on the online leaderboard. Saved. */
  resultSubmitted: boolean;
  /** Lines the player sent in the department group chat. Saved. */
  chatReplies: Array<{ day: number; slot: Slot; text: string }>;
  /** How many classmate messages the player has seen. Saved. */
  chatRead: number;

  // ---- screen state, not saved ----
  /** Where the player is walking to after tapping a building. */
  travelTargetId: string | null;
  /** True while that trip is a keke ride (instant) rather than a walk. */
  riding: boolean;
  /** Which building's sheet is open. */
  selectedLocationId: string | null;
  /** Close-up on the player (with joystick) or the whole campus. */
  cameraMode: CameraMode;
  /** A door the player is standing near while walking with the joystick. */
  nearbyLocationId: string | null;
  /** Which phone screen is open, or null when the phone is away. */
  phoneApp: PhoneApp | null;
  profileOpen: boolean;

  start: (setup: PlayerSetup) => void;
  /** Opens a building's sheet straight away (list, Places app, Enter button). */
  tapLocation: (locationId: string) => void;
  /** 3D map: walk to a building; the sheet opens on arrival. */
  travelTo: (locationId: string) => void;
  /** Called by the 3D scene when the walk ends. */
  arrive: () => void;
  /** Ride a keke from a stop to another stop. */
  rideTo: (stopId: string) => void;
  /** Joystick took over: stop any walk to a tapped building. */
  cancelTravel: () => void;
  /** The player walked away from the building they were at. */
  leaveLocation: () => void;
  setNearby: (locationId: string | null) => void;
  setCameraMode: (mode: CameraMode) => void;
  closeSheet: () => void;
  act: (actionId: string) => void;
  chooseEvent: (choiceIndex: 0 | 1) => void;
  openPhone: (app?: PhoneApp) => void;
  closePhone: () => void;
  setProfileOpen: (open: boolean) => void;
  /** Cosmetic: change the character's look mid-semester. */
  setCharacter: (characterId: string) => void;
  sendReply: (text: string) => void;
  markChatRead: (count: number) => void;
  reset: () => void;
  markResultSubmitted: () => void;
}

const freshScreen = {
  travelTargetId: null,
  riding: false,
  selectedLocationId: null,
  nearbyLocationId: null,
  phoneApp: null,
  profileOpen: false,
} as const;

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      game: null,
      playerLocationId: null,
      resultSubmitted: false,
      chatReplies: [],
      chatRead: 0,
      ...freshScreen,
      cameraMode: 'follow',

      start: (setup) =>
        set({
          game: startGame(setup),
          playerLocationId: setup.homeId,
          resultSubmitted: false,
          chatReplies: [],
          chatRead: 0,
          ...freshScreen,
          cameraMode: 'follow',
        }),

      tapLocation: (locationId) =>
        set({ selectedLocationId: locationId, playerLocationId: locationId, travelTargetId: null, phoneApp: null }),

      travelTo: (locationId) => {
        const { playerLocationId, game } = get();
        if (!game || game.pendingEventId) return;
        if (locationId === playerLocationId) set({ selectedLocationId: locationId, travelTargetId: null });
        else set({ travelTargetId: locationId, selectedLocationId: null, riding: false });
      },

      rideTo: (stopId) => {
        if (!get().game) return;
        set({ travelTargetId: stopId, selectedLocationId: null, riding: true });
      },

      arrive: () => {
        const target = get().travelTargetId;
        if (!target) return;
        set({ playerLocationId: target, selectedLocationId: target, travelTargetId: null, riding: false });
      },

      cancelTravel: () => {
        if (get().travelTargetId) set({ travelTargetId: null, riding: false });
      },

      leaveLocation: () => {
        if (get().playerLocationId) set({ playerLocationId: null });
      },

      setNearby: (locationId) => {
        if (get().nearbyLocationId !== locationId) set({ nearbyLocationId: locationId });
      },

      setCameraMode: (mode) => set({ cameraMode: mode }),

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

      openPhone: (app = 'home') => set({ phoneApp: app, profileOpen: false }),
      closePhone: () => set({ phoneApp: null }),
      setProfileOpen: (open) => set({ profileOpen: open, phoneApp: open ? null : get().phoneApp }),

      setCharacter: (characterId) => {
        const { game } = get();
        if (!game) return;
        set({ game: { ...game, player: { ...game.player, characterId } } });
      },

      sendReply: (text) => {
        const { game, chatReplies } = get();
        if (!game) return;
        set({ chatReplies: [...chatReplies, { day: game.day, slot: currentSlot(game), text }] });
      },

      markChatRead: (count) => {
        if (count > get().chatRead) set({ chatRead: count });
      },

      reset: () =>
        set({ game: null, playerLocationId: null, chatReplies: [], chatRead: 0, ...freshScreen, cameraMode: 'follow' }),

      markResultSubmitted: () => set({ resultSubmitted: true }),
    }),
    {
      name: 'campus-life-save',
      version: 5,
      partialize: (state) => ({
        game: state.game,
        playerLocationId: state.playerLocationId,
        resultSubmitted: state.resultSubmitted,
        chatReplies: state.chatReplies,
        chatRead: state.chatRead,
      }),
      // Versions 3 and 4 moved the game onto the real campus map: saves that point at
      // the old placeholder hostels move to the first real one. Anything older
      // than version 2 starts fresh rather than crash.
      migrate: (persisted, version) => {
        const fresh = { game: null, playerLocationId: null, resultSubmitted: false, chatReplies: [], chatRead: 0 };
        if (version < 2 || !persisted || typeof persisted !== 'object') return fresh;
        const s = persisted as { game: GameState | null; playerLocationId: string | null };
        if (s.game && !getLocation(s.game.player.homeId)) {
          const home = university.locations.find((l) => l.type === 'hostel');
          if (home) s.game = { ...s.game, player: { ...s.game.player, homeId: home.id } };
        }
        if (s.playerLocationId && !getLocation(s.playerLocationId)) s.playerLocationId = s.game?.player.homeId ?? null;
        return s as never;
      },
    },
  ),
);
