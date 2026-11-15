# Campus Life

A mobile-first 3D browser game about surviving one semester at university:
juggle Grades, Energy, Social, Stress and Money for 14 days, then share your
CGPA and climb your department's leaderboard.

> **Unofficial fan-made game, not affiliated with any real university.** It uses no crest, logo
> or official seal.

## Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173. To try it on your phone over the same Wi-Fi, run
`npm run dev -- --host` and open the "Network" address it prints.

Other commands:

| Command | What it does |
| --- | --- |
| `npm test` | Runs the game-rule tests (Vitest). |
| `npm run build` | Type-checks and builds the site into `dist/`. |
| `npm run preview` | Serves the built `dist/` folder, to test the real build. |
| `node scripts/make-icons.mjs` | Redraws the app icons in `public/icons/`. |

## Controls

- **Me / Map** (bottom middle): close-up on your character with a joystick, or
  the whole campus at once (drag to pan, pinch to zoom).
- **Tap a building** to walk there; its actions open when you arrive. With the
  joystick, walk up to a door and tap **Enter**.
- **Your picture** (bottom left): stats, today's checklist, your details and
  your look. The ring shows your energy.
- **Phone** (bottom right): department group chat, calendar, wallet, updates,
  places, market, leaderboard and settings (display quality, Start over).

## Set up the online features (optional)

Without these the game is fully playable; the leaderboard, vendor stalls and
analytics are just hidden.

1. Copy `.env.example` to `.env` and fill in the values. Never commit `.env`.
2. **Supabase** (free tier):
   1. Create a project at [supabase.com](https://supabase.com).
   2. Open **SQL Editor > New query**, paste all of `supabase/schema.sql` and run it.
   3. Go to **Authentication > Sign In / Providers** and turn on **Allow anonymous sign-ins**.
   4. Copy the project URL and the `anon` public key from **Project Settings > API**
      into `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. **PostHog** (free tier): create a project and copy its key into
   `VITE_POSTHOG_KEY`. Use `https://eu.i.posthog.com` as `VITE_POSTHOG_HOST` if
   your project is in the EU region.
4. Put your WhatsApp number (digits with country code, like `2348012345678`) in
   `VITE_ADVERTISE_WHATSAPP` so "Advertise here" reaches you.

The anon key is designed to be public; row level security in `schema.sql` is
what protects the data.

## Deploy to Cloudflare Pages (free)

1. Push this folder to a GitHub repository.
2. In Cloudflare: **Workers & Pages > Create > Pages > Connect to Git**, pick the repository.
3. Build settings:
   - Framework preset: **None** (or Vite)
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Under **Settings > Variables and Secrets**, add the same `VITE_...` values as
   in your `.env`, including `VITE_GAME_URL` set to your `*.pages.dev` address.
   These are baked in at build time, so **redeploy after changing them**.
5. Save and deploy. `public/_headers` sets caching, and the service worker lets
   the installed game open without data.

## How to add a vendor

1. Open your Supabase project > **Table Editor > vendors > Insert row**.
2. Fill in:
   - `name`: the stall's name, e.g. `Mama Tee's Kitchen`
   - `location_id`: where it appears. Must be a location id from
     `src/content/university.ts`, e.g. `buka`, `gate`, `business`, `male-estate`
   - `description`: one short line
   - `whatsapp`: digits with country code, e.g. `2348012345678`
   - `items`: up to five, like
     `[{"name": "Jollof rice", "price": 1500}, {"name": "Zobo", "price": 300}]`
   - `active`: tick to show, untick to hide
   - `sort_order`: smaller numbers show first
3. Save. Players see it the next time they open the game.

Each place shows two stall spaces; empty ones say "Stall available" with an
"Advertise here" button.

## Change the school content

Everything about the school is in `src/content/university.ts`: names, the three
sites, map positions, departments, slang and colours. Placeholders are marked
`TODO`. Events are in `src/game/events.ts` (all marked `draft: true` for
rewriting), result titles in `src/game/titles.ts`, and every balance number in
`src/game/config.ts` and `src/game/actions.ts`.

## Where things live

| Folder | What is in it |
| --- | --- |
| `src/game/` | All game rules as pure TypeScript (no React or 3D), with tests. |
| `src/content/` | Everything specific to the school. |
| `src/store/` | Saves the game (localStorage) and connects rules to screens. |
| `src/ui/` | The 2D screens: start, HUD, sheets, results, share card, leaderboard. |
| `src/world/` | The 3D campus, buildings, characters and camera (lazy-loaded). |
| `src/online/` | Supabase and PostHog, all optional and lazy-loaded. |
| `supabase/schema.sql` | Database tables and security rules. |
| `reference/` | The original character design file. |

Decisions taken where the brief was open are in `DECISIONS.md`.
