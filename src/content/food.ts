// Food and shop items. Prices are scaled for play. DRAFT: tune prices and
// add the dishes students actually buy.
import type { MenuItem, ShopItem } from '../game/contentTypes';

const dish = (id: string, name: string, price: number, fills: number, extra: Partial<MenuItem> = {}): MenuItem => ({
  id,
  name,
  price,
  fills,
  draft: true,
  ...extra,
});

/** Every dish sold anywhere on campus. */
export const DISHES: Record<string, MenuItem> = Object.fromEntries(
  [
    dish('jollof', 'Jollof rice and chicken', 1500, 55, { energy: 6, stress: -3 }),
    dish('fried_rice', 'Fried rice and turkey', 2000, 60, { energy: 6, stress: -4 }),
    dish('white_rice', 'White rice and stew', 800, 45, { energy: 4 }),
    dish('beans_dodo', 'Beans and dodo', 700, 45, { energy: 5 }),
    dish('eba_egusi', 'Eba and egusi soup', 900, 55, { energy: 5 }),
    dish('amala_ewedu', 'Amala, ewedu and gbegiri', 900, 55, { energy: 5 }),
    dish('pounded_yam', 'Pounded yam and egusi', 1300, 60, { energy: 6, stress: -2 }),
    dish('yam_egg', 'Boiled yam and egg sauce', 800, 45, { energy: 4 }),
    dish('spaghetti', 'Spaghetti and stew', 700, 40, { energy: 4 }),
    dish('indomie_egg', 'Indomie and fried egg', 900, 40, { energy: 4 }),
    dish('bread_egg', 'Bread and egg', 500, 30, { energy: 3 }),
    dish('akara_pap', 'Akara and pap', 400, 25, { energy: 3 }),
    dish('moi_moi', 'Moi moi', 300, 15, { snack: true }),
    dish('puff_puff', 'Puff-puff (five pieces)', 200, 12, { snack: true }),
    dish('meat_pie', 'Meat pie', 500, 20, { snack: true }),
    dish('chin_chin', 'Chin chin', 300, 10, { snack: true }),
    dish('boli', 'Boli and groundnut', 400, 22, { snack: true }),
    dish('suya', 'Beef suya', 800, 25, { snack: true, stress: -3 }),
    dish('shawarma', 'Chicken shawarma', 2000, 45, { stress: -4 }),
    dish('gala_drink', 'Gala and a soft drink', 400, 18, { snack: true }),
    dish('zobo', 'Zobo drink', 200, 5, { snack: true, stress: -2 }),
    dish('malt', 'Malt drink', 400, 5, { snack: true, energy: 5 }),
    dish('bottled_water', 'Bottled water', 150, 2, { snack: true }),
    dish('hotel_buffet', 'Hotel buffet (all you can eat)', 6000, 75, { energy: 10, stress: -8 }),
    dish('club_sandwich', 'Club sandwich and chips', 3500, 45, { stress: -4 }),
    dish('pizza_slice', 'Pizza (two slices)', 2500, 40, { stress: -3 }),
    dish('ice_cream', 'Ice cream cone', 1200, 8, { snack: true, stress: -5 }),
    dish('smoothie', 'Fruit smoothie', 1500, 10, { snack: true, energy: 6 }),
  ].map((d) => [d.id, d]),
);

/** Which dishes each kind of eatery sells (place roles name a menu id). */
export const MENUS: Record<string, string[]> = {
  buka: [
    'jollof',
    'fried_rice',
    'white_rice',
    'beans_dodo',
    'eba_egusi',
    'amala_ewedu',
    'pounded_yam',
    'yam_egg',
    'spaghetti',
    'akara_pap',
    'moi_moi',
    'zobo',
  ],
  rice: ['jollof', 'fried_rice', 'white_rice', 'spaghetti', 'zobo'],
  suya: ['suya', 'boli', 'bottled_water'],
  shawarma: ['shawarma', 'gala_drink', 'malt'],
  amala: ['amala_ewedu', 'eba_egusi', 'pounded_yam', 'zobo'],
  snacks: ['puff_puff', 'akara_pap', 'chin_chin', 'meat_pie'],
  drinks: ['malt', 'zobo', 'gala_drink', 'bottled_water'],
  canteen: ['jollof', 'white_rice', 'beans_dodo', 'yam_egg', 'indomie_egg', 'meat_pie'],
  cafeteria: ['indomie_egg', 'bread_egg', 'fried_rice', 'beans_dodo', 'spaghetti'],
  market: ['bread_egg', 'puff_puff', 'boli', 'gala_drink'],
  mall: ['pizza_slice', 'shawarma', 'fried_rice', 'ice_cream', 'smoothie', 'malt'],
  hotel: ['hotel_buffet', 'club_sandwich', 'jollof', 'pounded_yam', 'smoothie'],
};

/** Things shops sell. Provisions go in your locker. */
export const SHOP_ITEMS: Record<string, ShopItem> = {
  photocopy: { id: 'photocopy', name: 'Photocopy of your credentials', price: 50, draft: true },
  passport: { id: 'passport', name: 'Passport photographs (4)', price: 600, pack: 4, draft: true },
  receipt: { id: 'receipt', name: 'Printed acceptance receipt and admission letter', price: 150, draft: true },
  course_form: { id: 'course_form', name: 'Printed course registration form', price: 100, draft: true },
  manual: { id: 'manual', name: 'Practical manual', price: 2000, draft: true },
  padlock: { id: 'padlock', name: 'Padlock for your locker', price: 1500, draft: true },
  noodles: { id: 'noodles', name: 'Noodles (2 packs)', price: 500, pack: 2, food: { fills: 30, energy: 3, cook: true, needsWater: true }, draft: true },
  garri: { id: 'garri', name: 'Garri (3 cups)', price: 450, pack: 3, food: { fills: 25, energy: 4, needsWater: true }, draft: true },
  bread: { id: 'bread', name: 'Loaf of bread (2 servings)', price: 700, pack: 2, food: { fills: 22, energy: 2 }, draft: true },
  eggs: { id: 'eggs', name: 'Eggs (3)', price: 450, pack: 3, food: { fills: 10, energy: 4, cook: true }, draft: true },
  water_bag: { id: 'water_bag', name: 'Bag of sachet water', price: 300, draft: true },
  paracetamol: { id: 'paracetamol', name: 'Paracetamol', price: 300, draft: true },
  vitamins: { id: 'vitamins', name: 'Multivitamins', price: 1200, draft: true },
  airtime: { id: 'airtime', name: 'Data bundle (1 week)', price: 500, draft: true },
  haircut: { id: 'haircut', name: 'Haircut or hair-do', price: 1000, draft: true },
  laundry: { id: 'laundry', name: 'Laundry (one bag)', price: 1500, draft: true },
  car: { id: 'car', name: 'Fairly used car (tokunbo)', price: 150000, draft: true },
  phone_upgrade: { id: 'phone_upgrade', name: 'New smartphone', price: 45000, draft: true },
};
