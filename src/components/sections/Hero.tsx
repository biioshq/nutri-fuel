'use client';

import { useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { BackgroundVideo } from '@/components/media/BackgroundVideo';
import { Magnetic } from '@/components/motion/Magnetic';
import { Button } from '@/components/ui/button';
import { gsap, useGsap } from '@/hooks/useGsap';
import { useMotionOK } from '@/hooks/useMediaQuery';
import { HERO_VIDEO } from '@/lib/media';
import { SHOP_HREF, SITE } from '@/lib/site';

/**
 * HERO
 *
 * The film is the hero. It already shows all three bottles, so nothing is laid
 * across it — no headline, no scrim, no panel. Two buttons stand on their own
 * at the foot of the frame, and that is all.
 *
 * Motion is kept to the camera — the frame settles in on load and drifts as
 * the page scrolls away — and to the buttons, which rise in once the film has
 * landed and fade as you leave. The headline exists for assistive tech and
 * search only.
 */
export function Hero() {
  const rootRef = useRef<HTMLElement>(null);
  const motionOK = useMotionOK();

  useGsap(
    () => {
      if (!motionOK) return;

      gsap.fromTo(
        '.hero-media',
        { opacity: 0, scale: 1.08 },
        { opacity: 1, scale: 1, duration: 2.2, ease: 'power2.out' }
      );

      gsap.fromTo(
        '.hero-cta',
        { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: 1.3, delay: 1, stagger: 0.12, ease: 'expo.out' }
      );

      // A slow dolly as the page leaves. Scaled up while it travels so no
      // edge of the film is ever exposed.
      gsap.to('.hero-parallax', {
        yPercent: 12,
        scale: 1.06,
        ease: 'none',
        scrollTrigger: {
          trigger: rootRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.8,
        },
      });

      // On the wrapper, so this never fights the entrance tween.
      gsap.to('.hero-actions', {
        y: -32,
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: rootRef.current,
          start: 'top top',
          end: '40% top',
          scrub: 0.6,
        },
      });
    },
    [motionOK],
    rootRef
  );

  return (
    <section
      ref={rootRef}
      id="top"
      data-nav-theme="dark"
      aria-labelledby="hero-heading"
      className="hero relative isolate w-full overflow-hidden bg-cocoa-deep"
    >
      {/* Height and framing per screen shape live in globals.css (HERO FRAME):
          full width always, the whole frame wherever the screen allows. */}
      <div className="hero-parallax absolute inset-0 will-change-transform">
        <div className="hero-media reveal absolute inset-0">
          <div className="hero-frame">
            <BackgroundVideo src={HERO_VIDEO} eager className="absolute inset-0" />
          </div>
        </div>
      </div>

      <h1 id="hero-heading" className="sr-only">
        {SITE.name} — Premium protein, built for performance
      </h1>

      <div className="hero-actions absolute inset-x-0 bottom-[clamp(1.5rem,5svh,3rem)] z-10 flex items-center justify-center gap-3 px-gutter">
        <span className="hero-cta reveal">
          <Magnetic strength={0.28} padding={28}>
            <Button
              asChild
              variant="light"
              size="md"
              className="gap-3 pr-1.5 pl-5 shadow-[0_2px_6px_rgb(0_0_0/0.12),0_18px_40px_-16px_rgb(0_0_0/0.45)] sm:pl-6"
            >
              <a href={SHOP_HREF}>
                Shop Now
                <span className="grid size-9 place-items-center rounded-full bg-ink text-canvas transition-transform duration-300 ease-luxe group-hover/btn:translate-x-0.5">
                  <ArrowRight className="size-3.5" strokeWidth={1.75} />
                </span>
              </a>
            </Button>
          </Magnetic>
        </span>

        <span className="hero-cta reveal">
          <Magnetic strength={0.28} padding={28}>
            <Button
              asChild
              variant="glass"
              size="md"
              className="border-white/55 bg-white/18 px-5 [text-shadow:0_1px_10px_rgb(0_0_0/0.3)] shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_18px_40px_-18px_rgb(0_0_0/0.4)] sm:px-6"
            >
              <a href="#flavours">
                <span className="sm:hidden">Flavours</span>
                <span className="hidden sm:inline">Explore Flavours</span>
              </a>
            </Button>
          </Magnetic>
        </span>
      </div>
    </section>
  );
}
