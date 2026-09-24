'use client';

import { useRef, type CSSProperties, type ReactNode } from 'react';
import { BottleImage } from '@/components/media/BottleImage';
import { Float } from '@/components/motion/Float';
import { Tilt } from '@/components/motion/Tilt';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { gsap, useGsap } from '@/hooks/useGsap';
import { useMotionOK } from '@/hooks/useMediaQuery';
import { FLAVOURS, type Flavour, type FlavourId } from '@/lib/flavours';
import { SITE } from '@/lib/site';
import { cn } from '@/lib/utils';

/** The section's own lines. Short enough to live beside the scene they caption. */
const COPY = {
  eyebrow: 'The Collection',
  /** Two masks, not a splitter: the break is authored, so the scrub can own it. */
  heading: ['Crafted to be', 'craved.'],
  line: 'Three bottles. One obsession with getting it right.',
} as const;

/** Left, centre, right. Vanilla — the quiet classic — takes the front. */
const LINEUP_ORDER: readonly FlavourId[] = ['chocolate', 'vanilla', 'strawberry'];

const LINEUP = LINEUP_ORDER.map((id) => FLAVOURS.find((f) => f.id === id)).filter(
  (f): f is Flavour => Boolean(f)
);

/** Idle float per slot, so the three never bob in unison. */
const DRIFT = [
  { phase: 0.15, duration: 4.8, amplitude: 10 },
  { phase: 0.55, duration: 4.3, amplitude: 12 },
  { phase: 0.85, duration: 5.1, amplitude: 10 },
] as const;

type Choreography = {
  /** Scroll distance the stage stays pinned for. */
  end: string;
  /** Side bottles' scale tucked behind the centre, once fanned out, and at rest. */
  tucked: number;
  fanned: number;
  resting: number;
  /** Outward lean as the sides fan out, and the lean they settle into. */
  lean: number;
  settle: number;
  /** How far the sides rise while settling, in percent of their height. */
  rise: number;
  /** Wordmark travel either side of centre, in percent of its own width. */
  drift: number;
};

const DESKTOP: Choreography = {
  end: '+=220%',
  tucked: 0.8,
  fanned: 0.86,
  resting: 0.92,
  lean: 10,
  settle: 5,
  rise: -3,
  drift: 12,
};

/**
 * On a phone the three columns are a third of the screen each, so the sides
 * stay small and tucked half behind the centre — a fan held close — and lean
 * less, which keeps every rotated corner inside the viewport.
 */
const MOBILE: Choreography = {
  end: '+=140%',
  tucked: 0.5,
  fanned: 0.56,
  resting: 0.6,
  lean: 6,
  settle: 3,
  rise: -2,
  drift: 8,
};

/**
 * Layout offset of `el` from the top of `ancestor`, ignoring transforms.
 * Measured through `offsetTop` rather than a rect precisely so a refresh
 * mid-scrub — when the group is already translated — still reads the resting
 * layout.
 */
function layoutTop(el: HTMLElement, ancestor: HTMLElement) {
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== ancestor) {
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return y;
}

/**
 * The scrubbed scene. Timeline units run 0–10, so the positions below read as
 * percentages of the pin. Tweens on *different* properties overlap freely —
 * that overlap is what keeps any single stretch of scroll from feeling dead —
 * while tweens on the *same* property hand over end-to-start, with `.to` for
 * the later one so it inherits wherever the earlier one left off.
 */
