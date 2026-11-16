// What is going on at a place right now, in a few words, and how busy it is.
// Pure: reads the state, changes nothing. Used by the place card on the map,
// the room header, and to fill rooms with people.
import { getPerson } from '../content/people';
import { getPlace } from '../content/places';
import { examsNow, meetingsNow } from './academics';
import { officeName } from './clearance';
import { getQueueLength, officesAt, stillClearing } from './interactions';
import { isWeekend } from './time';
import type { GameState, PlaceType } from './types';

/** An emoji for each kind of place (map pins, cards). */
export const PLACE_EMOJI: Record<PlaceType, string> = {
  lecture_hall: '🎓',
  admin_office: '🏛️',
  restaurant: '🍲',
  hostel_room: '🛏️',
  lab: '🧪',
  library: '📚',
  clinic: '🏥',
  shop: '🛒',
  workplace: '💼',
  nightlife: '🎉',
  residence: '🏘️',
  field: '⚽',
  busstop: '🚌',
  gate: '🚧',
};

export function placeEmoji(d: GameState | null, placeId: string): string {
  const place = getPlace(placeId);
  if (!place) return '📍';
  if (d && d.room.placeId === placeId) return '🏠';
  if (place.type === 'nightlife') return place.venue === 'cinema' ? '🎬' : place.venue === 'event_centre' ? '🎊' : place.venue === 'lounge' ? '🍸' : '🪩';
  if (place.bank) return '🏦';
  if (place.hospital) return '🏥';
  return PLACE_EMOJI[place.type] ?? '📍';
}

/** A short live line: "CSC 101 lecture on now", "Open · 6 in the queue". */
export function placeStatus(d: GameState, placeId: string): { text: string; tone: 'live' | 'open' | 'closed' | 'quiet' } {
  const place = getPlace(placeId);
  if (!place) return { text: '', tone: 'quiet' };
  const slot = d.clock.slot;
  const weekend = isWeekend(d.clock.day);
  const exams = examsNow(d, placeId);
  if (exams.length) return { text: `EXAM now: ${exams.map((c) => c.code).join(', ')}`, tone: 'live' };
  const lectures = meetingsNow(d, placeId);
  if (lectures.length) {
    const { course, meeting } = lectures[0]!;
    const who = getPerson(course.lecturerId)?.name;
    return { text: `${meeting.test ? 'TEST' : 'Class'} on now: ${course.code}${who ? ` with ${who}` : ''}`, tone: 'live' };
  }
  if (d.room.placeId === placeId) {
    const here = d.room.roommates.length;
    const who = here ? `${here} roommate${here === 1 ? '' : 's'}` : 'transit bunk, shared with other freshers';
    return { text: slot === 3 ? 'Lights off soon. Your bed is calling' : `Your room · ${who}`, tone: 'open' };
  }
  switch (place.type) {
    case 'admin_office': {
      const offices = officesAt(d, placeId);
      if (!offices.length) return { text: 'Offices', tone: 'quiet' };
      if (slot >= 2 || weekend) return { text: 'Closed. Opens tomorrow morning', tone: 'closed' };
      const q = getQueueLength(d, placeId);
      return { text: `Open · ${offices.map(officeName).join(', ')}${q ? ` · ${q} in the queue` : ''}`, tone: 'open' };
    }
    case 'restaurant':
      return slot === 3 ? { text: 'Closed for the night', tone: 'closed' } : { text: slot === 1 ? 'Lunch rush: hot food, long queue' : 'Open: hot food ready', tone: 'open' };
    case 'library':
      return slot === 3 ? { text: 'Reading room open all night', tone: 'open' } : { text: 'Open · quiet reading', tone: 'open' };
    case 'clinic':
      return { text: place.hospital ? 'Open 24 hours' : 'Doctor on duty', tone: 'open' };
    case 'nightlife': {
      if (stillClearing(d)) return { text: 'Clearance first. Fun later', tone: 'closed' };
      if (place.venue === 'club') return slot === 3 ? { text: 'LIT right now 🔥', tone: 'live' } : { text: 'Opens at night', tone: 'closed' };
      if (place.venue === 'lounge') return slot >= 2 ? { text: 'Music and drinks', tone: 'live' } : { text: 'Opens in the evening', tone: 'closed' };
      if (place.venue === 'cinema') return slot >= 1 ? { text: 'Showing now', tone: 'open' } : { text: 'First show in the afternoon', tone: 'closed' };
      return weekend && slot >= 1 ? { text: 'Owambe on! Free food', tone: 'live' } : { text: 'Parties hold at weekends', tone: 'closed' };
    }
    case 'field':
      return slot === 2 ? { text: 'Everybody is out here this evening', tone: 'live' } : slot === 3 ? { text: 'Dark and empty', tone: 'quiet' } : { text: 'Open · jog or hang out', tone: 'open' };
    case 'lecture_hall':
    case 'lab': {
      const next = nextClassHere(d, placeId);
      return { text: next ? `Empty now · next: ${next}` : 'Empty now', tone: 'quiet' };
    }
    case 'shop':
      return slot === 3 ? { text: 'Closed', tone: 'closed' } : { text: 'Open', tone: 'open' };
    case 'workplace':
      return slot <= 1 && !weekend ? { text: 'Working hours', tone: 'open' } : { text: 'Closed', tone: 'closed' };
    default:
      return { text: '', tone: 'quiet' };
  }
}

