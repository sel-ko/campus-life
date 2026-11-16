// The town: a separate part of the map west of Off-campus, joined to it by a
// single long road. Same planner format as campus-layout.json (10 m squares),
// placed at negative columns so the campus layout is untouched.
//
// Streets: avenues on rows 5, 12, 19, 26 and 33; streets on columns -43, -34,
// -25 and -16. Row 19 continues east as the road to Off-campus (columns -15
// to 0), about 150 m of open bush with nothing but the road.
// DRAFT: every name here is made up.
import type { BuildingRole } from './campus-overrides';

export interface TownItem {
  id: string;
  kind: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  floors: number;
}

export const TOWN_SECTION = { id: 'town', name: 'Town', short: 'Town', color: '#9C6ADE', x: -46, y: 5, w: 31, h: 29 };

const roads: string[] = [];
const road = (x: number, y: number) => roads.push(`${x},${y}`);
for (const y of [5, 12, 19, 26, 33]) for (let x = -46; x <= -16; x++) road(x, y);
for (const x of [-43, -34, -25, -16]) for (let y = 5; y <= 33; y++) road(x, y);
// The long road to Off-campus.
for (let x = -15; x <= 0; x++) road(x, 19);
export const TOWN_ROADS = [...new Set(roads)];

const items: TownItem[] = [];
const roles: Record<string, BuildingRole> = {};
function add(id: string, kind: string, name: string, x: number, y: number, w: number, h: number, floors: number, role?: Omit<BuildingRole, 'name'>) {
  items.push({ id: `town-${id}`, kind, name, x, y, w, h, floors });
  roles[`town-${id}`] = { name, type: 'residence', ...role };
}

// ---- row 1 (north): penthouse towers, the mall, a big park ----
add('pent-1', 'penthouse', 'Skyline Towers A', -42, 6, 3, 3, 14);
add('pent-2', 'penthouse', 'Skyline Towers B', -38, 6, 4, 3, 11);
add('pent-3', 'penthouse', 'Palm Penthouses', -42, 10, 3, 2, 8);
add('pent-4', 'penthouse', 'Marina Heights', -38, 10, 4, 2, 9);
add('mall', 'mall', 'City Mall', -33, 6, 8, 6, 2, { type: 'shop', menu: 'mall', stock: ['airtime', 'phone_upgrade', 'padlock', 'laundry', 'haircut', 'plant', 'fairy_lights', 'duvet', 'rug_decor', 'poster'] });
add('park-1', 'park', 'Freedom Park', -24, 6, 8, 6, 0, { type: 'field' });

// ---- row 2: bungalows, cars and fuel, shops ----
add('bung-1', 'bungalow', '2 Unity Close', -42, 13, 3, 2, 1);
add('bung-2', 'bungalow', '4 Unity Close', -38, 13, 3, 2, 1);
add('bung-3', 'bungalow', '6 Unity Close', -42, 16, 3, 3, 1);
add('bung-4', 'bungalow', '8 Unity Close', -38, 16, 3, 3, 1);
add('cars', 'carshop', 'Prestige Motors', -33, 13, 4, 3, 1, { type: 'shop', stock: ['car'] });
add('fuel', 'fuel', 'Sunrise Filling Station', -28, 13, 3, 2, 0, { type: 'shop', stock: ['water_bag', 'airtime'] });
add('bank', 'bank', 'Cowrie Savings Bank', -33, 17, 3, 2, 2, { type: 'shop', bank: true });
add('motor-park', 'busstop', 'Town Motor Park', -29, 16, 1, 3, 0, { type: 'busstop' });
add('super', 'supermarket', 'FreshMart Supermarket', -28, 16, 3, 3, 1, { type: 'shop', stock: ['noodles', 'garri', 'bread', 'eggs', 'water_bag', 'paracetamol', 'vitamins'] });
add('phone-1', 'phonestore', 'Gadget World', -24, 13, 2, 2, 1, { type: 'shop', stock: ['airtime', 'phone_upgrade'] });
add('phone-2', 'phonestore', 'Slot and Signal Phones', -21, 13, 2, 2, 1, { type: 'shop', stock: ['airtime', 'phone_upgrade'] });
add('phone-3', 'phonestore', 'Phone Doctor Repairs', -18, 13, 2, 2, 1, { type: 'shop', stock: ['airtime'] });
add('pharm', 'supermarket', 'Town Pharmacy', -24, 16, 2, 2, 1, { type: 'shop', stock: ['paracetamol', 'vitamins'] });
add('kitchen', 'business', "Mama Tee's Kitchen", -21, 16, 2, 2, 1, { type: 'restaurant', menu: 'buka' });
add('suya', 'business', 'Suya Republic', -18, 16, 2, 2, 1, { type: 'restaurant', menu: 'suya' });

