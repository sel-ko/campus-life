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

## The campus map (from the Campus Planner)

52. **The satellite-map version was dropped** at your request. The map is now
    the layout you drew in the Campus Planner artifact, saved in the
    project as `src/content/campus-layout.json`. To change the map, edit it in the
    planner and ask Claude to pull the new layout in.
53. **Units:** one planner square is 10 m and one scene unit is 1 m, so the
    campus is 480 × 360 m and a character is about one storey tall.
54. **Buildings are boxes only** (rectangles and squares), placed on your
    squares with a margin of 2 to 3.5 m that varies by building, so
    neighbours don't touch and sizes differ. Single-square shops are 5 m
    kiosks with alleys between them, so every kiosk in a cluster has a door.
55. **Every building looks different.** Its id picks the wall colour, trim
    colour, window style (punched, ribbon, tall, breeze-block or shopfront),
    floor height, and extras by type: balconies, breeze-block stair towers,
    setback top floors and roof water tanks on apartments; covered walkways on
    classrooms and lecture theatres; porticos and a rooftop tower on the
    library, faculty and admin blocks; rooftop vents on labs; a canopy and red
    cross on the clinic; striped awnings and signboards on shops and the buka.
    Windows are drawn per floor and light up at night.
56. **Heights:** where you left the planner's default floors, floors vary by
    building within a range for its type (apartments 2 to 5, classrooms 2 to
    3, libraries and faculty blocks 3 to 4, admin 2 to 4, labs 1 to 3, shops 1
    to 2). Where you set floors yourself, your number is kept.
57. **Long plots become several buildings:** apartment and classroom plots
    longer than about 42 m are split into separate blocks 24 to 30 m long with
    6 m gaps, and very deep apartment plots also into two rows. Each block
    gets its own height and look.
58. **Doors** face the side with the most road along it. If that side is
    blocked by a neighbour, the next clear side is used.
59. **What each building does in the game:** classroom blocks offer lectures
    and fellowship/club meetings; lecture theatres lectures; labs lectures;
    library reading; faculty blocks meetings; apartments all the hostel
    actions (each one can be your home); shops print and type; the buka and
    the market food; the field hanging out. Admin, clinic and gate have nothing
    to do yet. Gardens are scenery and can't be tapped.
60. **Names:** generic planner names get numbers when repeated ("Shop 3",
    "Apartment Block 7", "Block B 2"). Your fourth section is still called
    "New section"; rename it in the planner.
61. **Keke stops are working:** tap a stop to ride to any other stop
    instantly. Rides are free (no game rule was added).
62. **Map view** shows the whole campus. Building names appear once you zoom
    in a little; section names always show.
63. **Walking** follows your road squares (A* over the squares, diagonals only
    where they don't cut a corner). Any trip takes at most about 6 seconds.
64. **Draw calls:** about 25 in close-up and about 50 for the whole campus
    (walls in five meshes by window style, everything else in one).

## The full-degree rebuild

65. **The new rules live in `src/game/`** as pure TypeScript. While they were
    being built, the old one-semester game sat in `src/game/legacy/` so the
    app kept working; the screens moved to the new rules in part 8 and the
    legacy folder was then deleted.
66. **How rules stay pure:** every public rule function copies the state
    (`structuredClone`), changes the copy and returns it (`produce` in
    `draft.ts`). The caller's state is never changed.
67. **One seeded generator** (mulberry32, `rng.ts`). Its whole state is one
    number saved as `GameState.rng`, so a saved game replays the same luck.
68. **Save format version 2.** Older saves are not migrated: the player starts
    fresh and sees a short "the game has been rebuilt" note.
69. **The clock:** `year` counts sessions played, `day` is 1 to 14, `slot` is
    0 to 3 (Morning to Night), and `dayCount` never resets (used for
    deadlines and "come back tomorrow").
70. **Programmes:** all 28 programmes from the brief, each with a three-letter
    department prefix (MED, NSC, MLS, ANA, PIO, BCH, PHA, LAW, CHE, PEE, CVE,
    EEE, MEE, CSC, MCB, ICH, PHY, ACC, BUS, BFN, ECO, ENG, MAC, POL, INR, SOC,
    THA, GRP). Engineering shares GET courses. Science-based 100 level shares
    BIO, CHM, PHY and MTH. Every list is marked draft.
71. **300 level and above is generated** from each programme's list of
    advanced titles (`src/game/curriculum.ts`): normally five 3-unit courses
    and one 2-unit course. Special semesters:
    - industrial training (SIWES): 300 level second semester for sciences
      (including Anatomy, Physiology and Biochemistry); 400 level second
      semester for engineering;
    - clinical postings: Medicine, Nursing and Medical Laboratory Science
      from 400 level, Pharmacy from 500 level;
    - Law: moot court in 400 level first semester, chambers attachment in
      400 level second semester;
    - final year: a research seminar in the first semester and a final-year
      project in the second, for everyone.
72. **Pharmacy is 6 years** (the brief said CONFIRM 5 or 6).
73. **Missing the cut-off** admits the player to a random course that is not
    competitive, never the one they chose.
74. **Entrance test:** 70 questions (general, science, maths, English,
    geography), 10 drawn per game. **Matric numbers** are fictional:
    `UNI/26/CSC/0421`.
75. **Fees are scaled for play**, not real fee levels (per session):
    acceptance ₦15,000 (₦20,000 competitive, year one only), school fees
    ₦80,000 (₦110,000) in two halves, departmental dues ₦4,000 (₦6,000),
    hostel ₦30,000. Each fee is due by day 11 of its semester.
76. **Who pays the fees:** at the start of each semester the family sends the
    money for the fees due that semester into the player's account (a broke
    family sends 80%; the rest has to be hustled). The player must still pay
    each fee on the portal, so the money can be misspent.
