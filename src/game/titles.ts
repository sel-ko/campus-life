// Funny end-of-semester titles, picked from the final meters. Checked top to
// bottom; the first rule that matches wins. The last one always matches.
import type { Meters } from './types';

export interface TitleRule {
  title: string;
  blurb: string;
  when: (m: Meters, money: number) => boolean;
}

export const TITLES: TitleRule[] = [
  {
    title: 'Library Ghost',
    blurb: 'Top grades. Nobody knows your face.',
    when: (m) => m.grades >= 80 && m.social <= 25,
  },
  {
    title: 'Hustler of the Semester',
    blurb: 'Your account is fat. Your transcript is thin.',
    when: (m, money) => money >= 25000 && m.grades < 50,
  },
  {
    title: 'Campus Celebrity Scholar',
    blurb: 'Good grades AND everybody knows you. How?',
    when: (m) => m.grades >= 75 && m.social >= 70,
  },
  {
    title: 'Owambe Minister',
    blurb: 'Every gathering, every party. Every carryover.',
    when: (m) => m.social >= 75 && m.grades < 50,
  },
  {
    title: 'Running on Panadol',
    blurb: 'You survived, but your blood pressure did not.',
    when: (m) => m.stress >= 75,
  },
  {
    title: 'Sleep Is a Myth',
    blurb: 'Your eye bags have eye bags.',
    when: (m) => m.energy <= 20,
  },
  {
    title: 'Surviving on Garri',
    blurb: 'The account is empty, but you are still standing.',
    when: (_m, money) => money < 1500,
  },
  {
    title: 'Certified Survivor',
    blurb: 'You came, you saw, you finished the semester.',
    when: () => true,
  },
];

export function pickTitle(meters: Meters, money: number): TitleRule {
  // The last rule always matches, so this never returns undefined.
  return TITLES.find((t) => t.when(meters, money)) ?? TITLES[TITLES.length - 1]!;
}
