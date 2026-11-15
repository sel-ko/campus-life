// A new game: welcome, your details, the course you want, the entrance test,
// the admission letter and your ambition. Rules come from src/game/admission.ts.
import { useEffect, useMemo, useState } from 'react';
import { AMBITIONS } from '../../content/ambitions';
import { COLLEGES, PROGRAMMES, getCollege, getProgramme } from '../../content/courses';
import { sectionName } from '../../content/places';
import { university } from '../../content/university';
import { admissionLetter, decideAdmission, drawTest, matricNumber, scoreTest } from '../../game/admission';
import { BACKGROUNDS, FEES } from '../../game/config';
import { naira } from '../../game/format';
import type { AmbitionId, BackgroundId } from '../../game/types';
import { onlineConfigured } from '../../online/supabase';
import { useGameStore } from '../../store/gameStore';
import type { PresetId } from '../../world/characters/look';
import { CharacterChooser } from '../CharacterChooser';
import { BTN_GHOST, BTN_PRIMARY, CARD } from '../theme';

type Step = 'welcome' | 'details' | 'course' | 'test' | 'letter' | 'ambition';
const BACKGROUND_IDS: BackgroundId[] = ['broke', 'average', 'comfortable'];

export function AdmissionFlow({ onLeaderboard }: { onLeaderboard: () => void }) {
  const start = useGameStore((s) => s.start);
  const resetNotice = useGameStore((s) => s.resetNotice);
  const dismissResetNotice = useGameStore((s) => s.dismissResetNotice);
  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [characterId, setCharacterId] = useState<PresetId>('m1');
  const [background, setBackground] = useState<BackgroundId>('average');
  const [choiceId, setChoiceId] = useState('computer_science');
  const [seed] = useState(() => (Math.random() * 2 ** 32) >>> 0 || 1);
  const questions = useMemo(() => drawTest(seed), [seed]);
  const [answers, setAnswers] = useState<Array<number | null>>(() => questions.map(() => null));
  const [qIndex, setQIndex] = useState(0);
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
      characterId,
      background,
      choiceId,
      programmeId: result.programmeId,
      admissionScore: score,
      ambition,
      seed,
      startYear: year,
    });
  }

  const shell = (children: React.ReactNode) => (
    <main className="mx-auto flex min-h-full max-w-md flex-col gap-5 px-4 py-6">
      {children}
      <p className="mt-auto pt-4 text-center text-xs text-muted">Unofficial fan-made game, not affiliated with {university.shortName}.</p>
    </main>
  );

  if (step === 'welcome') {
    return shell(
      <>
        {resetNotice && (
          <div role="status" className="rounded-2xl border border-sun/50 bg-sun/10 p-4 text-sm">
            <p className="font-semibold text-sun">The game has been rebuilt</p>
            <p className="mt-1">Campus Life is now a full degree, from admission to graduation. Your old semester could not come along, so you start fresh. Sorry o!</p>
            <button onClick={dismissResetNotice} className="mt-2 min-h-11 font-semibold underline">
              Okay
            </button>
          </div>
        )}
        <header className="flex flex-col gap-2 pt-6">
          <p className="text-sm font-semibold tracking-wide text-sun">{university.fullName}</p>
          <h1 className="text-5xl font-extrabold">Campus Life</h1>
          <p className="text-muted">
            From admission to graduation: clearance queues, the portal, carryovers, roommates, hustles and the dream of a First Class.
          </p>
        </header>
        <button onClick={() => setStep('details')} className={BTN_PRIMARY}>
          Apply for admission
        </button>
        {onlineConfigured() && (
          <button onClick={onLeaderboard} className="min-h-11 self-center px-4 font-semibold text-sun underline">
            See the leaderboard
          </button>
        )}
      </>,
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
        <CharacterChooser value={characterId} onChange={setCharacterId} />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-semibold">Family background</legend>
          {BACKGROUND_IDS.map((id) => {
            const b = BACKGROUNDS[id];
            return (
              <label key={id} className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 ${background === id ? 'border-sun bg-panel' : 'border-line'}`}>
                <input type="radio" name="bg" checked={background === id} onChange={() => setBackground(id)} className="mt-1 size-5 accent-sun" />
                <span className="flex flex-col">
                  <span className="font-semibold">{b.label}</span>
                  <span className="text-sm text-muted">
                    {naira(b.startMoney)} to start, {naira(b.allowance)} allowance twice a semester. {b.blurb}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
        <div className="flex gap-2">
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
        <div className="flex gap-2">
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
          <h2 className="text-xl font-bold">Entrance test</h2>
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
          onClick={() => (qIndex < questions.length - 1 ? setQIndex(qIndex + 1) : setStep('letter'))}
          className={BTN_PRIMARY}
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
          <p className="text-center text-xs font-bold tracking-widest uppercase">{university.fullName}</p>
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
            Lectures begin on day {3} regardless.
          </p>
          <p className="mt-4 text-sm">Congratulations,</p>
          <p className="text-sm italic">The Registrar (fictional)</p>
        </article>
        <p className="text-center text-sm text-muted">You have been added to the Uni Freshers group chat.</p>
        <button onClick={() => setStep('ambition')} className={BTN_PRIMARY}>
          Accept the offer
        </button>
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
      <button onClick={begin} className={BTN_PRIMARY}>
        Resume on campus
      </button>
    </>,
  );
}
