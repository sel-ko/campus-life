// Your phone: it needs charging and it needs data. A dead phone opens no
// apps; without data you cannot log in to the portal or chat (buying data
// with the bank's USSD code still works). Family and bank alerts arrive here.
import { PHONE } from './config';
import { log } from './draft';
import { naira } from './format';
import { ensureThread, postMut } from './chat';
import type { Rng } from './rng';
import type { GameState } from './types';

/** Why the phone cannot be used for this now (null when it can). */
export function phoneProblem(d: GameState, needsData = true): string | null {
  const p = d.phone;
  if (!p) return null;
  if (p.battery <= 0) return 'Your phone is dead. Charge it first';
  if (needsData && p.data <= 0) return 'No data. Buy a data bundle first';
  return null;
}

/** Each part of the day: the battery runs down and apps eat a little data. */
export function drainPhoneMut(d: GameState): void {
  const p = d.phone;
  if (!p || p.battery <= 0) return;
  p.battery = Math.max(0, p.battery - PHONE.drainPerSlot);
  p.data = Math.max(0, p.data - PHONE.idleData);
  if (p.battery === 0) log(d, 'Your phone just died. Charge it before you need the portal.');
}

/** Using the phone online: battery and data. */
export function usePhoneMut(d: GameState, data: number): void {
  const p = d.phone;
  if (!p) return;
  p.battery = Math.max(0, p.battery - 1);
  p.data = Math.max(0, p.data - data);
}

/** Charging for a while (an hour at the socket by default). */
export function chargeMut(d: GameState, hours = 1): void {
  const p = d.phone;
  if (!p) return;
  p.battery = Math.min(100, p.battery + PHONE.chargePerHour * hours);
  log(d, `You charged your phone: ${Math.round(p.battery)}%.`);
}

/** A night's sleep in a room with light charges the phone fully. */
export function overnightChargeMut(d: GameState): void {
  if (d.phone && d.room.light) d.phone.battery = 100;
}

/** Data bundle, bought with the bank's USSD code (no data needed). */
export function canBuyData(d: GameState): { ok: boolean; reason?: string } {
  const problem = phoneProblem(d, false);
  if (problem) return { ok: false, reason: problem };
  if (d.money < PHONE.bundlePrice) return { ok: false, reason: `You need ${naira(PHONE.bundlePrice)}` };
  return { ok: true };
}

export function addDataMut(d: GameState, mb = PHONE.bundle): void {
  if (d.phone) d.phone.data += mb;
}

// ---------- family and bank alerts ----------

function familyThread(d: GameState) {
  return ensureThread(d, 'family', 'Family ❤️', 'group', ['me', 'mum', 'dad']);
}

function bankThread(d: GameState) {
  return ensureThread(d, 'bank', 'Bank alerts', 'direct', ['me', 'bank']);
}

/** A credit alert from the bank, as an SMS. */
export function creditAlertMut(d: GameState, amount: number, from: string, purpose: string): void {
  bankThread(d);
  const acct = `**${(d.player.matric.replace(/\D/g, '') + '4521').slice(-4)}`;
  postMut(d, 'bank', 'system', `Credit Alert! Acct: ${acct} · Amt: ${naira(amount)} · Desc: TRF FROM ${from.toUpperCase()} - ${purpose.toUpperCase()} · Bal: ${naira(d.money)}`);
}

/** A debit alert (fees paid). */
export function debitAlertMut(d: GameState, amount: number, purpose: string): void {
  bankThread(d);
  postMut(d, 'bank', 'system', `Debit Alert! Amt: ${naira(amount)} · Desc: ${purpose.toUpperCase()} · Bal: ${naira(d.money)}`);
}

/** Dad sends the school fees. */
export function feesFromHomeMut(d: GameState, amount: number, partial: boolean): void {
  familyThread(d);
  creditAlertMut(d, amount, 'Dad', 'school fees');
  const first = d.clock.year === 1 && d.clock.semester === 1;
  postMut(
    d,
    'family',
    'dad',
    first
      ? `I have sent ${naira(amount)} for your school fees, acceptance and hostel. Pay everything on the portal sharp sharp and send me the receipt. Don't touch it for anything else o!${partial ? ' It is not complete, manage it, I will add more later.' : ''}`
      : `School fees for this semester: ${naira(amount)}. Pay it on time.${partial ? ' Manage the rest, things are hard.' : ''}`,
  );
  if (first) postMut(d, 'family', 'mum', 'My baby! Welcome to university. Eat well, read your books, and don\'t follow bad friends. I am praying for you 🙏🏾');
}