77. **Portal:** each payment succeeds, fails because the portal is down (it
    then stays down for the rest of that slot) or debits without recording
    (12% and 6%; +25% and +5% within two days of the deadline). An unrecorded
    debit blocks paying that fee again until a Bursary visit with the alert
    confirms it (45% per visit, better with a good relationship).
78. **Course registration** closes on day 5 (day 8 for new freshers). After
    that a ₦5,000 late fee appears and registration stays open until day 11.
    Unregistered courses cannot be examined.
79. **Allowance** lands on days 1 and 8 of each semester; it can be 1 to 3
    days late (35% broke, 20% average, 8% comfortable). Data costs ₦500 a
    week, taken on the same days.
80. **Campus-wide events:** the real ISO week ("2026-W46") is hashed with a
    fixed seed to pick one of ten campus weeks (power rationing, fuel
    scarcity, portal "upgrade"...). Everyone gets the same one that week.
81. **Clearance offices and documents (CONFIRM):** Admissions (passport +
    photocopy), Registry (2 photocopies), Bursary (printed acceptance receipt,
    and the acceptance fee must show paid), Student Affairs (passport), ICT
    Unit (photocopy), College Office (photocopy + passport), Head of
    Department (photocopy; College Office first), Medical Centre on First
    Campus (passport + ₦3,000 test fee). Documents are bought at a business
    centre and used up when an office signs.
82. **Visit outcomes:** offices open Morning and Afternoon on weekdays;
    evening visits are usually "closed for the day"; weekends always.
    Otherwise: missing documents and unmet prerequisites come first, then
    luck: signed 50% (+ for mornings and a good relationship with the
    officer, − for a long queue), not on seat 15% (+ afternoons), come back
    tomorrow 12% (+ Fridays), "get X's signature first" 7%, "one more
    photocopy" 6% (a spare saves you), closed early 4%. Queues are the same
    for every player at the same time and are long in clearance week.
83. **Clearance is complete** when the form is signed, school fees (first
    instalment), dues and hostel fee are paid, the hostel allocation is
    collected at Student Affairs and the player has registered at the
    University Library. "Money spent" on the clearance share card is
    everything spent from the start of the game until clearance ends.
84. **Before allocation** freshers sleep on a transit bunk in Freshers' Hall
    (worse sleep). Allocation picks a hall in Campus Hostel and three
    roommates.
85. **Timetable:** courses of 3 or more units meet twice a week, smaller
    ones and practicals once; industrial training every weekday morning,
    postings three times a week, chambers three afternoons, moot court one
    evening. Lectures run from day 1 (day 3 for new freshers) to day 11.
    Each meeting can be cancelled (6%, much more with an "absentee"
    lecturer), moved to another hall (6%) or fixed for a weekend (3%).
86. **General courses** alternate between the two big halls (Main Auditorium
    on 2nd Campus, 1000-Seater Hall on First Campus) by the last digit of
    the code. Arriving that slot from somewhere else, or 35% bad luck, means
    no seat: you stand outside and learn half. A course rep who likes you
    (30+) keeps you a seat.
87. **Marks:** test 15 (written at one lecture in week two; missing it scores
    0), assignment 10 (due day 10), attendance 5; exam 70. EPS 312's
    assignment marks come from hustle profit this semester (₦10,000 for full
    marks). GST 121's assignment needs a library card. Industrial training
    and chambers are marked on attendance and the supervisor's goodwill;
    postings on attendance (30) and an end-of-posting exam (70); the project
    on approved chapters (30) and the defence (70).
