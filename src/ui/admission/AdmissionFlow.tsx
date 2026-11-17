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
import { DISCLAIMER, TITLE_CARD, TITLE_PRIMARY, TITLE_SECONDARY, TitleLayout } from './TitleScreen';
import { BTN_GHOST, BTN_PRIMARY, CARD } from '../theme';

/** A row of buttons that stays at the bottom of the panel while the form scrolls. */
const STICKY = 'sticky bottom-0 -mx-4 mt-auto flex shrink-0 gap-2 border-t border-white/10 bg-[#14202B] px-4 py-2.5';

/** Space around the form panel, clear of the notch and the home bar. */
const GAP_TOP = 'max(0.75rem, env(safe-area-inset-top))';
const GAP_BOTTOM = 'max(0.75rem, env(safe-area-inset-bottom))';

type Step ='welcome' | 'avatar' | 'details' | 'course' | 'test' | 'letter' | 'ambition';
/** The steps after the welcome card, for the progress bar. */
const STEPS: Step[] = ['avatar', 'details', 'course', 'test', 'letter', 'ambition'];
const STEP_NAMES: Record<Step, string> = {
  welcome: '',
  avatar: 'Your look',
  details: 'Your details',
  course: 'Course',
  test: 'Entrance test',
  letter: 'Admission',
  ambition: 'Ambition',
};
const BACKGROUND_IDS: BackgroundId[] = ['broke', 'average', 'comfortable'];

