// Everything specific to ONE school lives in this file. To add a second school
// later, copy this file and change the content; no other file names a school.
//
// TODO: every value marked "TODO" is a placeholder. Replace it with the names
// students really use.
import { campusPlaces, sections, type CampusPlace } from './campusMap';

export interface CampusSite {
  id: string;
  name: string;
  /** What students call it. */
  shortName: string;
  /** Middle of the section on the map. */
  centre: [x: number, z: number];
}

/** A place the player can go: a building from the planner layout. See campusMap.ts. */
export type CampusLocation = CampusPlace;

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

  // Sections and places come from the layout drawn in the Campus Planner
  // (campus-layout.json), via campusMap.ts.
  sites: sections.map((s) => ({
    id: s.id,
    name: s.name,
    shortName: s.short,
    centre: [(s.rect.x0 + s.rect.x1) / 2, (s.rect.z0 + s.rect.z1) / 2] as [number, number],
  })),

  locations: campusPlaces,

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
