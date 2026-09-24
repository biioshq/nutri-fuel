import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * A four-point star with concave sides — the glint a polished surface throws
 * back. Drawn on a 24-unit square so it sits centred in its own box, and
 * four-fold symmetric, so a quarter turn lands it exactly where it started.
 */
const STAR = 'M12 0C12.7 6.3 17.7 11.3 24 12C17.7 12.7 12.7 17.7 12 24C11.3 17.7 6.3 12.7 0 12C6.3 11.3 11.3 6.3 12 0Z';

type EyebrowProps = ComponentPropsWithoutRef<'p'> & {
  /** `light` on white and cream grounds, `dark` on the cocoa and night ones. */
  tone?: 'light' | 'dark';
  /** Classes for the star's wrapper — the handle a section's timeline animates. */
  markClassName?: string;
};

/**
 * EYEBROW
 *
 * The label every section heading is introduced by. It used to be a short
 * hairline and a word, which is the most generic mark on the web; it is now
 * a chip — a gradient edge, the faintest fill, and a star that catches the
 * light — the way a label is set on a bottle rather than on a page.
 *
 * The look lives in the `eyebrow-chip` utility, so this component only owns
 * structure. Motion is split the usual way: the section's own timeline owns
 * the star's outer wrapper (it spins in with the reveal), while a CSS cycle
 * owns the inner one (a slow twinkle) and the chip's glint — so the two can
 * never fight over one transform, and reduced motion leaves both at rest.
 * The twinkle sits on a span, not the `<svg>`: Chrome can't composite a
 * transform animation on an outer svg at any zoom but 1, so on a HiDPI
 * screen every chip on the page would repaint every frame.
 *
 * Everything else — `className`, `style`, data attributes — lands on the
 * `<p>`, which is what lets the order panel hand it a depth plane.
 */
export function Eyebrow({
  tone = 'light',
  className,
  markClassName,
  children,
  ...props
}: EyebrowProps) {
  return (
    <p
      data-tone={tone}
      className={cn('eyebrow eyebrow-chip', tone === 'dark' && 'text-vanilla', className)}
      {...props}
    >
      <span aria-hidden className={cn('eyebrow-mark', markClassName)}>
        <span className="eyebrow-star">
          <svg viewBox="0 0 24 24">
            <path d={STAR} fill="currentColor" />
          </svg>
        </span>
      </span>
      <span className="eyebrow-label">{children}</span>
    </p>
  );
}
