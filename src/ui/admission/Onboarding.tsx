// The first screen: a short, hands-on introduction before you apply. Five
// cards, each with something to tap: open your admission letter, keep a
// student alive for a day, stamp the clearance form, catch a bank alert, and
// pick where your story ends. Swipe or tap Next; Skip goes straight to the
// application.
import { useEffect, useRef, useState } from 'react';
import { PRESETS, PRESET_IDS } from '../../world/characters/look';
import { Portrait } from '../Portrait';

const SLIDES = 5;

function Dots({ i, onPick }: { i: number; onPick: (n: number) => void }) {
  return (
    <div className="flex justify-center gap-2" role="tablist" aria-label="Introduction">
      {Array.from({ length: SLIDES }, (_, n) => (
        <button key={n} role="tab" aria-selected={n === i} aria-label={`Card ${n + 1}`} onClick={() => onPick(n)} className={`h-2 rounded-full transition-all ${n === i ? 'w-7 bg-sun' : 'w-2 bg-white/30'}`} />
      ))}
    </div>
  );
}

/** Card 1: tap the envelope to open your letter. */
function LetterDemo() {
  const [open, setOpen] = useState(false);
  return (
    <button onClick={() => setOpen((o) => !o)} className="relative mx-auto block h-44 w-64" aria-label={open ? 'Close the letter' : 'Open the letter'}>
      <span className={`absolute inset-x-4 top-3 rounded-xl bg-[#FBF7EC] p-3 text-left font-serif text-[11px] leading-snug text-[#1E2A33] shadow-lg transition-all duration-500 ${open ? '-translate-y-10 opacity-100' : 'translate-y-6 opacity-0'}`}>
        <b className="block text-center text-[10px] tracking-widest uppercase">Letter of admission</b>
        Dear Fresher, we are pleased to offer you provisional admission. Pay your acceptance fee and complete clearance.
      </span>
      <span className="absolute inset-x-0 bottom-0 grid h-28 place-items-center rounded-2xl bg-gradient-to-b from-[#E8B04B] to-[#C98A12] text-5xl shadow-xl">{open ? '📭' : '✉️'}</span>
      {!open && <span className="absolute -top-1 right-6 animate-bounce rounded-full bg-white px-2 py-0.5 text-xs font-bold text-night">Tap me</span>}
    </button>
  );
}

/** Card 2: keep a student going. Needs fall on their own; tap to fix them. */
function NeedsDemo() {
  const [n, setN] = useState({ energy: 70, food: 60, fresh: 50 });
  useEffect(() => {
    const id = window.setInterval(() => setN((x) => ({ energy: Math.max(0, x.energy - 3), food: Math.max(0, x.food - 4), fresh: Math.max(0, x.fresh - 3) })), 900);
    return () => window.clearInterval(id);
  }, []);
  const avg = (n.energy + n.food + n.fresh) / 3;
  const mood = avg > 70 ? '😄' : avg > 45 ? '🙂' : avg > 25 ? '😩' : '😫';
  const bar = (v: number) => (v >= 60 ? 'bg-emerald-400' : v >= 30 ? 'bg-amber-400' : 'bg-red-400');
  return (
    <div className="mx-auto flex w-full max-w-xs flex-col gap-2 rounded-3xl border border-white/10 bg-white/5 p-4">
      <p className="text-center text-5xl transition-transform" aria-live="polite">
        {mood}
      </p>
      {(
        [
          ['⚡ Energy', n.energy],
          ['🍲 Fullness', n.food],
          ['🧼 Hygiene', n.fresh],
        ] as const
      ).map(([label, v]) => (
        <div key={label} className="flex items-center gap-2 text-xs">
          <span className="w-20">{label}</span>
          <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <span className={`block h-full transition-all duration-500 ${bar(v)}`} style={{ width: `${Math.max(3, v)}%` }} />
          </span>
        </div>
      ))}
      <div className="mt-1 grid grid-cols-3 gap-2">
        <button onClick={() => setN((x) => ({ ...x, energy: 100 }))} className="min-h-11 rounded-xl bg-white/10 text-sm font-semibold active:scale-95">
          🛏️ Sleep
        </button>
        <button onClick={() => setN((x) => ({ ...x, food: 100 }))} className="min-h-11 rounded-xl bg-white/10 text-sm font-semibold active:scale-95">
          🍲 Eat
        </button>
        <button onClick={() => setN((x) => ({ ...x, fresh: 100 }))} className="min-h-11 rounded-xl bg-white/10 text-sm font-semibold active:scale-95">
          🧼 Bathe
        </button>
      </div>
    </div>
  );
}

