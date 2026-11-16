// What every building on the planner map IS in the game: its proper name,
// its kind of place and its roles (which offices sit in it, which college
// lectures there, which halls hold the general courses, which hostels are
// playable, which shops sell what).
//
// PLACEHOLDERS: every assignment here is a guess for gameplay, not the real
// campus layout. Each one is listed in DECISIONS.md. Change freely: the rules
// only read this file, they never hard-code a building.
import type { HustleId, OfficeId, PlaceType } from '../game/types';
import type { PlannerKind } from './campusMap';

/** Section names (the planner ids stay the same). */
export const SECTION_NAMES: Record<string, { name: string; short: string }> = {
  ps: { name: '2nd Campus', short: '2nd Campus' },
  ts: { name: 'First Campus', short: 'First Campus' },
  estate: { name: 'Campus Hostel', short: 'Hostel' },
  'section-wwj34r': { name: 'Off-campus', short: 'Off-campus' },
};

export interface BuildingRole {
  name: string;
  type: PlaceType;
  /** Draw it as a different kind of building than the planner said. */
  look?: PlannerKind;
  offices?: OfficeId[];
  /** Colleges whose lectures, practicals or offices are here. */
  colleges?: string[];
  /** One of the big halls for the general courses. */
  gst?: boolean;
  /** Menu id from food.ts. */
  menu?: string;
  /** Shop stock ids from food.ts. */
  stock?: string[];
  hustles?: HustleId[];
  /** Students can be allocated a room here. */
  hostel?: boolean;
  /** Freshers sleep here before allocation. */
  freshers?: boolean;
  /** Placement for industrial training or chambers attachment. */
  placement?: 'it' | 'chambers';
  /** The main Medical Centre (clearance and clinical postings). */
  medicalCentre?: boolean;
  /** The main library (registration). */
  mainLibrary?: boolean;
  /** Night life: what kind of venue. */
  venue?: 'club' | 'lounge' | 'cinema' | 'event_centre';
  /** Gives small student loans. */
  bank?: boolean;
  /** A big hospital (dearer, treats more). */
  hospital?: boolean;
}

