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
broke), sleeps at night, sees a doctor when sick and goes through clearance
office by office. Family background rotates broke / average / comfortable by
seed. Courses: Computer Science (4 years), Mechanical Engineering (5 years),
Medicine and Surgery (6 years).

"Sessions" counts sessions played, including repeated years and spill-over
years; a run stops after the programme length plus four sessions.

## Results

<!-- sim-table -->

_200 seeds per row, generated 2026-11-15._

| Course | Strategy | Graduated | Withdrawn | CGPA p10 / median / p90 | First / 2:1 / 2:2 / 3rd / Pass | Ever broke | Times broke (avg) | Clearance days (avg) | Sessions (avg) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Computer Science (4y) | study | 68% | 27% | 3.10 / 3.29 / 3.53 | 0 / 18 / 116 / 1 / 0 | 33% | 3.6 | 12.6 | 5.0 |
| Computer Science (4y) | hustle | 55% | 20% | 1.62 / 1.85 / 2.09 | 0 / 0 / 0 / 107 / 2 | 33% | 1.9 | 12.2 | 6.8 |
| Computer Science (4y) | balanced | 79% | 19% | 2.70 / 3.30 / 3.55 | 0 / 23 / 125 / 9 / 0 | 31% | 2.9 | 12.3 | 5.3 |
| Computer Science (4y) | random | 79% | 19% | 2.48 / 2.92 / 3.24 | 0 / 1 / 144 / 10 / 2 | 33% | 3.0 | 12.0 | 5.3 |
| Mechanical Engineering (5y) | study | 68% | 27% | 2.95 / 3.17 / 3.39 | 0 / 4 / 130 / 2 / 0 | 33% | 2.6 | 12.4 | 5.7 |
| Mechanical Engineering (5y) | hustle | 37% | 28% | 1.58 / 1.74 / 2.00 | 0 / 0 / 0 / 72 / 2 | 33% | 1.1 | 13.3 | 7.4 |
| Mechanical Engineering (5y) | balanced | 78% | 14% | 2.38 / 3.17 / 3.41 | 0 / 7 / 132 / 16 / 0 | 33% | 2.8 | 11.4 | 6.5 |
| Mechanical Engineering (5y) | random | 75% | 21% | 2.56 / 2.87 / 3.13 | 0 / 0 / 141 / 9 / 0 | 32% | 1.7 | 11.3 | 6.1 |
| Medicine and Surgery (6y) | study | 67% | 21% | 3.62 / 3.88 / 4.11 | 0 / 128 / 6 / 0 / 0 | 33% | 3.5 | 11.9 | 6.7 |
| Medicine and Surgery (6y) | hustle | 1% | 18% | 2.03 / 2.42 / 2.42 | 0 / 0 / 1 / 1 / 0 | 29% | 0.9 | 12.8 | 9.5 |
| Medicine and Surgery (6y) | balanced | 86% | 9% | 2.68 / 3.77 / 4.04 | 0 / 132 / 33 / 6 / 0 | 32% | 2.0 | 10.8 | 7.2 |
| Medicine and Surgery (6y) | random | 78% | 17% | 2.83 / 3.23 / 3.54 | 0 / 20 / 133 / 3 / 0 | 28% | 1.3 | 11.2 | 7.1 |

<!-- sim-table -->

## Reading the table

- **No strategy always wins.** Study gives the best grades but graduates no
  more often than balanced or random play; balanced graduates most; always
  hustling gives the most money but Third Class at best, and almost never
  survives Medicine.
- **None is impossible.** Every strategy graduates on the 4-year and 5-year
  courses; hustling through Medicine is the one near-impossible case (1%).
- **Withdrawals (10% to 28%) are mostly broke-family runs:** the fee
  shortfall plus food leaves them hungry and ill in exam weeks. A careful
  human who hustles early does better than the bots.
- **First Class never happened in 2,400 runs.** The bots are not clever
  readers and every failed attempt stays in the CGPA. It is reachable in
  principle (study bots reach 4.11 at the 90th percentile in Medicine), but
  it is rarer than it should be. See the weak spots in the final report.
- **Clearance takes 11 to 13 days on average** for the bots (they also
  attend lectures and tests in week two); a focused player can do it in
  about a week.
- This table was produced just before one last rule fix ("a session with
  nothing registered means repeating the year"), which bots never trigger
  because they always register.

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