// ---- row 3 (south of the avenue): duplexes, night life, hotel and hospital ----
add('dup-1', 'duplex', 'Lekki Gardens Duplex 1', -42, 20, 3, 2, 2);
add('dup-2', 'duplex', 'Lekki Gardens Duplex 2', -38, 20, 3, 2, 2);
add('dup-3', 'duplex', 'Lekki Gardens Duplex 3', -42, 23, 3, 3, 2);
add('dup-4', 'duplex', 'Lekki Gardens Duplex 4', -38, 23, 3, 3, 2);
add('club', 'club', 'Club Afrique', -33, 20, 3, 3, 1, { type: 'nightlife', venue: 'club' });
add('lounge', 'club', 'Sky Lounge', -29, 20, 3, 2, 2, { type: 'nightlife', venue: 'lounge' });
add('cinema', 'cinema', 'Galaxy Cinemas', -33, 24, 4, 2, 2, { type: 'nightlife', venue: 'cinema' });
add('events', 'eventcentre', 'Royal Event Centre', -28, 23, 3, 3, 1, { type: 'nightlife', venue: 'event_centre' });
add('hotel', 'hotel', 'Grand Palm Hotel', -24, 20, 4, 4, 7, { type: 'restaurant', menu: 'hotel' });
add('hospital', 'hospital', 'General Hospital', -19, 20, 3, 3, 3, { type: 'clinic', hospital: true });
add('grill', 'business', 'Burgers and Grills', -19, 24, 3, 2, 1, { type: 'restaurant', menu: 'shawarma' });

// ---- row 4 (south): more homes and parks ----
add('bung-5', 'bungalow', '1 Palm Avenue', -42, 27, 3, 2, 1);
add('bung-6', 'bungalow', '3 Palm Avenue', -38, 27, 3, 2, 1);
add('bung-7', 'bungalow', '5 Palm Avenue', -42, 30, 3, 3, 1);
add('bung-8', 'bungalow', '7 Palm Avenue', -38, 30, 3, 3, 1);
add('park-2', 'park', 'Estate Park', -33, 27, 3, 6, 0, { type: 'field' });
add('dup-5', 'duplex', 'Royal Court Duplex', -29, 27, 3, 2, 2);
add('dup-6', 'duplex', 'Emerald Duplex', -29, 30, 3, 3, 2);
add('park-3', 'park', 'Lakeside Park', -24, 27, 4, 6, 0, { type: 'field' });
add('pent-5', 'penthouse', 'Lake View Penthouses', -19, 27, 3, 3, 12);
add('corner', 'supermarket', 'Corner Shop', -19, 31, 2, 2, 1, { type: 'shop', stock: ['noodles', 'bread', 'water_bag'] });

// ---- the west edge: woodland ----
for (const [i, y] of [6, 13, 20, 27].entries()) {
  items.push({ id: `town-wood-${i}`, kind: 'trees', name: 'Trees / garden', x: -46, y, w: 3, h: 6, floors: 0 });
}

export const TOWN_ITEMS = items;
export const TOWN_ROLES = roles;
