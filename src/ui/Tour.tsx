// The first-time tour: a few cards that point at the parts of the screen and
// say what they are for. Shown once, the first time a game is on screen;
// "Show the tour again" in the phone's Settings brings it back.
import { useState } from 'react';
import { useSettings } from '../store/settingsStore';

type Where = 'center' | 'top-left' | 'top-right' | 'bottom';

const STEPS: Array<{ where: Where; icon: string; title: string; text: string }> = [
  {
    where: 'center',
    icon: '🎓',
    title: 'Welcome to university!',
    text: "You got in. This is your room in Freshers' Hall, shared with other freshers until you get your own allocation. Let us show you around.",
  },
  {
    where: 'center',
    icon: '👆',
    title: 'Walk around',
    text: 'Drag anywhere on the screen to walk. Tap anything with a ◆ marker and you walk straight to it.',
  },
  {
    where: 'bottom',
    icon: '🛏️',
    title: 'Do things, watch them happen',
    text: 'Go up to your bed, desk, bathroom or the stove. A card shows what you can do, the price, how long it takes and what it does to you. Pick one and watch your character do it.',
  },
  {
    where: 'top-left',
    icon: '👉',
    title: 'Your story',
    text: 'This chip always shows your next step. First freshen up and eat, then clearance: start at the Admissions Office and go office by office. Tap it for the list and a Go button.',
  },
  {
    where: 'top-right',
    icon: '⚡',
    title: 'Your needs',
    text: 'Energy, hunger, hygiene, bladder and stress. Keep them green, or your mood and your grades suffer. Tap them to see how you feel and why.',
  },
  {
    where: 'bottom',
    icon: '📱',
    title: 'The bottom bar',
    text: '🏠 your room · Me: close-up on you · Map: the whole campus (drag to move around) · the phone: school portal, fees, timetable and chats.',
  },
  {
    where: 'center',
    icon: '🛺',
    title: 'Getting around',
    text: 'On the map, tap any building to see what is happening there, then go by keke, cab or on foot. Clearance comes first: the town and night life open after.',
  },
];

const PLACE: Record<Where, string> = {
  center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  'top-left': 'top-28 left-3',
  'top-right': 'top-28 right-3',
  bottom: 'bottom-28 left-1/2 -translate-x-1/2',
};

const ARROW: Record<Where, string> = {
  center: '',
  'top-left': '↖',
  'top-right': '↗',
  bottom: '↓',
};

export function Tour() {
  const done = useSettings((s) => s.tourDone);
  const setDone = useSettings((s) => s.setTourDone);
  const [i, setI] = useState(0);
  if (done) return null;
  const step = STEPS[i]!;
  const last = i === STEPS.length - 1;
  const finish = () => {
    setDone(true);
    setI(0);
  };
  return (
    <div className="fixed inset-0 z-40 bg-black/55" role="dialog" aria-modal="true" aria-label="How to play">
      <div className={`absolute w-[min(22rem,calc(100vw-1.5rem))] ${PLACE[step.where]}`}>
        {step.where.startsWith('top') && <p className={`mb-1 text-3xl text-sun ${step.where === 'top-right' ? 'text-right' : ''}`}>{ARROW[step.where]}</p>}
        <section className="rounded-3xl border border-white/15 bg-[#14202B] p-4 shadow-2xl">
          <p className="text-3xl" aria-hidden="true">
            {step.icon}
          </p>
          <h2 className="mt-1 text-lg font-bold">{step.title}</h2>
          <p className="mt-1 text-sm text-white/85">{step.text}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="flex-1 text-xs text-muted">
              {i + 1} of {STEPS.length}
            </span>
            {!last && (
              <button onClick={finish} className="min-h-10 px-3 text-sm font-semibold text-muted">
                Skip
              </button>
            )}
            {i > 0 && (
              <button onClick={() => setI(i - 1)} className="min-h-10 rounded-xl border border-white/20 px-3 text-sm font-semibold">
                Back
              </button>
            )}
            <button onClick={() => (last ? finish() : setI(i + 1))} className="min-h-10 rounded-xl bg-sun px-4 text-sm font-bold text-night">
              {last ? "Let's go" : 'Next'}
            </button>
          </div>
        </section>
        {step.where === 'bottom' && <p className="mt-1 text-center text-3xl text-sun">{ARROW.bottom}</p>}
      </div>
    </div>
  );
}
