-- Campus Life: tables and row level security.
-- Run this once in Supabase > SQL Editor > New query.
-- Also turn on Authentication > Sign In / Providers > "Allow anonymous sign-ins".

-------------------------------------------------------------------------------
-- Results (the leaderboard)
-------------------------------------------------------------------------------
create table if not exists public.results (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 20),
  department text not null check (char_length(department) between 1 and 40),
  cgpa numeric(3, 2) not null check (cgpa between 0 and 5),
  money integer not null check (money between 0 and 10000000),
  title text not null check (char_length(title) between 1 and 60),
  created_at timestamptz not null default now()
);

create index if not exists results_department_cgpa_idx on public.results (department, cgpa desc);
create index if not exists results_user_idx on public.results (user_id, created_at desc);

alter table public.results enable row level security;

-- Everyone can read results.
drop policy if exists "Anyone can read results" on public.results;
create policy "Anyone can read results"
  on public.results for select
  to anon, authenticated
  using (true);

-- Signed-in players (anonymous sign-in counts) can add their OWN result,
-- at most one a minute, to slow down spam.
drop policy if exists "Players add their own results" on public.results;
create policy "Players add their own results"
  on public.results for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and not exists (
      select 1 from public.results r
      where r.user_id = (select auth.uid())
        and r.created_at > now() - interval '1 minute'
    )
  );
-- No update or delete policies: results cannot be changed from the game.

-- Each player's best result only, so one person cannot fill the top 20.
create or replace view public.leaderboard
with (security_invoker = true) as
select distinct on (user_id)
  nickname, department, cgpa, title, created_at
from public.results
order by user_id, cgpa desc, created_at asc;

grant select on public.leaderboard to anon, authenticated;

-------------------------------------------------------------------------------
-- Vendors (real campus stalls). Edit these in Table Editor; the game can only read.
-------------------------------------------------------------------------------
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Must match a location id in src/content/university.ts, e.g. 'buka' or 'gate'.
  location_id text not null,
  description text not null default '',
  -- WhatsApp number, digits only with country code, e.g. 2348012345678.
  whatsapp text not null,
  -- Up to five items, e.g. [{"name": "Jollof rice", "price": 1500}]
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists vendors_location_idx on public.vendors (location_id, sort_order);

alter table public.vendors enable row level security;

-- Everyone can read ACTIVE vendors. No insert/update/delete policies, so only
-- you (through the Supabase dashboard) can change them.
drop policy if exists "Anyone can read active vendors" on public.vendors;
create policy "Anyone can read active vendors"
  on public.vendors for select
  to anon, authenticated
  using (active);
