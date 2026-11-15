// The hustle ladder. Each opens with experience (shifts done) and money to
// set up. Numbers tuned with the simulator (BALANCE.md). DRAFT.
import type { HustleDef } from '../game/contentTypes';
import type { HustleId } from '../game/types';

export const HUSTLES: Record<HustleId, HustleDef> = {
  snacks: {
    id: 'snacks',
    name: 'Sell snacks in the hostel',
    blurb: 'Buy chin chin and drinks, sell door to door. Small money, steady money.',
    xpNeeded: 0,
    setupCost: 0,
    stockCost: 800,
    revenue: [1300, 2200],
    energy: -10,
    stress: 3,
    placeTypes: ['hostel_room'],
  },
  typing: {
    id: 'typing',
    name: 'Typing and printing',
    blurb: 'Type assignments and projects for people at the Business Centre.',
    xpNeeded: 4,
    setupCost: 6000,
    stockCost: 300,
    revenue: [1500, 3000],
    energy: -12,
    stress: 3,
    placeTypes: ['shop'],
  },
  tutoring: {
    id: 'tutoring',
    name: 'Tutoring',
    blurb: 'Teach juniors the courses you passed well. Also helps your own reading.',
    xpNeeded: 6,
    setupCost: 0,
    stockCost: 0,
    revenue: [2000, 3500],
    energy: -8,
    stress: 2,
    placeTypes: ['library'],
    requires: 'good_grade',
  },
  pos: {
    id: 'pos',
    name: 'POS stand',
    blurb: 'Withdrawals and transfers for a fee. Needs float money, watch for fake alerts.',
    xpNeeded: 12,
    setupCost: 30000,
    stockCost: 500,
    revenue: [3000, 6000],
    energy: -10,
    stress: 4,
    placeTypes: ['shop'],
  },
  business_centre: {
    id: 'business_centre',
    name: 'Your own business centre',
    blurb: 'Printing, binding, passport photos and lamination. You are now the landlord of photocopies.',
    xpNeeded: 24,
    setupCost: 90000,
    stockCost: 1500,
    revenue: [6000, 11000],
    energy: -12,
    stress: 4,
    placeTypes: ['shop'],
  },
};

export const HUSTLE_ORDER: HustleId[] = ['snacks', 'typing', 'tutoring', 'pos', 'business_centre'];
