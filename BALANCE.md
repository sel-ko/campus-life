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

_200 seeds per row, generated 2026-11-16._

| Course | Strategy | Graduated | Withdrawn | CGPA p10 / median / p90 | First / 2:1 / 2:2 / 3rd / Pass | Ever broke | Times broke (avg) | Clearance days (avg) | Sessions (avg) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Computer Science (4y) | study | 71% | 14% | 3.78 / 3.99 / 4.13 | 0 / 134 / 8 / 0 / 0 | 33% | 4.8 | 15.5 | 5.6 |
| Computer Science (4y) | hustle | 66% | 12% | 2.79 / 3.01 / 3.22 | 0 / 1 / 131 / 0 / 0 | 33% | 1.9 | 14.3 | 7.1 |
| Computer Science (4y) | balanced | 82% | 13% | 3.55 / 4.01 / 4.17 | 0 / 149 / 14 / 0 / 0 | 32% | 3.1 | 17.1 | 5.4 |
| Computer Science (4y) | random | 83% | 12% | 3.47 / 3.74 / 3.92 | 0 / 144 / 21 / 0 / 0 | 32% | 3.1 | 17.7 | 5.5 |
| Mechanical Engineering (5y) | study | 69% | 12% | 3.79 / 3.97 / 4.12 | 0 / 134 / 4 / 0 / 0 | 33% | 4.6 | 14.8 | 6.6 |
| Mechanical Engineering (5y) | hustle | 51% | 13% | 2.80 / 2.99 / 3.25 | 0 / 1 / 100 / 0 / 0 | 33% | 1.3 | 14.7 | 8.3 |
| Mechanical Engineering (5y) | balanced | 88% | 7% | 3.49 / 3.98 / 4.15 | 0 / 158 / 18 / 0 / 0 | 33% | 2.2 | 16.1 | 6.6 |
| Mechanical Engineering (5y) | random | 83% | 13% | 3.40 / 3.72 / 3.92 | 0 / 142 / 24 / 0 / 0 | 34% | 2.0 | 15.8 | 6.5 |
| Medicine and Surgery (6y) | study | 68% | 6% | 4.23 / 4.37 / 4.48 | 11 / 124 / 1 / 0 / 0 | 33% | 5.0 | 16.5 | 7.7 |
| Medicine and Surgery (6y) | hustle | 1% | 6% | 3.30 / 3.61 / 3.61 | 0 / 1 / 1 / 0 / 0 | 28% | 0.8 | 14.6 | 10.5 |
| Medicine and Surgery (6y) | balanced | 93% | 4% | 3.69 / 4.32 / 4.46 | 12 / 165 / 8 / 0 / 0 | 32% | 2.2 | 17.2 | 7.3 |
| Medicine and Surgery (6y) | random | 90% | 7% | 3.62 / 3.96 / 4.15 | 0 / 172 / 7 / 0 / 0 | 27% | 1.5 | 16.5 | 7.7 |

<!-- sim-table -->

## Reading the table

- **No strategy always wins.** Study gives the best grades, balanced
  graduates most often, random play still earns 2:1s, and always hustling
  earns 2:2s and the most money but rarely survives Medicine.
- **First Class is reachable but rare** for the bots, and only for study or
  balanced play: about 6% of Medicine runs; on the 4- and 5-year courses the
  bots peak around 4.15 (90th percentile), just short. The bots are not clever readers (they skip assignments when
  lectures fill the day and cannot plan around packed GST halls), so a
  focused human player does better.
- **Withdrawals** are mostly broke-family runs that fall behind on food and
  fees in exam weeks.
- **Clearance** takes the bots 12 to 20 days on average because they also
  attend lectures and tests from week two; a focused player can finish in
  about a week.
- **Hustling through Medicine** almost never graduates: the course is long,
  the postings demand attendance, and the hustle bot attends half its
  classes.

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
