import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge has to be told about the custom scales in `@theme`.
 *
 * Without this it classifies every unknown `text-*` class as a colour, so
 * `text-ink text-label` collapses to `text-label` and the label loses
 * its colour entirely. Keep these lists in step with globals.css.
 */
const FONT_SIZES = ['micro', 'label', 'body', 'lede', 'h1', 'h2', 'h3', 'mega'];

const COLORS = [
  'canvas',
  'pearl',
  'cream',
  'beige',
  'sand',
  'hair',
  'ink',
  'ink-soft',
  'mute',
  'faint',
  'cocoa',
  'cocoa-lit',
  'cocoa-deep',
  'night',
  'vanilla',
  'vanilla-deep',
  'berry',
  'berry-deep',
  'berry-soft',
];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: FONT_SIZES }],
      'text-color': [{ text: COLORS }],
      'bg-color': [{ bg: COLORS }],
      'border-color': [{ border: COLORS }],
      tracking: [{ tracking: ['luxe'] }],
      shadow: [{ shadow: ['soft', 'float', 'lift', 'pill', 'glass'] }],
      animate: [{ animate: ['pulse-soft'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
