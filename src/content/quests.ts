// Quest text and side quests. The main story (arrival, clearance, first
// classes, first test, exams, results, next semester) is worked out from the
// state in src/game/quests.ts; its titles, blurbs and rewards live here.
// Side quests come from people you talk to, event-card choices and your
// situation, and each one helps a main-story quest.
// DRAFT: rewrite with real campus voice.
import type { SideQuestDef } from '../game/contentTypes';

export interface MainQuestText {
  title: string;
  blurb: string;
  /** Reputation points and money from home when it is done. */
  xp: number;
  money?: number;
  /** Stress relief when it is done (a positive number). */
  relief?: number;
}

/** The main story, by quest id (the same ids every semester). */
export const MAIN_QUESTS: Record<string, MainQuestText> = {
  arrival: { title: 'Welcome, fresher', blurb: 'You made it in. Freshen up and eat before the long walk.', xp: 20, relief: 3 },
  fees: { title: 'Pay your way', blurb: 'No office signs for a student who has not paid. Daddy sent the money: use the portal.', xp: 40, relief: 5 },
  clearance: { title: 'The clearance walk', blurb: 'Eight offices, eight signatures, one form. Bring your papers.', xp: 80, money: 1500, relief: 8 },
  settle_in: { title: 'Settle in', blurb: 'You have a bed and a form. Now get a library card and some people.', xp: 30 },
  register: { title: 'Officially a student', blurb: 'Register your courses on the portal before the deadline, or pay the late fee.', xp: 40 },
  first_classes: { title: 'First classes', blurb: 'Go to class. Every lecture you attend is knowledge you do not have to cram. Lecturers give assignments in class.', xp: 50, money: 500 },
  first_assignment: { title: 'Homework', blurb: 'A lecturer gave an assignment. Do it at your desk or in the library before it is due.', xp: 40 },
  first_test: { title: 'Your first test', blurb: 'Continuous assessment: the test counts towards your grade. Read for it, then write it.', xp: 60, money: 500 },
  new_semester: { title: 'A new semester', blurb: 'Pay up, register, and find your new classes.', xp: 30 },
  classes: { title: 'Back to class', blurb: 'Attend your classes: that is where knowledge (and assignments) come from.', xp: 40 },
  assignments: { title: 'Hand it in', blurb: 'Every assignment is marks you can bank before exams.', xp: 40 },
  tests: { title: 'Test season', blurb: 'Write your continuous-assessment tests. Missing one is a zero.', xp: 50 },
  project: { title: 'Five chapters', blurb: 'Write each chapter at your desk, then take it to your supervisor.', xp: 80 },
  exam_ready: { title: 'No fees, no exam', blurb: 'Before exams: fees paid, exam form signed, attendance above 75%.', xp: 50, relief: 5 },
  exams: { title: 'Exam week', blurb: 'Every paper on time, at the right hall. You are ready. Mostly.', xp: 100, money: 1000, relief: 10 },
  results: { title: 'Results day', blurb: 'Results come out when the semester ends.', xp: 30 },
};

/** Reputation levels: what campus calls you. */
export const REP_LEVELS: Array<{ xp: number; title: string }> = [
  { xp: 0, title: 'JJC fresher' },
  { xp: 100, title: 'New face' },
  { xp: 250, title: 'Known face' },
  { xp: 450, title: 'Campus regular' },
  { xp: 700, title: 'Big name' },
  { xp: 1000, title: 'Campus star' },
  { xp: 1400, title: 'Senior citizen' },
  { xp: 1900, title: 'Campus legend' },
  { xp: 2500, title: 'Living legend' },
];

const q = (x: Omit<SideQuestDef, 'draft'>): SideQuestDef => ({ ...x, draft: true });

