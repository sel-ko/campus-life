// Make your character: a big 3D view you can spin and zoom, with tabs below
// for body, hair, outfit and extras (glasses, hats, bags, jewellery).
// The preview updates as you tap. Chosen once at sign-up.
import { lazy, Suspense, useState } from 'react';
import {
  ACCESSORIES,
  PRESETS,
  accessoryInfo,
  toggleAccessory,
  type AccessoryId,
  type CharacterLook,
  type HairStyle,
  type OutfitStyle,
} from '../../world/characters/look';
import { Portrait } from '../Portrait';
import { hasWebGL } from '../webgl';

const CharacterPreview = lazy(() => import('./CharacterPreview'));

export type Gender = 'male' | 'female';

const SKINS = ['#3B2214', '#4A2C1A', '#5A3620', '#6B4226', '#7A4B2E', '#8D5A3A', '#A0694A', '#C08A64'];
const HAIR_COLOURS = ['#17110D', '#3B2416', '#6B4423', '#8A3B2A', '#C9992E', '#D8D2C8'];
const TOPS = ['#2E8B57', '#C2462E', '#2F5D8A', '#F2C230', '#8E3B8A', '#E8742A', '#3FA7A0', '#EDE6D6', '#1F1F24'];
const BOTTOMS = ['#31507A', '#5B86B8', '#2A2A30', '#6B5A44', '#4E6B3A', '#EDE6D6'];
const SHOES = ['#F1EFE8', '#2A1E33', '#6B4423', '#D9482B', '#2F5D8A'];

const HAIR: Record<Gender, Array<[HairStyle, string]>> = {
  male: [
    ['fade', 'Low fade'],
    ['beard-cap', 'Beard and kufi'],
  ],
  female: [
    ['puffs', 'Afro puffs'],
    ['braids', 'Braids'],
  ],
};

const OUTFITS: Array<[OutfitStyle, string]> = [
  ['hoodie', 'Hoodie + bag'],
  ['tee-jeans', 'Tee and jeans'],
  ['kaftan', 'Kaftan'],
  ['gown', 'Gown'],
];

const ICONS: Record<AccessoryId, string> = {
  glasses: '👓',
  sunglasses: '🕶️',
  cap: '🧢',
  beanie: '🧶',
  gele: '👑',
  headphones: '🎧',
  backpack: '🎒',
  watch: '⌚',
  earrings: '💫',
  necklace: '📿',
};

type Tab = 'body' | 'hair' | 'outfit' | 'extras';
const TABS: Array<[Tab, string]> = [
  ['body', 'Body'],
  ['hair', 'Hair'],
  ['outfit', 'Outfit'],
  ['extras', 'Extras'],
];

const onePiece = (o: OutfitStyle) => o === 'kaftan' || o === 'gown';

/** The starting look for each gender. */
export function baseLook(gender: Gender): CharacterLook {
  return structuredClone(PRESETS[gender === 'female' ? 'f1' : 'm1'].look);
}

/** A random look for the dice button: any colours, up to two extras. */
export function randomCreatorLook(gender: Gender, rand: () => number = Math.random): CharacterLook {
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)]!;
  const base = baseLook(gender);
  const outfit = pick(OUTFITS.filter(([o]) => gender === 'female' || o !== 'gown'))[0];
  const top = pick(TOPS);
  let look: CharacterLook = {
    ...base,
    skin: pick(SKINS),
    hairStyle: pick(HAIR[gender])[0],
    hairColor: rand() < 0.75 ? pick(HAIR_COLOURS.slice(0, 3)) : pick(HAIR_COLOURS),
    outfit,
    colors: { ...base.colors, top, bottom: onePiece(outfit) ? top : pick(BOTTOMS), shoes: pick(SHOES), accent: pick(['#E8742A', '#E3B341', '#C2462E', '#2F5D8A']) },
    accessories: {},
  };
  const allowed = ACCESSORIES.filter((a) => gender === 'female' || (a.id !== 'gele' && a.id !== 'earrings'));
  const count = Math.floor(rand() * 3);
  for (let i = 0; i < count; i++) {
    const a = pick(allowed);
    if (!look.accessories?.[a.id]) look = toggleAccessory(look, a.id);
    look = { ...look, accessories: { ...look.accessories, [a.id]: pick(a.colours) } };
  }
  return look;
}

