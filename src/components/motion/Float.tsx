'use client';

import { useRef, type ReactNode } from 'react';
import { gsap } from '@/lib/gsap';
import { useIsoLayoutEffect } from '@/hooks/useIsoLayoutEffect';
import { useMotionOK } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

type FloatProps = {
  children: ReactNode;
  className?: string;
  /** Total vertical travel, in pixels. */
  amplitude?: number;
  /** Total rotation swing, in degrees. */
  rotate?: number;
  /** Seconds for one half-cycle. */
  duration?: number;
  /**
   * Where in the cycle this instance starts, 0–1. Give siblings different
   * phases so a row of floating objects never bobs in unison.
   */
  phase?: number;
};

/**
 * Idle weightlessness.
 *
 * A sine yoyo on `y` and `rotation` — transform-only, one tween per instance,
 * no render loop of its own. It lives on its own wrapper so a parent can still
 * scale, tilt or scroll-animate the same object without the two fighting over
 * one transform.
 */
export function Float({
  children,
  className,
  amplitude = 16,
  rotate = 1.6,
  duration = 4.2,
  phase = 0,
}: FloatProps) {
  const ref = useRef<HTMLDivElement>(null);
  const motionOK = useMotionOK();

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || !motionOK) return;

    const tween = gsap.fromTo(
      el,
      { y: amplitude / 2, rotation: -rotate / 2 },
      {
        y: -amplitude / 2,
        rotation: rotate / 2,
        duration,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      }
    );
    // Jump into the cycle rather than delaying it, so every instance is
    // already moving on the first frame.
    tween.progress(phase % 1);

    return () => {
      tween.kill();
      gsap.set(el, { clearProps: 'transform' });
    };
  }, [amplitude, rotate, duration, phase, motionOK]);

  return (
    <div ref={ref} className={cn('will-change-transform', className)}>
      {children}
    </div>
  );
}
