// Relationships with the recurring characters, the help they unlock
// (notes, attendance cover, loans, leaked test dates, faster service), and
// borrowing and lending.
import { getPerson } from '../content/people';
import { coverAttendanceMut, worstAttendance } from './academics';
import { dmThread, ensureThread, scriptMut } from './chat';
import { KNOWLEDGE, LOAN_DAYS, TALK_REL, UNPAID_LOAN_REL } from './config';
import { clamp, log } from './draft';
import { addRel } from './effects';
import { naira } from './format';
import { earn, spend } from './money';
import type { Rng } from './rng';
import type { Availability, GameState } from './types';

export function relOf(d: GameState, id: string): number {
  return d.people[id]?.rel ?? 0;
}

function first(name: string | undefined): string {
  return name?.replace(/^(Dr|Mr|Mrs|Prof\.|Barr\.|Engr\.|Pharm\.|Comrade|Mama) (\(Mrs\) )?/, '').split(' ')[0] ?? 'They';
}

export function canTalk(d: GameState, id: string): Availability {
  if (d.people[id]?.lastTalk === d.clock.dayCount) return { ok: false, reason: 'You already talked today' };
  return { ok: true };
}

export function talkMut(d: GameState, r: Rng, id: string): void {
  const p = (d.people[id] ??= { rel: 0, lastTalk: 0, favours: {} });
  const gain = TALK_REL + r.int(0, 2);
  p.rel = clamp(p.rel + gain, -100, 100);
  p.lastTalk = d.clock.dayCount;
  d.week.talks += 1;
  const def = getPerson(id);
  if (p.rel >= 10 && def && def.role !== 'lecturer' && def.role !== 'officer') {
    ensureThread(d, dmThread(id), def.name, 'direct', ['me', id]);
  }
  log(d, `You gisted with ${def?.name ?? 'them'}. ${p.rel >= 40 ? 'You are close now.' : p.rel >= 20 ? 'You are getting along.' : 'Small small.'}`);
}

export interface Favour {
  id: string;
  label: string;
  available: boolean;
  reason?: string;
  cost?: number;
  /** Takes a slot. */
  slot?: boolean;
}

const semKey = (d: GameState) => `${d.clock.year}-${d.clock.semester}`;
function usedThisSemester(d: GameState, id: string, favour: string): boolean {
  return d.people[id]?.favours[favour] === Number(semKey(d).replace('-', ''));
}
function markUsed(d: GameState, id: string, favour: string): void {
  const p = (d.people[id] ??= { rel: 0, lastTalk: 0, favours: {} });
  p.favours[favour] = Number(semKey(d).replace('-', ''));
}

function need(rel: number, at: number, label: string): Pick<Favour, 'available' | 'reason'> {
  return rel >= at ? { available: true } : { available: false, reason: `Get closer first (${label})` };
}

export function favoursFor(d: GameState, id: string): Favour[] {
  const def = getPerson(id);
  if (!def) return [];
  const rel = relOf(d, id);
  const out: Favour[] = [];
  const owes = d.loans.some((l) => l.personId === id && l.playerOwes);
  switch (def.role) {
    case 'course_rep': {
      const used = usedThisSemester(d, id, 'cover');
      const n = need(rel, 30, 'relationship 30');
      out.push({
        id: 'cover',
        label: 'Ask them to cover your attendance',
        ...(used ? { available: false, reason: 'Once a semester' } : !worstAttendance(d) ? { available: false, reason: 'Nothing to cover' } : n),
      });
      break;
    }
    case 'efiko': {
      out.push({ id: 'notes', label: 'Ask for their notes', ...(usedThisSemester(d, id, 'notes') ? { available: false, reason: 'Once a semester' } : need(rel, 25, 'relationship 25')) });
      out.push({ id: 'group_study', label: 'Group study together', slot: true, ...need(rel, 40, 'relationship 40') });
      break;
    }
    case 'hustle_partner':
    case 'coursemate': {
      const amount = def.role === 'hustle_partner' ? 5000 : 3000;
      out.push({
        id: 'loan',
        label: `Borrow ${naira(amount)} for a week`,
        ...(owes ? { available: false, reason: 'Pay back what you owe first' } : need(rel, 20, 'relationship 20')),
      });
      break;
    }
    case 'vendor':
      out.push({
        id: 'credit',
        label: 'Eat now, pay ₦1,000 later',
        ...(owes ? { available: false, reason: 'Pay your last credit first' } : d.needs.hunger < 30 ? { available: false, reason: 'You are not hungry' } : need(rel, 15, 'relationship 15')),
      });
      break;
    case 'love_interest':
      out.push({ id: 'date', label: 'Ask them out (₦2,000)', cost: 2000, slot: true, ...(d.money < 2000 ? { available: false, reason: 'You need ₦2,000' } : need(rel, 50, 'relationship 50')) });
      break;
    case 'senior':
      if (d.goals.ambition === 'su_president') out.push({ id: 'campaign', label: 'Plan your campaign with them', slot: true, ...need(rel, 20, 'relationship 20') });
      break;
    default:
      break;
  }
  for (const loan of d.loans.filter((l) => l.personId === id && l.playerOwes)) {
    out.push({ id: `repay:${loan.id}`, label: `Pay back ${naira(loan.amount)}`, cost: loan.amount, ...(d.money >= loan.amount ? { available: true } : { available: false, reason: `You need ${naira(loan.amount)}` }) });
  }
  return out;
}

