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
89. **CGPA counts each course once, at its latest attempt.** Passing a
    carryover replaces the earlier F, but counts as a C (3 points) at most
    (changed in the First Class tuning, see 122). An F becomes a carryover in
    the same semester next session. Failing 24 or more units of the
    session's own courses means repeating the year. CGPA below 1.00 for two
    semesters in a row is probation; a third is withdrawal (the game offers
    a restart).
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
100. **The screens now use only the interaction API.** Tapping a building
     you are not standing at opens a bottom menu: keke (₦150, not at night),
     cab (₦700) or walk (free inside a section, a whole slot across
     sections). Inside, a 3D room shows a piece of furniture for each target
     (seat, lectern, desks, counter, beds, locker, stove, shelves, benches)
     with a bouncing marker on anything usable now; tapping it or a person
     filters the list underneath. "List only" turns the 3D room off.
101. **Real time:** the clock on the map and the phone, and the sky colour,
     follow the player's real local time. The game's own slots still move
     with actions (a semester would otherwise take 14 real days); the
     current game day and slot are shown next to the clock.
102. **The phone** has the Student Portal (a pretend login with your matric
     number; fees, course registration, a downloadable course form PNG,
     timetable with exams, results), Chats, Calendar, Wallet, Contacts,
     Places, Market (real vendors, online), Ranks and Settings.
103. **The leaderboard** now groups players by programme name, and results
     are posted from the semester and graduation screens by button.
104. **Building roles (all placeholders):** Senate Building = Admissions and
     Registry; Students' Services Building = Bursary, Student Affairs, ICT
     Unit; "Law, Arts and Business Offices" and "Engineering and Sciences
     Offices" (2nd Campus) and "Health Sciences and Pharmacy Offices" (First
     Campus) = College Office and Head of Department for those colleges;
     University Medical Centre = a First Campus classroom block drawn as a
     clinic; general-course halls = Main Auditorium (2nd Campus) and
     1000-Seater Hall (First Campus); classroom blocks assigned to colleges
     by campus; all Campus Hostel blocks are playable halls (Freshers' Hall
     for new students); Mama Blessing's Buka, the market, kiosks and the
     canteen are restaurants; the Business Centre and print kiosks sell
     photocopies, passports and receipts; two off-campus blocks are the IT
     placement and the law chambers; the other off-campus blocks are private
     lodges (not playable yet).
105. **Milestones** are checked at the end of each session for the level just
     finished (a repeated year waits for the next try) and at graduation for
     the final one. Soft Life's "average stress under 45" is measured over
     every slot played.
106. **Elections** only run for the Student Union ambition: class rep in 200
     level, departmental president in 300 level and Student Union president
     in the final year, each on day 10 of the first semester. Votes =
     friends (25+) × 6 + warmth with classmates + campaign effort + luck.
     Campaigning happens at the Sports Complex (₦1,000 a time) and with
     Comrade Tega.
107. **Weekly objectives:** three different ones are drawn on days 1 and 8
     from templates that fit the situation (clearance, lectures, hustles,
     project, fees due, exam week). Count-based ones tick off as soon as they
     are met; "save money", "stay calm" and "stay fed" are judged at the end
     of the week. Each one done takes 5 off stress.
108. **Turning the view:** two fingers twisting turns the camera round the
     campus (yaw); two fingers sliding up or down tilts it (22° to 88°);
     pinching still zooms. With a mouse: right-drag or Shift-drag turns and
     tilts. The brief's "rotation along all axes" is read as turn and tilt:
     rolling the horizon sideways was left out because it makes the map hard
     to read. Pressing Me or Map straightens the view. The joystick follows
     the screen ("up" is always away from the camera).
109. **The character keeps facing** the way it last walked when it stops
     (it used to swing back to face the camera).
110. **Plots for sale:** 14 empty 2×2 squares beside roads outside the four
     sections are highlighted with a gold border and a "Plot for sale" label
     (`PLOTS` in `src/content/places.ts`). Buying them is a later feature.

## Balance pass (simulator)

