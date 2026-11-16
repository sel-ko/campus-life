// Make your character: male or female first, then skin, hair, outfit and
// colours. The preview updates as you tap. Chosen once at sign-up.
import type { CharacterLook, HairStyle, OutfitStyle } from '../../world/characters/look';
import { PRESETS } from '../../world/characters/look';
import { Portrait } from '../Portrait';

export type Gender = 'male' | 'female';

const SKINS = ['#4A2C1A', '#5A3620', '#6B4226', '#7A4B2E', '#8D5A3A', '#A0694A'];
const HAIR_COLOURS = ['#17110D', '#3B2416', '#6B4423', '#C9992E'];
const TOPS = ['#2E8B57', '#C2462E', '#2F5D8A', '#F2C230', '#8E3B8A', '#E8742A', '#EDE6D6', '#1F1F24'];
const BOTTOMS = ['#31507A', '#5B86B8', '#2A2A30', '#6B5A44', '#EDE6D6'];
const SHOES = ['#F1EFE8', '#2A1E33', '#6B4423', '#D9482B'];

const HAIR: Record<Gender, Array<[HairStyle, string]>> = {
  male: [
    ['fade', 'Low fade'],
    ['beard-cap', 'Cap and beard'],
  ],
  female: [
    ['puffs', 'Afro puffs'],
    ['braids', 'Braids'],
  ],
};

const OUTFITS: Array<[OutfitStyle, string]> = [
  ['hoodie', 'Hoodie'],
  ['tee-jeans', 'Tee and jeans'],
  ['kaftan', 'Kaftan'],
  ['gown', 'Gown'],
];

/** The starting look for each gender. */
export function baseLook(gender: Gender): CharacterLook {
  return structuredClone(PRESETS[gender === 'female' ? 'f1' : 'm1'].look);
}

function Swatches({ label, colours, value, onPick }: { label: string; colours: string[]; value: string; onPick: (c: string) => void }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-muted">{label}</p>
      <div className="flex flex-wrap gap-2">
        {colours.map((c) => (
          <button key={c} onClick={() => onPick(c)} aria-label={`${label} ${c}`} aria-pressed={value === c} className={`size-9 rounded-full border-2 ${value === c ? 'border-sun ring-2 ring-sun/40' : 'border-white/20'}`} style={{ background: c }} />
        ))}
      </div>
    </div>
  );
}

function Choice<T extends string>({ label, options, value, onPick }: { label: string; options: Array<[T, string]>; value: T; onPick: (v: T) => void }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-muted">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(([id, name]) => (
          <button key={id} onClick={() => onPick(id)} aria-pressed={value === id} className={`min-h-10 rounded-xl px-3 text-sm font-semibold ${value === id ? 'bg-sun text-night' : 'bg-white/10'}`}>
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CharacterCreator({ gender, look, onGender, onLook }: { gender: Gender; look: CharacterLook; onGender: (g: Gender) => void; onLook: (l: CharacterLook) => void }) {
  const set = (patch: Partial<CharacterLook>) => onLook({ ...look, ...patch });
  const setColour = (patch: Partial<CharacterLook['colors']>) => {
    const colors = { ...look.colors, ...patch };
    // Kaftans and gowns are one cloth.
    if (patch.top && (look.outfit === 'kaftan' || look.outfit === 'gown')) colors.bottom = patch.top;
    onLook({ ...look, colors });
  };
  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Gender">
        {(['male', 'female'] as const).map((g) => (
          <button
            key={g}
            role="radio"
            aria-checked={gender === g}
            onClick={() => onGender(g)}
            className={`flex min-h-14 items-center justify-center gap-2 rounded-2xl text-base font-bold ${gender === g ? 'bg-sun text-night' : 'bg-white/10'}`}
          >
            {g === 'male' ? '👨🏾 Male' : '👩🏾 Female'}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-4">
        <span className="grid size-32 shrink-0 place-items-center overflow-hidden rounded-full bg-[#2B4558]">
          <Portrait look={look} size={124} />
        </span>
        <p className="text-sm text-muted">Make your fresher. Tap to change; this is how you look for the whole degree.</p>
      </div>
      <Swatches label="Skin" colours={SKINS} value={look.skin} onPick={(c) => set({ skin: c })} />
      <Choice label="Hair" options={HAIR[gender]} value={look.hairStyle} onPick={(h) => set({ hairStyle: h })} />
      <Swatches label="Hair colour" colours={HAIR_COLOURS} value={look.hairColor} onPick={(c) => set({ hairColor: c })} />
      <Choice
        label="Outfit"
        options={OUTFITS}
        value={look.outfit}
        onPick={(o) => onLook({ ...look, outfit: o, colors: { ...look.colors, bottom: o === 'kaftan' || o === 'gown' ? look.colors.top : look.colors.bottom } })}
      />
      <Swatches label="Top" colours={TOPS} value={look.colors.top} onPick={(c) => setColour({ top: c })} />
      {look.outfit !== 'kaftan' && look.outfit !== 'gown' && <Swatches label="Trousers" colours={BOTTOMS} value={look.colors.bottom} onPick={(c) => setColour({ bottom: c })} />}
      <Swatches label="Shoes" colours={SHOES} value={look.colors.shoes} onPick={(c) => setColour({ shoes: c })} />
    </section>
  );
}
