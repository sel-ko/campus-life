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
| Computer Science (4y) | study | 69% | 22% | 3.91 / 4.10 / 4.23 | 0 / 134 / 4 / 0 / 0 | 33% | 4.9 | 7.0 | 5.0 |
| Computer Science (4y) | hustle | 67% | 4% | 2.80 / 3.00 / 3.27 | 0 / 0 / 133 / 0 / 0 | 31% | 1.3 | 6.0 | 7.6 |
| Computer Science (4y) | balanced | 74% | 21% | 3.79 / 4.07 / 4.21 | 0 / 139 / 8 / 0 / 0 | 33% | 4.1 | 7.1 | 5.0 |
| Computer Science (4y) | random | 76% | 21% | 3.40 / 3.67 / 3.86 | 0 / 122 / 29 / 0 / 0 | 38% | 3.7 | 6.3 | 5.1 |
| Mechanical Engineering (5y) | study | 68% | 16% | 3.89 / 4.04 / 4.18 | 0 / 134 / 1 / 0 / 0 | 33% | 5.2 | 4.9 | 6.2 |
| Mechanical Engineering (5y) | hustle | 56% | 9% | 2.81 / 2.99 / 3.23 | 0 / 0 / 112 / 0 / 0 | 34% | 1.2 | 4.4 | 8.4 |
| Mechanical Engineering (5y) | balanced | 74% | 18% | 3.83 / 4.04 / 4.19 | 0 / 137 / 10 / 0 / 0 | 33% | 4.0 | 5.2 | 6.1 |
| Mechanical Engineering (5y) | random | 72% | 24% | 3.42 / 3.63 / 3.81 | 0 / 117 / 26 / 0 / 0 | 36% | 3.0 | 5.0 | 5.8 |
| Medicine and Surgery (6y) | study | 69% | 11% | 4.30 / 4.42 / 4.53 | 29 / 105 / 3 / 0 / 0 | 33% | 5.4 | 5.0 | 7.2 |
| Medicine and Surgery (6y) | hustle | 0% | 9% | 0.00 / 0.00 / 0.00 | 0 / 0 / 0 / 0 / 0 | 33% | 1.2 | 4.5 | 10.2 |
| Medicine and Surgery (6y) | balanced | 83% | 10% | 3.72 / 4.37 / 4.48 | 11 / 149 / 5 / 0 / 0 | 33% | 3.6 | 5.3 | 7.0 |
| Medicine and Surgery (6y) | random | 75% | 21% | 3.69 / 3.94 / 4.09 | 0 / 145 / 4 / 0 / 0 | 37% | 2.8 | 5.4 | 6.7 |

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
