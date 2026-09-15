'use client';

import { useRef, type CSSProperties, type ReactNode } from 'react';
import { Counter } from '@/components/motion/Counter';
import { Tilt } from '@/components/motion/Tilt';
import { SectionIntro } from '@/components/ui/SectionIntro';
import { gsap, ScrollTrigger, useGsap } from '@/hooks/useGsap';
import { useHasFinePointer, useMotionOK } from '@/hooks/useMediaQuery';
import { BENEFITS, COMPARISON, type Benefit, type BenefitIcon } from '@/lib/content';
import { FLAVOURS } from '@/lib/flavours';
import { cn } from '@/lib/utils';

/* ==========================================================================
   Data that only this section draws.
   The benefit copy itself comes from lib/content; these are the small
   figures the visuals need that the copy only mentions in passing.
   ========================================================================== */

/** The ingredient chips. Each dot borrows a flavour colour where it has one. */
const INGREDIENTS = [
  { name: 'Milk protein', dot: 'var(--color-sand)' },
  { name: 'Cocoa', dot: 'var(--color-cocoa-lit)' },
  { name: 'Vanilla bean', dot: 'var(--color-vanilla-deep)' },
  { name: 'Strawberry', dot: 'var(--color-berry)' },
  { name: 'Sea salt', dot: 'var(--color-beige)' },
  { name: 'Oat fibre', dot: 'var(--color-sand)' },
  { name: 'Sunflower lecithin', dot: 'var(--color-vanilla)' },
  { name: 'Stevia leaf', dot: 'var(--color-faint)' },
  { name: 'Gellan', dot: 'var(--color-beige)' },
] as const;

/** Taken straight from the "No artificial flavours" body copy. */
const ARTIFICIALS = ['Flavours', 'Colours', 'Sweeteners'] as const;

/** The 5.6 g of BCAAs, broken down. Leucine's 2.7 g is quoted in the copy. */
const BCAAS = [
  { name: 'Leucine', grams: 2.7, fill: 'linear-gradient(90deg, #4a2f21, var(--color-cocoa))' },
  { name: 'Isoleucine', grams: 1.5, fill: 'linear-gradient(90deg, var(--color-cocoa), var(--color-cocoa-lit))' },
  { name: 'Valine', grams: 1.4, fill: 'linear-gradient(90deg, var(--color-cocoa-lit), var(--color-vanilla-deep))' },
] as const;
const BCAA_TOTAL = BCAAS.reduce((sum, row) => sum + row.grams, 0);

const SUGAR = COMPARISON.rows.find((row) => row.id === 'sugar');
const BCAA_LABEL = COMPARISON.rows.find((row) => row.id === 'bcaa')?.label ?? 'BCAAs';
const VOLUME = FLAVOURS[0]?.volume ?? '300 ml';

/* ==========================================================================
   Layout
   ========================================================================== */

type Surface = 'light' | 'warm' | 'dark';

/**
 * lg: a 12-column bento — protein holds the left half across two rows, the
 * four quiet tiles make a 2×2 beside it, and muscle closes the grid full width
 * so nothing is left ragged. md: protein and muscle go full width around a
 * 2×2. Phones: one column, in reading order.
 */
const LAYOUT: Record<BenefitIcon, { span: string; surface: Surface }> = {
  protein: { span: 'md:col-span-2 lg:col-span-6 lg:row-span-2', surface: 'dark' },
  sugar: { span: 'lg:col-span-3', surface: 'light' },
  ingredients: { span: 'lg:col-span-3', surface: 'light' },
  natural: { span: 'lg:col-span-3', surface: 'light' },
  recovery: { span: 'lg:col-span-3', surface: 'light' },
  muscle: { span: 'md:col-span-2 lg:col-span-12', surface: 'warm' },
};

/**
 * Surfaces are painted inline rather than with `card-surface`: that utility
 * carries its own shadow, and the reveal's clip-path would shear a shadow off
 * the element it clips. The shadow lives on a separate layer instead.
 */
const SURFACES: Record<Surface, { card: string; background: string; spot: string; edge: string }> = {
  light: {
    card: 'border-hair group-hover/tile:border-sand/70',
    background: 'linear-gradient(170deg, #ffffff 0%, #ffffff 55%, var(--color-pearl) 100%)',
    spot: 'rgb(246 239 228 / 0.9)',
    edge: 'var(--color-sand)',
  },
  warm: {
    card: 'border-beige group-hover/tile:border-sand/60',
    background:
      'radial-gradient(70% 120% at 100% 0%, rgb(255 255 255 / 0.65) 0%, transparent 60%), linear-gradient(135deg, var(--color-cream) 0%, #f2e9dd 55%, var(--color-beige) 100%)',
    spot: 'rgb(255 255 255 / 0.6)',
    edge: 'rgb(255 255 255 / 0.95)',
  },
  dark: {
    card: 'border-white/[0.06] group-hover/tile:border-white/[0.12]',
    background:
      'radial-gradient(90% 70% at 88% 4%, rgb(154 106 79 / 0.34) 0%, transparent 62%), radial-gradient(70% 60% at 0% 100%, rgb(107 68 48 / 0.28) 0%, transparent 70%), linear-gradient(160deg, #2e1e15 0%, var(--color-cocoa-deep) 45%, #1a110b 100%)',
    spot: 'rgb(233 220 196 / 0.09)',
    edge: 'rgb(233 220 196 / 0.4)',
  },
};

