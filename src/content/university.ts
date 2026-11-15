// Everything specific to ONE school lives in this file. To add a second school
// later, copy this file and change the content; no other file names a school.
//
// TODO: every value marked "TODO" is a placeholder. Replace it with the names
// students really use.
import type { LocationType } from '../game/types';

export interface CampusSite {
  id: string;
  name: string;
  /** What students call it. */
  shortName: string;
  /** Centre of this site's area on the map, used to group buildings. */
  centre: [x: number, z: number];
}

export interface CampusLocation {
  id: string;
  name: string;
  type: LocationType;
  siteId: string;
  /** Map position in metres: x runs west (-) to east (+), z runs north (-) to
   *  south (+). The campus is roughly 60 x 60, centred on 0,0. */
  position: [x: number, z: number];
}

export interface Department {
  id: string;
  name: string;
  faculty: string;
  /** Which site the department's lectures are at. */
  siteId: string;
}

export interface UniversityContent {
  fullName: string;
  shortName: string;
  /** School colours, used as accents. Never the crest or logo. */
  colours: { primary: string; accent: string };
  sites: CampusSite[];
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
  shortName: 'Uni',

  colours: {
    primary: '#1F4E9C', // TODO: real school colour
    accent: '#F5B83D', // TODO: real school colour
  },

  // The real campus is three separate sites. On the game map they are three
  // clusters joined by roads: Crown Estate to the west, PS to the north-east,
  // TS to the south-east.
  sites: [
    { id: 'ps', name: 'Permanent Site', shortName: 'PS', centre: [14, -14] },
    { id: 'ts', name: 'Temporary Site', shortName: 'TS', centre: [14, 14] },
    { id: 'crown', name: 'Crown Estate', shortName: 'Crown Estate', centre: [-18, 0] },
  ],

  // TODO: real building names, and which site the library, field and gate are at.
  locations: [
    // Permanent Site: arts, business, ICT and law
    { id: 'ps-lt', name: 'PS Lecture Theatre', type: 'lecture', siteId: 'ps', position: [8, -18] }, // TODO
    { id: 'library', name: 'Library', type: 'library', siteId: 'ps', position: [20, -20] }, // TODO
    { id: 'business', name: 'Business Centre', type: 'business', siteId: 'ps', position: [14, -8] }, // TODO
    // Temporary Site: sciences
    { id: 'ts-lt', name: 'TS Lecture Hall', type: 'lecture', siteId: 'ts', position: [8, 12] }, // TODO
    { id: 'faculty', name: 'Faculty Block', type: 'faculty', siteId: 'ts', position: [20, 18] }, // TODO
    { id: 'field', name: 'Sports Field', type: 'field', siteId: 'ts', position: [24, 6] }, // TODO
    // Crown Estate: where everybody lives
    { id: 'male-estate', name: 'Male Students Estate', type: 'hostel', siteId: 'crown', position: [-24, -8] }, // TODO
    { id: 'female-estate', name: 'Female Students Estate', type: 'hostel', siteId: 'crown', position: [-24, 8] }, // TODO
    { id: 'buka', name: 'Estate Buka', type: 'cafeteria', siteId: 'crown', position: [-12, 0] }, // TODO
    { id: 'gate', name: 'Main Gate', type: 'gate', siteId: 'crown', position: [-6, 24] }, // TODO
  ],

  // TODO: real departments. PS holds arts, business, ICT and law;
  // TS holds the sciences.
  departments: [
    { id: 'acc', name: 'Accounting', faculty: 'Business', siteId: 'ps' },
    { id: 'bus', name: 'Business Administration', faculty: 'Business', siteId: 'ps' },
    { id: 'eng', name: 'English', faculty: 'Arts', siteId: 'ps' },
    { id: 'mac', name: 'Mass Communication', faculty: 'Arts', siteId: 'ps' },
    { id: 'csc', name: 'Computer Science', faculty: 'ICT', siteId: 'ps' },
    { id: 'law', name: 'Law', faculty: 'Law', siteId: 'ps' },
    { id: 'mcb', name: 'Microbiology', faculty: 'Sciences', siteId: 'ts' },
    { id: 'bch', name: 'Biochemistry', faculty: 'Sciences', siteId: 'ts' },
    { id: 'phy', name: 'Physics', faculty: 'Sciences', siteId: 'ts' },
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

export function getSite(id: string): CampusSite | undefined {
  return university.sites.find((s) => s.id === id);
}