export function doFavourMut(d: GameState, r: Rng, id: string, favour: string): void {
  const def = getPerson(id);
  const name = first(def?.name);
  if (favour.startsWith('repay:')) {
    repayLoanMut(d, favour.slice(6));
    return;
  }
  switch (favour) {
    case 'cover': {
      const c = worstAttendance(d);
      if (c) coverAttendanceMut(d, c.code);
      markUsed(d, id, 'cover');
      log(d, `${name} covered your attendance in ${c?.code}. "Don't make me regret it."`);
      break;
    }
    case 'notes': {
      const c = [...d.academics.courses].filter((x) => !x.notes).sort((a, b) => a.knowledge - b.knowledge)[0];
      if (c) {
        c.notes = true;
        c.knowledge = clamp(c.knowledge + KNOWLEDGE.notes);
      }
      markUsed(d, id, 'notes');
      log(d, `${name} lent you her ${c?.code ?? ''} notes. Colour-coded. Beautiful.`);
      break;
    }
    case 'group_study': {
      const c = [...d.academics.courses].sort((a, b) => a.knowledge - b.knowledge)[0];
      if (c) c.knowledge = clamp(c.knowledge + KNOWLEDGE.groupStudy);
      addRel(d, id, 2);
      log(d, `Group study with ${name}: ${c?.code ?? 'everything'} finally makes sense.`);
      break;
    }
    case 'loan': {
      const amount = def?.role === 'hustle_partner' ? 5000 : 3000;
      borrowMut(d, id, amount, LOAN_DAYS);
      log(d, `${name} lent you ${naira(amount)}. Pay back within ${LOAN_DAYS} days.`);
      break;
    }
    case 'credit': {
      d.needs.hunger = clamp(d.needs.hunger - 45);
      d.stats.meals += 1;
      d.loans.push({ id: `credit-${d.clock.dayCount}`, personId: id, amount: 1000, due: d.clock.dayCount + 5, playerOwes: true });
      log(d, `${name} gave you a full plate on credit. "Pay me before Friday o."`);
      break;
    }
    case 'date': {
      spend(d, 2000);
      d.needs.stress = clamp(d.needs.stress - 20);
      addRel(d, id, 8);
      log(d, `You went out with ${name}. Suya, laughter, and a long walk back. Stress gone.`);
      break;
    }
    case 'campaign':
      d.goals.campaign += 10;
      addRel(d, id, 2);
      log(d, `${name} helped you plan your campaign. Posters are being designed.`);
      break;
    default:
      break;
  }
  void r;
}

export function borrowMut(d: GameState, id: string, amount: number, days: number): void {
  earn(d, amount);
  d.loans.push({ id: `loan-${d.clock.dayCount}-${id}-${d.loans.length}`, personId: id, amount, due: d.clock.dayCount + days, playerOwes: true });
}

export function repayLoanMut(d: GameState, loanId: string): boolean {
  const loan = d.loans.find((l) => l.id === loanId && l.playerOwes);
  if (!loan || !spend(d, loan.amount)) return false;
  d.loans = d.loans.filter((l) => l.id !== loanId);
  addRel(d, loan.personId, loan.nagged ? 4 : 6);
  log(d, `You paid back ${naira(loan.amount)} to ${getPerson(loan.personId)?.name ?? 'your friend'}. Trust restored.`);
  return true;
}

/** Start of each day: overdue loans and money people owe you. */
export function loansDayMut(d: GameState, r: Rng): void {
  for (const loan of [...d.loans]) {
    if (loan.due > d.clock.dayCount) continue;
    if (loan.playerOwes) {
      if (loan.nagged) continue;
      loan.nagged = true;
      addRel(d, loan.personId, UNPAID_LOAN_REL);
      scriptMut(d, r, 'loan_reminder', { personId: loan.personId, amount: naira(loan.amount) }, 'direct');
      log(d, `${getPerson(loan.personId)?.name ?? 'Someone'} is upset: you have not paid back ${naira(loan.amount)}.`);
    } else {
      const borrower = getPerson(loan.personId)?.traits?.includes('borrower');
      d.loans = d.loans.filter((l) => l.id !== loan.id);
      if (r.chance(borrower ? 0.4 : 0.8)) {
        earn(d, loan.amount);
        addRel(d, loan.personId, 3);
        log(d, `${getPerson(loan.personId)?.name ?? 'Your friend'} paid back the ${naira(loan.amount)}.`);
      } else {
        addRel(d, loan.personId, -8);
        log(d, `${getPerson(loan.personId)?.name ?? 'Your friend'} has "forgotten" the ${naira(loan.amount)} they owe you.`);
      }
    }
  }
}

/** Friends: people (not staff) you are close to. */
export function friendsCount(d: GameState, at = 30): number {
  return Object.entries(d.people).filter(([id, p]) => {
    const role = getPerson(id)?.role;
    return p.rel >= at && role !== 'officer' && role !== 'lecturer' && role !== 'doctor';
  }).length;
}
