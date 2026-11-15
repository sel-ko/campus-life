// Every action the player can take, as data. Tune the numbers here.
import type { ActionDef } from './types';

export const ACTIONS: ActionDef[] = [
  {
    id: 'lecture',
    label: 'Attend lecture',
    locationType: 'lecture',
    slots: ['Morning', 'Afternoon'],
    weekdaysOnly: true,
    effects: { grades: 4, energy: -10, stress: 3 },
    tags: ['study'],
  },
  {
    id: 'library',
    label: 'Read in the library',
    locationType: 'library',
    slots: ['Afternoon', 'Evening'],
    effects: { grades: 6, energy: -12, stress: 5, social: -2 },
    tags: ['study'],
  },
  {
    id: 'night-class',
    label: 'Night class',
    locationType: 'lecture',
    slots: ['Night'],
    effects: { grades: 8, energy: -25, stress: 8 },
    tags: ['study'],
  },
  {
    id: 'cafeteria',
    label: 'Eat at the cafeteria',
    locationType: 'cafeteria',
    slots: ['Morning', 'Afternoon', 'Evening'],
    effects: { money: -700, energy: 25, stress: -5 },
    tags: ['eat'],
  },
  {
    id: 'noodles',
    label: 'Cook noodles',
    locationType: 'hostel',
    slots: ['Morning', 'Afternoon', 'Evening', 'Night'],
    effects: { money: -300, energy: 15 },
    tags: ['eat'],
  },
  {
    id: 'sleep',
    label: 'Sleep',
    locationType: 'hostel',
    slots: ['Night'],
    effects: { energy: 45, stress: -10 },
  },
  {
    id: 'nap',
    label: 'Nap',
    locationType: 'hostel',
    slots: ['Morning', 'Afternoon', 'Evening'],
    effects: { energy: 20, stress: -4 },
  },
  {
    id: 'hangout',
    label: 'Hang out with friends',
    locationType: 'field',
    slots: ['Evening'],
    weekendSlots: ['Morning', 'Afternoon', 'Evening', 'Night'],
    effects: { social: 10, stress: -12, energy: -8, money: -500 },
  },
  {
    id: 'sell-snacks',
    label: 'Sell snacks (hustle)',
    locationType: 'hostel',
    slots: ['Afternoon', 'Evening'],
    effects: { money: 1800, energy: -20, stress: 5, grades: -1 },
  },
  {
    id: 'print-type',
    label: 'Print and type for people (hustle)',
    locationType: 'business',
    slots: ['Afternoon'],
    effects: { money: 1200, energy: -12, stress: 3 },
  },
  {
    id: 'fellowship',
    label: 'Fellowship or club meeting',
    locationType: 'faculty',
    slots: ['Evening'],
    effects: { social: 8, stress: -8, energy: -5 },
  },
];

export function getAction(id: string): ActionDef | undefined {
  return ACTIONS.find((a) => a.id === id);
}
