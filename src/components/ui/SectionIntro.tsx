'use client';

import { useRef, type ReactNode } from 'react';
import { SplitHeading, type SplitMode } from '@/components/motion/SplitHeading';
import { gsap, useGsap } from '@/hooks/useGsap';
import { useMotionOK } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

type SectionIntroProps = {
  eyebrow: string;
  title: ReactNode;
  /** Id for the heading, so the section can be `aria-labelledby` it. */
  id: string;
  lede?: ReactNode;
  align?: 'left' | 'center';
  tone?: 'light' | 'dark';
  mode?: SplitMode;
  className?: string;
  titleClassName?: string;
};

/**
 * The opening of a section: a live eyebrow, a split-reveal heading and an
 * optional lede. Sections are free to compose their own heads — this exists
 * so the ones that don't need anything unusual all speak the same language.
 */
export function SectionIntro({
  eyebrow,
  title,
  id,
  lede,
  align = 'left',
  tone = 'light',
  mode = 'lines-rise',
  className,
  titleClassName,
}: SectionIntroProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const motionOK = useMotionOK();
  const dark = tone === 'dark';

  useGsap(
    () => {
      if (!motionOK) return;

      gsap
        .timeline({ scrollTrigger: { trigger: rootRef.current, start: 'top 84%', once: true } })
        .fromTo('.intro-eyebrow', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.9 }, 0)
        .fromTo(
          '.intro-rule',
          { scaleX: 0 },
          { scaleX: 1, duration: 1.2, ease: 'power3.inOut' },
          0.1
        )
        .fromTo('.intro-lede', { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 1.2 }, 0.45);
    },
    [motionOK],
    rootRef
  );

  return (
    <div
      ref={rootRef}
      className={cn(
        'flex flex-col',
        align === 'center' ? 'items-center text-center' : 'items-start text-left',
        className
      )}
    >
      <p
        className={cn(
          'intro-eyebrow eyebrow reveal flex items-center gap-3',
          dark && 'text-vanilla'
        )}
      >
        <span
          aria-hidden
          className={cn(
            'intro-rule block h-px w-8 origin-left',
            dark ? 'bg-vanilla/60' : 'bg-cocoa/50'
          )}
        />
        {eyebrow}
      </p>

      <SplitHeading
        as="h2"
        id={id}
        mode={mode}
        className={cn(
          'mt-7 max-w-[14em] text-h2',
          dark && 'text-canvas',
          align === 'center' && 'mx-auto',
          titleClassName
        )}
      >
        {title}
      </SplitHeading>

      {lede && (
        <p
          className={cn(
            'intro-lede reveal mt-8 max-w-[46ch] font-sans text-lede',
            dark ? 'text-canvas/65' : 'text-mute'
          )}
        >
          {lede}
        </p>
      )}
    </div>
  );
}
