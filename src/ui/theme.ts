// Shared class names for the 2D interface (dark glass pills and cards).
export const PILL = 'pointer-events-auto bg-[#16181F]/90 border border-white/10 shadow-lg shadow-black/30 text-ink';
export const CARD = 'rounded-2xl border border-white/10 bg-[#1B2733]';
/** A card inside a sheet or panel. */
export const CARD_SOFT = 'rounded-2xl border border-white/10 bg-white/5 p-3';
/** Small uppercase heading over a section. */
export const LABEL = 'mb-1.5 text-[11px] font-bold tracking-wide text-muted uppercase';
export const BTN = 'min-h-11 rounded-xl px-4 font-semibold disabled:opacity-40';
export const BTN_PRIMARY = `${BTN} bg-sun text-night`;
export const BTN_GHOST = `${BTN} border border-white/20 bg-white/5`;
/** A bottom sheet that scrolls as a whole (used by rooms for their extra lists). */
export const SHEET = 'no-scrollbar sheet-up fixed inset-x-0 bottom-0 z-30 mx-auto max-h-[85vh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl border border-white/10 bg-[#14202B] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl';
/**
 * A bottom sheet with a fixed header and its own scrolling body: put a
 * <header> (shrink-0) and a body with SHEET_BODY inside. Never taller than
 * the screen below the notch.
 */
export const SHEET_PANEL = 'sheet-up flex max-h-[calc(100dvh-max(0.75rem,env(safe-area-inset-top)))] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border-t border-white/10 bg-[#14202B] shadow-2xl';
export const SHEET_BODY = 'min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]';
export const SHEET_BACKDROP = 'fade-in fixed inset-0 z-30 flex items-end justify-center bg-black/55';
