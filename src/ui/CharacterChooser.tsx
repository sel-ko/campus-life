import { lazy, Suspense } from 'react';
import { PRESETS, PRESET_IDS, type PresetId } from '../world/characters/look';
import { ErrorBoundary } from './ErrorBoundary';
import { usePageVisible } from './usePageVisible';
import { hasWebGL } from './webgl';

// The 3D previews are a separate download, fetched after the start screen shows.
const CharacterPicker = lazy(() => import('../world/characters/CharacterPicker'));

const SHORT: Record<PresetId, string> = { m1: 'Hoodie', m2: 'Native', f1: 'Puffs', f2: 'Braids' };

export function CharacterChooser({ value, onChange }: { value: PresetId; onChange: (id: PresetId) => void }) {
  const visible = usePageVisible();
  const show3d = hasWebGL();

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-semibold">Character</legend>
      <div className={`relative overflow-hidden rounded-xl border border-line bg-gradient-to-b from-[#2B4558] to-panel ${show3d ? 'h-40' : ''}`}>
        {show3d && (
          <div className="absolute inset-0" aria-hidden="true">
            <ErrorBoundary fallback={null}>
              <Suspense fallback={null}>
                <CharacterPicker selected={value} paused={!visible} />
              </Suspense>
            </ErrorBoundary>
          </div>
        )}
        <div className={`relative grid grid-cols-4 ${show3d ? 'h-full' : ''}`}>
          {PRESET_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-pressed={value === id}
              aria-label={`${PRESETS[id].name}: ${PRESETS[id].blurb}`}
              className={`flex min-h-11 flex-col justify-end rounded-xl border-2 pb-1 text-xs font-semibold ${
                value === id ? 'border-sun text-sun' : 'border-transparent text-muted'
              }`}
            >
              {SHORT[id]}
            </button>
          ))}
        </div>
      </div>
      <p className="text-sm text-muted">
        <span className="font-semibold text-ink">{PRESETS[value].name}.</span> {PRESETS[value].blurb}
      </p>
    </fieldset>
  );
}
