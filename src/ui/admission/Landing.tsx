// Before you sign up: the live campus fills the screen (drag to look around,
// students walking, the sky at its time of day) and the application sits on
// top. Buildings cannot be entered until you have admission.
import { lazy, Suspense, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ErrorBoundary } from '../ErrorBoundary';
import { hasWebGL } from '../webgl';
import { AdmissionFlow } from './AdmissionFlow';

const CampusScene = lazy(() => import('../../world/CampusScene'));

export function Landing({ onLeaderboard }: { onLeaderboard: () => void }) {
  const setCameraMode = useGameStore((s) => s.setCameraMode);
  const notice = useGameStore((s) => s.notice);
  const setNotice = useGameStore((s) => s.setNotice);
  useEffect(() => setCameraMode('overview'), [setCameraMode]);
  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(id);
  }, [notice, setNotice]);
  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0E161E]">
      {hasWebGL() && (
        <div className="absolute inset-0">
          <ErrorBoundary fallback={null}>
            <Suspense fallback={null}>
              <CampusScene paused={false} />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}
      {notice && (
        <p role="status" className="pointer-events-none fixed inset-x-0 top-16 z-20 mx-auto w-fit max-w-sm rounded-2xl bg-[#16181F]/95 px-4 py-2 text-center text-sm font-semibold shadow-lg">
          🔒 {notice}
        </p>
      )}
      <div className="pointer-events-none absolute inset-0 overflow-y-auto">
        <AdmissionFlow onLeaderboard={onLeaderboard} />
      </div>
    </div>
  );
}