function choreograph(stage: HTMLElement, c: Choreography) {
  const all = (selector: string) => Array.from(stage.querySelectorAll<HTMLElement>(selector));

  const [leftSlot, centreSlot, rightSlot] = all('.show-slot');
  const [leftBottle, centreBottle, rightBottle] = all('.show-bottle');
  const group = stage.querySelector<HTMLElement>('.show-group');
  const wordmark = stage.querySelector<HTMLElement>('.show-wordmark');
  const floor = stage.querySelector<HTMLElement>('.show-floor');
  const warm = stage.querySelector<HTMLElement>('.show-warm');

  const slotsReady = leftSlot && centreSlot && rightSlot;
  const bottlesReady = leftBottle && centreBottle && rightBottle;
  if (!slotsReady || !bottlesReady || !group || !wordmark || !floor || !warm) return;

  const sideSlots = [leftSlot, rightSlot];
  const sideBottles = [leftBottle, rightBottle];
  const bottles = [leftBottle, centreBottle, rightBottle];

  // The resting layout is the finished composition: three columns, each
  // bottle above its caption. "Tucked" is measured back from it, so the
  // bottles land exactly over their captions at any width.
  const centreX = (el: HTMLElement) => el.offsetLeft + el.offsetWidth / 2;
  const tuck = (i: number) => centreX(centreSlot) - centreX(sideSlots[i] ?? centreSlot);
  const lean = (deg: number) => (i: number) => (i === 0 ? -deg : deg);

  // While the headline is still hidden, the bottles hold the optical centre of
  // the stage (a touch low, to clear the nav); they settle into their place
  // under the copy as it resolves.
  const lift = () =>
    stage.clientHeight * 0.53 - (layoutTop(centreBottle, stage) + centreBottle.offsetHeight / 2);

  gsap.set(bottles, { transformOrigin: '50% 90%' });

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: stage,
      start: 'top top',
      end: c.end,
      pin: true,
      scrub: 1,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  // --- 1 · The fan (0–3.6) ------------------------------------------------
  tl.fromTo(sideSlots, { x: (i: number) => tuck(i) }, { x: 0, duration: 3.6, ease: 'power2.inOut' }, 0)
    .fromTo(sideBottles, { opacity: 0 }, { opacity: 1, duration: 0.9, ease: 'power1.out' }, 0.1)
    .fromTo(
      sideBottles,
      { scale: c.tucked, rotation: 0, yPercent: 3 },
      {
        scale: c.fanned,
        rotation: lean(c.lean),
        yPercent: 0,
        duration: 3.2,
        ease: 'power1.inOut',
      },
      0.2
    )
    .fromTo(centreBottle, { scale: 1 }, { scale: 0.94, duration: 3.4, ease: 'power1.inOut' }, 0)
    .fromTo(
      floor,
      { scaleX: 0.5, opacity: 0.55 },
      { scaleX: 1, opacity: 1, duration: 3.6, ease: 'power2.inOut' },
      0
    )
    // The wordmark drifts the whole length of the pin, linearly: the one thing
    // on stage that is always moving, so the scroll never reads as stalled.
    .fromTo(wordmark, { xPercent: c.drift }, { xPercent: -c.drift, duration: 10 }, 0)

    // --- 2 · The settle (3.4–6.4) -----------------------------------------
    .to(
      sideBottles,
      { rotation: lean(c.settle), yPercent: c.rise, duration: 3, ease: 'sine.inOut' },
      3.4
    )
    .to(centreBottle, { yPercent: -1.5, duration: 3, ease: 'sine.inOut' }, 3.4)
    .fromTo(
      all('.show-caption'),
      { opacity: 0, y: 28 },
      {
        opacity: 1,
        y: 0,
        duration: 1.8,
        ease: 'power2.out',
        stagger: { each: 0.3, from: 'center' },
      },
      3.9
    )

    // --- 3 · The resolve (5.8–10) -----------------------------------------
    // The group makes room first; the heading rises into the space it leaves,
    // timed so no line ever crosses the top of the centre bottle. A fromTo
    // renders its lifted state immediately, so the group holds it until here.
    .fromTo(group, { y: lift }, { y: 0, duration: 2.8, ease: 'power2.inOut' }, 5.8)
    .to(centreBottle, { scale: 1, duration: 3.6, ease: 'sine.inOut' }, 6.4)
    .to(sideBottles, { scale: c.resting, duration: 3.6, ease: 'sine.inOut' }, 6.4)
    .fromTo(warm, { opacity: 0 }, { opacity: 1, duration: 3.8, ease: 'sine.inOut' }, 6.2)
    .fromTo(
      all('.show-chip'),
      { opacity: 0, scale: 0.9 },
      { opacity: 1, scale: 1, duration: 1.6, ease: 'power3.out' },
      6.5
    )
    .fromTo(
      all('.show-mark'),
      { scale: 0, rotation: -135 },
      { scale: 1, rotation: 0, duration: 1.8, ease: 'power3.out' },
      6.7
    )
    .fromTo(
      all('.show-line'),
      { yPercent: 115, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 1.9, ease: 'power3.out', stagger: 0.32 },
      6.8
    )
    .fromTo(
      all('.show-lede'),
      { yPercent: 100, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 1.8, ease: 'power2.out' },
      8
    );
}

/**
 * SHOWCASE
 *
 * The one pinned scene on the page, staged like a product film: a single
 * bottle alone in soft light; its two siblings fan out from behind it and
 * settle; their names arrive; then the camera eases back and the headline
 * resolves above the collection.
 *
 * Decisions worth knowing before editing:
 *
 * - The DOM *is* the final composition — three grid columns, each bottle over
 *   its caption. The timeline only ever animates back toward that layout, so
 *   reduced motion (and a failed script) gets the finished picture for free,
 *   and every offset is measured from real columns instead of guessed in vw.
 * - Everything that moves is a transform or an opacity. The warmer light is a
 *   second pre-painted gradient crossfaded in, never an animated background.
 * - The heading is scrubbed from authored masks rather than `SplitHeading`,
 *   which plays once: a scene you can scroll back through must be able to
 *   un-say its headline too. The text is in the DOM from the first byte.
 * - Each bottle is three wrappers deep — scroll transform, idle float, frame —
 *   so the scrub, the float and the pointer tilt never fight over one
 *   transform.
 */
