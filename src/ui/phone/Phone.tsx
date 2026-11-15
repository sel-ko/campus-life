// The in-game phone. The first page is like a lock screen (big clock, date,
// next step, search, four main apps); swipe for every app. Apps open full
// screen inside the phone with a back button.
import { useState, type ReactElement } from 'react';
import { university } from '../../content/university';
import { SEMESTER_DAYS } from '../../game/config';
import { currentSlot } from '../../game/engine';
import { nextHint } from '../../game/hints';
import type { GameState, LocationType } from '../../game/types';
import { onlineConfigured } from '../../online/supabase';
import { useGameStore, type PhoneApp } from '../../store/gameStore';
import { FULL_DAY_NAMES, SLOT_CLOCK } from '../clock';
import {
  BackIcon,
  BellIcon,
  CalendarIcon,
  ChatIcon,
  CloseIcon,
  MoonIcon,
  PinIcon,
  SlidersIcon,
  StoreIcon,
  SunIcon,
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
type IconC = (p: { size?: number }) => ReactElement;

/** Each app: a pastel tile with a coloured glyph. */
const APPS: Array<{ id: AppId; label: string; Icon: IconC; tile: string; ink: string; online?: boolean }> = [
  { id: 'messages', label: 'Messages', Icon: ChatIcon, tile: '#E6DCFF', ink: '#5B3FD1' },
  { id: 'calendar', label: 'Calendar', Icon: CalendarIcon, tile: '#FFE1DA', ink: '#C2462E' },
  { id: 'wallet', label: 'Wallet', Icon: WalletIcon, tile: '#FFF1C9', ink: '#B7790B' },
  { id: 'places', label: 'Places', Icon: PinIcon, tile: '#D9ECFF', ink: '#2F6FB7' },
  { id: 'updates', label: 'Updates', Icon: BellIcon, tile: '#EDE3FF', ink: '#6A4C93' },
  { id: 'market', label: 'Market', Icon: StoreIcon, tile: '#FFE6D1', ink: '#C85E14', online: true },
  { id: 'leaderboard', label: 'Ranks', Icon: TrophyIcon, tile: '#FFF0C2', ink: '#9A6F0C', online: true },
  { id: 'settings', label: 'Settings', Icon: SlidersIcon, tile: '#E5E9EE', ink: '#3E4752' },
];
const DOCK: AppId[] = ['messages', 'calendar', 'wallet', 'places'];

function AppTile({ app, badge, onOpen }: { app: (typeof APPS)[number]; badge?: number; onOpen: () => void }) {
  const { Icon } = app;
  return (
    <button onClick={onOpen} className="flex min-w-0 flex-col items-center gap-1.5">
      <span className="relative grid size-[60px] place-items-center rounded-[18px] shadow-md" style={{ background: app.tile, color: app.ink }}>
        <Icon size={28} />
        {!!badge && (
          <span className="absolute -top-1.5 -right-1.5 grid min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">{badge}</span>
        )}
      </span>
      <span className="max-w-full truncate text-xs font-medium text-white">{app.label}</span>
    </button>
  );
}

/** Low blocky campus silhouette along the bottom of the wallpaper. */
function Skyline() {
  const blocks = [
    [0, 30, 26], [24, 44, 18], [40, 22, 30], [68, 58, 16], [82, 36, 22], [102, 26, 34], [134, 50, 20],
    [152, 32, 26], [176, 64, 14], [188, 40, 24], [210, 28, 30], [238, 46, 18], [254, 34, 26], [278, 54, 16], [292, 30, 30],
  ];
  return (
    <svg viewBox="0 0 320 70" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-20 w-full opacity-35" aria-hidden="true">
      {blocks.map(([x, h, w], i) => (
        <rect key={i} x={x} y={70 - h!} width={w} height={h} fill="#0B1117" />
      ))}
    </svg>
  );
}

function HomeScreen({ game, onGo, onPickPlace }: { game: GameState; onGo: (type: LocationType) => void; onPickPlace: (id: string) => void }) {
  const openPhone = useGameStore((s) => s.openPhone);
  const closePhone = useGameStore((s) => s.closePhone);
  const { unread } = useChat(game);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const slot = currentSlot(game);
  const clock = SLOT_CLOCK[slot];
  const hint = nextHint(game);
  const apps = APPS.filter((a) => !a.online || onlineConfigured());
  const q = query.trim().toLowerCase();
  const appHits = q ? apps.filter((a) => a.label.toLowerCase().includes(q)) : [];
  const placeHits = q ? university.locations.filter((l) => l.name.toLowerCase().includes(q)) : [];

  return (
    <div className="relative flex h-full flex-col">
      <div
        className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none]"
        onScroll={(e) => setPage(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
      >
        {/* Page 1: clock, next step, search, main apps */}
        <section className="flex w-full shrink-0 snap-start flex-col gap-4 overflow-y-auto px-5 pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-7xl leading-none font-extrabold tracking-tight">{clock.time}</p>
              <p className="mt-2 text-sm text-white/85">
                {FULL_DAY_NAMES[(game.day - 1) % 7]}, Day {game.day} of {SEMESTER_DAYS} · {university.shortName}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openPhone('updates')} aria-label="Updates" className="grid size-11 place-items-center rounded-full bg-black/35">
                <BellIcon size={20} />
              </button>
              <button onClick={closePhone} aria-label="Put the phone away" className="grid size-11 place-items-center rounded-full bg-black/35">
                <CloseIcon size={20} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="flex h-9 items-center gap-1.5 rounded-full bg-white/15 px-3 text-sm font-medium">
              {slot === 'Night' ? <MoonIcon size={16} /> : <SunIcon size={16} />} {slot} {clock.ampm === 'AM' ? 'class time' : ''}
            </span>
            <button onClick={() => openPhone('messages')} className="flex h-9 items-center gap-1.5 rounded-full bg-black/35 px-3 text-sm font-medium">
              <ChatIcon size={16} /> {unread ? `${unread} new in class group` : 'Class group'}
            </button>
          </div>

          <div className="flex items-center gap-3 rounded-3xl bg-[#2A211B]/90 p-4">
            <span className="text-3xl" aria-hidden="true">
              🎒
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold tracking-wide text-sun uppercase">Your next step</p>
              <p className="font-bold">{hint.title}</p>
              <p className="text-sm text-white/75">{hint.text}</p>
            </div>
            {hint.goTo && (
              <button onClick={() => onGo(hint.goTo!)} className="shrink-0 rounded-full bg-[#CDB8FF] px-3.5 py-2 text-sm font-semibold text-[#2C1F66]">
                Go
              </button>
            )}
          </div>

          <label className="flex h-12 items-center gap-2 rounded-2xl bg-black/45 px-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#CDB8FF" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search apps and places"
              aria-label="Search apps and places"
              className="min-w-0 flex-1 bg-transparent text-base text-white placeholder:text-white/55 focus:outline-none"
            />
          </label>

          {q ? (
            <ul className="flex flex-col gap-1 rounded-2xl bg-black/35 p-2">
              {appHits.map((a) => (
                <li key={a.id}>
                  <button onClick={() => openPhone(a.id)} className="flex min-h-11 w-full items-center px-2 text-left">
                    {a.label} <span className="ml-auto text-xs text-white/60">App</span>
                  </button>
                </li>
              ))}
              {placeHits.map((l) => (
                <li key={l.id}>
                  <button
                    onClick={() => onPickPlace(l.id)}
                    className="flex min-h-11 w-full items-center px-2 text-left"
                  >
                    {l.name} <span className="ml-auto text-xs text-white/60">Go there</span>
                  </button>
                </li>
              ))}
              {appHits.length + placeHits.length === 0 && <li className="px-2 py-2 text-sm text-white/60">Nothing found</li>}
            </ul>
          ) : (
            <div className="grid grid-cols-4 gap-2 pb-24">
              {DOCK.map((id) => {
                const app = APPS.find((a) => a.id === id)!;
                return <AppTile key={id} app={app} badge={id === 'messages' ? unread : 0} onOpen={() => openPhone(id)} />;
              })}
            </div>
          )}
        </section>

        {/* Page 2: every app */}
        <section className="grid w-full shrink-0 snap-start auto-rows-min grid-cols-4 content-start gap-x-2 gap-y-5 px-5 pt-8">
          {apps.map((app) => (
            <AppTile key={app.id} app={app} badge={app.id === 'messages' ? unread : 0} onOpen={() => openPhone(app.id)} />
          ))}
        </section>
      </div>

      <Skyline />
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden="true">
        {[0, 1].map((i) => (
          <span key={i} className={`size-1.5 rounded-full ${page === i ? 'bg-white' : 'bg-white/40'}`} />
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

  /** "Go" on the next-step card: home for rest, otherwise the first place of that kind. */
  function goToType(type: LocationType) {
    const target = type === 'hostel' ? game.player.homeId : university.locations.find((l) => l.type === type)?.id;
    if (target) onPickPlace(target);
  }

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
        className="relative flex h-full max-h-[800px] w-full max-w-[400px] flex-col overflow-hidden rounded-[48px] border-[10px] border-[#0B0C10] text-ink shadow-2xl"
        style={{ background: `linear-gradient(170deg, ${university.colours.primary} 0%, #22405A 45%, #3E5A6E 75%, #93A5AE 100%)` }}
      >
        {/* Camera island */}
        <div className="relative h-9 shrink-0">
          <span className="absolute top-2.5 left-1/2 h-7 w-28 -translate-x-1/2 rounded-full bg-black" />
        </div>

        {app === 'home' ? (
          <div className="min-h-0 flex-1">
            <HomeScreen game={game} onGo={goToType} onPickPlace={onPickPlace} />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col bg-[#14202B]/85">
            <div className="flex h-14 shrink-0 items-center gap-1 px-3">
              <button onClick={() => openPhone('home')} className="grid min-h-11 min-w-11 place-items-center" aria-label="Back to home screen">
                <BackIcon />
              </button>
              <h2 className="flex-1 text-xl font-bold">{current?.label === 'Ranks' ? 'Leaderboard' : current?.label}</h2>
              <button onClick={closePhone} className="grid min-h-11 min-w-11 place-items-center rounded-full bg-white/10" aria-label="Put the phone away">
                <CloseIcon size={20} />
              </button>
            </div>
            <div className={`min-h-0 flex-1 px-5 ${app === 'messages' ? 'overflow-hidden pb-2' : 'overflow-y-auto pb-4'}`}>{screens[app]}</div>
          </div>
        )}

        {/* Home bar */}
        <button onClick={() => (app === 'home' ? closePhone() : openPhone('home'))} className="flex h-7 shrink-0 items-center justify-center" aria-label="Home">
          <span className="h-1.5 w-32 rounded-full bg-white/80" />
        </button>
      </div>
    </div>
  );
}
