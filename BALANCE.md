# Balance

The numbers in `src/game/config.ts` (and the hustle, fee and food content)
were tuned with a headless simulator that plays whole degrees through the same
interaction API as the screens. Run it yourself with:

```
npm run sim          # 200 seeds per row (about 10 minutes)
npm run sim -- 50    # quicker
```

## The four strategies

- **study:** attends every lecture, reads the weakest course in every free
  slot, does every assignment; hustles only when fees are due or money runs
  low.
- **hustle:** attends about half the lectures (always the tests), spends free
  slots on the best hustle it owns and sets up the next one when it can.
- **balanced:** attends everything, hangs out when stress is high, hustles
  when money is under ₦15,000, otherwise reads.
- **random:** each slot plays one of the three above at random.

Every bot pays fees as soon as it can, eats when hungry (plate washing when
broke), sleeps at night, uses the toilet and bathes, keeps its phone charged
and buys data when it runs low, sees a doctor when sick and goes through
clearance office by office (waiting for 8:00 when it is early). Family background rotates broke / average / comfortable by
seed. Courses: Computer Science (4 years), Mechanical Engineering (5 years),
Medicine and Surgery (6 years).

"Sessions" counts sessions played, including repeated years and spill-over
years; a run stops after the programme length plus four sessions.

## Results

<!-- sim-table -->

_60 seeds per row, generated 2026-11-17._

| Course | Strategy | Graduated | Withdrawn | CGPA p10 / median / p90 | First / 2:1 / 2:2 / 3rd / Pass | Ever broke | Times broke (avg) | Clearance days (avg) | Sessions (avg) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Computer Science (4y) | study | 100% | 0% | 3.59 / 3.97 / 4.13 | 0 / 58 / 2 / 0 / 0 | 10% | 0.1 | 3.2 | 4.4 |
| Computer Science (4y) | hustle | 95% | 0% | 2.75 / 2.89 / 3.05 | 0 / 0 / 57 / 0 / 0 | 0% | 0.0 | 3.0 | 6.1 |
| Computer Science (4y) | balanced | 100% | 0% | 3.67 / 3.82 / 4.00 | 0 / 59 / 1 / 0 / 0 | 0% | 0.0 | 3.1 | 4.6 |
| Computer Science (4y) | random | 100% | 0% | 3.25 / 3.46 / 3.62 | 0 / 21 / 39 / 0 / 0 | 2% | 0.0 | 3.2 | 4.7 |
| Mechanical Engineering (5y) | study | 100% | 0% | 3.48 / 3.99 / 4.18 | 0 / 53 / 7 / 0 / 0 | 22% | 0.4 | 3.1 | 5.3 |
| Mechanical Engineering (5y) | hustle | 95% | 0% | 2.82 / 2.95 / 3.09 | 0 / 0 / 57 / 0 / 0 | 0% | 0.0 | 3.0 | 7.3 |
| Mechanical Engineering (5y) | balanced | 100% | 0% | 3.66 / 3.88 / 4.02 | 0 / 60 / 0 / 0 / 0 | 2% | 0.0 | 3.2 | 5.4 |
| Mechanical Engineering (5y) | random | 100% | 0% | 3.27 / 3.40 / 3.57 | 0 / 17 / 43 / 0 / 0 | 5% | 0.1 | 3.3 | 5.7 |
| Medicine and Surgery (6y) | study | 100% | 0% | 4.13 / 4.36 / 4.46 | 2 / 58 / 0 / 0 / 0 | 13% | 0.2 | 3.0 | 6.2 |
| Medicine and Surgery (6y) | hustle | 95% | 0% | 3.15 / 3.29 / 3.46 | 0 / 3 / 54 / 0 / 0 | 0% | 0.0 | 2.8 | 8.5 |
| Medicine and Surgery (6y) | balanced | 100% | 0% | 4.15 / 4.29 / 4.40 | 0 / 60 / 0 / 0 / 0 | 0% | 0.0 | 3.0 | 6.3 |
| Medicine and Surgery (6y) | random | 100% | 0% | 3.77 / 3.92 / 4.02 | 0 / 60 / 0 / 0 / 0 | 8% | 0.1 | 3.3 | 6.5 |

<!-- sim-table -->

## Reading the table

- **Semesters are a month now** and home pays every fee, so almost every
  bot graduates (93 to 100%) and nobody withdraws. The game is about the
  class of degree, money for food and fun, and time.
- **Study and balanced play earn a 2:1** (medians 3.75 to 4.3). First Class
  is very rare for the bots (2 of 200 studious Medicine runs): a focused
  human who reads every course, does every assignment and signs every form
  on time does better.
- **Random play** earns a 2:2 on the shorter courses and a 2:1 in Medicine.
- **Hustling earns a 2:2** and takes longer (6 to 9 sessions), because the
  hustle bot misses one class in four and reads little.
- **Money:** 1 to 21% of runs go broke at some point (more for studious
  bots, which hustle least).
- **Clearance** takes the bots about 3 days (they do one office per part of
  the day); a player who starts at 8:00 with the right papers can finish in
  one.

## What the tuning changed

- Freshers' lectures start in week two (week one is orientation), and their
  attendance only counts from the day the clearance form is complete:
  otherwise clearance made most freshers fail the whole first year.
- A fresher's first semester does not count towards probation.
- An unregistered semester no longer counts as all Fs: its courses move to
  next year.
- One absence per course never bars you (courses meet only 2 to 4 times).
- Every class of a course together teaches the same amount however often it
  meets; papers reward knowledge a little more (performance 0.25 + 0.8 ×
  knowledge).
- Office visits sign 70% of the time (before mornings, queues and
  relationships), evenings are closed half the time, and "get X's signature
  first" only names an office that could sign.
- The acceptance fee is due on day 5 (not day 2), so day-one payments are not
  all "near the deadline".
- No oversleeping on an exam or test morning; 8% otherwise.
- At most 26 units a semester including carryovers; exam timetable has room
  for up to 14 papers; a failed final-year project can be redone.
- Broke families send 85% of fees and ₦7,000 allowance.
- First Class tuning: a passed carryover replaces its F in the CGPA (as a C
  at most), GST seats 75% and standing outside teaches 60%, paper
  performance 0.27 + 0.8 × knowledge. Also fixed a dead end where clearance
  running into year two could never finish.
- Office visits take minutes, not a whole part of the day; queues follow the
  clock (short at 8:00, longest mid-morning) and offices keep 8:00 to 4:00.
  "Not on seat" fell to 7% and "come back tomorrow" to 5%, so clearance can
  be finished in a day.
- The phone drains 6% a part of the day and uses data; sleeping in a lit room
  charges it, and the weekly allowance renews 1.5 GB.
- Exam forms are signed at the College Office on days 8 to 11; missing it
  costs ₦2,000 at the first exam.
- Every course loses 0.25 knowledge a day if not revised (first tried at 0.5,
  which pushed withdrawals up to about 26%).
- The semester became a month: lectures teach 10 knowledge (was 14), reading
  3.5 / 2.5 (was 11 / 8), every course forgets 0.6 a day unrevised, weekly
  upkeep ₦5,500 / ₦8,500 (broke / average), and the hustle bot attends three
  classes in four.
