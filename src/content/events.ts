// Event cards: something happens, you pick a choice. Each is data: when it
// can happen (`when`), the text, and the choices with effects and optional
// follow-ups days later. DRAFT: rewrite with real in-jokes.
import type { EventChoiceDef, EventDef, EventWhen } from '../game/contentTypes';
import type { Effects } from '../game/types';

type Choices = EventDef['choices'];
const c = (label: string, outcome: string, effects: Effects, extra: Partial<EventChoiceDef> = {}): EventChoiceDef => ({
  label,
  outcome,
  effects,
  ...extra,
});
function ev(id: string, category: EventDef['category'], when: EventWhen, title: string, text: string, choices: Choices, extra: Partial<EventDef> = {}): EventDef {
  return { id, category, kind: 'random', when, title, text, choices, draft: true, ...extra };
}
function followup(id: string, category: EventDef['category'], title: string, text: string, choices: Choices): EventDef {
  return { id, category, kind: 'followup', when: {}, title, text, choices, draft: true };
}

const LECTURES = ['lecture_hall', 'lab'] as const;
const HOSTEL = ['hostel_room'] as const;

export const EVENTS: EventDef[] = [
  // ---------------- clearance ----------------
  ev('clr_photocopy_light', 'clearance', { clearance: true, places: ['shop'] }, 'Machine don take light', 'The photocopy machine "has taken light". A guy outside offers photocopies at double the price.', [
    c('Pay double', 'Expensive, but your papers are ready.', { money: -200, items: { photocopy: 2 } }),
    c('Wait for light', 'You waited and waited. Light never came.', { stress: 5, energy: -3 }),
  ]),
  ev('clr_wrong_name', 'clearance', { clearance: true, places: ['admin_office'] }, 'Who is "Adaeze"?', 'Your name is spelt wrong on the admission list. The officer says, "Go and swear an affidavit."', [
    c('Go to the court in town', 'One affidavit and a long queue later, you are you again.', { money: -1500, stress: 4, loseSlots: 1 }),
    c('Beg the officer to correct it', 'She sighed, corrected it with a biro, and told you never to come back.', { stress: 6, rel: { officer: -1 } }),
  ]),
  ev('clr_tout', 'clearance', { clearance: true }, 'The "senior" with connections', 'A smooth-talking "senior" offers to finish your whole clearance for ₦5,000. "I know everybody."', [
    c('Pay him', 'He collected the money with a big smile.', { money: -5000 }, { cost: 5000, followUp: { event: 'clr_tout_gone', days: 2 } }),
    c('Thank him and walk away', 'Your village people did not get you today.', { stress: 1 }),
  ]),
  ev('clr_queue_friend', 'clearance', { clearance: true, places: ['admin_office'] }, 'Queue friends', 'In the endless clearance queue you meet Damilola, a fresher from your class.', [
    c('Gist and swap numbers', 'The queue felt shorter. New friend unlocked.', { rel: { dami: 6 }, stress: -3, quest: 'dami_friend' }),
    c('Keep to yourself', 'You counted the ceiling tiles. All 84 of them.', { stress: 2 }),
  ]),
  ev('clr_needle', 'clearance', { clearance: true, places: ['clinic'] }, 'The needle', 'The Medical Centre wants a blood sample. You and needles are not friends.', [
    c('Close your eyes and pray', 'It was over before you finished the prayer.', { stress: 3, health: 2 }),
    c('Ask Dr Osifo for a cartoon plaster', 'He laughed and gave you one. Now he remembers you.', { stress: -2, rel: { doctor: 4 } }),
  ]),
  ev('clr_lost_form', 'clearance', { clearance: true, places: HOSTEL }, 'Where is the form?!', 'You cannot find your clearance form anywhere.', [
    c('Turn the room upside down', 'Found it under your mattress after an hour.', { loseSlots: 1, stress: 2 }),
    c('Ask your roommates', 'One of them was using it as a fan. Crisis over.', { roommates: 2, stress: 4 }),
  ]),
  ev('clr_mum_call', 'clearance', { clearance: true }, 'Mummy on the line', 'Your mum calls: "Have you finished that clearance? Your cousin finished in one day."', [
    c('"Almost done, Ma"', 'She prayed for you for ten minutes. You feel lighter.', { stress: -4 }),
    c('Tell her the full wahala', 'She sent transport money and a long lecture.', { money: 2000, stress: -2 }),
  ]),
  ev('clr_officer_lunch', 'clearance', { clearance: true, places: ['admin_office'] }, 'Lunch break', 'You finally reach the front of the queue just as the officer stands up for lunch.', [
    c('Offer to buy her a cold drink', 'She sat back down. "Let me just sign this one."', { money: -300, rel: { officer: 2 } }, { cost: 300 }),
    c('Wait patiently', 'Lunch took ninety minutes.', { stress: 5, energy: -3 }),
  ]),
  followup('clr_tout_gone', 'clearance', 'Number not reachable', 'The "senior" has switched off his phone. Your ₦5,000 has entered voice mail.', [
    c('Report him to Student Affairs', 'They took your statement and said they "know him".', { stress: 3, rel: { officer_student_affairs: 3 } }),
    c('Laugh it off', 'School fees of life. Lesson learnt.', { stress: 6 }),
  ]),

  // ---------------- portal and payments ----------------
  ev('portal_rumour', 'portal', { registered: false }, 'BREAKING (unverified)', 'Broadcast in the class group: "Portal closes TONIGHT, no extension!!! Forward to 10 people."', [
    c('Rush to the portal', 'Your heart was racing. The deadline was actually next week.', { stress: 6 }),
    c('Check the school website first', 'Fake news. You stayed calm.', { stress: -2 }),
  ]),
  ev('portal_cafe', 'portal', { places: ['shop'] }, 'Portal specialist', 'The cyber cafe guy offers to "do your portal" for ₦500. "I sabi am well well."', [
    c('Let him do it', 'He did it with two fingers and a toothpick in his mouth.', { money: -500, stress: -3 }, { cost: 500 }),
    c('Do it yourself', 'Thirty minutes and three captchas later, done.', { stress: 2 }),
  ]),
  ev('portal_password', 'portal', {}, 'Forgot password', 'You forgot your portal password and the reset email went to spam. Or to space.', [
    c('Go to the ICT Unit', 'Mr Effiong reset it and blamed the server.', { loseSlots: 1, rel: { officer_ict: 3 } }),
    c('Keep trying passwords', 'Locked out for 24 hours. Classic.', { stress: 7 }),
  ]),
  ev('portal_bank_queue', 'portal', { places: ['shop', 'admin_office'] }, 'Network is down', 'The bank app is down and the queue at the campus bank is long.', [
    c('Join the queue', 'Two hours of your life you will never get back.', { loseSlots: 1, stress: 3 }),
    c('Use a POS (₦200 charge)', 'Instant cash, small pain.', { money: -200 }),
  ]),
  ev('portal_double_debit', 'portal', { moneyAbove: 3000 }, 'Debited twice', 'Your bank debited you twice for one transfer.', [
    c('Call the bank', 'They promised to reverse it "within 24 working hours".', { stress: 5, money: -1500 }, { followUp: { event: 'portal_refund', days: 3 } }),
    c('Cry small', 'Crying did not reverse it.', { stress: 8, money: -1500 }),
  ]),
  followup('portal_refund', 'portal', 'Reversal!', 'The bank finally reversed the double debit.', [
    c('Thank God', 'Money back where it belongs.', { money: 1500, stress: -3 }),
    c('Screenshot it for the group', 'Everyone now asks you how you did it.', { money: 1500, rel: { coursemate: 2 } }),
  ]),
  ev('portal_upgrade', 'portal', {}, 'Scheduled upgrade', 'ICT announces: "Portal down this weekend for upgrade." Translation: down till Tuesday.', [
    c('Pay what you can before the weekend', 'Organised. Your future self thanks you.', { stress: 2 }),
    c('Ignore it', 'Future you will deal with it.', { stress: -1 }),
  ]),
  ev('portal_scam_sms', 'portal', {}, 'Suspicious SMS', '"Your school fees account is suspended. Send your card details to 0803... to unblock."', [
    c('Delete it', 'Nice try, scammer.', { stress: -1 }),
    c('Warn the class group', 'Tobi pinned your message. Respect.', { rel: { course_rep: 3, coursemate: 1 } }),
  ]),

  // ---------------- general courses (GST) ----------------
  ev('gst_mic', 'gst', { places: ['lecture_hall'], levels: [1, 3] }, 'Mic check', 'The GST lecturer\'s microphone died. The back of the hall hears nothing.', [
    c('Push to the front', 'Sweaty, but you heard everything.', { energy: -3, knowledge: 2 }),
    c('Record it on your phone', 'You recorded twenty minutes of coughing and some lecture.', { knowledge: 1 }),
  ]),
  ev('gst_attendance', 'gst', { places: ['lecture_hall'], levels: [1, 3] }, 'The attendance sheet', 'The attendance sheet for 2,000 students is going round. It may never reach you.', [
    c('Chase it across the hall', 'You signed it at the door as it left.', { energy: -5, stress: 3 }),
    c('Ask the course rep to add your name', 'Tobi wrote your name. "You owe me."', { rel: { course_rep: 2 }, attendanceCover: true }, {}),
  ]),
  ev('gst_heat', 'gst', { places: ['lecture_hall'], levels: [1, 3] }, 'Oven hall', 'A thousand students, two working fans. The hall is an oven.', [
    c('Endure it', 'You learnt about Nigerian Peoples and Culture and also sweat.', { stress: 5 }),
    c('Buy a cold drink after', 'The coldest ₦300 you ever spent.', { money: -300, stress: -4 }),
  ]),
  ev('gst_past_questions', 'gst', { levels: [1, 3] }, 'Past questions', 'Someone is selling "GST past questions with answers" in a nylon bag.', [
    c('Buy for ₦500', 'Half the answers are wrong, but the questions help.', { money: -500, knowledge: 3, quest: 'past_questions' }, { cost: 500 }),
    c('Read the textbook instead', 'Old school. It works.', { knowledge: 2, energy: -4, quest: 'past_questions' }),
  ]),
  ev('gst_batch_rumour', 'gst', { levels: [1, 3], days: [9, 14] }, 'Batch wahala', 'Rumour: your department\'s GST exam has moved from batch B to batch D.', [
    c('Confirm with the course rep', 'Tobi checked with the GST unit. Just a rumour.', { rel: { course_rep: 2 }, stress: -2, quest: 'tobi_rep' }),
    c('Panic', 'You panicked for nothing. Classic WhatsApp.', { stress: 6 }),
  ]),
  ev('gst_seat_saver', 'gst', { places: ['lecture_hall'], levels: [1, 3] }, 'Seat saved', 'Osaze saved you a seat in the packed hall with his bag.', [
    c('Buy him a Gala', 'Friendship sealed with Gala.', { money: -200, rel: { osaze: 5 } }),
    c('Say thank you', 'He nodded. "Next time na you."', { rel: { osaze: 2 } }),
  ]),

  // ---------------- departmental lectures and handouts ----------------
  ev('lec_handout', 'lectures', { places: LECTURES }, 'The handout speech', 'The lecturer says only those with his handout will "understand the exam questions".', [
    c('Buy the handout', 'Thick, photocopied, and actually useful.', { money: -2000, knowledge: 4, goodwill: 3 }, { cost: 2000 }),
    c('Photocopy a friend\'s copy', 'Cheaper. The lecturer noticed the blurry pages.', { money: -400, knowledge: 3, goodwill: -2 }),
  ]),
  ev('lec_question', 'lectures', { places: LECTURES }, 'Any answers?', 'The lecturer asks a question and the class goes silent.', [
    c('Try an answer', 'Half right. The lecturer wrote your name down. In a good way.', { goodwill: 4, stress: 2 }),
    c('Look down at your notes', 'Invisibility mode activated.', { stress: -1 }),
  ]),
  ev('lec_late_lecturer', 'lectures', { places: LECTURES }, '"I\'m on my way"', 'The lecturer is 40 minutes late and "on the way".', [
    c('Wait', 'He came, taught fast, and gave an assignment.', { knowledge: 2, stress: 3 }),
    c('Leave with the crowd', 'He arrived to an empty class. He was not happy.', { stress: -2, goodwill: -2 }),
  ]),
  ev('lec_power_cut', 'lectures', { places: LECTURES }, 'Projector down', 'Light goes off mid-lecture and the projector dies.', [
    c('Copy notes from the board', 'Old-fashioned, effective.', { knowledge: 2, energy: -3 }),
    c('Use the break to doze', 'Best ten minutes of sleep this week.', { energy: 5 }),
  ]),
  ev('lec_phone_rang', 'lectures', { places: LECTURES }, 'Ringtone', 'Your phone rang loudly in class. Your ringtone is a Burna Boy song. The lecturer stopped.', [
    c('Apologise', '"See me after class." You did not.', { goodwill: -2, stress: 4 }),
    c('Pretend it was not you', 'Everybody knew it was you.', { goodwill: -4, stress: -1 }),
  ]),
  ev('lec_extra_class', 'lectures', { places: LECTURES }, 'Saturday class', 'The lecturer fixes an extra class for Saturday morning, 8 a.m.', [
    c('Plan to attend', 'You went. Only twelve people came. You are now famous to him.', { knowledge: 3, energy: -4, goodwill: 3 }),
    c('Complain in the group chat', 'The group chat agreed with you. Solidarity.', { stress: -2, rel: { coursemate: 2 } }),
  ]),
  ev('lab_old_microscope', 'lectures', { places: ['lab'] }, 'Vintage equipment', 'The microscope in the lab is older than your father.', [
    c('Share one with a group', 'Teamwork makes the cells visible.', { rel: { coursemate: 3 }, knowledge: 2 }),
    c('Wait for a better one', 'You got the good one at the end. Worth it.', { stress: 3, knowledge: 3 }),
  ]),
  ev('lab_manual', 'lectures', { places: ['lab'] }, 'No manual, no entry', 'The lab attendant shouts: "No practical manual, no entry!"', [
    c('Buy one on the spot', 'You are now a manual-carrying citizen.', { money: -2000, items: { manual: 1 } }, { cost: 2000 }),
    c('Beg to share with someone', 'Zainab shared hers, reluctantly.', { stress: 5, rel: { zainab: 1 } }),
  ]),

  // ---------------- tests and results ----------------
  ev('test_leak', 'tests', { days: [5, 11] }, 'The leak', 'Rumour: the test questions have leaked.', [
    c('Ignore it and read', 'There was no leak. You were ready anyway.', { knowledge: 3, energy: -5, quest: 'past_questions' }),
    c('Search for the leak', 'You paid ₦500 for a PDF of last year\'s test.', { money: -500, stress: 5 }),
  ]),
  ev('test_copy', 'tests', { places: LECTURES, days: [7, 11] }, 'Eyes on your paper', 'In the test, your neighbour keeps leaning to copy your work.', [
    c('Cover your paper', 'He hissed. You passed. He did not.', { rel: { coursemate: -3 }, stress: 2 }),
    c('Let him see', 'The invigilator gave you both a long look.', { rel: { coursemate: 4 }, goodwill: -3, stress: 4 }),
  ]),
  ev('test_scores', 'tests', { days: [9, 12] }, 'Notice board', 'Test scores are posted on the notice board. A crowd is gathering.', [
    c('Push in and check', 'You found your name between two people crying.', { stress: 3 }),
    c('Wait for the gist', 'Damilola told you everybody\'s score but yours.', { stress: -2, rel: { dami: 1 } }),
  ]),
  ev('results_check', 'tests', { days: [1, 4], levels: [1, 6] }, 'That C', 'Last semester\'s result shows a C in a course you were sure was an A.', [
    c('Accept it and move on', 'Peace of mind is also a grade.', { stress: 3 }),
    c('Go to the department to ask', 'They said the result is final. At least you asked.', { loseSlots: 1, stress: -2 }),
  ]),
  ev('test_moved', 'tests', { days: [6, 11] }, 'Moved to tomorrow', 'A test was moved to tomorrow morning at short notice.', [
    c('Read late tonight', 'Tired but prepared.', { knowledge: 4, energy: -8 }),
    c('Sleep and hope', 'Rested, slightly nervous.', { energy: 3, stress: 4 }),
  ]),
  ev('study_group', 'tests', { slots: ['Evening', 'Night'] }, 'Night class', 'Coursemates invite you to a TDB (till day break) study group.', [
    c('Join them', 'You learnt a lot and drank too much Lipton.', { knowledge: 4, rel: { coursemate: 3 }, energy: -8, quest: 'ify_study' }),
    c('Sleep instead', 'Sleep is also revision. Allegedly.', { energy: 5 }),
  ]),
  ev('exam_panic', 'tests', { days: [11, 14] }, 'Exam week panic', 'Exam week. Your heart is beating like a talking drum.', [
    c('Breathe and revise', 'Calm and steady.', { stress: -6, knowledge: 2 }),
    c('Coffee and no sleep', 'Wired. Your hands are shaking.', { energy: 10, health: -5, stress: 4 }),
  ]),

  // ---------------- roommates ----------------
  ev('rm_music', 'roommates', { places: HOSTEL, roommateTrait: 'noisy' }, 'Midnight concert', 'A roommate is playing music at full volume at midnight.', [
    c('Ask them to turn it down', 'They did, with attitude.', { roommates: -1, energy: 5 }),
    c('Join the party', 'Best night of the week. Worst morning.', { stress: -5, energy: -6, roommates: 3 }),
  ]),
  ev('rm_bucket', 'roommates', { places: HOSTEL }, 'The bucket', 'Somebody used your bucket and left it empty. Again.', [
    c('Address the whole room', 'Everybody denied it. The bucket was full the next day.', { roommates: -3, stress: -2 }),
    c('Fetch water yourself', 'Arm day.', { energy: -5 }),
  ]),
  ev('rm_share_food', 'roommates', { places: HOSTEL, roommateTrait: 'generous' }, 'Jollof diplomacy', 'A roommate cooked jollof and dished a plate for you.', [
    c('Eat and thank them', 'Smoky party-jollof energy.', { hunger: -25, roommates: 3 }),
    c('Politely decline', 'They looked hurt.', { roommates: -1 }),
  ]),
  ev('rm_borrow', 'roommates', { places: HOSTEL, roommateTrait: 'borrower', moneyAbove: 2500 }, '"Till Friday"', 'A roommate asks to borrow ₦2,000 "till Friday".', [
    c('Lend it', 'They hugged you. Friday is a long way off.', { money: -2000 }, { cost: 2000, followUp: { event: 'rm_repay', days: 5 } }),
    c('Say you are broke', 'They looked at your new slippers and said nothing.', { roommates: -2 }),
  ]),
  followup('rm_repay', 'roommates', 'Part payment', 'Your roommate paid back ₦1,500 of the ₦2,000. "Remaining next week."', [
    c('Accept it', 'Something is better than nothing.', { money: 1500, roommates: 2 }),
    c('Demand the rest', 'They paid it all, angrily.', { money: 2000, roommates: -3, stress: 3 }),
  ]),
  ev('rm_rota', 'roommates', { places: HOSTEL, roommateTrait: 'tidy' }, 'Cleaning rota', 'The tidy roommate drew up a cleaning rota, laminated.', [
    c('Agree to it', 'The room has never been cleaner.', { roommates: 3, energy: -3, quest: 'fresh_start' }),
    c('Pay a junior to do your days', 'Capitalism.', { money: -500, roommates: 1 }),
  ]),
  ev('rm_cousin', 'roommates', { places: HOSTEL }, 'The "cousin"', 'A roommate brought a "cousin" who wants to sleep in the room for a week.', [
    c('Allow it', 'The cousin snores. Loudly.', { roommates: 2, stress: 6 }),
    c('Tell the porter', 'The cousin left. The roommate is cold now.', { roommates: -4, stress: -2 }),
  ]),
  ev('rm_alarm', 'roommates', { places: HOSTEL, roommateTrait: 'reader' }, '5 a.m. alarm', 'A roommate\'s 5 a.m. "reading alarm" goes off. Again.', [
    c('Wake up and read too', 'Early bird catches the GPA.', { knowledge: 3, energy: -5, quest: 'past_questions' }),
    c('Throw a pillow', 'Direct hit. War declared.', { roommates: -2, energy: 3 }),
  ]),
  ev('rm_lamp', 'roommates', { places: HOSTEL, lightOff: true }, 'Rechargeable lamp', 'The room wants to contribute for a rechargeable lamp.', [
    c('Contribute ₦800', 'Light at last (for three hours).', { money: -800, roommates: 3, knowledge: 1 }, { cost: 800 }),
    c('Use your phone torch', 'Battery anxiety.', { stress: 2 }),
  ]),
  ev('rm_gist', 'roommates', { places: HOSTEL, slots: ['Evening', 'Night'] }, 'Gist night', 'Late-night gist session in the room: relationships, lecturers, conspiracy theories.', [
    c('Join in', 'You laughed till your stomach hurt.', { stress: -6, roommates: 3, energy: -4 }),
    c('Sleep', 'You heard everything anyway.', { energy: 4 }),
  ]),
  followup('rm_theft', 'roommates', 'Things are missing', 'Things keep disappearing from your locker, and you have a good idea who it is.', [
    c('Confront them calmly', 'They swore on their mother. Things stopped disappearing. For now.', { roommates: -2, clearFlag: 'theft' }),
    c('Buy a padlock', 'Problem solved with metal.', { money: -1500, items: { padlock: 1 }, clearFlag: 'theft' }, { cost: 1500 }),
    c('Let it go', 'Peace, at a price.', { stress: 5, clearFlag: 'theft' }),
  ]),
  ev('rm_birthday', 'roommates', { places: HOSTEL }, 'Birthday surprise', 'It is a roommate\'s birthday and the room is planning a surprise.', [
    c('Contribute ₦1,000', 'Cake, cold drinks, and loud singing.', { money: -1000, roommates: 5, stress: -3 }, { cost: 1000 }),
    c('Just sing', 'Your voice was the gift.', { roommates: 1 }),
  ]),

  // ---------------- money and hustles ----------------
  ev('money_uncle', 'money', {}, 'Uncle is calling', 'Your uncle calls and says he is sending "something small".', [
    c('Thank him well well', 'He sent ₦3,000 and a blessing.', { money: 3000, stress: -2 }),
    c('Ask for more', 'He laughed and sent ₦1,500. Greed is expensive.', { money: 1500 }),
  ]),
  ev('money_loan_offer', 'money', { moneyBelow: 2000 }, 'A friend in need', 'You are broke. Damilola offers to lend you ₦3,000 for a week.', [
    c('Borrow it', 'You must pay back in seven days.', { borrow: { from: 'dami', amount: 3000, days: 7 } }),
    c('Manage', 'Garri and groundnut for dinner.', { stress: 4 }),
  ]),
  ev('money_sold_out', 'money', { hasHustle: 'snacks' }, 'Sold out', 'Your snacks sold out fast and customers are asking for more.', [
    c('Restock now', 'Second round sold out too.', { money: 600, energy: -4, quest: 'kelz_hustle' }),
    c('Rest', 'Supply and demand can wait.', { energy: 3 }),
  ]),
  ev('money_fake_alert', 'money', { hasHustle: 'pos' }, 'Screenshot customer', 'A customer shows a "successful transfer" screenshot and wants cash.', [
    c('Wait for the real alert', 'No alert came. The customer disappeared.', { stress: 3 }),
    c('Give the cash anyway', 'It was fake. Of course it was.', { money: -4000, stress: 6 }),
  ]),
  ev('money_bulk', 'money', { relAbove: ['hustle_partner', 10] }, 'Bulk buying', 'Kelechi suggests buying stock in bulk at the market in Benin. "Profit guaranteed."', [
    c('Go with him (₦3,000)', 'You came back with sacks of stock.', { money: -3000, rel: { kelz: 3 }, energy: -6, quest: 'kelz_hustle' }, { cost: 3000, followUp: { event: 'money_bulk_profit', days: 3 } }),
    c('Decline', '"You are not serious," he said.', { rel: { kelz: -1 } }),
  ]),
  followup('money_bulk_profit', 'money', 'Bulk paid off', 'The bulk stock sold well. Time to share the profit.', [
    c('Share fairly with Kelechi', 'Partners for life.', { money: 5000, rel: { kelz: 4 } }),
    c('Keep the bigger share', 'More money, less friend.', { money: 6500, rel: { kelz: -8 } }),
  ]),
  ev('money_dept_week', 'money', { semesters: [2], days: [3, 7] }, 'Departmental week', 'Departmental week levy: ₦3,000 for the dinner, T-shirt and "logistics".', [
    c('Pay it', 'You got a T-shirt two sizes too big. Proud.', { money: -3000, rel: { course_rep: 3 }, stress: -3 }, { cost: 3000 }),
    c('Do not pay', 'Your name is on the "defaulters" list in the group chat.', { rel: { course_rep: -2 }, stress: 2 }),
  ]),
  ev('money_class_dues', 'money', { days: [2, 6] }, 'Class dues', 'Tobi is collecting class dues (₦1,000) for handout photocopies.', [
    c('Pay', 'Receipt issued on a sheet of exercise book.', { money: -1000, rel: { course_rep: 3 } }, { cost: 1000 }),
    c('"I will pay later"', 'Later never comes. Tobi remembers.', { rel: { course_rep: -2 } }),
  ]),
  ev('money_found', 'money', { places: LECTURES }, 'Found money', 'You found ₦1,000 on the floor of the lecture hall.', [
    c('Keep it', 'Finders keepers.', { money: 1000 }),
    c('Give it to the course rep', 'Tobi announced your honesty in the group.', { rel: { course_rep: 4, coursemate: 1 }, stress: -2 }),
  ]),
  ev('money_cracked_screen', 'money', {}, 'Cracked screen', 'You dropped your phone and the screen cracked like Harmattan lips.', [
    c('Fix it (₦4,000)', 'Good as new. Almost.', { money: -4000 }, { cost: 4000 }),
    c('Manage it', 'You read your notes through a spider web.', { stress: 4 }),
  ]),

  // ---------------- light and water ----------------
  ev('util_generator', 'utilities', { places: HOSTEL, lightOff: true }, 'Generator hours', 'The hostel generator will run for only two hours tonight.', [
    c('Charge everything', 'Phone, power bank, laptop: all full.', { stress: -2 }),
    c('Read while it lasts', 'Two focused hours.', { knowledge: 3, energy: -4 }),
  ]),
  ev('util_borehole', 'utilities', { waterOff: true }, 'Borehole queue', 'There is a long queue at the borehole.', [
    c('Join the queue', 'You carried two buckets up three floors.', { energy: -6 }),
    c('Buy sachet water', 'Rich people things.', { money: -300, items: { water_bag: 1 } }, { cost: 300 }),
  ]),
  ev('util_mosquitoes', 'utilities', { lightOff: true, slots: ['Night'] }, 'No fan, many mosquitoes', 'No light, no fan, and mosquitoes holding a crusade in your room.', [
    c('Sleep on the corridor', 'Breeze, but more mosquitoes.', { energy: 3, health: -3 }),
    c('Buy a mosquito coil', 'Smoky but peaceful.', { money: -200, health: 2 }),
  ]),
  ev('util_socket_hunt', 'utilities', { lightOff: true }, 'Socket hunting', 'Everyone is hunting for a socket. The library has light.', [
    c('Go and read at the library', 'Charged phone, charged brain.', { knowledge: 2, loseSlots: 1 }),
    c('Buy a power bank (₦2,500)', 'Never again.', { money: -2500, stress: -3 }, { cost: 2500 }),
  ]),
  ev('util_rain', 'utilities', { waterOff: true }, 'Free water', 'It is raining heavily: free water from the roof!', [
    c('Fetch rain water', 'Buckets full. Nature provides.', { items: { water_bag: 1 }, energy: -3 }),
    c('Dance in the rain', 'Joy. Also catarrh.', { stress: -5, health: -2 }),
  ]),
  ev('util_up_nepa', 'utilities', { places: HOSTEL }, 'UP NEPA!', 'Light is back and the whole hostel is shouting "UP NEPA!"', [
    c('Iron your clothes', 'Crisp for tomorrow.', { stress: -2 }),
    c('Charge and chill', 'Fan on full. Bliss.', { energy: 3, stress: -2 }),
  ]),

  // ---------------- health ----------------
  ev('health_malaria', 'health', { healthBelow: 55 }, 'Malaria symptoms', 'Headache, cold, bitter mouth: classic malaria.', [
    c('Go to the clinic now', 'Injection in the buttocks, but you feel better.', { money: -1500, health: 25, loseSlots: 1 }),
    c('Paracetamol and pray', 'It helped a little.', { money: -300, health: 8 }),
  ]),
  ev('health_suya', 'health', { places: ['restaurant'] }, 'Bad suya', 'That suya did not agree with your stomach.', [
    c('Rest it off', 'Toilet and bed, bed and toilet.', { loseSlots: 1, health: 5 }),
    c('ORS and carry on', 'You survived. Barely.', { money: -200, health: -3 }),
  ]),
  ev('health_jogging', 'health', { places: ['field'] }, 'Morning jog', 'Friends invite you to jog round the Sports Complex every morning.', [
    c('Join them', 'Legs on fire, mind clear.', { health: 5, energy: -6, stress: -4, quest: 'fit_life' }),
    c('Maybe next semester', 'Next semester never comes.', { stress: -1 }),
  ]),
  ev('health_skipped_meals', 'health', { hungerAbove: 70 }, 'Stomach orchestra', 'You have been skipping meals. Your stomach is singing in class.', [
    c('Buy bread and egg', 'Saved by the bread man.', { money: -500, hunger: -30 }),
    c('Drink water and endure', 'Water does not count as food.', { hunger: -5, stress: 3 }),
  ]),
  ev('health_free_check', 'health', {}, 'Free health check', 'Free health check at the Medical Centre this week.', [
    c('Go', 'Blood pressure fine. Doctor says eat more vegetables.', { health: 6, loseSlots: 1 }),
    c('Skip it', 'You feel fine. Probably.', { stress: -1 }),
  ]),
  ev('health_overwhelmed', 'health', { stressAbove: 70 }, 'Overwhelmed', 'You feel overwhelmed and you are snapping at everyone.', [
    c('Talk to a friend', 'Zainab listened. You cried a little. It helped.', { stress: -12, rel: { zainab: 3 } }),
    c('Bottle it up', 'Pressure cooker mode.', { stress: 5 }),
  ]),

  // ---------------- friendships ----------------
  ev('fr_party', 'friends', { slots: ['Evening'] }, 'Birthday party', 'A classmate\'s birthday party at the Sports Complex tonight.', [
    c('Go', 'Danced, ate small chops, made friends.', { money: -1000, stress: -10, rel: { coursemate: 4 }, energy: -5 }, { cost: 1000 }),
    c('Stay and read', 'The group chat pictures look fun though.', { knowledge: 2 }),
  ]),
  ev('fr_help_efiko', 'friends', {}, 'The efiko needs help', 'Ifeoma is stuck on a topic you actually understand.', [
    c('Explain it to her', 'She now owes you one, and she knows it.', { rel: { ify: 6 }, knowledge: 2, energy: -3, quest: 'ify_study' }),
    c('Pretend you do not know', 'Small pikin behaviour.', { rel: { ify: -1 } }),
  ]),
  ev('fr_smile', 'friends', { places: ['library', 'field'] }, 'A smile', 'Ejiro smiled at you.', [
    c('Say hi', 'Ten minutes of gist. Your heart is doing gymnastics.', { rel: { ejiro: 5 }, stress: -3 }),
    c('Look away shyly', 'You will think about this for a week.', { stress: 2 }),
  ]),
  ev('fr_shawarma', 'friends', { relAbove: ['love_interest', 35], slots: ['Evening'] }, 'Shawarma date?', 'Ejiro asks if you want to get shawarma this evening.', [
    c('Go', 'Shawarma, gist, and a walk back to the hostel.', { money: -2000, rel: { ejiro: 8 }, stress: -10 }, { cost: 2000 }),
    c('Say you are reading', 'Books will not hug you, but okay.', { rel: { ejiro: -4 }, knowledge: 2 }),
  ]),
  ev('fr_campaign', 'friends', { levels: [2, 6] }, 'Campaign season', 'Comrade Tega wants you on his campaign team. "We move!"', [
    c('Join the team', 'Posters, jingles, and late nights.', { rel: { tega: 6, coursemate: 2 }, energy: -6, setFlag: 'campaigner', quest: 'tega_network' }),
    c('Stay neutral', 'Neutral is also a position.', { stress: -1 }),
  ]),
  ev('fr_fellowship', 'friends', { slots: ['Evening'] }, 'Fellowship', 'Friends invite you to fellowship (or Jumat prayers).', [
    c('Go', 'Peace of mind and free chin chin.', { stress: -8, rel: { coursemate: 2 } }),
    c('Rest', 'Rest is also holy.', { energy: 3 }),
  ]),
  ev('fr_homesick', 'friends', {}, 'Homesick', 'You miss home: your mother\'s soup, your bed, even your noisy siblings.', [
    c('Call home', 'Mummy sent ₦1,000 "for food".', { stress: -6, money: 1000 }),
    c('Hang out with friends', 'Friends are family too.', { stress: -5, money: -500, rel: { coursemate: 2 } }),
  ]),

  // ---------------- travel between sections ----------------
  ev('tr_fare_hike', 'travel', { places: ['busstop'] }, 'Fare don change', 'Keke man: "Fuel don cost. Na ₦300 now."', [
    c('Pay', 'You paid. Inflation is real.', { money: -150 }),
    c('Argue', 'He drove off. You argued with the air.', { energy: -4, stress: 3 }),
  ]),
  ev('tr_keke_full', 'travel', { places: ['busstop'] }, 'Rush hour', 'Every keke is full at rush hour.', [
    c('Squeeze in front with the driver', 'Half your body was outside. You arrived.', { stress: 3 }),
    c('Wait for the next one', 'The next one came twenty minutes later.', { stress: 2, energy: -2 }),
  ]),
  ev('tr_rain_walk', 'travel', { places: ['busstop'] }, 'Caught in the rain', 'The rain started as you crossed between campuses.', [
    c('Buy an umbrella (₦1,500)', 'Dry and fabulous.', { money: -1500 }, { cost: 1500 }),
    c('Enjoy it', 'Soaked, but free.', { stress: -3, health: -3 }),
  ]),
  ev('tr_lecturer_ride', 'travel', { places: ['busstop'] }, 'Free ride', 'A lecturer slows down and offers you a ride.', [
    c('Accept and make conversation', 'She now knows your name. Use this power wisely.', { goodwill: 3, stress: 1 }),
    c('Politely decline', 'You trekked with dignity.', { energy: -3 }),
  ]),
  ev('tr_left_bag', 'travel', { places: ['busstop'] }, 'Bag left behind', 'You left your bag in the keke!', [
    c('Chase the keke', 'Usain Bolt would be proud. You got it.', { energy: -8, stress: 5 }),
    c('Call the keke park', 'They found it. "Something for the boys" cost ₦500.', { money: -500, stress: 2 }),
  ]),

  // ---------------- later years: postings, placements, projects ----------------
  ev('ly_it_late', 'later_years', { courseKind: 'it' }, 'IT overtime', 'Your IT supervisor wants you to stay late every day this week.', [
    c('Work hard', 'Your logbook is glowing.', { goodwill: 6, energy: -8 }),
    c('Leave on time', 'Work-life balance. The supervisor noticed.', { stress: -3, goodwill: -2 }),
  ]),
  ev('ly_it_stipend', 'later_years', { courseKind: 'it' }, 'Stipend', 'The company gives IT students a small stipend.', [
    c('Save it', 'Into the piggy bank.', { money: 5000 }),
    c('Celebrate with friends', 'Small chops for the whole IT crew.', { money: 2000, stress: -6, rel: { coursemate: 3 } }),
  ]),
  ev('ly_night_call', 'later_years', { courseKind: 'posting' }, 'Night call', 'You are on night call at the hospital.', [
    c('Stay alert and learn', 'You assisted in your first emergency. Wow.', { knowledge: 5, energy: -12 }),
    c('Sneak a nap', 'The house officer caught you.', { energy: 6, goodwill: -3 }),
  ]),
  ev('ly_ward_round', 'later_years', { courseKind: 'posting' }, 'Ward round', 'The consultant fires questions at you on ward round.', [
    c('Answer confidently', 'Mostly right. He nodded once. Huge.', { goodwill: 5, stress: 4 }),
    c('"I don\'t know, Sir"', 'Honest. He told you to read and come back.', { stress: -1, goodwill: -1 }),
  ]),
  ev('ly_moot', 'later_years', { courseKind: 'moot' }, 'Moot court', 'Moot court: you are defending a tricky case before "the bench".', [
    c('Prepare all night', 'Your submissions were sharp. Objection overruled!', { knowledge: 5, energy: -10 }),
    c('Wing it', 'You cited a case that does not exist.', { stress: 6 }),
  ]),
  ev('ly_court_filing', 'later_years', { courseKind: 'chambers' }, 'Filing errand', 'The senior lawyer sends you to file papers at the High Court.', [
    c('Go', 'Hot sun, long queue, papers filed.', { goodwill: 5, energy: -6 }),
    c('Complain', 'He gave you an even longer errand.', { goodwill: -4, stress: -2 }),
  ]),
  ev('ly_topic', 'later_years', { courseKind: 'seminar' }, 'Topic rejected', 'Your supervisor rejected your project topic. Again.', [
    c('Pick a simpler topic', 'Approved. Peace.', { stress: -3 }),
    c('Defend your topic', 'He said "convince me" and you did, barely.', { stress: 5, knowledge: 2 }),
  ]),
  ev('ly_typist', 'later_years', { courseKind: 'project' }, 'Project typing', 'A business centre offers to type, format and bind your project.', [
    c('Pay ₦5,000', 'Professional work. Stress reduced.', { money: -5000, stress: -6 }, { cost: 5000 }),
    c('Do it yourself', 'Margins, fonts, references: pain.', { energy: -8, stress: 3 }),
  ]),
  ev('ly_placement_letter', 'later_years', { levels: [3, 4] }, 'Placement letter', 'You need an IT or attachment letter from the department.', [
    c('Go early to the office', 'Signed by noon. Miracles happen.', { loseSlots: 1 }),
    c('Ask the course rep to help', 'Tobi collected everyone\'s letters at once.', { rel: { course_rep: 2 }, stress: 2 }),
  ]),
  ev('ly_dinner', 'later_years', { levels: [4, 6], semesters: [2] }, 'Final-year dinner', 'Final-year dinner contribution: ₦5,000.', [
    c('Pay', 'Agbada or gown ready. Memories loading.', { money: -5000, stress: -8, rel: { coursemate: 5 } }, { cost: 5000 }),
    c('Skip it', 'You will see the pictures on Instagram.', { stress: 2 }),
  ]),

  // ---------------- night life ----------------
  ev('nl_bouncer', 'campus', { places: ['nightlife'], slots: ['Night'] }, 'The bouncer', 'The bouncer looks at your shoes and says "not tonight".', [
    c('Slip him ₦1,000', 'The rope lifted like magic.', { money: -1000, stress: -3 }, { cost: 1000 }),
    c('Go to the lounge instead', 'Quieter, cheaper, and the music was better anyway.', { stress: -4 }),
  ]),
  ev('nl_phone', 'campus', { places: ['nightlife'], slots: ['Night'] }, 'Where is my phone?', 'In the middle of the dance floor you reach for your phone. It is not there.', [
    c('Search the whole club', 'Found it under a chair, screen cracked, still alive.', { energy: -8, stress: 6 }),
    c("Call it from a friend's phone", 'Somebody answered: "Na me pick am, come collect for gate." Bless them.', { stress: 3, rel: { coursemate: 2 } }),
  ]),
  ev('nl_drinks', 'campus', { places: ['nightlife'], slots: ['Evening', 'Night'] }, 'One more round?', 'Your friends are shouting "one more round!" again.', [
    c('Order water and dance', 'You were the only sober one. You saw everything.', { money: -300, stress: -4 }),
    c('One more round', 'It was not one more round.', { money: -2500, health: -5, stress: -6 }, { cost: 2500 }),
  ]),
  ev('nl_crush', 'friends', { places: ['nightlife'], relAbove: ['love_interest', 25] }, 'Unexpected', 'Ejiro is here too, and waving at you across the room.', [
    c('Go and dance', 'Best night of the semester.', { rel: { ejiro: 8 }, stress: -10, energy: -6 }),
    c('Wave back and stay cool', 'Mysterious. Maybe too mysterious.', { rel: { ejiro: 2 } }),
  ]),
  ev('nl_hostel_party', 'campus', { places: ['hostel_room'], slots: ['Night'], semesters: [1, 2] }, 'Hostel party', 'There is a birthday party on the next floor with a loud speaker and suya.', [
    c('Join for an hour', 'Suya, gist and dancing in slippers.', { stress: -10, energy: -8, hunger: -10, roommates: 2 }),
    c('Plug your ears and sleep', 'Sleep, but with bass.', { energy: 2 }),
  ]),
  ev('nl_owambe_invite', 'friends', { days: [4, 6] }, 'Owambe invite', "Damilola's cousin is getting married in town this weekend. 'Come and chop!'", [
    c('Say you will come', 'Asoebi not bought, but appetite ready.', { rel: { dami: 4 }, setFlag: 'owambe_invite' }),
    c('Say you have to read', 'Damilola sighed. "Na you sabi."', { knowledge: 1 }),
  ]),
  ev('nl_cab_night', 'travel', { places: ['busstop'], slots: ['Night'] }, 'Night ride', 'The cab driver wants double fare because "night don reach".', [
    c('Pay it', 'Safe home is worth it.', { money: -700 }),
    c('Bargain hard', 'You agreed on a price, eventually.', { money: -300, stress: 4 }),
  ]),
  ev('nl_movie_date', 'friends', { places: ['nightlife'], relAbove: ['love_interest', 40] }, 'Popcorn', 'Ejiro asks if you want to share popcorn.', [
    c('Share and whisper about the plot', 'The film was bad. The company was great.', { money: -800, rel: { ejiro: 6 }, stress: -6 }),
    c('Say you are watching the film', 'Okay, film critic.', { rel: { ejiro: -2 } }),
  ]),

  // ---------------- campus life ----------------
  ev('cam_strike', 'campus', {}, 'Strike rumour', 'Rumour: "Strike is coming next week!"', [
    c('Pack your books', 'There was no strike. You lost reading time.', { knowledge: -2, stress: -3 }),
    c('Keep reading', 'Nothing happened. You were ready.', { knowledge: 2 }),
  ]),
  ev('cam_carnival', 'campus', { slots: ['Afternoon', 'Evening'] }, 'Carnival', 'Departmental carnival: music, food, and dancing.', [
    c('Join', 'Best afternoon this semester.', { stress: -8, money: -500, rel: { coursemate: 2 } }),
    c('Skip it', 'Quiet library. Very quiet.', { knowledge: 1 }),
  ]),
  ev('cam_sanitation', 'campus', { places: HOSTEL, slots: ['Morning'] }, 'Sanitation day', 'Environmental sanitation: every room must be cleaned before 10 a.m.', [
    c('Clean with your roommates', 'Spotless. The porter approved.', { energy: -5, roommates: 2 }),
    c('Hide in the library', 'Your roommates did your share. They noticed.', { knowledge: 2, roommates: -2 }),
  ]),
  ev('cam_scholarship', 'campus', { levels: [2, 6] }, 'Scholarship interview', 'Your department shortlisted you for a small scholarship interview.', [
    c('Attend in your best clothes', 'They liked you! ₦8,000 award.', { money: 8000, stress: 4 }),
    c('Skip it', 'Someone else got it.', { stress: 1 }),
  ], { weight: 0.4, once: true }),
];

export function getEvent(id: string): EventDef | undefined {
  return EVENTS.find((e) => e.id === id);
}
