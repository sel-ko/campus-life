// Random campus events, as data. Every one is marked draft: true so it can be
// rewritten with real in-jokes. School-specific words come from the content
// file's slang, so this file never names a school.
import { university } from '../../content/university';
import type { GameEvent } from './types';

const s = university.slang;

export const EVENTS: GameEvent[] = [
  {
    id: 'late-lecturer-attendance',
    slot: 'Morning',
    locationType: 'lecture',
    text: 'The lecturer strolls in 50 minutes late, then announces that attendance is 10 marks.',
    choices: [
      { label: 'Sign for your absent friend too', effects: { social: 6, stress: 6 }, outcome: 'Your friend owes you one. Your heart was beating sha.' },
      { label: 'Sign only your own name', effects: { grades: 1, stress: -2 }, outcome: 'Clean conscience, 10 marks secured.' },
    ],
    draft: true,
  },
  {
    id: 'surprise-test',
    slot: 'any',
    locationType: 'lecture',
    text: `Surprise test! ${s.fearedLecturer} says "close your books and bring out a sheet of paper".`,
    choices: [
      { label: 'Write what you know', effects: { grades: 3, stress: 8 }, outcome: 'You managed to write something. It will count.' },
      { label: 'Beg to write it next week', effects: { grades: -2, stress: 4 }, outcome: 'The lecturer laughed and collected your blank paper.' },
    ],
    draft: true,
  },
  {
    id: 'light-off-before-paper',
    slot: 'Night',
    locationType: 'hostel',
    text: `${s.powerOut} the night before your paper, and your phone is on 20%.`,
    choices: [
      { label: 'Read with your torch', effects: { grades: 3, energy: -10, stress: 4 }, outcome: 'You covered two more topics before the phone died.' },
      { label: 'Sleep and pray', effects: { energy: 10, stress: 8 }, outcome: 'You slept, but the topics you skipped haunted your dreams.' },
    ],
    draft: true,
  },
  {
    id: 'portal-crash',
    slot: 'any',
    locationType: 'business',
    text: `${s.portal} crashes on the last day of course registration.`,
    choices: [
      { label: 'Pay someone ₦1,000 to do it', effects: { money: -1000, stress: -5 }, outcome: 'Registered. Money well spent.' },
      { label: 'Keep refreshing', effects: { energy: -10, stress: 10 }, outcome: 'It finally loaded at 11:58 p.m.' },
    ],
    draft: true,
  },
  {
    id: 'strike-rumour',
    slot: 'any',
    locationType: 'any',
    text: `A WhatsApp broadcast says ${s.strike} starts Monday. Nobody knows who sent it.`,
    choices: [
      { label: 'Pack your books, strike is coming', effects: { grades: -3, stress: -6 }, outcome: 'There was no strike. You lost a day of reading.' },
      { label: 'Ignore it and keep reading', effects: { grades: 2, stress: 3 }, outcome: 'Classes held as normal. You were ready.' },
    ],
    draft: true,
  },
  {
    id: 'roommate-provisions',
    slot: 'any',
    locationType: 'hostel',
    text: 'Your roommate has finished your provisions. Garri, sugar, milk, everything.',
    choices: [
      { label: 'Restock (₦1,500)', effects: { money: -1500, stress: -2 }, outcome: 'You bought more and hid them this time.' },
      { label: 'Confront them', effects: { social: -5, stress: 5 }, outcome: 'Awkward silence in the room for two days.' },
    ],
    draft: true,
  },
  {
    id: 'group-project-ghost',
    slot: 'any',
    locationType: 'library',
    text: 'Your group project teammate has blue-ticked the group chat for three days.',
    choices: [
      { label: 'Do their part yourself', effects: { grades: 3, energy: -15, stress: 6 }, outcome: 'The project is done. Their name is still on it.' },
      { label: 'Report them to the lecturer', effects: { grades: 1, social: -4, stress: -2 }, outcome: 'They suddenly came online.' },
    ],
    draft: true,
  },
  {
    id: 'water-queue',
    slot: 'Morning',
    locationType: 'hostel',
    text: 'No water in the estate this morning. The queue at the tank is long.',
    choices: [
      { label: 'Join the queue', effects: { energy: -10, social: 3 }, outcome: 'You heard all the latest gist in the queue.' },
      { label: 'Buy sachet water to bathe (₦400)', effects: { money: -400, stress: -3 }, outcome: 'Fresh and on time.' },
    ],
    draft: true,
  },
  {
    id: 'friend-loan',
    slot: 'any',
    locationType: 'any',
    text: 'A friend begs you for ₦2,000 "till Friday".',
    choices: [
      { label: 'Give it', effects: { money: -2000, social: 8 }, outcome: 'Friday has come and gone. You are still waiting.' },
      { label: 'Say you are broke too', effects: { social: -3, stress: 2 }, outcome: 'They looked at your new slippers and said nothing.' },
    ],
    draft: true,
  },
  {
    id: 'lost-id-card',
    slot: 'any',
    locationType: 'lecture',
    text: 'You cannot find your ID card, and they are checking IDs at the door.',
    choices: [
      { label: 'Pay for a replacement (₦2,000)', effects: { money: -2000, stress: -4 }, outcome: 'New ID, new you.' },
      { label: 'Beg the person at the door', effects: { stress: 8, social: 2 }, outcome: 'After ten minutes of begging, they let you in.' },
    ],
    draft: true,
  },
  {
    id: 'early-class-keke',
    slot: 'Morning',
    locationType: 'any',
    text: `You overslept for a ${s.earlyClass} and every keke is full.`,
    choices: [
      { label: 'Pay for a drop (₦800)', effects: { money: -800, stress: -3 }, outcome: 'You arrived like a big man.' },
      { label: 'Trek', effects: { energy: -12, stress: 4 }, outcome: 'You arrived sweating, just in time.' },
    ],
    draft: true,
  },
  {
    id: 'buka-extra-meat',
    slot: 'any',
    locationType: 'cafeteria',
    text: 'The buka aunty likes your face today and adds extra meat.',
    choices: [
      { label: 'Thank her well well', effects: { energy: 10, social: 3 }, outcome: 'You are now her favourite customer.' },
      { label: 'Ask for extra stew too', effects: { energy: 12, social: -2 }, outcome: 'She gave you the stew and a long look.' },
    ],
    draft: true,
  },
  {
    id: 'mosquito-party',
    slot: 'Night',
    locationType: 'hostel',
    text: 'Mosquitoes are holding a party in your room tonight.',
    choices: [
      { label: 'Buy insecticide (₦500)', effects: { money: -500, energy: 5 }, outcome: 'Peace at last.' },
      { label: 'Endure it', effects: { energy: -10, stress: 5 }, outcome: 'You woke up with bites in places you cannot show.' },
    ],
    draft: true,
  },
  {
    id: 'fellowship-jollof',
    slot: 'Evening',
    locationType: 'faculty',
    text: 'The meeting ends with free jollof rice.',
    choices: [
      { label: 'Stay and eat', effects: { energy: 15, social: 4 }, outcome: 'Party jollof. No regrets.' },
      { label: 'Leave early to read', effects: { grades: 2, energy: -3 }, outcome: 'Discipline. Your stomach did not agree.' },
    ],
    draft: true,
  },
  {
    id: 'data-finished',
    slot: 'Evening',
    locationType: 'any',
    text: 'Your data finished in the middle of an online assignment.',
    choices: [
      { label: 'Buy data (₦1,000)', effects: { money: -1000, grades: 2 }, outcome: 'Submitted with minutes to spare.' },
      { label: 'Beg for a hotspot', effects: { social: -2, stress: 5, grades: 1 }, outcome: 'Your friend kept reminding you it was their data.' },
    ],
    draft: true,
  },
  {
    id: 'crush-at-field',
    slot: 'any',
    locationType: 'field',
    text: 'Your crush waved at you across the field.',
    choices: [
      { label: 'Go and talk', effects: { social: 10, stress: 3 }, outcome: 'You talked for an hour. You do not remember what you said.' },
      { label: 'Pretend you did not see', effects: { social: -2, stress: -2 }, outcome: 'Safe. Boring, but safe.' },
    ],
    draft: true,
  },
  {
    id: 'handout-not-compulsory',
    slot: 'Afternoon',
    locationType: 'lecture',
    text: 'The lecturer says the handout is "not compulsory", but the questions come from it.',
    choices: [
      { label: 'Buy it (₦1,500)', effects: { money: -1500, grades: 4 }, outcome: 'You now understand where the questions come from.' },
      { label: 'Read a friend’s copy', effects: { social: 2, grades: 2, energy: -5 }, outcome: 'You read it on their bed till late.' },
    ],
    draft: true,
  },
  {
    id: 'printer-jam',
    slot: 'Afternoon',
    locationType: 'business',
    text: 'The printer jams halfway through a customer’s final-year project.',
    choices: [
      { label: 'Fix it carefully', effects: { energy: -8, money: 500 }, outcome: 'Fixed. The customer tipped you.' },
      { label: 'Send them elsewhere', effects: { stress: -3, social: -2 }, outcome: 'They left, grumbling.' },
    ],
    draft: true,
  },
  {
    id: 'exam-week-snacks',
    slot: 'Evening',
    locationType: 'hostel',
    text: 'It is test week and everybody wants snacks for night reading.',
    choices: [
      { label: 'Sell more', effects: { money: 1500, energy: -10 }, outcome: 'Sold out! Your bag is heavy with cash.' },
      { label: 'Rest instead', effects: { energy: 10, stress: -3 }, outcome: 'Money will come another day.' },
    ],
    draft: true,
  },
  {
    id: 'test-scores-out',
    slot: 'Afternoon',
    locationType: 'any',
    text: 'Test scores are on the notice board. A crowd is gathering.',
    choices: [
      { label: 'Go and check', effects: { grades: 2, stress: 6 }, outcome: 'Not bad. Not great. Motivation unlocked.' },
      { label: 'Avoid the notice board', effects: { stress: -4, grades: -1 }, outcome: 'What you do not know cannot stress you. For now.' },
    ],
    draft: true,
  },
];
