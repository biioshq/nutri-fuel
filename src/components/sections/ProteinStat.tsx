'use client';

import { useRef } from 'react';
import { Ambient } from '@/components/motion/Ambient';
import { Counter } from '@/components/motion/Counter';
import { Float } from '@/components/motion/Float';
import { Dumbbell, Kettlebell } from '@/components/ui/illustrations';
import { gsap, ScrollTrigger, useGsap } from '@/hooks/useGsap';
import { useMotionOK } from '@/hooks/useMediaQuery';

/* Ring geometry — a circle drawn as a path so it starts at twelve o'clock and
   runs clockwise, plus one tick per gram. Rounded to fixed strings so the
   server and client markup match exactly. */
const RING_PATH = 'M100 8a92 92 0 1 1 0 184a92 92 0 1 1 0-184';
const GRAMS = 25;
const TICKS = Array.from({ length: GRAMS }, (_, i) => {
  const angle = ((i + 1) / GRAMS) * Math.PI * 2;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  return {
    x1: (100 + sin * 78).toFixed(2),
    y1: (100 - cos * 78).toFixed(2),
    x2: (100 + sin * 83).toFixed(2),
    y2: (100 - cos * 83).toFixed(2),
  };
});

/** Counter's own defaults, so the ring rides the same curve and stays in step. */
const COUNT = 2.1;
const START = 0.12;

/**
 * The camera for the dial, and how far each part of it stands off the face.
 *
 * Both numbers were cut after the first pass looked wrong: 64px of separation
 * between the numerals and the ring threw the figures visibly off the centre
 * of the circle the moment the disc turned, because two planes that far apart
 * slide against each other by a lot. The camera is longer now as well — a
 * longer lens flattens the perspective, so the ring stays a ring instead of
 * keystoning into an egg.
 *
 * The rule that matters here: the ring and the numerals share a plane
 * (`ring: 0`), so they can never drift apart. Only the bloom sits behind, and
 * a soft cloud is the one thing that can move without anyone measuring it.
 */
const CAMERA = 2200;
const DEPTH = { bloom: -46, ring: 0, numerals: 0 } as const;

/**
 * THE NUMBER
 *
 * One figure, given a whole band of the page: a ring of twenty-five ticks
 * closing around the count as it climbs, a small light riding the head of the
 * arc. Each tick lights at the moment the counter reaches its gram — the
 * inverse of `power2.out`, solved per tick — so the drawing and the digits are
 * the same event rather than two animations that happen to overlap.
 *
 * Deliberately almost wordless: the page says the rest elsewhere — so the
 * space around the ring is carried by the house drawings instead. A dumbbell
 * and a kettlebell stand either side at a tenth of full strength, drifting
 * against the scroll on opposite tracks: enough to give the band a foreground
 * and a background, never enough to be read before the number is.
 */
