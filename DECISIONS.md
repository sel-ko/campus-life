# Decisions

Where the brief was open to more than one reading, the simplest reading was
picked and written down here. Change any of these by telling Claude or by editing
the code mentioned.

## Phase 1

1. **School details are placeholders.** The brief only had the full name filled
   in. `src/content/university.ts` has placeholder names, departments, slang and
   colours, each marked `TODO`. The short name is confirmed.
1a. **Three sites.** The real campus is three separate places: PS (Permanent
   Site: arts, business, ICT, law), TS (Temporary Site: sciences) and Crown
   Estate (where everyone lives). The map shows them as three clusters joined
   by roads, not to real scale. Every building and department belongs to a
   site. For now any lecture building works for any student.
2. **Allowance on day 1 comes on top of the starting money.** Broke starts with
   ₦5,000 and the day 1 allowance of ₦3,000 lands at once, so the first screen
   shows ₦8,000. Day 8 pays again at the start of the morning.
3. **Either student estate works for hostel actions.** Any building of type
   `hostel` offers Sleep, Nap, Cook noodles and Sell snacks.
4. **The gate has no actions yet.** It is always dimmed and is there for a
   vendor stall and billboard in Phase 5. The keke park was dropped to stay at
   10 places; it can replace the gate if that suits the school better.
5. **Collapse is checked whenever energy changes**: after an action, after an
   event choice, and at the end of the day. The lost slot can be the next
   morning. Energy stays at 0 after a collapse, so the player must eat or
   rest. Actions that cost energy are still allowed at low energy.
6. **End-of-day order:** social −2, then no-study penalty, then no-food penalty,
   then the burnout check (stress ≥ 90) using the stress after those changes.
   After day 14 the game ends without a collapse check.
7. **Money never goes below ₦0.** Actions that cost more than you have are
   disabled with "You need ₦X". (Event choices that cost money will be handled
   in Phase 2.)
8. **Events wait for the player.** If an event fires, time stops in that slot
   until a choice is made, so a Night event stays on that night. A collapsed
   player is never interrupted by an event.
9. **Event chance:** each action has a 25% chance (`EVENT_CHANCE` in
   `config.ts`) to trigger one matching event, and only one per day. Over about
   four actions that gives an event on roughly two days in three.
10. **Weekend slots:** "Hang out with friends" is open in every slot on
    weekends; lectures are closed on weekends. Night class, library and other
    actions keep their normal slots on weekends.
11. **The no-WebGL fallback is the Phase 1 location list.** The same list of
    buttons will be shown when the 3D map cannot run.
12. **Save game:** the game is saved in localStorage under `campus-life-save`.
    If the save format changes, old saves are dropped instead of crashing.
13. **Tooling not named in the brief but needed by the listed stack:**
    `@vitejs/plugin-react` (React in Vite), `@tailwindcss/vite` (Tailwind's
    official Vite plugin), `typescript`, `@types/react`, `@types/react-dom`.

## Phase 2

14. **Events use slang from the content file.** `events.ts` imports
    `university.slang`, so rewriting a joke usually means editing the content
    file, not the events.
15. **Unaffordable event choices are disabled** with "You need ₦X", like
    actions. Every event has at least one choice that costs no money (a test
    checks this).
16. **Titles:** 8 titles in `titles.ts`, checked top to bottom; the last,
    "Certified Survivor", always matches.
17. **The results screen shows** Social, Stress and Money as its three stats
    (Grades is already shown as the CGPA).
18. **Share card:** "Save image" downloads the PNG; "Share on WhatsApp" opens
    WhatsApp with the text and link (WhatsApp links cannot attach images, so the
    sheet suggests saving first).

## Phase 3

19. **Map layout is not to scale.** PS, TS and Crown Estate are three clusters
    around a clear "hub" each, joined by roads. Positions live in the content
    file.
20. **Lambert materials instead of Standard (PBR).** Almost the same look on
    chunky shapes, much cheaper per pixel on cheap phones.
21. **Same-colour parts are merged** into one mesh per building, and trees are
    instanced, so the whole campus is about 70 draw calls.
22. **Labels are canvas textures on sprites**, not HTML or a font library: no
    extra download.
23. **drei is not used.** Everything needed was short enough to write by hand;
    it can be added later if wanted.
24. **The map pauses** when the tab is hidden, a sheet is open or an event card
    is up. The last frame stays on screen.
25. **The player starts at their own estate.** The start screen asks "Where do
    you stay?"; this also goes into vendor order messages.
26. **"List of places" button** on the map switches to the plain list, which
    is also the automatic fallback when WebGL is missing or the map crashes.

## Phase 4

27. **Characters keep the reference shapes but use vertex colours**, so each
    body part is one mesh and a character is about 10 draw calls instead of 50.
28. **Characters on the map are scaled to about 0.9** so they read at the
    default zoom; buildings stay the same size.
29. **The four previews share one canvas** on the start screen. The 3D code
    loads after the form is showing, so "lazy-load after the start screen"
    means the form appears first and the previews fill in.
