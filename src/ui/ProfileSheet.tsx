// The student profile: identity, academic standing, this semester's courses
// with attendance and knowledge, an attendance heatmap, needs, goals, money
// and your look. Read-only except the look.
import { getAmbition } from '../content/ambitions';
import { getCollege, getProgramme } from '../content/courses';
import { getPerson, TRAIT_LABELS } from '../content/people';
import { getPlace, placeName } from '../content/places';
import { classOfDegree, currentCgpa } from '../game/academics';
import { BACKGROUNDS, SEMESTER_DAYS } from '../game/config';
import { naira } from '../game/format';
import { slotName } from '../game/time';
import type { GameState } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { presetLook } from '../world/characters/look';
import { CloseIcon } from './icons';
import { Portrait } from './Portrait';
import { NeedsPanel } from './lifeUi';

const H = 'mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase';
const BOX = 'rounded-2xl border border-white/10 bg-white/5 p-3';


/** Days 1-14 down, slots across... drawn as a grid: one row per daytime slot, one column per day. */
function Heatmap({ game }: { game: GameState }) {
  const now = game.clock.day * 4 + game.clock.slot;
  const cells: Array<{ day: number; slot: number; state: 'attended' | 'missed' | 'cancelled' | 'upcoming' | 'exam' | 'none'; label: string }> = [];
  for (const slot of [0, 1, 2]) {
    for (let day = 1; day <= SEMESTER_DAYS; day++) {
      const here = game.academics.courses.flatMap((c) => c.meetings.filter((m) => m.day === day && m.slot === slot).map((m) => ({ c, m })));
      const exam = game.academics.courses.find((c) => c.exam.day === day && c.exam.slot === slot);
      let state: (typeof cells)[number]['state'] = 'none';
      let label = '';
      if (here.length) {
        const { c, m } = here[0]!;
        label = c.code;
        if (m.status === 'cancelled') state = 'cancelled';
        else if (m.attended) state = 'attended';
        else if (day * 4 + slot < now) state = 'missed';
        else state = 'upcoming';
      } else if (exam) {
        state = 'exam';
        label = `${exam.code} exam`;
      }
      cells.push({ day, slot, state, label });
    }
  }
  const colour = { attended: 'bg-emerald-400', missed: 'bg-red-400', cancelled: 'bg-white/25', upcoming: 'border border-sky-300/70', exam: 'bg-sun', none: 'bg-white/5' };
  const held = game.academics.courses.flatMap((c) => c.meetings).filter((m) => m.status === 'scheduled' && (m.attended || m.day * 4 + m.slot < now));
  const pct = held.length ? Math.round((held.filter((m) => m.attended).length / held.length) * 100) : 100;
  return (
    <div>
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: `2.2rem repeat(${SEMESTER_DAYS}, minmax(0, 1fr))` }}>
        <span />
        {Array.from({ length: SEMESTER_DAYS }, (_, i) => (
          <span key={i} className={`text-center text-[9px] ${i + 1 === game.clock.day ? 'font-bold text-sun' : 'text-muted'}`}>
            {i + 1}
          </span>
        ))}
        {[0, 1, 2].map((slot) => (
          <Row key={slot} slot={slot} cells={cells.filter((c) => c.slot === slot)} colour={colour} />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">
        Attendance so far: <b className="text-ink">{pct}%</b> · <span className="text-emerald-300">■</span> attended <span className="text-red-300">■</span> missed{' '}
        <span className="text-white/40">■</span> cancelled <span className="text-sun">■</span> exam
      </p>
    </div>
  );
}

function Row({ slot, cells, colour }: { slot: number; cells: Array<{ day: number; state: string; label: string }>; colour: Record<string, string> }) {
  return (
    <>
      <span className="text-[10px] text-muted">{slotName(slot).slice(0, 3)}</span>
      {cells.map((c) => (
        <span key={c.day} title={c.label} className={`aspect-square rounded-[3px] ${colour[c.state]}`} />
      ))}
    </>
  );
}

export function ProfileSheet({ game }: { game: GameState }) {
  const open = useGameStore((s) => s.profileOpen);
  const setOpen = useGameStore((s) => s.setProfileOpen);
  const openPhone = useGameStore((s) => s.openPhone);
  if (!open) return null;

  const p = game.player;
  const prog = getProgramme(p.programmeId);
  const a = game.academics;
  const cgpa = currentCgpa(game);
  const passedUnits = a.transcript.flatMap((t) => t.courses).filter((c) => c.grade !== 'F').reduce((s, c) => s + c.units, 0);
  const amb = getAmbition(game.goals.ambition);
  const unpaid = game.finance.fees.filter((f) => !f.paid);

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end bg-black/50" onClick={() => setOpen(false)}>
      <section role="dialog" aria-label="Your profile" onClick={(e) => e.stopPropagation()} className="mx-auto flex max-h-[92%] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-3xl border-t border-line bg-panel px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3">
          <span className="grid size-16 place-items-center overflow-hidden rounded-full bg-[#2B4558]">
            <Portrait look={presetLook(p.characterId)} size={60} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-bold">{p.name}</h2>
            <p className="truncate text-sm text-muted">
              {p.matric} · entrance test taken {p.testAttempts ?? 1}×
            </p>
            <p className="truncate text-sm">
              {prog.name} · {a.level}00 level{a.spillover ? ' (spill-over)' : a.repeating ? ' (repeating)' : ''}
            </p>
          </div>
          <button onClick={() => setOpen(false)} className="grid min-h-11 min-w-11 place-items-center rounded-full bg-white/10" aria-label="Close">
            <CloseIcon size={20} />
          </button>
        </div>

        <section className={BOX}>
          <NeedsPanel game={game} />
        </section>

        <section className={`${BOX} grid grid-cols-3 gap-2 text-center`}>
          <div>
            <p className="text-2xl font-extrabold text-sun">{a.transcript.length ? cgpa.toFixed(2) : '—'}</p>
            <p className="text-[11px] text-muted">CGPA</p>
          </div>
          <div>
            <p className="text-sm font-bold">{a.transcript.length ? classOfDegree(cgpa) : 'No results yet'}</p>
            <p className="text-[11px] text-muted">Class so far</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold">{passedUnits}</p>
            <p className="text-[11px] text-muted">Units passed</p>
          </div>
          <p className="col-span-3 text-xs text-muted">
            {getCollege(prog.collegeId).name} · {prog.years}-year degree · session {game.clock.year}, semester {game.clock.semester}
            {a.carryovers.length ? ` · carryovers: ${a.carryovers.map((c) => c.code).join(', ')}` : ''}
            {a.probation ? ' · ON PROBATION' : ''}
          </p>
        </section>

        <section>
          <h3 className={H}>Lecture attendance this semester</h3>
          <div className={BOX}>
            <Heatmap game={game} />
          </div>
        </section>

        <section className="flex flex-wrap items-center gap-2">
          {game.clearance.active ? (
            <span className="rounded-full bg-white/8 px-3 py-1.5 text-sm text-muted">📚 Your courses open after clearance</span>
          ) : (
            <button
              onClick={() => {
                setOpen(false);
                openPhone('school');
              }}
              className="rounded-full border border-sun/60 bg-sun/10 px-3 py-1.5 text-sm font-semibold text-sun"
            >
              📚 View courses ({a.courses.length}) →
            </button>
          )}
        </section>

        <section>
          <h3 className={H}>Wants: {amb.name}</h3>
          <div className={`${BOX} text-sm`}>
            <ul className="flex flex-col gap-1">
              {amb.milestones.map((m) => {
                const st = game.goals.milestones[m.id];
                return (
                  <li key={m.id} className={st === 'done' ? 'text-emerald-300' : st === 'missed' ? 'text-red-300 line-through' : ''}>
                    {st === 'done' ? '✓' : st === 'missed' ? '✗' : '○'} {m.label}
                  </li>
                );
              })}
            </ul>
            {game.goals.position !== 'none' && <p className="mt-1 text-xs text-sun">Position: {game.goals.position.replace('_', ' ')}</p>}
            {game.goals.objectives.length > 0 && (
              <p className="mt-2 text-xs text-muted">
                This week: {game.goals.objectives.map((o) => `${o.done ? '✓' : '○'} ${o.label}`).join(' · ')}
              </p>
            )}
          </div>
        </section>

        <section>
          <h3 className={H}>Money and room</h3>
          <div className={`${BOX} text-sm`}>
            <p>
              {naira(game.money)} · {BACKGROUNDS[p.background].label} family · {unpaid.length ? `${unpaid.length} fee(s) unpaid` : 'all fees paid'}
            </p>
            <p className="text-muted">
              {placeName(game.room.placeId)}, room {game.room.roomNo}
              {game.room.temporary ? ' (temporary)' : ''} · {getPlace(game.room.placeId)?.name ? '' : ''}
              {game.room.roommates.map((id) => `${getPerson(id)?.name.split(' ')[0]} (${(getPerson(id)?.traits ?? []).map((t) => TRAIT_LABELS[t].toLowerCase()).join(', ')})`).join(' · ')}
            </p>
          </div>
        </section>

      </section>
    </div>
  );
}
