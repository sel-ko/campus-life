// How each time of day looks. Pure data; tune freely.
import type { Slot } from '../game/legacy/types';

export interface SlotLook {
  sky: string;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  sunColor: string;
  sunIntensity: number;
  /** Direction the sun light comes from. */
  sunPos: [number, number, number];
  grass: string;
  /** How much windows and lamps glow, 0 to 1. */
  glow: number;
}

export const SLOT_LOOKS: Record<Slot, SlotLook> = {
  Morning: {
    sky: '#F6D9B8',
    hemiSky: '#FFF1DC',
    hemiGround: '#6B8F4E',
    hemiIntensity: 1.6,
    sunColor: '#FFD9A8',
    sunIntensity: 1.6,
    sunPos: [-30, 25, 20],
    grass: '#86C46E',
    glow: 0,
  },
  Afternoon: {
    sky: '#9ED8F5',
    hemiSky: '#E8F6FF',
    hemiGround: '#5E8A45',
    hemiIntensity: 1.8,
    sunColor: '#FFFFFF',
    sunIntensity: 2.0,
    sunPos: [10, 40, 15],
    grass: '#7CC46A',
    glow: 0,
  },
  Evening: {
    sky: '#F2A66B',
    hemiSky: '#FFC89A',
    hemiGround: '#5B5A3A',
    hemiIntensity: 1.3,
    sunColor: '#FF9B5A',
    sunIntensity: 1.5,
    sunPos: [35, 12, 10],
    grass: '#86A85E',
    glow: 0.45,
  },
  Night: {
    sky: '#16223F',
    hemiSky: '#5D73B3',
    hemiGround: '#1E2A2A',
    hemiIntensity: 0.9,
    sunColor: '#9FB6FF',
    sunIntensity: 0.6,
    sunPos: [-15, 30, -10],
    grass: '#3E6E4A',
    glow: 1,
  },
};
