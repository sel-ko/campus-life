// Chat message templates. The rules pick one for each trigger and fill in
// {code}, {title}, {day}, {slot}, {place}, {amount} and {name}.
// DRAFT: rewrite with real class-group energy.
import type { ChatScript } from '../game/contentTypes';

type S = Omit<ChatScript, 'draft' | 'id'>;
let n = 0;
const s = (x: S): ChatScript => ({ ...x, id: `chat${++n}`, draft: true });

export const CHAT_SCRIPTS: ChatScript[] = [
  // ---- admission ----
  s({ trigger: 'admitted', thread: 'freshers', from: 'senior', text: 'Welcome to the Freshers group 🎉 Read the pinned message before you ask questions. Clearance starts Monday.' }),
  s({ trigger: 'admitted', thread: 'freshers', from: 'classmate', text: 'Please where is the Admissions Office? I have been walking since morning 😭' }),
  s({ trigger: 'admitted', thread: 'freshers', from: 'senior', text: 'Tip: carry extra passport photographs and photocopies everywhere. Trust me.', replies: [
    { label: 'Thank you, senior!', reply: 'Anytime. We move 💪', effects: { rel: { tega: 2 } } },
    { label: 'How many copies?', reply: 'Plenty. Like 10. They will ask for more.' },
  ] }),
  s({ trigger: 'admitted', thread: 'class', from: 'course_rep', text: 'Hello everyone, I am Tobi, your course rep for now. Add your friends from the same course.' }),

  // ---- start of semester ----
  s({ trigger: 'semester_start', thread: 'class', from: 'course_rep', text: 'Timetable is out. Check the portal or the notice board. First lectures start {day}.' }),
  s({ trigger: 'semester_start', thread: 'class', from: 'classmate', text: 'New semester, new me. I will read every day this time 📚' }),
  s({ trigger: 'semester_start', thread: 'class', from: 'efiko', text: 'Please has anybody seen the course outline for {code}?' }),
  s({ trigger: 'semester_start', thread: 'class', from: 'classmate', text: 'Who else has not registered courses? Portal is slow already 😩' }),

  // ---- lectures ----
  s({ trigger: 'test_announced', thread: 'class', from: 'course_rep', text: '📢 {code} test is on {day}, {slot}, at {place}. Come early!', replies: [
    { label: 'Which topics?', reply: 'Everything from week one. Sorry 😅' },
    { label: 'Thanks Tobi 🙏', reply: 'You are welcome!', effects: { rel: { tobi: 1 } } },
  ] }),
  s({ trigger: 'test_announced', thread: 'class', from: 'course_rep', text: 'Reminder: {code} ({title}) test on {day}. No phones in the hall.' }),
  s({ trigger: 'lecture_cancelled', thread: 'class', from: 'course_rep', text: '{code} lecture tomorrow is cancelled. The lecturer travelled.' }),
  s({ trigger: 'lecture_cancelled', thread: 'class', from: 'course_rep', text: 'No {code} class on {day}. Lecturer has a meeting. Use the time to read.' }),
  s({ trigger: 'lecture_moved', thread: 'class', from: 'course_rep', text: '⚠️ {code} lecture on {day} has been MOVED to {place}, {slot}. Please share.' }),
  s({ trigger: 'lecture_weekend', thread: 'class', from: 'course_rep', text: 'Sorry guys, {code} lecturer fixed a class for the WEEKEND: {day}, {slot}, at {place}. 😩' }),
  s({ trigger: 'gst_batch_moved', thread: 'class', from: 'course_rep', text: '🚨 GST UPDATE: our batch for {code} has changed to {day}, {slot}. Tell everybody!' }),
  s({ trigger: 'exams_soon', thread: 'class', from: 'course_rep', text: 'Exam timetable is out. Exams start day 12. Make sure your school fees are paid: no fees, no exam.' }),
  s({ trigger: 'exams_soon', thread: 'class', from: 'efiko', text: 'Group revision at the library tonight. Anybody?', replies: [
    { label: 'I will come', reply: 'See you there 📖', effects: { rel: { ify: 3 } } },
    { label: 'I will read alone', reply: 'Okay o, good luck!' },
  ] }),

  // ---- money ----
  s({ trigger: 'class_dues', thread: 'class', from: 'course_rep', text: 'Class dues: {amount} each for handouts and photocopies. Pay to me before Friday.', replies: [
    { label: 'Pay now', reply: 'Received, thank you 🙏', effects: { money: -1000, rel: { tobi: 3 } } },
    { label: 'I will pay later', reply: 'Okay. I am writing names 👀', effects: { rel: { tobi: -1 } } },
  ] }),
  s({ trigger: 'dept_week', thread: 'class', from: 'course_rep', text: 'Departmental week is coming! Levy is {amount}. T-shirt, dinner and games.' }),
  s({ trigger: 'portal_rumour', thread: 'class', from: 'classmate', text: 'Guys the portal is closing TONIGHT. No extension. Pay now!!' }),
  s({ trigger: 'portal_rumour', thread: 'class', from: 'classmate', text: 'Is the portal working for anybody? It just keeps loading 😭' }),
  s({ trigger: 'portal_rumour', thread: 'class', from: 'classmate', text: 'My money was debited but portal says not paid. Bursary said come back tomorrow 💔' }),
  s({ trigger: 'registration_reminder', thread: 'class', from: 'course_rep', text: 'Last day for course registration is {day}. Late fee after that is {amount}. Don\'t say I didn\'t tell you.' }),

  // ---- rumours, false alarms and jokes ----
  s({ trigger: 'false_alarm', thread: 'class', from: 'classmate', text: 'No lecture today, lecturer is not around!! (sent from a friend in 300L)' }),
  s({ trigger: 'false_alarm', thread: 'class', from: 'classmate', text: 'They said the test has been cancelled!!! 🎉🎉' }),
  s({ trigger: 'false_alarm', thread: 'class', from: 'course_rep', text: 'Please ignore all rumours. Only trust messages from me.' }),
  s({ trigger: 'chatter', thread: 'class', from: 'classmate', text: 'Who else is hungry in class right now? 🙋' }),
  s({ trigger: 'chatter', thread: 'class', from: 'classmate', text: 'The way this lecturer is teaching ehn, I think he is talking to himself' }),
  s({ trigger: 'chatter', thread: 'class', from: 'coursemate', text: 'Buka has fried rice today. Run!' }),
  s({ trigger: 'chatter', thread: 'class', from: 'efiko', text: 'Please don\'t forget the assignment is due {day}.' }),
  s({ trigger: 'chatter', thread: 'class', from: 'hustle_partner', text: 'Chin chin and zobo available in Room B12. Fresh! 🥤' }),
  s({ trigger: 'chatter', thread: 'class', from: 'classmate', text: 'Who has the soft copy of the handout? I will pay 😂' }),
  s({ trigger: 'chatter', thread: 'class', from: 'coursemate', text: 'Light is back in the hostel. Charge your phones!' }),
  s({ trigger: 'chatter', thread: 'freshers', from: 'senior', text: 'Freshers, please learn to greet seniors. Respect is free 😎' }),
  s({ trigger: 'chatter', thread: 'class', from: 'classmate', text: 'Is today\'s class holding?', replies: [
    { label: 'Yes, it is holding', reply: 'Okay thanks, coming' },
    { label: 'No idea', reply: 'Ask Tobi abeg' },
  ] }),
  s({ trigger: 'results_out', thread: 'class', from: 'course_rep', text: 'Results are out on the portal. Check yours. Whatever it is, we move forward 💪' }),
  s({ trigger: 'results_out', thread: 'class', from: 'classmate', text: 'I don\'t want to talk about my result. Please don\'t ask me.' }),

  // ---- room ----
  s({ trigger: 'room_allocated', thread: 'room', from: 'roommate', text: 'Welcome to the room! Bed by the window is taken 😅' }),
  s({ trigger: 'room_light', thread: 'room', from: 'roommate', text: 'No light again. Who has a power bank?', replies: [
    { label: 'Use mine', reply: 'You are a real one 🙏', effects: { roommates: 2 } },
    { label: 'Mine is dead too', reply: 'We are suffering 😭' },
  ] }),
  s({ trigger: 'room_levy', thread: 'room', from: 'roommate', text: 'Room levy: {amount} each for insecticide and broom. Pay in the room.' }),
  s({ trigger: 'room_chatter', thread: 'room', from: 'roommate', text: 'Who finished my sugar? I am just asking 🙂' }),
  s({ trigger: 'room_chatter', thread: 'room', from: 'roommate', text: 'Please if you come back late, don\'t bang the door.' }),
  s({ trigger: 'room_chatter', thread: 'room', from: 'roommate', text: 'I cooked rice. There is some for everybody.', replies: [
    { label: 'Thank you!', reply: 'Enjoy 😋', effects: { hunger: -15, roommates: 1 } },
  ] }),

  // ---- one-to-one ----
  s({ trigger: 'loan_reminder', thread: 'direct', from: 'system', text: 'Hi, about the {amount} you borrowed. Please send it when you can 🙏' }),
  s({ trigger: 'friend_checkin', thread: 'direct', from: 'system', text: 'How far? Haven\'t seen you in class. Are you okay?', replies: [
    { label: 'I am fine, thanks', reply: 'Okay good. Don\'t forget the assignment!' },
    { label: 'Not really', reply: 'Come to the buka, let\'s talk. My treat.', effects: { stress: -5 } },
  ] }),
  s({ trigger: 'friend_checkin', thread: 'direct', from: 'system', text: 'Are you coming to the library today?', replies: [
    { label: 'Yes, see you', reply: 'Okay, I will hold a seat.' },
    { label: 'Not today', reply: 'Okay o. Tomorrow then.' },
  ] }),
];
