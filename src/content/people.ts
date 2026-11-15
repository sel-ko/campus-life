// Fictional people. None is based on a real student or staff member.
// DRAFT: rename, re-voice and add more.
import type { PersonDef } from '../game/contentTypes';
import type { Trait } from '../game/types';

const person = (p: Omit<PersonDef, 'draft'>): PersonDef => ({ ...p, draft: true });

/** Recurring characters (besides roommates and lecturers). */
export const CAST: PersonDef[] = [
  person({ id: 'tobi', name: 'Tobi Adeyemi', role: 'course_rep', blurb: 'Course rep. Knows every lecturer\'s phone number and mood.', startRel: 5, look: 'm1' }),
  person({ id: 'ify', name: 'Ifeoma "Prof" Nwosu', role: 'efiko', blurb: 'The class efiko. Reads in her sleep. Shares notes if she likes you.', startRel: 0, look: 'f1' }),
  person({ id: 'kelz', name: 'Kelechi "K-Money" Eze', role: 'hustle_partner', blurb: 'Sells anything that can be sold. Always has a plan.', startRel: 5, look: 'm2' }),
  person({ id: 'dami', name: 'Damilola Bakare', role: 'coursemate', blurb: 'Coursemate and certified gist carrier.', startRel: 5, look: 'f2' }),
  person({ id: 'osaze', name: 'Osaze Igbinovia', role: 'coursemate', blurb: 'Coursemate from Benin. Late to everything, never late to food.', startRel: 5, look: 'm1' }),
  person({ id: 'zainab', name: 'Zainab Bello', role: 'coursemate', blurb: 'Quiet coursemate, very good at maths, lends money carefully.', startRel: 0, look: 'f1' }),
  person({ id: 'ejiro', name: 'Ejiro Okoro', role: 'love_interest', blurb: 'Always at the library or the sports complex. Smiles at you sometimes.', startRel: 0, look: 'f2' }),
  person({ id: 'tega', name: 'Comrade Tega', role: 'senior', blurb: 'Final-year student and campus politician. Knows everybody.', startRel: 0, look: 'm2' }),
  person({ id: 'mama_blessing', name: 'Mama Blessing', role: 'vendor', blurb: 'Runs the buka. Her stew can settle any quarrel.', startRel: 5, look: 'f2' }),
  person({ id: 'officer_admissions', name: 'Mrs Okafor', role: 'officer', office: 'admissions', blurb: 'Admissions Office. Strict about passport photographs.', startRel: 0, look: 'f1' }),
  person({ id: 'officer_registry', name: 'Mr Osagie', role: 'officer', office: 'registry', blurb: 'Registry. "Where is your photocopy?"', startRel: 0, look: 'm2' }),
  person({ id: 'officer_bursary', name: 'Mrs Ehigiator', role: 'officer', office: 'bursary', blurb: 'Bursary. Has seen every fake alert ever made.', startRel: 0, look: 'f2' }),
  person({ id: 'officer_student_affairs', name: 'Mr Danjuma', role: 'officer', office: 'student_affairs', blurb: 'Student Affairs. Allocates rooms and lectures on morals.', startRel: 0, look: 'm1' }),
  person({ id: 'officer_ict', name: 'Mr Effiong "Network"', role: 'officer', office: 'ict', blurb: 'ICT Unit. Blames everything on the server.', startRel: 0, look: 'm2' }),
  person({ id: 'officer_college', name: 'Mrs Adebayo', role: 'officer', office: 'college_office', blurb: 'College Office secretary. The real power in the college.', startRel: 0, look: 'f1' }),
  person({ id: 'officer_hod', name: 'Dr (Mrs) Omoregie', role: 'officer', office: 'hod', blurb: 'Head of Department. Busy, fair, and always in a meeting.', startRel: 0, look: 'f2' }),
  person({ id: 'doctor', name: 'Dr Osifo', role: 'doctor', office: 'medical', blurb: 'Medical Centre doctor. Prescribes rest and paracetamol for everything.', startRel: 0, look: 'm1' }),
];

