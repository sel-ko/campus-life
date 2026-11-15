// All balance numbers that are not per-action. Tune here.
import type { BackgroundId, Meters } from './types';

export const METER_MIN = 0;
export const METER_MAX = 100;

export const START_METERS: Meters = {
  grades: 50,
  energy: 70,
  social: 40,
  stress: 30,
};

export interface Background {
  id: BackgroundId;
  label: string;
  blurb: string;
  startMoney: number;
  weeklyAllowance: number;
}

export const BACKGROUNDS: Record<BackgroundId, Background> = {
  broke: {
    id: 'broke',
    label: 'Broke',
    blurb: 'Every naira counts. Hustle or starve.',
    startMoney: 5000,
    weeklyAllowance: 3000,
  },
  average: {
    id: 'average',
    label: 'Average',
    blurb: 'You will manage, if you plan well.',
    startMoney: 15000,
    weeklyAllowance: 8000,
  },
  comfortable: {
    id: 'comfortable',
    label: 'Comfortable',
    blurb: 'Money is not your problem. Time is.',
    startMoney: 40000,
    weeklyAllowance: 20000,
  },
};

export const SEMESTER_DAYS = 14;
/** Days the allowance lands, in the morning. */
export const ALLOWANCE_DAYS = [1, 8];
/** Day 1 is a Monday. */
export const WEEKEND_DAYS = [6, 7, 13, 14];
export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const COLLAPSE_STRESS = 15;

export const END_OF_DAY = {
  socialDecay: -2,
  noStudyGrades: -1,
  noFoodEnergy: -20,
  noFoodStress: 10,
  burnoutStressAt: 90,
  burnoutGrades: -5,
};

/** Chance that an event happens on a given action, if one matches and none
 *  has happened today. */
export const EVENT_CHANCE = 0.25;

export const LOG_LIMIT = 30;

/** CGPA = grades / GRADES_PER_POINT. */
export const GRADES_PER_POINT = 20;

/** Checked top to bottom; the first band the CGPA reaches wins. */
export const CLASS_BANDS: Array<{ min: number; name: string }> = [
  { min: 4.5, name: 'First Class' },
  { min: 3.5, name: 'Second Class Upper' },
  { min: 2.4, name: 'Second Class Lower' },
  { min: 1.5, name: 'Third Class' },
  { min: 0, name: 'Probation' },
];
