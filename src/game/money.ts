// Money: fees per session, family transfers, allowance, spending, and the
// school portal (payments that succeed, fail, or debit without recording).
import { getProgramme } from '../content/courses';
import {
  ALLOWANCE_LATE_DAYS,
  BACKGROUNDS,
  BROKE_BELOW,
  DATA_WEEKLY,
  FEES,
  FEE_DUE_DAY,
  FRESHER_REGISTRATION_DEADLINE,
  LATE_REGISTRATION_CLOSE,
  PORTAL,
  REGISTRATION_DEADLINE,
} from './config';
import { modifiers } from './campus';
import { log, produce } from './draft';
import { naira } from './format';
import type { Rng } from './rng';
import { stamp } from './time';
import type { Availability, FeeId, FeeState, GameState, PortalOutcome } from './types';

// ---------- fees ----------

const FEE_LABELS: Record<FeeId, string> = {
  acceptance: 'Acceptance fee',
  school1: 'School fees (1st instalment)',
  school2: 'School fees (2nd instalment)',
  dues: 'Departmental dues',
  hostel: 'Hostel fee',
  late_reg: 'Late registration fee',
};

/** Fees for one session. Competitive courses pay more. */
export function sessionFees(programmeId: string, firstYear: boolean, campusWeekFactor = 1): FeeState[] {
  const tier = getProgramme(programmeId).competitive ? 1 : 0;
  const fee = (id: FeeId, amount: number, dueSemester: 1 | 2, dueDay: number): FeeState => ({
    id,
    label: FEE_LABELS[id],
    amount: Math.round(amount * campusWeekFactor),
    paid: false,
    dueSemester,
    dueDay,
  });
  const out: FeeState[] = [];
  if (firstYear) out.push(fee('acceptance', FEES.acceptance[tier], 1, 5));
  const school = FEES.school[tier];
  out.push(fee('school1', school / 2, 1, FEE_DUE_DAY));
  out.push(fee('school2', school / 2, 2, FEE_DUE_DAY));
  out.push(fee('dues', FEES.dues[tier], 1, FEE_DUE_DAY));
  out.push(fee('hostel', FEES.hostel[tier], 1, FEE_DUE_DAY));
  return out;
}

export function getFee(d: GameState, id: FeeId): FeeState | undefined {
  return d.finance.fees.find((f) => f.id === id);
}

export function feePaid(d: GameState, id: FeeId): boolean {
  return getFee(d, id)?.paid ?? false;
}

/** Fees that are due by the end of this semester and not yet paid. */
export function feesDueNow(d: GameState): FeeState[] {
  return d.finance.fees.filter((f) => !f.paid && f.dueSemester <= d.clock.semester);
}

function daysToDeadline(d: GameState, dueSemester: number, dueDay: number): number {
  if (dueSemester !== d.clock.semester) return dueSemester > d.clock.semester ? 99 : -99;
  return dueDay - d.clock.day;
}

// ---------- spending ----------

/** Takes money if there is enough. Returns false (and changes nothing) if not. */
export function spend(d: GameState, amount: number): boolean {
  if (amount <= 0) return true;
  if (d.money < amount) return false;
  d.money -= amount;
  d.finance.spent += amount;
  trackMoney(d);
  return true;
}

export function earn(d: GameState, amount: number): void {
  if (amount <= 0) return;
  d.money += amount;
  d.finance.earned += amount;
  trackMoney(d);
}

/** Changes money by an effect amount (never below zero). */
export function addMoney(d: GameState, amount: number): void {
  if (amount >= 0) earn(d, amount);
  else {
    const take = Math.min(d.money, -amount);
    d.money -= take;
    d.finance.spent += take;
    trackMoney(d);
  }
}

export function trackMoney(d: GameState): void {
  const s = d.stats;
  s.minMoney = Math.min(s.minMoney, d.money);
  s.maxMoney = Math.max(s.maxMoney, d.money);
  const broke = d.money < BROKE_BELOW;
  if (broke && !s.wasBroke) s.brokeTimes += 1;
  s.wasBroke = broke;
}

// ---------- family money ----------

/** Start of a semester: the family sends the share of the fees due this semester. */
export function sendFeeMoney(d: GameState): void {
  const share = BACKGROUNDS[d.player.background].feeShare;
  const due = d.finance.fees.filter((f) => !f.paid && f.dueSemester === d.clock.semester && f.id !== 'late_reg');
  const total = Math.round(due.reduce((s, f) => s + f.amount, 0) * share);
  if (total <= 0) return;
  earn(d, total);
  const note = share < 1 ? ` They could only manage ${Math.round(share * 100)}%, so the rest is on you.` : '';
  log(d, `Your people sent ${naira(total)} for fees. Pay on the portal before it grows legs.${note}`);
}

