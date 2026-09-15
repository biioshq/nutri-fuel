'use client';

import { useRef, type CSSProperties } from 'react';
import { ArrowRight } from 'lucide-react';
import { BottleImage } from '@/components/media/BottleImage';
import { Float } from '@/components/motion/Float';
import { Magnetic } from '@/components/motion/Magnetic';
import { SplitHeading } from '@/components/motion/SplitHeading';
import { Button } from '@/components/ui/button';
import { gsap, useGsap } from '@/hooks/useGsap';
import { useIsoLayoutEffect } from '@/hooks/useIsoLayoutEffect';
import { useHasFinePointer, useMotionOK } from '@/hooks/useMediaQuery';
import { FLAVOURS } from '@/lib/flavours';
import { subscribePointer } from '@/lib/pointer';
import { STORE_URL } from '@/lib/site';
import { cn } from '@/lib/utils';

/** Fan order: chocolate left, vanilla centre and tallest, strawberry right. */
const FAN = [
  { width: 'w-[26vw] sm:w-[clamp(8rem,17vw,16rem)]', rotate: -9, lift: '' },
  { width: 'w-[31vw] sm:w-[clamp(9.5rem,21vw,19.5rem)]', rotate: 0, lift: '-translate-y-[8%]' },
  { width: 'w-[26vw] sm:w-[clamp(8rem,17vw,16rem)]', rotate: 9, lift: '' },
] as const;

/**
 * FINAL CTA — "Order Your Favourite Flavour"
 *
 * The page's one dark room. It arrives as an inset panel with rounded corners
 * and opens to full bleed as it scrolls in, so the closing call feels like a
 * door opening rather than a colour change. Inside: three faint flavour-tone
 * glows, a soft light that follows the pointer, and the bottles fanned up from
 * the bottom edge, cropped by the panel as if standing just below the frame.
 */
