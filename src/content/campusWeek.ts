// Campus-wide events. One is picked for each real calendar week with a fixed
// seed, so every player sees the same one that week without a server.
// DRAFT: rewrite with real campus happenings.
import type { CampusWeekDef } from '../game/contentTypes';

export const CAMPUS_WEEKS: CampusWeekDef[] = [
  {
    id: 'normal',
    title: 'A quiet week',
    text: 'Nothing special on campus this week. Enjoy it while it lasts.',
    modifiers: {},
    draft: true,
  },
  {
    id: 'power_rationing',
    title: 'Power rationing week',
    text: 'The school announced "load shedding" in the hostels. Charge everything when you see light.',
    modifiers: { lightOut: 0.3 },
    draft: true,
  },
  {
    id: 'water_scarcity',
    title: 'Borehole wahala',
    text: 'The hostel borehole pump packed up. Buckets are now worth gold.',
    modifiers: { waterOut: 0.35 },
    draft: true,
  },
  {
    id: 'fuel_scarcity',
    title: 'Fuel scarcity',
    text: 'Fuel queues everywhere. Keke and cab fares have gone up.',
    modifiers: { fare: 1.5 },
    draft: true,
  },
  {
    id: 'food_prices',
    title: 'Food prices climbing',
    text: 'Mama Put says "na market price". Every plate costs a bit more this week.',
    modifiers: { foodPrice: 1.2 },
    draft: true,
  },
  {
    id: 'portal_upgrade',
    title: 'Portal "upgrade"',
    text: 'ICT announced a portal upgrade. Translation: the portal will be down a lot.',
    modifiers: { portalDown: 0.25 },
    draft: true,
  },
  {
    id: 'sports_festival',
    title: 'Inter-college sports festival',
    text: 'Football, athletics and noise at the sports field. Good week to relax a little.',
    modifiers: { stress: -1 },
    draft: true,
  },
  {
    id: 'harmattan',
    title: 'Harmattan haze',
    text: 'Dusty mornings, cracked lips and catarrh. Keep warm and drink water.',
    modifiers: { stress: 1 },
    draft: true,
  },
  {
    id: 'cheap_food_promo',
    title: 'Buka promo week',
    text: 'A new buka opened nearby and everybody dropped prices to compete. Chop well.',
    modifiers: { foodPrice: 0.85 },
    draft: true,
  },
  {
    id: 'rainy_week',
    title: 'Heavy rain week',
    text: 'The rain has refused to stop. Roads are muddy and kekes charge "rain price".',
    modifiers: { fare: 1.25, stress: 1 },
    draft: true,
  },
];