export function AdmissionFlow({ onLeaderboard, onStepChange }: { onLeaderboard: () => void; onStepChange?: (welcome: boolean) => void }) {
  const start = useGameStore((s) => s.start);
  const resetNotice = useGameStore((s) => s.resetNotice);
  const dismissResetNotice = useGameStore((s) => s.dismissResetNotice);
  const [step, setStep] = useState<Step>('welcome');
  // The campus behind only moves on the welcome card (phones need the power for the form).
  useEffect(() => onStepChange?.(step === 'welcome'), [step, onStepChange]);
  // "Look around" hides the menu so the whole campus shows.
  const [menuHidden, setMenuHidden] = useState(false);
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

  // The form panel. It scrolls inside itself with the buttons pinned to its
  // bottom (iPhones). `fill` keeps it full height without scrolling, for the
  // character creator, whose own option list scrolls instead.
  const shell = (children: React.ReactNode, fill = false) => {
    const n = STEPS.indexOf(step);
    return (
      <main
        className={`pointer-events-auto mx-auto flex w-full max-w-md flex-col gap-3 rounded-3xl border border-white/12 bg-[#14202B]/95 px-4 pt-3 shadow-2xl shadow-black/50 backdrop-blur-xl ${fill ? 'overflow-hidden' : 'touch-pan-y overflow-y-auto overscroll-contain'}`}
        style={{ marginTop: GAP_TOP, marginBottom: GAP_BOTTOM, [fill ? 'height' : 'maxHeight']: `calc(100dvh - ${GAP_TOP} - ${GAP_BOTTOM})` }}
      >
        <div className="flex shrink-0 items-center gap-2" aria-label={`Step ${n + 1} of ${STEPS.length}: ${STEP_NAMES[step]}`}>
          <div className="flex flex-1 gap-1" aria-hidden="true">
            {STEPS.map((x, i) => (
              <span key={x} className={`h-1 flex-1 rounded-full ${i <= n ? 'bg-sun' : 'bg-white/12'}`} />
            ))}
          </div>
          <span className="text-[10px] font-semibold tracking-wide text-muted uppercase">
            {n + 1}/{STEPS.length} · {STEP_NAMES[step]}
          </span>
        </div>
        {children}
        {!fill && <p className="pt-1 pb-4 text-center text-[10px] text-white/40">{DISCLAIMER}</p>}
      </main>
    );
  };

  if (step === 'welcome') {
    if (menuHidden) {
      return (
        <div className="pointer-events-none flex min-h-full flex-col items-center justify-end pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button onClick={() => setMenuHidden(false)} className="pointer-events-auto flex min-h-10 items-center gap-1.5 rounded-full border border-white/15 bg-[#0F1A24]/80 px-5 text-sm font-semibold shadow-xl backdrop-blur-xl">
            <span aria-hidden="true">☰</span> Back to the menu
          </button>
        </div>
      );
    }
    return (
      <TitleLayout>
        <section className={TITLE_CARD}>
          {resetNotice && (
            <div role="status" className="flex items-center justify-between gap-2 rounded-xl border border-sun/50 bg-sun/10 px-3 py-1.5 text-xs">
              <p className="font-semibold text-sun">The game has been rebuilt</p>
              <button onClick={dismissResetNotice} className="min-h-9 px-1 font-semibold underline">
                Okay
              </button>
            </div>
          )}
          <p className="text-center text-sm leading-snug text-white/85">Get admitted, survive fresher year and graduate your way.</p>
          <button onClick={() => setStep('avatar')} className={TITLE_PRIMARY}>
            Apply for admission <span aria-hidden="true">→</span>
          </button>
          <div className="flex gap-2">
            {onlineConfigured() && (
              <button onClick={onLeaderboard} className={TITLE_SECONDARY}>
                <span aria-hidden="true">🏆</span> Leaderboard
              </button>
            )}
            <button onClick={() => setMenuHidden(true)} className={TITLE_SECONDARY}>
              <span aria-hidden="true">🧭</span> Look around
            </button>
          </div>
          <p className="text-center text-[10px] leading-tight text-white/45">{DISCLAIMER}</p>
        </section>
      </TitleLayout>
    );
  }

  if (step === 'avatar') {
    return shell(
      <>
        <h2 className="shrink-0 text-xl font-extrabold">Create your student</h2>
        <CharacterCreator
          gender={gender}
          look={look}
          onGender={(g) => {
            setGender(g);
            setLook({ ...baseLook(g), skin: look.skin });
          }}
          onLook={setLook}
        />
        <div className={STICKY}>
          <button onClick={() => setStep('welcome')} className={BTN_GHOST}>
            Back
          </button>
          <button onClick={() => setStep('details')} className={`${BTN_PRIMARY} flex-1`}>
            Next: your details
          </button>
        </div>
      </>,
      true,
    );
  }

  if (step === 'details') {
    const ready = name.trim().length > 0;
    return shell(
      <>
        <h2 className="text-xl font-extrabold">Your details</h2>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Your name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            placeholder="What do people call you?"
            className="min-h-11 rounded-lg border border-line bg-panel px-3 text-ink placeholder:text-muted/70"
          />
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-semibold">Family background</legend>
          {BACKGROUND_IDS.map((id) => {
            const b = BACKGROUNDS[id];
            return (
              <label key={id} className={`flex min-h-11 cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 ${background === id ? 'border-sun bg-sun/8' : 'border-white/12 bg-white/4'}`}>
                <input type="radio" name="bg" checked={background === id} onChange={() => setBackground(id)} className="mt-0.5 size-4 shrink-0 accent-sun" />
                <span className="flex flex-col">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold">{b.label}</span>
                    <span className="text-base font-extrabold text-sun">{naira(b.startMoney)}</span>
                  </span>
                  <span className="text-xs leading-snug text-muted">
                    Pocket money to start. {naira(b.allowance)} upkeep from Mum twice a semester; Dad sends {b.feeShare < 1 ? `${Math.round(b.feeShare * 100)}% of` : 'all'} the school fees. {b.blurb}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
        {!ready && <p className="-mb-2 text-center text-xs text-sun">Type your name above to continue</p>}
        <div className={STICKY}>
          <button onClick={() => setStep('avatar')} className={BTN_GHOST}>
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
        <h2 className="text-xl font-extrabold">Choose your course</h2>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Course</span>
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
        <div className={`${CARD} flex flex-col gap-1 p-3 text-sm`}>
          <p className="text-base font-bold">{p.name}</p>
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
          <h2 className="text-lg font-extrabold">Entrance test {attempt > 1 && <span className="text-sm font-semibold text-sun">· attempt {attempt}</span>}</h2>
          <span className="text-sm text-muted">
            {qIndex + 1} of {questions.length}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-sun" style={{ width: `${((qIndex + 1) / questions.length) * 100}%` }} />
        </div>
        <p className="text-base font-semibold">{q.q}</p>
        <div className="flex flex-col gap-2">
          {q.options.map((opt, i) => (
            <button
              key={opt}
              onClick={() => setAnswers((a) => a.map((x, j) => (j === qIndex ? i : x)))}
              className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm ${chosen === i ? 'border-sun bg-sun/15 font-semibold' : 'border-white/15 bg-white/5'}`}
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
          className={`${BTN_PRIMARY} sticky bottom-3 shrink-0`}
        >
          {qIndex < questions.length - 1 ? 'Next question' : 'Submit the test'}
        </button>
      </>,
    );
  }

  if (step === 'letter') {
    return shell(
      <>
        <article className="rounded-2xl bg-[#FBF7EC] p-4 font-serif text-[#1E2A33] shadow-xl">
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
        <p className="text-center text-xs text-muted">
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
        <p className="text-center text-xs text-muted">Accepting adds you to the Freshers group chat.</p>
      </>,
    );
  }

  return shell(
    <>
      <h2 className="text-xl font-extrabold">What is your ambition?</h2>
      <p className="text-sm text-muted">It sets your milestones each year and how your story ends.</p>
      <div className="flex flex-col gap-2">
        {AMBITIONS.map((a) => (
          <button key={a.id} onClick={() => setAmbition(a.id)} className={`flex flex-col items-start rounded-xl border p-2.5 text-left ${ambition === a.id ? 'border-sun bg-sun/10' : 'border-white/15'}`}>
            <span className="text-sm font-bold">{a.name}</span>
            <span className="text-xs leading-snug text-muted">{a.blurb}</span>
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
