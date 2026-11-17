// What a character looks like, as plain data. Mix any hair with any outfit.

export type HairStyle = 'fade' | 'beard-cap' | 'puffs' | 'braids';
export type OutfitStyle = 'hoodie' | 'kaftan' | 'tee-jeans' | 'gown';

/** Things worn on top of the outfit. Each has its own colour. */
export type AccessoryId = 'glasses' | 'sunglasses' | 'cap' | 'beanie' | 'gele' | 'headphones' | 'backpack' | 'watch' | 'earrings' | 'necklace';

export interface AccessoryInfo {
  id: AccessoryId;
  name: string;
  /** Only one item from a slot at a time (one hat, one pair of glasses). */
  slot?: 'head' | 'eyes';
  colours: string[];
}

const DARK = ['#1B1B1F', '#6B4423', '#C2462E', '#2F5D8A', '#C9992E'];
const CLOTH = ['#1F1F24', '#C2462E', '#2F5D8A', '#2E8B57', '#F2C230', '#8E3B8A', '#E8742A', '#EDE6D6'];
const METAL = ['#E3B341', '#D9DDE2', '#B87333'];

export const ACCESSORIES: AccessoryInfo[] = [
  { id: 'glasses', name: 'Glasses', slot: 'eyes', colours: DARK },
  { id: 'sunglasses', name: 'Shades', slot: 'eyes', colours: ['#1B1B1F', '#C9992E', '#C2462E', '#EDE6D6'] },
  { id: 'cap', name: 'Cap', slot: 'head', colours: CLOTH },
  { id: 'beanie', name: 'Beanie', slot: 'head', colours: CLOTH },
  { id: 'gele', name: 'Gele', slot: 'head', colours: ['#E8742A', '#8E3B8A', '#C9992E', '#2E8B57', '#C2462E', '#2F5D8A'] },
  { id: 'headphones', name: 'Headset', colours: ['#1F1F24', '#EDE6D6', '#C2462E', '#2F5D8A', '#F2C230'] },
  { id: 'backpack', name: 'Backpack', colours: ['#E8742A', '#1F1F24', '#2F5D8A', '#C2462E', '#2E8B57', '#8E3B8A'] },
  { id: 'watch', name: 'Watch', colours: ['#1F1F24', '#6B4423', '#E3B341', '#D9DDE2'] },
  { id: 'earrings', name: 'Earrings', colours: METAL },
  { id: 'necklace', name: 'Necklace', colours: METAL },
];

export function accessoryInfo(id: AccessoryId): AccessoryInfo {
  return ACCESSORIES.find((a) => a.id === id)!;
}

/** Puts an item on (taking off anything else in its slot) or takes it off. */
export function toggleAccessory(look: CharacterLook, id: AccessoryId): CharacterLook {
  const worn = { ...look.accessories };
  if (worn[id]) {
    delete worn[id];
  } else {
    const info = accessoryInfo(id);
    if (info.slot) for (const a of ACCESSORIES) if (a.slot === info.slot) delete worn[a.id];
    worn[id] = info.colours[0]!;
  }
  return { ...look, accessories: worn };
}

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
  /** Worn items and their colours. Missing (older saves) means none. */
  accessories?: Partial<Record<AccessoryId, string>>;
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
export function randomLook(rand: () => number, gender?: 'male' | 'female'): CharacterLook {
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)]!;
  const ids = gender ? PRESET_IDS.filter((id) => id.startsWith(gender === 'female' ? 'f' : 'm')) : PRESET_IDS;
  const base = PRESETS[pick(ids)].look;
  const top = pick(TOPS);
  // Some students wear one thing extra.
  const extra = rand() < 0.45 ? pick(ACCESSORIES.filter((a) => base.lashes || (a.id !== 'gele' && a.id !== 'earrings'))) : null;
  return {
    ...base,
    ...(extra ? { accessories: { [extra.id]: pick(extra.colours) } } : {}),
    skin: pick(SKINS),
    colors: {
      ...base.colors,
      top,
      bottom: base.outfit === 'kaftan' || base.outfit === 'gown' ? top : pick(BOTTOMS),
      shoes: pick(SHOES),
    },
  };
}

/** The player's look: built in the creator, or one of the original presets on older saves. */
export function lookOf(player: { characterId: string; look?: CharacterLook }): CharacterLook {
  return player.look ?? presetLook(player.characterId);
}