/** Roommates are drawn from this pool each session. */
export const ROOMMATE_POOL: PersonDef[] = [
  person({ id: 'rm_chidi', name: 'Chidi Okeke', role: 'roommate', traits: ['tidy', 'reader'], blurb: 'Sweeps the room twice a day. Reads with a torch.', look: 'm1' }),
  person({ id: 'rm_segun', name: 'Segun Alade', role: 'roommate', traits: ['noisy', 'generous'], blurb: 'Plays Afrobeats at 2 a.m. but shares his jollof.', look: 'm2' }),
  person({ id: 'rm_emeka', name: 'Emeka Nnaji', role: 'roommate', traits: ['borrower'], blurb: '"I just borrowed your garri small." Small.', look: 'm1' }),
  person({ id: 'rm_tunde', name: 'Tunde Bakare', role: 'roommate', traits: ['night_crawler', 'noisy'], blurb: 'Leaves at 10 p.m., comes back at 4 a.m., bangs the door.', look: 'm2' }),
  person({ id: 'rm_musa', name: 'Musa Abdullahi', role: 'roommate', traits: ['generous', 'tidy'], blurb: 'Brings suya from home and actually shares it.', look: 'm1' }),
  person({ id: 'rm_efe', name: 'Efe Omonigho', role: 'roommate', traits: ['reader'], blurb: 'Wakes everyone at 5 a.m. to "read before the brain gets hot".', look: 'm2' }),
  person({ id: 'rm_amaka', name: 'Amaka Eze', role: 'roommate', traits: ['tidy', 'generous'], blurb: 'Keeps the room smelling of air freshener and shares provisions.', look: 'f1' }),
  person({ id: 'rm_funke', name: 'Funke Adeleke', role: 'roommate', traits: ['noisy'], blurb: 'Phone calls on loudspeaker. All the calls. All the time.', look: 'f2' }),
  person({ id: 'rm_ngozi', name: 'Ngozi Uche', role: 'roommate', traits: ['borrower', 'night_crawler'], blurb: '"Can I use your cream?" Already used it.', look: 'f1' }),
  person({ id: 'rm_halima', name: 'Halima Yusuf', role: 'roommate', traits: ['reader', 'tidy'], blurb: 'Colour-coded notes. Silent. Slightly judgemental.', look: 'f2' }),
  person({ id: 'rm_osas', name: 'Osas Ehigie', role: 'roommate', traits: ['generous', 'night_crawler'], blurb: 'Out at every party, but brings back small chops for everybody.', look: 'm2' }),
  person({ id: 'rm_bisi', name: 'Bisi Ogunleye', role: 'roommate', traits: ['borrower', 'noisy'], blurb: 'Borrows your bucket, returns it empty, sings in the bathroom.', look: 'f1' }),
];

const lecturer = (id: string, name: string, temperament: PersonDef['temperament'], blurb: string, look: string): PersonDef =>
  person({ id, name, role: 'lecturer', temperament, blurb, look, startRel: 0 });

/** Lecturers are assigned to courses by code. */
export const LECTURERS: PersonDef[] = [
  lecturer('lec_ogbeide', 'Dr Ogbeide', 'strict', 'Locks the door at 8:01 a.m. sharp.', 'm1'),
  lecturer('lec_adeyemi_cole', 'Prof. Adeyemi-Cole', 'jovial', 'Tells jokes that are also exam questions.', 'm2'),
  lecturer('lec_eze', 'Dr (Mrs) Eze', 'gentle', 'Explains everything twice and smiles while doing it.', 'f1'),
  lecturer('lec_ibrahim', 'Mr Ibrahim', 'handout', 'Every lecture ends with "make sure you get my handout".', 'm1'),
  lecturer('lec_okonjo', 'Dr Okonjo', 'absentee', 'Seen twice a semester. Both times at the exam.', 'm2'),
  lecturer('lec_aigbe', 'Dr Aigbe', 'strict', 'Marks attendance at the start AND the end.', 'm1'),
  lecturer('lec_williams', 'Mrs Williams', 'gentle', 'Gives extra time for every assignment.', 'f2'),
  lecturer('lec_obi', 'Engr. Obi', 'handout', 'His handout is 300 pages and worth every naira, he says.', 'm2'),
  lecturer('lec_salami', 'Dr Salami', 'jovial', 'Calls everybody "my people". Loves a good question.', 'm1'),
  lecturer('lec_odia', 'Prof. Odia', 'strict', 'Has not given an A since 2009. Allegedly.', 'm2'),
  lecturer('lec_nwachukwu', 'Dr Nwachukwu', 'gentle', 'Answers WhatsApp questions at midnight.', 'f1'),
  lecturer('lec_balogun', 'Barr. Balogun', 'handout', 'Sells a handout and a textbook he wrote.', 'm1'),
  lecturer('lec_ekhator', 'Dr Ekhator', 'absentee', 'Sends a different lecturer every week.', 'm2'),
  lecturer('lec_yakubu', 'Dr (Mrs) Yakubu', 'strict', 'No phones. No talking. No breathing loudly.', 'f2'),
  lecturer('lec_onoja', 'Mr Onoja', 'jovial', 'Starts every class with five minutes of football gist.', 'm1'),
  lecturer('lec_amadi', 'Dr Amadi', 'gentle', 'Patient, kind, and very generous with past questions.', 'f1'),
  lecturer('lec_osaro', 'Pharm. Osaro', 'handout', 'Lab manual compulsory. Not negotiable.', 'm2'),
  lecturer('lec_ukpong', 'Dr Ukpong', 'strict', 'Asks "any questions?" and then fails whoever asks.', 'm1'),
  lecturer('lec_babatunde', 'Prof. Babatunde', 'jovial', 'Sings during lectures. Surprisingly good voice.', 'm2'),
  lecturer('lec_idehen', 'Dr Idehen', 'absentee', 'Always "at a conference in Abuja".', 'f2'),
];

export const ALL_PEOPLE: PersonDef[] = [...CAST, ...ROOMMATE_POOL, ...LECTURERS];

const byId = new Map(ALL_PEOPLE.map((p) => [p.id, p]));
export function getPerson(id: string): PersonDef | undefined {
  return byId.get(id);
}

export const TRAIT_LABELS: Record<Trait, string> = {
  tidy: 'Tidy',
  noisy: 'Noisy',
  generous: 'Generous',
  borrower: 'Borrows without asking',
  reader: 'Reader',
  night_crawler: 'Night crawler',
};