const SLOT_NAMES = ['morning', 'afternoon', 'evening', 'night'];

function nextClassHere(d: GameState, placeId: string): string | null {
  const now = d.clock.day * 4 + d.clock.slot;
  let best: { t: number; text: string } | null = null;
  for (const c of d.academics.courses) {
    for (const m of c.meetings) {
      const t = m.day * 4 + m.slot;
      if (m.placeId !== placeId || m.status !== 'scheduled' || t <= now) continue;
      if (!best || t < best.t) best = { t, text: `${c.code}, ${m.day === d.clock.day ? 'today' : `day ${m.day}`} ${SLOT_NAMES[m.slot]}` };
    }
  }
  return best?.text ?? null;
}

/** How full the room is (0 empty to 1 packed), for drawing other students. */
export function crowdLevel(d: GameState, placeId: string): number {
  const place = getPlace(placeId);
  if (!place) return 0;
  // Your room: strangers on the transit bunks until you have real roommates.
  if (d.room.placeId === placeId) return d.room.roommates.length ? 0 : [0.45, 0.3, 0.6, 0.45][d.clock.slot]!;
  const slot = d.clock.slot;
  const weekend = isWeekend(d.clock.day);
  if (examsNow(d, placeId).length) return 0.95;
  const lectures = meetingsNow(d, placeId);
  if (lectures.length) return lectures.some(({ course }) => course.kind === 'gst') ? 1 : 0.75;
  switch (place.type) {
    case 'lecture_hall':
    case 'lab':
      return slot === 3 ? 0 : 0.1;
    case 'admin_office':
      return slot >= 2 || weekend ? 0 : Math.min(1, 0.15 + getQueueLength(d, placeId) / 8);
    case 'restaurant':
      return [0.45, 0.85, 0.6, 0.1][slot]!;
    case 'library':
      return [0.4, 0.6, 0.7, 0.35][slot]!;
    case 'clinic':
      return 0.4;
    case 'nightlife':
      if (stillClearing(d)) return 0.1;
      if (place.venue === 'club') return slot === 3 ? 1 : 0.1;
      if (place.venue === 'event_centre') return weekend && slot >= 1 ? 1 : 0.1;
      return slot >= 2 ? 0.8 : 0.2;
    case 'field':
      return [0.4, 0.3, 0.9, 0.05][slot]!;
    case 'workplace':
      return slot <= 1 && !weekend ? 0.8 : 0.1;
    case 'shop':
      return slot === 3 ? 0 : 0.5;
    default:
      return 0.2;
  }
}

/**
 * Whether you can go in now. Offices and workplaces keep weekday hours,
 * eateries and shops close at night, lecture halls are locked at night, night
 * life keeps its own hours (and waits until your clearance form is signed).
 * Your room, hostels, the library, clinics and fields are always open.
 */
export function placeOpen(d: GameState, placeId: string): { open: boolean; reason?: string } {
  const place = getPlace(placeId);
  if (!place || d.room.placeId === placeId) return { open: true };
  const slot = d.clock.slot;
  const weekend = isWeekend(d.clock.day);
  const nextWeekday = weekend ? 'on Monday morning' : slot >= 2 ? 'tomorrow at 7:00 am' : '';
  if (examsNow(d, placeId).length || meetingsNow(d, placeId).length) return { open: true };
  switch (place.type) {
    case 'admin_office':
    case 'workplace':
      return slot <= 1 && !weekend ? { open: true } : { open: false, reason: `Closed. Opens ${nextWeekday || 'tomorrow at 7:00 am'}` };
    case 'restaurant':
    case 'shop':
      return slot === 3 ? { open: false, reason: 'Closed for the night. Opens at 7:00 am' } : { open: true };
    case 'lecture_hall':
    case 'lab':
      return slot === 3 ? { open: false, reason: 'Locked for the night' } : { open: true };
    case 'nightlife': {
      if (stillClearing(d)) return { open: false, reason: 'Finish your clearance first' };
      const v = place.venue;
      if (v === 'club') return slot === 3 || (weekend && slot === 2) ? { open: true } : { open: false, reason: 'Opens at 8:00 pm' };
      if (v === 'lounge') return slot >= 2 ? { open: true } : { open: false, reason: 'Opens at 4:00 pm' };
      if (v === 'cinema') return slot >= 1 ? { open: true } : { open: false, reason: 'First show at 12:00 pm' };
      return weekend && slot >= 1 ? { open: true } : { open: false, reason: 'Parties hold at weekends' };
    }
    default:
      return { open: true };
  }
}