export const SIDE_QUESTS: SideQuestDef[] = [
  q({
    id: 'ify_study',
    title: 'Study buddy',
    giver: 'ify',
    blurb: 'Ifeoma will share her colour-coded notes if you prove you are serious.',
    objectives: [
      { id: 'read', label: 'Read 3 times (library or your desk)', check: { kind: 'count', key: 'read', need: 3 }, placeType: 'library' },
      { id: 'talk', label: 'Show Ifeoma your notes (talk to her)', check: { kind: 'count', key: 'talk:ify', need: 1 }, placeType: 'library', hint: 'She is at the library from the afternoon' },
    ],
    reward: { xp: 40, effects: { rel: { ify: 5 } }, boostTest: 8 },
    rewardText: '+8 knowledge for your next test, Ifeoma +5',
    helps: 'first_test',
    helpsText: 'your next test',
    days: 7,
    repeat: true,
    talk: { person: 'ify', relAtLeast: 8 },
  }),
  q({
    id: 'tobi_rep',
    title: 'Front row',
    giver: 'tobi',
    blurb: 'Tobi the course rep keeps the attendance list. Show your face and he will look after you.',
    objectives: [{ id: 'attend', label: 'Attend 4 classes', check: { kind: 'count', key: 'attend', need: 4 }, placeType: 'lecture_hall' }],
    reward: { xp: 40, effects: { rel: { tobi: 6 }, attendanceCover: true } },
    rewardText: 'Tobi covers your worst attendance (no exam bar), Tobi +6',
    helps: 'exam_ready',
    helpsText: 'the 75% attendance rule',
    days: 10,
    repeat: true,
    talk: { person: 'tobi', relAtLeast: 5 },
  }),
  q({
    id: 'kelz_hustle',
    title: "K-Money's business plan",
    giver: 'kelz',
    blurb: 'Kelechi says the money is in the hustle. Work two shifts and he will add a bonus.',
    objectives: [{ id: 'shifts', label: 'Work 2 hustle shifts (snacks in your room, typing, POS...)', check: { kind: 'count', key: 'hustle', need: 2 } }],
    reward: { xp: 40, effects: { money: 2000, rel: { kelz: 5 } } },
    rewardText: '₦2,000 bonus, Kelechi +5',
    helps: 'fees',
    helpsText: 'paying your fees',
    days: 7,
    repeat: true,
    talk: { person: 'kelz', relAtLeast: 5 },
  }),
  q({
    id: 'mama_plates',
    title: "Mama Blessing's rush hour",
    giver: 'mama_blessing',
    blurb: 'The buka is packed and Mama Blessing needs hands. Help her and she will remember you.',
    objectives: [{ id: 'plates', label: 'Wash plates at the buka twice', check: { kind: 'count', key: 'wash_plates', need: 2 }, placeType: 'restaurant' }],
    reward: { xp: 30, effects: { money: 1000, rel: { mama_blessing: 10 }, items: { rice: 1 } } },
    rewardText: '₦1,000, a pot of rice, and she will let you eat on credit',
    helps: 'fees',
    helpsText: 'surviving when you are broke',
    days: 5,
    repeat: true,
    auto: { moneyBelow: 1500, clearance: false },
    talk: { person: 'mama_blessing', relAtLeast: 10 },
  }),
  q({
    id: 'dami_friend',
    title: 'Gist partner',
    giver: 'dami',
    blurb: 'Damilola from the clearance queue wants to be friends. Keep in touch.',
    objectives: [
      { id: 'talk', label: 'Talk to Damilola twice', check: { kind: 'count', key: 'talk:dami', need: 2 }, hint: 'She is at the buka at lunchtime and at night spots' },
      { id: 'hangout', label: 'Hang out at the Sports Complex', check: { kind: 'count', key: 'hangout', need: 1 }, placeType: 'field' },
    ],
    reward: { xp: 30, effects: { rel: { dami: 6 }, stress: -6 } },
    rewardText: 'A real friend on campus (Damilola +6), -6 stress',
    helps: 'settle_in',
    helpsText: 'making friends',
    days: 10,
  }),
  q({
    id: 'fresh_start',
    title: 'Room rota',
    giver: 'roommate',
    blurb: 'Your roommates drew up a rota. Keep yourself (and your corner) fresh.',
    objectives: [{ id: 'bath', label: 'Take 2 baths', check: { kind: 'count', key: 'bath', need: 2 } }],
    reward: { xp: 20, effects: { roommates: 4, stress: -6 } },
    rewardText: 'Roommates +4, -6 stress',
    helps: 'settle_in',
    helpsText: 'peace in your room',
    days: 5,
    repeat: true,
  }),
  q({
    id: 'fit_life',
    title: 'Morning jogger',
    giver: 'self',
    blurb: 'Your friends jog round the track. A healthy body writes better exams.',
    objectives: [{ id: 'jog', label: 'Exercise at the Sports Complex twice', check: { kind: 'count', key: 'exercise', need: 2 }, placeType: 'field' }],
    reward: { xp: 25, effects: { health: 8, stress: -5 } },
    rewardText: '+8 health, -5 stress',
    helps: 'exams',
    helpsText: 'being fit for exams',
    days: 7,
    repeat: true,
  }),
  q({
    id: 'get_well',
    title: 'Get well soon',
    giver: 'self',
    blurb: 'You are sick. Sick students miss classes and fail papers.',
    objectives: [{ id: 'doctor', label: 'See a doctor (Medical Centre or Sick Bay)', check: { kind: 'count', key: 'treat', need: 1 }, placeType: 'clinic' }],
    reward: { xp: 15, effects: { health: 5, stress: -3 } },
    rewardText: '+5 health, -3 stress',
    helps: 'classes',
    helpsText: 'learning (illness halves what you learn)',
    days: 4,
    repeat: true,
    auto: { ill: true },
  }),
  q({
    id: 'past_questions',
    title: 'Past questions',
    giver: 'self',
    blurb: 'Past questions help, but only if you actually read. Library, then the test.',
    objectives: [
      { id: 'library', label: 'Read twice in the library', check: { kind: 'count', key: 'read@library', need: 2 }, placeType: 'library' },
      { id: 'test', label: 'Write a test', check: { kind: 'count', key: 'test', need: 1 }, placeType: 'lecture_hall' },
    ],
    reward: { xp: 40, boostWeakest: 6 },
    rewardText: '+6 knowledge in your weakest course',
    helps: 'first_test',
    helpsText: 'your tests',
    days: 10,
  }),
  q({
    id: 'tega_network',
    title: "Comrade's network",
    giver: 'tega',
    blurb: 'Comrade Tega knows everybody. Be seen with him and doors open.',
    objectives: [
      { id: 'talk', label: 'Talk to Comrade Tega twice', check: { kind: 'count', key: 'talk:tega', need: 2 }, hint: 'Evenings at the Sports Complex or the night spots' },
      { id: 'hangout', label: 'Hang out with friends', check: { kind: 'count', key: 'hangout', need: 1 }, placeType: 'field' },
    ],
    reward: { xp: 45, effects: { rel: { tega: 6, coursemate: 2 }, stress: -4 } },
    rewardText: 'Tega +6, your coursemates +2 (votes and favours)',
    helps: 'settle_in',
    helpsText: 'friends and the election',
    days: 10,
    talk: { person: 'tega', relAtLeast: 10 },
  }),
];

export function getSideQuest(id: string): SideQuestDef | undefined {
  return SIDE_QUESTS.find((s) => s.id === id);
}
