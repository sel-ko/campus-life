// The look of the start menu, shared by the first-visit screen (Landing) and
// the saved-game screen (App): the game's logo at the top, a small glass card
// at the bottom, and the live campus visible in between.
import type { ReactNode } from 'react';

/** The glass card the menu buttons sit on. */
export const TITLE_CARD =
  'pointer-events-auto mx-auto flex w-full max-w-sm flex-col gap-2.5 rounded-3xl border border-white/15 bg-[#0F1A24]/72 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl';
/** The big gold button. */
export const TITLE_PRIMARY =
  'flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#FFD06A] to-[#F0A92B] text-base font-extrabold text-night shadow-lg shadow-sun/25 ring-1 ring-white/40 ring-inset active:scale-[0.98] transition-transform';
/** Smaller glass buttons under it. */
export const TITLE_SECONDARY =
  'flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/8 px-3 text-sm font-semibold text-white/90 active:scale-[0.98] transition-transform';
export const DISCLAIMER = 'Unofficial fan-made game. Not affiliated with any real university.';

export function GameLogo() {
  return (
    <div className="flex flex-col items-center gap-1.5 select-none">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="grid size-11 rotate-[-6deg] place-items-center rounded-2xl bg-gradient-to-br from-[#FFD06A] to-[#E8742A] text-2xl shadow-lg shadow-black/40 ring-2 ring-white/40"
        >
          🎓
        </span>
        <h1 className="bg-gradient-to-b from-white via-white to-[#FFDB8A] bg-clip-text text-[2.6rem] leading-none font-black tracking-tight text-transparent drop-shadow-[0_3px_2px_rgba(0,0,0,0.55)]">
          Campus Life
        </h1>
      </div>
      <p className="rounded-full border border-white/10 bg-black/40 px-3 py-0.5 text-[10px] font-bold tracking-[0.22em] text-sun uppercase backdrop-blur">
        The university life game
      </p>
    </div>
  );
}

/**
 * Logo at the top, the card at the bottom. Only the logo and the card take
 * touches, so drags in between reach the campus behind.
 */
export function TitleLayout({ children, hint = true }: { children: ReactNode; hint?: boolean }) {
  return (
    <div className="pointer-events-none flex min-h-full flex-col items-center justify-between gap-4 px-1 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <GameLogo />
      <div className="flex w-full flex-col items-center gap-2">
        {hint && (
          <p className="rounded-full bg-black/40 px-3 py-1 text-[11px] font-medium text-white/80 backdrop-blur">
            <span aria-hidden="true">👆</span> Drag to look around · pinch to zoom
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
