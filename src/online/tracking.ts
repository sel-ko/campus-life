// Watches the game store and turns changes into analytics events and the
// anonymous sign-in. Kept outside the store so the store stays rule-free.
import { finalResult } from '../game/engine';
import { useGameStore } from '../store/gameStore';
import { track } from './analytics';
import { ensureSignedIn } from './supabase';

export function startTracking(): () => void {
  return useGameStore.subscribe((state, prev) => {
    const game = state.game;
    const before = prev.game;
    if (!game) return;

    // A brand-new game (the store had none, or the player pressed Play again).
    if (!before || game.player !== before.player) {
      track('game_started', {
        background: game.player.background,
        department: game.player.departmentId,
        character: game.player.characterId,
      });
      void ensureSignedIn();
      return;
    }

    if (game.day > before.day) track('day_completed', { day: before.day });

    if (game.finished && !before.finished) {
      const r = finalResult(game);
      track('day_completed', { day: before.day });
      track('semester_completed', { cgpa: r.cgpa, class: r.className, title: r.title, money: game.money });
    }
  });
}
