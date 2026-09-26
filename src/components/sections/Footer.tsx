'use client';

import { useRef, type RefObject } from 'react';
import { ArrowUp } from 'lucide-react';
import { FacebookIcon, InstagramIcon, YoutubeIcon } from '@/components/ui/brand-icons';
import { Shaker } from '@/components/ui/illustrations';
import { Logo } from '@/components/ui/Logo';
import { Float } from '@/components/motion/Float';
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
  // One per bottle: an SVG id is document-global, so each shaker needs its
  // own clip path and gradient, and therefore its own handle.
  const liquidLeftRef = useRef<SVGGElement>(null);
  const liquidRightRef = useRef<SVGGElement>(null);
  const { scrollTo } = useSmoothScroll();
  const motionOK = useMotionOK();
  const finePointer = useHasFinePointer();

  useGsap(
    () => {
      if (!motionOK) {
        // Poured, still, and visible: the composition has to be complete for
        // anyone who has asked the page to stop moving.
        gsap.set('.foot-liquid', { opacity: 1, y: 12 });
        gsap.set('.foot-ball', { opacity: 0.75 });
        return;
      }

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

      // --- The wordmark and its two bottles -----------------------------
      // The drawings are furniture for the wordmark now, not a row of their
      // own: one either side, filling as the page ends.

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

      // THE POUR. Both bottles fill as the footer arrives, and empty again if
      // the reader scrolls back up: the liquid block is taller than the glass
      // and slides up into it behind the clip, so y 150 is empty and y 12 is
      // full. A scrub rather than a loop, because the reader is the one
      // pouring it.
      gsap.set('.foot-liquid', { opacity: 1 });
      gsap.fromTo(
        '.foot-liquid',
        { y: 150 },
        {
          y: 12,
          ease: 'none',
          scrollTrigger: {
            // Measured on the footer, and ending where the page itself ends:
            // `bottom bottom` is the last scroll position that exists, so the
            // glass is exactly full when the reader can go no further. Ranges
            // that finish earlier left it stuck at two-thirds.
            trigger: rootRef.current,
            start: 'top bottom',
            end: 'bottom bottom',
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        }
      );

      // The mixing ball shows once there is something for it to sit in.
      gsap.fromTo(
        '.foot-ball',
        { opacity: 0 },
        {
          opacity: 0.75,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: { trigger: '.foot-wordmark', start: 'top 82%', once: true },
        }
      );

      // Bubbles keep rising the whole time.
      gsap.to('.foot-bubble', {
        y: -56,
        opacity: 0,
        duration: 2.8,
        ease: 'power1.out',
        repeat: -1,
        stagger: 0.75,
      });

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

    const rest = wakes.map((el) => Number(el.style.opacity) || 0.42);
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
          fade[i]?.(Math.min(1, rest[i]! + t * 0.34));
          grow[i]?.(1 + t * 0.06);
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
    <footer ref={rootRef} className="relative isolate overflow-hidden bg-canvas pt-[clamp(4rem,10vh,6.5rem)]">
      <div className="shell">
        <div className="foot-top flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
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

      </div>

      {/* THE WORDMARK, FLANKED.
          A bottle either side, filling as the footer arrives and emptying if
          the reader goes back up, with the bubbles rising inside exactly as
          they do on the loading screen. The page opens on this drawing and
          closes on it. */}
      <div
        aria-hidden
        className="foot-wordmark relative mt-10 flex items-center justify-center gap-[clamp(0.5rem,2vw,2.75rem)] overflow-hidden py-6 select-none lg:mt-14"
      >
        <FooterBottle liquidRef={liquidLeftRef} idPrefix="foot-l" phase={0.1} />

        {/* Em-based top padding keeps the glyphs inside the gradient's box. */}
        <div className="relative pt-[0.12em] text-center font-display text-[11.5vw] leading-[0.9] tracking-[-0.018em]">
          <span className="block text-ink/[0.05]">{SITE.wordmark}</span>
          <span
            className="foot-wordmark-fill text-cocoa-gradient absolute inset-0 block pt-[0.12em]"
            style={{ clipPath: motionOK ? 'inset(0% 100% 0% 0%)' : 'none', opacity: 0.9 }}
          >
            {SITE.wordmark}
          </span>
        </div>

        <FooterBottle liquidRef={liquidRightRef} idPrefix="foot-r" phase={0.55} mirrored />
      </div>

      <div className="shell flex flex-col-reverse items-center gap-4 border-t border-hair py-8 sm:flex-row sm:justify-between">
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

/**
 * One of the two bottles beside the wordmark.
 *
 * `idPrefix` is not decoration: the clip path and the liquid gradient inside
 * the drawing become document-global ids, so two shakers sharing a prefix
 * would share one clip and the second would fill from the first one's shape.
 */
function FooterBottle({
  liquidRef,
  idPrefix,
  phase,
  mirrored = false,
}: {
  liquidRef: RefObject<SVGGElement | null>;
  idPrefix: string;
  phase: number;
  mirrored?: boolean;
}) {
  return (
    <div className="foot-wake shrink-0" style={{ opacity: 0.5 }}>
      <Float amplitude={9} rotate={0} duration={mirrored ? 6.8 : 7.6} phase={phase}>
        <Shaker
          drawClass="foot-draw"
          strokeWidth={2.2}
          className={`h-[clamp(4rem,11vw,9.5rem)] w-auto text-cocoa${mirrored ? ' -scale-x-100' : ''}`}
          fill={{
            ref: liquidRef,
            idPrefix,
            liquidClass: 'foot-liquid',
            bubbleClass: 'foot-bubble',
            ballClass: 'foot-ball',
          }}
        />
      </Float>
    </div>
  );
}
