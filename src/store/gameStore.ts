// A thin Zustand wrapper around the rules. No game rule lives here: each
// method calls one function from src/game/ and stores the result. It also
// holds screen state (what is open, where the 3D player is walking).
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PLACES, getPlace } from '../content/places';
import { newGame } from '../game/engine';
import {
  answerChat,
  askParent,
  buyData,
  setAlarm,
  chooseEvent,
  dismissSummary,
  markChatRead,
  payFee,
  payFeesInFull,
  performInteraction,
  registerCourses,
  setCharacter,
  syncCampusWeek,
  travel,
} from '../game/interactions';
import { loadSave } from '../game/save';
import { placeOpen } from '../game/status';
import type { NewGameSetup } from '../game/state';
import type { FeeId, GameState, TravelMode } from '../game/types';
import type { AskReason } from '../game/phone';
import { waitSlot } from '../game/engine';

export type CameraMode = 'follow' | 'overview';
export type PhoneApp = 'home' | 'school' | 'chat' | 'calendar' | 'wallet' | 'people' | 'places' | 'market' | 'leaderboard' | 'settings' | 'clock';

interface GameStore {
  game: GameState | null;
  /** The old save could not be loaded: show a friendly note once. */
  resetNotice: boolean;

  // ---- screen state, not saved ----
  /** The place whose inside screen is open. */
  insidePlaceId: string | null;
  /** A far place the player tapped: the keke / cab / walk menu is open. */
  travelSheetId: string | null;
  /** The 3D player is on the way here (walking, or riding = jump there). */
  walkTargetId: string | null;
  riding: boolean;
  /** How the current trip is made: walking is seen in first person; a keke
   *  drops you at the keke park nearest the place and you walk the rest; a
   *  cab (or your car) takes you to the door. */
  travelMode: TravelMode | null;
  /** The keke park the keke is heading for (world x, z), until you get there. */
  rideStop: [number, number] | null;
  cameraMode: CameraMode;
  /** A door the 3D player is standing near. */
  nearbyPlaceId: string | null;
  phoneApp: PhoneApp | null;
  profileOpen: boolean;
  journalOpen: boolean;

  start: (setup: NewGameSetup) => void;
  /** A building was tapped on the map (or picked in a list). */
  tapPlace: (placeId: string, nearby?: boolean) => void;
  chooseTravel: (mode: TravelMode) => void;
  closeTravelSheet: () => void;
  /** Called by the 3D scene when the walk or ride ends. */
  arrive: () => void;
  /** The joystick took over. */
  cancelWalk: () => void;
  /** The keke dropped you at the park: walk the rest. */
  reachStop: () => void;
  enter: (placeId: string) => void;
  leave: () => void;
  setNearby: (placeId: string | null) => void;
  setCameraMode: (mode: CameraMode) => void;
  perform: (interactionId: string) => void;
  wait: () => void;
  chooseEvent: (index: number) => void;
  payFee: (id: FeeId) => void;
  payFeesInFull: () => void;
  buyData: () => void;
  askParent: (who: 'mum' | 'dad', reason: AskReason) => void;
  setAlarm: (minutes: number | null) => void;
  /** A short message on screen ("The Senate Building is closed"). */
  notice: string | null;
  setNotice: (text: string | null) => void;
  registerCourses: () => void;
  answerChat: (threadId: string, messageId: number, index: number) => void;
  markChatRead: (threadId: string) => void;
  dismissSummary: () => void;
  openPhone: (app?: PhoneApp) => void;
  closePhone: () => void;
  setProfileOpen: (open: boolean) => void;
  setJournalOpen: (open: boolean) => void;
  setCharacter: (characterId: string) => void;
  dismissResetNotice: () => void;
  reset: () => void;
}

const freshScreen = {
  insidePlaceId: null,
  travelSheetId: null,
  walkTargetId: null,
  riding: false,
  travelMode: null,
  rideStop: null,
  nearbyPlaceId: null,
  phoneApp: null,
  profileOpen: false,
  journalOpen: false,
} as const;

