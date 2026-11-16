// The simulated chat on the phone: the freshers' group, the class group, the
// room chat and one-to-one threads. Messages come from templates triggered by
// the calendar, events and the player's state; some offer reply choices.
//
// Threads are keyed by id and list their members, so a real player-to-player
// transport could later replace the 'direct' threads without changing the
// rest of the game.
import { getProgramme } from '../content/courses';
import { CHAT_SCRIPTS } from '../content/chatScripts';
import { CAST, getPerson } from '../content/people';
import { placeName } from '../content/places';
import type { ChatScript, ChatTrigger } from './contentTypes';
import { CHAT_LIMIT, CLASS_DUES, FEES, LATE_REGISTRATION_CLOSE } from './config';
import { log } from './draft';
import { registrationDeadline } from './money';
import type { Rng } from './rng';
import { slotName, stamp } from './time';
import type { ChatReply, ChatThread, GameState } from './types';

export const dmThread = (personId: string) => `dm:${personId}`;

export function classThreadTitle(d: GameState): string {
  return `${getProgramme(d.player.programmeId).prefix} ${d.academics.level}00L Class Group`;
}

export function ensureThread(d: GameState, id: string, title: string, kind: ChatThread['kind'], members: string[]): ChatThread {
  const t = (d.chat.threads[id] ??= { id, title, kind, members, messages: [], unread: 0 });
  t.title = title;
  t.members = members;
  return t;
}

export function postMut(
  d: GameState,
  threadId: string,
  from: string,
  text: string,
  extra: { replies?: ChatReply[]; draft?: boolean } = {},
): void {
  const t = d.chat.threads[threadId];
  if (!t) return;
  d.chat.seq += 1;
  t.messages.push({ id: d.chat.seq, from, text, at: stamp(d.clock), ...(extra.replies ? { replies: extra.replies } : {}), ...(extra.draft ? { draft: true } : {}) });
  if (t.messages.length > CHAT_LIMIT) t.messages.splice(0, t.messages.length - CHAT_LIMIT);
  if (from !== 'me') t.unread += 1;
}

export type ChatVars = Partial<Record<'code' | 'title' | 'day' | 'slot' | 'place' | 'amount' | 'name', string | number>> & {
  personId?: string;
};

function fill(text: string, vars: ChatVars): string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k as keyof ChatVars] ?? ''));
}

function sender(d: GameState, r: Rng, script: ChatScript, vars: ChatVars): string {
  switch (script.from) {
    case 'system':
      return vars.personId ?? 'system';
    case 'classmate':
    case 'coursemate': {
      const mates = CAST.filter((p) => p.role === 'coursemate');
      return r.pick(mates).id;
    }
    case 'roommate':
      return d.room.roommates.length ? r.pick(d.room.roommates) : 'system';
    default:
      return CAST.find((p) => p.role === script.from)?.id ?? 'system';
  }
}

const THREAD_FOR: Record<ChatScript['thread'], (d: GameState, vars: ChatVars) => string | null> = {
  freshers: (d) => (d.chat.threads.freshers ? 'freshers' : null),
  class: () => 'class',
  room: (d) => (d.chat.threads.room ? 'room' : null),
  direct: (_d, vars) => (vars.personId ? dmThread(vars.personId) : null),
};

/** Posts one message for a trigger (a random template of that trigger). */
export function scriptMut(d: GameState, r: Rng, trigger: ChatTrigger, vars: ChatVars = {}, threadFilter?: ChatScript['thread']): void {
  const options = CHAT_SCRIPTS.filter((s) => s.trigger === trigger && (!threadFilter || s.thread === threadFilter));
  if (!options.length) return;
  const script = r.pick(options);
  if (script.thread === 'direct' && vars.personId) {
    const p = getPerson(vars.personId);
    ensureThread(d, dmThread(vars.personId), p?.name ?? 'Friend', 'direct', ['me', vars.personId]);
  }
  const threadId = THREAD_FOR[script.thread](d, vars);
  if (!threadId || !d.chat.threads[threadId]) return;
  postMut(d, threadId, sender(d, r, script, vars), fill(script.text, vars), {
    replies: script.replies?.map((x) => ({ label: x.label, reply: x.reply, ...(x.effects ? { effects: x.effects } : {}) })),
    draft: true,
  });
}

/** New game: the freshers' group and the class group. */
export function setupChatMut(d: GameState, r: Rng): void {
  ensureThread(d, 'freshers', 'Freshers Group', 'group', ['me', 'tega', 'dami', 'osaze', 'tobi']);
  ensureThread(d, 'class', classThreadTitle(d), 'group', ['me', ...CAST.filter((p) => ['course_rep', 'efiko', 'coursemate', 'hustle_partner'].includes(p.role)).map((p) => p.id)]);
  for (const script of CHAT_SCRIPTS.filter((s) => s.trigger === 'admitted')) {
    postMut(d, script.thread, sender(d, r, script, {}), script.text, { replies: script.replies?.map((x) => ({ ...x })), draft: true });
  }
}