/** Allowance day: it lands now, or late. */
export function allowanceDay(d: GameState, r: Rng): void {
  const bg = BACKGROUNDS[d.player.background];
  if (r.chance(bg.lateChance)) {
    const days = r.int(ALLOWANCE_LATE_DAYS[0], ALLOWANCE_LATE_DAYS[1]);
    d.finance.lateAllowance.push({ dayCount: d.clock.dayCount + days, amount: bg.allowance });
    log(d, `Allowance never land. Your people said "next ${days === 1 ? 'tomorrow' : `${days} days`}".`);
    return;
  }
  earn(d, bg.allowance);
  log(d, `Allowance don land! +${naira(bg.allowance)}`);
}

export function landLateAllowance(d: GameState): void {
  const due = d.finance.lateAllowance.filter((a) => a.dayCount <= d.clock.dayCount);
  if (!due.length) return;
  d.finance.lateAllowance = d.finance.lateAllowance.filter((a) => a.dayCount > d.clock.dayCount);
  const total = due.reduce((s, a) => s + a.amount, 0);
  earn(d, total);
  log(d, `The late allowance finally landed: +${naira(total)}. Better late than never.`);
}

/** Data for the phone, once a week (skipped if there is no money). */
export function weeklyData(d: GameState): void {
  if (spend(d, DATA_WEEKLY)) log(d, `Data subscription renewed: -${naira(DATA_WEEKLY)}.`);
  else log(d, 'No money for data this week. You are on free mode and vibes.');
}

// ---------- the portal ----------

function portalRisk(d: GameState, dueSemester: number, dueDay: number): { down: number; unrecorded: number } {
  const days = daysToDeadline(d, dueSemester, dueDay);
  const near = days >= 0 && days <= PORTAL.nearDeadlineDays;
  const extra = modifiers(d).portalDown ?? 0;
  return {
    down: PORTAL.down + (near ? PORTAL.nearDeadlineDown : 0) + extra,
    unrecorded: PORTAL.unrecorded + (near ? PORTAL.nearDeadlineUnrecorded : 0),
  };
}

function portalSays(d: GameState, outcome: PortalOutcome, text: string): PortalOutcome {
  d.finance.lastPortal = { outcome, text, at: stamp(d.clock) };
  log(d, text);
  return outcome;
}

export function portalIsDown(d: GameState): boolean {
  return d.finance.portalDownUntil > stamp(d.clock);
}

export function canPay(d: GameState, id: FeeId): Availability {
  const fee = getFee(d, id);
  if (!fee) return { ok: false, reason: 'No such fee this session' };
  if (fee.paid) return { ok: false, reason: 'Already paid' };
  if (d.finance.debits.some((x) => x.feeId === id)) return { ok: false, reason: 'Waiting for the Bursary to confirm your last payment' };
  if (fee.dueSemester > d.clock.semester) return { ok: false, reason: 'Not open until next semester' };
  if (d.money < fee.amount) return { ok: false, reason: `You need ${naira(fee.amount)}` };
  return { ok: true };
}

export function portalPayMut(d: GameState, r: Rng, id: FeeId): PortalOutcome {
  const ok = canPay(d, id);
  if (!ok.ok) return portalSays(d, 'refused', ok.reason);
  if (portalIsDown(d)) return portalSays(d, 'down', 'The portal is still down. Try again in a while.');
  const fee = getFee(d, id)!;
  const risk = portalRisk(d, fee.dueSemester, fee.dueDay);
  const roll = r.next();
  if (roll < risk.down) {
    d.finance.portalDownUntil = stamp(d.clock) + 1;
    return portalSays(d, 'down', '"Service temporarily unavailable." The portal is down. Try again later.');
  }
  spend(d, fee.amount);
  if (roll < risk.down + risk.unrecorded) {
    d.finance.debits.push({ id: `debit-${d.clock.dayCount}-${id}`, feeId: id, amount: fee.amount, visits: 0 });
    return portalSays(
      d,
      'unrecorded',
      `Your bank sent a debit alert for ${naira(fee.amount)}, but the portal still says "${fee.label}: NOT PAID". Take the alert to the Bursary.`,
    );
  }
  fee.paid = true;
  onFeePaid(d, id);
  return portalSays(d, 'ok', `${fee.label} paid: ${naira(fee.amount)}. Receipt is ready to print.`);
}