/** Every rule call goes through here: it also keeps the campus-wide week current. */
function update(game: GameState, fn: (g: GameState) => GameState): GameState {
  return fn(syncCampusWeek(game, Date.now()));
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => {
      const apply = (fn: (g: GameState) => GameState) => {
        const { game } = get();
        if (game) set({ game: update(game, fn) });
      };
      return {
        game: null,
        resetNotice: false,
        ...freshScreen,
        cameraMode: 'follow',

        start: (setup) => {
          const game = syncCampusWeek(newGame(setup), Date.now());
          // The first thing you see: your room in the hostel.
          set({ game, ...freshScreen, insidePlaceId: game.room.placeId, cameraMode: 'follow', resetNotice: false });
        },

        tapPlace: (placeId, nearby = false) => {
          const { game } = get();
          if (!game) {
            set({ notice: `Apply for admission to go into ${getPlace(placeId)?.name ?? 'buildings'}` });
            return;
          }
          if (game.pendingEvent) return;
          if (nearby || game.location.placeId === placeId) get().enter(placeId);
          else set({ travelSheetId: placeId, phoneApp: null });
        },

        chooseTravel: (mode) => {
          const { game, travelSheetId } = get();
          if (!game || !travelSheetId) return;
          const next = update(game, (g) => travel(g, travelSheetId, mode));
          if (next.location.placeId !== travelSheetId) return; // not allowed (e.g. no fare)
          const to = getPlace(travelSheetId);
          // Kekes run between keke stops: you get off at the stop nearest the place and walk the rest.
          const stop =
            mode === 'keke' && to && to.type !== 'busstop'
              ? PLACES.filter((p) => p.type === 'busstop' && (p.sectionId === 'town') === (to.sectionId === 'town')).sort((a, b) => Math.hypot(a.position[0] - to.position[0], a.position[1] - to.position[1]) - Math.hypot(b.position[0] - to.position[0], b.position[1] - to.position[1]))[0]
              : undefined;
          // The camera stays on you for the whole trip, and after it.
          set({ game: next, travelSheetId: null, walkTargetId: travelSheetId, riding: mode !== 'walk', travelMode: mode, rideStop: stop ? stop.position : null, insidePlaceId: null, cameraMode: 'follow' });
        },

        closeTravelSheet: () => set({ travelSheetId: null }),

        arrive: () => {
          const target = get().walkTargetId;
          if (!target) return;
          const { game } = get();
          const open = game ? placeOpen(game, target) : { open: true };
          const place = getPlace(target);
          set({
            walkTargetId: null,
            riding: false,
            travelMode: null,
            rideStop: null,
            insidePlaceId: place?.enterable && open.open ? target : null,
            notice: place?.enterable && !open.open ? `${place.name}: ${open.reason}` : get().notice,
          });
        },

        cancelWalk: () => {
          if (get().walkTargetId) set({ walkTargetId: null, riding: false, travelMode: null, rideStop: null });
        },

        reachStop: () => set({ rideStop: null, riding: false }),

        enter: (placeId) => {
          const { game } = get();
          if (!game) return;
          const open = placeOpen(game, placeId);
          if (!open.open) {
            set({ notice: `${getPlace(placeId)?.name ?? 'It'}: ${open.reason}`, travelSheetId: null });
            return;
          }
          // Walking in by joystick: moving inside a section is free; crossing costs a slot.
          const moved = game.location.placeId === placeId ? game : update(game, (g) => travel(g, placeId, 'walk'));
          set({ game: moved, insidePlaceId: placeId, travelSheetId: null, phoneApp: null, journalOpen: false });
        },

        leave: () => set({ insidePlaceId: null }),

        setNearby: (placeId) => {
          if (get().nearbyPlaceId !== placeId) set({ nearbyPlaceId: placeId });
        },

        setCameraMode: (mode) => set({ cameraMode: mode }),

        perform: (interactionId) => {
          const { insidePlaceId } = get();
          if (insidePlaceId) apply((g) => performInteraction(g, insidePlaceId, interactionId));
        },

        wait: () => apply(waitSlot),
        chooseEvent: (index) => apply((g) => chooseEvent(g, index)),
        payFee: (id) => apply((g) => payFee(g, id)),
        payFeesInFull: () => apply(payFeesInFull),
        buyData: () => apply(buyData),
        askParent: (who, reason) => apply((g) => askParent(g, who, reason)),
        setAlarm: (minutes) => apply((g) => setAlarm(g, minutes)),
        notice: null,
        setNotice: (notice) => set({ notice }),
        registerCourses: () => apply(registerCourses),
        answerChat: (threadId, messageId, index) => apply((g) => answerChat(g, threadId, messageId, index)),
        markChatRead: (threadId) => apply((g) => markChatRead(g, threadId)),
        dismissSummary: () => apply(dismissSummary),
        setCharacter: (characterId) => apply((g) => setCharacter(g, characterId)),

        openPhone: (app = 'home') => set({ phoneApp: app, profileOpen: false, journalOpen: false }),
        closePhone: () => set({ phoneApp: null }),
        setProfileOpen: (open) => set({ profileOpen: open, phoneApp: open ? null : get().phoneApp, journalOpen: false }),
        setJournalOpen: (open) => set({ journalOpen: open, phoneApp: null, profileOpen: false }),
        dismissResetNotice: () => set({ resetNotice: false }),
        reset: () => set({ game: null, ...freshScreen, cameraMode: 'follow' }),
      };
    },
    {
      name: 'campus-life-save',
      version: 6,
      partialize: (state) => ({ game: state.game }),
      // Saves from the one-semester game cannot be carried over: start fresh with a note.
      migrate: (persisted) => {
        const old = (persisted as { game?: unknown } | null)?.game;
        const { game, wasReset } = loadSave(old);
        return { game, resetNotice: wasReset } as never;
      },
      merge: (persisted, current) => {
        const p = persisted as { game?: unknown; resetNotice?: boolean } | undefined;
        const { game, wasReset } = loadSave(p?.game);
        return { ...current, game, resetNotice: !!p?.resetNotice || wasReset };
      },
    },
  ),
);
