/**
 * Page copy that is not tied to a single flavour. Components render this;
 * they never hard-code marketing text of their own.
 *
 * The page is deliberately short, so this file is too: the testimonials that
 * ride the two rails, and the figures above them. Quotes are kept to a single
 * line — the rails read as volume of people, not as an essay each.
 */

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
    quote: 'The first recovery shake I actually look forward to after a long run.',
    flavour: 'vanilla',
    result: 'Sub 3:30 marathon',
  },
  {
    name: 'Rohan Kapoor',
    role: 'Strength coach',
    quote: 'I recommend it because the label is honest, with nothing to explain away.',
    flavour: 'chocolate',
    result: '40+ clients switched',
  },
  {
    name: 'Maya Fernandes',
    role: 'Designer & climber',
    quote: 'It tastes like real strawberries, not sweets.',
    flavour: 'strawberry',
    result: 'Daily since March',
  },
  {
    name: 'Kabir Singh',
    role: 'Functional fitness athlete',
    quote: 'Rich without being heavy, and I am ready for the next session.',
    flavour: 'chocolate',
    result: '5 sessions a week',
  },
  {
    name: 'Leah Thomas',
    role: 'Physiotherapist',
    quote: 'Clean ingredients and a protein dose that actually matters.',
    flavour: 'vanilla',
    result: 'Recommends to patients',
  },
  {
    name: 'Arjun Nair',
    role: 'Road cyclist',
    quote: 'Cold, smooth and gone in a minute. It survived a whole season in my kit bag.',
    flavour: 'strawberry',
    result: '8,000 km season',
  },
];

export const RESULTS_STATS = [
  { value: 4.9, decimals: 1, suffix: '/5', label: 'Average rating' },
  { value: 120, decimals: 0, suffix: 'k+', label: 'Bottles every month' },
  { value: 94, decimals: 0, suffix: '%', label: 'Reorder within 30 days' },
] as const;