88. **How well you write a paper** depends on knowledge (0-100) plus a little
    luck, minus tiredness, very high stress and illness. Lecturers have a
    temperament: strict (learn more, mark harder), gentle (mark kinder),
    handout (always sells one; refusing costs goodwill), absentee (cancels a
    lot), jovial (less stress).
89. **Every attempt counts** in the CGPA (a failed course and its retake are
    both on the transcript). An F becomes a carryover in the same semester
    next session. Failing 24 or more units of the session's own courses
    means repeating the year. CGPA below 1.00 for two semesters in a row is
    probation; a third is withdrawal (the game offers a restart).
90. **Final year:** if carryovers remain (or the project failed) the player
    spills over into an extra session taking only those courses. Graduation
    needs no carryovers, a passed project and no open result problem.
91. **Result problems:** each graded course has a 4% chance of a missing
    script (shows 0, fixed at the Registry) or a wrong grade (12 marks low,
    fixed at the College Office). Each visit has a 50% chance to fix it.
92. **Needs:** Hunger rises 7 a slot (0 is full, 100 starving), Energy falls
    3 a slot. Being starving (80+), exhausted (10 or less) or very stressed
    (85+) wears hidden Health down 3 a slot, otherwise it recovers 1. Below
    35 you fall ill (learn half, write worse) until treated (Medical Centre
    ₦1,500, Sick Bay ₦800). At 10 you collapse and lose the day at the
    clinic. Energy at 0 loses the next slot. A night without sleep costs
    energy and stress.
93. **What takes a slot:** lectures, reading, assignments, hustles, office
    visits, the clinic, exams, sleeping, napping and crossing between
    sections on foot. Eating, buying, cooking, paying on the portal and
    chatting are instant, so meals never crowd out the timetable.
94. **Light and water** fail on 25% and 20% of days (more in some campus
    weeks). No light: sleep is hot and short, reading at night is by phone
    torch, cooking in the dark wastes food. No water: noodles and garri need
    a bag of sachet water.
95. **Roommates** (three, drawn each session; 30% chance a friend stays):
    a borrower takes provisions or cash some nights (18%, a fifth of that
    with a padlock); noisy ones spoil sleep; generous ones share food; night
    crawlers wake you at 4 a.m.; readers and tidy ones wake you so you never
    oversleep (12% otherwise). Room levies come up now and then.
96. **Hustles:** snacks (from the start), typing (4 shifts, ₦6,000), tutoring
    (6 shifts and an A somewhere), POS (12 shifts, ₦30,000; fake alerts
    happen), business centre (24 shifts, ₦90,000). A good relationship with
    the hustle partner adds 15%. Errands in the hostel (₦400) and washing
    plates at a buka (₦500 plus a free plate) are always there, so being
    broke is never a dead end.
97. **Recurring cast** (all fictional): Tobi (course rep), Ifeoma "Prof"
    (efiko), Kelechi "K-Money" (hustle partner), Damilola, Osaze and Zainab
    (coursemates), Ejiro (optional love interest), Comrade Tega (senior and
    campus politician), Mama Blessing (buka), six office staff and Dr Osifo
    at the Medical Centre. Plus 12 possible roommates and 20 lecturers.
    Talking once a day raises a relationship. Help unlocks at: course rep 30
    (cover one attendance bar a semester; 40 also leaks test dates two days
    earlier and keeps you a GST seat), efiko 25 (notes) and 40 (group
    study), coursemates and hustle partner 20 (loans of ₦3,000/₦5,000),
    Mama Blessing 15 (a meal on credit), Ejiro 50 (dates), officers (better
    clearance and Bursary luck). Unpaid loans cost 20 relationship points.
98. **Chat:** a freshers' group and a class group from admission, a room chat
    from allocation, and one-to-one threads with anyone you get close to.
    Messages are triggered by the calendar (timetable, class dues,
    departmental week, exam timetable, registration deadline), tomorrow's
    changes (cancelled, moved, weekend lectures, GST batch moves), tests
    (announced 2 days ahead, 4 if the course rep likes you), rumours, false
    alarms and daily chatter. Some messages have reply buttons with effects.
    Threads list their members so real player-to-player chat could replace
    the one-to-one threads later.
99. **Events:** 93 random cards and 5 follow-ups. At most one random event a
    day, with a 20% chance after each action that takes a slot, picked from
    the cards whose conditions match (place, time, level, money, needs,
    roommates, hustles, course kinds, relationships...). Cards already seen
    are less likely. The morning after a theft, a confrontation card comes
    up.