export function Showcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const motionOK = useMotionOK();

  useGsap(
    () => {
      const stage = stageRef.current;
      if (!motionOK || !stage) return;

      const mm = gsap.matchMedia();
      mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () =>
        choreograph(stage, DESKTOP)
      );
      mm.add('(max-width: 767px) and (prefers-reduced-motion: no-preference)', () =>
        choreograph(stage, MOBILE)
      );

      return () => mm.revert();
    },
    [motionOK],
    sectionRef
  );

  return (
    // `overflow-x-clip`, never `overflow-hidden`: this is the pinned stage's
    // ancestor, and a hidden overflow here would break the pin.
    <section
      ref={sectionRef}
      id="showcase"
      aria-labelledby="showcase-heading"
      className="relative overflow-x-clip bg-canvas"
    >
      <div
        ref={stageRef}
        className={cn(
          'show-stage relative isolate flex h-svh w-full flex-col items-center justify-center overflow-hidden bg-canvas',
          'pt-[clamp(4.75rem,12svh,7.5rem)] pb-[clamp(1.25rem,5svh,3.5rem)]',
          // Bottle height. Capped by the viewport's height *minus a fixed
          // budget for the copy and captions*, so a short laptop screen shrinks
          // the bottles rather than cropping the headline.
          '[--show-h:max(8rem,min(42svh,calc(100svh_-_23rem),76vw))]',
          'md:[--show-h:max(9rem,min(50svh,calc(100svh_-_24rem),34rem,44vw))]',
          'motion-reduce:h-auto motion-reduce:py-section'
        )}
      >
        {/* ---------- Light ---------- */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(62% 56% at 50% 56%, #f6efe4 0%, rgb(250 248 245 / 0.85) 40%, #ffffff 74%)',
            }}
          />
          {/* The warmer key light the scene resolves into. */}
          <div
            className="show-warm reveal absolute inset-0"
            style={{
              background:
                'radial-gradient(72% 62% at 50% 60%, #ede3d6 0%, rgb(246 239 228 / 0.85) 42%, rgb(255 255 255 / 0) 80%)',
            }}
          />
        </div>

        {/* ---------- Copy ---------- */}
        <div className="show-copy relative z-30 flex w-full flex-col items-center px-gutter text-center">
          <Eyebrow className="show-chip reveal" markClassName="show-mark">
            <span className="split-line">
              <span className="show-line reveal block">{COPY.eyebrow}</span>
            </span>
          </Eyebrow>

          {/* Height-capped so a short screen keeps the whole scene in view. */}
          <h2
            id="showcase-heading"
            className="mt-[clamp(0.75rem,2.2svh,1.5rem)] text-h2 text-ink"
            style={{ fontSize: 'min(var(--text-h2), 8.5svh)' }}
          >
            <span className="split-line md:inline-block">
              <span className="show-line reveal block">{COPY.heading[0]}</span>
            </span>{' '}
            <span className="split-line md:inline-block">
              <span className="show-line reveal text-cocoa-gradient block">{COPY.heading[1]}</span>
            </span>
          </h2>

          <div className="mt-[clamp(0.625rem,1.8svh,1.25rem)] w-full [@media(max-height:30rem)]:hidden">
            <p className="split-line">
              <span className="show-lede reveal mx-auto block max-w-[40ch] font-sans text-body text-mute md:text-lede">
                {COPY.line}
              </span>
            </p>
          </div>
        </div>

        {/* ---------- The collection ---------- */}
        <div className="show-group relative z-10 mx-auto mt-[clamp(1rem,3.5svh,2.25rem)] w-full max-w-[110rem] px-gutter">
          {/* Wordmark, centred on the bottles rather than the stage. The outer
              box positions it; the inner span is what drifts. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-[calc(var(--show-h)*0.46)] flex -translate-y-1/2 justify-center"
          >
            <span className="show-wordmark block font-display font-extralight whitespace-nowrap text-mega text-ink/[0.05] select-none">
              {SITE.wordmark}
            </span>
          </div>

          {/* The floor: one broad, soft pool of shade the three stand in. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-[calc(var(--show-h)-1.5rem)] flex justify-center"
          >
            <span
              className="show-floor block h-[clamp(2.5rem,7svh,5rem)] w-[min(94%,64rem)]"
              style={{
                background:
                  'radial-gradient(closest-side, rgb(42 27 19 / 0.13), rgb(42 27 19 / 0.045) 55%, transparent)',
              }}
            />
          </div>

          <ul className="relative grid grid-cols-3">
            {LINEUP.map((flavour, i) => (
              <ShowcaseBottle key={flavour.id} flavour={flavour} index={i} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

type ShowcaseBottleProps = {
  flavour: Flavour;
  /** 0 left · 1 centre · 2 right. */
  index: number;
};

/** One column: the bottle on its floor, and its name beneath. */
function ShowcaseBottle({ flavour, index }: ShowcaseBottleProps) {
  const centre = index === 1;
  const left = index === 0;
  const drift = DRIFT[index] ?? DRIFT[0];

  const tone = {
    '--tone': flavour.tone.accent,
    '--tone-glow': flavour.tone.glow,
  } as CSSProperties;

  const frame: ReactNode = (
    <BottleImage
      flavour={flavour}      className={cn(
        'h-full w-full',
        // A dome rather than a true semicircle: the caps sit high and a little
        // right of centre in the photographs, and a full arch shaves them.
        'rounded-[50%_50%_2rem_2rem/22%_22%_2rem_2rem]',
        'shadow-[0_6px_14px_rgb(42_27_19/0.06),0_40px_80px_-34px_rgb(42_27_19/0.26),0_80px_120px_-60px_var(--tone-glow)]',
        // Glass edge and a sheen that follows the pointer on the centre
        // bottle (Tilt publishes --mx/--my); elsewhere it rests high and soft.
        "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:content-['']",
        'after:shadow-[inset_0_1px_0_rgb(255_255_255/0.55),inset_0_0_0_1px_rgb(255_255_255/0.12)]',
        'after:bg-[radial-gradient(120%_70%_at_var(--mx,50%)_var(--my,14%),rgb(255_255_255/0.22),transparent_55%)]'
      )}
    />
  );

  return (
    <li className={cn('show-slot relative flex justify-center', centre ? 'z-20' : 'z-10')} style={tone}>
      <figure className="m-0 flex flex-col items-center">
        <div
          className={cn(
            // shrink-0: the base layer sets `min-width: 0` on everything, and a
            // bottle wider than its column (tablet, phone) must overflow it
            // evenly rather than be squeezed.
            'show-bottle relative h-(--show-h) w-[calc(var(--show-h)*0.75)] shrink-0 origin-[50%_90%]',
            // The sides wait, invisible, behind the centre until the scrub
            // fans them out. Reduced motion gets them already composed.
            !centre && 'reveal',
            left && 'max-md:motion-reduce:scale-[0.6] max-md:motion-reduce:-rotate-3 md:motion-reduce:scale-[0.92] md:motion-reduce:-rotate-5',
            index === 2 && 'max-md:motion-reduce:scale-[0.6] max-md:motion-reduce:rotate-3 md:motion-reduce:scale-[0.92] md:motion-reduce:rotate-5'
          )}
        >
          {/* Tone halo — painted as a gradient, never a blur filter. */}
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-x-[34%] -inset-y-[6%] opacity-70"
            style={{ background: 'radial-gradient(closest-side, var(--tone-glow), transparent 72%)' }}
          />

          {/* Contact shadow stays on the floor while the bottle floats. */}
          <span
            aria-hidden
            className="pointer-events-none absolute top-[96%] left-1/2 h-[8%] w-[74%] -translate-x-1/2"
            style={{
              background: 'radial-gradient(closest-side, rgb(42 27 19 / 0.3), rgb(42 27 19 / 0.08) 60%, transparent)',
            }}
          />

          <Float
            amplitude={drift.amplitude}
            rotate={0.8}
            duration={drift.duration}
            phase={drift.phase}
            className="relative h-full w-full"
          >
            {centre ? (
              <Tilt max={4} className="h-full w-full">
                {frame}
              </Tilt>
            ) : (
              frame
            )}
          </Float>
        </div>

        <figcaption className="show-caption reveal mt-[clamp(0.875rem,2.8svh,1.75rem)] flex flex-col items-center text-center">
          <span className="block font-display text-[1.125rem] leading-tight font-light tracking-[-0.02em] text-ink md:text-[clamp(1.25rem,0.9rem+0.8vw,1.75rem)]">
            {flavour.name}
          </span>
          <span className="mt-1.5 flex flex-col items-center gap-0.5 font-sans text-[0.625rem] font-medium tracking-[0.16em] text-mute uppercase lining-nums tabular-nums sm:text-micro md:flex-row md:gap-2.5 [@media(max-height:30rem)]:hidden">
            <span>{flavour.nutrition.protein}g protein</span>{' '}
            <span aria-hidden className="hidden size-1 rounded-full bg-(--tone) md:block" />{' '}
            <span>{flavour.nutrition.calories} kcal</span>
          </span>
        </figcaption>
      </figure>
    </li>
  );
}
