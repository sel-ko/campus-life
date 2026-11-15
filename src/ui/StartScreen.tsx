import { useEffect, useState } from 'react';
import { university } from '../content/university';
import { BACKGROUNDS } from '../game/legacy/config';
import { naira } from '../game/legacy/format';
import type { BackgroundId } from '../game/legacy/types';
import { onlineConfigured } from '../online/supabase';
import { useGameStore } from '../store/gameStore';
import type { PresetId } from '../world/characters/look';
import { CharacterChooser } from './CharacterChooser';

const BACKGROUND_IDS: BackgroundId[] = ['broke', 'average', 'comfortable'];
const HOMES = university.locations.filter((l) => l.type === 'hostel');

export function StartScreen({ onLeaderboard }: { onLeaderboard: () => void }) {
  const start = useGameStore((s) => s.start);
  const [nickname, setNickname] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [background, setBackground] = useState<BackgroundId>('average');
  const [homeId, setHomeId] = useState(HOMES[0]?.id ?? '');
  const [characterId, setCharacterId] = useState<PresetId>('m1');

  // While the player fills in the form, quietly download the map code so the
  // campus appears quickly after "Start the semester".
  useEffect(() => {
    const id = window.setTimeout(() => void import('../world/CampusScene').catch(() => undefined), 1500);
    return () => window.clearTimeout(id);
  }, []);

  const name = nickname.trim();
  const ready = name.length > 0 && departmentId !== '';

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    start({ nickname: name, departmentId, background, characterId, homeId });
  }

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-semibold tracking-wide" style={{ color: university.colours.accent }}>
          {university.shortName}
        </p>
        <h1 className="text-4xl font-extrabold">Campus Life</h1>
        <p className="text-muted">Survive one semester. Keep your grades up, your stress down and your account alive.</p>
      </header>

      <form onSubmit={submit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className="font-semibold">Nickname</span>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            placeholder="What do people call you?"
            className="min-h-11 rounded-lg border border-line bg-panel px-3 text-ink placeholder:text-muted/70"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-semibold">Department</span>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="min-h-11 rounded-lg border border-line bg-panel px-3 text-ink"
          >
            <option value="" disabled>
              Choose your department
            </option>
            {university.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-semibold">Where do you stay?</span>
          <select
            value={homeId}
            onChange={(e) => setHomeId(e.target.value)}
            className="min-h-11 rounded-lg border border-line bg-panel px-3 text-ink"
          >
            {HOMES.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-semibold">Background</legend>
          {BACKGROUND_IDS.map((id) => {
            const b = BACKGROUNDS[id];
            const selected = background === id;
            return (
              <label
                key={id}
                className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                  selected ? 'border-sun bg-panel' : 'border-line'
                }`}
              >
                <input
                  type="radio"
                  name="background"
                  value={id}
                  checked={selected}
                  onChange={() => setBackground(id)}
                  className="mt-1 size-5 accent-sun"
                />
                <span className="flex flex-col">
                  <span className="font-semibold">{b.label}</span>
                  <span className="text-sm text-muted">
                    {naira(b.startMoney)} to start, {naira(b.weeklyAllowance)} a week. {b.blurb}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>

        <CharacterChooser value={characterId} onChange={setCharacterId} />

        <button
          type="submit"
          disabled={!ready}
          className="min-h-12 rounded-lg bg-sun font-bold text-night disabled:opacity-40"
        >
          Start the semester
        </button>
      </form>

      {onlineConfigured() && (
        <button onClick={onLeaderboard} className="min-h-11 self-center px-4 font-semibold text-sun underline">
          See the leaderboard
        </button>
      )}

      <p className="mt-auto text-center text-xs text-muted">
        Unofficial fan-made game, not affiliated with {university.shortName}.
      </p>
    </main>
  );
}