export function ProteinStat() {
  const rootRef = useRef<HTMLElement>(null);
  const motionOK = useMotionOK();

  useGsap(
    () => {
      const ring = rootRef.current?.querySelector('.ps-ring');
      if (!ring) return;

      // Reduced motion: hand over the finished drawing, no timeline.
      if (!motionOK) {
        gsap.set('.ps-arc', { strokeDashoffset: 0 });
        gsap.set('.ps-tick', { opacity: 1 });
        gsap.set('.ps-head', { opacity: 1, rotation: 360 });
        // Square to the reader, at rest: no tilt, no turn, nothing to scrub.
        gsap.set('.ps-3d', { rotationX: 0, rotationY: 0, z: 0 });
        gsap.set('.ps-dial', { rotation: 0 });
        return;
      }

      const tl = gsap.timeline({ paused: true });
      tl.to('.ps-arc', { strokeDashoffset: 0, duration: COUNT, ease: 'power2.out' }, START)
        .to('.ps-head', { rotation: 360, duration: COUNT, ease: 'power2.out' }, START)
        .to('.ps-head', { opacity: 1, duration: 0.5, ease: 'power2.out' }, START)
        .to(
          '.ps-tick',
          {
            opacity: 1,
            duration: 0.45,
            ease: 'power2.out',
            stagger: (i: number) => Math.max(0, COUNT * (1 - Math.sqrt(1 - (i + 1) / GRAMS)) - 0.08),
          },
          START
        );

      // --- The dial turns through the room as the band passes -----------
      // One scrub owns the whole disc: it comes up out of the page tilted
      // back and off-axis, stands square to the reader as the band reaches
      // the middle of the screen, then tips away again as it leaves. The
      // ticks and the arc turn with it on their own axis, so the gauge reads
      // as a machined disc rotating rather than a picture being skewed.
      const scene = {
        trigger: rootRef.current,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1,
        invalidateOnRefresh: true,
      } as const;

      // Shallow angles on purpose. Past about 12 degrees at this focal length
      // the circle stops reading as a circle seen at an angle and starts
      // reading as a badly drawn ellipse, which is exactly what it looked like
      // at 24. The depth now comes from the travel in z and from the face
      // turning, not from how far the disc is tipped.
      gsap
        .timeline({ defaults: { ease: 'none' }, scrollTrigger: scene })
        .fromTo(
          '.ps-3d',
          { rotationX: 11, rotationY: -5, z: -260 },
          { rotationX: 0, rotationY: 0, z: 30, duration: 0.55 },
          0
        )
        .to('.ps-3d', { rotationX: -7, rotationY: 3.5, z: -60, duration: 0.45 }, 0.55);

      // The face of the gauge, turning on its own axis the whole way past.
      //
      // The origin is set on its own line first, and repeated in both ends of
      // the tween. Passed only in the `to` vars it arrives too late: the `from`
      // state is written at creation with whatever origin the element had, so
      // the ring pivoted around a corner and swung bodily off the numerals
      // sitting still in the middle of it.
      gsap.set('.ps-dial', { svgOrigin: '100 100' });
      gsap.fromTo(
        '.ps-dial',
        { rotation: -18, svgOrigin: '100 100' },
        { rotation: 18, svgOrigin: '100 100', ease: 'none', scrollTrigger: scene }
      );

      // The two drawings drift against the scroll, and against each other: one
      // rises as the band passes, one sinks. Their idle bob lives on `Float`'s
      // own wrapper inside, so the two never fight over one transform.
      gsap.fromTo(
        '.ps-drift',
        { y: (i: number) => (i === 0 ? 34 : -28) },
        {
          y: (i: number) => (i === 0 ? -34 : 28),
          ease: 'none',
          scrollTrigger: {
            trigger: rootRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
            invalidateOnRefresh: true,
          },
        }
      );

      const trigger = ScrollTrigger.create({
        trigger: ring,
        start: 'top 88%',
        once: true,
        onEnter: () => void tl.play(),
      });

      return () => {
        trigger.kill();
        tl.kill();
      };
    },
    [motionOK],
    rootRef
  );

  return (
    <section
      ref={rootRef}
      id="protein"
      aria-labelledby="protein-heading"
      className="relative isolate overflow-hidden bg-cocoa-deep py-section"
    >
      <h2 id="protein-heading" className="sr-only">
        Twenty-five grams of complete protein in every bottle
      </h2>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 55% at 50% 45%, rgb(154 106 79 / 0.32) 0%, transparent 70%), linear-gradient(180deg, #2e1e15 0%, var(--color-cocoa-deep) 55%, #1a110b 100%)',
        }}
      />

      {/* Both of these sit *after* the ground above, which is an opaque
          gradient — behind it they would simply not exist — and before the
          `.shell`, whose own stacking context paints the ring over them. */}
      <Ambient tone="cocoa" />

      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* The weights are hung partly off the edges and clipped by the
            wrapper, so there is no width here for the page to overflow. */}
        <div className="ps-drift absolute top-[6%] left-[-9%] w-[clamp(7rem,25vw,19rem)] opacity-70 sm:left-[-2%] sm:opacity-100 lg:left-[3%]">
          <Float amplitude={18} rotate={2.4} duration={6.8} phase={0.12}>
            <Dumbbell strokeWidth={1.6} className="h-auto w-full text-cream/10" />
          </Float>
        </div>

        {/* Dropped on phones rather than shrunk: at 78vw the ring already owns
            the width, and two drawings beside it would be a crowd. */}
        <div className="ps-drift absolute right-[-4%] bottom-[7%] hidden w-[clamp(8rem,21vw,16.5rem)] sm:block lg:right-[3%]">
          <Float amplitude={22} rotate={-2} duration={7.6} phase={0.6}>
            <Kettlebell strokeWidth={1.6} className="h-auto w-full text-cream/10" />
          </Float>
        </div>
      </div>

      <div className="shell relative flex flex-col items-center">
        {/* The camera sits on a box exactly the size of the dial and centred
            on it. On the section wrapper the vanishing point was away up in
            the middle of the band, so every plane inside the ring was thrown
            sideways as it turned and the numerals drifted off centre. */}
        <div
          className="relative w-[min(78vw,26rem)]"
          style={{ perspective: `${CAMERA}px`, perspectiveOrigin: '50% 50%' }}
        >
          {/* The disc. Scroll owns this transform and nothing else does, so the
              turn can never fight the draw-on or the counter inside it. */}
          <div className="ps-3d" style={{ transformStyle: 'preserve-3d' }}>
            <div
              className="ps-ring relative aspect-square w-full @container"
              style={{ transformStyle: 'preserve-3d' }}
            >
          {/* A soft cocoa bloom, set behind the face so the disc has something
              to cast itself against as it turns. */}
          <div
            aria-hidden
            className="absolute inset-[16%] rounded-full"
            style={{
              transform: `translateZ(${DEPTH.bloom}px)`,
              background:
                'radial-gradient(circle, rgb(154 106 79 / 0.3) 0%, rgb(154 106 79 / 0.08) 50%, transparent 72%)',
            }}
          />

          <svg
            aria-hidden
            viewBox="0 0 200 200"
            fill="none"
            className="absolute inset-0 size-full overflow-visible"
          >
            <defs>
              <linearGradient id="ps-ring-stroke" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f6efe4" />
                <stop offset="55%" stopColor="#e9dcc4" />
                <stop offset="100%" stopColor="#b8976a" />
              </linearGradient>
              <radialGradient id="ps-ring-glow">
                <stop offset="0%" stopColor="#f6efe4" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#f6efe4" stopOpacity="0" />
              </radialGradient>
            </defs>

            <g className="ps-dial">
              <path d={RING_PATH} stroke="rgb(233 220 196 / 0.12)" strokeWidth={0.6} />
            <path
              className="ps-arc"
              d={RING_PATH}
              pathLength={1}
              stroke="url(#ps-ring-stroke)"
              strokeWidth={1.4}
              strokeLinecap="round"
              style={{ strokeDasharray: 1, strokeDashoffset: 1 }}
            />
            <g stroke="#e9dcc4" strokeWidth={0.9} strokeLinecap="round">
              {TICKS.map((tick, i) => (
                <line
                  key={i}
                  className="ps-tick"
                  x1={tick.x1}
                  y1={tick.y1}
                  x2={tick.x2}
                  y2={tick.y2}
                  style={{ opacity: 0.16 }}
                />
              ))}
            </g>
            </g>

            <g className="ps-head" style={{ opacity: 0 }}>
              <circle cx="100" cy="8" r="7" fill="url(#ps-ring-glow)" />
              <circle cx="100" cy="8" r="1.9" fill="#f6efe4" />
            </g>
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {/* The unit is set separately so it can sit small against the
                numerals rather than matching their 27cqi. */}
            <span className="flex items-baseline font-display text-[27cqi] leading-[0.92] font-extralight tracking-[-0.05em] text-cream">
              <Counter value={GRAMS} />
              <span className="text-[0.22em] text-vanilla/70">g</span>
            </span>
            <p className="mt-3 font-sans text-micro font-medium tracking-luxe text-vanilla/55 uppercase">
              Per bottle
            </p>
              </div>
            </div>
          </div>
        </div>

        <ul className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-sans text-micro tracking-luxe text-canvas/45 uppercase">
          {['Complete protein', '3g sugar', 'Zero artificial'].map((point, index) => (
            <li key={point} className="flex items-center gap-6 whitespace-nowrap">
              {index > 0 && (
                <span aria-hidden className="hidden size-1 rounded-full bg-vanilla/40 sm:block" />
              )}
              {point}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