30. **Non-player students walk along roads and footpaths** (hub to hub, hub to
    door), never through buildings. Six of them, with seeded random looks.

## Phase 5

31. **Department is stored as its id** (e.g. `law`) in Supabase, so renaming a
    department in the content file does not split the leaderboard.
32. **The leaderboard shows each player's best result only** (a database
    view), so one person cannot fill the top 20.
33. **Simple spam guard:** a player can add at most one result a minute.
    Results are still sent by the browser, so a determined cheater could post a
    fake CGPA; checking results on a server would need paid or extra services.
34. **Results are saved once**, retried each time the results screen opens
    until it works. Department rank appears under the stats when online.
35. **Two stall spaces per place.** Vendors at a place fill them first; the
    rest show "Stall available". The "Advertise here" button only appears when
    `VITE_ADVERTISE_WHATSAPP` is set.
36. **Analytics never includes the nickname.** No autocapture or session
    recording. PostHog loads when the browser is idle.

## Phase 6

37. **Icons are drawn by `scripts/make-icons.mjs`** (no image tools needed).
38. **A small hand-written service worker** caches the game so the installed
    app opens offline. It never caches Supabase, PostHog or WhatsApp, and it is
    only registered in production builds.
39. **The map code is prefetched** 1.5 seconds after the start screen appears,
    so the campus shows quickly after "Start the semester".

## Layout update (glass controls, phone, joystick)

40. **The layout idea comes from your reference screenshots; the look stays
    Campus Life's own.** Same pattern (floating pills, a phone overlay, a
    joystick), with our own colours, icons, app names and screens.
41. **No more top bar or bottom strip.** The map fills the screen. Floating
    pills show the time (tap: Calendar) and money (tap: Wallet). The avatar
    (bottom left) has an energy ring and a red dot when energy or stress is
    risky; tap it for the profile. "What just happened" shows as a short toast
    and in full in the phone's Updates app.
42. **Two camera modes.** "Me" follows the player with a joystick; "Map" fits
    the whole campus on screen and allows drag and pinch. Tapping a building
    walks there in either mode. Players start in "Me".
43. **Joystick walking is blocked by buildings** (simple rectangles per
    building, sliding along walls). Standing near a door shows "Enter
    <place>". Walking away clears "you are at <place>".
44. **The department group chat is simulated classmates, not real players.**
    Messages are picked from draft templates to suit the day and time, the
    same for the same player every time, and work offline. Replies are quick
    chips and only cosmetic. A real chat between players would need moderation,
    reporting and abuse handling, so it is left for a separate decision.
45. **Where settings live.** Profile (tap the avatar): name, department,
    estate, background, stats, today's checklist and changing your look.
    Phone > Settings: display quality and Start over. The old "list of places"
    button is now the phone's Places app (it walks you there on the map).
46. **Display quality.** "Best looks" (default) uses glass blur, edge
    smoothing, 1.5x resolution and 6 students. "Battery saver" uses plain dark
    panels, no smoothing, 1x resolution and 3 students. Blur over a moving 3D
    map is one of the costliest things on a cheap phone.
47. **Market and Ranks apps** only appear when Supabase is set up, like the
    leaderboard before.

## Controls restyle (second reference)

48. **Top row:** clock pill (slot shown as a clock time: Morning 8:00 AM,
    Afternoon 1:00 PM, Evening 6:00 PM, Night 10:00 PM; tap for Calendar), a
    chevron that drops down the four stats and the day, and money with a "+"
    (both open Wallet, which lists ways to earn).
49. **Bottom row:** avatar (energy ring), a nav pill with Home (walk back to
    your estate), Me and Map, and a mini-phone button with the unread badge.
50. **Joystick:** hidden in the close-up view until a finger touches and
    drags on the map; it appears under the finger and goes on release. A short
    tap still taps buildings. A second finger (pinch) cancels it.
51. **Phone home** is lock-screen style: clock, date, next-step card with a Go
    button (walks to a place that helps), search over apps and places, four
    main apps; swipe for all apps.

## Real campus map, phase 1 (layout and debug view)

52. **The map data is never hand-edited**, except `GAP_SHRINK`, set to 0.35 as
    asked. Fixes go in `src/content/campus-overrides.ts` (empty for now).
53. **Scene coordinates** put the estate centre at 0, 0. `WORLD_SCALE` is
    60 / 561 ≈ 0.107 scene units per metre: PS's buildings span 561 m, so PS is
    60 units wide. A test checks it stays between 55 and 65.
54. **Zone shrinking** moves every PS or TS item by the same amount (the zone's
    offset from the estate times GAP_SHRINK − 1), so shapes and sizes inside a
    zone never change. Open-ground polygons and the track have no zone in the
    data, so each goes with the nearest zone centre.
55. **Link roads:** the end nearer PS or TS moves fully with that zone, the
    estate end stays, and points in between move in proportion to distance
    along the road, so the road stays joined at both ends.
