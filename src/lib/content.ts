/**
 * Page copy that is not tied to a single flavour. Components render this;
 * they never hard-code marketing text of their own.
 */

export type BenefitIcon = 'protein' | 'sugar' | 'ingredients' | 'natural' | 'recovery' | 'muscle';

export type Benefit = {
  id: BenefitIcon;
  stat: string;
  title: string;
  body: string;
};

export const BENEFITS: readonly Benefit[] = [
  {
    id: 'protein',
    stat: '25g',
    title: 'Complete protein',
    body: 'Milk protein with every essential amino acid, in a single 300 ml bottle.',
  },
  {
    id: 'sugar',
    stat: '3g',
    title: 'Low sugar',
    body: 'Gently sweet, never syrupy. No added cane sugar and nothing to crash from.',
  },
  {
    id: 'ingredients',
    stat: '9',
    title: 'Real ingredients',
    body: 'Nine ingredients you can pronounce. Cocoa, vanilla bean, real strawberry — that is the list.',
  },
  {
    id: 'natural',
    stat: '0',
    title: 'No artificial flavours',
    body: 'No artificial flavours, colours or sweeteners. What you taste is what is in the bottle.',
  },
  {
    id: 'recovery',
    stat: '2-phase',
    title: 'Fast recovery',
    body: 'Fast whey and slow casein work in two waves — refuel now, rebuild through the night.',
  },
  {
    id: 'muscle',
    stat: '5.6g',
    title: 'Muscle support',
    body: '5.6 g of naturally occurring BCAAs per bottle, including 2.7 g of leucine for repair.',
  },
];

export type ComparisonRow = {
  id: string;
  label: string;
  unit: string;
  ours: number;
  theirs: number;
  /** Which direction is the better number. */
  better: 'higher' | 'lower';
  /** Decimal places to count to. */
  decimals?: number;
};

export const COMPARISON = {
  ours: 'Ajay Protein',
  theirs: 'Typical shake',
  footnote: 'Per 300 ml serving. Illustrative comparison with an average ready-to-drink shake.',
  rows: [
    { id: 'protein', label: 'Protein', unit: 'g', ours: 25, theirs: 15, better: 'higher' },
    { id: 'sugar', label: 'Sugar', unit: 'g', ours: 3, theirs: 18, better: 'lower' },
    { id: 'calories', label: 'Calories', unit: 'kcal', ours: 160, theirs: 290, better: 'lower' },
    { id: 'bcaa', label: 'BCAAs', unit: 'g', ours: 5.6, theirs: 2.4, better: 'higher', decimals: 1 },
    { id: 'ingredients', label: 'Ingredients', unit: '', ours: 9, theirs: 27, better: 'lower' },
  ] satisfies ComparisonRow[],
} as const;

export type Testimonial = {
  name: string;
  role: string;
  quote: string;
  flavour: 'chocolate' | 'vanilla' | 'strawberry';
  result: string;
};

export const TESTIMONIALS: readonly Testimonial[] = [
  {
    name: 'Aanya Mehra',
    role: 'Marathon runner',
    quote:
      'I have tried every recovery shake on the shelf. This is the first one I actually look forward to after a long run — and my legs notice the next morning.',
    flavour: 'vanilla',
    result: 'Sub 3:30 marathon',
  },
  {
    name: 'Rohan Kapoor',
    role: 'Strength coach',
    quote:
      'I recommend it because the label is honest. Twenty-five grams of protein, three grams of sugar, and nothing I have to explain away.',
    flavour: 'chocolate',
    result: '40+ clients switched',
  },
  {
    name: 'Maya Fernandes',
    role: 'Designer & climber',
    quote:
      'It tastes like real strawberries, not sweets. Two live in the office fridge and one lives in my climbing bag.',
    flavour: 'strawberry',
    result: 'Daily since March',
  },
  {
    name: 'Kabir Singh',
    role: 'Functional fitness athlete',
    quote:
      'Rich without being heavy. I drink it within ten minutes of finishing a session and I am ready for the next one.',
    flavour: 'chocolate',
    result: '5 sessions a week',
  },
  {
    name: 'Leah Thomas',
    role: 'Physiotherapist',
    quote:
      'Clean ingredients, sensible sugar and a protein dose that actually matters. It is an easy thing to recommend.',
    flavour: 'vanilla',
    result: 'Recommends to patients',
  },
  {
    name: 'Arjun Nair',
    role: 'Road cyclist',
    quote:
      'Cold, smooth and gone in a minute. The only shake that has survived a whole season in my kit bag.',
    flavour: 'strawberry',
    result: '8,000 km season',
  },
];

