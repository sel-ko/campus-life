# Campus Life online: a design plan

Status: **plan only, nothing built.** Written 17 Nov 2026 against the code at
commit `ce2c031`. It describes how to turn Campus Life into an online game
with live stats and real roommates (in the spirit of lagoslife.app /
vatarverse, with none of their names, art or text), on free tiers only.

The rules stay as they are: free, no new dependencies, only public Supabase
and PostHog keys in the client, no real university names or logos, and **the
game stays fully playable offline** (README, "Set up the online features").

## 0. The short version

1. **Every player keeps their own `GameState` and their own clock.** Nothing
   about money, needs, grades or time is synced. Online adds a thin *social
   layer* around the single-player game: who else is here, chat, roommates,
   and live numbers.
2. **The social layer is optional and degrades step by step.** No keys, no
   network, a full server, or a feature switched off: the game quietly runs as
   it does today. This is the same promise `src/online/supabase.ts` already
   makes ("every function returns null when Supabase is not set up").
3. **Free-tier reality decides the design.** Supabase Realtime on the free
   plan allows **200 concurrent connections, 100 messages a second and 20
   presence messages a second** ([limits](https://supabase.com/docs/guides/realtime/limits)),
   and Auth allows 50,000 monthly active users. So "142k active today" can be
   a *database* number but never a *live connection* number. The plan therefore:
   - counts people with cheap heartbeats into Postgres, not with open sockets;
   - opens a socket only while the game is visible, and only to the one or two
     channels that matter right now;
   - sends **intent, not frames** (a walk is one message, not sixty);
   - has tiers, so when the campus is "full" the extras still get stats and
     chat but not avatars.
4. **Other players can only reach you through the server.** The client rules
   engine is not trusted by other players, so the only things one player can
   do to another are server-mediated and bounded: a chat message, a room seat,
   a contact request. No player-to-player money or item transfer until there
   is a server-side ledger (stage 7).
5. **Build order:** foundation and live stats first (no sockets at all), then
   people in rooms, then people on the map, then chat, then real roommates,
   then phasing NPCs out. Each step ships on its own and can be switched off
   from the Supabase dashboard.

## 1. Shared versus per player

### 1.1 Stays per player (unchanged, local, in `campus-life-save`)

Everything in `GameState` (`src/game/types.ts`) except what is listed in 1.2:
`clock` (game time moves only when *you* act: `advance()`, `addMinutes()` in
`src/game/engine.ts`), `needs`, `money`, `academics`, `finance`, `clearance`,
`inventory`, `phone`, `goals`, `stats`, `rng`, and the scripted chat threads.
The rules (`performMut`, `passSlot`, `beginDay`...) keep running locally,
seeded by `GameState.rng`, so the simulator (`npm run sim`) and the tests
(`src/game/*.test.ts`) keep working with no server.

**Consequence to accept: players are at different game times.** One person is
in "Mon 5 Oct, morning" while another is in "day 19, night". The online layer
is therefore *place-based, not time-based*: you see whoever is physically in
the same building or section **right now (real time)**, whatever their game
clock says. The cosmetic mismatch (someone asleep at the library at noon for
you) is fine; rooms already draw people by pose, and a building that is
closed *for you* simply cannot be entered, so nobody is "inside" a place you
cannot be. We do **not** try to sync clocks. Matching people by progress
happens elsewhere: roommates and class groups are matched by gender and level
(sections 3 and 5), which is close enough.

### 1.2 Shared (server, or live between players)

| Shared thing | Source of truth | How it travels | Cost |
| --- | --- | --- | --- |
| "Online now", "active today", per-college counts | `world_stats` row, refreshed by `pg_cron` from `players.last_seen` | one small `select` every 60 s while the game is open | no socket |
| Public player card (name, look, programme, level, gender) | `players` table | `sync_profile` RPC, read by others on demand | no socket |
| Who is in this building (and what they are doing) | live, not stored | Realtime presence + broadcast on `place:{placeId}:{shard}` | 1 channel while inside |
| Who is on the map near me | live, not stored | Realtime broadcast on `zone:{sectionId}:{shard}` | 1 channel on the map |
| Room membership (four corners, single sex) | `rooms`, `room_members` | `claim_room` RPC | no socket |
| Room chat, direct chat | `messages` table | `send_message` RPC, delivered by private broadcast `user:{uid}` | 1 channel while the phone is open |
| Freshers and class groups | `messages` table | same RPC, private broadcast `group:{id}` only while that thread is open | 1 channel while open |
| Queue at an office | **derived locally**, nudged by live headcount (1.3) | headcount from the place channel | none extra |
| Campus-wide weekly event | already shared: `campusWeekFor(ms)` in `src/game/campus.ts` is a seeded pick by ISO week, so everyone sees the same one | no network | none |
| Leaderboard, vendors | existing `results`, `vendors` | existing `fetchLeaderboard`, `fetchVendors` | none |

Never shared: your money, grades, needs, inventory, fees, phone battery, or
anything in `GameState.finance`. A public card shows only what you chose to
show (name, look, programme, level; CGPA only through a submitted result).

### 1.3 Queues stay deterministic, with a bounded live nudge

`officeQueue()` in `src/game/clearance.ts` is a pure function of the clock
(`hashUnit(dayCount:hour:id)`, rush, time of day, officer relationship). The
simulator and balance numbers (`BALANCE.md`) depend on that, and
`visitOfficeMut` turns the queue into minutes (`officeMinutes`). Keep it. Add
real people on top, capped:

```ts
// src/game/world.ts (new): a read-only snapshot the online layer fills in.
export interface WorldView {
  /** placeId -> number of real players there now (excluding you). */
  here: Record<string, number>;
  /** the people actually visible in the room you are in. */
  present: PublicCard[];
}
// officeQueue(d, id) adds Math.min(3, d.world?.here[placeId] ?? 0).
```

`GameState.world?: WorldView` is **transient**: `update()` in
`src/store/gameStore.ts` copies the latest snapshot in before calling a rule,
and `partialize` (the `persist` option at the bottom of that file) leaves it
out of the save. With no online layer it is `undefined` and every function
behaves exactly as today. Rules stay pure, tests can pass a hand-made
`world`, and a cheater who fakes headcount gains at most 3 people of queue.

## 2. Transport on free tiers

### 2.1 What we use, and what we do not

Only what is already installed: `@supabase/supabase-js` (it bundles Realtime,
Auth and PostgREST). **No new package.** No server of our own: Supabase
Realtime (broadcast and presence), Postgres (tables, RLS, `security definer`
functions, `pg_cron`), and Auth (anonymous sign-in, already used by
`ensureSignedIn()`). The client carries only `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY`; there is no `service_role` key anywhere, and the
GitHub workflow keeps passing only repository *variables*.

Rejected: a game server (Cloudflare Durable Objects, PartyKit, Node on a
free host). They break "no server of our own" and add a dependency or an
account to look after. Revisit only if the free Realtime ceiling is hit and
the owner decides to pay.

### 2.2 Free-tier ceilings (and what the game does at each)

| Limit (free plan) | Value | What we do |
| --- | --- | --- |
| Concurrent Realtime connections | 200 | One socket per open game, only while the tab is visible (`usePageVisible()` in `src/ui/usePageVisible.ts`); disconnect after 60 s hidden. When the join fails, fall back one tier (2.5). |
| Realtime messages a second | 100 | Intent messages and adaptive send rates (4.2). Budget in 4.5. |
| Presence messages a second | 20 | Presence is **membership only** (join/leave), never positions. |
| Channels per connection | 100 | We hold at most 3 at once. |
| Auth monthly active users | 50,000 (anonymous users count) | The owner's decision point; the game keeps working offline past it. |
| Database | 500 MB | Messages older than 14 days are deleted nightly by `pg_cron`; no per-frame data is ever stored. |
| Idle projects pause after about a week | yes | A free GitHub Actions cron calls `rpc/ping` daily with the public anon key (already a repo variable). |

Check the official limits page when building (they are configurable and may
change); the numbers above are from it today.

### 2.3 Code layout

```
src/online/
  client.ts        NEW  getClient(), withTimeout(), ensureSignedIn() moved out of supabase.ts
  supabase.ts      leaderboard + vendors, now importing from client.ts (no behaviour change)
  features.ts      NEW  reads the `config` row once: which features are on, max tier
  stats.ts         NEW  heartbeat + world_stats polling
  realtime.ts      NEW  the only file that touches channels (join, leave, send, onMessage)
  presence.ts      NEW  my keyframes out, other people's keyframes in (-> world/others.ts)
  chat.ts          NEW  send / receive / moderation errors
  rooms.ts         NEW  claim_room, sync_room
  worldStore.ts    NEW  Zustand store: tier, counts, visible people (UI reads this)
src/game/
  world.ts         NEW  WorldView type and tiny pure helpers (no I/O)
  roomAssign.ts    NEW  turns a server RoomAssignment into RoomState + people (pure, tested)
src/world/
  others.ts        NEW  mutable map of remote players (like shared.ts's playerWorld)
  OtherPlayers.tsx NEW  draws them on the map (like Npcs.tsx)
supabase/
  schema.sql       unchanged (results, vendors)
  multiplayer.sql  NEW  players, rooms, messages, stats, RPCs, RLS, cron (idempotent)
  banned_terms.sql NEW  draft word list for the owner to fill in
```

`realtime.ts` is a narrow interface (`join(topic)`, `broadcast(event, payload)`,
`track(meta)`, `leave()`). If the free Realtime ceiling ever forces a change
of provider, that file and `client.ts` are all that move.

`src/online/tracking.ts` already subscribes to the store and calls
`ensureSignedIn()` on `game_started`. Reuse that hook to call
`sync_profile` and start the heartbeat. Keep PostHog events free of
nicknames (it already is).

### 2.4 Channels, security and "private by default"

- Turn **off** "Allow public access" for Realtime in the dashboard, and use
  **private channels** (`config: { private: true }`). Who may join which topic
  is then decided by RLS policies on `realtime.messages`, using the topic name:
  - `dorm:{roomId}` and `user:{uid}`: members only;
  - `group:{threadId}`: members of that thread only;
  - `place:*` and `zone:*`: any signed-in player (they are public places).
- Messages that must be stored (chat) go **through an RPC**, and a trigger
  inside the database relays them with `realtime.send(...)` to the right
  private topic (Supabase's "broadcast from the database" pattern). The sender
  can never publish chat directly, so rate limits and word filters cannot be
  bypassed. Live-only things (positions, activities) are client-to-client
  broadcast; the server cannot see or validate them (section 6).
- All writes go through `security definer` functions with
  `set search_path = ''`, and `revoke all on ... from anon, authenticated` on
  the tables. The existing `results` insert policy stays until `submit_result`
  replaces it (6.2).
- Add the new schema as a **separate file** so existing installs are not
  disturbed; README gets one new step ("run `supabase/multiplayer.sql`").

### 2.5 Tiers: how the game degrades

`worldStore.tier` is computed from the `config` row (owner kill switches) and
`world_stats.online_now`:

| Tier | You get | When |
| --- | --- | --- |
| 0 Offline | today's game, nothing online | no keys, no network, or `features.online = false` |
| 1 Stats | live counters, leaderboard, vendors | default floor |
| 2 Social | + people in rooms, chat, real roommates | `online_now < 160` and `features.social` |
| 3 Map | + people on the campus map | `online_now < 120` and `features.map` |

Thresholds leave headroom under the 200-connection cap. Tiers only ever turn
*off* the expensive things, and the player sees a small chip ("Campus is busy:
showing numbers only"). A failed `subscribe()` (`CHANNEL_ERROR`, `TIMED_OUT`)
drops one tier for ten minutes. **A kill switch exists for every feature**:
`config.features` is a JSON row the owner edits in the Table Editor, read by
`features.ts` at start and every 5 minutes. If something goes wrong, nobody
needs to redeploy.

## 3. Real roommates

### 3.1 What exists

- `RoomState` (`src/game/types.ts`): `placeId` (the hall), `roomNo`,
  `roommates: string[]` (person ids from `ROOMMATE_POOL`), `temporary`,
  `suspect`.
- `allocateRoomMut(d, r, temporary)` in `src/game/hostel.ts` picks a hall
  (`hostels()` minus the freshers' hall), a random `roomNo`, and `drawRoommates`
  (single-sex via `sameGender`, 30% chance one old roommate stays,
  `KEEP_ROOMMATE_CHANCE`). It then calls `setupRoomChatMut`.
- `reallocateMut` runs at each new session (`beginSession` in
  `src/game/engine.ts`); `collectAllocationMut` in `src/game/clearance.ts` is
  the first-year allocation step.
- The room holds **you plus up to three**; an empty corner means nobody is
  there (DECISIONS 205). `getOccupants()` draws them by slot: asleep at night,
  reading, one cooking.
- Before allocation you sleep in the freshers' hall transit bunks with nameless
  students (`crowdLevel`, `crowd` in `layouts.ts`).
- Roommate flavour (borrower stealing, noisy, night crawler, generous) is
  driven by `getPerson(id).traits` in `roommateNightMut`, `hasRoommateTrait`
  and event filters (`events.ts`).

### 3.2 Server model

```sql
players(uid pk, display_name, gender, programme_id, level, look jsonb,
        created_at, last_seen, banned_until, features jsonb)
rooms(id uuid pk, hall_place_id text, room_no text, gender text, level int,
      created_at)
room_members(room_id, uid, corner smallint check (corner between 0 and 3),
             npc_id text null,              -- a reserved NPC seat (3.5)
             joined_at, left_at,
             unique (room_id, corner), unique (uid) where left_at is null)
```

`claim_room(hall_hint text null) returns RoomAssignment`, a `security definer`
function:

1. Look up the caller's `players` row (gender and level from `sync_profile`).
2. `select ... for update skip locked` a room with the **same gender and
   level**, in a valid hall, with a free corner, preferring rooms that already
   have the most real players (so rooms fill instead of spreading thin).
3. If none, create a room: pick a hall from `place_ids` (a table generated from
   `hostels()` by a small script, `scripts/make-place-seed.mjs`, so the server
   never trusts a client-supplied hall), and a `room_no` in the same format as
   today (`A1`..`D40`) that is unique within the hall.
4. Insert the member in the first free corner; return
   `{ roomId, hall, roomNo, members: [{uid, name, look, corner, npcId}] }`.
   Seats not taken by real players are filled according to `config.npc_fill`
   (3.5).

Because `unique (room_id, corner)` and `unique (uid) where left_at is null`
are enforced by Postgres, two people racing for the last corner cannot both
get it, and nobody holds two rooms.

### 3.3 Client changes

- **Pure rules, new optional input.** `allocateRoomMut(d, r, temporary,
  assignment?: RoomAssignment)`: when `assignment` is given (from
  `src/game/roomAssign.ts`), use its hall and room number and put real players
  in `d.room.roommates` as ids `p:<uid8>`; otherwise run the old random path
  unchanged. The simulator and offline play never pass one.
- **Where the network call happens.** The rules never do I/O. The allocation
  step in `src/game/interactions.ts` (the `allocation` interaction, and the
  `reallocateMut` path at session start) stays synchronous and offline-first:
  it allocates immediately with NPCs. `src/online/rooms.ts` then calls
  `claim_room` in the background and, if it succeeds, calls a new
  `interactions.ts` function `applyRoomAssignment(state, assignment)` that
  swaps the seats and posts a log line ("Ngozi moved in"). The player never
  waits on the network; if `claim_room` fails, they simply keep NPC roommates.
- **Giving real players a `PersonDef`.** 39 call sites use
  `getPerson(id)` (in `chat.ts`, `hostel.ts`, `interactions.ts`, `people.ts`,
  `status.ts`, `journal.ts`, `engine.ts`, `academics.ts` and five UI files).
  Rather than change them all, extend `getPerson` in `src/content/people.ts`
  to also consult a small registry that `roomAssign.ts` fills from the cards
  stored in `RoomState.mates` (new optional field, so the save survives a
  reload offline). A real player's `PersonDef` has `role: 'roommate'`,
  `look` from their card, and **empty `traits`**.
- **Save compatibility.** Do **not** bump `SAVE_VERSION` (`src/game/config.ts`):
  `isCurrentSave` in `src/game/save.ts` throws away any other version.
  Add only optional fields (`RoomState.mates?`, `ChatMessage.sid?`,
  `ChatThread.remote?`, `PlayerProfile.onlineId?`) and fill defaults in
  `loadSave` the way it already does for hygiene and `phone`.

### 3.4 Behaviour of real roommates

- **Same gender, same level**, four seats, one hall. Seat order in the DB
  (`corner`) is only for uniqueness: every viewer places *themself* at their
  own bed (as `layouts.ts` already does with `spawn`) and the others at
  `bed-2..4`, `desk-2..4`, as `getOccupants` does today.
- **Present or "ghost".** If the roommate is online and in the dorm channel,
  show their live activity (4.4). If they are offline, show them by the **NPC
  routine** in `getOccupants` (asleep at night, at their desk in the morning)
  with a "last seen 2 h ago" label, or absent when that routine says so. The
  room never looks dead because a flatmate closed the tab.
- **No player-driven theft or pranks.** `roommateNightMut` only looks at
  `traits`, and a real player has none, so no event ever blames a real person
  for taking your garri. Room flavour comes from the NPCs still in the room
  (3.5) and from anonymous room events ("Room levy", light and water). Bounded
  social effects between real roommates (a "share food" tap that gives a
  roommate +1 to +3 relationship, once a day) go through a server table, not
  through client-crafted `Effects` (6.4).
- **Keeping a roommate across sessions** (`KEEP_ROOMMATE_CHANCE`) becomes a
  mutual request: at `reallocateMut`, a "Stay together?" prompt, honoured by
  `claim_room` when both have asked for each other.
- **Real roommate moves on.** Players progress at different speeds. When a
  member starts their next session they take a new seat; the old one gets
  `left_at` set and the corner is empty again. Others see "Ngozi moved out" in
  the room chat and the corner is free for the next person with the same
  gender and level.

### 3.5 Phasing NPC roommates out

NPCs never disappear from the **offline** game: `ROOMMATE_POOL` is what solo
players get, and tests and the simulator need it. "Phasing out" means
online players see fewer of them, controlled by one number the owner can change
without a deploy: `config.npc_fill`.

| Stage | `npc_fill` | Effect |
| --- | --- | --- |
| A (launch of real roommates) | `all` | A new room is filled with NPCs, stored per seat in `room_members.npc_id` so every member of the room sees the **same** NPC. When a real player claims a seat, that NPC "moves out" (a log line and a room-chat line) and the player moves in. |
| B | `min2` | At least two seats stay NPC-filled only until a real player arrives; rooms with enough real players have no NPCs. |
| C | `none` | Online rooms contain only real players; unfilled corners stay empty ("an empty corner means nobody is there", DECISIONS 205). Offline play keeps NPCs. |

Move from A to B when most new rooms already have two or more real players
within a day of being created; from B to C when the weekly active count makes
empty corners rare (suggestion: fewer than one in five rooms below three real
players). Both thresholds come from `world_stats`, so the decision is data,
not a guess.

Also replaced along the way:

- the freshers' hall's nameless transit crowd (`crowd` in `layouts.ts`, level
  from `crowdLevel` in `src/game/status.ts`) takes real people in that place
  first and fills the rest of the level with the nameless ones, so a quiet
  server still looks busy;
- the `'freshers'` and `'class'` group chats gain real members (section 5).

## 4. Seeing other players: the map and rooms

### 4.1 Data model on the client

Follow the pattern the world code already uses: **mutable objects outside
React**, read in `useFrame`, never React state (`src/world/shared.ts`:
`playerWorld`, `cameraState`).

```ts
// src/world/others.ts
export interface Remote {
  uid: string; card: PublicCard;       // name, look, gender
  /** Last two snapshots + a route, for interpolation. */
  a: Snap; b: Snap; route?: RouteMsg;
  place: string | null;                // building, or null on the map
}
export const others = new Map<string, Remote>();
```

`src/online/presence.ts` writes into `others`; `OtherPlayers.tsx` (a sibling
of `Npcs.tsx`) and `InteriorScene.tsx` read from it. The React tree only hears
about *who* is visible (join/leave) through `worldStore`, so a position update
never re-renders anything.

### 4.2 What is sent: intent, not frames

`Player.tsx` already knows what the player is doing: a tapped route
(`route.current = { target, points, speed }` along `findPath`), a keke ride
(`ride.current`), or free joystick walking. Send the *intent*:

| Message | When | Payload (about 40 bytes) |
| --- | --- | --- |
| `walk` | a tap starts a route or ride | `{ to: placeId, mode: 'walk'\|'keke'\|'cab', speed, t0 }` |
| `key` | joystick walking, at most every 1 s, only if moved more than 1.5 m | `{ x, z, h, v, t }` |
| `stop` | arrived or stopped | `{ x, z, h, t }` |
| `act` | in a room: an action starts or ends | `{ pose, target, stage }` (the `Activity` shape in `InteriorScene.tsx`) |

A receiver turns `walk` into motion by calling the **same** `findPath()` from
`src/world/campus/navigation.ts` on its own copy of the road graph and walking
the points at the stated speed. A 20-second walk across campus is one message.
Cabs and kekes are played the same way (cab: teleport-glide to the door;
keke: board, drive to the stop, alight, as `Player.tsx` does).

Sending is **adaptive**: 1 s between `key` messages when there are up to 20
peers in the zone, 2 s above that, nothing at all when alone (the join
callback tells us the peer count). When the Canvas is paused
(`frameloop: 'never'` in `CampusScene.tsx`) or the tab is hidden, stop
sending and leave the channel.

### 4.3 Receiving: interpolation and dead reckoning

- Keep the last two `key` snapshots per remote and render **250 ms in the
  past**, linearly interpolating position and angle; if the newest snapshot is
  older than that, continue along the last velocity `v` for up to 1.5 s, then
  stand still. (Walking speed is slow, 6 to 8 m/s at most; this looks smooth
  at 1 message a second.)
- **Validate on receipt** (cheap, and the only enforcement for broadcasts):
  clamp to `campusBounds()` and push out of walls with `isBlocked()` from
  `navigation.ts`; ignore a `key` that implies more than about 3 times
  `WALK_SPEED` since the last one (`Player.tsx` constants); ignore unknown
  places. A cheater can only fool the renderer on their own screen.
- Remote characters use the existing `Character` and `Blob` components. Cache
  the built geometry by look so ten people with the same preset share it
  (`buildCharacter.ts` builds merged meshes).

### 4.4 Rooms

- Entering a place (`insidePlaceId` set in the store) joins
  `place:{placeId}:{shard}` (cap 8 per shard, overflow goes to `#2`: another
  copy of the building, like any lobby). Your own dorm joins `dorm:{roomId}`
  instead, so only your roommates are ever there.
- Presence carries the card (name, look id, gender), nothing else. Movement
  inside a room is `act` messages (a start and an end per action, because the
  3D room already walks you to the fixture and does the animation locally) and
  occasional `key` messages for free walking, capped at 2 s.
- `getOccupants(d, placeId)` in `src/game/interactions.ts` gets the live
  people appended (`personId: 'p:…'`, `spot` from their `act` or the nearest
  free fixture via `placePeople()` in `layouts.ts`). `crowdSpots()` then fills
  the *remaining* crowd level with nameless students, so a real person
  replaces a nameless one rather than adding to the count.
  `InsideScreen.tsx` already lists occupants and offers "talk" for them; for a
  real player the target opens a profile card with **Say hi**, **Add contact**
  and **Report** instead of NPC dialogue.

### 4.5 Message budget (free tier)

The 100 messages a second ceiling is for the whole project. Assume the worst
useful case: 120 people online, 60 of them walking by joystick at once:
60 players × 1 `key` a second = **60 messages a second** at the ceiling's edge,
which is why tier 3 switches off at `online_now >= 120`. Typical load is far
lower: most people are inside rooms or tapping routes (one `walk` message per
trip, not per second), and idle players send nothing. Before shipping stage 3,
run a **load script** (`scripts/loadtest.mjs`, using the already-installed
`@supabase/supabase-js`) that opens N anonymous clients and walks them
randomly, and write the measured safe numbers back into this file. Do not
trust the table above until that run is done. Fan-out (each message delivered
to every subscriber) also counts toward the monthly Realtime quota, so zone
shards are capped at 25 people and the map only subscribes to *your own
section* (the sections come from `SECTION_NAMES` in
`src/content/campus-overrides.ts`, plus town).

### 4.6 Mobile performance limits

The game targets phones, and `CampusScene.tsx` already has a `quality`
setting (`high` draws 6 NPCs and 18 cars; the saver draws 3 and 8).

- **Cap what is drawn:** `MAX_OTHERS = high ? 12 : 5` on the map, nearest
  first, and the rest become small coloured dots on the section map, not
  characters. In rooms: up to 6 real plus the crowd.
- **Trade NPCs for people:** `<Npcs count>` becomes `max(0, base - realNearby)`.
  An empty server looks as lively as today; a busy one does not cost more.
- **Overview mode draws no individuals.** When `cameraMode === 'overview'`
  (zoomed out), show per-section counts from `world_stats` and a few dots.
- **Name labels** (`Label.tsx`) only within about 25 m and only when
  `cameraState.dist` is small.
- **Measure, then fix numbers:** the dev hook in `CampusScene.tsx`
  (`__gl.info.render`) gives draw calls. Acceptance test for stage 3: with 12
  remote characters, the added draw calls and frame time on a mid-range Android
  phone in battery saver mode stay inside a budget we set after measuring the
  baseline, and the saver tier never exceeds 5 remotes.
- No audio, no per-frame React state, no network on the render thread beyond
  `postMessage`-sized JSON.

## 5. Chat, groups and moderation

### 5.1 How today's chat maps to real transport

`ChatThread { id, title, kind: 'group' | 'direct', members, messages, unread }`
and `ChatMessage { id, from, text, at, replies?, answered?, draft? }` in
`src/game/types.ts`; `ensureThread`, `postMut`, `markReadMut`, `answerMut` in
`src/game/chat.ts`. Threads are keyed by id with member lists, as the file
header promised.

| Thread today | Online version | Key |
| --- | --- | --- |
| `freshers` ("Freshers Group", NPC members) | real group | `freshers:{intakeMonth}:{shard}`, 150 per shard |
| `class` (`classThreadTitle`: e.g. "CSC 100L Class Group") | real group | `class:{programmeId}:{level}:{shard}`, 60 per shard |
| `room` (`setupRoomChatMut`) | real room chat | `room:{roomId}`, the four seats |
| `dm:{personId}` (`dmThread`) | real DM, only between accepted contacts | `dm:{uidA}:{uidB}` (ids sorted) |
| `family`, `bank` | stay local, scripted | none |

**Scripted NPC posts stay local.** Announcements ("Lecture moved", "Test on
Friday", class dues) are generated by `chatDayMut` from *your* timetable and
state, so they must not be shared (another player's day 12 is not yours). They
keep going into the same thread with `draft: true`, mixed with real messages by
arrival order. NPC members remain in `members` for display only.

### 5.2 Changes to the chat types (all optional, no save bump)

```ts
interface ChatMessage { /* existing */ sid?: string; ts?: number; }  // server id, server epoch ms
interface ChatThread  { /* existing */ remote?: { kind: 'freshers'|'class'|'room'|'dm'; key: string } }
```

- `at` is `stamp(d.clock)`, **game time**, and cannot order messages from
  people on different clocks. Real messages carry `ts` (server time); the UI
  shows "2 min ago" for them. Ordering is **arrival order** in
  `thread.messages`, which `CHAT_LIMIT = 60` already caps.
- `id` stays the local sequence (`d.chat.seq`); `sid` de-duplicates replays.
- Real messages have no `replies`; `answerMut` is untouched.

### 5.3 The bridge (UI to rules to network)

`src/game/interactions.ts` stays the only door:

- `sendChat(state, threadId, text)`: refuses when `phoneProblem(d)` says dead
  or no data (reusing the **existing phone rules**: chat needs data, 5 MB per
  message through `usePhoneMut`, DECISIONS 169), posts an optimistic message
  with `pending: true`, returns the new state.
- `receiveChat(state, threadId, msg)`: ingest through `postMut`, create the
  thread with `ensureThread` if it is new.
- `gameStore.ts` gets `sendChat` and `receiveChat` actions, each
  `apply(...)`. The store action for `sendChat` also calls
  `online/chat.ts → send_message`; `chat.ts` calls `receiveChat` for messages
  that arrive. No network inside `src/game/`.

A dead phone or no data also **closes the socket**: the chat app is the only
thing that subscribes to group topics, so players without data hold no chat
connection. Thematic, and it saves the 200-connection budget.

### 5.4 Delivery

- Group messages: `send_message(thread_key, body)` inserts into `messages` and
  a trigger relays to private topic `group:{threadKey}`; subscribers are only
  people with that thread open. Unread badges come from an `unread_counts()`
  RPC called when the phone opens and every few minutes, not from a live
  socket. On open, `list_messages(thread_key, after)` fetches the last page.
- Room chat and DMs: relay to `user:{uid}` of each member (at most 3), so a
  new roommate message shows a notification (the existing `Notifications.tsx`
  toast) even when no chat is open.
- Retention: 14 days, deleted by `pg_cron`; 280 characters each.

### 5.5 Moderation basics

The rule is: **a real person is in the loop for every message, and the owner
needs no admin tool beyond the Supabase Table Editor** (the same way vendors
are managed today).

Server, inside `send_message`:
1. Must be a member; account at least 10 minutes old and past the first
   in-game day (cheap friction against throw-away accounts).
2. Rate limit per player: one message a second, 20 a minute, 300 a day,
   counters on the `players` row (no table scans).
3. Strip control characters and zero-width text; **remove links, emails and
   phone numbers** from group and room messages (privacy, and spam).
4. Reject on the word list in `banned_terms` (normalised: case, spacing,
   common letter swaps). The owner fills in the list, including Pidgin and
   local slang, in `supabase/banned_terms.sql` (like the existing `draft:
   true` content convention). The sender sees a gentle "That message was not
   sent".
5. `shadow_muted` flag: a player muted by the owner (or auto-muted after 3
   distinct reports within a day) still sees their own messages; nobody else
   does.

Player tools in the UI (phone → Chat, and the profile card):
- **Report** on any real message → `report_message(sid, reason)`; three
  distinct reporters auto-hide the message and flag the sender.
- **Block**: hides a person's messages locally and blocks DMs and invites
  server-side (`blocks` table).
- **Chat settings** in the phone's Settings (next to the tour toggle): *Off /
  Friends and room only / Everyone*. Default for new players: *Friends and
  room only* until they open it. The offline NPC chat is unaffected.
- Display names: the nickname rules from `results` (1 to 20 characters) plus the
  same word filter; names that fail become "Fresher 4821".
- **No images, no file or voice sharing.** Text and emoji only.
- Privacy: a "Delete my online data" button (Settings) calling `delete_me()`,
  which removes the `players` row, memberships and messages (`on delete
  cascade` from `auth.users`). Needed for the Nigeria Data Protection Act and
  simply right. The privacy line in the README and the landing page says what
  is stored.
- Direct messages are only between **accepted contacts**: tapping a person in
  a room gives *Add contact*; the other side accepts in Phone → People.

## 6. Anti-cheat stance

### 6.1 The honest position

The whole rules engine runs in the browser and the save is plain JSON in
`localStorage` (`campus-life-save`). A determined player can set their money
and CGPA, speed up, or run a modified client. **We do not try to prevent
that**, because single-player cheating hurts no one, and a server that re-ran
every action would be a server of our own. Instead:

> **The server never trusts a number about a player's game, and a player can
> only affect another player through server-mediated, size-limited things.**

So we validate what *other people can see or be hurt by*, bound it, rate-limit
it, and accept the rest.

### 6.2 What Postgres validates (and how)

| Area | Today | Plan |
| --- | --- | --- |
| Leaderboard | `results` insert policy: ranges only (cgpa 0..5, money <= 10M). Anyone can post 5.00. | Replace the direct insert with `submit_result(nickname, department, evidence jsonb)`. `evidence` is the transcript summary (per semester: units, and points per unit). The function **recomputes CGPA** from it, rejects impossible values (units per semester, point values 0..5, semester count vs. level), requires that the player's `created_at` is at least a minimum real-time age for that many semesters (set the minimum from the simulator's fastest bot, written down in `BALANCE.md`), allows one result per semester ordinal per player, and drops `money` from ranking. Keep the 1-a-minute limit. The old insert policy is dropped once clients use the RPC. |
| Public profile | n/a | `sync_profile(...)`: enum checks for gender, programme and level; `look` must be JSON under 1 KB with hex colours and known style names; name through the word filter. |
| Rooms | n/a | `claim_room` as in 3.2: unique constraints and row locks. This is the place where races matter, so it is server-authoritative. |
| Chat | n/a | `send_message` as in 5.5. |
| Live stats | n/a | Computed by the server from `last_seen`; the client sends a heartbeat (`heartbeat()`, at most once every 5 minutes) and never a number. "Active today" counts players with a **completed profile** (they passed admission), using the Lagos date (`now() at time zone 'Africa/Lagos'`). |
| Everything else | n/a | RLS on, **no direct table writes** from `anon` or `authenticated`; all through RPCs that check `auth.uid()` is not null. |

Auth abuse: anonymous sign-in makes farming accounts easy, and anonymous users
count toward the 50k monthly active users. Mitigations, cheapest first:
account-age gates (above); Supabase's own per-IP sign-in rate limit (tune it
in Auth settings); and, **only if abuse appears**, a Cloudflare Turnstile
CAPTCHA on anonymous sign-in (free; the site key is public). Later, let players
*link* an email or Google sign-in to their anonymous account so they can
continue on another phone, and so a ban means something.

### 6.3 What we accept (and say so)

- Edited saves: free money, perfect grades, skipped time (single-player harm
  only; the leaderboard checks in 6.2 raise the cost of faking a result but do
  not stop a determined person).
- Spoofed positions and activities (clamped by receivers, 4.3; a fake position
  is only drawn on the viewer's screen).
- Inflated "active today" by account farming (bounded by the profile and
  heartbeat requirements; we treat the stat as marketing, not as a score).
- Collusion, multi-accounting, and bots that chat politely.

### 6.4 Rules for anything that crosses between players

1. **No client-supplied effects on another player.** Today `Effects`
   (`src/game/types.ts`) can change money, items, relationships. A receiving
   client must never apply an `Effects` object that came from another client.
   Anything that touches another player is a row in a server table (for
   example `roommate_nudges(from, to, kind, day)`) with a server-side cap
   (one a day per pair, value +1 to +3), which the receiver reads and applies
   with its own rules.
2. **No player-to-player money or items** (no lending, gifts or trading) until
   stage 7: that needs a Postgres ledger with idempotent transfers, daily
   limits, and a decision about what a lost transfer means for an offline
   save.
3. **Broadcast is cosmetic.** Positions, poses and "typing" are never used to
   decide anything in the rules.
4. **Everything has an owner switch:** `config.features`, `banned_until`,
   `shadow_muted`.

## 7. Staged rollout

Each stage ships alone, is behind a flag in `config.features`, and leaves the
offline game unchanged. "Done" means the listed checks pass, on a real phone
as well as a desktop browser.

### Stage 0: foundation (no visible change)

- Move `client()`, `withTimeout()`, `ensureSignedIn()` from
  `src/online/supabase.ts` into `src/online/client.ts` (no behaviour change);
  add `features.ts`.
- `supabase/multiplayer.sql` (part 1): `config`, `players`, `place_ids`,
  `sync_profile`, `heartbeat`, `ping`; RLS; no writes from clients except
  through RPCs. Add `scripts/make-place-seed.mjs`.
- `src/online/tracking.ts`: after `game_started`, call `sync_profile`; start the
  heartbeat; stop on hidden.
- Daily keep-alive cron in `.github/workflows` (calls `rpc/ping`).
- README: new setup step and a privacy note.
- **Done when:** with keys, a new game creates exactly one `players` row and
  `last_seen` moves; without keys, `npm test` and `npm run build` are
  identical to today; the offline play-through still works; `npm run sim`
  output is unchanged.

### Stage 1: live stats (the smallest useful step, no sockets)

- `world_stats` (one row: `online_now`, `active_today`, `active_7d`, per
  college counts, per place headcount placeholders), refreshed each minute by
  `pg_cron`.
- UI: a chip on the landing screen and in the phone's **Ranks** app next to
  `LeaderboardScreen` ("1,204 students today · 38 on campus now"), tolerant of
  `null` like the other online features (`fetchLeaderboard` style).
- **Done when:** two phones playing at the same time see "on campus now" go
  from 0 to 2 within two minutes and back down after closing; the chip
  disappears gracefully offline; zero Realtime connections are open (checked
  in the Supabase Realtime dashboard).

### Stage 2: people in rooms

- `realtime.ts`, `presence.ts`, `worldStore`, private-channel RLS on
  `realtime.messages`, tier logic (2.5).
- Rooms: `place:{id}:{shard}` join on entering; presence cards; `act` messages
  from the room scene; `getOccupants` appends live people; profile card with
  Say hi / Report (reports table, no chat yet).
- Queue headcount nudge (`GameState.world`, `officeQueue`), capped at +3.
- **Done when:** two devices in the same office room see each other sit and
  walk, the occupant list shows both, leaving removes them within 5 seconds,
  shard overflow creates a second instance at the 9th person, closing the tab
  frees the connection, the tier drops to 1 when the join is forced to fail,
  and a unit test covers `officeQueue` with and without `world`.

### Stage 3: people on the map

- `others.ts`, `OtherPlayers.tsx`, send side in `Player.tsx` (reads
  `route.current`, `ride.current`, `playerWorld`), receive-side interpolation
  and validation, `Npcs count` reduction, section-wide counts in overview.
- `scripts/loadtest.mjs`; record the measured safe numbers in section 4.5.
- **Done when:** a long walk is one `walk` message and looks smooth to the
  other player; 12 remotes hold a stable frame rate on the baseline phone in
  battery saver (budget set from the measured baseline); the measured load test
  stays below 60% of the message ceiling at the tier-3 cut-off; overview mode
  draws no individuals.

### Stage 4: chat and groups (with moderation)

- `messages`, `threads`, `reports`, `blocks`, `banned_terms`; `send_message`,
  `list_messages`, `unread_counts`, `report_message`, `delete_me`; trigger
  relays; retention cron.
- `interactions.ts`: `sendChat`, `receiveChat`; `gameStore` actions;
  `ChatApp` in `src/ui/phone/PhoneApps.tsx` shows real messages (relative real
  time, report and block menu); chat settings in Settings.
- Freshers and class groups become real (sharded); scripted NPC posts stay.
- **Done when:** a message sent from one phone appears on another in under 2
  seconds with the chat open, a dead phone or zero data blocks sending with
  the existing phone message, a banned word is rejected, a link is stripped,
  the 21st message in a minute is refused, three reports hide a message, a
  blocked person's messages vanish, and "Delete my online data" removes the
  rows.

### Stage 5: real roommates (NPCs fill the rest)

- `rooms`, `room_members`, `claim_room`, `sync_room`; `roomAssign.ts` with
  Vitest tests (gender, level, corners, ghost routine for offline members);
  `allocateRoomMut(..., assignment?)`; `applyRoomAssignment`; `getPerson`
  registry; `dorm:{roomId}` channel; real room chat; offline ghosts via the
  existing `getOccupants` routine; `config.npc_fill = 'all'`.
- **Done when:** two new players of the same gender and level are put in the
  same hall and room within the same hour; a boy is never placed with a girl;
  five concurrent claimers on a free room never yield more than four members
  or a double seat; an offline roommate is drawn by routine with a "last seen"
  label; the offline game and the simulator still use the NPC pool unchanged;
  an old save loads without a reset.

### Stage 6: phase NPCs out, contacts and light social effects

- Move `npc_fill` to `min2` then `none` as the data in 3.5 says.
- Contacts (add/accept/block), real DMs, "Stay together?" at `beginSession`,
  the bounded `roommate_nudges` table, transit-bunk crowd of real freshers.
- `submit_result` replaces the direct `results` insert; drop the old policy.
- **Done when:** a room of four real players shows no NPCs while a solo
  offline player still gets them; the leaderboard rejects an edited-save
  "5.00 in ten minutes"; a daily-pair cap holds under a scripted test.

### Stage 7: only if the game outgrows the free tier

- Link email or Google sign-in to anonymous accounts, optional Turnstile,
  a transfer ledger for lending and gifts, replay verification of results
  (record an action log in the save and re-run the TypeScript rules in a free
  Supabase Edge Function), and a decision on paying for Realtime if the
  200-connection cap is the bottleneck. Not designed in detail here: do it
  from real data.

## 8. Tests and checks that keep this honest

- **Pure code gets Vitest tests next to it**: `roomAssign.ts`, the
  interpolation buffer, the keyframe validator, `officeQueue` with `world`,
  chat `sendChat` / `receiveChat`, the adaptive send-rate function.
- **The simulator never sees the network.** `src/game/sim/` must run with
  `world` undefined and no assignment; add a test that fails if `src/game/`
  imports from `src/online/`.
- **SQL smoke script** `supabase/smoke.sql`, run in the SQL editor after each
  stage: expects failures where it should (wrong gender room, 21st message,
  duplicate seat). If the owner later installs the Supabase CLI locally, the
  same script can run as database tests.
- **Load script** `scripts/loadtest.mjs` before stages 3 and 4.
- CI stays as in `deploy.yml` (tests, then build); multiplayer code is
  lazy-loaded like Supabase is today so the first download does not grow.

## 9. Decisions the owner should make

1. **Chat default and audience.** The plan defaults to *Friends and room
   only* and no links or images. Is there an age floor to write into the
   README and landing page?
2. **The banned-terms list.** It needs local knowledge (Pidgin, Yoruba, Igbo,
   Hausa); the plan ships an empty draft file for you to fill in.
3. **What "active today" counts.** The plan counts completed profiles that
   sent a heartbeat that Lagos day. A stricter rule is easy to add.
4. **Roommate matching.** Gender and level only, as proposed? Or also
   programme or college (smaller pools, better flavour, longer waits)?
5. **What to do at 200 online.** The plan degrades silently to stats and
   chat. Alternative: a visible "Campus is full, try the quiet time" queue.
6. **When to pay.** The plan keeps to the zero-cost rule until the free
   Realtime ceiling or the 50,000-user Auth ceiling is hit; at that point the
   cost is a conscious decision, not a surprise.

## 10. Known stale notes spotted while reading

- The `Clock` comment in `src/game/types.ts` still says "`day` is 1 to 14 in
  the semester"; `SEMESTER_DAYS` in `src/game/config.ts` is 28.
- The README's "Set up the online features" section says the leaderboard,
  vendor stalls and analytics are the online features; update it (and
  `.env.example`) when stage 0 lands.
- `src/game/hostel.ts` has two stacked doc comments above `sameGender`
  (the "Three roommates from the pool" line belongs to `drawRoommates`).

None of these are fixed here (this task is the plan only).
