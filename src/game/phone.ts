// Your phone: it needs charging and it needs data. A dead phone opens no
// apps; without data you cannot log in to the portal or chat (buying data
// with the bank's USSD code still works). Family and bank alerts arrive here.
import { PHONE } from './config';
import { log } from './draft';
import { naira } from './format';
import { ensureThread, postMut } from './chat';
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
