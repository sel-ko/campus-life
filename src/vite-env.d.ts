/// <reference types="vite/client" />

// Settings read from .env (see .env.example). All are optional: without them
// the game still works, with the online features hidden.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_POSTHOG_HOST?: string;
  /** Your WhatsApp number for "Advertise here", digits with country code, e.g. 2348012345678. */
  readonly VITE_ADVERTISE_WHATSAPP?: string;
  /** The public link to the game, used on the share card. */
  readonly VITE_GAME_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
