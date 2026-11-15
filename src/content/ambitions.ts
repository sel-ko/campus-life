// Ambitions (chosen at admission) with yearly milestones and endings, and the
// weekly objective templates. DRAFT: rewrite the text freely.
import type { AmbitionDef, ObjectiveDef } from '../game/contentTypes';

export const AMBITIONS: AmbitionDef[] = [
  {
    id: 'first_class',
    name: 'First Class',
    blurb: 'Graduate with a 4.50 or better. Read like your life depends on it.',
    milestones: [
      { id: 'fc1', level: 1, label: 'Finish 100 level with a CGPA of 4.00+', check: { cgpaAtLeast: 4.0 } },
      { id: 'fc2', level: 2, label: 'Finish 200 level with a CGPA of 4.20+', check: { cgpaAtLeast: 4.2 } },
      { id: 'fc3', level: 3, label: 'Finish 300 level with a CGPA of 4.40+', check: { cgpaAtLeast: 4.4 } },
      { id: 'fcf', level: 'final', label: 'Graduate with First Class (4.50+)', check: { cgpaAtLeast: 4.5 } },
    ],
    ending: {
      win: 'First Class! Your name is on the departmental board, your parents threw a thanksgiving, and your lecturers want you back for a master\'s.',
      lose: 'You did not make First Class, but you read harder than almost anyone. The knowledge is yours forever.',
    },
    draft: true,
  },
  {
    id: 'big_money',
    name: 'Campus Big Boy / Big Girl',
    blurb: 'Leave school richer than you came. Build hustles, stack money, never beg.',
    milestones: [
      { id: 'bm1', level: 1, label: 'End 100 level with ₦30,000 saved', check: { moneyAtLeast: 30000 } },
      { id: 'bm2', level: 2, label: 'Own a POS stand by the end of 200 level', check: { hustle: 'pos' } },
      { id: 'bm3', level: 3, label: 'End 300 level with ₦150,000', check: { moneyAtLeast: 150000 } },
      { id: 'bmf', level: 'final', label: 'Graduate owning a business centre', check: { hustle: 'business_centre' } },
    ],
    ending: {
      win: 'You graduated as the owner of a business centre with customers on speed dial. Campus Big Boy/Big Girl, certified.',
      lose: 'You did not build the empire, but you learnt how money moves. That is a degree on its own.',
    },
    draft: true,
  },
  {
    id: 'su_president',
    name: 'Student Union President',
    blurb: 'Make friends, win elections, and lead the students.',
    milestones: [
      { id: 'su1', level: 1, label: 'Have 4 close friends by the end of 100 level', check: { friendsAtLeast: 4 } },
      { id: 'su2', level: 2, label: 'Win the class rep election in 200 level', check: { position: 'class_rep' } },
      { id: 'su3', level: 3, label: 'Become departmental president in 300 level', check: { position: 'dept_president' } },
      { id: 'suf', level: 'final', label: 'Win the Student Union presidency', check: { position: 'su_president' } },
    ],
    ending: {
      win: '"Comrade President!" You led the Student Union and your posters are still on the walls.',
      lose: 'You did not win the top job, but half the campus knows your name. Politics is long.',
    },
    draft: true,
  },
  {
    id: 'soft_life',
    name: 'Soft Life',
    blurb: 'Low stress, never broke, enjoy school. Balance is the assignment.',
    milestones: [
      { id: 'sl1', level: 1, label: 'Average stress under 45 and broke no more than twice in 100 level', check: { calmAtLeast: 55, brokeAtMost: 2 } },
      { id: 'sl2', level: 2, label: 'Keep average stress under 45 in 200 level', check: { calmAtLeast: 55 } },
      { id: 'sl3', level: 3, label: 'Never broke more than 4 times so far', check: { brokeAtMost: 4 } },
      { id: 'slf', level: 'final', label: 'Graduate relaxed: average stress under 45', check: { calmAtLeast: 55 } },
    ],
    ending: {
      win: 'You graduated rested, fed and smiling. Soft life achieved, without dropping the ball.',
      lose: 'It was not always soft, but you made it through. Now go and rest properly.',
    },
    draft: true,
  },
];

export function getAmbition(id: string): AmbitionDef {
  return AMBITIONS.find((a) => a.id === id) ?? AMBITIONS[0]!;
}

export const OBJECTIVES: ObjectiveDef[] = [
  { id: 'obj_attend', label: 'Attend 6 lectures this week', metric: 'attend', target: 6, when: { lectures: true }, draft: true },
  { id: 'obj_attend_hi', label: 'Attend 9 lectures this week', metric: 'attend', target: 9, when: { lectures: true }, draft: true },
  { id: 'obj_read', label: 'Read 3 times this week', metric: 'reads', target: 3, draft: true },
  { id: 'obj_read_hi', label: 'Read 6 times this week', metric: 'reads', target: 6, when: { examWeek: true }, draft: true },
  { id: 'obj_hustle', label: 'Do 2 hustle shifts', metric: 'shifts', target: 2, when: { hustle: true }, draft: true },
  { id: 'obj_friends', label: 'Talk to 4 people', metric: 'talks', target: 4, draft: true },
  { id: 'obj_clear', label: 'Get 3 clearance signatures', metric: 'signatures', target: 3, when: { clearance: true }, draft: true },
  { id: 'obj_assign', label: 'Submit 2 assignments', metric: 'assignments', target: 2, when: { lectures: true }, draft: true },
  { id: 'obj_save', label: 'End the week with more money than you started', metric: 'save', target: 1, draft: true },
  { id: 'obj_calm', label: 'Keep stress under 60 this week', metric: 'calm', target: 60, draft: true },
  { id: 'obj_fed', label: 'Never let hunger pass 80 this week', metric: 'fed', target: 80, draft: true },
  { id: 'obj_chapter', label: 'Get a project chapter approved', metric: 'chapter', target: 1, when: { project: true }, draft: true },
  { id: 'obj_fees', label: 'Pay your fees for this semester', metric: 'fees', target: 1, when: { feesDue: true }, draft: true },
];
