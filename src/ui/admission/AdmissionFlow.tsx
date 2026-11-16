// A new game: welcome, your details, the course you want, the entrance test,
// the admission letter and your ambition. Rules come from src/game/admission.ts.
import { useEffect, useMemo, useState } from 'react';
import { AMBITIONS } from '../../content/ambitions';
import { COLLEGES, PROGRAMMES, getCollege, getProgramme } from '../../content/courses';
import { sectionName } from '../../content/places';
import { admissionLetter, decideAdmission, drawTest, matricNumber, scoreTest } from '../../game/admission';
import { BACKGROUNDS, FEES, FRESHER_LECTURES_START } from '../../game/config';
import { naira } from '../../game/format';
import type { AmbitionId, BackgroundId } from '../../game/types';
import { onlineConfigured } from '../../online/supabase';
import { useGameStore } from '../../store/gameStore';
import { useSettings } from '../../store/settingsStore';
import type { CharacterLook } from '../../world/characters/look';
import { CharacterCreator, baseLook, type Gender } from './CharacterCreator';
import { Onboarding } from './Onboarding';
import { BTN_GHOST, BTN_PRIMARY, CARD } from '../theme';

/** A row of buttons that stays at the bottom of the panel while the form scrolls. */
const STICKY = 'sticky bottom-0 -mx-4 flex gap-2 border-t border-white/10 bg-[#14202B] px-4 py-3';

type Step = 'welcome' | 'details' | 'course' | 'test' | 'letter' | 'ambition';
const BACKGROUND_IDS: BackgroundId[] = ['broke', 'average', 'comfortable'];

