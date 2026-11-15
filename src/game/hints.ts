// A one-line nudge for the phone's home screen, based on the current state.
// Pure: reads the state, changes nothing.
import { ALLOWANCE_DAYS, END_OF_DAY, SEMESTER_DAYS } from './config';
import { currentSlot, isWeekend } from './engine';
import type { GameState, LocationType } from './types';

export interface Hint {
  title: string;
  text: string;
  /** The kind of place that helps, if any (the phone offers to go there). */
  goTo?: LocationType;
}

export function nextHint(game: GameState): Hint {
  const slot = currentSlot(game);
  const m = game.meters;
  if (m.energy <= 20) return { title: 'Energy low', text: 'Eat or nap soon, or you could collapse and lose a slot.', goTo: 'hostel' };
  if (!game.today.ate && (slot === 'Evening' || slot === 'Night')) {
    return { title: 'You never chop today', text: 'Eat at the buka or cook noodles before the day ends.', goTo: 'cafeteria' };
  }
  if (m.stress >= END_OF_DAY.burnoutStressAt - 10) {
    return { title: 'Stress dey high', text: 'Hang out, nap or sleep before burnout hits your grades.', goTo: 'hostel' };
  }
  if (!game.today.studied && slot !== 'Night' && !isWeekend(game.day)) {
    return { title: 'No reading yet', text: 'Attend a lecture or read in the library today.', goTo: slot === 'Evening' ? 'library' : 'lecture' };
  }
  if (ALLOWANCE_DAYS.includes(game.day + 1)) return { title: 'Allowance tomorrow', text: 'Your weekly allowance lands tomorrow morning.' };
  if (isWeekend(game.day)) return { title: 'Weekend', text: 'No lectures. Hang out any time of day.' };
  if (game.day >= SEMESTER_DAYS - 2) return { title: 'Final stretch', text: 'Last few days. Every grade point counts now.' };
  return { title: 'Your move', text: 'Pick where to go next on the map.' };
}
