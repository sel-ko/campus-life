// The department group chat: simulated classmates whose messages arrive as
// the semester goes on. Pure data and a pure function, so the same game always
// shows the same chat. Every line is draft: rewrite with real in-jokes.
import { getDepartment, university } from '../../content/university';
import { DAY_NAMES, WEEKEND_DAYS } from './config';
import { SLOTS, type Slot } from './types';

export interface ChatLine {
  id: string;
  day: number;
  slot: Slot;
  from: string;
  text: string;
  /** True for lines the player sent. */
  mine?: boolean;
}

interface Template {
  id: string;
  from?: 'rep';
  slots?: Slot[];
  /** true: weekends only; false: weekdays only; missing: any day. */
  weekend?: boolean;
  days?: [number, number];
  text: string;
}

export const CLASS_REP = 'Class Rep';
export const CLASSMATES = ['Tobi', 'Amaka', 'Efosa', 'Zainab', 'Kelechi', 'Osas', 'Funmi', 'Daniel'];

/** Messages that always arrive at a set time. */
const SCRIPTED: Array<{ day: number; slot: Slot; from: string; text: string }> = [
  { day: 1, slot: 'Morning', from: CLASS_REP, text: 'Good morning {dept} 👋 Welcome to the new semester. Lectures start today, no dull yourself.' },
  { day: 1, slot: 'Morning', from: 'Tobi', text: 'Who get the timetable? 😩' },
  { day: 8, slot: 'Morning', from: 'Amaka', text: 'Allowance don land? Suya on me tonight 😂' },
  { day: 12, slot: 'Morning', from: CLASS_REP, text: 'Reminder: tests start this week. Read o!' },
  { day: 14, slot: 'Night', from: CLASS_REP, text: 'Semester don end! Una well done 🎉' },
];

/** Random messages, picked to suit the time and day. */
const TEMPLATES: Template[] = [
  { id: 'attendance', from: 'rep', slots: ['Morning'], weekend: false, text: 'Lecture holding today. {lecturer} said attendance is compulsory.' },
  { id: 'early-class', slots: ['Morning'], weekend: false, text: 'Is the {early} still holding? Abeg someone confirm 🙏' },
  { id: 'power', slots: ['Evening', 'Night'], text: '{power} again 😤 Who get power bank?' },
  { id: 'portal', text: '{portal} don crash again. I no fit register 😭' },
  { id: 'handout', weekend: false, text: 'Who get the handout? I go pay for photocopy' },
  { id: 'group-project', text: 'Group project: abeg who never submit? 👀' },
  { id: 'buka', slots: ['Afternoon', 'Evening'], text: 'Who dey go buka? Carry me along' },
  { id: 'night-read', slots: ['Night'], weekend: false, text: 'Night reading tonight? Library or nothing 📚' },
  { id: 'field', weekend: true, text: 'Weekend don come. Who dey field this evening? ⚽' },
  { id: 'fellowship', weekend: true, slots: ['Morning', 'Afternoon'], text: 'Fellowship by 4, everybody come o' },
  { id: 'assignment', text: 'Abeg who sabi this assignment? Question 3 dey hard' },
  { id: 'strike', text: 'Rumour say {strike} dey come... e true?' },
  { id: 'water', slots: ['Morning', 'Afternoon'], text: 'Water don come back for the estate 🙌' },
  { id: 'scores', slots: ['Morning', 'Afternoon'], weekend: false, days: [5, 14], text: 'Una see the notice board? Test scores don comot' },
  { id: 'cancelled', slots: ['Afternoon'], weekend: false, text: 'Lecturer cancel class! 🎉' },
  { id: 'snacks', slots: ['Afternoon', 'Evening'], text: 'Who wan buy snacks? Plantain chips ₦200, DM me' },
  { id: 'data', slots: ['Evening', 'Night'], text: 'Data finish for my side, somebody share hotspot 😩' },
  { id: 'chasing', from: 'rep', weekend: false, text: '{lecturer} dey find who no submit assignment o' },
  { id: 'exam-timetable', from: 'rep', days: [9, 14], text: 'Exam timetable don drop. Check the notice board 📌' },
  { id: 'study-group', slots: ['Evening', 'Night'], days: [10, 14], text: 'Who dey read tonight? Make we form study group' },
  { id: 'keke', slots: ['Morning'], weekend: false, text: 'Keke full this morning, I go late small' },
  { id: 'charge', slots: ['Evening'], text: 'Light go off soon. Charge your phone now ⚡' },
  { id: 'hungry', slots: ['Night'], text: 'Who still get noodles? Hunger wan kill me 😭' },
  { id: 'gist', weekend: true, slots: ['Evening', 'Night'], text: 'Una hear the gist from yesterday? 👀' },
];

