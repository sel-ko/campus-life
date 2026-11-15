// A clock time to show for each time slot (the game itself only knows slots).
import type { Slot } from '../game/legacy/types';

export const SLOT_CLOCK: Record<Slot, { time: string; ampm: 'AM' | 'PM' }> = {
  Morning: { time: '8:00', ampm: 'AM' },
  Afternoon: { time: '1:00', ampm: 'PM' },
  Evening: { time: '6:00', ampm: 'PM' },
  Night: { time: '10:00', ampm: 'PM' },
};

export const FULL_DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
