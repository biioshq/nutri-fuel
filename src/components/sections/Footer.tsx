'use client';

import { useRef } from 'react';
import { ArrowUp } from 'lucide-react';
import { FacebookIcon, InstagramIcon, YoutubeIcon } from '@/components/ui/brand-icons';
import { Dumbbell, Kettlebell, Shaker } from '@/components/ui/illustrations';
import { Logo } from '@/components/ui/Logo';
import { Float } from '@/components/motion/Float';
import { Tilt } from '@/components/motion/Tilt';
import { useSmoothScroll } from '@/components/layout/SmoothScroll';
import { gsap, useGsap } from '@/hooks/useGsap';
import { useIsoLayoutEffect } from '@/hooks/useIsoLayoutEffect';
import { useHasFinePointer, useMotionOK } from '@/hooks/useMediaQuery';
import { subscribePointer } from '@/lib/pointer';
import { NAV_LINKS, SITE, SOCIALS } from '@/lib/site';

const ICONS = {
  instagram: InstagramIcon,
  youtube: YoutubeIcon,
  facebook: FacebookIcon,
} as const;

/**
 * FOOTER
 *
 * Almost nothing: the mark, the anchors, three socials, the small print. The
 * wordmark is engraved across the full width in two copies stacked exactly,
 * the pale one always there and a cocoa one whose clip wipes open as the last
 * of the page scrolls past.
 *
 * Three of the house drawings stand in the space around it, each on its own
 * idle cycle, drifting against the scroll and leaning toward the cursor, so
 * the end of the page is somewhere the eye can rest rather than a dead stop.
 * Every one of them is furniture: faint, slow, and behind everything.
 */
