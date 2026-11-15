// Watches the game store and turns changes into analytics events and the
// anonymous sign-in. Kept outside the store so the store stays rule-free.
import { currentCgpa } from '../game/academics';
import { useGameStore } from '../store/gameStore';
import { track } from './analytics';
import { ensureSignedIn } from './supabase';

export function startTracking(): () => void {
  return useGameStore.subscribe((state, prev) => {
    const game = state.game;
    const before = prev.game;
    if (!game) return;
    if (!before || game.player.matric !== before.player.matric) {
      track('game_started', { background: game.player.background, programme: game.player.programmeId, ambition: game.player.ambition });
      void ensureSignedIn();
      return;
    }
    if (!game.clearance.active && before.clearance.active) track('clearance_completed', { days: (game.clearance.endDay ?? 0) - game.clearance.startDay + 1 });
    if (game.academics.transcript.length > before.academics.transcript.length) track('semester_completed', { level: game.academics.level, cgpa: currentCgpa(game) });
    if (game.phase !== before.phase) track(game.phase === 'graduated' ? 'graduated' : 'withdrawn', { cgpa: currentCgpa(game), years: game.clock.year });
  });
}