export const BUILDING_ROLES: Record<string, BuildingRole> = {
  // ------------------------- 2nd Campus (PS) -------------------------
  'admin-12': { name: 'Senate Building', type: 'admin_office', offices: ['admissions', 'registry'] },
  'admin-tojhg0': { name: "Students' Services Building", type: 'admin_office', offices: ['bursary', 'student_affairs', 'ict'] },
  'library-1': { name: 'University Library', type: 'library', mainLibrary: true, hustles: ['tutoring'] },
  'lecture-2': { name: 'Main Auditorium', type: 'lecture_hall', gst: true },
  'lecture-gujw05': { name: 'Arts and Social Sciences Theatre', type: 'lecture_hall', colleges: ['cass'] },
  'classroom-5': { name: 'Law Block', type: 'lecture_hall', colleges: ['law'] },
  'classroom-6': { name: 'Engineering Block A', type: 'lecture_hall', colleges: ['eng'] },
  'classroom-7': { name: 'Engineering Block B', type: 'lecture_hall', colleges: ['eng'] },
  'classroom-8': { name: 'Business School Block', type: 'lecture_hall', colleges: ['cbms', 'cass'] },
  'classroom-bjwwoz': { name: 'Natural Sciences Block', type: 'lecture_hall', colleges: ['nas'] },
  'faculty-3': {
    name: 'Law, Arts and Business Offices',
    type: 'admin_office',
    offices: ['college_office', 'hod'],
    colleges: ['law', 'cass', 'cbms'],
  },
  'faculty-sib41n': {
    name: 'Engineering and Sciences Offices',
    type: 'admin_office',
    offices: ['college_office', 'hod'],
    colleges: ['eng', 'nas'],
  },
  'lab-4': { name: '2nd Campus Laboratories', type: 'lab', colleges: ['eng', 'nas'] },
  'apartment-cacrhv': { name: 'Staff Quarters', type: 'residence' },
  'business-9': {
    name: 'Business Centre',
    type: 'shop',
    stock: ['photocopy', 'passport', 'receipt', 'manual'],
    hustles: ['typing', 'business_centre'],
  },
  'business-881ryl': { name: "Mama Ngozi's Rice Kiosk", type: 'restaurant', menu: 'rice' },
  'business-i74kis': { name: 'Mallam Musa Suya Spot', type: 'restaurant', menu: 'suya' },
  'business-l01pvx': { name: 'Print and Photocopy Kiosk', type: 'shop', stock: ['photocopy', 'passport', 'receipt'] },
  'business-pdk800': { name: 'Shawarma Corner', type: 'restaurant', menu: 'shawarma' },
  'business-d3z29z': { name: 'POS and Recharge Kiosk', type: 'shop', stock: ['airtime'], hustles: ['pos'] },
  'business-ob1ixr': { name: 'Stationery Kiosk', type: 'shop', stock: ['manual', 'photocopy'] },
  'business-orl5mv': { name: 'Iya Basira Amala Joint', type: 'restaurant', menu: 'amala' },
  'business-bli3h7': { name: 'Puff-Puff and Akara Stand', type: 'restaurant', menu: 'snacks' },
  'business-4ofi4q': { name: 'Phone Accessories Kiosk', type: 'shop', stock: ['airtime', 'padlock'] },
  'business-4s24y1': { name: 'Cold Drinks Kiosk', type: 'restaurant', menu: 'drinks' },
  'busstop-10': { name: '2nd Campus Keke Park', type: 'busstop' },

  // ------------------------- First Campus (TS) -------------------------
  'lab-25': { name: 'Anatomy and Physiology Labs', type: 'lab', colleges: ['chs'] },
  'lab-26': { name: 'Pharmacy Laboratory', type: 'lab', colleges: ['pharm', 'chs'] },
  'lecture-gv6nmr': { name: 'Health Sciences Lecture Theatre', type: 'lecture_hall', colleges: ['chs', 'pharm'] },
  'lecture-h7neph': { name: '1000-Seater Hall', type: 'lecture_hall', gst: true },
  'classroom-33i2tr': { name: 'Basic Medical Sciences Block', type: 'lecture_hall', colleges: ['chs'] },
  'classroom-ukfo2v': {
    name: 'University Medical Centre',
    type: 'clinic',
    look: 'clinic',
    offices: ['medical'],
    medicalCentre: true,
  },
  'classroom-ugn4gn': {
    name: 'Health Sciences and Pharmacy Offices',
    type: 'admin_office',
    look: 'admin',
    offices: ['college_office', 'hod'],
    colleges: ['chs', 'pharm'],
  },
  'classroom-28': { name: 'Pharmacy Block', type: 'lecture_hall', colleges: ['pharm'] },
  'classroom-qhz35x': { name: 'Nursing and Laboratory Science Block', type: 'lecture_hall', colleges: ['chs'] },
  'classroom-29': { name: 'Medical Sciences Block', type: 'lecture_hall', colleges: ['chs'] },
  'library-7vczzt': { name: 'Medical Library', type: 'library', hustles: ['tutoring'] },
  'business-gnunps': { name: 'First Campus Canteen', type: 'restaurant', menu: 'canteen' },
  'busstop-31': { name: 'First Campus Keke Park', type: 'busstop' },

  // ------------------------- Campus Hostel (estate) -------------------------
  'apartment-17': { name: "Freshers' Hall", type: 'hostel_room', hostel: true, freshers: true, hustles: ['snacks'] },
  'apartment-9z4vsj': { name: 'Idia Hall', type: 'hostel_room', hostel: true, hustles: ['snacks'] },
  'apartment-15': { name: 'Emotan Hall', type: 'hostel_room', hostel: true, hustles: ['snacks'] },
  'apartment-fmepg9': { name: 'Ewuare Hall', type: 'hostel_room', hostel: true, hustles: ['snacks'] },
  'apartment-xt3deu': { name: 'Okomu Hall', type: 'hostel_room', hostel: true, hustles: ['snacks'] },
  'apartment-13': { name: 'Ikpoba Hall', type: 'hostel_room', hostel: true, hustles: ['snacks'] },
  'apartment-miwtky': { name: 'Ososo Hall', type: 'hostel_room', hostel: true, hustles: ['snacks'] },
  'apartment-16': { name: 'Uromi Hall', type: 'hostel_room', hostel: true, hustles: ['snacks'] },
  'apartment-18': { name: 'Igun Hall', type: 'hostel_room', hostel: true, hustles: ['snacks'] },
  'apartment-t9zf3i': { name: 'Ogba Hall', type: 'hostel_room', hostel: true, hustles: ['snacks'] },
  'apartment-a203kv': { name: 'Iguobazuwa Hall', type: 'hostel_room', hostel: true, hustles: ['snacks'] },
  'apartment-13u3aj': { name: 'Akoko Hall', type: 'hostel_room', hostel: true, hustles: ['snacks'] },
  'apartment-2mmkkc': { name: 'Ehor Hall', type: 'hostel_room', hostel: true, hustles: ['snacks'] },
  'apartment-33h1o3': { name: 'Ivbiaro Hall', type: 'hostel_room', hostel: true, hustles: ['snacks'] },
  'apartment-6u7uh1': { name: 'Usen Hall', type: 'hostel_room', hostel: true, hustles: ['snacks'] },
  'apartment-ekyo68': { name: 'Ugbowo Hall', type: 'hostel_room', hostel: true, hustles: ['snacks'] },
  'apartment-x685l2': { name: 'Owan Hall', type: 'hostel_room', hostel: true, hustles: ['snacks'] },
  'buka-21': { name: "Mama Blessing's Buka", type: 'restaurant', menu: 'buka' },
  'market-20': { name: 'Campus Hostel Market', type: 'restaurant', menu: 'market', stock: ['noodles', 'garri', 'bread', 'eggs', 'water_bag', 'padlock'] },
  'business-19': { name: 'Provision Shop', type: 'shop', stock: ['noodles', 'garri', 'bread', 'eggs', 'water_bag', 'padlock', 'paracetamol'] },
  'business-4iogyo': { name: 'Hostel Cafeteria', type: 'restaurant', menu: 'cafeteria' },
  'business-22': { name: 'Phone and Data Shop', type: 'shop', stock: ['airtime'], hustles: ['pos'] },
  'business-ilnja3': { name: 'Fresh Cut Barbing Salon', type: 'shop', stock: ['haircut'] },
  'business-y7uwqp': { name: 'Laundry Point', type: 'shop', stock: ['laundry'] },
  'business-bw2fbv': { name: 'Hostel Pharmacy', type: 'shop', stock: ['paracetamol', 'vitamins'] },
  'clinic-j8t6h5': { name: 'Hostel Sick Bay', type: 'clinic' },
  'field-vqyhgf': { name: 'Sports Complex', type: 'field' },
  'gate-8oords': { name: 'Main Gate', type: 'gate' },
  'busstop-23': { name: 'Campus Hostel Keke Park', type: 'busstop' },

  // ------------------------- Off-campus -------------------------
  'apartment-0t9lda': { name: 'Riverside Industrial Park', type: 'workplace', placement: 'it' },
  'apartment-4lg5dh': { name: 'Okoro and Partners Chambers', type: 'workplace', placement: 'chambers' },
  'apartment-8qjr6y': { name: 'Peace Lodge', type: 'residence' },
  'apartment-ypxnm4': { name: "God's Time Lodge", type: 'residence' },
  'apartment-b4nnd9': { name: 'Royal Villa Lodge', type: 'residence' },
  'apartment-qyejym': { name: 'Divine Favour Hostel', type: 'residence' },
  'apartment-8gjahz': { name: 'Success Lodge', type: 'residence' },
  'apartment-36f50f': { name: 'Bright Future Lodge', type: 'residence' },
  'apartment-gr0rwi': { name: 'Unity Villa', type: 'residence' },
};
