'use client';

import { useRef, useState } from 'react';
import { SectionIntro } from '@/components/ui/SectionIntro';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useGsap } from '@/hooks/useGsap';
import { useIsoLayoutEffect } from '@/hooks/useIsoLayoutEffect';
import { useMotionOK } from '@/hooks/useMediaQuery';
import { FAQS } from '@/lib/content';
import { SITE } from '@/lib/site';
import { cn } from '@/lib/utils';

const DEFAULT_OPEN = 0;

/**
 * FAQ
 *
 * A sticky heading beside a single-open accordion. Panels animate their real
 * height (GSAP resolves `auto`), and the answer rises in just behind the
 * opening edge so the text never appears before there is room for it.
 *
 * Closed answers stay in the DOM — hidden with `visibility`, so they are out of
 * the tab order but still findable — and every open or close ends with a
 * ScrollTrigger refresh, because the page below just changed height.
 *
 * The initial inline style is a constant, not derived from state: React never
 * rewrites it, so it can never fight the tween that owns the height afterwards.
 */
export function Faq() {
  const rootRef = useRef<HTMLElement>(null);
  const panelsRef = useRef<(HTMLDivElement | null)[]>([]);
  const firstRun = useRef(true);
  const [openIndex, setOpenIndex] = useState<number | null>(DEFAULT_OPEN);
  const motionOK = useMotionOK();

  useIsoLayoutEffect(() => {
    let refreshCall: gsap.core.Tween | null = null;
    const refresh = () => {
      refreshCall?.kill();
      refreshCall = gsap.delayedCall(0.05, () => ScrollTrigger.refresh());
    };

    panelsRef.current.forEach((panel, index) => {
      if (!panel) return;
      const inner = panel.firstElementChild as HTMLElement;
      const isOpen = index === openIndex;

      gsap.killTweensOf([panel, inner]);

      if (firstRun.current || !motionOK) {
        gsap.set(panel, { height: isOpen ? 'auto' : 0, visibility: isOpen ? 'visible' : 'hidden' });
        gsap.set(inner, { opacity: isOpen ? 1 : 0, y: 0 });
        return;
      }

      const wasOpen = panel.style.visibility !== 'hidden';
      if (isOpen === wasOpen) return;

      if (isOpen) {
        gsap.set(panel, { visibility: 'visible' });
        gsap.to(panel, { height: 'auto', duration: 0.75, ease: 'power3.inOut', onComplete: refresh });
        gsap.fromTo(
          inner,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.8, delay: 0.18, ease: 'power3.out' }
        );
      } else {
        gsap.to(inner, { opacity: 0, duration: 0.3, ease: 'power2.out' });
        gsap.to(panel, {
          height: 0,
          duration: 0.6,
          ease: 'power3.inOut',
          onComplete: () => {
            gsap.set(panel, { visibility: 'hidden' });
            refresh();
          },
        });
      }
    });

    if (!firstRun.current && !motionOK) refresh();
    firstRun.current = false;

    return () => {
      refreshCall?.kill();
    };
  }, [openIndex, motionOK]);

  useGsap(
    () => {
      if (!motionOK) return;

      gsap.fromTo(
        '.faq-item',
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          stagger: 0.07,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.faq-list', start: 'top 82%', once: true },
        }
      );
      gsap.fromTo(
        '.faq-divider',
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 1.3,
          stagger: 0.07,
          ease: 'power3.inOut',
          scrollTrigger: { trigger: '.faq-list', start: 'top 82%', once: true },
        }
      );
    },
    [motionOK],
    rootRef
  );

  return (
    <section ref={rootRef} id="faq" aria-labelledby="faq-heading" className="relative py-section">
      <div className="shell grid grid-cols-1 gap-14 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-32">
            <SectionIntro
              eyebrow="FAQ"
              id="faq-heading"
              title="Questions, answered."
              lede="Everything people usually ask before their first order. If yours is not here, we answer every email."
            />
            <p className="mt-8 font-sans text-body text-mute">
              Still curious?{' '}
              <a
                href={`mailto:${SITE.email}`}
                className="text-ink underline decoration-sand underline-offset-4 transition-colors duration-300 hover:decoration-cocoa"
              >
                Write to us
              </a>
            </p>
          </div>
        </div>

        <ul className="faq-list lg:col-span-7">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            const buttonId = `faq-question-${index}`;
            const panelId = `faq-answer-${index}`;

            return (
              <li key={faq.question} className="faq-item reveal group relative">
                <span
                  aria-hidden
                  className={cn(
                    'pointer-events-none absolute -inset-x-2.5 inset-y-1 rounded-card bg-cream/70 transition-opacity duration-700 ease-luxe sm:-inset-x-6',
                    isOpen ? 'opacity-100' : 'opacity-0'
                  )}
                />

                <h3 className="relative">
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex min-h-11 w-full items-center justify-between gap-6 py-7 text-left"
                  >
                    <span className="font-display text-[clamp(1.2rem,1rem+0.8vw,1.75rem)] leading-snug font-light text-ink transition-transform duration-500 ease-luxe group-hover:translate-x-1.5">
                      {faq.question}
                    </span>

                    <span
                      aria-hidden
                      className={cn(
                        'relative grid size-11 shrink-0 place-items-center rounded-full border transition-[background-color,border-color,color] duration-500 ease-luxe',
                        isOpen ? 'border-ink bg-ink text-canvas' : 'border-hair text-ink group-hover:border-sand'
                      )}
                    >
                      <span className="absolute h-px w-3.5 bg-current" />
                      <span
                        className={cn(
                          'absolute h-3.5 w-px bg-current transition-[transform,opacity] duration-500 ease-luxe',
                          isOpen ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'
                        )}
                      />
                    </span>
                  </button>
                </h3>

                <div
                  ref={(node) => {
                    panelsRef.current[index] = node;
                  }}
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className="relative overflow-hidden"
                  style={index === DEFAULT_OPEN ? undefined : { height: 0, visibility: 'hidden' }}
                >
                  <p className="max-w-[60ch] pr-16 pb-8 font-sans text-body text-mute">
                    {faq.answer}
                  </p>
                </div>

                <span className="relative block h-px overflow-hidden bg-hair">
                  <span
                    aria-hidden
                    className="faq-divider absolute inset-0 origin-left bg-hair"
                  />
                  <span
                    aria-hidden
                    className="absolute inset-0 origin-left scale-x-0 bg-cocoa/60 transition-transform duration-700 ease-luxe group-hover:scale-x-100"
                  />
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