export function Footer() {
  const rootRef = useRef<HTMLElement>(null);
  const liquidRef = useRef<SVGGElement>(null);
  const { scrollTo } = useSmoothScroll();
  const motionOK = useMotionOK();
  const finePointer = useHasFinePointer();

  useGsap(
    () => {
      if (!motionOK) return;

      gsap.fromTo(
        '.foot-col',
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 1.1,
          stagger: 0.08,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.foot-top', start: 'top 92%', once: true },
        }
      );

      gsap.fromTo(
        '.foot-rule',
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 1.6,
          ease: 'power3.inOut',
          scrollTrigger: { trigger: '.foot-rule', start: 'top 96%', once: true },
        }
      );

      // --- Each drawing has something of its own to do ------------------
      // Drifting is not the same as being alive. A swing is a pendulum, a rep
      // has a top and a rest, and a shaker is still between shakes: the three
      // rhythms differ in length and in shape, so they never fall into step.

      // They draw themselves on as the footer arrives.
      gsap.fromTo(
        '.foot-draw',
        { strokeDashoffset: 1.02 },
        {
          strokeDashoffset: 0,
          duration: 1.1,
          stagger: 0.04,
          ease: 'power2.inOut',
          scrollTrigger: { trigger: rootRef.current, start: 'top 88%', once: true },
        }
      );

      // The kettlebell swings from its handle, not from its middle.
      gsap.fromTo(
        '.foot-swing',
        { rotation: -10 },
        {
          rotation: 10,
          duration: 2.7,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          transformOrigin: '50% 8%',
        }
      );

      // The dumbbell works a set: lift, hold at the top, lower, breathe.
      gsap
        .timeline({ repeat: -1, defaults: { transformOrigin: '50% 50%' } })
        .to('.foot-rep', { rotation: -16, y: -11, duration: 0.75, ease: 'power2.out' })
        .to('.foot-rep', { rotation: -16, duration: 0.3 })
        .to('.foot-rep', { rotation: 0, y: 0, duration: 0.95, ease: 'power1.inOut' })
        .to('.foot-rep', { rotation: 0, duration: 0.9 });

      // Part-full at rest: the liquid block is taller than the bottle and
      // slides up into it, so a smaller number is a fuller shaker.
      gsap.set(liquidRef.current, { y: 74 });

      // The shaker is shaken every few seconds, and the liquid answers a beat
      // late, the way liquid does.
      gsap
        .timeline({ repeat: -1, repeatDelay: 4.4, defaults: { transformOrigin: '50% 12%' } })
        .to('.foot-shake', { rotation: 8, duration: 0.13, ease: 'power2.out' })
        .to('.foot-shake', { rotation: -7, duration: 0.12, ease: 'power2.inOut' })
        .to('.foot-shake', { rotation: 5, duration: 0.11, ease: 'power2.inOut' })
        .to('.foot-shake', { rotation: -3, duration: 0.11, ease: 'power2.inOut' })
        .to('.foot-shake', { rotation: 0, duration: 0.6, ease: 'power3.out' })
        .to(liquidRef.current, { y: 65, duration: 0.22, ease: 'power2.out' }, 0.06)
        .to(liquidRef.current, { y: 74, duration: 0.9, ease: 'power2.out' }, 0.32);

      // Bubbles keep rising the whole time.
      gsap.to('.foot-bubble', {
        y: -56,
        opacity: 0,
        duration: 2.8,
        ease: 'power1.out',
        repeat: -1,
        stagger: 0.75,
      });

      // The drawings move against the page, and against each other: the
      // reader arrives at a footer that is still settling.
      gsap.fromTo(
        '.foot-drift',
        { y: (i: number) => [44, -34, 26][i] ?? 0 },
        {
          y: (i: number) => [-44, 34, -26][i] ?? 0,
          ease: 'none',
          scrollTrigger: {
            trigger: rootRef.current,
            start: 'top bottom',
            end: 'bottom bottom',
            scrub: 1,
            invalidateOnRefresh: true,
          },
        }
      );

      gsap.fromTo(
        '.foot-wordmark-fill',
        { clipPath: 'inset(0% 100% 0% 0%)' },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          ease: 'none',
          scrollTrigger: {
            trigger: '.foot-wordmark',
            start: 'top 96%',
            end: 'bottom bottom',
            scrub: 0.8,
          },
        }
      );
    },
    [motionOK],
    rootRef
  );

  /**
   * The drawings notice you. The nearer the cursor gets to one, the further it
   * comes up out of the paper. One subscriber for all three, with the rects
   * read in the store's measure phase, so a moving mouse costs one layout
   * flush however many drawings there are.
   */
  useIsoLayoutEffect(() => {
    if (!motionOK || !finePointer) return;
    const root = rootRef.current;
    if (!root) return;

    const wakes = Array.from(root.querySelectorAll<HTMLElement>('.foot-wake'));
    if (wakes.length === 0) return;

    const rest = wakes.map((el) => Number(el.style.opacity) || 0.08);
    const fade = wakes.map((el) =>
      gsap.quickTo(el, 'opacity', { duration: 0.6, ease: 'power3.out' })
    );
    const grow = wakes.map((el) => gsap.quickTo(el, 'scale', { duration: 0.7, ease: 'power3.out' }));
    let rects: DOMRect[] = [];

    /** Beyond this many pixels, the drawing is asleep. */
    const REACH = 420;

    return subscribePointer({
      measure: () => {
        rects = wakes.map((el) => el.getBoundingClientRect());
      },
      apply: (x, y) => {
        rects.forEach((r, i) => {
          const dx = x - (r.left + r.width / 2);
          const dy = y - (r.top + r.height / 2);
          const near = Math.max(0, 1 - Math.hypot(dx, dy) / REACH);
          // Squared, so it wakes late and then quickly.
          const t = near * near;
          fade[i]?.(rest[i]! + t * 0.13);
          grow[i]?.(1 + t * 0.07);
        });
      },
      reset: () => {
        rects.forEach((_, i) => {
          fade[i]?.(rest[i]!);
          grow[i]?.(1);
        });
      },
    });
  }, [motionOK, finePointer]);

  return (
    <footer ref={rootRef} className="relative isolate overflow-hidden bg-canvas pt-section">
      {/* Behind everything, clipped by the footer, and never in the way of a
          pointer: `Tilt` reads cursor coordinates from the shared store, so it
          leans without needing to be hoverable itself.

          Five wrappers, five owners of one transform each: drift (scroll),
          Tilt (pointer), Float (idle), wake (the cursor coming near), and the
          innermost, which is the drawing's own behaviour. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="foot-drift absolute top-[14%] left-[-4%] w-[clamp(4.5rem,11vw,9rem)] sm:left-[2%] lg:left-[5%]">
          <Tilt max={13} perspective={900}>
            <Float amplitude={13} rotate={0} duration={6.2} phase={0.1}>
              <div className="foot-wake" style={{ opacity: 0.075 }}>
                <div className="foot-swing">
                  <Kettlebell
                    drawClass="foot-draw"
                    strokeWidth={1.7}
                    className="h-auto w-full text-ink"
                  />
                </div>
              </div>
            </Float>
          </Tilt>
        </div>

        <div className="foot-drift absolute top-[30%] right-[-6%] w-[clamp(5.5rem,13vw,11rem)] sm:right-[-1%] lg:right-[4%]">
          <Tilt max={13} perspective={900}>
            <Float amplitude={18} rotate={-1.4} duration={7.4} phase={0.45}>
              <div className="foot-wake" style={{ opacity: 0.085 }}>
                <div className="foot-shake">
                  <Shaker
                    drawClass="foot-draw"
                    strokeWidth={1.6}
                    className="h-auto w-full text-ink"
                    fill={{
                      ref: liquidRef,
                      idPrefix: 'foot',
                      liquidClass: 'foot-liquid',
                      bubbleClass: 'foot-bubble',
                      ballClass: 'foot-ball',
                    }}
                  />
                </div>
              </div>
            </Float>
          </Tilt>
        </div>

        {/* Dropped on phones: at that width the wordmark already owns the
            middle of the footer and a third drawing is a crowd. */}
        <div className="foot-drift absolute right-[27%] bottom-[30%] hidden w-[clamp(5rem,9vw,8rem)] md:block">
          <Tilt max={15} perspective={900}>
            <Float amplitude={10} rotate={0} duration={5.6} phase={0.75}>
              <div className="foot-wake" style={{ opacity: 0.07 }}>
                <div className="foot-rep">
                  <Dumbbell
                    drawClass="foot-draw"
                    strokeWidth={1.7}
                    className="h-auto w-full text-ink"
                  />
                </div>
              </div>
            </Float>
          </Tilt>
        </div>
      </div>

      <div className="shell">
        <div className="foot-top flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="foot-col reveal">
            <a href="#top" aria-label={`${SITE.name}, back to top`} className="inline-block text-ink">
              <Logo />
            </a>
            <p className="mt-4 font-sans text-body text-mute">{SITE.tagline}</p>
          </div>

          <nav aria-label="Footer" className="foot-col reveal">
            <ul className="flex flex-wrap gap-x-8 gap-y-1">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="group relative inline-block py-3 font-sans text-[0.9375rem] text-ink-soft transition-colors duration-300 hover:text-ink"
                  >
                    {link.label}
                    <span
                      aria-hidden
                      className="absolute inset-x-0 bottom-2 h-px origin-right scale-x-0 bg-cocoa transition-transform duration-500 ease-luxe group-hover:origin-left group-hover:scale-x-100"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <ul className="foot-col reveal flex gap-2.5">
            {SOCIALS.map((social) => {
              const Icon = ICONS[social.icon];
              return (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={social.label}
                    className="grid size-11 place-items-center rounded-full border border-hair text-ink-soft shadow-soft transition-[color,border-color,transform] duration-500 ease-luxe hover:-translate-y-0.5 hover:border-sand hover:text-cocoa"
                  >
                    <Icon className="size-4" />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="foot-rule hairline mt-14 origin-left lg:mt-20" />
      </div>

      <div aria-hidden className="foot-wordmark relative mt-10 overflow-hidden select-none lg:mt-14">
        {/* Em-based top padding keeps the glyphs inside the gradient's box. */}
        <div className="relative pt-[0.12em] text-center font-display text-[13vw] leading-[0.88] tracking-[-0.018em]">
          <span className="block text-ink/[0.05]">{SITE.wordmark}</span>
          <span
            className="foot-wordmark-fill text-cocoa-gradient absolute inset-0 block pt-[0.12em]"
            style={{ clipPath: motionOK ? 'inset(0% 100% 0% 0%)' : 'none', opacity: 0.9 }}
          >
            {SITE.wordmark}
          </span>
        </div>
      </div>

      <div className="shell flex flex-col-reverse items-center gap-5 border-t border-hair py-8 sm:flex-row sm:justify-between">
        <p
          className="text-center font-sans text-micro text-faint uppercase sm:text-left"
          suppressHydrationWarning
        >
          © {new Date().getFullYear()} {SITE.name}. All rights reserved.
        </p>

        {/* No magnetic pull: a control that slides away from the cursor
            reads as a bug, not as polish. */}
          <button
            type="button"
            onClick={() => scrollTo(0)}
            className="group flex items-center gap-3 font-sans text-micro text-mute uppercase transition-colors duration-300 hover:text-ink"
          >
            Back to top
            <span className="grid size-11 place-items-center rounded-full border border-hair transition-[border-color,transform] duration-500 ease-luxe group-hover:-translate-y-0.5 group-hover:border-sand">
              <ArrowUp className="size-3.5" strokeWidth={1.5} />
            </span>
          </button>
      </div>
    </footer>
  );
}
