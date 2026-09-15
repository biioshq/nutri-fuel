'use client';

import { useEffect, useRef, type CSSProperties, type RefObject } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { BottleImage } from '@/components/media/BottleImage';
import { Counter } from '@/components/motion/Counter';
import { Tilt } from '@/components/motion/Tilt';
import { Button, buttonVariants } from '@/components/ui/button';
import { SectionIntro } from '@/components/ui/SectionIntro';
import { gsap, useGsap } from '@/hooks/useGsap';
import { useIsoLayoutEffect } from '@/hooks/useIsoLayoutEffect';
import { useMotionOK } from '@/hooks/useMediaQuery';
import { FLAVOURS, type Flavour, type FlavourId } from '@/lib/flavours';
import { SHOP_HREF } from '@/lib/site';
import { cn } from '@/lib/utils';

/** Below `md` the cards become a swipeable track instead of a grid. */
const CAROUSEL_QUERY = '(max-width: 767.98px)';

/**
 * Tailwind only generates classes it can read in the source, so the
 * "this flavour is active" selector has to exist as a literal per flavour.
 */
const ACTIVE_ON: Record<FlavourId, string> = {
  chocolate: 'group-data-[active=chocolate]/flv:opacity-100',
  vanilla: 'group-data-[active=vanilla]/flv:opacity-100',
  strawberry: 'group-data-[active=strawberry]/flv:opacity-100',
};

/** Layers that answer a hovered card — or a keyboard focus inside it. */
const ENGAGED = 'group-hover/card:opacity-100 group-has-[:focus-visible]/card:opacity-100';

const pad = (n: number) => String(n).padStart(2, '0');

const toneVars = (flavour: Flavour) =>
  ({
    '--tone': flavour.tone.accent,
    '--tone-deep': flavour.tone.deep,
    '--tone-soft': flavour.tone.soft,
    '--tone-glow': flavour.tone.glow,
    // The border never switches to the accent outright — it leans toward it.
    '--tone-line': `color-mix(in oklab, ${flavour.tone.accent} 38%, var(--color-hair))`,
  }) as CSSProperties;

/** Every bottle shares these; the head's aside reads them rather than restating them. */
const CONSTANT = FLAVOURS[0];

/**
 * THE FLAVOURS
 *
 * Three cards and a room that changes colour around them. The page is white
 * and stays white; what changes is the air behind the cards — a wash in the
 * hovered flavour's soft tone and a large orb that drifts over to sit behind
 * it. That keeps the accent where it belongs (in the light, not on the
 * furniture) and lets the photographs carry the colour.
 *
 * Decisions worth knowing before editing:
 *
 * - The background is driven by a `data-active` attribute written straight to
 *   the section, never by React state. Hovering across three cards would
 *   otherwise re-render the whole section on every enter. The crossfades are
 *   plain CSS opacity transitions keyed off that attribute; the orb's travel
 *   is a GSAP `quickTo`.
 * - Every hover effect that would be expensive to interpolate — the deeper
 *   shadow, the tinted border, the spotlight — is a pre-rendered layer whose
 *   opacity crossfades. Nothing animates `box-shadow` or `filter`.
 * - Transforms are split across nested wrappers so no two systems fight over
 *   one `transform`: the entrance owns `.flv-rise`, Tilt owns its plane, CSS
 *   hover owns the lift, the scrub owns `.flv-parallax`, the entrance scale
 *   owns `.flv-bottle`, and the hover zoom owns the image itself.
 * - The photographs have type baked into both sides. The parallax layer is
 *   oversized by 8% on every edge, which both hides the drift's edges and
 *   pushes that type further out of the 4:5 crop.
 * - Below `md` the grid becomes a scroll-snap track. On a phone there is no
 *   hover, so the slide in view drives the background instead — the room
 *   still changes colour as you swipe.
 * - Between `md` and `lg` it is two cards over one: the third spans the row
 *   and turns landscape, which reads far better than three cramped columns.
 */
