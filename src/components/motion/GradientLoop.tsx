'use client';

import { useRef } from 'react';
import { gsap, ScrollTrigger, useGsap } from '@/hooks/useGsap';
import { useMotionOK } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

/**
 * One band. `from`/`to` are the two ends of its vertical gradient, `travel`
 * how far it slides as a share of its own height, and `phase` where in the
 * cycle it starts — authored, never random, so the server and the client
 * paint the same first frame.
 */
type Band = {
  from: string;
  to: string;
  travel: number;
  duration: number;
  phase: number;
  opacity: number;
};

/**
 * Nine bands, tuned for a dark ground: cocoa through vanilla with one quiet
 * berry, and two near-black columns to keep the field from reading as a
 * stripe pattern. No two neighbours share a duration, so the wall never falls
 * into step with itself and repeats visibly.
 */
const BANDS: readonly Band[] = [
  { from: '#2a1b13', to: '#6b4430', travel: 14, duration: 11, phase: 0.0, opacity: 0.55 },
  { from: '#9a6a4f', to: '#160f0a', travel: 18, duration: 8.5, phase: 0.35, opacity: 0.42 },
  { from: '#120c08', to: '#3a2418', travel: 12, duration: 13, phase: 0.6, opacity: 0.6 },
  { from: '#b8976a', to: '#1d130d', travel: 20, duration: 9.5, phase: 0.15, opacity: 0.3 },
  { from: '#3a2418', to: '#9a6a4f', travel: 16, duration: 12, phase: 0.75, opacity: 0.45 },
  { from: '#160f0a', to: '#6b4430', travel: 13, duration: 10, phase: 0.45, opacity: 0.5 },
  { from: '#df8795', to: '#1d130d', travel: 19, duration: 14, phase: 0.2, opacity: 0.18 },
  { from: '#2a1b13', to: '#b8976a', travel: 15, duration: 8, phase: 0.85, opacity: 0.34 },
  { from: '#6b4430', to: '#120c08', travel: 17, duration: 11.5, phase: 0.5, opacity: 0.5 },
];

type GradientLoopProps = {
  className?: string;
  /** Overall strength. The bands are built faint; this scales the whole wall. */
  intensity?: number;
};

/**
 * GRADIENT BACKGROUND LOOP
 *
 * A wall of vertical gradient bands that slide past each other for ever, each
 * on its own clock. The effect people mean by this is usually hard-edged
 * colour blocks; on a dark panel carrying the largest type on the page that
 * would be a poster rather than a background, so the bands here are warm, low
 * in contrast, and softened into one another by a horizontal mask at every
 * seam. What survives is the thing worth having: a surface that is never
 * quite the same twice.
 *
 * Cheap by construction. Nine elements, each animated on `y` alone — no
 * gradient is recomputed and nothing is blurred per frame. Every band is
 * taller than its box by twice its travel, so sliding can never expose an
 * edge, and the whole field holds still under `prefers-reduced-motion`.
 */
export function GradientLoop({ className, intensity = 1 }: GradientLoopProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const motionOK = useMotionOK();

  useGsap(
    () => {
      if (!motionOK) return;

      const tweens = gsap.utils.toArray<HTMLElement>('.grad-band').map((band, i) => {
        const { travel, duration, phase } = BANDS[i % BANDS.length]!;

        const tween = gsap.fromTo(
          band,
          { yPercent: -travel / 2 },
          {
            yPercent: travel / 2,
            duration,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
          }
        );
        // Jump into the cycle rather than delaying it, so the wall is already
        // in motion on the first frame instead of starting as a flat grid.
        tween.progress(phase);
        return tween;
      });

      // Nine endless yoyos are nine tickers: off screen they are pure waste,
      // and this sits in a panel that spends most of the page out of view.
      // The gate keeps them asleep until the panel is actually on screen.
      const gate = ScrollTrigger.create({
        trigger: rootRef.current,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: (self) => tweens.forEach((tween) => tween.paused(!self.isActive)),
        onRefresh: (self) => tweens.forEach((tween) => tween.paused(!self.isActive)),
      });

      return () => {
        gate.kill();
        tweens.forEach((tween) => tween.kill());
      };
    },
    [motionOK],
    rootRef
  );

  return (
    <div
      ref={rootRef}
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      style={{ opacity: intensity }}
    >
      {BANDS.map((band, i) => (
        <div
          key={i}
          className="absolute inset-y-0 will-change-transform"
          style={{
            left: `${(i * 100) / BANDS.length}%`,
            // A hair over a ninth, so neighbours overlap and no seam can show
            // as a bright line between two bands.
            width: `${100 / BANDS.length + 0.4}%`,
            opacity: band.opacity,
            // Softened at both vertical ends and at the sides, which is what
            // turns nine blocks into one moving surface.
            WebkitMaskImage:
              'linear-gradient(90deg, transparent 0%, #000 22%, #000 78%, transparent 100%)',
            maskImage:
              'linear-gradient(90deg, transparent 0%, #000 22%, #000 78%, transparent 100%)',
          }}
        >
          <div
            className="grad-band absolute inset-x-0"
            style={{
              // Taller than the box by the full travel at each end.
              top: `${-band.travel}%`,
              bottom: `${-band.travel}%`,
              backgroundImage: `linear-gradient(180deg, ${band.from} 0%, ${band.to} 100%)`,
            }}
          />
        </div>
      ))}
    </div>
  );
}
