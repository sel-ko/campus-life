// A flat 2D head-and-shoulders picture of a character, drawn from the same
// CharacterLook colours as the 3D model. Used for the avatar button and profile.
import type { CharacterLook } from '../world/characters/look';

export function Portrait({ look, size = 48 }: { look: CharacterLook; size?: number }) {
  const { skin, hairColor: hair, colors, lip } = look;
  const dark = `color-mix(in srgb, ${skin} 80%, black)`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      {/* Shoulders */}
      <rect x="16" y="80" width="68" height="34" rx="12" fill={colors.top} />
      {look.outfit === 'kaftan' && <rect x="46" y="80" width="8" height="20" fill={colors.accent} />}
      {/* Back hair for long styles */}
      {look.hairStyle === 'braids' && <rect x="18" y="22" width="64" height="70" rx="8" fill={hair} />}
      {look.hairStyle === 'puffs' && (
        <>
          <circle cx="20" cy="18" r="14" fill={hair} />
          <circle cx="80" cy="18" r="14" fill={hair} />
        </>
      )}
      {/* Ears and head */}
      <rect x="15" y="44" width="10" height="18" rx="4" fill={skin} />
      <rect x="75" y="44" width="10" height="18" rx="4" fill={skin} />
      <rect x="21" y="20" width="58" height="60" rx="11" fill={skin} />
      {/* Hair on top */}
      {look.hairStyle === 'beard-cap' ? (
        <>
          <rect x="20" y="10" width="60" height="20" rx="8" fill={colors.extra} />
          <rect x="20" y="27" width="60" height="4" fill={colors.accent} />
          <rect x="21" y="70" width="58" height="10" rx="5" fill={hair} />
          <rect x="40" y="62" width="20" height="3" fill={hair} />
        </>
      ) : (
        <rect x="19" y="16" width="62" height="16" rx="7" fill={hair} />
      )}
      {look.hairStyle === 'puffs' && (
        <>
          <circle cx="30" cy="22" r="4" fill={colors.accent} />
          <circle cx="70" cy="22" r="4" fill={colors.accent} />
        </>
      )}
      {/* Face */}
      <rect x="31" y="38" width="13" height="11" rx="2" fill="#FBF7EE" />
      <rect x="56" y="38" width="13" height="11" rx="2" fill="#FBF7EE" />
      <rect x="34" y="39" width="7" height="9" rx="1" fill="#2A1810" />
      <rect x="59" y="39" width="7" height="9" rx="1" fill="#2A1810" />
      <rect x="30" y="31" width="15" height="4" rx="1" fill={hair} />
      <rect x="55" y="31" width="15" height="4" rx="1" fill={hair} />
      <rect x="45" y="50" width="10" height="8" rx="3" fill={dark} />
      <rect x="38" y="64" width="24" height="4" rx="2" fill={lip} />
    </svg>
  );
}
