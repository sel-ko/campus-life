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
| Computer Science (4y) | study | 71% | 14% | 3.86 / 4.05 / 4.18 | 0 / 135 / 6 / 0 / 0 | 33% | 4.7 | 15.9 | 5.5 |
| Computer Science (4y) | hustle | 70% | 8% | 2.93 / 3.12 / 3.35 | 0 / 1 / 139 / 0 / 0 | 34% | 1.7 | 14.4 | 7.3 |
| Computer Science (4y) | balanced | 80% | 10% | 3.65 / 4.02 / 4.22 | 0 / 149 / 10 / 0 / 0 | 32% | 4.1 | 17.3 | 5.7 |
| Computer Science (4y) | random | 77% | 14% | 3.41 / 3.72 / 3.91 | 0 / 126 / 27 / 0 / 0 | 32% | 3.4 | 17.0 | 5.6 |
| Mechanical Engineering (5y) | study | 72% | 9% | 3.87 / 4.06 / 4.20 | 0 / 134 / 10 / 0 / 0 | 33% | 4.6 | 14.6 | 6.8 |
| Mechanical Engineering (5y) | hustle | 57% | 14% | 2.96 / 3.16 / 3.36 | 0 / 1 / 114 / 0 / 0 | 32% | 1.1 | 14.3 | 8.0 |
| Mechanical Engineering (5y) | balanced | 79% | 8% | 3.50 / 4.02 / 4.18 | 0 / 143 / 15 / 0 / 0 | 33% | 3.7 | 16.2 | 6.8 |
| Mechanical Engineering (5y) | random | 75% | 14% | 3.40 / 3.69 / 3.89 | 0 / 125 / 25 / 0 / 0 | 36% | 2.9 | 16.1 | 6.8 |
| Medicine and Surgery (6y) | study | 69% | 6% | 4.27 / 4.39 / 4.54 | 22 / 113 / 2 / 0 / 0 | 33% | 4.9 | 17.1 | 7.7 |
| Medicine and Surgery (6y) | hustle | 1% | 7% | 3.42 / 3.42 / 3.42 | 0 / 0 / 1 / 0 / 0 | 31% | 1.0 | 14.3 | 10.4 |
| Medicine and Surgery (6y) | balanced | 90% | 4% | 3.70 / 4.30 / 4.45 | 9 / 165 / 5 / 0 / 0 | 31% | 2.7 | 16.9 | 7.5 |
| Medicine and Surgery (6y) | random | 78% | 10% | 3.65 / 3.95 / 4.15 | 0 / 144 / 11 / 0 / 0 | 32% | 2.2 | 16.9 | 7.8 |

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
