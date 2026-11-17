// The bottom bar, always on screen (on the map and inside rooms), always the
// size it is on a phone, centred on bigger screens: your picture (profile,
// framed by the degree ring with your level),
// Home, Me (close-up on your character), Map (the whole campus, drag to pan)
// and the phone.
import { totalUnread } from '../game/chat';
import type { GameState } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { lookOf } from '../world/characters/look';
import { MapIcon, UserIcon } from './icons';
import { Portrait } from './Portrait';
import { PILL } from './theme';
import { DegreeRing, degreeProgress } from './DegreeRing';
import { NEED_DEFS, needState } from './lifeUi';

const ACTIVE = 'bg-[#3A2F5C] text-white';

function HomeIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function MiniPhone() {
  return (
    <span className="block h-8 w-5 rotate-[-12deg] rounded-[6px] border-2 border-[#0B0C10] bg-gradient-to-b from-[#7C5CFF] to-[#2C1F66] shadow-md">
      <span className="mx-auto mt-0.5 block h-0.5 w-2 rounded-full bg-black/60" />
    </span>
  );
}

/** Height the bar takes, so screens can keep their own controls above it. */
export const BOTTOM_BAR_SPACE = 'calc(62px + max(0.75rem, env(safe-area-inset-bottom)))';

export function BottomBar({ game, showMap }: { game: GameState; showMap: boolean }) {
  const cameraMode = useGameStore((s) => s.cameraMode);
  const setCameraMode = useGameStore((s) => s.setCameraMode);
  const openPhone = useGameStore((s) => s.openPhone);
  const setProfileOpen = useGameStore((s) => s.setProfileOpen);
  const tapPlace = useGameStore((s) => s.tapPlace);
  const leave = useGameStore((s) => s.leave);
  const insideId = useGameStore((s) => s.insidePlaceId);
  const unread = totalUnread(game);
  const warn = game.ill || NEED_DEFS.some((d) => needState(game, d.key).tone === 'bad');
  const battery = Math.round(game.phone.battery);

  const goHome = () => {
    if (insideId === game.room.placeId) return;
    if (insideId) leave();
    tapPlace(game.room.placeId);
  };
  const view = (mode: 'follow' | 'overview') => {
    if (insideId) leave();
    setCameraMode(mode);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[25] px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-3">
      <div className="mx-auto flex w-full max-w-[440px] items-center justify-between gap-2">
        <button
          onClick={() => setProfileOpen(true)}
          aria-label={`${game.player.name}: your profile. ${game.academics.level}00 level, ${Math.round(degreeProgress(game).share * 100)}% of your degree done`}
          className="pointer-events-auto relative grid size-[54px] shrink-0 place-items-center rounded-full bg-[#16181F]/90 shadow-lg shadow-black/30"
        >
          <DegreeRing game={game} size={54} labels={false}>
            <span className="grid size-[42px] place-items-center overflow-hidden rounded-full bg-[#2B4558]">
              <Portrait look={lookOf(game.player)} size={40} />
            </span>
          </DegreeRing>
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-sun px-1.5 text-[9px] leading-[14px] font-black text-night shadow">{game.academics.level}00L</span>
          {warn && <span className="absolute top-0 right-0 size-3 animate-pulse rounded-full border-2 border-night bg-red-400" />}
        </button>

        <nav className={`pointer-events-auto flex h-[52px] min-w-0 flex-1 items-center justify-between gap-1 rounded-full p-1.5 ${PILL}`} aria-label="Main menu">
          <button onClick={goHome} aria-label="Go to your room" aria-pressed={insideId === game.room.placeId} className={`grid h-10 flex-1 place-items-center rounded-full ${insideId === game.room.placeId ? ACTIVE : 'text-muted'}`}>
            <HomeIcon />
          </button>
          {showMap &&
            (
              [
                ['follow', 'Me', UserIcon],
                ['overview', 'Map', MapIcon],
              ] as const
            ).map(([mode, label, Icon]) => {
              const active = !insideId && cameraMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => view(mode)}
                  aria-pressed={active}
                  aria-label={mode === 'follow' ? 'Close-up on me' : 'Whole campus map'}
                  className={`flex h-10 items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ${active ? `${ACTIVE} flex-[1.6]` : 'flex-1 text-muted'}`}
                >
                  <Icon size={20} />
                  {active && <span>{label}</span>}
                </button>
              );
            })}
        </nav>

        <button
          onClick={() => openPhone('home')}
          aria-label={`Phone, battery ${battery}%${unread ? `, ${unread} unread messages` : ''}`}
          className={`pointer-events-auto relative grid size-[54px] shrink-0 place-items-center rounded-full ${PILL}`}
        >
          <MiniPhone />
          {unread > 0 && <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread > 99 ? '99+' : unread}</span>}
          <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full px-1.5 text-[9px] leading-[14px] font-black shadow ${battery <= 15 ? 'animate-pulse bg-red-500 text-white' : battery <= 35 ? 'bg-amber-400 text-night' : 'bg-[#2A2F3A] text-ink'}`}>
            {battery <= 0 ? 'dead' : `${battery}%`}
          </span>
        </button>
      </div>
    </div>
  );
}
