'use client';

import { useRef, useState, type CSSProperties, type KeyboardEvent, type RefObject } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { BottleImage } from '@/components/media/BottleImage';
import { Counter } from '@/components/motion/Counter';
import { SplitHeading } from '@/components/motion/SplitHeading';
import { SectionIntro } from '@/components/ui/SectionIntro';
import { gsap, ScrollTrigger, useGsap } from '@/hooks/useGsap';
import { useIsoLayoutEffect } from '@/hooks/useIsoLayoutEffect';
import { useMotionOK } from '@/hooks/useMediaQuery';
import { COMPARISON, type ComparisonRow } from '@/lib/content';
import { FLAVOURS, type Flavour } from '@/lib/flavours';
import { cn } from '@/lib/utils';

type Nutrition = Flavour['nutrition'];
type MetricKey = keyof Nutrition;

type Metric = { key: MetricKey; label: string; unit: string; spoken: string };

const METRICS: readonly Metric[] = [
  { key: 'protein', label: 'Protein', unit: 'g', spoken: 'grams' },
  { key: 'calories', label: 'Calories', unit: 'kcal', spoken: 'kilocalories' },
  { key: 'sugar', label: 'Sugar', unit: 'g', spoken: 'grams' },
  { key: 'carbs', label: 'Carbs', unit: 'g', spoken: 'grams' },
  { key: 'fat', label: 'Fat', unit: 'g', spoken: 'grams' },
];

/** The protein bar reads against a fixed 30 g scale, not against the value itself. */
const PROTEIN_SCALE = 30;

const ZERO: Nutrition = { protein: 0, calories: 0, sugar: 0, carbs: 0, fat: 0 };

const ROWS: readonly ComparisonRow[] = COMPARISON.rows;

const INITIAL = FLAVOURS[0]!;

function decimalsOf(n: number) {
  const [, fraction = ''] = String(n).split('.');
  return fraction.length;
}

/**
 * Decimal places shown *while* a figure is rolling. Fat is 3.5 in one flavour
 * and 3 in another, so it rolls with one place and settles on the target's own
 * precision — "3.5", then "3", never "3.0" at rest.
 */
const ROLL_DECIMALS = Object.fromEntries(
  METRICS.map(({ key }) => [key, Math.max(...FLAVOURS.map((f) => decimalsOf(f.nutrition[key])))])
) as Record<MetricKey, number>;

/**
 * An arch: a true semicircle over a 3:4 frame, with the card radius below.
 * Written as elliptical radii because `rounded-t-full` makes the browser scale
 * *every* corner down to fit, which squares off the bottom two.
 */
const ARCH: CSSProperties = {
  borderRadius:
    '50% 50% var(--radius-card) var(--radius-card) / 37.5% 37.5% var(--radius-card) var(--radius-card)',
};

/** Soft-edged blob without a blur filter: the mask does the feathering. */
const FEATHER: CSSProperties = {
  maskImage: 'radial-gradient(closest-side, #000 0%, transparent 100%)',
  WebkitMaskImage: 'radial-gradient(closest-side, #000 0%, transparent 100%)',
};

/** "+67% protein", "83% less sugar" — derived from the row, never typed in. */
function advantageOf(row: ComparisonRow): string | null {
  const { ours, theirs, better, label, unit } = row;
  if (theirs <= 0) return null;

  const delta = better === 'higher' ? ours - theirs : theirs - ours;
  const percent = Math.round((delta / theirs) * 100);
  if (percent <= 0) return null;

  // "Protein" → "protein", while an acronym like "BCAAs" keeps its capitals.
  const noun = /^[A-Z][a-z]/.test(label) ? label.toLowerCase() : label;
  if (better === 'higher') return `+${percent}% ${noun}`;

  // Mass reads as "less"; things you count — calories, ingredients — as "fewer".
  return `${percent}% ${unit === 'g' ? 'less' : 'fewer'} ${noun}`;
}