56. **Outline cleaning:** points closer than 0.5 m are merged; points less
    than 0.75 m off the line through their neighbours (and spikes) are removed;
    winding is made positive in x/z; anything left with fewer than 3 points,
    under 4 m², or crossing itself becomes its bounding rectangle. With the
    current data no building needed the rectangle fallback.
57. **GAP_SHRINK 0.35 makes zones overlap:** 30 buildings (for example
    `ps-C2` lands on `estate-H12`). The estate is about 1.6 × 1.8 km, so PS and
    TS cannot come that close. **0.6 is the smallest value with no overlap.**
    The debug map outlines overlapping buildings in red and offers 0.35, 0.6
    and 1.
58. **The debug map is a 2D top-down drawing** (true orthographic, north up,
    east right, to scale), not a 3D camera, so ids stay crisp at any zoom. It
    can become a 3D top-down camera once buildings are extruded.
59. **Scale warning for phase 2:** at 0.107 units per metre a one-storey
    block is about 0.34 units tall, while a character is about 3 units tall
    (28 m at this scale). Characters will need shrinking or heights
    exaggerating; to be decided in phase 2.

## Real campus map, phases 2 to 4 (3D buildings from the plan)

60. **The 3D campus is built from the map data**; the placeholder campus is
    gone. Every building is its real outline extruded to its height, at its
    real position inside its section.
61. **1 scene unit = 1 metre** (`WORLD_SCALE = 1`), not "PS 60 units wide".
    At 60 units a character would stand as tall as a 9-storey block; at real
    scale a character is about one storey tall. Long trips are made quick
    instead: tap-to-walk follows the roads and never takes more than about
    6 seconds; the joystick walks at 8 m/s.
62. **Sections are pulled in per section, not by one shared factor.**
    GAP_SHRINK (0.35) is the target, but each section only comes as close as
    it can while staying 20 m clear of the estate's buildings (real outlines,
    not boxes). Result: PS at 0.59, TS at 0.47 of their real distance. A
    single shared value needed 0.6 for both.
63. **Rectangular buildings are 3 storeys** (four corners within 15° of
    square). Otherwise floors come from the data with minimums by kind (class,
    lab, admin 2; hospital, library 3; hostels 2 or 3 and specials 1 or 2 by a
    hash of the id). 3.2 m per storey. Overrides win.
64. **Big irregular hostel outlines are compounds.** 20 estate "hostels" are
    outlines of 3,000 to 15,000 m², which are clearly several houses traced as
    one shape. They are drawn as a paved yard and a low wall on the real
    outline, with separate 2 to 3 storey blocks packed inside (kept clear of
    roads that cross them). Only the blocks are solid.
65. **Doors** go on the wall facing the nearest road, with the standing spot
    3 m outside. A deep notch falls back to the next-nearest wall.
66. **Drawing:** per section, all walls are one mesh (window rows from a
    128 px canvas texture, glowing at night) and roofs, plinths, parapets,
    doors, signs and bus stops are a second mesh. Taps find the building from
    the triangle hit, so there are no extra hit boxes. Closed places are
    dimmed by recolouring their part of the mesh once per slot.
67. **Roads** are flat ribbons with round joins, one mesh for all. Traced
    roads are tarmac with a kerb; 'inferred' are narrower; 'unknown' are dirt.
    The camera's near and far planes follow its zoom so roads never flicker.
68. **Which buildings are playable:** class blocks offer lectures and
    fellowship/club meetings; labs offer lectures; the library is the library;
    admin and hospital say "Nothing to do here right now"; Access Bank points
    to the Wallet; the named specials (church, mosque, hotel, morgue, animal
    house, utilities, TS hostel) are labelled with nothing to do yet. Units,
    "other" buildings and hostels are scenery unless assigned below.
69. **Three playable hostels (placeholders):** the three largest real hostel
    blocks in the estate (not compounds), named Crown Estate Hostel A, B and C,
    until `playable` is set in campus-overrides.ts.
70. **Places the old game had without a building in the data** (please
    correct in campus-overrides.ts):
    - Buka: the unidentified estate "other" building nearest the Supermall
      junction.
    - Business centre: the small PS "unit" nearest the PS bus stop.
    - Sports field: the PS running track (tap the track).
    - Main gate: the "Main entrance" marker, drawn as a gate over the road.
    - Crown Estate bus stop: the Supermall junction marker.
71. **Walking:** the road network is the road points every 12 m, joined
    where road ends come within 10 m (plus half widths) of another road and
    where roads cross; any stranded piece is joined to the main network at its
    closest point. Routes use A*. A test checks every place is reachable.
72. **Camera:** steeper (60°) and further out in close-up. The Map view fits
    the player's section; pinching out reaches the whole campus. Panning stays
    within the section (40 m margin) unless zoomed right out.
73. **Buildings no longer hide the player:** a flat silhouette of the
    player shows through anything in front of them.
74. **Old saves** that pointed at the placeholder hostels are moved to the
    first real hostel (save version 4).
75. **Not done yet (next):** bus-stop "Travel to" sheet with a fade, the
    minimap, hiding distant sections, and a per-section performance report.