111. **Freshers' lectures start in week two** (day 8); week one is
     orientation (an orientation session runs in the general-course halls on
     days 1 to 5). The freshers' registration deadline is day 10. Without
     this, clearance (usually 5 to 12 days) made most freshers fail the
     whole first year.
112. **A new fresher's attendance counts from the day their clearance form
     is complete**, and **their first semester does not count towards
     probation**.
113. **An unregistered semester does not count**: its courses become
     carryovers instead of a page of Fs.
114. **One absence per course never bars you.** Courses meet only 2 to 4
     times a semester, so a single missed class would otherwise mean
     dropping below 75%.
115. **Every class of a course together teaches the same total** (about 56
     knowledge for perfect attendance), however often the course meets.
116. **Semester load is capped at 26 units** including carryovers; extra
     carryovers wait for a lighter semester. Up to 14 exam papers fit the
     timetable (days 12 to 14 in four slots, plus two on day 11).
117. **A failed final-year project reopens** for writing and defence.
118. **No oversleeping on an exam or test morning** (you set three alarms).
119. **The acceptance fee is due on day 5**, so paying on day one is not
     already "near the deadline".
120. Tuned numbers: office sign chance 70%, evening offices closed half the
     time, lecture 14 / library 11 / room 8 knowledge, paper performance
     0.25 + 0.8 × knowledge, oversleeping 8%, broke families send 85% of fees
     and ₦7,000 allowance. The final table is in BALANCE.md.
121. **"Random" in the simulator** plays one of the other three strategies
     at random each slot (a bot pressing random buttons is not a strategy).

## First Class tuning

122. **Why nobody got a First:** every failed attempt stayed in the CGPA
     forever, so one rough fresher semester capped a whole degree. Now a
     passed carryover replaces its F in the CGPA, capped at a C. The
     semester GPA on the results screen still shows the F.
123. **A real dead end fixed:** if clearance ran past the end of year one,
     the new session's fee list dropped the acceptance fee, so the Bursary
     could never sign and the player could never register again. The
     acceptance fee now stays on the portal until paid (and paying it is
     remembered across sessions).
124. **General-course halls:** 75% chance of a seat when you arrive early
     (was 65%); standing outside now teaches 60% (was 50%).
125. **Paper performance** 0.27 + 0.8 × knowledge (was 0.25). With the
     retake rule above, the simulator now produces occasional Firsts for
     study and balanced play, 2:1s for most diligent players, 2:2s for
     hustlers. See BALANCE.md.

## Town and night life

126. **No university-specific names in the game.** The game says "admission
     to university"; matric numbers start `UNI/`; the portal is the "Student
     Portal"; the College of Law and two buildings lost their real-world
     names; the disclaimer now reads "Not affiliated with any real
     university". File and code names (campus-layout.json, campus-overrides.ts)
     are unchanged.
127. **The entrance test can be retaken** (new questions each time) when the
     score misses the cut-off. The letter shows attempts in this application
     and the total on this phone; the profile shows the attempts for this
     game.
128. **The town** (`src/content/town.ts`) is a fifth part of the map, west of
     Off-campus, joined to it only by one road about 150 m long through the
     bush. Streets on a grid; bungalows and duplexes in fenced compounds with
     cars, penthouse towers with rooftop pools, City Mall with a car park,
     three parks, a car dealership, a filling station, a bank, a
     supermarket, phone shops, a pharmacy, restaurants, a hotel, a general
     hospital, a cinema, a club, a lounge, an event centre and a motor park.
129. **Getting to town:** keke and cab fares are 2.5 times dearer and
     walking takes two slots. Buying a car (₦150,000 at Prestige Motors)
     adds "Drive your car" (₦300 fuel, any time).
130. **Night life:** the club (party ₦3,000, at night or on weekend
     evenings; VIP table ₦15,000 helps a campaign), the lounge (evenings), the
     cinema (afternoon on), and the event centre (free owambe food at
     weekends). Partying leaves a hangover the next morning. Eight new night
     events.
131. **The bank** gives one student loan at a time: ₦20,000 now, ₦24,000 back
     within 14 days. **The General Hospital** treats for ₦3,000 and heals
     more than the Medical Centre.

## Walkable rooms

