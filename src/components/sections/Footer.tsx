'use client';

import { useRef } from 'react';
import { ArrowUp } from 'lucide-react';
import { FacebookIcon, InstagramIcon, YoutubeIcon } from '@/components/ui/brand-icons';
import { Logo } from '@/components/ui/Logo';
import { Magnetic } from '@/components/motion/Magnetic';
import { useSmoothScroll } from '@/components/layout/SmoothScroll';
import { gsap, useGsap } from '@/hooks/useGsap';
import { useMotionOK } from '@/hooks/useMediaQuery';
import { NAV_LINKS, SITE, SOCIALS } from '@/lib/site';

const ICONS = {
  instagram: InstagramIcon,
  youtube: YoutubeIcon,
  facebook: FacebookIcon,
} as const;

/**
 * FOOTER
 *
 * Almost nothing: the mark, the five anchors, three socials, the small print.
 * The one flourish is the wordmark engraved across the full width — two
 * copies stacked exactly, the pale one always there and a cocoa one whose
 * clip wipes open as the last of the page scrolls past.
 */
export function Footer() {
  const rootRef = useRef<HTMLElement>(null);
  const { scrollTo } = useSmoothScroll();
  const motionOK = useMotionOK();

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

  return (
    <footer ref={rootRef} className="relative isolate overflow-hidden bg-canvas pt-section">
      <div className="shell">
        <div className="foot-top flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="foot-col reveal">
            <a href="#top" aria-label={`${SITE.name} — back to top`} className="inline-block text-ink">
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
        <div className="relative pt-[0.12em] text-center font-display text-[12.5vw] leading-[0.8] font-extralight tracking-[-0.045em]">
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

        <Magnetic strength={0.24} padding={24}>
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
        </Magnetic>
      </div>
    </footer>
  );
}
