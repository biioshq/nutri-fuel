'use client';

import { useRef, type CSSProperties } from 'react';
import { Star } from 'lucide-react';
import { Ambient } from '@/components/motion/Ambient';
import { Counter } from '@/components/motion/Counter';
import { Float } from '@/components/motion/Float';
import { SectionIntro } from '@/components/ui/SectionIntro';
import { Dumbbell, Shaker } from '@/components/ui/illustrations';
import { gsap, useGsap } from '@/hooks/useGsap';
import { useMotionOK } from '@/hooks/useMediaQuery';
import { RESULTS_STATS, TESTIMONIALS, type Testimonial } from '@/lib/content';
import { FLAVOURS, type Flavour, type FlavourId } from '@/lib/flavours';

/**
 * CUSTOMER RESULTS
 *
 * The proof section, so it is the quietest one: thin figures, white cards and
 * nothing that asks to be clicked. The one gesture it makes is scale — two
 * rails of testimonials drifting past each other as the page scrolls, so the
 * visitor feels the *volume* of people before reading any single quote.
 *
 * Decisions worth knowing before editing:
 *
 * - The rails are scrubbed, never auto-played. A marquee moves whether or not
 *   you are looking; this only moves when you do, and stops when you stop to
 *   read.
 * - Travel is always exactly the track's overflow, so neither rail ever shows
 *   an empty edge. On very wide screens that overflow would shrink to almost
 *   nothing, so a couple of echo cards switch on there to keep the glide alive.
 * - The second rail is the first one reversed — a visual echo, not new
 *   content — so it is hidden from assistive tech as a whole.
 * - Under reduced motion there is no scrub at all: the same block becomes a
 *   native, snapping horizontal scroller, and every card is simply visible.
 * - A shaker and a dumbbell stand at the far left and right as beige
 *   watermarks. They are deliberately placed *in* the rail's mask fade, where
 *   the cards have already dissolved, so the rails appear to glide across
 *   something rather than across nothing.
 */

const FLAVOUR_BY_ID = Object.fromEntries(FLAVOURS.map((f) => [f.id, f])) as Record<
  FlavourId,
  Flavour
>;

const LEDE =
  'Runners, coaches, climbers and physios who read the label before the flavour, on the bottle that earned a permanent place in their routine.';

/**
 * Echo cards appended to each rail, switched on only where the viewport is so
 * wide that six cards would barely overflow it. Never shown under reduced
 * motion, where there is no glide for them to feed.
 */
const WIDE_ECHOES = [
  'hidden motion-safe:min-[1800px]:block',
  'hidden motion-safe:min-[2240px]:block',
] as const;

type Slot = { key: string; item: Testimonial; echo: boolean; className?: string };

function buildRail(items: readonly Testimonial[], name: string, echo: boolean): Slot[] {
  const cards: Slot[] = items.map((item, i) => ({ key: `${name}-${i}`, item, echo }));
  const echoes: Slot[] = WIDE_ECHOES.map((className, i) => ({
    key: `${name}-echo-${i}`,
    item: items[i % items.length]!,
    echo: true,
    className,
  }));
  return [...cards, ...echoes];
}

const RAIL_A = buildRail(TESTIMONIALS, 'a', false);
const RAIL_B = buildRail([...TESTIMONIALS].reverse(), 'b', true);

/**
 * The fade width lives in a custom property so reduced motion can narrow it to
 * the gutter: there the first card rests at the gutter and must not sit
 * inside the fade.
 */
const RAIL_MASK =
  'linear-gradient(90deg, transparent 0, #000 var(--res-fade), #000 calc(100% - var(--res-fade)), transparent 100%)';

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