export function Flavours() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const moveOrb = useRef<((x: number) => void) | null>(null);
  /** The slide in view on the carousel. */
  const current = useRef(0);

  const motionOK = useMotionOK();

  // --- Background state (no React renders) ---------------------------------
  const isCarousel = () => window.matchMedia(CAROUSEL_QUERY).matches;

  const setActive = (id: FlavourId | undefined) => {
    const section = sectionRef.current;
    if (!section) return;
    if (id) section.dataset.active = id;
    else delete section.dataset.active;
  };

  const engage = (index: number, card: HTMLElement) => {
    setActive(FLAVOURS[index]?.id);

    const section = sectionRef.current;
    if (!section || !moveOrb.current || isCarousel()) return;

    // One rect read per enter, not per frame.
    const s = section.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    moveOrb.current(c.left + c.width / 2 - (s.left + s.width / 2));
  };

  const release = () => {
    moveOrb.current?.(0);
    // On the carousel the background belongs to the slide in view.
    setActive(isCarousel() ? FLAVOURS[current.current]?.id : undefined);
  };

  const goTo = (index: number) => {
    const track = trackRef.current;
    const slide = track?.children[index] as HTMLElement | undefined;
    if (!track || !slide) return;

    track.scrollTo({
      left: slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2,
      behavior: motionOK ? 'smooth' : 'auto',
    });
  };

  // --- Orb drift ------------------------------------------------------------
  useIsoLayoutEffect(() => {
    const orb = orbRef.current;
    if (!orb || !motionOK) return;

    moveOrb.current = gsap.quickTo(orb, 'x', { duration: 1.8, ease: 'power3.out' });

    return () => {
      moveOrb.current = null;
      gsap.killTweensOf(orb);
      gsap.set(orb, { clearProps: 'transform' });
    };
  }, [motionOK]);

  // --- Carousel position ----------------------------------------------------
  // The count, the rail and (on phones) the background follow whichever slide
  // is most in view. Written to the DOM directly: a swipe crosses thresholds
  // many times and none of it needs React.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const slides = Array.from(track.children) as HTMLElement[];
    const segments = Array.from(
      railRef.current?.querySelectorAll<HTMLElement>('[data-segment]') ?? []
    );
    const ratios = slides.map(() => 0);
    const mq = window.matchMedia(CAROUSEL_QUERY);

    const show = (index: number) => {
      current.current = index;
      if (countRef.current) countRef.current.textContent = pad(index + 1);
      segments.forEach((segment, i) => {
        segment.dataset.active = String(i === index);
        if (i === index) segment.setAttribute('aria-current', 'true');
        else segment.removeAttribute('aria-current');
      });
      if (mq.matches) setActive(FLAVOURS[index]?.id);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const i = slides.indexOf(entry.target as HTMLElement);
          if (i >= 0) ratios[i] = entry.intersectionRatio;
        }
        // Ties keep the current slide, so the grid (where every card is
        // fully visible) never shuffles the state.
        let best = current.current;
        ratios.forEach((ratio, i) => {
          if (ratio > (ratios[best] ?? 0) + 0.001) best = i;
        });
        if (best !== current.current) show(best);
      },
      { root: track, threshold: [0, 0.25, 0.5, 0.75, 0.9, 1] }
    );
    slides.forEach((slide) => observer.observe(slide));

    const onBreakpoint = () => {
      moveOrb.current?.(0);
      setActive(mq.matches ? FLAVOURS[current.current]?.id : undefined);
    };
    onBreakpoint();
    mq.addEventListener('change', onBreakpoint);

    return () => {
      observer.disconnect();
      mq.removeEventListener('change', onBreakpoint);
    };
  }, []);

  // --- Entrance and scroll --------------------------------------------------
  useGsap(
    () => {
      if (!motionOK) return;

      gsap.fromTo(
        '.flv-aside',
        { opacity: 0, y: 28 },
        {
          opacity: 1,
          y: 0,
          duration: 1.4,
          delay: 0.35,
          ease: 'expo.out',
          scrollTrigger: { trigger: '.flv-aside', start: 'top 86%', once: true },
        }
      );

      // Cards hinge up off their bottom edge; each photograph then opens from
      // below while the bottle settles back from slightly too close.
      const cards = gsap.utils.toArray<HTMLElement>('.flv-rise');
      const tl = gsap.timeline({
        scrollTrigger: { trigger: '.flv-track', start: 'top 80%', once: true },
      });

      cards.forEach((card, i) => {
        const at = i * 0.14;
        const media = card.querySelector('.flv-media');
        const bottle = card.querySelector('.flv-bottle');

        tl.fromTo(
          card,
          { opacity: 0, y: 90, rotateX: 14, transformPerspective: 1400, transformOrigin: '50% 100%' },
          { opacity: 1, y: 0, rotateX: 0, duration: 1.5, ease: 'expo.out' },
          at
        );
        if (media) {
          tl.fromTo(
            media,
            // `round` keeps the corners soft while the edge is still travelling.
            { clipPath: 'inset(100% 0% 0% 0% round 1.5rem)' },
            { clipPath: 'inset(0% 0% 0% 0% round 1.5rem)', duration: 1.3, ease: 'power3.inOut' },
            at + 0.1
          );
        }
        if (bottle) {
          tl.fromTo(bottle, { scale: 1.15 }, { scale: 1, duration: 2, ease: 'expo.out' }, at + 0.1);
        }
      });

      // Depth while scrolling: the bottle drifts inside its frame. ±5% of an
      // oversized layer stays well inside the 8% it has to spare.
      gsap.utils.toArray<HTMLElement>('.flv-parallax').forEach((layer) => {
        gsap.fromTo(
          layer,
          { yPercent: -5 },
          {
            yPercent: 5,
            ease: 'none',
            scrollTrigger: {
              trigger: layer.parentElement,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1,
            },
          }
        );
      });
    },
    [motionOK],
    sectionRef
  );

  return (
    <section
      ref={sectionRef}
      id="flavours"
      aria-labelledby="flavours-heading"
      className="group/flv relative isolate overflow-x-clip py-section"
    >
      <Ambient orbRef={orbRef} />

      {/* Head — the intro on the left, the one number that never changes on the right. */}
      <div className="shell grid gap-12 lg:grid-cols-12 lg:items-end lg:gap-8">
        <SectionIntro
          id="flavours-heading"
          eyebrow="The Flavours"
          title="Three flavours. One standard."
          lede="Every bottle carries the same 25 grams of protein and the same short ingredient list. Only the pleasure changes."
          mode="words-flip"
          className="lg:col-span-8"
        />

        {CONSTANT && (
          <aside
            aria-label="The same in every flavour"
            className="flv-aside reveal flex items-end gap-6 sm:gap-8 lg:col-span-3 lg:col-start-10 lg:flex-col lg:items-start lg:gap-6 lg:justify-self-end lg:border-l lg:border-hair lg:pb-3 lg:pl-10"
          >
            <p className="display-face flex items-baseline text-[clamp(4.25rem,3rem+4vw,7.5rem)]">
              <Counter value={CONSTANT.nutrition.protein} duration={1.8} />
              <span className="ml-1.5 font-sans text-lede font-light tracking-normal text-mute">
                g
              </span>
            </p>

            <div className="pb-2 lg:pb-0">
              <span aria-hidden className="flex -space-x-1">
                {FLAVOURS.map((flavour) => (
                  <span
                    key={flavour.id}
                    className="size-3.5 rounded-full ring-2 ring-canvas"
                    style={{ backgroundColor: flavour.tone.accent }}
                  />
                ))}
              </span>
              <p className="eyebrow mt-4 text-ink-soft">Protein in every bottle</p>
              <p className="mt-2 font-sans text-label tracking-normal text-mute">
                {CONSTANT.nutrition.sugar} g sugar · {CONSTANT.volume}
              </p>
            </div>
          </aside>
        )}
      </div>

      {/* Cards */}
      <div className="mt-14 md:mt-20 lg:mt-24">
        <ul
          ref={trackRef}
          aria-label="Flavours"
          onPointerLeave={(event) => {
            if (event.pointerType !== 'touch') release();
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) release();
          }}
          className={cn(
            // Phone: a self-scrolling snap track, padded to the gutter so the
            // first and last cards line up with the copy above. The vertical
            // padding gives shadows room inside the scroll container's clip.
            'flv-track relative -my-10 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-gutter py-10 scroll-px-gutter',
            '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            // Tablet and up: a grid inside the page shell.
            'md:mx-auto md:my-0 md:grid md:max-w-[96rem] md:snap-none md:grid-cols-2 md:gap-5 md:overflow-visible md:py-0',
            'lg:grid-cols-3 xl:gap-8'
          )}
        >
          {FLAVOURS.map((flavour, index) => {
            // The odd card out on the two-column tablet grid spans the row.
            const feature = FLAVOURS.length % 2 === 1 && index === FLAVOURS.length - 1;

            return (
              <li
                key={flavour.id}
                style={toneVars(flavour)}
                onPointerEnter={(event) => {
                  if (event.pointerType !== 'touch') engage(index, event.currentTarget);
                }}
                onFocus={(event) => engage(index, event.currentTarget)}
                className={cn(
                  'w-[82vw] max-w-[24rem] shrink-0 snap-center',
                  'md:w-auto md:max-w-none',
                  feature && 'md:max-lg:col-span-2'
                )}
              >
                <FlavourCard flavour={flavour} index={index} feature={feature} />
              </li>
            );
          })}
        </ul>
      </div>

      {/* Carousel position — phones only. */}
      <div ref={railRef} className="shell mt-6 flex items-center gap-6 md:hidden">
        <p
          aria-hidden
          className="shrink-0 font-sans text-label tracking-[0.08em] text-ink lining-nums tabular-nums"
        >
          <span ref={countRef}>01</span>
          <span className="text-faint"> / {pad(FLAVOURS.length)}</span>
        </p>

        <div role="group" aria-label="Choose a flavour" className="flex flex-1 gap-2">
          {FLAVOURS.map((flavour, index) => (
            <button
              key={flavour.id}
              type="button"
              data-segment
              data-active={index === 0 ? 'true' : 'false'}
              aria-current={index === 0 ? 'true' : undefined}
              aria-label={`Show ${flavour.name}`}
              onClick={() => goTo(index)}
              className="group/seg flex h-11 flex-1 items-center"
            >
              <span className="relative block h-px w-full overflow-hidden bg-sand">
                <span className="absolute inset-0 origin-left scale-x-0 bg-ink transition-transform duration-700 ease-luxe group-data-[active=true]/seg:scale-x-100" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * The air behind the cards: a neutral orb at rest, and for each flavour a
 * wash plus an orb tint that crossfade in when that flavour is active. All
 * of it is static gradients — only opacity and the orb's `x` ever change.
 */
function Ambient({ orbRef }: { orbRef: RefObject<HTMLDivElement | null> }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_14%,black_86%,transparent)]"
    >
      {FLAVOURS.map((flavour, i) => {
        // Each wash pools under its own column.
        const x = `${(((i + 0.5) / FLAVOURS.length) * 100).toFixed(2)}%`;
        return (
          <div
            key={flavour.id}
            className={cn(
              'absolute inset-0 opacity-0 transition-opacity duration-[900ms] ease-luxe',
              ACTIVE_ON[flavour.id]
            )}
            style={{
              backgroundImage: `radial-gradient(46% 40% at ${x} 64%, ${flavour.tone.soft} 0%, transparent 100%), radial-gradient(120% 55% at 50% 100%, ${flavour.tone.soft} 0%, transparent 72%)`,
            }}
          />
        );
      })}

      {/* A zero-height flex line centres the orb without a CSS translate,
          leaving `transform` free for GSAP. */}
      <div className="absolute inset-x-0 top-[62%] flex h-0 items-center justify-center">
        <div ref={orbRef} className="relative size-[min(64rem,130vw)] shrink-0 opacity-60">
          <div className="absolute inset-0 bg-[radial-gradient(closest-side,rgb(237_227_214/0.8),transparent)] transition-opacity duration-[900ms] ease-luxe group-data-[active]/flv:opacity-0" />
          {FLAVOURS.map((flavour) => (
            <div
              key={flavour.id}
              className={cn(
                'absolute inset-0 opacity-0 transition-opacity duration-[900ms] ease-luxe',
                ACTIVE_ON[flavour.id]
              )}
              style={{
                backgroundImage: `radial-gradient(closest-side, ${flavour.tone.glow}, transparent)`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type FlavourCardProps = {
  flavour: Flavour;
  index: number;
  /** Spans the tablet row and lays out landscape. */
  feature: boolean;
};

/**
 * One flavour. The card is quiet at rest — white, hairline, a photograph —
 * and on hover it lifts, leans toward the pointer, warms its border toward
 * the flavour and lets the bottle come a little closer.
 */
function FlavourCard({ flavour, index, feature }: FlavourCardProps) {
  const { id, name, tagline, description, notes, volume, nutrition } = flavour;
  const nameId = `flv-${id}-name`;

  const stats = [
    { label: 'Protein', value: nutrition.protein, unit: 'g' },
    { label: 'Calories', value: nutrition.calories, unit: 'kcal' },
    { label: 'Sugar', value: nutrition.sugar, unit: 'g' },
  ];

  return (
    <div className="flv-rise reveal h-full">
      <Tilt max={5} perspective={1400} className="h-full">
        <div className="group/card relative h-full transition-transform duration-700 ease-luxe motion-safe:hover:-translate-y-3 motion-safe:has-[:focus-visible]:-translate-y-3">
          {/* The lifted shadow, pre-rendered; only its opacity moves. */}
          <div
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-0 rounded-card opacity-0 transition-opacity duration-700 ease-luxe',
              'shadow-[0_6px_14px_rgb(42_27_19/0.06),0_40px_80px_-30px_rgb(42_27_19/0.3),0_80px_120px_-60px_var(--tone-glow)]',
              ENGAGED
            )}
          />

          <article
            aria-labelledby={nameId}
            className={cn(
              'card-surface relative isolate flex h-full flex-col overflow-hidden rounded-card p-3',
              feature && 'md:max-lg:grid md:max-lg:grid-cols-2 md:max-lg:gap-2'
            )}
          >
            {/* Spotlight that follows the pointer via Tilt's --mx / --my. */}
            <div
              aria-hidden
              className={cn(
                'pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-700 ease-luxe',
                'bg-[radial-gradient(26rem_circle_at_var(--mx,50%)_var(--my,50%),var(--tone-soft),transparent_65%)]',
                ENGAGED
              )}
            />

            <div className={cn('relative', feature && 'md:max-lg:self-center')}>
              {/* The flavour's glow, pooled beneath the frame. */}
              <div
                aria-hidden
                className={cn(
                  'pointer-events-none absolute inset-x-[6%] -bottom-10 h-28 opacity-45 transition-[opacity,transform] duration-1000 ease-luxe',
                  'bg-[radial-gradient(closest-side,var(--tone-glow),transparent)]',
                  'motion-safe:group-hover/card:scale-x-110',
                  ENGAGED
                )}
              />

              {/* `isolate` stops Safari letting the transformed layers escape the rounded clip. */}
              <div className="flv-media relative isolate aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-(--tone-soft)">
                <div className="flv-parallax absolute inset-[-8%]">
                  <div className="flv-bottle size-full">
                    <BottleImage
                      flavour={flavour}                      className="size-full"
                      imageClassName="transition-transform duration-[1400ms] ease-luxe motion-safe:group-hover/card:scale-[1.06] motion-safe:group-hover/card:rotate-2"
                    />
                  </div>
                </div>

                {/* Sheen across the photograph. */}
                <div
                  aria-hidden
                  className={cn(
                    'pointer-events-none absolute inset-0 opacity-0 mix-blend-soft-light transition-opacity duration-700 ease-luxe',
                    'bg-[radial-gradient(30rem_circle_at_var(--mx,50%)_var(--my,30%),rgb(255_255_255/0.75),transparent_60%)]',
                    ENGAGED
                  )}
                />

                <p className="glass absolute top-3 left-3 flex h-8 items-center gap-2.5 rounded-full px-3.5 font-sans text-micro tracking-[0.12em] text-ink lining-nums tabular-nums">
                  <span aria-hidden>{pad(index + 1)}</span>
                  <span aria-hidden className="h-3 w-px bg-ink/20" />
                  <span>{volume}</span>
                </p>
              </div>
            </div>

            {/* `relative` keeps the copy painted above the glow. */}
            <div
              className={cn(
                'relative flex flex-1 flex-col px-3 pt-7 pb-3 sm:px-4',
                feature && 'md:max-lg:justify-center md:max-lg:px-5 md:max-lg:py-5'
              )}
            >
              <h3 id={nameId} className="flex items-center gap-3.5 text-h3">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full bg-(--tone) shadow-[0_0_0_5px_var(--tone-soft)]"
                />
                {name}
              </h3>

              <p className="mt-3.5 font-sans text-micro font-medium tracking-[0.2em] text-(--tone-deep) uppercase">
                {tagline}
              </p>

              <p className="mt-4 text-body text-mute">{description}</p>

              <ul aria-label={`${name} tasting notes`} className="mt-5 flex flex-wrap gap-1.5">
                {notes.map((note) => (
                  <li
                    key={note}
                    className="rounded-full border border-hair bg-canvas/70 px-3 py-1 font-sans text-[0.75rem] leading-5 text-ink-soft"
                  >
                    {note}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-7">
                <dl className="grid grid-cols-3 border-y border-hair">
                  {stats.map((stat, i) => (
                    <div
                      key={stat.label}
                      className={cn(
                        'flex flex-col-reverse gap-1.5 py-4',
                        i > 0 && 'border-l border-hair pl-3 sm:pl-4 lg:max-xl:pl-3'
                      )}
                    >
                      <dt className="font-sans text-[0.75rem] leading-4 text-mute">{stat.label}</dt>
                      <dd className="flex items-baseline gap-1 font-display text-[clamp(1.375rem,1rem+0.75vw,1.875rem)] leading-none font-light tracking-[-0.03em] text-ink lining-nums tabular-nums">
                        {stat.value}
                        <span className="font-sans text-micro tracking-normal text-mute">
                          {stat.unit}
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-5 flex items-center gap-2">
                  <Button
                    asChild
                    variant="primary"
                    size="md"
                    className="flex-1 px-4 tracking-[0.2em] sm:px-6 lg:max-xl:px-4"
                  >
                    <a href={SHOP_HREF}>Shop {name}</a>
                  </Button>
                  <a
                    href="#nutrition"
                    aria-label={`${name} nutrition facts`}
                    className={cn(buttonVariants({ variant: 'outline', size: 'md' }), 'size-12 shrink-0 px-0')}
                  >
                    <ArrowUpRight
                      aria-hidden
                      strokeWidth={1.5}
                      className="size-[1.125rem] transition-transform duration-500 ease-luxe group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5"
                    />
                  </a>
                </div>
              </div>
            </div>

            {/* Border warmed toward the flavour. */}
            <div
              aria-hidden
              className={cn(
                'pointer-events-none absolute inset-0 rounded-[inherit] border border-(--tone-line) opacity-0 transition-opacity duration-700 ease-luxe',
                ENGAGED
              )}
            />
          </article>
        </div>
      </Tilt>
    </div>
  );
}
