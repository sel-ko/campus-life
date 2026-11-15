// What a character looks like, as plain data. Mix any hair with any outfit.

export type HairStyle = 'fade' | 'beard-cap' | 'puffs' | 'braids';
export type OutfitStyle = 'hoodie' | 'kaftan' | 'tee-jeans' | 'gown';

export interface CharacterLook {
  skin: string;
  hairStyle: HairStyle;
  hairColor: string;
  outfit: OutfitStyle;
  colors: {
    /** Hoodie, kaftan, tee or gown. */
    top: string;
    /** Trousers or jeans (the kaftan uses the same cloth). */
    bottom: string;
    shoes: string;
    /** Backpack, gold trim, hair ties or beads. */
    accent: string;
    /** Second detail colour: bag pocket, cap, tote or waistband. */
    extra: string;
  };
  lip: string;
  lashes: boolean;
  /** How much the eyebrows tilt. */
  brow: number;
}

export type PresetId = 'm1' | 'm2' | 'f1' | 'f2';

export interface Preset {
  id: PresetId;
  name: string;
  blurb: string;
  look: CharacterLook;
}

/** The four characters from reference/characters.html, unchanged. */
export const PRESETS: Record<PresetId, Preset> = {
  m1: {
    id: 'm1',
    name: 'Hoodie fresher',
    blurb: 'Low fade, green hoodie, jeans, white sneakers and an orange backpack.',
    look: {
      skin: '#7A4B2E',
      hairStyle: 'fade',
      hairColor: '#17110D',
      outfit: 'hoodie',
      colors: { top: '#2E8B57', bottom: '#31507A', shoes: '#F1EFE8', accent: '#E8742A', extra: '#B8540F' },
      lip: '#3A1F16',
      lashes: false,
      brow: 0.06,
    },
  },
  m2: {
    id: 'm2',
    name: 'Native Friday',
    blurb: 'Chin-strap beard, burgundy cap, cream kaftan with gold embroidery and sandals.',
    look: {
      skin: '#5A3620',
      hairStyle: 'beard-cap',
      hairColor: '#17110D',
      outfit: 'kaftan',
      colors: { top: '#EDE6D6', bottom: '#EDE6D6', shoes: '#6B4423', accent: '#C9992E', extra: '#7A1F2B' },
      lip: '#3A1F16',
      lashes: false,
      brow: 0.02,
    },
  },
  f1: {
    id: 'f1',
    name: 'Afro puffs',
    blurb: 'Two afro puffs with gold ties, hoop earrings, yellow tee, wide-leg jeans and a tote.',
    look: {
      skin: '#8D5A3A',
      hairStyle: 'puffs',
      hairColor: '#1B120D',
      outfit: 'tee-jeans',
      colors: { top: '#F2C230', bottom: '#5B86B8', shoes: '#F1EFE8', accent: '#E3B341', extra: '#D9482B' },
      lip: '#9E3B4B',
      lashes: true,
      brow: 0.1,
    },
  },
  f2: {
    id: 'f2',
    name: 'Braids and gown',
    blurb: 'Long braids with gold beads, purple gown with an orange waistband and hem, and flats.',
    look: {
      skin: '#6B4226',
      hairStyle: 'braids',
      hairColor: '#20140E',
      outfit: 'gown',
      colors: { top: '#8E3B8A', bottom: '#8E3B8A', shoes: '#2A1E33', accent: '#E3B341', extra: '#F08A24' },
      lip: '#B03A5B',
      lashes: true,
      brow: 0.1,
    },
  },
};

export const PRESET_IDS: PresetId[] = ['m1', 'm2', 'f1', 'f2'];

export function presetLook(id: string): CharacterLook {
  return (PRESETS[id as PresetId] ?? PRESETS.m1).look;
}

// ---------- random students ----------

const SKINS = ['#4A2C1A', '#5A3620', '#6B4226', '#7A4B2E', '#8D5A3A', '#A0694A'];
const TOPS = ['#2E8B57', '#C2462E', '#2F5D8A', '#F2C230', '#8E3B8A', '#E8742A', '#EDE6D6', '#1F1F24', '#3FA7A0'];
const BOTTOMS = ['#31507A', '#5B86B8', '#2A2A30', '#6B5A44', '#EDE6D6'];
const SHOES = ['#F1EFE8', '#2A1E33', '#6B4423', '#D9482B'];

/** A random variation of one of the presets, for students walking around. */
export function randomLook(rand: () => number): CharacterLook {
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)]!;
  const base = PRESETS[pick(PRESET_IDS)].look;
  const top = pick(TOPS);
  return {
    ...base,
    skin: pick(SKINS),
    colors: {
      ...base.colors,
      top,
      bottom: base.outfit === 'kaftan' || base.outfit === 'gown' ? top : pick(BOTTOMS),
      shoes: pick(SHOES),
    },
  };
}
