import { lazy, Suspense, useState } from 'react';

// Only with ?debug=1 in the address: a small button that opens the campus
// debug map. Players never download the debug code.
const CampusDebugView = lazy(() => import('./CampusDebugView'));

export const DEBUG = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';

export function DebugLauncher() {
  const [open, setOpen] = useState(false);
  if (!DEBUG) return null;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed top-1/2 left-0 z-50 -translate-y-1/2 rounded-r-xl bg-red-600 px-2 py-3 text-xs font-bold text-white shadow-lg [writing-mode:vertical-rl]"
      >
        DEBUG MAP
      </button>
      {open && (
        <Suspense fallback={null}>
          <CampusDebugView onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
