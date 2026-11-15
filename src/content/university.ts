// Everything specific to ONE school lives in this file. To add a second school
// later, copy this file and change the content; no other file names a school.
//
// TODO: every value marked "TODO" is a placeholder. Replace it with the names
// students really use.
import type { LocationType } from '../game/types';

export interface CampusLocation {
  id: string;
  name: string;
  type: LocationType;
  /** Map position in metres: x runs west (-) to east (+), z runs north (-) to
   *  south (+). The campus is roughly 60 x 60, centred on 0,0. */
  position: [x: number, z: number];
}

export interface Department {
  id: string;
  name: string;
  faculty: string;
}

export interface UniversityContent {
  fullName: string;
  shortName: string;
  /** School colours, used as accents. Never the crest or logo. */
  colours: { primary: string; accent: string };
  locations: CampusLocation[];
  departments: Department[];
  /** Words and running jokes the events and log lines can use. */
  slang: {
    earlyClass: string;
    fearedLecturer: string;
    powerOut: string;
    portal: string;
    strike: string;
  };
}

export const university: UniversityContent = {
  fullName: 'the University',
  shortName: 'Uni', // TODO: confirm the short name students use

  colours: {
    primary: '#1F4E9C', // TODO: real school colour
    accent: '#F5B83D', // TODO: real school colour
  },

  // TODO: real names and layout. Placeholder layout: gate at the south,
  // hostels to the west, faculty and lecture buildings in the centre,
  // cafeteria beside the library, sports field to the east.
  locations: [
    { id: 'main-lt', name: 'Main Lecture Theatre', type: 'lecture', position: [0, -6] }, // TODO
    { id: 'library', name: 'University Library', type: 'library', position: [12, -16] }, // TODO
    { id: 'faculty', name: 'Faculty Block', type: 'faculty', position: [-2, -18] }, // TODO
    { id: 'cafeteria', name: 'Cafeteria', type: 'cafeteria', position: [18, -6] }, // TODO
    { id: 'male-hostel', name: 'Male Hostel', type: 'hostel', position: [-20, -10] }, // TODO
    { id: 'female-hostel', name: 'Female Hostel', type: 'hostel', position: [-20, 6] }, // TODO
    { id: 'field', name: 'Sports Field', type: 'field', position: [20, 10] }, // TODO
    { id: 'business', name: 'Business Centre', type: 'business', position: [4, 8] }, // TODO
    { id: 'park', name: 'Keke Park', type: 'park', position: [-8, 20] }, // TODO
    { id: 'gate', name: 'Main Gate', type: 'gate', position: [4, 24] }, // TODO
  ],

  // TODO: real faculties and departments.
  departments: [
    { id: 'acc', name: 'Accounting', faculty: 'Business and Management Sciences' },
    { id: 'bus', name: 'Business Administration', faculty: 'Business and Management Sciences' },
    { id: 'eco', name: 'Economics', faculty: 'Arts and Social Sciences' },
    { id: 'mac', name: 'Mass Communication', faculty: 'Arts and Social Sciences' },
    { id: 'law', name: 'Law', faculty: 'Law' },
    { id: 'csc', name: 'Computer Science', faculty: 'Natural and Applied Sciences' },
    { id: 'mcb', name: 'Microbiology', faculty: 'Natural and Applied Sciences' },
    { id: 'med', name: 'Medicine and Surgery', faculty: 'Medicine' },
    { id: 'nsg', name: 'Nursing', faculty: 'Health Sciences' },
    { id: 'phm', name: 'Pharmacy', faculty: 'Pharmacy' },
    { id: 'cve', name: 'Civil Engineering', faculty: 'Engineering' },
  ],

  // TODO: real slang and in-jokes.
  slang: {
    earlyClass: '7 a.m. class',
    fearedLecturer: 'the HOD',
    powerOut: 'NEPA took light',
    portal: 'the portal',
    strike: 'strike',
  },
};

export function getLocation(id: string): CampusLocation | undefined {
  return university.locations.find((l) => l.id === id);
}

export function getDepartment(id: string): Department | undefined {
  return university.departments.find((d) => d.id === id);
}
