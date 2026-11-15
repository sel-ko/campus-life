// Shared formatting for money and effects (Nigerian English, naira).
import type { Effects } from './types';

/** ₦12,500 */
export function naira(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}₦${Math.round(Math.abs(amount)).toLocaleString('en-NG')}`;
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

/** Short, human lines for an effect, like "Energy -10", "₦-700". */
export function describeEffects(e: Effects): string[] {
  const out: string[] = [];
  if (e.money) out.push(e.money > 0 ? `+${naira(e.money)}` : `-${naira(-e.money)}`);
  if (e.energy) out.push(`Energy ${signed(e.energy)}`);
  if (e.hunger) out.push(e.hunger < 0 ? `Hunger ${signed(e.hunger)}` : `Hunger ${signed(e.hunger)}`);
  if (e.stress) out.push(`Stress ${signed(e.stress)}`);
  if (e.knowledge) out.push(`Knowledge ${signed(e.knowledge)}`);
  if (e.goodwill) out.push(`Lecturers ${e.goodwill > 0 ? 'like you more' : 'like you less'}`);
  if (e.roommates) out.push(`Roommates ${e.roommates > 0 ? 'warmer' : 'colder'}`);
  if (e.loseSlots) out.push(`Lose ${e.loseSlots} slot${e.loseSlots > 1 ? 's' : ''}`);
  return out;
}

export function plural(n: number, word: string, many = `${word}s`): string {
  return `${n} ${n === 1 ? word : many}`;
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}