export function Results() {
  const sectionRef = useRef<HTMLElement>(null);
  const railsRef = useRef<HTMLDivElement>(null);
  const motionOK = useMotionOK();

  useGsap(
    () => {
      const rails = railsRef.current;
      if (!motionOK || !rails) return;

      const stats = sectionRef.current?.querySelector<HTMLElement>('.res-stats');
      const trackA = rails.querySelector<HTMLElement>('.res-track-a');
      const trackB = rails.querySelector<HTMLElement>('.res-track-b');
      if (!stats || !trackA || !trackB) return;

      // --- Stats: the figures count on their own; the rows settle in under them.
      gsap.fromTo(
        stats.querySelectorAll('.res-stat'),
        { opacity: 0, y: 28 },
        {
          opacity: 1,
          y: 0,
          duration: 1.3,
          ease: 'expo.out',
          stagger: 0.12,
          scrollTrigger: { trigger: stats, start: 'top 86%', once: true },
        }
      );

      // --- Cards rise in. Rail B begins parked at its far end, so its stagger
      // runs from the end — the cards actually on screen arrive first.
      gsap
        .timeline({ scrollTrigger: { trigger: rails, start: 'top 84%', once: true } })
        .fromTo(
          trackA.querySelectorAll('.res-card'),
          { opacity: 0, y: 56 },
          { opacity: 1, y: 0, duration: 1.4, ease: 'expo.out', stagger: 0.09 },
          0
        )
        .fromTo(
          trackB.querySelectorAll('.res-card'),
          { opacity: 0, y: 56 },
          {
            opacity: 1,
            y: 0,
            duration: 1.4,
            ease: 'expo.out',
            stagger: { each: 0.09, from: 'end' },
          },
          0.14
        );

      // --- The glide. Functional values re-measure on every refresh, so a
      // resize (or an echo card switching on) never leaves a gap at the edge.
      const travel = (track: HTMLElement) => -Math.max(0, track.scrollWidth - rails.clientWidth);
      const scrub = () => ({
        trigger: rails,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1,
        invalidateOnRefresh: true,
      });

      gsap.fromTo(
        trackA,
        { x: 0 },
        { x: () => travel(trackA), ease: 'none', scrollTrigger: scrub() }
      );
      gsap.fromTo(
        trackB,
        { x: () => travel(trackB) },
        { x: 0, ease: 'none', scrollTrigger: scrub() }
      );

      // --- The watermarks, moved on a third, slower track than either rail,
      // so the section reads as three depths rather than two.
      gsap.fromTo(
        '.res-drift',
        { y: (i: number) => (i === 0 ? 40 : -32) },
        {
          y: (i: number) => (i === 0 ? -40 : 32),
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
            invalidateOnRefresh: true,
          },
        }
      );
    },
    [motionOK],
    sectionRef
  );

  return (
    <section
      ref={sectionRef}
      id="results"
      aria-labelledby="results-heading"
      // The rails carry 5rem of padding for their shadows, so the section's own
      // bottom padding gives that back — the visible rhythm is still py-section.
      className="relative isolate overflow-x-clip pt-section pb-[calc(var(--spacing-section)_-_5rem)]"
    >
      {/* A low cream light pooled behind the cards, so white cards on a white
          page still have something to stand on. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[78%] bg-[radial-gradient(60%_55%_at_50%_58%,rgb(246_239_228/0.75)_0%,rgb(250_248_245/0.4)_45%,transparent_72%)]"
      />

      {/* A white section has to stay white, so the ambient layer here is beige
          at half strength — read as a change of light, not as shapes. */}
      <Ambient tone="cream" className="-z-10" />

      {/* The drawings hang off the edges and are clipped by this wrapper, so
          there is no width here for the page to overflow. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="res-drift absolute top-[44%] left-[-4%] w-[clamp(5.5rem,12vw,9.5rem)] sm:left-[-1%] lg:left-[1.5%]">
          <Float amplitude={16} rotate={2} duration={7.2} phase={0.2}>
            <Shaker strokeWidth={1.7} className="h-auto w-full text-beige" />
          </Float>
        </div>

        <div className="res-drift absolute top-[60%] right-[-5%] w-[clamp(6rem,14vw,11rem)] sm:right-[-1%] lg:right-[1.5%]">
          <Float amplitude={20} rotate={-2.4} duration={8.4} phase={0.65}>
            <Dumbbell strokeWidth={1.7} className="h-auto w-full text-beige" />
          </Float>
        </div>
      </div>

      <div className="shell">
        <div className="grid gap-y-14 lg:grid-cols-12 lg:items-end lg:gap-x-10">
          <SectionIntro
            id="results-heading"
            eyebrow="Customer Results"
            title="Trusted by people who train."
            lede={LEDE}
            // A horizontal wipe — the heading moves along the same axis as the rails.
            mode="mask-wipe"
            className="lg:col-span-7"
            titleClassName="max-w-[11em]"
          />

          <StatList />
        </div>
      </div>

      <div
        ref={railsRef}
        className={[
          'res-rails relative mt-8 flex flex-col gap-4 py-20 sm:mt-12 sm:gap-6 lg:mt-16',
          'overflow-x-clip [--res-fade:clamp(1.5rem,9vw,10rem)]',
          // Reduced motion: the same block, scrolled by hand.
          'motion-reduce:snap-x motion-reduce:snap-mandatory motion-reduce:overflow-x-auto',
          'motion-reduce:overscroll-x-contain motion-reduce:scroll-px-gutter',
          'motion-reduce:[--res-fade:var(--spacing-gutter)]',
          // The rail is full-bleed, so an outward focus ring would be clipped.
          'focus-visible:[outline-offset:-6px]',
        ].join(' ')}
        style={{ maskImage: RAIL_MASK, WebkitMaskImage: RAIL_MASK }}
        // Only a real scroller should take focus — under motion it is not one.
        {...(motionOK
          ? {}
          : { role: 'region', 'aria-label': 'Customer testimonials, scroll horizontally', tabIndex: 0 })}
      >
        <Rail slots={RAIL_A} className="res-track-a" label="Customer testimonials" />
        <Rail slots={RAIL_B} className="res-track-b" decorative />
      </div>
    </section>
  );
}

/**
 * Three figures. Rows on phones and beside the heading on desktop, where the
 * column is narrow and tall; three columns in between, where it is wide and
 * short. The suffix is set small and quiet so the digits do the talking.
 */
function StatList() {
  return (
    <ul
      className={[
        'res-stats grid grid-cols-1 lg:col-span-5 lg:col-start-8 xl:col-span-4 xl:col-start-9',
        'sm:grid-cols-3 sm:border-t sm:border-hair lg:grid-cols-1 lg:border-t-0',
      ].join(' ')}
    >
      {RESULTS_STATS.map((stat) => (
        <li
          key={stat.label}
          className={[
            'res-stat reveal flex items-baseline justify-between gap-6 border-b border-hair py-6 first:border-t',
            'sm:mt-9 sm:flex-col sm:items-start sm:justify-start sm:gap-4 sm:border-b-0 sm:border-l sm:py-1 sm:pl-6',
            'sm:first:border-t-0 sm:first:border-l-0 sm:first:pl-0',
            'lg:mt-0 lg:flex-row lg:items-baseline lg:justify-between lg:border-b lg:border-l-0 lg:py-7 lg:pl-0 lg:first:border-t',
          ].join(' ')}
        >
          <p className="display-face flex items-baseline text-[clamp(3.25rem,2.2rem+3.6vw,5rem)] whitespace-nowrap">
            <Counter value={stat.value} decimals={stat.decimals} duration={2.2} />
            <span className="ml-1.5 text-[0.36em] font-light tracking-normal text-mute">
              {stat.suffix}
            </span>
          </p>
          <p className="max-w-[14ch] text-right font-sans text-micro font-medium tracking-[0.2em] text-mute uppercase sm:max-w-none sm:text-left lg:max-w-[16ch] lg:text-right">
            {stat.label}
          </p>
        </li>
      ))}
    </ul>
  );
}

type RailProps = {
  slots: Slot[];
  className: string;
  label?: string;
  /** The whole rail is an echo of another one, so assistive tech skips it. */
  decorative?: boolean;
};

function Rail({ slots, className, label, decorative = false }: RailProps) {
  return (
    <ul
      aria-label={label}
      aria-hidden={decorative || undefined}
      className={`res-track ${className} flex w-max gap-4 self-start px-gutter sm:gap-6 motion-safe:will-change-transform`}
    >
      {slots.map(({ key, item, echo, className: slotClass }) => (
        <li
          key={key}
          aria-hidden={(echo && !decorative) || undefined}
          className={`res-card reveal w-[82vw] shrink-0 snap-start sm:w-[clamp(18rem,30vw,27rem)] ${slotClass ?? ''}`}
        >
          <TestimonialCard item={item} />
        </li>
      ))}
    </ul>
  );
}

/**
 * One voice. White, hairline-bordered and still — the quote is set in the
 * display face so it reads as a statement, not a review. The flavour shows up
 * only as a tint: the avatar, a dot, and the corner mark on hover.
 *
 * Hover lifts the card and crossfades a deeper, faintly flavour-tinted shadow
 * held on a pseudo-element; the shadow itself is never animated.
 */
function TestimonialCard({ item }: { item: Testimonial }) {
  const flavour = FLAVOUR_BY_ID[item.flavour];
  const tone = {
    '--tone': flavour.tone.accent,
    '--tone-deep': flavour.tone.deep,
    '--tone-soft': flavour.tone.soft,
    '--tone-glow': flavour.tone.glow,
  } as CSSProperties;

  return (
    <figure
      style={tone}
      className={[
        'group/card card-surface relative isolate flex h-full flex-col rounded-card p-6 xl:p-8',
        'transition-transform duration-700 ease-luxe hover:-translate-y-1.5',
        'before:pointer-events-none before:absolute before:-inset-px before:-z-10 before:rounded-[inherit] before:opacity-0',
        'before:shadow-[0_2px_6px_rgb(42_27_19/0.05),0_30px_60px_-28px_rgb(42_27_19/0.26),0_36px_70px_-44px_var(--tone-glow)]',
        'before:transition-opacity before:duration-700 before:ease-luxe hover:before:opacity-100',
      ].join(' ')}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute top-4 right-6 -z-10 font-display text-[6.5rem] leading-[0.8] font-extralight text-beige transition-colors duration-700 ease-luxe select-none group-hover/card:text-[color:color-mix(in_oklab,var(--tone)_60%,white)] sm:top-5 sm:right-8"
      >
        &ldquo;
      </span>

      <div role="img" aria-label="Rated 5 out of 5" className="flex items-center gap-1 text-cocoa">
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} aria-hidden className="size-3.5 fill-current" strokeWidth={0} />
        ))}
      </div>

      <blockquote className="mt-5 sm:mt-6">
        <p className="font-display text-[clamp(1.1875rem,1.02rem+0.55vw,1.5625rem)] leading-[1.38] font-light tracking-[-0.012em] text-balance text-ink">
          {item.quote}
        </p>
      </blockquote>

      <figcaption className="mt-auto pt-9">
        <div aria-hidden className="hairline" />

        <div className="mt-6 flex items-center gap-4">
          <span
            aria-hidden
            className="grid size-12 shrink-0 place-items-center rounded-full bg-(--tone-soft) font-display text-[0.9375rem] font-normal tracking-[0.06em] text-(--tone-deep) shadow-[inset_0_0_0_1px_rgb(255_255_255/0.9),0_0_0_1px_var(--color-hair)]"
          >
            {initialsOf(item.name)}
          </span>
          <span className="flex flex-col">
            <span className="font-sans text-[0.9375rem] leading-snug font-medium text-ink">
              {item.name}
            </span>
            <span className="font-sans text-[0.8125rem] leading-snug text-mute">{item.role}</span>
          </span>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
          <span className="inline-flex h-7 items-center gap-2 rounded-full border border-hair bg-canvas/70 pr-3 pl-2.5 font-sans text-[0.75rem] font-medium text-ink-soft">
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-(--tone) shadow-[0_0_0_3px_var(--tone-soft)]"
            />
            {flavour.name}
            <span className="sr-only"> flavour</span>
          </span>
          <span className="font-sans text-micro font-medium tracking-[0.18em] text-cocoa uppercase">
            {item.result}
          </span>
        </div>
      </figcaption>
    </figure>
  );
}