132. **Rooms fill the screen and you walk in them.** Inside any building your
     character moves with the joystick (or walks to whatever you tap),
     bumping into furniture and walls. Things you can use show a bouncing ◆
     marker; standing at one (or tapping it) opens a small card with just
     its actions. The full list is still there behind "⋯" (and is the whole
     screen on phones without 3D), with "Wait here". Phone and journal
     buttons sit in the room's top bar.
133. **The shared dorm** is built in the same chunky style as the
     characters: four corners, each with a bed (own sheet colour), a wardrobe
     with a suitcase on top, and a desk with books, a lamp and a plastic
     chair; plus a cooking corner (stove, pot, water bucket), a window with
     bars and curtains, a book shelf with a radio, a rug, posters, slippers
     and a clothes line. Corner one is yours: your bed (sleep, nap), your
     wardrobe (locker, provisions, snacks hustle, levy), your desk (read,
     assignments, project), the stove (cook) and the door (errands).
     Roommates stand at their own beds.
134. **A new game starts inside your dorm room** (Freshers' Hall).
135. Other rooms have their own plans: lecture halls (seat rows, board,
     lectern, exam desk), labs (benches with equipment), the library
     (shelves, tables, desk), offices (one desk per office, waiting
     benches), eateries and shops (counter and tables), clinics (doctor's
     desk, beds), workplaces, the club and lounge (dance floor, bar, sofas),
     the cinema (screen and seat rows), the event centre, and parks and the
     sports complex (now enterable, outdoors). Characters are 1.8 m tall and
     rooms are 10 to 18 m across so there is room to walk.
136. **Development only:** add `?hour=13` to the address to see the sky at
     1 p.m. (the game otherwise follows the real time).

## A game you can see happening (rooms with life, a story, real actions)

137. **Two new needs: hygiene and bladder.** Hygiene falls 7 a slot (sweaty
     actions like exercise, parties and plate washing take more); bladder
     fills 11 a slot. Below 25 hygiene you are "smelly" and stress creeps up;
     a full bladder is an accident (hygiene −40, stress +15). Bathe at the
     bucket-bath corner in your room (needs running water or sachet water);
     toilets are in your room and in most buildings (free on campus, ₦50 in
     town). Both are quick and take no slot. Old saves get hygiene 70 and
     bladder 20 filled in.
138. **Mood and feelings** (idea from lagoslife.app): a mood word and emoji
     from all needs, plus "feelings" that explain it ("Smelly −15",
     "Pressed −18", "Fresh +8", "Belle full +8", "Clearance wahala −6"...).
139. **Every action shows what it does:** price, how long it takes (quick,
     the whole slot, till morning) and green/red effect chips.
140. **Actions are acted out.** Choosing one makes your character walk to the
     thing and do it in front of you, with a timer: lie in bed under the
     wrapper with floating z's while the room goes dark, bathe with water
     pouring, sit on the toilet, sit and write in class, eat at a table, cook,
     dance, jog, chat. The result floats up ("+30 Hygiene", "−₦1,500").
     Skip finishes early; walking away with the joystick before it starts
     cancels it. The rules still run once, at the end.
141. **The dorm was redesigned:** 13 × 10 m, four corners (bed, wardrobe,
     desk with a phone extension), a bathroom behind low tiled walls (bucket
     bath, WC, sink), a cooking corner with a cooler, a timetable board
     (tap it to see today's plan), windows on both side walls. Characters are
     drawn at 0.45 scale (big head, about 1.3 m) so rooms feel roomy, and
     rooms sit on a patch of ground with cut walls like a doll's house.
142. **Rooms are alive.** Roommates follow a routine (asleep at night,
     reading at their desk, one cooking in the evening); before allocation
     other freshers share the transit room. Other rooms fill with nameless
     students by how busy they are: a packed hall during a GST class, a
     lunch rush at the buka, a queue at the offices, dancers at the club at
     night, joggers on the track.
143. **A story with mandatory steps.** Chapter 1 "Welcome, fresher":
     freshen up, eat, pay acceptance, buy documents, collect the eight
     signatures, pay fees, collect allocation, register at the library.
     Chapter 2 "Officially a student": register courses, first lecture, a
     friend, read. Then one chapter per semester (fees, registration, next
     class, exams, project). A quest chip on the map and in rooms shows the
     next step with a "Go there" button; some steps pay a small reward from
     home (₦300 to ₦2,000, once).
144. **Clearance first:** the town and night life stay closed until the
     clearance form is fully signed ("You are not even a student yet").
145. **The timetable is a day planner:** every part of every day says what
     is on (classes, tests, exams, orientation, clearance office hours,
     allowance, deadlines, the election, meals, free time, sleep), so it is
     never empty. It is on the phone (School app) and the board in your room.
146. Rooms show a live status line ("Class on now: CSC 101 with ...",
     "Lunch rush", "Closed. Opens tomorrow morning").
147. lagoslife.app now redirects to vatarverse.com. The user signed in
     themselves; I only looked at the needs, feelings, goals and skills
     panels for ideas and copied no names, art or text.
148. Simulator bots now use toilets and bathe; the balance table is about
     the same as before (BALANCE.md regenerated).

## Getting around, the map, and a first-time tour

149. **Every building offers keke, cab and walk.** Close by, walking is
     free and quick and listed first; a keke or cab hop inside one part of
     campus costs half the usual fare and no time. Across campus it is as
     before (fares, or a slot on foot; two to town).
150. **Clearance is a route.** The fresher chapter lists the eight offices
     in order, starting with "Start clearance at the Admissions Office
     (building name)", each with what to bring, any fee, and what blocks it.
     Each signature pays ₦200 from home, the last one ₦1,500.
151. **Map pins:** named places show an emoji with their name; other places
     you can go into show an emoji pin when you zoom in; your room is marked
     "🏠 Your room"; a bouncing gold pin sits over the place your story
     wants you next.
152. **Tapping a building opens a place card:** emoji, name, where it is,
     what is happening there now, what you can do inside, and three big
     buttons: Keke, Cab, Walk (with prices). Picking one closes the card.
153. **Zooming out from your character turns the view into the map**
     (past a set distance): the joystick goes away and dragging pans, from
     where you were. "Me" brings the close-up back.
154. **The bottom bar is always on screen**, on the map and inside rooms,
     and is always phone-sized (440 px wide at most, centred on big
     screens). Only the bottom bar: the top bars and other panels use the
     full screen as before. Inside rooms the action cards sit above
     it. Home takes you to your room; Me and Map leave the room.
155. **Panels close themselves after a choice:** the place card after you
     pick a ride, the action card after an action (it stays shut until you
     walk to something else), the quest list after "Go", the needs panel
     and stats panel when you tap outside them or let time pass.
156. **First-time tour:** seven cards (welcome, walking, doing things, your
     story, your needs, the bottom bar, getting around), shown once on this
     device; Settings on the phone has "Show the tour again".
157. **The top bar is always on screen too** (time and part of day, journal,
     money), on the map and inside rooms, full width. Rooms have no back
     button: you leave with the bottom bar (Home, Me, Map). Under the top
     bar a room shows its name and live status, "⋯" for all actions, your
     quest and your needs.

## Small details

158. **Reloading during development starts a brand-new game** at the
     admission screen (and shows the tour again); hot reloads while editing
     keep the game. The published game keeps the save and opens on a start
     menu (Continue, New game).
159. **Actions say how long they take in real words** ("⏱ 2 hrs",
     "⏱ 10 min", "⏱ Till morning") instead of "the whole slot". The rules
     still count parts of the day. Every action has an emoji; the extra line
     under an action only shows where it matters (hustles, project, pleading).
     Bottom sheets and cards have no scrollbar strip.
160. **Queues take time.** Where people queue (offices, the Bursary,
     Student Affairs, the clinic, the library desk) the card shows "⏳ 14
     ahead · ~84 min"; doing it first sits you on the waiting bench until
     your turn ("Waiting in the queue · 8 ahead"), then you go to the desk.
161. **Tapping anywhere else closes the action card**, and the "drag to
     walk" hint is gone from rooms.
162. **Follow-up steps:** when an office turns you back, the quest gets a
     follow-up above that office's step ("↳ Get a passport photograph at the
     Business Centre", "↳ The HOD wants the College Office signature first",
     "↳ Find 3,000 naira for the Medical Centre fee", "↳ Come back
     tomorrow"), and it becomes your next step.
163. The dorm lost its clothes line, and you start each visit by your own
     bed and wardrobe.
164. The room header is a small chip like the quest one (place and live
     status). On the right: "⋯", then your room's condition (💧 water,
     💡 light, 🔒 padlock, 💸 levy owed; struck through in red when missing),
     or the queue length elsewhere. Your needs moved to the profile (and the
     clock pill).
165. Sleeping characters close their eyes.
166. The building your story wants you at glows gold (a pulsing box round
     it) instead of a big text sign.
167. **Travel you can see:** walking is shown in first person along the
     road and takes longer (up to about 20 seconds); a keke drops you at the
     keke park nearest the place and you walk the rest; only a cab (or your
     car) takes you to the door.

## Game clock, phone, family money, bag, journal, onboarding

168. **The clock is game time now, not real time** (this replaces the
     earlier "real time" choice). Parts of the day have hours: morning
     7:00 to 12:00, afternoon 12:00 to 16:00, evening 16:00 to 20:00, night
     20:00 to 7:00. Quick things move the clock on by their minutes (bath
     15, toilet 5, eating 20, cooking 35, charging 60, a short ride 5 to
     20...); running past the end of a part of the day passes it. Things
     that take a part of the day run to its end, and the card says so:
     "⏱ 2 hrs 40 min · till 12:00 pm". The sky follows the game time too.
169. **The phone needs charging and data.** It loses 6% a part of the day;
     a night's sleep in your room charges it if there is light, or charge
     it at your desk (an hour) or at a business centre (₦100). Dead: no
     apps. The portal, chats, the market and the leaderboard need data;
     each portal visit uses 40 MB, a chat reply 5 MB, background apps 15 MB
     a part of the day. 1.5 GB comes with the weekly allowance, or buy it
     any time with the bank's USSD code (works without data). The phone
     shows time, data and battery at the top.
170. **Mum and Dad are in your contacts** with a Family chat and a Bank
     alerts thread. You start with the pocket money shown on the start
     screen; at once Dad sends the school fees (credit alert pops up from
     the top, plus his message), and Mum sends upkeep on allowance days.
     Fee payments send debit alerts.
171. **School fees can be paid in full** (both instalments at once) in the
     first semester, or by instalment as before.
172. **School bag** (🎒 in the top bar): papers (photocopies, passport
     photos, receipts, library card), books (manuals, handouts), food,
     medicine and other things, with counts.
173. **Closed buildings cannot be entered**: offices and workplaces keep
     weekday hours (morning and afternoon), eateries and shops close at
     night, lecture halls lock at night, night life keeps its own hours
     and waits for clearance. The Enter button and the place card say when
     it opens; you can still travel there.
174. Map: from a distance buildings show only their emoji; names appear
     when you zoom in close.
175. **Journal** has three tabs: Quest (the chapter with Go buttons and
     rewards), Timetable (the fortnight's day plans, with a green dot for
     classes attended, red for missed, yellow for on now) and Tasks.
176. **Info stack:** under the quest chip, up to three chips for the big
     things coming up (a class now, an exam, a fee deadline, a dying phone
     or no data); tap one to go there.
177. Profile: needs at the top; the course list is replaced by a "View
     courses" tag that opens the school app (only after clearance); you can
     no longer change your character after choosing it.
178. Scrollbars are themed (thin, rounded, gold thumb on a dark track)
     instead of the browser's default.
179. **Start page:** an interactive onboarding of five cards: open your
     admission letter, keep a student's needs up (they fall live), stamp
     the eight clearance offices, tap the phone for Dad's credit alert, and
     see the four endings; then "Apply for admission". The family
     background cards show the starting pocket money prominently.
180. Bots charge their phones at home and buy data when low; the balance
     table is about the same (BALANCE.md regenerated).

## Calendar, timetable, business centre, characters, keke, start screen

181. **Academic calendar with real dates.** The first semester starts on the
     first Monday of October of the start year, the second on the first
     Monday of February; each game day is a date ("Mon 5 Oct"). The journal
     has a Calendar tab: orientation, clearance, lectures begin,
     registration deadlines, fees, upkeep, exam-form signing, every test,
     the election, exams, semester end, and both semesters' date ranges.
     The top bar shows "9:00 am · Mon 5 Oct" (no "Morning").
182. **A real timetable:** Monday to Friday by class periods (8–10, 10–12,
     lunch 12–1, 1–3, 4–6), each class coloured by course with its hall,
     week 1 and week 2 (exams), attendance dots, then the course list with
     a **preparedness meter** (from what you know of the course: Low,
     Fair, Good, Strong). What you know is what passes tests and exams;
     reading raises it and every course slowly fades if not revised
     (0.25 a day). Clearance, buying things and so on are not on the
     timetable: they are tasks.
183. **Tasks have deadlines** ("⏰ By Fri 9 Oct", amber when close, red when
     overdue): clearance steps (by the registration deadline), papers for
     the next office, fees, registration, assignments, upcoming tests, the
     practical manual (by the first practical) and the exam form.
184. **Exam forms** are signed at the College Office on days 8 to 11 (office
     hours, with a queue). Miss it and the invigilator collects a ₦2,000 late
     fee at your first exam. Signing competes with classes for your time.
185. **Clearance in a day is possible.** Office visits are timed visits, not
     whole parts of the day: about five minutes per person in the queue plus
     15 at the desk. Offices open 8:00 to 4:00 on weekdays; early birds find
     almost nobody, mid-morning is the rush. Arrive before 8 and you can
     wait on the bench for the doors to open. "Not on seat" and "come back
     tomorrow" are rarer (7% and 5%).
185b. Sleep has alarms: 6:00 am (an extra hour before 7), 7:00 am, or no
     alarm (you may oversleep). Naps: 30 minutes, an hour, or until the next
     part of the day.
186. **Business centre:** its own room (photocopier, printing desk with a
     computer, passport-photo backdrop with a stool and a camera on a
     tripod, charging station, cashier, queue bench). Services say "Pay":
     photocopies are ₦50 each and you choose how many (1 to 20); passport
     photos; printing the acceptance receipt and admission letter (only
     after the acceptance fee is paid) and the course form (only after
     registration); charging. Each is done at its station, shown in motion.
     The practical manual is only on sale once the practical lecturer drops
     it there (announced in the class group).
187. **Character creation:** choose male or female, then skin, hair (fade
     or cap and beard; puffs or braids), hair colour, outfit (hoodie, tee and
     jeans, kaftan, gown), top, trousers and shoes. Fixed for the degree. The
     four ready-made characters are gone from sign-up (old saves keep
     theirs). **Hostel rooms are single-sex:** roommates and the freshers on
     the transit bunks share your gender.
188. **Quest tag:** when a step is for the room you are in, or an office has
     just sent you off for something, it floats over your character's head.
189. **The bag** opens as a dropdown under the top bar.
190. **Keke stops** were added across campus (three more where there was
     room, including Off-campus, which had none), on garden corners by the
     roads. A keke never drops you at the door: you watch it from above as
     you climb in, it drives along the road to the stop nearest the place,
     you climb out and walk the rest. Only a cab (or your car) goes to the
     door.
191. Map names: up close, building names (no emoji); further out, emoji;
     fully zoomed out, only the section names.
192. **Start screen:** the live campus fills the screen (drag to look
     around); the application card sits on top. Tapping a building says you
     need admission first. "How it works" opens the five interactive cards.
     The application steps sit over the world in a panel.
193. **Deploying:** GitHub Pages through GitHub Actions
     (.github/workflows/deploy.yml): every push to main runs the tests,
     builds with the repository's subfolder as the base path and publishes.
     The service worker and manifest use relative paths so the game works
     from a subfolder or a domain root. Online features stay optional
     (repository variables).
194. **Sign-up on iPhones:** the application form scrolls inside its own
     panel (iOS Safari would not scroll the see-through layer it sat in, so
     the Next button below the character creator was out of reach), the
     main button of every step stays pinned at the bottom of the panel, a
     hint says to type a name when Next is greyed out, and the campus behind
     stops rendering (and is no longer blurred) once the form is open.

## A month-long semester, fees first, rooms you can walk out of

195. **A semester is a month (28 days):** four weeks, weekends on days 6, 7,
     13, 14, 20, 21, 27, 28. Freshers' orientation is day 1 and **lectures
     start on day 2**, so clearance is worth finishing on the first day.
     Lectures run to day 19 (Friday of week 3), exams fill week 4 (days 22 to
     26). Upkeep comes every Monday; fees are due day 19; registration closes
     day 8 (10 for freshers), late registration day 15; exam forms are signed
     days 15 to 19; the election is day 17. The timetable has four weeks.
196. **Home pays everything:** at the start of each semester Dad sends every
     fee due (school fees, dues, hostel, acceptance), and a fresher also gets
     ₦5,000 for clearance papers and the medical fee, whatever the family's
     background (the background changes upkeep and how often a request for
     more money is answered).
197. **Fees come first:** no office signs your clearance form until at least
     the first instalment of school fees is paid. The fresher chapter lists
     acceptance, school fees (half or full), dues and hostel as separate
     steps, then papers, then each office with the papers it needs ("📄 1
     passport photograph, 1 photocopy…") and any fee.
198. **Ask home for money** (phone → Wallet): Mummy or Daddy, for fees,
     feeding, books or an emergency; once a day each. Fees are always found
     (a broke family manages 60% after a few asks); other requests depend on
     the family and get rarer the more you ask in a semester. Their reply and
     the credit alert arrive in the Family and Bank chats.
199. **Food:** every dish has an energy value and an eating time (snacks 2 to
     10 minutes and little energy; rice about 20 minutes; eba, amala or
     pounded yam with soup 35 to 40 minutes and the most energy). Cards show
     "+15 Energy", "-55 Hunger" and the time. More provisions to cook (rice,
     beans); the stove says what to buy when there is nothing to cook.
200. **Decorations:** a poster, a plant, fairy lights, an Ankara duvet and a
     fluffy rug at the hostel market, the provision shop and the mall. They
     appear in your corner, and two or more give a "Cosy corner" feeling.
201. **Sleep fills your energy** (less with no light, noisy roommates or a
     transit bunk). The **alarm is set on the phone** (Alarm app, 5:30 to
     8:00 or none); the bed only offers sleep and naps (30 minutes, an hour,
     or until the next part of the day). Before you sleep, **a recap of the
     day**: what you did, which classes you made or missed, your mood and
     money.
202. **Rooms:** walk out through the doorway to leave (the joystick keeps
     working on the map). Walking to something plans a route round the
     furniture (no more getting stuck on the bed by the bathroom). Nothing
     opens by itself as you walk in. A long card has a "↓ More" hint and a
     visible scrollbar; the desk's many actions are split into tabs (Read,
     Assignments, Project, Phone). Assignments take 45 minutes each, not a
     part of the day. No more errands for seniors.
203. **Clearance feedback:** after a visit the result floats up ("✅ Signed"
     or "❌ Not signed" with the officer's reason); if the office closed while
     you queued, it says so instead of silently doing nothing. A follow-up
     ("come back tomorrow", "bring a passport photograph") floats over your
     head only inside the office that told you; there is no quest text over
     your head on the map. Office rooms lost the queue chip.
204. **Travel:** somewhere close by (under 70 m) offers only "Trek · X is close
     by" (keke and cab are greyed out). The camera stays on you after any
     ride. Cars drive round the roads of campus, the hostels and town.
205. **The dorm holds four:** you and at most three others, one per corner;
     an empty corner means nobody is there.
206. **Dates everywhere:** chats, the phone, tasks, quests, the portal and
     the timetable say "Thu 8 Oct" and times, not "day 4". A red "You're
     late!" chip appears when a class is on and you are not there. The
     profile shows a live mood line ("😩 Pressed · tired, hungry").
207. Mummy no longer sends classmates' messages (family members are left out
     of the random friend chats). The character creator shows the whole
     character in 3D, turning.
208. **Online play (planned):** the game is meant to become multiplayer with
     live stats; when the single-player rules are solid, roommate NPCs will
     make way for real players.
