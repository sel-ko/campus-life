// Player settings, kept apart from the game save so "Start over" keeps them.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** 'battery' trades looks for speed: lower resolution, no smoothing or glass
 *  blur, fewer students walking about. */
export type Quality = 'high' | 'battery';

interface SettingsStore {
  quality: Quality;
  setQuality: (q: Quality) => void;
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      quality: 'high',
      setQuality: (quality) => set({ quality }),
    }),
    { name: 'campus-life-settings', version: 1 },
  ),
);

/** Class names for the frosted-glass look; plain dark panels in battery mode
 *  (blurring over a moving 3D map is costly on cheap phones). */
export function useGlass(): string {
  const quality = useSettings((s) => s.quality);
  return quality === 'high'
    ? 'bg-night/45 backdrop-blur-md border border-white/15 shadow-lg shadow-black/25'
    : 'bg-night/85 border border-white/10';
}