/** Mum sends the upkeep money. */
export function upkeepFromHomeMut(d: GameState, amount: number): void {
  familyThread(d);
  creditAlertMut(d, amount, 'Mum', 'upkeep');
  postMut(d, 'family', 'mum', `I have sent ${naira(amount)} for your upkeep. Make it last, and buy food first before anything.`);
}

// ---------- asking home for money ----------

export type AskReason = 'fees' | 'feeding' | 'books' | 'emergency';

export const ASK_REASONS: Record<AskReason, { label: string; emoji: string }> = {
  fees: { label: 'School fees, dues or hostel', emoji: '🏫' },
  feeding: { label: 'Feeding money', emoji: '🍲' },
  books: { label: 'Books and handouts', emoji: '📚' },
  emergency: { label: 'An emergency', emoji: '🚨' },
};

/** What the fees still owed this semester come to. */
export function feesOwed(d: GameState): number {
  return d.finance.fees.filter((f) => !f.paid && f.dueSemester <= d.clock.semester).reduce((s, f) => s + f.amount, 0);
}

/** Can you call home now? Once a day each parent, and the phone must work. */
export function canAsk(d: GameState, who: 'mum' | 'dad', reason: AskReason): { ok: boolean; reason?: string } {
  if (!d.phone || d.phone.battery <= 0) return { ok: false, reason: 'Your phone is dead' };
  if (d.flags[`ask_${who}_${d.clock.dayCount}`]) return { ok: false, reason: `You already called ${who === 'mum' ? 'Mummy' : 'Daddy'} today` };
  if (reason === 'fees' && feesOwed(d) <= 0) return { ok: false, reason: 'You owe no fees right now' };
  return { ok: true };
}

/**
 * Call Mum or Dad and ask. Fees are always found in the end (less the more
 * often you ask, for a broke family); other requests depend on the family and
 * on how often you have asked this semester.
 */
export function askParentMut(d: GameState, r: Rng, who: 'mum' | 'dad', reason: AskReason): void {
  const ok = canAsk(d, who, reason);
  if (!ok.ok) return;
  d.flags[`ask_${who}_${d.clock.dayCount}`] = 1;
  const semKey = `asks_${d.clock.year}_${d.clock.semester}`;
  const asks = (d.flags[semKey] ?? 0) + 1;
  d.flags[semKey] = asks;
  d.phone.battery = Math.max(0, d.phone.battery - 2);
  ensureThread(d, 'family', 'Family ❤️', 'group', ['me', 'mum', 'dad']);
  const bg = d.player.background;
  const base = bg === 'broke' ? 0.45 : bg === 'average' ? 0.7 : 0.9;
  const name = who === 'mum' ? 'Mummy' : 'Daddy';
  postMut(d, 'family', 'me', `${name}, please I need money for ${ASK_REASONS[reason].label.toLowerCase()}.`);
  let amount = 0;
  if (reason === 'fees') {
    const owed = feesOwed(d);
    amount = bg === 'broke' && asks > 2 ? Math.round(owed * 0.6) : owed;
  } else if (r.chance(Math.max(0.1, base - (asks - 1) * 0.12))) {
    const table = { feeding: [4000, 8000], books: [2000, 4000], emergency: [6000, 12000] }[reason];
    amount = Math.round(r.int(table[0]!, table[1]!) / 500) * 500;
    if (bg === 'comfortable') amount = Math.round(amount * 1.5);
  }
  if (amount <= 0) {
    postMut(d, 'family', who, r.pick(['Money is tight this month. Manage what you have, my child.', 'Did I not send money last week? What happened to it?', 'Let me see what I can do. Not now.']));
    log(d, `${name} could not send anything this time.`);
    return;
  }
  d.money += amount;
  d.finance.earned += amount;
  postMut(d, 'family', who, reason === 'fees' ? `I have sent ${naira(amount)}. Pay it straight to the school, no detour!` : r.pick([`Sent ${naira(amount)}. Use it wisely.`, `Here is ${naira(amount)}. Eat well and read your books.`, `${naira(amount)} is on its way. Don't tell your siblings.`]));
  creditAlertMut(d, amount, name === 'Mummy' ? 'Mum' : 'Dad', ASK_REASONS[reason].label);
  log(d, `${name} sent ${naira(amount)}.`);
}
