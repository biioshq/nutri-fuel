'use client';

import { useRef, useState } from 'react';
import { useSmoothScroll } from '@/components/layout/SmoothScroll';
import { Logo } from '@/components/ui/Logo';
import { Dumbbell, Kettlebell, Shaker } from '@/components/ui/illustrations';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useIsoLayoutEffect } from '@/hooks/useIsoLayoutEffect';
import { useMotionOK } from '@/hooks/useMediaQuery';
import { markLoadingDone } from '@/lib/loading';
import { SITE } from '@/lib/site';

/** Nothing is allowed to hold the page longer than this. */
const MAX_WAIT = 6000;
/** Long enough to read as a considered arrival rather than a flash. */
const MIN_SHOW = 1600;

/**
 * LOADING SCREEN
 *
 * A shaker that fills while the page loads, with a dumbbell and a kettlebell
 * keeping it company. All three are the house drawings from
 * `@/components/ui/illustrations` — inline SVG, so no image is fetched to show
 * that images are still being fetched — and `drawClass` starts every line
 * undrawn, so the illustration assembles rather than appears.
 *
 * The bar, the percentage and the liquid all read one progress value: it eases
 * toward 90% on its own, then resolves to 100% once the fonts and the window
 * have actually finished (or `MAX_WAIT` passes, because a loading screen that
 * outlives its page is just a blank screen).
 *
 * The curtain lifts on `power4.inOut` and `markLoadingDone()` fires as it
 * starts, so the hero's own entrance plays into the opening gap rather than
 * behind a closed door.
 */
