// Small pure formatting helpers shared by the engine and the UI.
import type { Effects } from './types';

/** 1800 -> "₦1,800", -700 -> "-₦700". Written by hand so it never depends on
 *  the phone's locale settings. */
export function naira(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const digits = Math.round(Math.abs(amount))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}₦${digits}`;
}

const EFFECT_LABELS: Record<keyof Effects, string> = {
  grades: 'Grades',
  energy: 'Energy',
  social: 'Social',
  stress: 'Stress',
  money: 'Money',
};

/** { grades: 4, money: -700 } -> ["Grades +4", "Money -₦700"] */
export function describeEffects(effects: Effects): string[] {
  return (Object.keys(effects) as Array<keyof Effects>)
    .filter((k) => effects[k])
    .map((k) => {
      const v = effects[k]!;
      if (k === 'money') return `Money ${v > 0 ? '+' : ''}${naira(v)}`;
      return `${EFFECT_LABELS[k]} ${v > 0 ? '+' : ''}${v}`;
    });
}
