'use client';

import { useRef } from 'react';
import { Float } from '@/components/motion/Float';
import { gsap, useGsap } from '@/hooks/useGsap';
import { useMotionOK } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

/**
 * AMBIENT DRIFT
 *
 * A section's worth of weather: four soft blooms and two motes, drifting on
 * their own slow cycles and parallaxing at different rates as the page scrolls
 * past. It is what stops a large, near-empty band from reading as a flat
 * rectangle — depth from nothing but light.
 *
 * Deliberately not a particle system. Six elements, authored by hand:
 *
 * - **Deterministic.** The table below is literal values, never `Math.random`
 *   — the server and the client must agree on the first paint, and a layout
 *   this quiet gains nothing from being different on every visit.
 * - **Cheap.** Transform and opacity only, no `filter: blur` (a blurred layer
 *   is re-rasterised on every scroll frame; a soft radial gradient is not).
 *   Each bloom fades to its own colour at zero alpha rather than to
 *   `transparent`, which in sRGB would drag the midtones toward grey.
 * - **Layered, not stacked.** Scroll parallax owns `y` on the outer wrapper
 *   and the idle cycle owns `y` on `Float`'s own wrapper inside it, so the two
 *   can never fight over one transform.
 *
 * Reduced motion leaves every shape exactly where the table puts it: still a
 * complete composition, simply a still one.
 *
 * The caller owns stacking. Pass `-z-10` on a white section to sit under the
 * content; on a section whose ground is an opaque gradient, render this *after*
 * that gradient instead.
 */

type AmbientShape = {
  kind: 'bloom' | 'mote';
  /** Top-left corner, as a percentage of the layer. */
  x: number;
  y: number;
  /** Blooms: diameter as a percentage of the layer's width. Motes: pixels. */
  size: number;
  /** Resting opacity, on top of the tone's own alpha. */
  opacity: number;
  /** Total scroll parallax travel in pixels; negative rises against the page. */
  travel: number;
  /** Idle cycle: total drift in pixels, its period, and where it starts. */
  drift: number;
  duration: number;
  phase: number;
};

/** Nothing sits in the middle third: that space belongs to whatever the section is saying. */
const SHAPES: readonly AmbientShape[] = [
  { kind: 'bloom', x: -6, y: 2, size: 28, opacity: 0.9, travel: -104, drift: 26, duration: 9, phase: 0.05 },
  { kind: 'bloom', x: 76, y: -8, size: 24, opacity: 0.72, travel: 74, drift: 20, duration: 11, phase: 0.42 },
  { kind: 'bloom', x: 78, y: 58, size: 30, opacity: 0.78, travel: -132, drift: 30, duration: 10, phase: 0.68 },
  { kind: 'bloom', x: 8, y: 64, size: 21, opacity: 0.6, travel: 92, drift: 18, duration: 12, phase: 0.22 },
  { kind: 'mote', x: 22, y: 26, size: 14, opacity: 0.8, travel: -176, drift: 34, duration: 8, phase: 0.8 },
  { kind: 'mote', x: 86, y: 30, size: 10, opacity: 0.66, travel: 138, drift: 26, duration: 9.5, phase: 0.55 },
];

/**
 * Two grounds, two palettes. On white the shapes are warm beige at the very
 * edge of visible — the brief is that a white section stays white.
 */
const TONES = {
  cream: {
    bloom: ['rgb(237 227 214 / 0.5)', 'rgb(237 227 214 / 0)'],
    mote: ['rgb(216 200 180 / 0.7)', 'rgb(216 200 180 / 0)'],
  },
  cocoa: {
    bloom: ['rgb(154 106 79 / 0.26)', 'rgb(154 106 79 / 0)'],
    mote: ['rgb(233 220 196 / 0.4)', 'rgb(233 220 196 / 0)'],
  },
} as const satisfies Record<string, Record<AmbientShape['kind'], readonly [string, string]>>;

export type AmbientTone = keyof typeof TONES;

type AmbientProps = {
  /** `cream` for white and cream sections, `cocoa` for the dark band. */
  tone?: AmbientTone;
  className?: string;
};

export function Ambient({ tone = 'cream', className }: AmbientProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const motionOK = useMotionOK();
  const palette = TONES[tone];

  useGsap(
    () => {
      const root = rootRef.current;
      if (!root || !motionOK) return;

      // One scrubbed tween for all six, split around zero so the layer is at
      // its authored position when the section is centred on screen.
      gsap.fromTo(
        '.amb-parallax',
        { y: (i: number) => -(SHAPES[i]?.travel ?? 0) / 2 },
        {
          y: (i: number) => (SHAPES[i]?.travel ?? 0) / 2,
          ease: 'none',
          scrollTrigger: {
            trigger: root,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
            invalidateOnRefresh: true,
          },
        }
      );
    },
    [motionOK],
    rootRef
  );

  return (
    <div
      ref={rootRef}
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      {SHAPES.map((shape, i) => {
        const [core, edge] = palette[shape.kind];

        return (
          <div
            key={i}
            className="amb-parallax absolute"
            style={{
              left: `${shape.x}%`,
              top: `${shape.y}%`,
              width: shape.kind === 'bloom' ? `${shape.size}%` : `${shape.size}px`,
              aspectRatio: '1',
            }}
          >
            <Float
              className="size-full"
              amplitude={shape.drift}
              rotate={0}
              duration={shape.duration}
              phase={shape.phase}
            >
              <div
                className="size-full rounded-full"
                style={{
                  background: `radial-gradient(circle, ${core} 0%, ${edge} 70%)`,
                  opacity: shape.opacity,
                }}
              />
            </Float>
          </div>
        );
      })}
    </div>
  );
}