function Swatches({ label, colours, value, onPick }: { label: string; colours: string[]; value: string; onPick: (c: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <p className="w-16 shrink-0 text-[11px] font-semibold text-muted">{label}</p>
      <div className="flex min-w-0 flex-wrap gap-1.5 py-0.5">
        {colours.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onPick(c)}
            aria-label={`${label} ${c}`}
            aria-pressed={value === c}
            className={`size-8 shrink-0 rounded-full border-2 transition-transform ${value === c ? 'scale-110 border-sun ring-2 ring-sun/40' : 'border-white/20'}`}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}

function Chips<T extends string>({ label, options, value, onPick }: { label: string; options: Array<[T, string]>; value: T; onPick: (v: T) => void }) {
  return (
    <div className="flex items-center gap-2">
      <p className="w-16 shrink-0 text-[11px] font-semibold text-muted">{label}</p>
      <div className="flex min-w-0 flex-wrap gap-1.5">
        {options.map(([id, name]) => (
          <button
            key={id}
            type="button"
            onClick={() => onPick(id)}
            aria-pressed={value === id}
            className={`min-h-9 rounded-full px-3 text-xs font-semibold ${value === id ? 'bg-sun text-night' : 'border border-white/10 bg-white/8'}`}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CharacterCreator({ gender, look, onGender, onLook }: { gender: Gender; look: CharacterLook; onGender: (g: Gender) => void; onLook: (l: CharacterLook) => void }) {
  const [tab, setTab] = useState<Tab>('body');
  const set = (patch: Partial<CharacterLook>) => onLook({ ...look, ...patch });
  const setColour = (patch: Partial<CharacterLook['colors']>) => {
    const colors = { ...look.colors, ...patch };
    // Kaftans and gowns are one cloth.
    if (patch.top && onePiece(look.outfit)) colors.bottom = patch.top;
    onLook({ ...look, colors });
  };
  const worn = look.accessories ?? {};
  const wornIds = ACCESSORIES.filter((a) => worn[a.id]).map((a) => a.id);

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-2">
      {/* The stage: drag to spin, pinch or scroll to zoom. */}
      <div className="relative min-h-[200px] flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_50%_35%,#3A5A72_0%,#1C2D3B_55%,#111A23_100%)]">
        {hasWebGL() ? (
          <Suspense
            fallback={
              <span className="absolute inset-0 grid place-items-center">
                <Portrait look={look} size={120} />
              </span>
            }
          >
            <CharacterPreview look={look} />
          </Suspense>
        ) : (
          <span className="absolute inset-0 grid place-items-center">
            <Portrait look={look} size={120} />
          </span>
        )}
        <button
          type="button"
          onClick={() => onLook(randomCreatorLook(gender))}
          className="absolute top-2 left-2 flex min-h-9 items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-3 text-xs font-bold backdrop-blur"
        >
          <span aria-hidden="true">🎲</span> Randomise
        </button>
        <p className="pointer-events-none absolute inset-x-0 bottom-1.5 text-center text-[10px] font-medium text-white/55">Drag to spin · pinch to zoom</p>
      </div>

      <div className="grid grid-cols-4 gap-1 rounded-full border border-white/10 bg-black/25 p-1" role="tablist" aria-label="Customise">
        {TABS.map(([id, name]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`min-h-9 rounded-full text-xs font-bold transition-colors ${tab === id ? 'bg-sun text-night shadow' : 'text-white/75'}`}
          >
            {name}
            {id === 'extras' && wornIds.length > 0 && <span className="ml-1 text-[10px] opacity-80">{wornIds.length}</span>}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="flex max-h-[34dvh] shrink-0 flex-col gap-2.5 overflow-y-auto overscroll-contain px-0.5 pb-1">
        {tab === 'body' && (
          <>
            <div className="flex items-center gap-2">
              <p className="w-16 shrink-0 text-[11px] font-semibold text-muted">Body</p>
              <div className="grid flex-1 grid-cols-2 gap-1.5" role="radiogroup" aria-label="Gender">
                {(['male', 'female'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    role="radio"
                    aria-checked={gender === g}
                    onClick={() => onGender(g)}
                    className={`min-h-9 rounded-full text-xs font-bold ${gender === g ? 'bg-sun text-night' : 'border border-white/10 bg-white/8'}`}
                  >
                    {g === 'male' ? 'Male' : 'Female'}
                  </button>
                ))}
              </div>
            </div>
            <Swatches label="Skin" colours={SKINS} value={look.skin} onPick={(c) => set({ skin: c })} />
          </>
        )}
        {tab === 'hair' && (
          <>
            <Chips label="Style" options={HAIR[gender]} value={look.hairStyle} onPick={(h) => set({ hairStyle: h })} />
            <Swatches label="Colour" colours={HAIR_COLOURS} value={look.hairColor} onPick={(c) => set({ hairColor: c })} />
          </>
        )}
        {tab === 'outfit' && (
          <>
            <Chips
              label="Style"
              options={OUTFITS}
              value={look.outfit}
              onPick={(o) => onLook({ ...look, outfit: o, colors: { ...look.colors, bottom: onePiece(o) ? look.colors.top : look.colors.bottom } })}
            />
            <Swatches label={onePiece(look.outfit) ? 'Cloth' : 'Top'} colours={TOPS} value={look.colors.top} onPick={(c) => setColour({ top: c })} />
            {!onePiece(look.outfit) && <Swatches label="Trousers" colours={BOTTOMS} value={look.colors.bottom} onPick={(c) => setColour({ bottom: c })} />}
            <Swatches label="Shoes" colours={SHOES} value={look.colors.shoes} onPick={(c) => setColour({ shoes: c })} />
          </>
        )}
        {tab === 'extras' && (
          <>
            <div className="grid grid-cols-5 gap-1.5">
              {ACCESSORIES.map((a) => {
                const on = !!worn[a.id];
                return (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onLook(toggleAccessory(look, a.id))}
                    className={`flex min-h-12 flex-col items-center justify-center rounded-xl border text-[10px] leading-tight font-semibold ${on ? 'border-sun bg-sun/15 text-sun' : 'border-white/10 bg-white/5 text-white/80'}`}
                  >
                    <span className="text-base leading-none" aria-hidden="true">
                      {ICONS[a.id]}
                    </span>
                    <span className="mt-0.5">{a.name}</span>
                  </button>
                );
              })}
            </div>
            {wornIds.length === 0 && <p className="text-center text-[11px] text-muted">Tap an item to wear it. One hat and one pair of glasses at a time.</p>}
            {wornIds.map((id) => (
              <Swatches
                key={id}
                label={accessoryInfo(id).name}
                colours={accessoryInfo(id).colours}
                value={worn[id]!}
                onPick={(c) => onLook({ ...look, accessories: { ...worn, [id]: c } })}
              />
            ))}
          </>
        )}
      </div>
    </section>
  );
}
