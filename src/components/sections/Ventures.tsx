'use client';

import Image from 'next/image';
import { useRef, type CSSProperties } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { SectionIntro } from '@/components/ui/SectionIntro';
import { gsap, useGsap } from '@/hooks/useGsap';
import { useMotionOK } from '@/hooks/useMediaQuery';
import { VENTURES, type Venture } from '@/lib/content';
import { VENTURE_IMAGES } from '@/lib/media';
import { SITE } from '@/lib/site';
import { cn } from '@/lib/utils';

/**
 * MORE FROM AJAY — the sister brands, just above the footer.
 *
 * Two cards, each dressed in the ground of its own artwork: the gym poster is
 * set on black, so its card is black; the travel mark is set on white, so its
 * card is white. The poster and the card then read as one continuous surface
 * rather than a picture pasted onto a panel. Both posters carry their own
 * type, so they are shown whole at their native 3:2 — never cropped.
 *
 * Signature: each card rises while its artwork opens upward behind a mask and
 * settles back from a slight zoom; the copy follows in a short stagger.
 */
export function Ventures() {
  const rootRef = useRef<HTMLElement>(null);
  const motionOK = useMotionOK();

  useGsap(
    () => {
      if (!motionOK) return;

      gsap.utils.toArray<HTMLElement>('.ven-card').forEach((card, index) => {
        gsap
          .timeline({
            delay: index * 0.12,
            scrollTrigger: { trigger: card, start: 'top 86%', once: true },
          })
          .fromTo(card, { opacity: 0, y: 70 }, { opacity: 1, y: 0, duration: 1.3, ease: 'expo.out' }, 0)
          .fromTo(
            card.querySelector('.ven-media'),
            { clipPath: 'inset(100% 0% 0% 0%)' },
            { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'power4.inOut' },
            0.05
          )
          .fromTo(
            card.querySelector('.ven-image'),
            { scale: 1.14 },
            { scale: 1, duration: 1.8, ease: 'power3.out' },
            0.05
          )
          .fromTo(
            card.querySelectorAll('.ven-rise'),
            { opacity: 0, y: 18 },
            { opacity: 1, y: 0, duration: 1, stagger: 0.07, ease: 'power3.out' },
            0.55
          );
      });
    },
    [motionOK],
    rootRef
  );

  return (
    <section
      ref={rootRef}
      id="family"
      aria-labelledby="family-heading"
      className="relative pt-section"
    >
      <div className="shell">
        <SectionIntro
          eyebrow="The Ajay Family"
          id="family-heading"
          title="More from Ajay."
          align="center"
          lede="The same standard, beyond the bottle. Train with Ajay Gym, then go and see the world with Ajay Tours and Travels."
        />

        <ul className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:mt-20 lg:gap-8">
          {VENTURES.map((venture) => (
            <VentureCard key={venture.id} venture={venture} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function VentureCard({ venture }: { venture: Venture }) {
  const image = VENTURE_IMAGES[venture.id];
  const dark = venture.theme === 'dark';
  const href = `mailto:${SITE.email}?subject=${encodeURIComponent(venture.subject)}`;

  return (
    <li
      className="ven-card reveal group relative"
      style={{ '--ven-accent': venture.accent, '--ven-dot': venture.dot } as CSSProperties}
    >
      {/* The lift moves the card and its pre-rendered hover shadow together. */}
      <div className="relative h-full transition-[translate] duration-700 ease-luxe motion-safe:group-hover:-translate-y-2">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-card opacity-0 shadow-lift transition-opacity duration-700 ease-luxe group-hover:opacity-100"
        />

        <article
          className={cn(
            'relative flex h-full flex-col overflow-hidden rounded-card border',
            dark ? 'border-white/10 bg-black text-canvas' : 'border-hair bg-canvas text-ink shadow-soft'
          )}
        >
          <div className="ven-media relative aspect-[3/2] overflow-hidden">
            <div className="ven-image absolute inset-0">
              <div className="absolute inset-0 transition-transform duration-[1200ms] ease-luxe group-hover:scale-[1.04]">
                <Image
                  src={image.src}
                  alt={venture.alt}
                  fill
                  sizes="(min-width: 1536px) 46rem, (min-width: 768px) 50vw, 100vw"
                  quality={90}
                  className="object-cover"
                />
              </div>
            </div>
          </div>

          <div
            aria-hidden
            className={cn('mx-7 h-px sm:mx-9 lg:mx-10', dark ? 'bg-white/10' : 'bg-hair')}
          />

          <div className="flex flex-1 flex-col p-7 sm:p-9 lg:p-10">
            <p className="ven-rise eyebrow flex items-center gap-3 text-(--ven-accent)">
              <span aria-hidden className="block h-px w-8 bg-(--ven-dot)" />
              {venture.eyebrow}
            </p>

            <h3 className={cn('ven-rise mt-5 text-h3 font-light', dark ? 'text-canvas' : 'text-ink')}>
              {venture.name}
            </h3>

            <p
              className={cn(
                'ven-rise mt-4 max-w-[46ch] font-sans text-body',
                dark ? 'text-canvas/65' : 'text-mute'
              )}
            >
              {venture.body}
            </p>

            <ul className="ven-rise mt-6 flex flex-wrap gap-2">
              {venture.features.map((feature) => (
                <li
                  key={feature}
                  className={cn(
                    'flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-sans text-[0.75rem]',
                    dark ? 'border-white/15 text-canvas/80' : 'border-hair text-ink-soft'
                  )}
                >
                  <span aria-hidden className="size-1.5 rounded-full bg-(--ven-dot)" />
                  {feature}
                </li>
              ))}
            </ul>

            <div className="ven-rise mt-auto pt-9">
              <a
                href={href}
                className={cn(
                  'group/cta inline-flex min-h-11 items-center gap-4 font-sans text-label font-medium uppercase transition-colors duration-300',
                  dark ? 'text-canvas' : 'text-ink'
                )}
              >
                Enquire about {venture.name}
                <span
                  className={cn(
                    'grid size-11 shrink-0 place-items-center rounded-full border transition-[background-color,border-color,color] duration-500 ease-luxe',
                    dark
                      ? 'border-white/25 group-hover/cta:border-canvas group-hover/cta:bg-canvas group-hover/cta:text-ink'
                      : 'border-hair group-hover/cta:border-ink group-hover/cta:bg-ink group-hover/cta:text-canvas'
                  )}
                >
                  <ArrowUpRight
                    className="size-4 transition-transform duration-500 ease-luxe group-hover/cta:rotate-45"
                    strokeWidth={1.5}
                  />
                </span>
              </a>
            </div>
          </div>
        </article>
      </div>
    </li>
  );
}