/**
 * NUTRITION
 *
 * A warm inset band that breaks the white rhythm of the page, holding two
 * instruments.
 *
 * The first is a flavour switcher. The label is the product, so the numbers
 * are the heroes: switching rolls each figure from what is on screen to the
 * new value rather than swapping it, and the panel's tint drifts to the
 * flavour's own soft colour. The figures are written straight to
 * `textContent` from a single proxy tween — React renders them once and never
 * again, so a switch costs one render, not sixty.
 *
 * The second is the comparison. Each row is a card rather than a table line,
 * the advantage badge is computed from the data, and the bars are pills that
 * slide in through a pill-shaped window — transform-only, and unlike a
 * `scaleX` their rounded caps never squash.
 */
export function Nutrition() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const digitRefs = useRef<Partial<Record<MetricKey, HTMLSpanElement | null>>>({});
  const fillRef = useRef<HTMLSpanElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);

  const [index, setIndex] = useState(0);
  const active = FLAVOURS[index] ?? INITIAL;
  const motionOK = useMotionOK();

  // Imperative state that must never trigger a render.
  const indexRef = useRef(index);
  const prevIndexRef = useRef(index);
  const shownRef = useRef<Nutrition>({ ...INITIAL.nutrition });
  const rollRef = useRef<gsap.core.Tween | null>(null);
  const revealedRef = useRef(false);
  const indicatorPlacedRef = useRef(false);

  useIsoLayoutEffect(() => {
    indexRef.current = index;
  }, [index]);

  /** Rolls every figure — and the protein bar — from what is on screen to `target`. */
  const rollTo = (target: Nutrition, instant: boolean) => {
    rollRef.current?.kill();
    const shown = shownRef.current;

    const write = (settled: boolean) => {
      for (const { key } of METRICS) {
        const node = digitRefs.current[key];
        if (!node) continue;
        const places = settled ? decimalsOf(target[key]) : ROLL_DECIMALS[key];
        node.textContent = shown[key].toFixed(places);
      }
    };

    const fill = fillRef.current;
    const scaleX = Math.min(target.protein / PROTEIN_SCALE, 1);

    if (instant) {
      Object.assign(shown, target);
      write(true);
      if (fill) gsap.set(fill, { scaleX });
      return;
    }

    rollRef.current = gsap.to(shown, {
      ...target,
      duration: 1.3,
      ease: 'power3.out',
      onUpdate: () => write(false),
      onComplete: () => write(true),
    });
    if (fill) gsap.to(fill, { scaleX, duration: 1.6, ease: 'expo.out', overwrite: true });
  };

  /* ------------------------------------------------------------------
     Entrance — panel, stage, cards, figures, then the comparison rows.
     ------------------------------------------------------------------ */
  useGsap(
    () => {
      if (!motionOK) return;
      const root = sectionRef.current;
      if (!root) return;

      // The figures count up from nothing as the cards arrive.
      revealedRef.current = false;
      rollTo(ZERO, true);

      const panel = root.querySelector('.nut-panel');
      gsap
        .timeline({ scrollTrigger: { trigger: panel, start: 'top 85%', once: true } })
        .fromTo(
          '.nut-panel',
          { y: 90, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.5, ease: 'expo.out' },
          0
        )
        .fromTo(
          '.nut-stage',
          { y: 60, scale: 0.94, opacity: 0 },
          { y: 0, scale: 1, opacity: 1, duration: 1.6, ease: 'expo.out' },
          0.15
        )
        .fromTo(
          '.nut-tabs',
          { y: 18, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out' },
          0.3
        )
        .fromTo(
          '.nut-meta',
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.2, ease: 'expo.out' },
          0.38
        )
        .fromTo(
          '.nut-card',
          { y: 44, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.2, stagger: 0.09, ease: 'expo.out' },
          0.46
        )
        .call(
          () => {
            revealedRef.current = true;
            rollTo((FLAVOURS[indexRef.current] ?? INITIAL).nutrition, false);
          },
          [],
          0.56
        );

      // The photograph drifts inside its arch; the inset wrapper gives it room.
      gsap.fromTo(
        '.nut-parallax',
        { yPercent: -4 },
        {
          yPercent: 4,
          ease: 'none',
          scrollTrigger: {
            trigger: root.querySelector('.nut-stage-shell'),
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
          },
        }
      );

      gsap.utils.toArray<HTMLElement>('.nut-fade').forEach((el) => {
        gsap.fromTo(
          el,
          { y: 16, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1.1,
            ease: 'expo.out',
            scrollTrigger: { trigger: el, start: 'top 90%', once: true },
          }
        );
      });

      // Each row owns a paused timeline; rows entering together are staggered
      // by the batch, rows entering one by one simply follow the scroll.
      const rows = gsap.utils.toArray<HTMLElement>('.nut-row');
      const plays = new Map<Element, gsap.core.Timeline>();

      rows.forEach((row) => {
        const tl = gsap.timeline({ paused: true });
        tl.fromTo(
          row.querySelector('.nut-row-card'),
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.2, ease: 'expo.out' }
        )
          .fromTo(
            row.querySelectorAll('.nut-bar'),
            { xPercent: -101 },
            { xPercent: 0, duration: 1.6, stagger: 0.12, ease: 'expo.out' },
            0.2
          )
          .fromTo(
            row.querySelectorAll('.nut-badge'),
            { y: 8, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.9, ease: 'power4.out' },
            0.6
          );
        plays.set(row, tl);
      });

      ScrollTrigger.batch(rows, {
        start: 'top 88%',
        once: true,
        onEnter: (batch) => {
          batch.forEach((row, i) => {
            plays
              .get(row)
              ?.delay(i * 0.12)
              .restart(true);
          });
        },
      });
    },
    [motionOK],
    sectionRef
  );

  /* ------------------------------------------------------------------
     Flavour change — figures.
     ------------------------------------------------------------------ */
  useIsoLayoutEffect(() => {
    if (!motionOK) {
      rollTo(active.nutrition, true);
      return;
    }
    // Before the entrance has played, the entrance itself counts to whatever
    // is selected by then.
    if (revealedRef.current) rollTo(active.nutrition, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, motionOK]);

  /* ------------------------------------------------------------------
     Flavour change — photograph and heading.
     ------------------------------------------------------------------ */
  useIsoLayoutEffect(() => {
    const slides = slideRefs.current.filter((s): s is HTMLDivElement => s !== null);
    const prev = prevIndexRef.current;
    prevIndexRef.current = index;

    if (!motionOK) {
      // Hand visibility back to the data-active classes.
      gsap.killTweensOf(slides);
      gsap.set(slides, { clearProps: 'opacity,transform,zIndex' });
      return;
    }

    if (prev === index) {
      // First run: take ownership of opacity inline, so the incoming slide
      // below is read at its true starting opacity rather than the CSS one.
      gsap.set(slides, { opacity: (i: number) => (i === index ? 1 : 0) });
      return;
    }

    const incoming = slideRefs.current[index];
    const outgoing = slideRefs.current[prev];
    if (!incoming || !outgoing) return;

    const direction = index > prev ? 1 : -1;

    slides.forEach((slide) => {
      const z = slide === incoming ? 2 : slide === outgoing ? 1 : 0;
      gsap.set(slide, { zIndex: z });
      if (z === 0) gsap.to(slide, { opacity: 0, duration: 0.5, overwrite: true });
    });

    gsap.to(outgoing, {
      opacity: 0,
      scale: 1.04,
      rotation: -1.5 * direction,
      duration: 0.9,
      ease: 'power3.inOut',
      overwrite: true,
    });

    // Only wind the incoming slide back if it is actually hidden — a rapid
    // double-switch should continue from where it is, not jump.
    if (Number(gsap.getProperty(incoming, 'opacity')) < 0.02) {
      gsap.set(incoming, { scale: 1.1, rotation: 2.5 * direction });
    }
    gsap.to(incoming, {
      opacity: 1,
      scale: 1,
      rotation: 0,
      duration: 1.3,
      ease: 'expo.out',
      overwrite: true,
    });

    const swaps = metaRef.current?.querySelectorAll('.nut-swap');
    if (swaps?.length) {
      gsap.fromTo(
        swaps,
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, stagger: 0.07, ease: 'expo.out', overwrite: true }
      );
    }
  }, [index, motionOK]);

  /* ------------------------------------------------------------------
     Segmented control indicator.
     ------------------------------------------------------------------ */
  useIsoLayoutEffect(() => {
    const indicator = indicatorRef.current;
    const tab = tabRefs.current[index];
    if (!indicator || !tab) return;

    const to = { x: tab.offsetLeft, width: tab.offsetWidth };
    if (!indicatorPlacedRef.current || !motionOK) {
      gsap.set(indicator, to);
      indicatorPlacedRef.current = true;
    } else {
      gsap.to(indicator, { ...to, duration: 0.8, ease: 'expo.out', overwrite: true });
    }
  }, [index, motionOK]);

  // Font swaps and viewport changes resize the segments: re-seat, don't animate.
  useIsoLayoutEffect(() => {
    const track = trackRef.current;
    const indicator = indicatorRef.current;
    if (!track || !indicator) return;

    const observer = new ResizeObserver(() => {
      const tab = tabRefs.current[indexRef.current];
      if (!tab) return;
      gsap.killTweensOf(indicator);
      gsap.set(indicator, { x: tab.offsetLeft, width: tab.offsetWidth });
    });
    observer.observe(track);

    return () => {
      observer.disconnect();
      gsap.killTweensOf(indicator);
    };
  }, []);

  // Tweens created outside the GSAP context die with the component.
  useIsoLayoutEffect(() => {
    const slides = slideRefs.current;
    const fill = fillRef.current;
    const meta = metaRef.current;
    return () => {
      rollRef.current?.kill();
      gsap.killTweensOf(slides.filter(Boolean));
      if (fill) gsap.killTweensOf(fill);
      if (meta) gsap.killTweensOf(meta.querySelectorAll('.nut-swap'));
    };
  }, []);

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const last = FLAVOURS.length - 1;
    let next = -1;
    if (event.key === 'ArrowRight') next = i === last ? 0 : i + 1;
    else if (event.key === 'ArrowLeft') next = i === 0 ? last : i - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    if (next < 0) return;

    event.preventDefault();
    setIndex(next);
    tabRefs.current[next]?.focus();
  };

  const toneStyle = {
    '--tone': active.tone.accent,
    '--tone-deep': active.tone.deep,
    '--tone-soft': active.tone.soft,
    '--tone-glow': active.tone.glow,
  } as CSSProperties;

  return (
    <section
      ref={sectionRef}
      id="nutrition"
      aria-labelledby="nutrition-heading"
      className="relative px-2 sm:px-3 lg:px-4"
    >
      {/* The warm band — an inset panel, so the page reads white · warm · white. */}
      <div className="relative isolate overflow-hidden rounded-card bg-[linear-gradient(180deg,var(--color-cream)_0%,var(--color-pearl)_38%,var(--color-pearl)_100%)] py-section ring-1 ring-hair/70 ring-inset lg:rounded-xl">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[70%] bg-[radial-gradient(55%_60%_at_88%_0%,rgb(237_227_214/0.7),transparent_72%),radial-gradient(45%_50%_at_0%_30%,rgb(255_255_255/0.8),transparent_70%)]"
        />

        <div className="shell">
          <SectionIntro
            id="nutrition-heading"
            eyebrow="Nutrition"
            title="Numbers that earn their place."
            lede="Per 300 ml bottle. Pick a flavour, then see how it stacks up."
            mode="mask-wipe"
          />

          {/* ============================================================
              PART A — one flavour, five figures
              ============================================================ */}
          <div
            className="nut-panel reveal relative mt-14 overflow-hidden rounded-card bg-(--tone-soft) p-4 shadow-soft ring-1 ring-white/80 transition-colors duration-1100 ease-luxe ring-inset sm:mt-20 sm:p-6 lg:mt-24 lg:rounded-xl lg:p-10 xl:p-12"
            style={toneStyle}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_55%_at_15%_0%,rgb(255_255_255/0.75),transparent_70%),radial-gradient(60%_50%_at_100%_100%,rgb(255_255_255/0.45),transparent_70%)]"
            />

            <div className="relative grid gap-y-8 sm:gap-y-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-x-12 xl:gap-x-16">
              {/* Segmented control */}
              <div className="nut-tabs reveal lg:col-start-2 lg:row-start-1 lg:self-end">
                <div
                  ref={trackRef}
                  role="tablist"
                  aria-label="Choose a flavour"
                  className="glass relative grid w-full grid-cols-3 rounded-full p-1 sm:inline-grid sm:w-auto"
                >
                  <span
                    ref={indicatorRef}
                    aria-hidden
                    className="absolute inset-y-1 left-0 rounded-full bg-canvas shadow-soft ring-1 ring-black/3"
                    style={{ width: 'calc((100% - 0.5rem) / 3)', transform: 'translateX(0.25rem)' }}
                  />
                  {FLAVOURS.map((flavour, i) => {
                    const selected = i === index;
                    return (
                      <button
                        key={flavour.id}
                        ref={(el) => {
                          tabRefs.current[i] = el;
                        }}
                        type="button"
                        role="tab"
                        id={`nutrition-tab-${flavour.id}`}
                        aria-selected={selected}
                        aria-controls="nutrition-panel"
                        tabIndex={selected ? 0 : -1}
                        onClick={() => setIndex(i)}
                        onKeyDown={(event) => onTabKey(event, i)}
                        className={cn(
                          'relative z-10 flex h-11 touch-manipulation items-center justify-center gap-2 rounded-full px-1 text-[0.8125rem] font-medium tracking-[0.01em] transition-colors duration-500 ease-luxe sm:min-w-34 sm:px-6',
                          selected ? 'text-ink' : 'text-mute hover:text-ink-soft'
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            'hidden size-2 rounded-full transition-transform duration-500 ease-luxe sm:block',
                            selected ? 'scale-100' : 'scale-75'
                          )}
                          style={{ backgroundColor: flavour.tone.accent }}
                        />
                        {flavour.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottle stage */}
              <div className="nut-stage-shell lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-center">
                <div className="nut-stage reveal relative mx-auto w-full max-w-76 sm:max-w-92 lg:max-w-120">
                  {FLAVOURS.map((flavour, i) => (
                    <span
                      key={flavour.id}
                      aria-hidden
                      data-active={i === index}
                      className="pointer-events-none absolute inset-[-18%] opacity-0 transition-opacity duration-1200 ease-luxe data-[active=true]:opacity-100"
                      style={{
                        background: `radial-gradient(closest-side, ${flavour.tone.glow}, transparent)`,
                      }}
                    />
                  ))}

                  {/* A second, hairline arch — the frame's echo. */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -inset-2.5 border border-white/80 sm:-inset-3.5"
                    style={ARCH}
                  />

                  <div
                    className="relative isolate aspect-3/4 w-full overflow-hidden bg-(--tone-soft) shadow-float"
                    style={ARCH}
                  >
                    <div className="nut-parallax absolute inset-[-6%]">
                      {FLAVOURS.map((flavour, i) => (
                        <div
                          key={flavour.id}
                          ref={(el) => {
                            slideRefs.current[i] = el;
                          }}
                          aria-hidden={i !== index}
                          data-active={i === index}
                          className="absolute inset-0 opacity-0 data-[active=true]:opacity-100"
                        >
                          <BottleImage
                            flavour={flavour}                            className="absolute inset-0 size-full"
                          />
                        </div>
                      ))}
                    </div>
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-cocoa-deep/20 to-transparent"
                    />
                  </div>

                  {/* Name chip — the names sit in a column and roll into the window. */}
                  <div
                    aria-hidden
                    className="glass absolute -bottom-5 left-1/2 flex h-12 -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-full pr-5 pl-2"
                  >
                    <span className="size-8 rounded-full bg-(--tone) ring-2 ring-white/90 transition-colors duration-700 ease-luxe" />
                    <span className="block h-5 overflow-hidden">
                      <span
                        className="flex flex-col transition-transform duration-700 ease-luxe"
                        style={{ transform: `translateY(${-index * 1.25}rem)` }}
                      >
                        {FLAVOURS.map((flavour) => (
                          <span
                            key={flavour.id}
                            className="block h-5 text-[0.8125rem] leading-5 font-medium text-ink"
                          >
                            {flavour.name}
                          </span>
                        ))}
                      </span>
                    </span>
                    <span className="h-4 w-px bg-ink/15" />
                    <span className="text-[0.8125rem] leading-5 text-mute lining-nums tabular-nums">
                      {active.volume}
                    </span>
                  </div>
                </div>
              </div>

              {/* Figures */}
              <div
                id="nutrition-panel"
                role="tabpanel"
                aria-labelledby={`nutrition-tab-${active.id}`}
                tabIndex={0}
                className="rounded-card pt-4 focus-visible:outline-offset-8 lg:col-start-2 lg:row-start-2 lg:self-start lg:pt-0"
              >
                <div
                  ref={metaRef}
                  className="nut-meta reveal flex flex-col gap-4 px-1 sm:flex-row sm:items-end sm:justify-between sm:gap-8"
                >
                  <div>
                    <h3 className="nut-swap text-h3">{active.name}</h3>
                    <p className="nut-swap mt-2 min-h-[3.4em] text-body text-ink-soft sm:min-h-0">
                      {active.tagline}
                    </p>
                  </div>
                  <p className="eyebrow shrink-0 text-(--tone-deep) transition-colors duration-700 ease-luxe sm:pb-2">
                    Per bottle · {active.volume}
                  </p>
                </div>

                <ul className="mt-6 grid grid-cols-2 gap-2.5 sm:mt-8 sm:gap-3 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                  {METRICS.map((metric) => (
                    <MetricCard
                      key={metric.key}
                      metric={metric}
                      value={active.nutrition[metric.key]}
                      digitRef={(el) => {
                        digitRefs.current[metric.key] = el;
                      }}
                      fillRef={metric.key === 'protein' ? fillRef : undefined}
                    />
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* ============================================================
              PART B — Ajay Protein vs a typical shake
              ============================================================ */}
          <div className="mt-24 grid gap-10 sm:mt-32 lg:mt-40 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:grid-rows-[auto_1fr] lg:gap-x-16 xl:gap-x-24">
            <div className="lg:col-start-1 lg:row-start-1">
              <p className="nut-fade reveal eyebrow">Compare</p>
              <SplitHeading
                as="h3"
                id="nutrition-compare-heading"
                mode="lines-rise"
                className="mt-5 max-w-[11ch] text-[clamp(2.1rem,1.4rem+2.4vw,3.75rem)] leading-[1.02] tracking-[-0.035em]"
              >
                {`${COMPARISON.ours} vs ${COMPARISON.theirs}`}
              </SplitHeading>

              <ul
                aria-label="Legend"
                className="nut-fade reveal mt-8 flex flex-wrap gap-x-7 gap-y-3 lg:mt-10"
              >
                <li className="flex items-center gap-3 text-micro font-medium text-ink uppercase">
                  <span
                    aria-hidden
                    className="h-1.5 w-7 rounded-full bg-linear-to-r from-cocoa-deep to-cocoa-lit"
                  />
                  {COMPARISON.ours}
                </li>
                <li className="flex items-center gap-3 text-micro font-medium text-mute uppercase">
                  <span aria-hidden className="h-1.5 w-7 rounded-full bg-sand" />
                  {COMPARISON.theirs}
                </li>
              </ul>
            </div>

            <ul
              aria-labelledby="nutrition-compare-heading"
              className="flex flex-col gap-3 sm:gap-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 [@media(hover:hover)_and_(pointer:fine)]:[&:has(>li:hover)>li:not(:hover)]:opacity-45"
            >
              {ROWS.map((row) => (
                <ComparisonCard key={row.id} row={row} />
              ))}
            </ul>

            <p className="nut-fade reveal max-w-[36ch] text-micro leading-relaxed tracking-[0.02em] text-mute lg:col-start-1 lg:row-start-2 lg:self-end">
              {COMPARISON.footnote}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   Local pieces
   ========================================================================== */

type MetricCardProps = {
  metric: Metric;
  value: number;
  digitRef: (el: HTMLSpanElement | null) => void;
  /** Only the protein card has a bar, and passing its ref is what makes it the hero. */
  fillRef?: RefObject<HTMLSpanElement | null>;
};

/**
 * One figure. The digits are rendered once, from the first flavour, and are
 * owned by GSAP from then on — which is why they are hidden from assistive
 * tech and shadowed by a plain, React-rendered sentence.
 */
function MetricCard({ metric, value, digitRef, fillRef }: MetricCardProps) {
  const { label, unit, spoken } = metric;
  const hero = Boolean(fillRef);
  const initial = INITIAL.nutrition[metric.key];

  return (
    <li
      className={cn(
        'nut-card reveal relative flex flex-col justify-between overflow-hidden border border-hair/80 bg-canvas shadow-soft',
        hero
          ? 'col-span-2 gap-10 rounded-card p-6 sm:p-8 md:row-span-2 lg:row-span-1 xl:row-span-2'
          : 'min-h-34 gap-6 rounded-3xl p-5 sm:min-h-40'
      )}
    >
      {hero && (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-28 -right-24 size-80 rounded-full bg-(--tone) opacity-[0.16] transition-colors duration-1100 ease-luxe"
          style={FEATHER}
        />
      )}

      <div className="relative flex items-center justify-between gap-3 text-[0.6875rem] tracking-[0.2em] uppercase">
        <span className="font-medium text-ink-soft">{label}</span>
        <span className="text-mute">{unit}</span>
      </div>

      <p className="relative flex items-baseline gap-2">
        <span
          ref={digitRef}
          aria-hidden
          className={cn(
            'display-face lining-nums tabular-nums',
            hero
              ? 'text-[clamp(4.25rem,3rem+4.5vw,7.5rem)] leading-[0.85]'
              : 'text-[clamp(2.5rem,2.1rem+1.2vw,3.5rem)] leading-none'
          )}
        >
          {initial.toFixed(decimalsOf(initial))}
        </span>
        {hero && (
          <span aria-hidden className="font-display text-h3 font-extralight text-mute">
            {unit}
          </span>
        )}
        <span className="sr-only">
          {value} {spoken}
        </span>
      </p>

      {hero && fillRef && (
        <div aria-hidden className="relative">
          <div className="relative h-0.75 overflow-hidden rounded-full bg-hair">
            <span
              ref={fillRef}
              className="absolute inset-0 origin-left rounded-full bg-linear-to-r from-ink to-cocoa"
              style={{ transform: `scaleX(${INITIAL.nutrition.protein / PROTEIN_SCALE})` }}
            />
          </div>
          <div className="mt-3 flex justify-between text-[0.6875rem] tracking-[0.2em] text-mute uppercase lining-nums tabular-nums">
            <span>0</span>
            <span>{PROTEIN_SCALE} g</span>
          </div>
        </div>
      )}
    </li>
  );
}

/**
 * A comparison row as a card. The bar is a full-width pill that slides in
 * through a pill-shaped window sized to the value, so the caps stay round at
 * every frame of the fill.
 */
function ComparisonCard({ row }: { row: ComparisonRow }) {
  const max = Math.max(row.ours, row.theirs) || 1;
  const advantage = advantageOf(row);
  const Icon = row.better === 'higher' ? ArrowUpRight : ArrowDownRight;

  return (
    <li className="nut-row group/row transition-opacity duration-500 ease-luxe">
      <div className="nut-row-card reveal relative grid gap-6 rounded-card border border-hair bg-canvas p-5 shadow-soft transition-colors duration-500 ease-luxe hover:border-sand sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:items-center sm:gap-10 sm:p-7 lg:px-9">
        {/* The lifted shadow is pre-rendered and faded — never animated. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 shadow-float transition-opacity duration-500 ease-luxe group-hover/row:opacity-100"
        />

        <div className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-3 sm:flex-col sm:items-start">
          <p className="font-display text-[1.625rem] leading-none font-extralight tracking-[-0.02em] text-ink sm:text-[1.875rem]">
            {row.label}
          </p>
          {advantage && (
            <p className="nut-badge reveal inline-flex h-8 items-center gap-1 rounded-full bg-cream pr-3 pl-2 text-[0.75rem] font-medium whitespace-nowrap text-cocoa lining-nums tabular-nums">
              <Icon aria-hidden className="size-3.5" strokeWidth={1.75} />
              {advantage}
            </p>
          )}
        </div>

        <div className="relative grid gap-4">
          <Series
            name={COMPARISON.ours}
            value={row.ours}
            ratio={row.ours / max}
            unit={row.unit}
            decimals={row.decimals}
            ours
          />
          <Series
            name={COMPARISON.theirs}
            value={row.theirs}
            ratio={row.theirs / max}
            unit={row.unit}
            decimals={row.decimals}
          />
        </div>
      </div>
    </li>
  );
}

type SeriesProps = {
  name: string;
  value: number;
  ratio: number;
  unit: string;
  decimals?: number;
  ours?: boolean;
};

function Series({ name, value, ratio, unit, decimals = 0, ours = false }: SeriesProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <span
          className={cn(
            'text-[0.6875rem] font-medium tracking-[0.2em] uppercase',
            ours ? 'text-ink' : 'text-mute'
          )}
        >
          {name}
        </span>
        <span
          className={cn(
            'flex items-baseline gap-1 font-display leading-none font-extralight',
            ours ? 'text-[1.75rem] text-ink sm:text-[2rem]' : 'text-[1.375rem] text-ink-soft sm:text-2xl'
          )}
        >
          <Counter value={value} decimals={decimals} />
          {unit && <span className="font-sans text-[0.75rem] font-normal text-mute">{unit}</span>}
        </span>
      </div>

      <div aria-hidden className="mt-2.5 h-2 rounded-full bg-hair/70">
        <div className="h-full overflow-hidden rounded-full" style={{ width: `${ratio * 100}%` }}>
          <div
            className={cn(
              'nut-bar h-full w-full rounded-full transition-[opacity,background-color] duration-500 ease-luxe',
              ours
                ? 'bg-linear-to-r from-cocoa-deep via-cocoa to-cocoa-lit opacity-85 group-hover/row:opacity-100'
                : 'bg-sand group-hover/row:bg-[#c7b398]'
            )}
          />
        </div>
      </div>
    </div>
  );
}