export const RESULTS_STATS = [
  { value: 4.9, decimals: 1, suffix: '/5', label: 'Average rating' },
  { value: 120, decimals: 0, suffix: 'k+', label: 'Bottles every month' },
  { value: 94, decimals: 0, suffix: '%', label: 'Reorder within 30 days' },
] as const;

export type Venture = {
  id: 'gym' | 'travel';
  eyebrow: string;
  name: string;
  body: string;
  features: readonly string[];
  /** Subject line for the enquiry email. */
  subject: string;
  /** Matches the ground of the venture's own artwork, so the card and the poster read as one surface. */
  theme: 'dark' | 'light';
  accent: string;
  dot: string;
  alt: string;
};

/** The sister brands shown above the footer. */
export const VENTURES: readonly Venture[] = [
  {
    id: 'gym',
    eyebrow: 'Fitness',
    name: 'Ajay Gym',
    body: 'Get fit with Ajay. Strength training, personal coaching and programmes built around your goals — stronger today, better tomorrow, and the natural partner to every bottle.',
    features: ['Personal training', 'Strength & conditioning', 'Nutrition coaching'],
    subject: 'Ajay Gym enquiry',
    theme: 'dark',
    accent: '#f04444',
    dot: '#f04444',
    alt: 'Get Fit with Ajay Gym — stronger today, better tomorrow',
  },
  {
    id: 'travel',
    eyebrow: 'Travel',
    name: 'Ajay Tours and Travels',
    body: 'Explore, discover, travel better. Handpicked holidays, flights, hotels and tours planned end to end, so the only thing left to do is enjoy the journey.',
    features: ['Holiday packages', 'Flights & hotels', 'Custom tours'],
    subject: 'Ajay Tours and Travels enquiry',
    theme: 'light',
    accent: '#12305f',
    dot: '#c9a24a',
    alt: 'Ajay Tours and Travels — explore, discover, travel better',
  },
];

export type Faq = { question: string; answer: string };

export const FAQS: readonly Faq[] = [
  {
    question: 'How much protein is in each bottle?',
    answer:
      'Every 300 ml bottle carries 25 g of complete milk protein, with all nine essential amino acids and 5.6 g of naturally occurring BCAAs.',
  },
  {
    question: 'When should I drink Ajay Protein?',
    answer:
      'Within an hour of training is ideal for recovery, but it works just as well alongside breakfast or as an afternoon snack that keeps you full until dinner.',
  },
  {
    question: 'Does it contain artificial sweeteners or flavours?',
    answer:
      'No. The flavour comes from real cocoa, vanilla bean and strawberry, and a touch of natural sweetness keeps sugar to 3 g per bottle.',
  },
  {
    question: 'Is it suitable if I am sensitive to lactose?',
    answer:
      'Our protein is filtered to be low in lactose, and many people with a mild sensitivity enjoy it without trouble. If you have a milk allergy, please check the full label or speak to your doctor first.',
  },
  {
    question: 'Do I need to refrigerate it?',
    answer:
      'Unopened bottles are shelf-stable for nine months. It is at its best served chilled — once opened, keep it in the fridge and finish it within 24 hours.',
  },
  {
    question: 'How does delivery work?',
    answer:
      'Order in packs of 12 or 24. Orders ship within 24 hours and arrive in two to four working days. Subscribers get free delivery on every order.',
  },
  {
    question: 'Can I pause or cancel my subscription?',
    answer:
      'Any time, from your account, in two taps. No calls, no emails and no cancellation fees.',
  },
];