/** Things the player can send back. Cosmetic only. */
export const QUICK_REPLIES = ['I dey come 🏃', 'Who get the handout?', 'Abeg wake me for class 😴', 'Una well done 🙌'];

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function rngFrom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function fill(text: string, deptName: string): string {
  const s = university.slang;
  return text
    .replaceAll('{dept}', deptName)
    .replaceAll('{short}', university.shortName)
    .replaceAll('{early}', s.earlyClass)
    .replaceAll('{lecturer}', s.fearedLecturer)
    .replaceAll('{power}', s.powerOut)
    .replaceAll('{portal}', s.portal)
    .replaceAll('{strike}', s.strike);
}

function fits(t: Template, day: number, slot: Slot): boolean {
  const weekend = WEEKEND_DAYS.includes(day);
  if (t.weekend !== undefined && t.weekend !== weekend) return false;
  if (t.slots && !t.slots.includes(slot)) return false;
  if (t.days && (day < t.days[0] || day > t.days[1])) return false;
  return true;
}

export interface ChatInput {
  day: number;
  slotIndex: number;
  player: { nickname: string; departmentId: string };
}

/** Every classmate message up to and including the current slot. */
export function chatFeed(game: ChatInput): ChatLine[] {
  const deptName = getDepartment(game.player.departmentId)?.name ?? 'class';
  const seed = hash(`${game.player.nickname}|${game.player.departmentId}`);
  const used = new Set<string>();
  const lines: ChatLine[] = [];

  for (let day = 1; day <= game.day; day++) {
    const lastSlot = day === game.day ? game.slotIndex : SLOTS.length - 1;
    for (let si = 0; si <= lastSlot; si++) {
      const slot = SLOTS[si]!;
      const rand = rngFrom(seed ^ hash(`${day}:${si}`));
      let n = 0;
      for (const m of SCRIPTED.filter((m) => m.day === day && m.slot === slot)) {
        lines.push({ id: `${day}-${si}-${n++}`, day, slot, from: m.from, text: fill(m.text, deptName) });
      }
      const roll = rand();
      const count = roll < 0.35 ? 0 : roll < 0.85 ? 1 : 2;
      for (let k = 0; k < count; k++) {
        let options = TEMPLATES.filter((t) => fits(t, day, slot) && !used.has(t.id));
        if (options.length === 0) options = TEMPLATES.filter((t) => fits(t, day, slot));
        const t = options[Math.floor(rand() * options.length)];
        if (!t) continue;
        used.add(t.id);
        const from = t.from === 'rep' ? CLASS_REP : CLASSMATES[Math.floor(rand() * CLASSMATES.length)]!;
        lines.push({ id: `${day}-${si}-${n++}`, day, slot, from, text: fill(t.text, deptName) });
      }
    }
  }
  return lines;
}

/** Puts the player's own replies in among the classmates' messages. */
export function mergeReplies(feed: ChatLine[], replies: Array<{ day: number; slot: Slot; text: string }>): ChatLine[] {
  const order = (l: { day: number; slot: Slot }) => l.day * 10 + SLOTS.indexOf(l.slot);
  const mine: ChatLine[] = replies.map((r, i) => ({ id: `me-${i}`, day: r.day, slot: r.slot, from: 'You', text: r.text, mine: true }));
  // Stable sort keeps classmates' lines before the player's within a slot.
  return [...feed, ...mine].sort((a, b) => order(a) - order(b));
}

export function chatTime(day: number, slot: Slot): string {
  return `${DAY_NAMES[(day - 1) % 7]} · ${slot}`;
}
