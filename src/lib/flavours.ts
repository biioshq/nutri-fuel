import { BOTTLES, type BottleAsset } from '@/lib/media';

export type FlavourId = keyof typeof BOTTLES;

export type Flavour = {
  id: FlavourId;
  name: string;
  /** The line printed beside the bottle in the photography. */
  tagline: string;
  description: string;
  notes: readonly string[];
  volume: string;
  image: BottleAsset;
  nutrition: {
    protein: number;
    calories: number;
    sugar: number;
    carbs: number;
    fat: number;
  };
  /**
   * The flavour's own colour, used only as an accent: a glow behind the
   * bottle, a tint on hover, a dot beside the name. Plain CSS colours so they
   * can be dropped into inline custom properties.
   */
  tone: {
    accent: string;
    deep: string;
    soft: string;
    glow: string;
  };
};

export const FLAVOURS: readonly Flavour[] = [
  {
    id: 'chocolate',
    name: 'Chocolate',
    tagline: 'Richer taste. Stronger you.',
    description:
      'Dutch-processed cocoa, slow-blended into a velvet body. Deep and indulgent, with a finish that is never chalky.',
    notes: ['Dutch cocoa', 'Velvet finish', 'Post-training'],
    volume: '300 ml',
    image: BOTTLES.chocolate,
    nutrition: { protein: 25, calories: 170, sugar: 3, carbs: 7, fat: 3.5 },
    tone: {
      accent: '#8a5a40',
      deep: '#2a1b13',
      soft: '#f3e9e1',
      glow: 'rgb(138 90 64 / 0.42)',
    },
  },
  {
    id: 'vanilla',
    name: 'Vanilla',
    tagline: 'Simple ingredients. Stronger days.',
    description:
      'Real vanilla bean over a clean, creamy base. The quiet classic, smooth enough for every morning and rich enough for after.',
    notes: ['Vanilla bean', 'Creamy', 'All-day'],
    volume: '300 ml',
    image: BOTTLES.vanilla,
    nutrition: { protein: 25, calories: 160, sugar: 3, carbs: 6, fat: 3 },
    tone: {
      accent: '#b8976a',
      deep: '#4f3f2c',
      soft: '#f7f0e3',
      glow: 'rgb(210 186 146 / 0.55)',
    },
  },
  {
    id: 'strawberry',
    name: 'Strawberry',
    tagline: 'Real ingredients. Brighter tomorrows.',
    description:
      'Sun-ripened strawberries and a soft cream body. Bright, fresh and gently sweet, like summer with 25 grams of protein.',
    notes: ['Real strawberry', 'Fresh & light', 'Anytime'],
    volume: '300 ml',
    image: BOTTLES.strawberry,
    nutrition: { protein: 25, calories: 150, sugar: 3, carbs: 6, fat: 2.5 },
    tone: {
      accent: '#df8795',
      deep: '#8f3a4c',
      soft: '#fbe7ea',
      glow: 'rgb(223 135 149 / 0.5)',
    },
  },
];