export function FinalCta() {
  const rootRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);

  const motionOK = useMotionOK();
  const finePointer = useHasFinePointer();

  useGsap(
    () => {
      if (!motionOK) return;

      gsap.fromTo(
        panelRef.current,
        { clipPath: 'inset(0% 4% 0% 4% round 3rem)' },
        {
          clipPath: 'inset(0% 0% 0% 0% round 0rem)',
          ease: 'none',
          scrollTrigger: { trigger: panelRef.current, start: 'top 90%', end: 'top 15%', scrub: 1 },
        }
      );

      gsap.fromTo(
        '.cta-bottles',
        { yPercent: 28 },
        {
          yPercent: 0,
          ease: 'none',
          scrollTrigger: { trigger: panelRef.current, start: 'top 70%', end: 'bottom bottom', scrub: 1 },
        }
      );

      gsap
        .timeline({ scrollTrigger: { trigger: '.cta-copy', start: 'top 78%', once: true } })
        .fromTo('.cta-eyebrow', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 1 }, 0)
        .fromTo('.cta-lede', { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 1.2 }, 0.55)
        .fromTo(
          '.cta-action',
          { opacity: 0, y: 26 },
          { opacity: 1, y: 0, duration: 1.2, stagger: 0.1 },
          0.7
        )
        .fromTo('.cta-trust', { opacity: 0 }, { opacity: 1, duration: 1.2 }, 1);
    },
    [motionOK],
    rootRef
  );

  // A soft light that follows the pointer across the panel.
  useIsoLayoutEffect(() => {
    if (!motionOK || !finePointer) return;
    const panel = panelRef.current;
    const light = lightRef.current;
    if (!panel || !light) return;

    const moveX = gsap.quickTo(light, 'x', { duration: 1.1, ease: 'power3.out' });
    const moveY = gsap.quickTo(light, 'y', { duration: 1.1, ease: 'power3.out' });
    let rect: DOMRect | null = null;

    return subscribePointer({
      measure: () => {
        rect = panel.getBoundingClientRect();
      },
      apply: (x, y) => {
        if (!rect || y < rect.top || y > rect.bottom) return;
        moveX(x - rect.left);
        moveY(y - rect.top);
      },
    });
  }, [motionOK, finePointer]);

  return (
    <section
      ref={rootRef}
      id="order"
      aria-labelledby="order-heading"
      className="relative pt-section"
    >
      {/* The dark theme belongs to the panel, not the section: the section's
          top padding is white, and the nav should stay light over it. */}
      <div
        ref={panelRef}
        data-nav-theme="dark"
        className="relative isolate flex min-h-svh flex-col overflow-hidden bg-night text-canvas"
      >
        {/* Flavour light — three pools, each barely there. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background: [
              'radial-gradient(40% 45% at 12% 88%, rgb(138 90 64 / 0.32), transparent 70%)',
              'radial-gradient(46% 40% at 50% 0%, rgb(233 220 196 / 0.14), transparent 70%)',
              'radial-gradient(40% 45% at 88% 88%, rgb(223 135 149 / 0.22), transparent 70%)',
            ].join(','),
          }}
        />
        <div
          ref={lightRef}
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 -z-10 -mt-[22rem] -ml-[22rem] size-[44rem] rounded-full will-change-transform"
          style={{
            background: 'radial-gradient(circle, rgb(246 239 228 / 0.09) 0%, transparent 62%)',
          }}
        />

        <div className="cta-copy shell relative z-10 flex flex-col items-center pt-[clamp(7rem,16vh,11rem)] text-center">
          <p className="cta-eyebrow reveal eyebrow flex items-center gap-3 text-vanilla">
            <span aria-hidden className="h-px w-8 bg-vanilla/50" />
            Order today
            <span aria-hidden className="h-px w-8 bg-vanilla/50" />
          </p>

          <SplitHeading
            as="h2"
            id="order-heading"
            mode="words-flip"
            start="top 80%"
            className="mt-8 max-w-[11em] text-[clamp(3rem,1rem+7.6vw,10rem)] leading-[0.92] tracking-[-0.055em] text-canvas"
          >
            Order Your Favourite Flavour
          </SplitHeading>

          <p className="cta-lede reveal mt-8 max-w-[44ch] font-sans text-lede text-canvas/60">
            Free delivery on every subscription. Pause, swap flavours or cancel any time.
          </p>

          <div className="mt-11 flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:justify-center sm:gap-4">
            <span className="cta-action reveal block">
              <Magnetic className="block w-full sm:w-auto" strength={0.3} padding={36}>
                <Button asChild size="xl" variant="light" className="w-full sm:w-auto">
                  <a href={STORE_URL}>
                    Shop Now
                    <ArrowRight
                      className="size-4 transition-transform duration-300 ease-luxe group-hover/btn:translate-x-1"
                      strokeWidth={1.5}
                    />
                  </a>
                </Button>
              </Magnetic>
            </span>
            <span className="cta-action reveal block">
              <Magnetic className="block w-full sm:w-auto" strength={0.3} padding={36}>
                <Button asChild size="xl" variant="glass" className="w-full sm:w-auto">
                  <a href="#flavours">Compare Flavours</a>
                </Button>
              </Magnetic>
            </span>
          </div>

          <ul className="cta-trust reveal mt-9 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-sans text-micro text-canvas/45 uppercase">
            {['25g protein', '3g sugar', 'Zero artificial flavours'].map((point) => (
              <li key={point} className="flex items-center gap-5 whitespace-nowrap">
                <span aria-hidden className="size-1 rounded-full bg-vanilla/50 first:hidden" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div
          aria-hidden
          className="cta-bottles relative mt-auto flex translate-y-[14%] items-end justify-center gap-[2.5vw] pt-16 sm:gap-[clamp(1rem,3vw,3rem)] sm:pt-20"
        >
          {FLAVOURS.map((flavour, index) => {
            const fan = FAN[index]!;
            return (
              <div key={flavour.id} className={cn('relative', fan.width, fan.lift)}>
                <Float amplitude={14} rotate={1.6} duration={4.6} phase={index * 0.33}>
                  <div style={{ rotate: `${fan.rotate}deg` } as CSSProperties}>
                    <span
                      className="absolute inset-x-[8%] -bottom-[6%] h-[30%] rounded-[50%] blur-2xl"
                      style={{ background: flavour.tone.glow }}
                    />
                    <BottleImage
                      flavour={flavour}                      className="aspect-[3/4] w-full rounded-t-full rounded-b-[2rem] shadow-[0_50px_90px_-40px_rgb(0_0_0/0.9)] ring-1 ring-white/15"
                      alt=""
                    />
                  </div>
                </Float>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