/* Protein ring geometry — a circle drawn as a path so it starts at twelve
   o'clock and runs clockwise, plus one tick per gram. Rounded to fixed
   strings so server and client markup match exactly. */
const RING_PATH = 'M100 8a92 92 0 1 1 0 184a92 92 0 1 1 0-184';
const RING_GRAMS = 25;
const RING_TICKS = Array.from({ length: RING_GRAMS }, (_, i) => {
  const angle = ((i + 1) / RING_GRAMS) * Math.PI * 2;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  return {
    x1: (100 + sin * 78).toFixed(2),
    y1: (100 - cos * 78).toFixed(2),
    x2: (100 + sin * 83).toFixed(2),
    y2: (100 - cos * 83).toFixed(2),
  };
});

/** Split "25g" → 25 + "g", "5.6g" → 5.6 + "g", "2-phase" → 2 + "-phase". */
function parseStat(stat: string) {
  const match = /^(\d+(?:\.(\d+))?)(.*)$/.exec(stat);
  if (!match) return null;
  return {
    value: Number(match[1]),
    decimals: match[2]?.length ?? 0,
    unit: match[3] ?? '',
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * WHY AJAY PROTEIN
 *
 * A bento of six numbers, each given the one small drawing that makes it
 * land: a gram-by-gram ring for protein, two bars for sugar, a drifting shelf
 * of ingredients, a strike-through for the things left out, the two waves of
 * whey and casein, and the BCAA split.
 *
 * Rhythm comes from surface, not colour: one dark cocoa tile to anchor the
 * grid, one warm cream tile to close it, white between. Accents stay inside
 * the drawings.
 *
 * Motion is layered so nothing fights over a transform: the grid item takes
 * the entrance (scale, rise), `Tilt` owns the pointer lean, an inner wrapper
 * owns the hover lift, and the card itself owns the clip-path opening. Every
 * drawing plays inside its tile's own reveal, and the idle loops (icons, the
 * ingredient drift) only run while the section is on screen.
 */
export function WhyUs() {
  const rootRef = useRef<HTMLElement>(null);
  const motionOK = useMotionOK();
  const finePointer = useHasFinePointer();

  useGsap(
    () => {
      const root = rootRef.current;
      if (!motionOK || !root) return;

      const tiles = gsap.utils.toArray<HTMLElement>('.why-tile');

      // --- Resting "before" states -------------------------------------------
      // Only the grid items wear `.reveal`; everything inside them is hidden
      // here, so reduced motion simply never hides it.
      gsap.set(['.why-draw', '.why-wave', '.why-arc'], { strokeDasharray: '1 2', strokeDashoffset: 1.02 });
      gsap.set('.why-bar', { clipPath: 'inset(0% 100% 0% 0% round 999px)' });
      gsap.set('.why-strike', { scaleX: 0 });
      gsap.set('.why-struck', { opacity: 1 });
      gsap.set('.why-rise', { yPercent: 108, opacity: 0 });
      gsap.set('.why-fade', { opacity: 0, y: 16 });
      gsap.set('.why-shade', { opacity: 0 });
      gsap.set('.why-pop', { scale: 0, opacity: 0, transformOrigin: '50% 50%' });
      gsap.set('.why-tick', { opacity: 0.16 });
      gsap.set('.why-ring-head', { svgOrigin: '100 100', rotation: 0, opacity: 0 });
      gsap.set('.why-ico-sway', { svgOrigin: '12 4' });
      gsap.set('.why-ico-leaf-l', { svgOrigin: '12 14.5' });
      gsap.set('.why-ico-leaf-r', { svgOrigin: '12 12' });
      gsap.set('.why-ico-shield', { svgOrigin: '12 12' });

      // GSAP warns on empty targets; not every tile has every kind of part.
      const tween = (
        tl: gsap.core.Timeline,
        targets: Element[],
        vars: gsap.TweenVars,
        position: number
      ) => {
        if (targets.length) tl.to(targets, vars, position);
      };

      // --- One reveal per tile -----------------------------------------------
      const revealed = new Set<HTMLElement>();
      const reveals = new Map<HTMLElement, gsap.core.Timeline>();
      const idles = new Map<HTMLElement, gsap.core.Timeline>();
      let inView = false;

      const sync = () => {
        idles.forEach((idle, tile) => {
          if (inView && revealed.has(tile)) idle.play();
          else idle.pause();
        });
        marquees.forEach((loop) => (inView ? loop.play() : loop.pause()));
      };

      tiles.forEach((tile) => {
        const q = gsap.utils.selector(tile);
        const card = q('.why-clip');

        const tl = gsap.timeline({
          paused: true,
          onComplete: () => {
            revealed.add(tile);
            sync();
          },
        });

        tl.fromTo(
          tile,
          { opacity: 0, y: 40, scale: 0.94 },
          { opacity: 1, y: 0, scale: 1, duration: 1.4, ease: 'expo.out' },
          0
        );
        if (card.length) {
          tl.fromTo(
            card,
            { clipPath: 'inset(10% round 2rem)' },
            {
              clipPath: 'inset(0% round 2rem)',
              duration: 1.35,
              ease: 'expo.out',
              // At rest the card clips nothing — and never a hover shadow.
              clearProps: 'clipPath',
            },
            0
          );
        }
        tween(tl, q('.why-shade'), { opacity: 1, duration: 1.2, ease: 'power2.out' }, 0.5);
        tween(tl, q('.why-draw'), { strokeDashoffset: 0, duration: 1.3, stagger: 0.09, ease: 'power3.inOut' }, 0.3);
        tween(tl, q('.why-rise'), { yPercent: 0, opacity: 1, duration: 1.1, ease: 'expo.out' }, 0.25);
        tween(tl, q('.why-fade'), { opacity: 1, y: 0, duration: 1.1, stagger: 0.08, ease: 'power4.out' }, 0.4);
        tween(tl, q('.why-bar'), {
          clipPath: 'inset(0% 0% 0% 0% round 999px)',
          duration: 1.6,
          stagger: 0.14,
          ease: 'expo.out',
        }, 0.6);
        tween(tl, q('.why-strike'), { scaleX: 1, duration: 0.85, stagger: 0.18, ease: 'power3.inOut' }, 0.7);
        tween(tl, q('.why-struck'), { opacity: 0.42, duration: 0.6, stagger: 0.18, ease: 'power2.out' }, 1);
        // Whey arrives fast and falls away; casein takes its time.
        tween(tl, q('.why-wave-a'), { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' }, 0.55);
        tween(tl, q('.why-wave-b'), { strokeDashoffset: 0, duration: 2.2, ease: 'power1.inOut' }, 0.85);
        tween(tl, q('.why-area'), { opacity: 1, duration: 1.4, ease: 'power2.out' }, 1.2);
        tween(tl, q('.why-pop'), { scale: 1, opacity: 1, duration: 0.8, stagger: 0.7, ease: 'expo.out' }, 0.95);

        reveals.set(tile, tl);
        idles.set(tile, idleFor(tile));
      });

      gsap.set('.why-area', { opacity: 0 });

      // --- Entrance: in grid order, row by row ---------------------------------
      // Batching groups the tiles whose tops cross together — a row on desktop,
      // a pair on tablet, one at a time on a phone — and staggers inside it.
      const calls: gsap.core.Tween[] = [];
      ScrollTrigger.batch(tiles, {
        start: 'top 88%',
        once: true,
        interval: 0.1,
        onEnter: (batch) => {
          batch.forEach((el, i) => {
            const tl = reveals.get(el as HTMLElement);
            if (tl) calls.push(gsap.delayedCall(i * 0.12, () => void tl.play()));
          });
        },
      });

      // --- Protein ring, in step with its counter ------------------------------
      // The Counter counts over 2.1s on power2.out from its own trigger at
      // `top 88%`. The arc uses the same curve from the same line, and each
      // tick lights at the moment the count reaches its gram — the inverse of
      // power2.out, solved per tick.
      const ringStat = root.querySelector('.why-ring-stat');
      if (ringStat) {
        const COUNT = 2.1;
        const START = 0.12;
        const ring = gsap.timeline({ paused: true });
        ring
          .to('.why-arc', { strokeDashoffset: 0, duration: COUNT, ease: 'power2.out' }, START)
          .to('.why-ring-head', { rotation: 360, duration: COUNT, ease: 'power2.out' }, START)
          .to('.why-ring-head', { opacity: 1, duration: 0.5, ease: 'power2.out' }, START)
          .to(
            '.why-tick',
            {
              opacity: 1,
              duration: 0.45,
              ease: 'power2.out',
              stagger: (i: number) =>
                Math.max(0, COUNT * (1 - Math.sqrt(1 - (i + 1) / RING_GRAMS)) - 0.08),
            },
            START
          );
        ScrollTrigger.create({
          trigger: ringStat,
          start: 'top 88%',
          once: true,
          onEnter: () => void ring.play(),
        });
      }

      // --- Ingredient drift ---------------------------------------------------
      const marquees = new Map<HTMLElement, gsap.core.Tween>();
      gsap.utils.toArray<HTMLElement>('.why-marquee').forEach((row, i) => {
        const leftward = i % 2 === 0;
        marquees.set(
          row,
          gsap.fromTo(
            row,
            { xPercent: leftward ? 0 : -50 },
            {
              xPercent: leftward ? -50 : 0,
              duration: leftward ? 38 : 31,
              ease: 'none',
              repeat: -1,
              paused: true,
            }
          )
        );
      });

      // --- Only move while visible ---------------------------------------------
      ScrollTrigger.create({
        trigger: root,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: (self) => {
          inView = self.isActive;
          sync();
        },
      });

      // --- Hover: icons quicken, ingredients slow down to be read ---------------
      const detach: (() => void)[] = [];
      if (finePointer) {
        tiles.forEach((tile) => {
          const idle = idles.get(tile);
          const loops = gsap.utils
            .selector(tile)('.why-marquee')
            .map((row) => marquees.get(row as HTMLElement))
            .filter((loop): loop is gsap.core.Tween => Boolean(loop));

          const enter = () => {
            if (idle) gsap.to(idle, { timeScale: 2.2, duration: 0.5, overwrite: true });
            loops.forEach((loop) => gsap.to(loop, { timeScale: 0.25, duration: 0.9, overwrite: true }));
          };
          const leave = () => {
            if (idle) gsap.to(idle, { timeScale: 1, duration: 0.8, overwrite: true });
            loops.forEach((loop) => gsap.to(loop, { timeScale: 1, duration: 1.2, overwrite: true }));
          };

          tile.addEventListener('pointerenter', enter);
          tile.addEventListener('pointerleave', leave);
          detach.push(() => {
            tile.removeEventListener('pointerenter', enter);
            tile.removeEventListener('pointerleave', leave);
          });
        });
      }

      return () => {
        calls.forEach((call) => call.kill());
        detach.forEach((off) => off());
      };
    },
    [motionOK, finePointer],
    rootRef
  );

  return (
    <section
      ref={rootRef}
      id="why"
      aria-labelledby="why-heading"
      className="relative isolate overflow-x-clip py-section"
    >
      {/* A low warm pool of light under the grid, so the white cards have
          something to sit above. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[28%] bottom-0 -z-10"
        style={{
          background:
            'radial-gradient(55% 45% at 50% 55%, rgb(246 239 228 / 0.75) 0%, rgb(246 239 228 / 0) 70%)',
        }}
      />

      <div className="shell">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <SectionIntro
            id="why-heading"
            eyebrow="Why Ajay Protein"
            title="Everything you need. Nothing you don’t."
            lede="Six numbers on the label — and every one of them is there on purpose."
            mode="chars-blur"
            titleClassName="max-w-[11em]"
          />

          {/* Every flavour carries the same numbers; say so once, quietly. */}
          <div className="why-aside flex flex-col gap-3 lg:items-end lg:pb-3 lg:text-right">
            <p className="font-sans text-micro font-medium tracking-luxe text-mute uppercase">
              Per {VOLUME} bottle
            </p>
            <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Available flavours">
              {FLAVOURS.map((flavour) => (
                <li key={flavour.id} className="flex items-center gap-2 text-label text-ink-soft">
                  <span
                    aria-hidden
                    className="size-2 rounded-full ring-4 ring-(--dot-soft)"
                    style={
                      {
                        backgroundColor: flavour.tone.accent,
                        '--dot-soft': flavour.tone.soft,
                      } as CSSProperties
                    }
                  />
                  {flavour.name}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <ul className="mt-14 grid grid-cols-1 gap-3 sm:gap-4 md:mt-20 md:grid-cols-2 lg:grid-cols-12 lg:gap-5">
          {BENEFITS.map((benefit, index) => (
            <Tile key={benefit.id} benefit={benefit} index={index}>
              <TileBody benefit={benefit} index={index} motionOK={motionOK} />
            </Tile>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ==========================================================================
   Tile shell
   ========================================================================== */

/**
 * The shared frame. Two pre-rendered shadows crossfade on hover (a shadow is
 * never animated), a pointer spotlight is laid under the content, and a
 * second border — masked to a circle around the pointer — makes the edge
 * nearest the cursor catch the light.
 */
function Tile({ benefit, index, children }: { benefit: Benefit; index: number; children: ReactNode }) {
  const { span, surface } = LAYOUT[benefit.id];
  const paint = SURFACES[surface];

  const pointerCircle = (size: string, stop: string) =>
    `radial-gradient(${size} circle at var(--mx, 50%) var(--my, 50%), ${stop})`;

  return (
    <li data-benefit={benefit.id} data-index={index} className={cn('why-tile reveal group/tile relative', span)}>
      <Tilt max={4} className="h-full">
        <div className="relative h-full transition-transform duration-700 ease-luxe group-hover/tile:-translate-y-1.5">
          <span aria-hidden className="why-shade pointer-events-none absolute inset-0 rounded-card shadow-float" />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-card opacity-0 shadow-lift transition-opacity duration-700 ease-luxe group-hover/tile:opacity-100"
          />

          <article
            aria-labelledby={`why-${benefit.id}-title`}
            className={cn(
              'why-clip relative isolate h-full overflow-hidden rounded-card border transition-colors duration-700 ease-luxe',
              paint.card
            )}
            style={{ background: paint.background }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 ease-luxe group-hover/tile:opacity-100"
              style={{ background: pointerCircle('24rem', `${paint.spot} 0%, transparent 65%`) }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] border opacity-0 transition-opacity duration-500 ease-luxe group-hover/tile:opacity-100"
              style={{
                borderColor: paint.edge,
                maskImage: pointerCircle('16rem', '#000 0%, transparent 72%'),
                WebkitMaskImage: pointerCircle('16rem', '#000 0%, transparent 72%'),
              }}
            />
            {children}
          </article>
        </div>
      </Tilt>
    </li>
  );
}

function TileBody({ benefit, index, motionOK }: { benefit: Benefit; index: number; motionOK: boolean }) {
  switch (benefit.id) {
    case 'protein':
      return <ProteinTile benefit={benefit} index={index} />;
    case 'muscle':
      return <MuscleTile benefit={benefit} index={index} />;
    default:
      return (
        <div className="flex h-full flex-col p-6 sm:p-7 lg:p-8">
          <TileHead id={benefit.id} index={index} />
          <div className="mt-8 lg:mt-9">
            <SmallVisual benefit={benefit} motionOK={motionOK} />
          </div>
          <TileCopy benefit={benefit} className="mt-auto pt-9" />
        </div>
      );
  }
}

function SmallVisual({ benefit, motionOK }: { benefit: Benefit; motionOK: boolean }) {
  const statClass = 'display-face text-[clamp(3.25rem,2.6rem+2.4vw,4.75rem)]';

  switch (benefit.id) {
    case 'sugar':
      return (
        <>
          <Stat stat={benefit.stat} className={statClass} />
          <SugarBars />
        </>
      );
    case 'ingredients':
      return (
        <>
          <Stat stat={benefit.stat} className={statClass} />
          <IngredientShelf motionOK={motionOK} />
        </>
      );
    case 'natural':
      return (
        <div className="flex items-end gap-6">
          <Stat stat={benefit.stat} count={false} className={statClass} />
          <StruckList />
        </div>
      );
    case 'recovery':
      return (
        <>
          <Stat stat={benefit.stat} count={false} className={statClass} />
          <RecoveryWaves />
        </>
      );
    default:
      return null;
  }
}

/* ==========================================================================
   Shared pieces
   ========================================================================== */

function TileHead({ id, index, dark = false }: { id: BenefitIcon; index: number; dark?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <IconBadge id={id} dark={dark} />
      <span
        aria-hidden
        className={cn(
          'why-fade font-sans text-micro font-medium tabular-nums lining-nums',
          dark ? 'text-vanilla/45' : 'text-faint'
        )}
      >
        {pad(index + 1)} / {pad(BENEFITS.length)}
      </span>
    </div>
  );
}

function TileCopy({ benefit, className, dark = false, large = false }: {
  benefit: Benefit;
  className?: string;
  dark?: boolean;
  large?: boolean;
}) {
  return (
    <div className={cn('why-fade', className)}>
      <h3
        id={`why-${benefit.id}-title`}
        className={cn(
          'font-display font-light tracking-[-0.02em]',
          large ? 'text-h3' : 'text-[1.375rem] leading-[1.15]',
          dark && 'text-cream'
        )}
      >
        {benefit.title}
      </h3>
      <p
        className={cn(
          'mt-2.5 font-sans',
          large ? 'max-w-[38ch] text-body' : 'max-w-[34ch] text-[0.9375rem] leading-[1.6]',
          dark ? 'text-cream/60' : 'text-ink-soft'
        )}
      >
        {benefit.body}
      </p>
    </div>
  );
}

/**
 * A statistic. Assistive tech gets the plain string from the data; the eye
 * gets the counting digits with the unit set small beside them.
 */
function Stat({
  stat,
  count = true,
  className,
  unitClassName,
}: {
  stat: string;
  count?: boolean;
  className?: string;
  unitClassName?: string;
}) {
  const parsed = parseStat(stat);

  return (
    <p className={className}>
      <span className="sr-only">{stat}</span>
      <span aria-hidden className="flex items-baseline">
        {parsed && count ? (
          <Counter value={parsed.value} decimals={parsed.decimals} />
        ) : (
          <span className="split-line">
            <span className="why-rise inline-block lining-nums tabular-nums">
              {parsed ? parsed.value : stat}
            </span>
          </span>
        )}
        {parsed?.unit && (
          <span
            className={cn(
              'why-fade ml-[0.06em] font-sans text-[0.26em] font-normal tracking-[0.02em] text-mute',
              unitClassName
            )}
          >
            {parsed.unit}
          </span>
        )}
      </span>
    </p>
  );
}

/* ==========================================================================
   Icons — drawn on with the tile, then kept faintly alive
   ========================================================================== */

function IconBadge({ id, dark = false }: { id: BenefitIcon; dark?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-12 shrink-0 place-items-center rounded-full border transition-colors duration-500 ease-luxe',
        dark
          ? 'border-white/10 bg-white/[0.04] text-vanilla shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] group-hover/tile:border-vanilla/35'
          : 'border-hair bg-canvas/80 text-ink shadow-[inset_0_1px_0_#fff,0_6px_14px_-10px_rgb(42_27_19/0.25)] group-hover/tile:border-sand'
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-[26px] overflow-visible"
      >
        <Glyph id={id} dark={dark} />
      </svg>
    </span>
  );
}

function Glyph({ id, dark }: { id: BenefitIcon; dark: boolean }) {
  const draw = { className: 'why-draw', pathLength: 1 } as const;

  switch (id) {
    case 'protein': // dumbbell — lifts
      return (
        <g className="why-ico-lift">
          <path {...draw} d="M7.25 12h9.5" />
          <path {...draw} d="M4.75 9.25a1.25 1.25 0 0 1 2.5 0v5.5a1.25 1.25 0 0 1-2.5 0z" />
          <path {...draw} d="M16.75 9.25a1.25 1.25 0 0 1 2.5 0v5.5a1.25 1.25 0 0 1-2.5 0z" />
          <path {...draw} d="M3 10.75v2.5M21 10.75v2.5" />
        </g>
      );
    case 'sugar': // a drop, barely filled — sways
      return (
        <g className="why-ico-sway">
          <path {...draw} d="M12 3.5C14.9 7 17.5 10.4 17.5 13.9a5.5 5.5 0 0 1-11 0C6.5 10.4 9.1 7 12 3.5z" />
          <path {...draw} d="M9.25 15.75h5.5" />
        </g>
      );
    case 'ingredients': // sprout — leaves move in the air
      return (
        <>
          <path {...draw} d="M12 20.5V12M8 20.5h8" />
          <path {...draw} className="why-draw why-ico-leaf-l" d="M12 14.5C8 14.5 5.5 12.4 5.5 8.5c4 0 6.5 2.1 6.5 6z" />
          <path {...draw} className="why-draw why-ico-leaf-r" d="M12 12c0-3.9 2.3-6.5 6.5-6.5 0 3.9-2.4 6.5-6.5 6.5z" />
        </>
      );
    case 'natural': // shield — the check re-strokes itself
      return (
        <>
          <path
            {...draw}
            className="why-draw why-ico-shield"
            d="M12 3.25l6.75 2.5v5.5c0 4.3-2.85 7.9-6.75 9.5-3.9-1.6-6.75-5.2-6.75-9.5v-5.5z"
          />
          <path {...draw} className="why-draw why-ico-check" d="M9 12.25l2.1 2.1 3.9-4.1" />
        </>
      );
    case 'recovery': // bolt — flickers
      return (
        <g className="why-ico-bolt">
          <path {...draw} d="M13 2.75 5.75 13.25h5.5l-.75 8 7.75-10.5h-5.5z" />
        </g>
      );
    case 'muscle': // pulse — a bright segment runs the line
      return (
        <>
          <path {...draw} d="M2.75 12.5h4l2.25-5 3.5 10 2.5-6.5 1.5 1.5h4.75" />
          <path
            className="why-runner"
            d="M2.75 12.5h4l2.25-5 3.5 10 2.5-6.5 1.5 1.5h4.75"
            pathLength={1}
            stroke={dark ? 'var(--color-cream)' : 'var(--color-cocoa-lit)'}
            strokeWidth={1.75}
            // One short dash, parked just before the start — invisible at rest.
            strokeDasharray="0.2 1.3"
            strokeDashoffset={0.22}
          />
        </>
      );
  }
}

/** The loop each icon keeps while its tile is on screen. */
function idleFor(tile: HTMLElement): gsap.core.Timeline {
  const q = gsap.utils.selector(tile);
  const tl = gsap.timeline({ paused: true, repeat: -1 });
  const has = (selector: string) => q(selector).length > 0;

  switch (tile.dataset.benefit as BenefitIcon | undefined) {
    case 'protein':
      if (has('.why-ico-lift')) {
        tl.to(q('.why-ico-lift'), { y: -2, duration: 0.7, ease: 'power2.inOut' })
          .to(q('.why-ico-lift'), { y: 0, duration: 1.1, ease: 'sine.inOut' }, '+=0.25')
          .repeatDelay(1.6);
      }
      break;
    case 'sugar':
      if (has('.why-ico-sway')) {
        tl.to(q('.why-ico-sway'), { rotation: 5, duration: 1.6, ease: 'sine.inOut' })
          .to(q('.why-ico-sway'), { rotation: -4, duration: 2.1, ease: 'sine.inOut' })
          .to(q('.why-ico-sway'), { rotation: 0, duration: 1.5, ease: 'sine.inOut' });
      }
      break;
    case 'ingredients':
      if (has('.why-ico-leaf-l')) {
        tl.to(q('.why-ico-leaf-l'), { rotation: -9, duration: 1.7, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0)
          .to(q('.why-ico-leaf-r'), { rotation: 8, duration: 2, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.3)
          .repeatDelay(0.8);
      }
      break;
    case 'natural':
      if (has('.why-ico-check')) {
        tl.to(q('.why-ico-check'), { strokeDashoffset: -1.02, duration: 0.45, ease: 'power2.in' })
          .set(q('.why-ico-check'), { strokeDashoffset: 1.02 })
          .to(q('.why-ico-shield'), { scale: 1.06, duration: 0.5, ease: 'power2.out', yoyo: true, repeat: 1 }, '<')
          .to(q('.why-ico-check'), { strokeDashoffset: 0, duration: 0.8, ease: 'power3.out' }, '<0.15')
          .repeatDelay(3.4);
      }
      break;
    case 'recovery':
      if (has('.why-ico-bolt')) {
        tl.to(q('.why-ico-bolt'), { opacity: 0.3, duration: 0.07, ease: 'none' })
          .to(q('.why-ico-bolt'), { opacity: 1, duration: 0.1, ease: 'none' })
          .to(q('.why-ico-bolt'), { opacity: 0.5, duration: 0.06, ease: 'none' })
          .to(q('.why-ico-bolt'), { opacity: 1, duration: 0.4, ease: 'power2.out' })
          .repeatDelay(2.8);
      }
      break;
    case 'muscle':
      if (has('.why-runner')) {
        tl.fromTo(
          q('.why-runner'),
          { strokeDashoffset: 0.22 },
          { strokeDashoffset: -1.02, duration: 1.7, ease: 'power1.inOut' }
        ).repeatDelay(1.1);
      }
      break;
  }

  return tl;
}

/* ==========================================================================
   The six visuals
   ========================================================================== */

/**
 * PROTEIN — the anchor. A ring with one tick per gram closes around the
 * counter as it climbs, a small light riding the head of the arc.
 *
 * The tile reflows rather than just stacking: a tall column on desktop
 * (head, ring, copy), copy beside the ring on a tablet, one column on a phone.
 */
function ProteinTile({ benefit, index }: { benefit: Benefit; index: number }) {
  return (
    <div className="grid h-full grid-cols-1 grid-rows-[auto_1fr_auto] gap-10 p-6 sm:p-8 md:grid-cols-2 md:grid-rows-[auto_1fr] md:gap-x-10 lg:grid-cols-1 lg:grid-rows-[auto_1fr_auto] lg:p-10">
      <div className="col-start-1 row-start-1">
        <TileHead id={benefit.id} index={index} dark />
      </div>

      <div className="row-start-2 flex items-center justify-center md:col-start-2 md:row-span-2 md:row-start-1 lg:col-start-1 lg:row-span-1 lg:row-start-2">
        <div className="relative aspect-square w-full max-w-[22rem] @container lg:max-w-[27rem]">
          {/* A soft cocoa bloom behind the numerals. */}
          <div
            aria-hidden
            className="absolute inset-[16%] rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgb(154 106 79 / 0.3) 0%, rgb(154 106 79 / 0.08) 50%, transparent 72%)',
            }}
          />

          <svg aria-hidden viewBox="0 0 200 200" fill="none" className="absolute inset-0 size-full overflow-visible">
            <defs>
              <linearGradient id="why-ring-stroke" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f6efe4" />
                <stop offset="55%" stopColor="#e9dcc4" />
                <stop offset="100%" stopColor="#b8976a" />
              </linearGradient>
              <radialGradient id="why-ring-glow">
                <stop offset="0%" stopColor="#f6efe4" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#f6efe4" stopOpacity="0" />
              </radialGradient>
            </defs>

            <path d={RING_PATH} stroke="rgb(233 220 196 / 0.12)" strokeWidth={0.6} />
            <path
              className="why-arc"
              d={RING_PATH}
              pathLength={1}
              stroke="url(#why-ring-stroke)"
              strokeWidth={1.4}
              strokeLinecap="round"
            />
            <g stroke="#e9dcc4" strokeWidth={0.9} strokeLinecap="round">
              {RING_TICKS.map((tick, i) => (
                <line
                  key={i}
                  className="why-tick"
                  x1={tick.x1}
                  y1={tick.y1}
                  x2={tick.x2}
                  y2={tick.y2}
                  opacity={(i + 1) % 5 === 0 ? 0.9 : 0.5}
                />
              ))}
            </g>
            <g className="why-ring-head">
              <circle cx="100" cy="8" r="7" fill="url(#why-ring-glow)" />
              <circle cx="100" cy="8" r="1.9" fill="#f6efe4" />
            </g>
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="why-ring-stat">
              <Stat
                stat={benefit.stat}
                className="font-display text-[27cqi] leading-[0.92] font-extralight tracking-[-0.05em] text-cream"
                unitClassName="text-vanilla/70 text-[0.22em]"
              />
            </div>
            <p className="why-fade mt-3 font-sans text-micro font-medium tracking-luxe text-vanilla/55 uppercase">
              Per bottle
            </p>
          </div>
        </div>
      </div>

      <TileCopy
        benefit={benefit}
        dark
        large
        className="row-start-3 md:col-start-1 md:row-start-2 md:self-end lg:row-start-3"
      />
    </div>
  );
}

/** SUGAR — ours against the typical shake, from the comparison data. */
function SugarBars() {
  if (!SUGAR) return null;
  const max = Math.max(SUGAR.ours, SUGAR.theirs);
  const rows = [
    { label: COMPARISON.ours, value: SUGAR.ours, ours: true },
    { label: COMPARISON.theirs, value: SUGAR.theirs, ours: false },
  ];

  return (
    <dl className="mt-6 grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-3">
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <dt className={cn('why-fade text-[0.75rem]', row.ours ? 'font-medium text-ink' : 'text-mute')}>
            {row.label}
          </dt>
          <dd aria-hidden className="h-1.5 rounded-full bg-hair/60">
            <span
              className={cn('why-bar block h-full rounded-full', row.ours ? 'bg-cocoa' : 'bg-sand')}
              style={{ width: `${((row.value / max) * 100).toFixed(1)}%` }}
            />
          </dd>
          <dd className="why-fade text-right text-[0.75rem] text-ink lining-nums tabular-nums">
            {row.value}
            {SUGAR.unit}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * INGREDIENTS — two shelves of chips drifting in opposite directions, faded
 * out at both edges. Under reduced motion it is a plain wrapped list.
 * The visual is decorative; the list itself is always read out once.
 */
function IngredientShelf({ motionOK }: { motionOK: boolean }) {
  const rows = [INGREDIENTS.slice(0, 5), INGREDIENTS.slice(5)];

  const chip = (item: (typeof INGREDIENTS)[number]) => (
    <span
      key={item.name}
      className="inline-flex h-8 items-center gap-2 rounded-full border border-hair bg-canvas px-3.5 text-[0.75rem] whitespace-nowrap text-ink-soft shadow-[0_1px_2px_rgb(42_27_19/0.04)]"
    >
      <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: item.dot }} />
      {item.name}
    </span>
  );

  const edgeFade = 'linear-gradient(90deg, transparent 0%, #000 16%, #000 84%, transparent 100%)';

  return (
    <>
      <ul className="sr-only">
        {INGREDIENTS.map((item) => (
          <li key={item.name}>{item.name}</li>
        ))}
      </ul>

      {motionOK ? (
        <div
          aria-hidden
          className="why-fade -mx-6 mt-6 flex flex-col gap-2 sm:-mx-7 lg:-mx-8"
          style={{ maskImage: edgeFade, WebkitMaskImage: edgeFade }}
        >
          {rows.map((row, r) => (
            // Two identical copies, each carrying its own trailing gap, so a
            // shift of exactly -50% lands on a seamless loop.
            <div key={r} className="why-marquee flex w-max will-change-transform">
              {[0, 1].map((copy) => (
                <div key={copy} className="flex gap-2 pr-2">
                  {row.map(chip)}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div aria-hidden className="mt-6 flex flex-wrap gap-2">
          {INGREDIENTS.map(chip)}
        </div>
      )}
    </>
  );
}

/** NATURAL — the three things left out, struck through one by one. */
function StruckList() {
  return (
    <div aria-hidden className="pb-[0.55rem]">
      <p className="why-fade font-sans text-micro font-medium tracking-luxe text-mute uppercase">Artificial</p>
      <ul className="mt-2 flex flex-col gap-0.5">
        {ARTIFICIALS.map((word) => (
          <li key={word} className="relative w-fit font-display text-[1.0625rem] leading-snug font-light text-ink">
            <span className="why-struck why-fade block opacity-40">{word}</span>
            <span className="why-strike absolute top-[56%] -right-1 -left-1 block h-px origin-left bg-ink/75" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * RECOVERY — whey peaks early and falls away; casein rises slowly and is still
 * there at the end of the axis. Labels are HTML over the drawing so they stay
 * crisp and on the house typeface at every width.
 */
function RecoveryWaves() {
  const whey = 'M8 86C26 86 36 18 60 18C86 18 96 72 130 80C160 86 210 86 272 86';
  const casein = 'M8 86C70 86 96 44 156 44C212 44 240 70 272 76';

  return (
    <div aria-hidden className="mt-6">
      <div className="relative aspect-[280/100] w-full">
        <svg viewBox="0 0 280 100" fill="none" className="absolute inset-0 size-full overflow-visible">
          <defs>
            <linearGradient id="why-wave-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9a6a4f" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#9a6a4f" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M8 86H272" stroke="var(--color-hair)" strokeWidth={1} />
          <path className="why-area" d={`${casein}V86H8z`} fill="url(#why-wave-area)" />
          <path
            className="why-wave why-wave-a"
            d={whey}
            pathLength={1}
            stroke="var(--color-ink)"
            strokeWidth={1.25}
            strokeLinecap="round"
          />
          <path
            className="why-wave why-wave-b"
            d={casein}
            pathLength={1}
            stroke="var(--color-cocoa-lit)"
            strokeWidth={1.25}
            strokeLinecap="round"
          />
          <circle className="why-pop" cx="60" cy="18" r="2.75" fill="var(--color-ink)" />
          <circle className="why-pop" cx="156" cy="44" r="2.75" fill="var(--color-cocoa-lit)" />
        </svg>

        <span className="why-fade absolute top-[18%] left-[21.4%] -translate-x-1/2 -translate-y-[170%] text-[0.6875rem] whitespace-nowrap text-ink">
          Fast whey
        </span>
        <span className="why-fade absolute top-[44%] left-[55.7%] -translate-x-1/2 -translate-y-[170%] text-[0.6875rem] whitespace-nowrap text-cocoa">
          Slow casein
        </span>
      </div>
      <div className="why-fade mt-2 flex justify-between px-[3%] font-sans text-micro font-medium tracking-[0.18em] text-faint uppercase">
        <span>Now</span>
        <span>Overnight</span>
      </div>
    </div>
  );
}

/**
 * MUSCLE — closes the grid full width on the warm surface: the figure on the
 * left, the words in the middle, and the BCAA split drawn out on the right.
 */
function MuscleTile({ benefit, index }: { benefit: Benefit; index: number }) {
  return (
    <div className="grid h-full grid-cols-1 gap-10 p-6 sm:p-8 md:grid-cols-2 md:gap-x-12 lg:grid-cols-12 lg:items-end lg:gap-x-8 lg:p-10">
      <div className="md:col-start-1 md:row-start-1 lg:col-span-4">
        <TileHead id={benefit.id} index={index} />
        <div className="mt-8 flex flex-wrap items-end gap-x-4 lg:mt-12">
          <Stat
            stat={benefit.stat}
            className="display-face text-[clamp(4rem,2.4rem+5vw,8.5rem)]"
            unitClassName="text-[0.24em]"
          />
          <p className="why-fade pb-[0.9em] font-sans text-micro font-medium tracking-luxe text-cocoa uppercase">
            {BCAA_LABEL}
          </p>
        </div>
      </div>

      <TileCopy
        benefit={benefit}
        className="md:col-start-1 md:row-start-2 lg:col-span-3 lg:col-start-5 lg:row-start-1 lg:pb-2"
      />

      <div className="md:col-start-2 md:row-span-2 md:row-start-1 md:self-end lg:col-span-5 lg:col-start-8 lg:row-span-1 lg:row-start-1 lg:pb-2">
        <p className="why-fade font-sans text-micro font-medium tracking-luxe text-mute uppercase">
          Of {BCAA_TOTAL.toFixed(1)} g per bottle
        </p>
        <ul className="mt-5 flex flex-col gap-5">
          {BCAAS.map((row) => (
            <li key={row.name}>
              <div className="why-fade flex items-baseline justify-between text-[0.875rem]">
                <span className="text-ink-soft">{row.name}</span>
                <span className="text-ink lining-nums tabular-nums">
                  <Counter value={row.grams} decimals={1} duration={1.6} />
                  <span className="ml-0.5 text-mute">g</span>
                </span>
              </div>
              <div aria-hidden className="mt-2.5 h-2 rounded-full bg-canvas/70 shadow-[inset_0_0_0_1px_rgb(220_205_185/0.45)]">
                <span
                  className="why-bar block h-full rounded-full"
                  style={{ width: `${((row.grams / BCAA_TOTAL) * 100).toFixed(1)}%`, background: row.fill }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