export function AdmissionFlow({ onLeaderboard, onStepChange }: { onLeaderboard: () => void; onStepChange?: (welcome: boolean) => void }) {
  const start = useGameStore((s) => s.start);
  const resetNotice = useGameStore((s) => s.resetNotice);
  const dismissResetNotice = useGameStore((s) => s.dismissResetNotice);
  const [step, setStep] = useState<Step>('welcome');
  // The campus behind only moves on the welcome card (phones need the power for the form).
  useEffect(() => onStepChange?.(step === 'welcome'), [step, onStepChange]);
  const [showIntro, setShowIntro] = useState(false);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [look, setLook] = useState<CharacterLook>(() => baseLook('male'));
  const [background, setBackground] = useState<BackgroundId>('average');
  const [choiceId, setChoiceId] = useState('computer_science');
  const [seed] = useState(() => (Math.random() * 2 ** 32) >>> 0 || 1);
  // Each retake draws a fresh set of questions.
  const [attempt, setAttempt] = useState(1);
  const questions = useMemo(() => drawTest(seed + attempt * 104729), [seed, attempt]);
  const [answers, setAnswers] = useState<Array<number | null>>(() => questions.map(() => null));
  const [qIndex, setQIndex] = useState(0);
  const testsTaken = useSettings((s) => s.testsTaken);
  const countTest = useSettings((s) => s.countTest);
  const [ambition, setAmbition] = useState<AmbitionId>('first_class');
  const year = new Date().getFullYear();

  // Fetch the 3D campus code in the background while the player fills this in.
  useEffect(() => {
    const id = window.setTimeout(() => void import('../../world/CampusScene').catch(() => undefined), 1500);
    return () => window.clearTimeout(id);
  }, []);

  const score = scoreTest(questions, answers);
  const result = useMemo(() => decideAdmission(choiceId, score, seed), [choiceId, score, seed]);
  const matric = matricNumber(result.programmeId, seed, year);
  const letter = admissionLetter(name.trim(), result, matric);

  function begin() {
    start({
      name: name.trim(),
      characterId: gender === 'female' ? 'f1' : 'm1',
      gender,
      look,
      background,
      choiceId,
      programmeId: result.programmeId,
      admissionScore: score,
      testAttempts: attempt,
      ambition,
      seed,
      startYear: year,
    });
  }

  const shell = (children: React.ReactNode) => (
    <main
      className="pointer-events-auto mx-auto my-4 flex max-w-md touch-pan-y flex-col gap-5 overflow-y-auto overscroll-contain rounded-3xl border border-white/10 bg-[#14202B] px-4 pt-6 shadow-2xl"
      style={{ maxHeight: 'calc(100dvh - 2rem)' }}
    >
      {children}
      <p className="mt-auto pt-2 pb-6 text-center text-xs text-muted">Unofficial fan-made game. Not affiliated with any real university.</p>
    </main>
  );

  if (step === 'welcome') {
    if (showIntro) return <Onboarding onApply={() => setStep('details')} />;
    return (
      <div className="pointer-events-none flex min-h-full flex-col justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
        <header className="pointer-events-auto mx-auto flex w-fit items-center gap-2 rounded-full bg-[#16181F]/90 px-4 py-2 shadow-lg">
          <span className="text-lg" aria-hidden="true">
            🎓
          </span>
          <span className="font-extrabold">Campus Life</span>
        </header>
        <section className="pointer-events-auto mx-auto flex w-full max-w-md flex-col gap-3 rounded-3xl border border-white/10 bg-[#14202B]/92 p-5 shadow-2xl backdrop-blur">
          {resetNotice && (
            <div role="status" className="rounded-2xl border border-sun/50 bg-sun/10 p-3 text-sm">
              <p className="font-semibold text-sun">The game has been rebuilt</p>
              <button onClick={dismissResetNotice} className="mt-1 min-h-10 font-semibold underline">
                Okay
              </button>
            </div>
          )}
          <p className="text-xs font-semibold tracking-widest text-sun uppercase">Admission to university</p>
          <h1 className="text-3xl font-extrabold">Your degree starts here</h1>
          <p className="text-sm text-white/75">Drag to look around campus. To go into any building you need admission: apply, take the entrance test, and move into your hostel.</p>
          <button onClick={() => setStep('details')} className="min-h-12 rounded-xl bg-sun text-lg font-bold text-night shadow-lg shadow-sun/20">
            Apply for admission
          </button>
          <div className="flex justify-center gap-4">
            <button onClick={() => setShowIntro(true)} className="min-h-10 text-sm font-semibold text-white/80 underline">
              How it works
            </button>
            {onlineConfigured() && (
              <button onClick={onLeaderboard} className="min-h-10 text-sm font-semibold text-sun underline">
                Leaderboard
              </button>
            )}
          </div>
          <p className="text-center text-[11px] text-white/45">Unofficial fan-made game. Not affiliated with any real university.</p>
        </section>
      </div>
    );
  }

  if (step === 'details') {
    const ready = name.trim().length > 0;
    return shell(
      <>
        <h2 className="text-2xl font-bold">Your details</h2>
        <label className="flex flex-col gap-2">
          <span className="font-semibold">Your name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            placeholder="What do people call you?"
            className="min-h-11 rounded-lg border border-line bg-panel px-3 text-ink placeholder:text-muted/70"
          />
        </label>
        <CharacterCreator
          gender={gender}
          look={look}
          onGender={(g) => {
            setGender(g);
            setLook(baseLook(g));
          }}
          onLook={setLook}
        />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-semibold">Family background</legend>
          {BACKGROUND_IDS.map((id) => {
            const b = BACKGROUNDS[id];
            return (
              <label key={id} className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 ${background === id ? 'border-sun bg-panel' : 'border-line'}`}>
                <input type="radio" name="bg" checked={background === id} onChange={() => setBackground(id)} className="mt-1 size-5 accent-sun" />
                <span className="flex flex-col">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold">{b.label}</span>
                    <span className="text-lg font-extrabold text-sun">{naira(b.startMoney)}</span>
                  </span>
                  <span className="text-sm text-muted">
                    Pocket money to start. {naira(b.allowance)} upkeep from Mum twice a semester; Dad sends {b.feeShare < 1 ? `${Math.round(b.feeShare * 100)}% of` : 'all'} the school fees. {b.blurb}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
        {!ready && <p className="-mb-3 text-center text-sm text-sun">Type your name above to continue</p>}
        <div className={STICKY}>
          <button onClick={() => setStep('welcome')} className={BTN_GHOST}>
            Back
          </button>
          <button disabled={!ready} onClick={() => setStep('course')} className={`${BTN_PRIMARY} flex-1`}>
            Next: choose a course
          </button>
        </div>
      </>,
    );
  }

  if (step === 'course') {
    const p = getProgramme(choiceId);
    const college = getCollege(p.collegeId);
    return shell(
      <>
        <h2 className="text-2xl font-bold">Choose your course</h2>
        <label className="flex flex-col gap-2">
          <span className="font-semibold">Course</span>
          <select value={choiceId} onChange={(e) => setChoiceId(e.target.value)} className="min-h-11 rounded-lg border border-line bg-panel px-3 text-ink">
            {COLLEGES.map((c) => (
              <optgroup key={c.id} label={c.name}>
                {PROGRAMMES.filter((x) => x.collegeId === c.id).map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <div className={`${CARD} flex flex-col gap-1 p-4 text-sm`}>
          <p className="text-lg font-bold">{p.name}</p>
          <p className="text-muted">{college.name}</p>
          <p>
            {p.years} years · lectures at {sectionName(college.sectionId)}
          </p>
          <p>
            Entrance test cut-off: <b>{p.cutoff}/10</b> {p.competitive && <span className="text-sun">(competitive)</span>}
          </p>
          <p className="text-muted">Acceptance fee {naira(FEES.acceptance[p.competitive ? 1 : 0])}. Miss the cut-off and you will be offered another course.</p>
        </div>
        <div className={STICKY}>
          <button onClick={() => setStep('details')} className={BTN_GHOST}>
            Back
          </button>
          <button onClick={() => setStep('test')} className={`${BTN_PRIMARY} flex-1`}>
            Take the entrance test
          </button>
        </div>
      </>,
    );
  }

  if (step === 'test') {
    const q = questions[qIndex]!;
    const chosen = answers[qIndex];
    return shell(
      <>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Entrance test {attempt > 1 && <span className="text-sm font-semibold text-sun">· attempt {attempt}</span>}</h2>
          <span className="text-sm text-muted">
            {qIndex + 1} of {questions.length}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-sun" style={{ width: `${((qIndex + 1) / questions.length) * 100}%` }} />
        </div>
        <p className="text-lg font-semibold">{q.q}</p>
        <div className="flex flex-col gap-2">
          {q.options.map((opt, i) => (
            <button
              key={opt}
              onClick={() => setAnswers((a) => a.map((x, j) => (j === qIndex ? i : x)))}
              className={`min-h-12 rounded-xl border px-4 text-left ${chosen === i ? 'border-sun bg-sun/15 font-semibold' : 'border-white/15 bg-white/5'}`}
            >
              {opt}
            </button>
          ))}
        </div>
        <button
          disabled={chosen == null}
          onClick={() => {
            if (qIndex < questions.length - 1) return setQIndex(qIndex + 1);
            countTest();
            setStep('letter');
          }}
          className={`${BTN_PRIMARY} sticky bottom-3`}
        >
          {qIndex < questions.length - 1 ? 'Next question' : 'Submit the test'}
        </button>
      </>,
    );
  }

  if (step === 'letter') {
    return shell(
      <>
        <article className="rounded-2xl bg-[#FBF7EC] p-5 font-serif text-[#1E2A33] shadow-xl">
          <p className="text-center text-xs font-bold tracking-widest uppercase">Letter of admission</p>
          <p className="text-center text-xs">Office of the Registrar · Admissions</p>
          <hr className="my-3 border-[#1E2A33]/20" />
          <p className="text-sm">Matric No: {letter.matric}</p>
          <p className="mt-3">Dear {letter.name},</p>
          <p className="mt-2 text-sm leading-relaxed">
            You scored <b>{letter.score}/10</b> in the entrance test.{' '}
            {letter.admittedToChoice ? (
              <>
                We are pleased to offer you provisional admission to study <b>{letter.programme}</b> in the {letter.college}.
              </>
            ) : (
              <>
                The cut-off for {letter.firstChoice} was {letter.cutoff}/10, so we cannot offer you that course. We are pleased instead to offer you
                provisional admission to study <b>{letter.programme}</b> in the {letter.college}.
              </>
            )}
          </p>
          <p className="mt-2 text-sm leading-relaxed">
            The programme runs for {letter.years} years. Pay your acceptance fee on the portal and complete clearance at the eight listed offices.
            Week one is orientation; lectures begin on day {FRESHER_LECTURES_START} regardless.
          </p>
          <p className="mt-4 text-sm">Congratulations,</p>
          <p className="text-sm italic">The Registrar (fictional)</p>
        </article>
        <p className="text-center text-sm text-muted">
          Entrance test attempts: <b className="text-ink">{attempt}</b> in this application · <b className="text-ink">{testsTaken}</b> in total on this phone
        </p>
        {!letter.admittedToChoice && (
          <button
            onClick={() => {
              setAttempt(attempt + 1);
              setAnswers(Array.from({ length: questions.length }, () => null));
              setQIndex(0);
              setStep('test');
            }}
            className={BTN_GHOST}
          >
            Retake the test for {letter.firstChoice}
          </button>
        )}
        <div className={STICKY}>
          <button onClick={() => setStep('ambition')} className={`${BTN_PRIMARY} flex-1`}>
            {letter.admittedToChoice ? 'Accept the offer' : `Accept ${letter.programme} instead`}
          </button>
        </div>
        <p className="text-center text-sm text-muted">Accepting adds you to the Freshers group chat.</p>
      </>,
    );
  }

  return shell(
    <>
      <h2 className="text-2xl font-bold">What is your ambition?</h2>
      <p className="text-sm text-muted">It sets your milestones each year and how your story ends.</p>
      <div className="flex flex-col gap-2">
        {AMBITIONS.map((a) => (
          <button key={a.id} onClick={() => setAmbition(a.id)} className={`flex flex-col items-start rounded-xl border p-3 text-left ${ambition === a.id ? 'border-sun bg-sun/10' : 'border-white/15'}`}>
            <span className="font-bold">{a.name}</span>
            <span className="text-sm text-muted">{a.blurb}</span>
          </button>
        ))}
      </div>
      <div className={STICKY}>
        <button onClick={begin} className={`${BTN_PRIMARY} flex-1`}>
          Move into the hostel
        </button>
      </div>
    </>,
  );
}
