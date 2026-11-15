import { useEffect, useState } from 'react';
import { getDepartment, university } from '../content/university';
import { fetchLeaderboard, type LeaderboardRow } from '../online/supabase';

type Tab = 'department' | 'school';

export function LeaderboardScreen({ departmentId, onBack }: { departmentId?: string; onBack: () => void }) {
  const [tab, setTab] = useState<Tab>(departmentId ? 'department' : 'school');
  const [rows, setRows] = useState<LeaderboardRow[] | null | 'loading'>('loading');

  useEffect(() => {
    let alive = true;
    setRows('loading');
    void fetchLeaderboard(tab === 'department' ? departmentId : undefined).then((r) => alive && setRows(r));
    return () => {
      alive = false;
    };
  }, [tab, departmentId]);

  const deptName = departmentId ? (getDepartment(departmentId)?.name ?? departmentId) : '';

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Leaderboard</h1>
        <button onClick={onBack} className="min-h-11 rounded-lg border border-line px-4 font-semibold">
          Back
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2" role="tablist">
        {departmentId && (
          <button
            role="tab"
            aria-selected={tab === 'department'}
            onClick={() => setTab('department')}
            className={`min-h-11 rounded-lg px-2 text-sm font-semibold ${tab === 'department' ? 'bg-sun text-night' : 'bg-panel'}`}
          >
            {deptName}
          </button>
        )}
        <button
          role="tab"
          aria-selected={tab === 'school'}
          onClick={() => setTab('school')}
          className={`min-h-11 rounded-lg px-2 text-sm font-semibold ${tab === 'school' ? 'bg-sun text-night' : 'bg-panel'} ${
            departmentId ? '' : 'col-span-2'
          }`}
        >
          All of {university.shortName}
        </button>
      </div>

      {rows === 'loading' && <p className="text-muted">Loading…</p>}
      {rows === null && <p className="text-muted">The leaderboard is offline right now. Your game still works.</p>}
      {Array.isArray(rows) && rows.length === 0 && <p className="text-muted">No results yet. Be the first!</p>}
      {Array.isArray(rows) && rows.length > 0 && (
        <ol className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center gap-3 rounded-xl border border-line bg-panel px-3 py-2">
              <span className={`w-6 text-center font-extrabold ${i < 3 ? 'text-sun' : 'text-muted'}`}>{i + 1}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-semibold">{r.nickname}</span>
                <span className="truncate text-xs text-muted">
                  {tab === 'school' ? `${getDepartment(r.department)?.name ?? r.department} · ` : ''}
                  {r.title}
                </span>
              </span>
              <span className="text-lg font-extrabold">{r.cgpa.toFixed(2)}</span>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