export function Loader() {
  const [visible, setVisible] = useState(true);

  const rootRef = useRef<HTMLDivElement>(null);
  const percentRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const liquidRef = useRef<SVGGElement>(null);

  const motionOK = useMotionOK();
  const { stop, start } = useSmoothScroll();

  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // Reduced motion: no theatre, no wait — hand the page straight over.
    if (!motionOK) {
      markLoadingDone();
      setVisible(false);
      start();
      return;
    }

    stop();
    window.scrollTo(0, 0);

    const startedAt = Date.now();
    let finished = false;
    let guard = 0;

    const ctx = gsap.context(() => {
      const progress = { value: 0 };

      const render = () => {
        const pct = Math.round(progress.value * 100);
        if (percentRef.current) percentRef.current.textContent = String(pct).padStart(2, '0');
        if (barRef.current) barRef.current.style.transform = `scaleX(${progress.value})`;
        // The shaker fills from its foot: the liquid block is taller than the
        // bottle and is simply slid up behind the clip as the number climbs.
        if (liquidRef.current) {
          liquidRef.current.style.transform = `translateY(${(1 - progress.value * 0.92) * 150}px)`;
        }
      };
      render();

      // --- The drawing assembles itself ----------------------------------
      // The lines go on first and the liquid only appears once the bottle
      // exists to hold it — otherwise, mid-draw, the fill reads as a slab
      // floating in space.
      gsap
        .timeline()
        .fromTo(
          '.load-draw',
          { strokeDashoffset: 1.02 },
          { strokeDashoffset: 0, duration: 0.85, stagger: 0.035, ease: 'power2.inOut' },
          0
        )
        .fromTo('.load-brand', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.9 }, 0.1)
        .fromTo('.load-liquid', { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.5)
        .fromTo(
          '.load-meta',
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.9, stagger: 0.08 },
          0.35
        )
        .fromTo(
          '.load-ball',
          { opacity: 0, scale: 0 },
          { opacity: 0.75, scale: 1, duration: 0.6, ease: 'power3.out', transformOrigin: '50% 50%' },
          0.75
        );

      // Idle: the weights breathe, the bubbles rise.
      gsap.to('.load-float', {
        y: -7,
        rotate: (i: number) => (i % 2 ? 2.5 : -2.5),
        duration: 2.4,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        stagger: 0.35,
      });
      gsap.to('.load-bubble', {
        y: -54,
        opacity: 0,
        duration: 2.2,
        ease: 'power1.out',
        repeat: -1,
        stagger: 0.5,
      });

      // --- Progress -------------------------------------------------------
      gsap.to(progress, { value: 0.9, duration: 1.6, ease: 'power2.out', onUpdate: render });

      const leave = () => {
        if (finished) return;
        finished = true;
        window.clearTimeout(guard);

        gsap
          .timeline()
          .to(progress, { value: 1, duration: 0.45, ease: 'power2.inOut', onUpdate: render })
          .to(
            '.load-fade',
            { opacity: 0, y: -16, duration: 0.5, stagger: 0.04, ease: 'power2.in' },
            '>-0.1'
          )
          .to(
            root,
            {
              yPercent: -100,
              duration: 1,
              ease: 'power4.inOut',
              // The page's own entrances start as the curtain begins to lift.
              onStart: markLoadingDone,
              onComplete: () => {
                setVisible(false);
                start();
                ScrollTrigger.refresh();
              },
            },
            '>-0.15'
          );
      };

      const ready = Promise.all([
        document.fonts?.ready ?? Promise.resolve(),
        document.readyState === 'complete'
          ? Promise.resolve()
          : new Promise<void>((resolve) =>
              window.addEventListener('load', () => resolve(), { once: true })
            ),
      ]);

      guard = window.setTimeout(leave, MAX_WAIT);
      void ready.then(() => {
        window.setTimeout(leave, Math.max(0, MIN_SHOW - (Date.now() - startedAt)));
      });
    }, rootRef);

    return () => {
      window.clearTimeout(guard);
      ctx.revert();
      start();
    };
  }, [motionOK, stop, start]);

  if (!visible) return null;

  return (
    <div
      ref={rootRef}
      className="loader-root fixed inset-0 z-100 flex items-center justify-center overflow-hidden bg-canvas"
      role="status"
      aria-live="polite"
      aria-label={`Loading ${SITE.name}`}
    >
      {/* Without scripting, nothing would ever take this away. */}
      <noscript>
        <style dangerouslySetInnerHTML={{ __html: '.loader-root{display:none!important}' }} />
      </noscript>

      {/* The same warm light the page itself is lit by. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 45% at 50% 32%, rgb(246 239 228 / 0.9) 0%, transparent 70%), radial-gradient(70% 50% at 50% 100%, rgb(237 227 214 / 0.6) 0%, transparent 70%)',
        }}
      />

      <div className="relative flex w-full max-w-lg flex-col items-center px-gutter">
        <Logo className="load-brand load-fade text-ink" />

        <div className="load-fade mt-12 flex w-full items-end justify-center gap-[clamp(0.75rem,4vw,2.5rem)] sm:mt-14">
          <Dumbbell
            drawClass="load-draw"
            className="load-float h-[clamp(4rem,14vw,6rem)] w-auto text-cocoa-lit"
          />
          <Shaker
            drawClass="load-draw"
            className="load-float h-[clamp(7.5rem,26vw,11rem)] w-auto text-cocoa"
            fill={{
              ref: liquidRef,
              idPrefix: 'loader',
              liquidClass: 'load-liquid',
              bubbleClass: 'load-bubble',
              ballClass: 'load-ball',
            }}
          />
          <Kettlebell
            drawClass="load-draw"
            className="load-float h-[clamp(4.25rem,15vw,6.5rem)] w-auto text-cocoa-lit"
          />
        </div>

        <div className="load-fade mt-12 flex w-full flex-col items-center sm:mt-14">
          <p className="load-meta flex items-baseline gap-1 font-display text-[clamp(2.25rem,9vw,3.25rem)] leading-none font-extralight tracking-[-0.04em] text-ink tabular-nums">
            <span ref={percentRef}>00</span>
            <span className="text-[0.32em] tracking-[0.2em] text-mute">%</span>
          </p>

          <span aria-hidden className="mt-7 block h-px w-full max-w-xs overflow-hidden bg-hair">
            <span
              ref={barRef}
              className="block h-full w-full origin-left bg-linear-to-r from-cocoa-deep via-cocoa to-cocoa-lit"
              style={{ transform: 'scaleX(0)' }}
            />
          </span>

          <p className="load-meta mt-6 font-sans text-micro tracking-luxe text-mute uppercase">
            {SITE.tagline}
          </p>
        </div>
      </div>
    </div>
  );
}
