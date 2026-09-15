import type { CSSProperties } from 'react';
import { LOGO_MARK } from '@/lib/media';
import { SITE } from '@/lib/site';
import { cn } from '@/lib/utils';

type LogoProps = {
  className?: string;
  /** Hide the wordmark and show the mark alone. */
  markOnly?: boolean;
};

/**
 * The brand mark and the wordmark.
 *
 * The mark is painted as a CSS mask filled with `currentColor` rather than
 * shown as an image, so the one file reads cream on the smoked nav over the
 * film and ink on white — the logo simply takes its parent's text colour.
 */
const MARK_STYLE: CSSProperties = {
  aspectRatio: `${LOGO_MARK.width} / ${LOGO_MARK.height}`,
  WebkitMaskImage: `url(${LOGO_MARK.src})`,
  maskImage: `url(${LOGO_MARK.src})`,
  WebkitMaskSize: 'contain',
  maskSize: 'contain',
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
  WebkitMaskPosition: 'center',
  maskPosition: 'center',
};

export function Logo({ className, markOnly = false }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <span aria-hidden className="block h-6 shrink-0 bg-current" style={MARK_STYLE} />
      {markOnly ? (
        <span className="sr-only">{SITE.name}</span>
      ) : (
        <span className="font-display text-[0.95rem] leading-none font-normal tracking-[0.34em]">
          {SITE.wordmark}
        </span>
      )}
    </span>
  );
}