/** What a confirmed payment unlocks straight away. */
function onFeePaid(d: GameState, id: FeeId): void {
  if (id === 'acceptance') d.flags.acceptance_paid = d.clock.dayCount || 1;
  // Returning students get their new room as soon as the hostel fee is in.
  if (id === 'hostel' && !d.clearance.active && d.room.temporary) {
    d.room.temporary = false;
    log(d, `Hostel fee confirmed. Your bed space in room ${d.room.roomNo} is now yours.`);
  }
}

/** One Bursary visit with the bank alert. Returns true if the payment is now recorded. */
export function resolveDebitMut(d: GameState, r: Rng, debitId: string, bonus = 0): boolean {
  const debit = d.finance.debits.find((x) => x.id === debitId);
  if (!debit) return false;
  debit.visits += 1;
  if (!r.chance(PORTAL.resolveChance + bonus)) {
    log(d, 'The Bursary officer looked at your alert and said "come back tomorrow, the system is slow".');
    return false;
  }
  d.finance.debits = d.finance.debits.filter((x) => x.id !== debitId);
  const fee = getFee(d, debit.feeId);
  if (fee) {
    fee.paid = true;
    onFeePaid(d, fee.id);
  }
  log(d, `The Bursary confirmed your ${fee?.label.toLowerCase() ?? 'payment'}. It now shows PAID.`);
  return true;
}

// ---------- course registration ----------

export function registrationDeadline(d: GameState): number {
  return d.clock.year === 1 && d.clock.semester === 1 && d.academics.level === 1
    ? FRESHER_REGISTRATION_DEADLINE
    : REGISTRATION_DEADLINE;
}

export function clearanceFormDone(d: GameState): boolean {
  return Object.values(d.clearance.signed).every(Boolean);
}

export function canRegister(d: GameState): Availability {
  if (d.academics.registered) return { ok: false, reason: 'Already registered' };
  if (d.clearance.active && !clearanceFormDone(d)) return { ok: false, reason: 'Finish your clearance form first' };
  if (d.clock.day > LATE_REGISTRATION_CLOSE) return { ok: false, reason: 'Registration has closed for this semester' };
  if (d.clock.day > registrationDeadline(d) && !feePaid(d, 'late_reg')) {
    return { ok: false, reason: 'Pay the late registration fee first' };
  }
  return { ok: true };
}

/** After the deadline the late fee appears on the portal. */
export function addLateFeeIfDue(d: GameState): void {
  if (d.academics.registered || getFee(d, 'late_reg')) return;
  if (d.clock.day <= registrationDeadline(d)) return;
  d.finance.fees.push({
    id: 'late_reg',
    label: FEE_LABELS.late_reg,
    amount: FEES.lateRegistration,
    paid: false,
    dueSemester: d.clock.semester,
    dueDay: LATE_REGISTRATION_CLOSE,
  });
  log(d, `Course registration deadline has passed. Late registration now costs ${naira(FEES.lateRegistration)}.`);
}

export function portalRegisterMut(d: GameState, r: Rng): PortalOutcome {
  const ok = canRegister(d);
  if (!ok.ok) return portalSays(d, 'refused', ok.reason);
  if (portalIsDown(d)) return portalSays(d, 'down', 'The portal is still down. Try again in a while.');
  const risk = portalRisk(d, d.clock.semester, registrationDeadline(d));
  if (r.chance(risk.down)) {
    d.finance.portalDownUntil = stamp(d.clock) + 1;
    return portalSays(d, 'down', 'The portal froze on "Submitting...". Nothing was saved. Try again later.');
  }
  d.academics.registered = true;
  d.academics.lateRegistration = d.clock.day > registrationDeadline(d);
  return portalSays(d, 'ok', `Courses registered for this semester. Print your course form.`);
}

/** "No fees, no exam": the instalments due by this semester must be paid. */
export function examFeeBlock(d: GameState): string | null {
  const unpaid = d.finance.fees.filter(
    (f) => !f.paid && (f.id === 'school1' || (f.id === 'school2' && d.clock.semester === 2)),
  );
  return unpaid.length ? 'No fees, no exam: pay your school fees on the portal' : null;
}

// ---------- public, pure versions ----------

export function portalPay(state: GameState, id: FeeId): GameState {
  return produce(state, (d, r) => {
    portalPayMut(d, r, id);
  });
}

export function portalRegister(state: GameState): GameState {
  return produce(state, (d, r) => {
    portalRegisterMut(d, r);
  });
}
