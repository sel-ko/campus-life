// Leaderboard and vendors through Supabase. Every function returns null when
// Supabase is not set up, offline, slow or down, and the UI then hides that
// feature. The game itself never waits on any of this.
import type { SupabaseClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const TIMEOUT_MS = 8000;

export function onlineConfigured(): boolean {
  return Boolean(URL && KEY);
}

let clientPromise: Promise<SupabaseClient | null> | null = null;

/** The Supabase library is downloaded only when first needed. */
function client(): Promise<SupabaseClient | null> {
  if (!onlineConfigured()) return Promise.resolve(null);
  clientPromise ??= import('@supabase/supabase-js')
    .then(({ createClient }) => createClient(URL!, KEY!, { auth: { persistSession: true, autoRefreshToken: true } }))
    .catch(() => null);
  return clientPromise;
}

/** Gives up after a few seconds so a bad connection never hangs a screen. */
function withTimeout<T>(promise: PromiseLike<T>, ms = TIMEOUT_MS): Promise<T | null> {
  return Promise.race([
    Promise.resolve(promise).catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

/** Signs in anonymously on first play; later visits reuse the saved session. */
export async function ensureSignedIn(): Promise<string | null> {
  const c = await client();
  if (!c) return null;
  const session = await withTimeout(c.auth.getSession());
  const existing = session?.data.session?.user.id;
  if (existing) return existing;
  const result = await withTimeout(c.auth.signInAnonymously());
  return result?.data.user?.id ?? null;
}

// ---------- results and leaderboard ----------

export interface ResultSubmission {
  nickname: string;
  department: string;
  cgpa: number;
  money: number;
  title: string;
}

export interface LeaderboardRow {
  nickname: string;
  department: string;
  cgpa: number;
  title: string;
}

/** Saves a finished semester. Returns true when it was stored. */
export async function submitResult(r: ResultSubmission): Promise<boolean> {
  const c = await client();
  if (!c || !(await ensureSignedIn())) return false;
  const res = await withTimeout(
    c.from('results').insert({
      nickname: r.nickname.slice(0, 20),
      department: r.department.slice(0, 40),
      cgpa: r.cgpa,
      money: Math.max(0, Math.round(r.money)),
      title: r.title.slice(0, 60),
    }),
  );
  return !!res && !res.error;
}

/** Top 20 best results, for one department or the whole school. */
export async function fetchLeaderboard(department?: string): Promise<LeaderboardRow[] | null> {
  const c = await client();
  if (!c) return null;
  let query = c.from('leaderboard').select('nickname, department, cgpa, title');
  if (department) query = query.eq('department', department);
  const res = await withTimeout(query.order('cgpa', { ascending: false }).order('created_at', { ascending: true }).limit(20));
  if (!res || res.error || !res.data) return null;
  return res.data.map((row) => ({ ...row, cgpa: Number(row.cgpa) })) as LeaderboardRow[];
}

/** Where a CGPA would place in a department: 1 = top. */
export async function fetchRank(department: string, cgpa: number): Promise<{ rank: number; total: number } | null> {
  const c = await client();
  if (!c) return null;
  const [above, all] = await Promise.all([
    withTimeout(c.from('leaderboard').select('*', { count: 'exact', head: true }).eq('department', department).gt('cgpa', cgpa)),
    withTimeout(c.from('leaderboard').select('*', { count: 'exact', head: true }).eq('department', department)),
  ]);
  if (!above || !all || above.error || all.error || above.count === null || all.count === null) return null;
  return { rank: above.count + 1, total: Math.max(all.count, above.count + 1) };
}

// ---------- vendors ----------

export interface VendorItem {
  name: string;
  price: number;
}

export interface Vendor {
  id: string;
  name: string;
  locationId: string;
  description: string;
  whatsapp: string;
  items: VendorItem[];
}

let vendorsPromise: Promise<Vendor[] | null> | null = null;

/** All active vendors, fetched once per visit. */
export function fetchVendors(): Promise<Vendor[] | null> {
  vendorsPromise ??= (async () => {
    const c = await client();
    if (!c) return null;
    const res = await withTimeout(
      c.from('vendors').select('id, name, location_id, description, whatsapp, items').eq('active', true).order('sort_order'),
    );
    if (!res || res.error || !res.data) {
      vendorsPromise = null; // try again next time
      return null;
    }
    return res.data.map((v) => ({
      id: String(v.id),
      name: String(v.name),
      locationId: String(v.location_id),
      description: String(v.description ?? ''),
      whatsapp: String(v.whatsapp ?? ''),
      items: (Array.isArray(v.items) ? v.items : [])
        .filter((i: unknown): i is VendorItem => typeof i === 'object' && i !== null && 'name' in i)
        .slice(0, 5)
        .map((i: VendorItem) => ({ name: String(i.name), price: Number(i.price) || 0 })),
    }));
  })();
  return vendorsPromise;
}
