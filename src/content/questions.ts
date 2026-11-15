// The entrance test bank: easy, timeless general knowledge. Ten are drawn at
// random for each new game. DRAFT: check and extend freely.
import type { Question } from '../game/contentTypes';

type Topic = Question['topic'];
let n = 0;
function q(topic: Topic, text: string, options: [string, string, string, string], answer: 0 | 1 | 2 | 3): Question {
  n += 1;
  return { id: `q${n}`, topic, q: text, options, answer, draft: true };
}

export const QUESTIONS: Question[] = [
  // ---- Nigeria and general knowledge ----
  q('general', 'What is the capital of Nigeria?', ['Lagos', 'Abuja', 'Kano', 'Ibadan'], 1),
  q('general', 'In which year did Nigeria become independent?', ['1957', '1960', '1963', '1970'], 1),
  q('general', 'How many states does Nigeria have?', ['30', '36', '37', '19'], 1),
  q('general', 'What colours are on the Nigerian flag?', ['Green and white', 'Green and yellow', 'Red and white', 'Green, white and red'], 0),
  q('general', "What is Nigeria's currency?", ['Cedi', 'Naira', 'Rand', 'Shilling'], 1),
  q('general', 'What is the capital of Edo State?', ['Asaba', 'Auchi', 'Benin City', 'Warri'], 2),
  q('general', 'The university town is in which state?', ['Delta', 'Ondo', 'Edo', 'Kogi'], 2),
  q('general', 'What is the title of the traditional ruler of the Benin Kingdom?', ['Emir', 'Obi', 'Oba', 'Ooni'], 2),
  q('general', 'Where was crude oil first found in commercial quantity in Nigeria, in 1956?', ['Oloibiri', 'Bonny', 'Escravos', 'Port Harcourt'], 0),
  q('general', "What is Nigeria's national motto?", ['One Nigeria, One Destiny', 'Unity and Faith, Peace and Progress', 'Peace, Unity and Freedom', 'Faith and Hope'], 1),
  q('general', 'Who wrote the novel "Things Fall Apart"?', ['Wole Soyinka', 'Chinua Achebe', 'Ngugi wa Thiong\'o', 'Cyprian Ekwensi'], 1),
  q('general', 'Which Nigerian won the Nobel Prize in Literature in 1986?', ['Chinua Achebe', 'Ben Okri', 'Wole Soyinka', 'J. P. Clark'], 2),
  q('general', 'In which year were the Northern and Southern Protectorates joined to form Nigeria?', ['1900', '1914', '1922', '1960'], 1),
  q('general', "In which year did Abuja officially become Nigeria's capital instead of Lagos?", ['1976', '1985', '1991', '1999'], 2),
  q('general', "Who was Nigeria's first President (ceremonial)?", ['Obafemi Awolowo', 'Nnamdi Azikiwe', 'Ahmadu Bello', 'Tafawa Balewa'], 1),
  q('general', "Who was Nigeria's first Prime Minister?", ['Abubakar Tafawa Balewa', 'Nnamdi Azikiwe', 'Herbert Macaulay', 'Yakubu Gowon'], 0),
  q('general', 'Zuma Rock is in which state?', ['Niger', 'Ogun', 'Plateau', 'Kaduna'], 0),
  q('general', 'Yankari Game Reserve is in which state?', ['Borno', 'Bauchi', 'Kwara', 'Taraba'], 1),
  q('general', 'Olumo Rock is in which city?', ['Ibadan', 'Ilorin', 'Abeokuta', 'Akure'], 2),
  q('general', 'Obudu Mountain Resort is in which state?', ['Cross River', 'Akwa Ibom', 'Enugu', 'Benue'], 0),
  q('general', 'Where is the headquarters of the African Union?', ['Abuja', 'Nairobi', 'Addis Ababa', 'Cairo'], 2),
  q('general', 'The ECOWAS Commission has its headquarters in which city?', ['Accra', 'Abuja', 'Dakar', 'Lomé'], 1),

  // ---- basic science ----
  q('science', 'What is the chemical formula of water?', ['CO2', 'H2O', 'O2', 'NaCl'], 1),
  q('science', 'What is the chemical symbol for sodium?', ['So', 'Sd', 'Na', 'S'], 2),
  q('science', 'Which gas do green plants take in to make food?', ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'], 2),
  q('science', 'Which organ pumps blood round the body?', ['Liver', 'Heart', 'Lungs', 'Kidney'], 1),
  q('science', 'Malaria is spread by the bite of which insect?', ['Housefly', 'Tsetse fly', 'Female Anopheles mosquito', 'Cockroach'], 2),
  q('science', 'At sea level, water boils at:', ['50°C', '90°C', '100°C', '120°C'], 2),
  q('science', 'Which is the largest planet in our solar system?', ['Earth', 'Saturn', 'Jupiter', 'Mars'], 2),
  q('science', 'What is the SI unit of force?', ['Joule', 'Newton', 'Watt', 'Pascal'], 1),
  q('science', 'A solution with a pH of 7 is:', ['Acidic', 'Neutral', 'Alkaline', 'Salty'], 1),
  q('science', 'How many bones are in the adult human body?', ['106', '206', '306', '186'], 1),
  q('science', 'Lack of vitamin C causes:', ['Rickets', 'Scurvy', 'Night blindness', 'Beriberi'], 1),
  q('science', 'What is the chemical symbol for iron?', ['Ir', 'In', 'Fe', 'I'], 2),
  q('science', 'Which part of the cell is called its "powerhouse"?', ['Nucleus', 'Mitochondrion', 'Cell wall', 'Ribosome'], 1),
  q('science', 'What is the SI unit of electrical resistance?', ['Volt', 'Ampere', 'Ohm', 'Coulomb'], 2),
  q('science', 'Which planet is closest to the Sun?', ['Venus', 'Mercury', 'Mars', 'Earth'], 1),
  q('science', 'Water freezes at:', ['0°C', '10°C', '-10°C', '4°C'], 0),

  // ---- maths ----
  q('maths', 'What is 12 × 12?', ['124', '144', '132', '154'], 1),
  q('maths', 'What is 15% of ₦2,000?', ['₦150', '₦200', '₦300', '₦350'], 2),
  q('maths', 'What is the square root of 169?', ['11', '12', '13', '14'], 2),
  q('maths', 'If 3x + 2 = 11, what is x?', ['2', '3', '4', '5'], 1),
  q('maths', 'What is the perimeter of a square with sides of 6 cm?', ['12 cm', '24 cm', '36 cm', '18 cm'], 1),
  q('maths', 'What is the LCM of 4 and 6?', ['2', '10', '12', '24'], 2),
  q('maths', 'What is the HCF of 12 and 18?', ['3', '6', '9', '36'], 1),
  q('maths', 'What is 2 to the power of 5?', ['10', '16', '25', '32'], 3),
  q('maths', '₦1,200 is shared between two friends in the ratio 1:2. What is the bigger share?', ['₦400', '₦600', '₦800', '₦900'], 2),
  q('maths', 'The angles in a triangle add up to:', ['90°', '180°', '270°', '360°'], 1),
  q('maths', 'Which fraction is equal to 0.75?', ['1/4', '2/3', '3/4', '7/5'], 2),
  q('maths', 'What is the area of a room 8 m long and 5 m wide?', ['13 m²', '26 m²', '40 m²', '45 m²'], 2),
  q('maths', 'A keke ride costs ₦150. How much do four rides cost?', ['₦450', '₦550', '₦600', '₦650'], 2),
  q('maths', 'What is 1,000 ÷ 8?', ['115', '125', '135', '150'], 1),

  // ---- English ----
  q('english', 'What is the plural of "child"?', ['Childs', 'Childrens', 'Children', 'Childes'], 2),
  q('english', 'Which spelling is correct?', ['Acommodation', 'Accomodation', 'Accommodation', 'Acomodation'], 2),
  q('english', 'Choose the word opposite in meaning to "scarce":', ['Rare', 'Abundant', 'Small', 'Costly'], 1),
  q('english', 'Fill the gap: "She ___ to school every day."', ['go', 'goes', 'going', 'gone'], 1),
  q('english', 'Choose the word nearest in meaning to "diligent":', ['Lazy', 'Hardworking', 'Clever', 'Rich'], 1),
  q('english', 'What is the plural of "mouse" (the animal)?', ['Mouses', 'Mice', 'Mouse', 'Meese'], 1),
  q('english', 'In standard English, "furniture" is:', ['A countable noun', 'An uncountable noun', 'A verb', 'An adjective'], 1),
  q('english', 'What is the past tense of "go"?', ['Goed', 'Gone', 'Went', 'Going'], 2),
  q('english', 'Choose the word nearest in meaning to "begin":', ['End', 'Start', 'Pause', 'Delay'], 1),
  q('english', 'Which of these is a verb?', ['Quickly', 'Beautiful', 'Run', 'Happiness'], 2),

  // ---- geography ----
  q('geography', 'Which is the largest continent?', ['Africa', 'Asia', 'Europe', 'South America'], 1),
  q('geography', 'Which is the largest ocean?', ['Atlantic', 'Indian', 'Pacific', 'Arctic'], 2),
  q('geography', 'The line of latitude 0° is called the:', ['Prime Meridian', 'Equator', 'Tropic of Cancer', 'Date Line'], 1),
  q('geography', 'What is the largest desert in Africa?', ['Kalahari', 'Namib', 'Sahara', 'Sahel'], 2),
  q('geography', 'What is the longest river in Nigeria?', ['River Benue', 'River Niger', 'River Ogun', 'Cross River'], 1),
  q('geography', 'The rivers Niger and Benue meet at which town?', ['Lokoja', 'Onitsha', 'Makurdi', 'Jebba'], 0),
  q('geography', "Which country is Nigeria's western neighbour?", ['Ghana', 'Cameroon', 'Benin Republic', 'Togo'], 2),
  q('geography', 'Which lake is shared by Nigeria, Niger, Chad and Cameroon?', ['Lake Kainji', 'Lake Chad', 'Lake Volta', 'Lake Victoria'], 1),
  q('geography', 'The dry, dusty wind that blows from the Sahara in the dry season is called:', ['Monsoon', 'Harmattan', 'Sirocco', 'Trade breeze'], 1),
  q('geography', 'Which ocean is on Nigeria\'s coast?', ['Indian Ocean', 'Pacific Ocean', 'Atlantic Ocean', 'Arctic Ocean'], 2),
  q('geography', 'Nigeria is in which part of Africa?', ['East Africa', 'West Africa', 'North Africa', 'Southern Africa'], 1),
  q('geography', 'How many days are in a leap year?', ['364', '365', '366', '367'], 2),
];
