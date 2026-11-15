# Decisions

Where the brief was open to more than one reading, the simplest reading was
picked and written down here. Change any of these by telling Claude or by editing
the code mentioned.

## Phase 1

1. **School details are placeholders.** The brief only had the full name filled
   in. `src/content/university.ts` has placeholder names, departments, slang and
   colours, each marked `TODO`. The short name is set to "Uni" until confirmed.
2. **Allowance on day 1 comes on top of the starting money.** Broke starts with
   ₦5,000 and the day 1 allowance of ₦3,000 lands at once, so the first screen
   shows ₦8,000. Day 8 pays again at the start of the morning.
3. **Either hostel works for hostel actions.** Any building of type `hostel`
   offers Sleep, Nap, Cook noodles and Sell snacks.
4. **Bus park and gate have no actions yet.** They are always dimmed. They are
   there for vendor stalls and billboards in Phase 5.
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
