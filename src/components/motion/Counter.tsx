'use client';

import { useRef } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useIsoLayoutEffect } from '@/hooks/useIsoLayoutEffect';
import { useMotionOK } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

type CounterProps = {
  value: number;
  /** Rendered before the digits settle and for assistive tech. */
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
  /** Pad to a fixed digit count so the block never reflows mid-count. */
  pad?: number;
  /** Decimal places shown while counting and at rest. */
  decimals?: number;
};

/**
 * A number that counts up as it enters the viewport, inside a mask that it
 * rises out of. Tabular figures keep the width locked, so nothing around it
 * shifts while the digits are still moving.
 */
export function Counter({
  value,
  prefix = '',
  suffix = '',
  duration = 2.1,
  className,
  pad = 0,
  decimals = 0,
}: CounterProps) {
  const maskRef = useRef<HTMLSpanElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);
  const motionOK = useMotionOK();

  const format = (n: number) => n.toFixed(decimals).padStart(pad, '0');

  useIsoLayoutEffect(() => {
    const mask = maskRef.current;
    const number = numberRef.current;
    if (!mask || !number) return;

    if (!motionOK) {
      number.textContent = format(value);
      return;
    }

    const state = { value: 0 };
    number.textContent = format(0);

    const tl = gsap.timeline({ paused: true });
    tl.fromTo(
      number,
      { yPercent: 108, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 1.1, ease: 'expo.out' },
      0
    ).to(
      state,
      {
        value,
        duration,
        ease: 'power2.out',
        onUpdate: () => {
          number.textContent = format(state.value);
        },
      },
      0.12
    );

    const trigger = ScrollTrigger.create({
      trigger: mask,
      start: 'top 88%',
      once: true,
      onEnter: () => tl.play(),
    });

    return () => {
      trigger.kill();
      tl.kill();
    };
  }, [value, duration, pad, decimals, motionOK]);

  return (
    // `lining-nums` matters here: the display face defaults to old-style
    // figures, where a 1 is an I-height glyph and a 9 drops below the
    // baseline — beautiful in running text, unreadable as a statistic.
    <span className={cn('inline-flex items-baseline lining-nums tabular-nums', className)}>
      {prefix}
      <span ref={maskRef} className="split-line">
        <span ref={numberRef} className="inline-block">
          {format(value)}
        </span>
      </span>
      {suffix}
    </span>
  );
}
