# Campus Life

A mobile-first 3D browser game about a whole degree at university: get
admitted, survive clearance, fight the portal, attend lectures, read, hustle,
deal with roommates, write exams, clear carryovers and graduate.

> **Unofficial fan-made game, not affiliated with any real university.** It uses no crest, logo
> or official seal. Every person in it is fictional.

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
| `npm test` | Runs the rules tests (Vitest), including a few simulated degrees. |
| `npm run build` | Type-checks and builds the site into `dist/`. |
| `npm run preview` | Serves the built `dist/` folder, to test the real build. |
| `npm run sim` | Plays 200 degrees per strategy and writes the table into `BALANCE.md`. |
| `node scripts/make-icons.mjs` | Redraws the app icons in `public/icons/`. |

## How a game goes

1. **Admission:** your name, look and family background, then the course you
   want, then a 10-question entrance test. Meet the cut-off and you get your
   choice; miss it and you are offered another course. Pick an ambition.
2. **Clearance (week one):** pay the acceptance fee on the portal, get your
   form signed at eight offices (buy photocopies and passports first), pay
   fees, collect your hostel room and register at the library. Then register
   your courses. Lectures start in week two whatever happens.
3. **Each semester (14 days, four slots a day):** follow your timetable,
   write tests, submit assignments, read, eat, sleep, keep your health up,
   pay school fees before exams ("no fees, no exam"), and write your exams on
   days 12 to 14. Results come out at the end. Fs become carryovers.
4. **Each session:** a new room and roommates, new fees, harder courses,
   industrial training, clinical postings or moot court, and in the final
   year a project with a supervisor and a defence. Graduate with no
   carryovers and a passed project.

## Controls

- **Tap a building** to go there. If you are not at its door, a menu offers a
  keke, a cab or walking (free inside one part of campus, a whole slot
  between parts). Inside, a 3D room shows what you can use: tap an object or
  a person, or use the list.
- **Me / Map** (bottom middle): close-up on your character or the whole
  campus. Touch and drag in close-up for the joystick. Pinch to zoom, twist
  two fingers to turn the view, slide two fingers up or down to tilt it.
  Mouse: wheel zooms, right-drag or Shift-drag turns and tilts.
- **Top left:** the real time, the game day and slot; tap for your needs and
  to let a slot pass. **📓** is the journal: every open task, with Go buttons.
- **Your picture** (bottom left): your full student profile: CGPA, courses,
  attendance heatmap, needs, goals, money, room and your look.
- **Phone** (bottom right): Student Portal (fees, registration, course form,
  timetable, results), chats, calendar, wallet, contacts, places, market,
  ranks and settings.

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
   - `location_id`: where it appears. Must be a building id from
     `src/content/campus-overrides.ts`, e.g. `buka-21` (Mama Blessing's Buka) or
     `business-9` (Business Centre)
   - `description`: one short line
   - `whatsapp`: digits with country code, e.g. `2348012345678`
   - `items`: up to five, like
     `[{"name": "Jollof rice", "price": 1500}, {"name": "Zobo", "price": 300}]`
   - `active`: tick to show, untick to hide
   - `sort_order`: smaller numbers show first
3. Save. Players see it the next time they open the game.

Each place shows two stall spaces; empty ones say "Stall available" with an
"Advertise here" button.

## Change the campus map

The map comes from the layout drawn in the **Campus Planner** artifact
(https://claude.ai/artifact/Gj4Sq6ekAz9z4tAFN8GHp7), saved in the project as
`src/content/campus-layout.json`. Edit the layout in the planner, then ask Claude
to pull it in. `src/content/campusMap.ts` turns it into buildings, doors and
roads; `src/content/campus-overrides.ts` says what each building is (its name,
kind of place, which offices or colleges are inside) and renames the four
parts of campus.

## Change the content

Everything written is marked `draft: true` until you confirm it.

| What | Where |
| --- | --- |
| Colleges, programmes, durations, cut-offs, course lists | `src/content/courses.ts` |
| Entrance test questions | `src/content/questions.ts` |
| Clearance offices and documents | `src/content/offices.ts` |
| People: cast, roommates, lecturers | `src/content/people.ts` |
| Event cards | `src/content/events.ts` |
| Chat messages | `src/content/chatScripts.ts` |
| Campus-wide weekly events | `src/content/campusWeek.ts` |
| Food, menus, shop items | `src/content/food.ts` |
| Hustles | `src/content/hustles.ts` |
| Ambitions, milestones, weekly objectives | `src/content/ambitions.ts` |
| School name and colours | `src/content/university.ts` |
| Every balance number | `src/game/config.ts` (see `BALANCE.md`) |

## Where things live

| Folder | What is in it |
| --- | --- |
| `src/game/` | All game rules as pure TypeScript (no React or 3D), with tests. `interactions.ts` is the only door the screens use. |
| `src/game/sim/` | The headless simulator and its bots. |
| `src/content/` | Everything specific to the school, as data. |
| `src/store/` | Saves the game (localStorage) and connects rules to screens. |
| `src/ui/` | The 2D screens: admission, map controls, inside screen, phone, journal, profile, summaries. |
| `src/world/` | The 3D campus, rooms, characters and camera (lazy-loaded). |
| `src/online/` | Supabase and PostHog, all optional and lazy-loaded. |
| `supabase/schema.sql` | Database tables and security rules. |

Decisions taken where the brief was open are in `DECISIONS.md`; how the
numbers were tuned is in `BALANCE.md`.