export function setupRoomChatMut(d: GameState, r: Rng): void {
  ensureThread(d, 'room', `Room ${d.room.roomNo} ✌️`, 'group', ['me', ...d.room.roommates]);
  scriptMut(d, r, 'room_allocated');
}

/** Start of a semester. */
export function semesterChatMut(d: GameState, r: Rng): void {
  const t = d.chat.threads.class;
  if (t) t.title = classThreadTitle(d);
  const first = d.academics.courses.flatMap((c) => c.meetings).sort((a, b) => a.day - b.day)[0];
  const code = d.academics.courses[0]?.code ?? '';
  scriptMut(d, r, 'semester_start', { day: first ? `day ${first.day}` : 'soon', code });
}

/** Start of each day: announcements for tomorrow, rumours, chatter. */
export function chatDayMut(d: GameState, r: Rng, gstMoved: string[]): void {
  const day = d.clock.day;
  const leak = (d.people.tobi?.rel ?? 0) >= 40 ? 4 : 2;
  for (const c of d.academics.courses) {
    for (const m of c.meetings) {
      const vars = { code: c.code, title: c.title, day: m.day, slot: slotName(m.slot).toLowerCase(), place: placeName(m.placeId) };
      if (m.day === day + 1 && m.status === 'cancelled') scriptMut(d, r, 'lecture_cancelled', vars);
      if (m.day === day + 1 && m.moved && m.status === 'scheduled') scriptMut(d, r, [6, 7, 13, 14].includes(m.day) ? 'lecture_weekend' : 'lecture_moved', vars);
      if (m.test && m.status === 'scheduled' && m.day === day + leak) scriptMut(d, r, 'test_announced', vars);
    }
  }
  for (const code of gstMoved) {
    const c = d.academics.courses.find((x) => x.code === code);
    if (c) scriptMut(d, r, 'gst_batch_moved', { code, day: c.exam.day, slot: slotName(c.exam.slot).toLowerCase() });
  }
  if (day === 10 && d.academics.courses.length) scriptMut(d, r, 'exams_soon');
  if (day === 2 && d.academics.courses.length) scriptMut(d, r, 'class_dues', { amount: `₦${CLASS_DUES.toLocaleString('en-NG')}` });
  if (d.clock.semester === 2 && day === 3) scriptMut(d, r, 'dept_week', { amount: '₦3,000' });
  const deadline = registrationDeadline(d);
  if (!d.academics.registered && day === deadline - 1) {
    scriptMut(d, r, 'registration_reminder', { day: deadline, amount: `₦${FEES.lateRegistration.toLocaleString('en-NG')}` });
  }
  if (day <= LATE_REGISTRATION_CLOSE && r.chance(day >= deadline - 2 && day <= deadline ? 0.4 : 0.08)) scriptMut(d, r, 'portal_rumour');
  if (r.chance(0.06)) scriptMut(d, r, 'false_alarm');
  if (r.chance(0.6)) scriptMut(d, r, 'chatter', { day: 10 });
  if (d.chat.threads.room) {
    if (!d.room.light && r.chance(0.5)) scriptMut(d, r, 'room_light');
    if (d.room.levy && r.chance(0.3)) scriptMut(d, r, 'room_levy', { amount: `₦${d.room.levy}` });
    if (r.chance(0.15)) scriptMut(d, r, 'room_chatter');
  }
  // A friend checks in now and then.
  const friends = Object.entries(d.people).filter(([id, p]) => p.rel >= 20 && getPerson(id)?.role !== 'officer' && getPerson(id)?.role !== 'lecturer');
  if (friends.length && r.chance(0.12)) scriptMut(d, r, 'friend_checkin', { personId: r.pick(friends)[0] }, 'direct');
}

export function totalUnread(d: GameState): number {
  return Object.values(d.chat.threads).reduce((s, t) => s + t.unread, 0);
}

/** Reply to a message that offers choices. Applies its effects via the callback. */
export function answerMut(d: GameState, threadId: string, messageId: number, index: number, apply: (e: NonNullable<ChatReply['effects']>) => void): void {
  const t = d.chat.threads[threadId];
  const m = t?.messages.find((x) => x.id === messageId);
  const reply = m?.replies?.[index];
  if (!t || !m || !reply || m.answered !== undefined) return;
  m.answered = index;
  postMut(d, threadId, 'me', reply.label);
  postMut(d, threadId, m.from, reply.reply);
  t.unread = 0;
  if (reply.effects) apply(reply.effects);
  log(d, `You replied in ${t.title}.`);
}

export function markReadMut(d: GameState, threadId: string): void {
  const t = d.chat.threads[threadId];
  if (t) t.unread = 0;
}