const OFFICES = ['Admissions', 'Registry', 'Bursary', 'Student Affairs', 'ICT', 'College', 'HOD', 'Medical'];

/** Card 3: stamp all eight offices. */
function ClearanceDemo() {
  const [signed, setSigned] = useState<boolean[]>(() => OFFICES.map(() => false));
  const done = signed.every(Boolean);
  return (
    <div className="mx-auto w-full max-w-xs rounded-3xl bg-[#FBF7EC] p-4 text-[#1E2A33] shadow-xl">
      <p className="text-center text-xs font-bold tracking-widest uppercase">Clearance form</p>
      <ul className="mt-2 grid grid-cols-2 gap-1.5">
        {OFFICES.map((o, i) => (
          <li key={o}>
            <button
              onClick={() => setSigned((s) => s.map((x, j) => (j === i ? true : x)))}
              className={`flex min-h-10 w-full items-center justify-between rounded-lg border px-2 text-left text-xs font-semibold ${signed[i] ? 'border-emerald-600 bg-emerald-100' : 'border-[#1E2A33]/20 bg-white'}`}
            >
              {o}
              <span aria-hidden="true">{signed[i] ? '✅' : '✍🏾'}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-center text-sm font-bold">{done ? 'Cleared! 🎉 You are a real student now.' : `${signed.filter(Boolean).length} of 8 signed · tap an office`}</p>
    </div>
  );
}

/** Card 4: tap the phone and the fees land. */
function PhoneDemo() {
  const [alerts, setAlerts] = useState(0);
  const texts = ['Credit Alert! +₦88,500 · TRF FROM DAD - SCHOOL FEES', '💬 Mummy: Eat well, read your books 🙏🏾', '💬 Freshers Group: Party at the hostel tonight 🪩'];
  return (
    <div className="mx-auto flex w-full max-w-xs flex-col items-center gap-3">
      <div className="flex h-24 w-full flex-col gap-1.5">
        {texts.slice(0, alerts).map((t, i) => (
          <p key={i} className="note-in rounded-2xl bg-[#1B2733] px-3 py-2 text-xs font-semibold shadow-lg">
            {i === 0 ? '🏦 ' : ''}
            {t}
          </p>
        ))}
      </div>
      <button onClick={() => setAlerts((a) => Math.min(texts.length, a + 1))} className="relative grid h-36 w-20 place-items-center rounded-[18px] border-4 border-[#0B0C10] bg-gradient-to-b from-[#7C5CFF] to-[#2C1F66] text-3xl shadow-2xl active:scale-95" aria-label="Check your phone">
        📱
        {alerts < texts.length && <span className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-red-500 text-xs font-bold">{texts.length - alerts}</span>}
      </button>
    </div>
  );
}

const ENDINGS = [
  ['🎓', 'First Class', 'Read hard, never miss a class'],
  ['🗳️', 'SU President', 'Make friends, win the election'],
  ['💼', 'Big hustler', 'Graduate with money in the bank'],
  ['😎', 'Just graduate', 'Enjoy it, and get the certificate'],
] as const;

/** Card 5: where could it end? */
function EndingsDemo() {
  const [pick, setPick] = useState(0);
  return (
    <div className="mx-auto grid w-full max-w-xs grid-cols-2 gap-2">
      {ENDINGS.map(([e, t, b], i) => (
        <button key={t} onClick={() => setPick(i)} className={`flex flex-col items-center gap-1 rounded-2xl border p-3 text-center transition ${pick === i ? 'scale-[1.03] border-sun bg-sun/10' : 'border-white/10 bg-white/5'}`}>
          <span className="text-3xl">{e}</span>
          <span className="text-sm font-bold">{t}</span>
          <span className="text-[11px] text-muted">{b}</span>
        </button>
      ))}
    </div>
  );
}

const CARDS = [
  { title: 'You got admission!', text: 'A whole degree, from the entrance test to graduation day. Your story starts with a letter.', Demo: LetterDemo },
  { title: 'Live every day', text: 'Eat, sleep, bathe, read and party. Your needs fall as the day goes on; look after them and your grades follow.', Demo: NeedsDemo },
  { title: 'Survive clearance', text: 'Eight offices, long queues, missing photocopies. Get every signature to become a real student.', Demo: ClearanceDemo },
  { title: 'Your phone is your life', text: 'School fees from Dad, upkeep from Mum, the portal, group chats. Keep it charged and buy data.', Demo: PhoneDemo },
  { title: 'How will it end?', text: 'First Class, SU President, big hustler, or just the certificate. Your choices decide.', Demo: EndingsDemo },
];

export function Onboarding({ onApply, extra }: { onApply: () => void; extra?: React.ReactNode }) {
  const [i, setI] = useState(0);
  const touch = useRef<number | null>(null);
  const card = CARDS[i]!;
  const last = i === SLIDES - 1;
  const go = (n: number) => setI(Math.max(0, Math.min(SLIDES - 1, n)));

  return (
    <main
      className="pointer-events-auto relative flex min-h-full flex-col overflow-hidden bg-[radial-gradient(120%_80%_at_50%_0%,#2B4A6B_0%,#14202B_55%,#0E161E_100%)]"
      onTouchStart={(e) => (touch.current = e.touches[0]?.clientX ?? null)}
      onTouchEnd={(e) => {
        const start = touch.current;
        const end = e.changedTouches[0]?.clientX;
        touch.current = null;
        if (start == null || end == null || Math.abs(end - start) < 50) return;
        go(i + (end < start ? 1 : -1));
      }}
    >
      {/* A row of students along the top, bobbing. */}
      <div className="flex justify-center gap-3 pt-[max(1.25rem,env(safe-area-inset-top))]" aria-hidden="true">
        {PRESET_IDS.map((id, n) => (
          <span key={id} className="bob grid size-14 place-items-center overflow-hidden rounded-full bg-white/10 ring-2 ring-white/10" style={{ animationDelay: `${n * 0.25}s` }}>
            <Portrait look={PRESETS[id].look} size={52} />
          </span>
        ))}
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <header className="text-center">
          <p className="text-xs font-semibold tracking-widest text-sun uppercase">Admission to university</p>
          <h1 className="text-4xl font-extrabold">Campus Life</h1>
        </header>
        {extra}

        <section key={i} className="card-in flex flex-1 flex-col justify-center gap-4">
          <card.Demo />
          <div className="text-center">
            <h2 className="text-2xl font-bold">{card.title}</h2>
            <p className="mt-1 text-sm text-white/75">{card.text}</p>
          </div>
        </section>

        <Dots i={i} onPick={go} />
        <div className="flex gap-2">
          {last ? (
            <button onClick={onApply} className="min-h-12 flex-1 rounded-xl bg-sun px-4 text-lg font-bold text-night shadow-lg shadow-sun/20">
              Apply for admission
            </button>
          ) : (
            <>
              <button onClick={onApply} className="min-h-12 rounded-xl px-4 font-semibold text-white/70">
                Skip
              </button>
              <button onClick={() => go(i + 1)} className="min-h-12 flex-1 rounded-xl bg-sun px-4 font-bold text-night">
                Next
              </button>
            </>
          )}
        </div>
        <p className="text-center text-[11px] text-white/50">Unofficial fan-made game. Not affiliated with any real university.</p>
      </div>
    </main>
  );
}
