// The real clock. The game's slots move with actions; the clock and the sky
// show the player's actual local time.
import { useEffect, useState } from 'react';

export function useNow(intervalMs = 15000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** The slot that matches a real time of day (used for the sky colour). */
export function realSlot(date: Date): 0 | 1 | 2 | 3 {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 0;
  if (h >= 12 && h < 17) return 1;
  if (h >= 17 && h < 20) return 2;
  return 3;
}

export const FULL_DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
