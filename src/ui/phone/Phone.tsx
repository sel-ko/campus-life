// The in-game phone: a home screen with a hint and apps, opened from the
// phone button (or the time and money pills, which jump to an app).
import type { ReactElement } from 'react';
import { university } from '../../content/university';
import { SEMESTER_DAYS } from '../../game/config';
import { currentSlot, dayName } from '../../game/engine';
import { nextHint } from '../../game/hints';
import type { GameState } from '../../game/types';
import { onlineConfigured } from '../../online/supabase';
import { useGameStore, type PhoneApp } from '../../store/gameStore';
import {
  BackIcon,
  BellIcon,
  CalendarIcon,
  ChatIcon,
  CloseIcon,
  PinIcon,
  SlidersIcon,
  StoreIcon,
  TrophyIcon,
  WalletIcon,
} from '../icons';
import { useChat } from '../useChat';
import {
  CalendarApp,
  LeaderboardApp,
  MarketApp,
  MessagesApp,
  PlacesApp,
  SettingsApp,
  UpdatesApp,
  WalletApp,
} from './PhoneApps';

type AppId = Exclude<PhoneApp, 'home'>;

const APPS: Array<{ id: AppId; label: string; Icon: (p: { size?: number }) => ReactElement; colour: string; online?: boolean }> = [
  { id: 'messages', label: 'Messages', Icon: ChatIcon, colour: '#2E8B57' },
  { id: 'calendar', label: 'Calendar', Icon: CalendarIcon, colour: '#C2462E' },
  { id: 'wallet', label: 'Wallet', Icon: WalletIcon, colour: '#C98A12' },
  { id: 'updates', label: 'Updates', Icon: BellIcon, colour: '#6A4C93' },
  { id: 'places', label: 'Places', Icon: PinIcon, colour: '#2F7FC1' },
  { id: 'market', label: 'Market', Icon: StoreIcon, colour: '#E8742A', online: true },
  { id: 'leaderboard', label: 'Ranks', Icon: TrophyIcon, colour: '#A07A1E', online: true },
  { id: 'settings', label: 'Settings', Icon: SlidersIcon, colour: '#4A5560' },
];

function HomeScreen({ game }: { game: GameState }) {
  const openPhone = useGameStore((s) => s.openPhone);
  const { unread } = useChat(game);
  const hint = nextHint(game);
  const apps = APPS.filter((a) => !a.online || onlineConfigured());

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="pt-4">
        <p className="text-5xl font-extrabold tracking-tight">{currentSlot(game)}</p>
        <p className="text-sm text-white/80">
          {dayName(game.day)} · Day {game.day} of {SEMESTER_DAYS} · {university.shortName}
        </p>
      </div>
      <div className="rounded-3xl border border-white/10 bg-black/35 p-4">
        <p className="text-xs font-bold tracking-wide text-sun uppercase">{hint.title}</p>
        <p className="text-sm">{hint.text}</p>
      </div>
      <div className="mt-auto grid grid-cols-4 gap-x-2 gap-y-4 pb-2">
        {apps.map(({ id, label, Icon, colour }) => (
          <button key={id} onClick={() => openPhone(id)} className="flex flex-col items-center gap-1.5">
            <span className="relative grid size-14 place-items-center rounded-2xl bg-white shadow-md" style={{ color: colour }}>
              <Icon size={26} />
              {id === 'messages' && unread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 grid min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">{unread}</span>
              )}
            </span>
            <span className="text-[11px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function Phone({ game, onPickPlace }: { game: GameState; onPickPlace: (id: string) => void }) {
  const app = useGameStore((s) => s.phoneApp);
  const openPhone = useGameStore((s) => s.openPhone);
  const closePhone = useGameStore((s) => s.closePhone);
  if (!app) return null;

  const current = APPS.find((a) => a.id === app);
  const screens: Record<AppId, ReactElement> = {
    messages: <MessagesApp game={game} />,
    calendar: <CalendarApp game={game} />,
    wallet: <WalletApp game={game} />,
    updates: <UpdatesApp game={game} />,
    places: <PlacesApp game={game} onPick={onPickPlace} />,
    market: <MarketApp game={game} />,
    leaderboard: <LeaderboardApp game={game} />,
    settings: <SettingsApp />,
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-3" onClick={closePhone}>
      <div
        role="dialog"
        aria-label="Phone"
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-full max-h-[780px] w-full max-w-[390px] flex-col overflow-hidden rounded-[44px] border-[9px] border-[#0B1117] text-ink shadow-2xl"
        style={{ background: `linear-gradient(165deg, ${university.colours.primary} 0%, #1D2E3C 55%, #14202B 100%)` }}
      >
        {/* Status bar with the camera notch */}
        <div className="relative flex h-10 shrink-0 items-center justify-between px-6 text-xs font-semibold">
          <span>
            {dayName(game.day)} {currentSlot(game)}
          </span>
          <span className="absolute top-2 left-1/2 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
          <span>{university.shortName}</span>
        </div>

        {/* App header: back to home, title, close */}
        <div className="flex h-12 shrink-0 items-center gap-1 px-3">
          {app !== 'home' ? (
            <button onClick={() => openPhone('home')} className="grid min-h-11 min-w-11 place-items-center" aria-label="Back to home screen">
              <BackIcon />
            </button>
          ) : (
            <span className="min-w-11" />
          )}
          <h2 className="flex-1 text-lg font-bold">{current?.label === 'Ranks' ? 'Leaderboard' : current?.label}</h2>
          <button onClick={closePhone} className="grid min-h-11 min-w-11 place-items-center rounded-full bg-white/10" aria-label="Put the phone away">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className={`min-h-0 flex-1 px-5 ${app === 'messages' ? 'overflow-hidden pb-2' : 'overflow-y-auto pb-4'}`}>
          {app === 'home' ? <HomeScreen game={game} /> : screens[app]}
        </div>

        {/* Home bar */}
        <button onClick={() => (app === 'home' ? closePhone() : openPhone('home'))} className="flex h-8 shrink-0 items-center justify-center" aria-label="Home">
          <span className="h-1.5 w-28 rounded-full bg-white/70" />
        </button>
      </div>
    </div>
  );
}
