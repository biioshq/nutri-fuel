'use client';

import { useEffect, useRef, type CSSProperties, type RefObject } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useSmoothScroll } from '@/components/layout/SmoothScroll';
import { BottleImage } from '@/components/media/BottleImage';
import { Button } from '@/components/ui/button';
import { SectionIntro } from '@/components/ui/SectionIntro';
import { gsap, ScrollTrigger, useGsap } from '@/hooks/useGsap';
import { useIsoLayoutEffect } from '@/hooks/useIsoLayoutEffect';
import { useHasFinePointer, useMotionOK } from '@/hooks/useMediaQuery';
import { FLAVOURS, type Flavour, type FlavourId } from '@/lib/flavours';
import { SHOP_HREF } from '@/lib/site';
import { cn } from '@/lib/utils';

/**
 * Below `md` the row becomes a swipeable track instead of a pinned stage.
 *
 * In `rem`, not `px`. Tailwind v4 compiles `md:` to `48rem`, and a media-query
 * `rem` always resolves against the *initial* root font size — so this query
 * and the layout it describes can never land on opposite sides of the
 * breakpoint, whatever default font size the reader has set.
 */
const CAROUSEL_QUERY = '(max-width: 47.999rem)';

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

/**
 * How far each band of a face is lifted off the card plane, in pixels of
 * translateZ. Deliberately small: this is parallax *during the turn*, not a
 * pop-out. Anything past ~40px reads as a broken layout at rest.
 */
const LIFT = { sheen: 1, edge: 2, copy: 9, actions: 18, media: 28 } as const;

/** The camera. One per card, so a scroll container can never flatten it. */
const PERSPECTIVE = 1500;

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * The shape of the arrival, in timeline units of 10: where the fade, the lift
 * off the drop, and the flight out of depth each finish.
 *
 * `fade` is the one number three other things have to agree with — the slots
 * are not armed for the pointer before it (an `opacity: 0` card is still
 * hovered and still clicked), the ambient wash is gated on it, and focus that
 * lands before it has to be rescued from behind the pin. They read it off the
 * shape that was actually used rather than off a module constant, because
 * which timeline owns the arrival now depends on the breakpoint.
 */
type Arrival = { fade: number; lift: number; flight: number };

/**
 * A pinned scene gives the arrival a scrub of its own, played while the stage
 * climbs the screen. The fade is done by 60% of it — early enough that the
 * cards are solid well before the head has finished leaving — while the flight
 * runs to the very last unit, so the stack is still coming forward at the
 * moment the pin catches it.
 */
const APPROACH: Arrival = { fade: 6, lift: 8, flight: 10 };

/**
 * An unpinned scene has nowhere else to put it: the arrival is the first
 * stretch of its only timeline, and the split overlaps the tail of it.
 */
const INLINE: Arrival = { fade: 2.4, lift: 3.8, flight: 5.2 };

/**
 * The z the stack has reached when the arrival hands over. The last of the
 * depth is spent while the row opens, so it is still coming at the viewer as
 * it splits. Written literally at both ends of the handover rather than
 * inferred from one of them, so the two can never drift apart.
 */
const HANDOFF_Z = -90;

const toneVars = (flavour: Flavour) =>
  ({
    '--tone': flavour.tone.accent,
    '--tone-deep': flavour.tone.deep,
    '--tone-soft': flavour.tone.soft,
    '--tone-glow': flavour.tone.glow,
    // The border never switches to the accent outright — it leans toward it.
    '--tone-line': `color-mix(in oklab, ${flavour.tone.accent} 38%, var(--color-hair))`,
  }) as CSSProperties;

/* ==========================================================================
   Choreography
   ========================================================================== */

type Choreography = {
  /**
   * Pinned stage (the stack really does fly at you) or a plain scrub.
   *
   * It also decides where the arrival plays: a pinned scene runs it on a
   * second scrub that ends where `start` begins, an unpinned one folds it into
   * the head of its only timeline. See `choreograph`.
   */
  pin: boolean;
  /** Where the *opening* starts — and, for a pinned scene, where the arrival ends. */
  start: string;
  end: string;
  /** Whether the row collapses into one stack before it opens. */
  gather: boolean;
  /** How deep the stack starts, in pixels of translateZ. */
  depth: number;
  /** Extra depth per card away from the centre, so it reads as three, not one. */
  deck: number;
  /** How far below its resting line the stack starts, in pixels. */
  drop: number;
  /** The faint rotation the stack wears while it is far away. */
  skew: number;
  tiltX: number;
  /** The side panels' rotateY at the peak of the split, and the one they keep. */
  lean: number;
  settle: number;
};

/**
 * The pin is shorter than it was (170% / 120%) because it no longer carries
 * the arrival: everything before the split now plays on the way in, against
 * ordinary page scroll, so the held stretch is the split, the lean and the
 * settle and nothing else. Left at its old length it would have read as a
 * screen and a half of very slow opening.
 */
const DESKTOP: Choreography = {
  pin: true,
  start: 'top top',
  end: '+=130%',
  gather: true,
  depth: -1300,
  deck: 60,
  drop: 70,
  skew: -8,
  tiltX: 6,
  lean: 11,
  settle: 5,
};

/** Same story, shorter pin, smaller offsets — three narrow panels lean less. */
const TABLET: Choreography = {
  ...DESKTOP,
  end: '+=100%',
  depth: -1000,
  deck: 48,
  drop: 56,
  skew: -7,
  tiltX: 5,
  lean: 9,
  settle: 4,
};

/**
 * Phones get no pin: a tall pinned stage inside a horizontally scrolling track
 * is a trap for a thumb. The cards still arrive out of depth, just in place,
 * over a short scrub as the section comes up.
 *
 * `end: 'center center'` is the whole point of the timing: with no pin the
 * scrub is measured against ordinary page scroll, so the *only* way to promise
 * that the arrival has finished while the row is still on screen is to anchor
 * the end to the row's own centre meeting the viewport's. The cards therefore
 * reach their resting state at the exact scroll position where they are
 * centred, never after — which is what the old `top 34%` got wrong: it
 * finished when the row had already climbed past the middle.
 */
const PHONE: Choreography = {
  pin: false,
  start: 'top 90%',
  end: 'center center',
  gather: false,
  depth: -620,
  deck: 0,
  drop: 40,
  skew: -6,
  tiltX: 4,
  lean: 0,
  settle: 0,
};

/**
 * Wide enough for the grid, too short for the card: a landscape phone, or a
 * laptop window with the devtools open.
 *
 * A `top top` pin holds the stage `position: fixed` at the top of the screen
 * for its whole length, so anything taller than the viewport — here the stats
 * row and the Shop pill — sits below the fold and cannot be scrolled to for
 * the duration of the pin. The stack still gathers and still opens (this band is
 * the grid, not the swipe track, so the x-offsets are safe); it just does it
 * while the page keeps moving, which is what keeps the whole card reachable.
 *
 * Same end anchor as the phone, and for the same reason: `bottom 40%` let the
 * split finish while the row was already being cut off by the top of the
 * screen. `center center` finishes it at the one scroll position where the row
 * is demonstrably in the middle of the viewport.
 */
const SHORT_WIDE: Choreography = {
  ...TABLET,
  pin: false,
  start: 'top 90%',
  end: 'center center',
};

/**
 * What the section needs to know about whichever scrub is live: whether the
 * cards are solid enough to be touched, and — when a pin is holding them out
 * of the reader's reach — the scroll position at which they will have arrived.
 */
type Scrub = {
  arrived: () => boolean;
  rescue: (() => number) | null;
};

/**
 * The scrubbed scene, in one part or two. Timeline units run 0–10, so every
 * position below reads as a percentage of that timeline's own scroll. Tweens
 * on *different* properties overlap freely — that overlap is what stops any
 * stretch of scroll feeling dead — while tweens on the *same* property hand
 * over end-to-start at `HANDOFF_Z`.
 *
 * **Where the arrival plays is the whole point.** A pinned stage is a
 * screen-tall room held at `top top`, so anything the pinned timeline animates
 * can only begin once the head has *already* scrolled off the top of the
 * screen. Put the arrival in there and the section opens with a screen of
 * nothing: the head leaves, the room takes the whole viewport, and the cards
 * inside it are still transparent and 1300px away. That was the bug.
 *
 * So the arrival is lifted out of the pin and onto a scrub of its own, driven
 * by the stage *climbing the viewport* — `top bottom` to the pin's own start.
 * The stack therefore fades up out of depth while the head is still on screen
 * leaving, the two overlap for almost the whole of it, and the pin inherits a
 * row that is already here: opaque, gathered, `HANDOFF_Z` from the glass and
 * centred. The pin is then left with the one thing it is uniquely good at —
 * holding the row dead centre on screen while it opens.
 *
 * Two wrappers move, never one: `.flv-travel` owns x/y/opacity *outside* the
 * per-card perspective, `.flv-fly` owns z/scale/rotation *inside* it. Keeping
 * the gather on the outer wrapper is what makes the stack land dead centre —
 * an x applied inside the perspective would be foreshortened by the same
 * factor as the depth and the stack would never quite close up.
 *
 * The two scrubs own disjoint properties — the approach has opacity and y on
 * the travel wrapper and scale/rotationX on the fly wrapper, the pin has x and
 * rotationY — so neither can ever undo the other's frame. `z` is the single
 * deliberate exception, and the pin picks it up under `immediateRender: false`
 * so it writes nothing at all until the playhead reaches it, which it cannot
 * do before the approach has finished.
 */
function choreograph(stage: HTMLElement, c: Choreography): Scrub | undefined {
  const slots = Array.from(stage.querySelectorAll<HTMLElement>('.flv-slot'));
  if (slots.length < 2) return;

  const travels = slots.map((slot) => slot.querySelector<HTMLElement>('.flv-travel'));
  const flies = slots.map((slot) => slot.querySelector<HTMLElement>('.flv-fly'));
  if (travels.some((el) => !el) || flies.some((el) => !el)) return;

  const travelEls = travels as HTMLElement[];
  const flyEls = flies as HTMLElement[];
  const parallax = Array.from(stage.querySelectorAll<HTMLElement>('.flv-parallax'));

  const mid = (slots.length - 1) / 2;
  /** 0 for the front card of the stack, 1 for the ones behind it. */
  const rank = (i: number) => Math.abs(i - mid);
  /** −1 left, 0 centre, +1 right. */
  const side = (i: number) => Math.sign(i - mid);

  // Geometry is read through offsets, not rects, precisely so a refresh
  // mid-scrub — when everything is already translated — still measures the
  // resting row. The cards therefore always land exactly on the grid.
  const centreOf = (el: HTMLElement) => el.offsetLeft + el.offsetWidth / 2;
  const gatherX = (i: number) => {
    if (!c.gather) return 0;
    const anchor = (centreOf(slots[0]) + centreOf(slots[slots.length - 1])) / 2;
    return anchor - centreOf(slots[i]);
  };

  // Promoted only while the scene is actually being scrubbed — and counted
  // rather than assigned, because the two scrubs share these elements and hand
  // over at a single scroll position: nothing promises which `onToggle` runs
  // first there, and an assignment would let the one switching off clear the
  // hint the one switching on had just set. `.flv-fly` is left alone on
  // purpose: a will-change on a preserve-3d element is enough to make some
  // engines flatten the flip inside it.
  let live = 0;
  const promote = (on: boolean) => {
    live = Math.max(0, live + (on ? 1 : -1));
    gsap.set(travelEls, { willChange: live ? 'transform, opacity' : 'auto' });
  };

  const scrub = (trigger: {
    start: string;
    end: string;
    pin?: boolean;
    refreshPriority?: number;
  }) =>
    gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: stage,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        // Showcase pins further down the page, and this scene's pin changes
        // the document height above it: refresh this one first so its
        // positions stay right.
        refreshPriority: c.pin ? 1 : 0,
        onToggle: (self) => promote(self.isActive),
        ...trigger,
      },
    });

  /** One stack, far off and faint, coming at the viewer. */
  const arrive = (tl: gsap.core.Timeline, a: Arrival) => {
    tl.fromTo(travelEls, { opacity: 0 }, { opacity: 1, duration: a.fade, ease: 'power1.out' }, 0)
      .fromTo(
        travelEls,
        { y: (i: number) => c.drop + rank(i) * 12 },
        { y: 0, duration: a.lift, ease: 'power2.out' },
        0
      )
      .fromTo(
        flyEls,
        {
          z: (i: number) => c.depth - rank(i) * c.deck,
          scale: 0.96,
          rotationX: c.tiltX,
        },
        { z: HANDOFF_Z, scale: 1, rotationX: 0, duration: a.flight, ease: 'power2.out' },
        0
      )
      // Hit testing is the one thing the travel wrapper cannot hide.
      // `.flv-slot` is the resting grid cell and GSAP never transforms it (that
      // is what keeps a hover stable while the card moves), so before the cards
      // arrive its box is still full size and still hovered — lighting the
      // background wash and sliding the orb over an empty stage. A
      // zero-duration `set` inside a scrubbed timeline reverses on the way back
      // up for free, so the slots disarm themselves too.
      .set(slots, { pointerEvents: 'auto' }, a.fade);
  };

  /** The row opens out of the stack, leans into the turn, and settles. */
  const open = (tl: gsap.core.Timeline) => {
    // The skew is worn for the whole approach — a `fromTo` renders its start
    // state at creation — and unwinds as the row begins to open.
    tl.fromTo(flyEls, { rotationY: c.skew }, { rotationY: 0, duration: 4.2, ease: 'power2.out' }, 0)
      .to(
        flyEls,
        {
          rotationY: (i: number) => side(i) * c.lean,
          duration: 2.8,
          ease: 'sine.inOut',
        },
        4.2
      )

      // The last of the depth runs off while the row is opening. Explicitly
      // `fromTo` the handover value, and explicitly lazy: on a pinned scene
      // this tween belongs to a different ScrollTrigger from the one that
      // brought the stack in, and `immediateRender` would have it stamping
      // z = -90 over the approach every time the page refreshed mid-arrival.
      .fromTo(
        flyEls,
        { z: HANDOFF_Z },
        { z: 0, duration: 3.4, ease: 'power1.out', immediateRender: false },
        5.2
      )

      // The sides keep a little of their lean, so the row stays three panels
      // in space rather than three flat rectangles.
      .to(
        flyEls,
        {
          rotationY: (i: number) => side(i) * c.settle,
          duration: 3,
          ease: 'sine.inOut',
        },
        7
      )

      // The bottles drift inside their frames for the whole length of the
      // opening: one thing is always moving, so the scroll never reads as
      // stalled. ±4% of a layer oversized by 8% stays well inside its frame.
      .fromTo(parallax, { yPercent: -4 }, { yPercent: 4, duration: 10 }, 0);

    if (c.gather) {
      // Added last, positioned absolutely: a `fromTo` renders its start state
      // immediately, so the stack holds its gathered x from the moment it is
      // built — through the whole approach — until the split begins.
      tl.fromTo(
        travelEls,
        { x: (i: number) => gatherX(i) },
        { x: 0, duration: 4.6, ease: 'power2.inOut' },
        3.4
      );
    }
  };

  /** The two questions the section asks of whichever scrub owns the arrival. */
  const grip = (tl: gsap.core.Timeline, a: Arrival, pinned?: ScrollTrigger): Scrub => {
    const st = tl.scrollTrigger;
    return {
      // A scene that somehow has no trigger must not lock the cards away from
      // the pointer for good.
      arrived: () => !st || st.progress >= a.fade / 10,
      // Only a pin needs rescuing: without one the browser's own
      // scroll-into-view already brings a focused card onto the screen.
      //
      // The far end of the *pin*, not of the arrival: the arrival ends with
      // the three cards still gathered into one stack, where a focus ring on
      // the card behind would be hidden by the card in front of it. The pin's
      // end is the open row, every card standing in its own column.
      rescue: pinned ? () => pinned.end : null,
    };
  };

  if (!c.pin) {
    const tl = scrub({ start: c.start, end: c.end });
    arrive(tl, INLINE);
    open(tl);
    return grip(tl, INLINE);
  }

  // Its end is the pin's own start, derived rather than repeated: the arrival
  // is over at the exact scroll position the hold begins, whatever that
  // position is later changed to.
  //
  // Built first and refreshed first — a higher `refreshPriority` puts it ahead
  // of the pin in the one list ScrollTrigger both refreshes and updates from.
  // That is what settles the one property the two share: a forced update (any
  // refresh — fonts landing, a resize) writes both, and the pin, going last,
  // has the final word on `z`.
  const approach = scrub({ start: 'top bottom', end: c.start, refreshPriority: 2 });
  arrive(approach, APPROACH);

  const held = scrub({ start: c.start, end: c.end, pin: true });
  open(held);

  return grip(approach, APPROACH, held.scrollTrigger);
}

/* ==========================================================================
   Section
   ========================================================================== */

/**
 * THE FLAVOURS
 *
 * Three cards that arrive as one deck from far behind the screen and open into
 * a row of panels standing in space. Hover one and it turns on its own vertical
 * axis — both faces carry the same content, so it reads as one solid object
 * rotating rather than a card flipping to reveal a back.
 *
 * Decisions worth knowing before editing:
 *
 * - **Five wrappers, five owners of one transform each.** `.flv-slot` is the
 *   resting grid cell and never moves; `.flv-travel` is GSAP's x/y/opacity and
 *   sits *outside* the camera; `.flv-card` is the camera (`perspective`) and
 *   the hover group; `.flv-fly` is GSAP's z/scale/rotation *inside* the camera;
 *   `.flv-flip` is the CSS-transitioned hover turn. Nothing shares a transform,
 *   so the scrub and the flip can never fight.
 * - **The camera is per card, not per row.** A shared `perspective` on an
 *   ancestor would be flattened by the phone's `overflow-x-auto` track, and —
 *   worse — it would become a containing block for the pinned stage's fixed
 *   positioning. One camera per card is immune to both.
 * - **Both faces are the same markup**, and the twin exists only where the turn
 *   does (`canFlip`). It is `aria-hidden` with `tabIndex={-1}` links, so it adds
 *   no keyboard stops, but it stays clickable: someone who hovers, sees the
 *   turned face and clicks the button on it still gets the link. Whichever face
 *   has turned away is made `pointer-events: none` outright rather than trusting
 *   a hidden backface to be excluded from hit testing.
 * - **The arrival is never the pin's job.** A pin cannot begin until its stage
 *   fills the viewport, which is also the moment the head has finished leaving
 *   it — so an arrival inside the pin means a screen of nothing between the two.
 *   Pinned breakpoints therefore run the arrival on a second scrub measured
 *   against the stage climbing the screen, and hand the pin a row that is
 *   already solid and already close. See `choreograph`.
 * - **The pin is gated on height as well as width, and the gate is the timing.**
 *   Pinned, the stage is a screen-tall room with the row centred in it, so the
 *   stack finishes opening in the middle of the screen. Unpinned, the same
 *   scrub runs against page scroll, so its end has to be anchored to the row's
 *   centre meeting the viewport's (`end: 'center center'`) or the split
 *   completes with the row already climbing out of the top of the section.
 *   The gate itself is as low as the card's real height allows — see the
 *   arithmetic beside `TALL` — because the pinned version is the better one
 *   and should cover every ordinary laptop window.
 * - **`backface-visibility` is per element, not inherited.** Inside a
 *   `preserve-3d` face every *direct child* therefore carries its own
 *   `backface-hidden`; each child is itself flat, so its subtree is flattened
 *   into it and one declaration covers the lot.
 * - The background wash is driven by a `data-active` attribute written straight
 *   to the section, never by React state — hovering across three cards would
 *   otherwise re-render the section on every enter. It lives *inside* the
 *   pinned stage, so it travels with the cards while they are held.
 * - The DOM is the finished composition. Every tween only ever animates back
 *   toward it, which is why reduced motion (and a dead script) gets the clean
 *   row for free, and why no offset is ever guessed in `vw`.
 */
export function Flavours() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const moveOrb = useRef<((x: number) => void) | null>(null);
  /** The slide in view on the carousel. */
  const current = useRef(0);
  /** The live breakpoint's arrival, so a hover can wait for it and focus can finish it. */
  const scrubRef = useRef<Scrub | null>(null);

  const { scrollTo } = useSmoothScroll();
  const motionOK = useMotionOK();
  const finePointer = useHasFinePointer();
  /** A turn a thumb cannot undo would leave the card stuck mid-flip. */
  const canFlip = motionOK && finePointer;

  // --- Background state (no React renders) ---------------------------------
  const isCarousel = () => window.matchMedia(CAROUSEL_QUERY).matches;

  const setActive = (id: FlavourId | undefined) => {
    const section = sectionRef.current;
    if (!section) return;
    if (id) section.dataset.active = id;
    else delete section.dataset.active;
  };

  const engage = (index: number, card: HTMLElement) => {
    // Belt and braces with the slot arming in `choreograph`: the ambient wash
    // is the one part of the scene that lives outside `.flv-travel`, so it is
    // the one thing that would still be visible if a hover reached a card that
    // has not arrived yet.
    const scrub = scrubRef.current;
    if (scrub && !scrub.arrived()) return;

    setActive(FLAVOURS[index]?.id);

    const stage = stageRef.current;
    if (!stage || !moveOrb.current || isCarousel()) return;

    // One rect read per enter, not per frame. Both rects are in viewport
    // coordinates, so the difference holds even while the stage is pinned.
    const s = stage.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    moveOrb.current(c.left + c.width / 2 - (s.left + s.width / 2));
  };

  const release = () => {
    moveOrb.current?.(0);
    // On the carousel the background belongs to the slide in view.
    setActive(isCarousel() ? FLAVOURS[current.current]?.id : undefined);
  };

  /**
   * The cards are transparent until their arrival has played, and a pinned
   * stage is `position: fixed` — so the browser's own scroll-into-view for a
   * newly focused link is a no-op and Tab alone can never make the card
   * appear. The focus ring is then painted on a fully transparent subtree.
   * Focus that lands that early plays the scene out: `rescue` is the scroll
   * position at which the row is open and every card is on screen in its own
   * column.
   *
   * Only keyboard focus: a pointer that focused a link did so on a card it
   * could see, and moving the page out from under a click would lose it.
   */
  const revealForFocus = (target: HTMLElement) => {
    const scrub = scrubRef.current;
    if (!scrub?.rescue || scrub.arrived()) return;

    try {
      if (!target.matches(':focus-visible')) return;
    } catch {
      // No `:focus-visible` support — a visible focus ring is worth more than
      // an occasional unnecessary scroll, so fall through and reveal.
    }
    scrollTo(scrub.rescue());
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

    moveOrb.current = gsap.quickTo(orb, 'x', {
      duration: 1.8,
      ease: 'power3.out',
    });

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
      const stage = stageRef.current;
      if (!motionOK || !stage) return;

      // Each breakpoint gets its own choreography, and matchMedia reverts the
      // one it leaves — which also keeps this pin and Showcase's independent.
      const mm = gsap.matchMedia();

      /** Hand the live scrub to `engage` and `revealForFocus`, and take it back on revert. */
      const keep = (scrub: Scrub | undefined) => {
        scrubRef.current = scrub ?? null;
        return () => {
          if (scrubRef.current === scrub) scrubRef.current = null;
        };
      };

      // Widths in `rem`, to match the `md:`/`lg:` variants that switch the
      // layout these assume (Tailwind v4 compiles them to 48rem and 64rem).
      //
      // Height gates the pin, and the pin is what makes the stack finish
      // opening while the row is centred: the stage is `min-h-svh` and
      // `items-center`, so a `top top` pin holds the row dead centre on screen
      // for the whole scrub. Unpinned, the same scrub plays against page
      // scroll and the row drifts upward as it opens.
      //
      // The gate also decides where the *arrival* plays — its own scrub on the
      // way in when pinned, the head of the one timeline when not — but that
      // costs the arithmetic below nothing: both versions end with the row
      // solid and centred, and neither changes the stage's height.
      //
      // So the gate should be as low as the card honestly allows. Arithmetic,
      // at a wide desktop:
      //
      //   face padding      16 + 16 = 32
      //   bottle plate      168px wide at 4:5   = 210
      //   plate → name      pt-5                =  20
      //   name              1.5rem / 1.25       =  30
      //   name → tagline    mt-2                =   8
      //   tagline           0.625rem / 1.7      =  17
      //   tagline → figures pt-5                =  20
      //   figures           1 + 16 + 16 + 4 + 20.5 ≈ 57
      //   figures → CTA     mt-3                =  12
      //   CTA pill          h-12                =  48
      //                                    card ≈ 454px  (was ~573px)
      //
      // But 454 is the *comfortable* case, not the worst one, and a gate has
      // to be set against the worst. The longest tagline takes a second line
      // below ~1070px (see the note beside it), and the widest card inside
      // that range is the one at the very bottom of `lg`, where the columns
      // are already full width but the tagline has just stopped fitting:
      //
      //   454 + 17 (second tagline line) - 5 (smaller numerals here) ≈ 466px
      //
      // Against 34rem (544px) with the stage's own symmetric padding — which
      // is 5svh = 27px at that height — the real sum is
      //
      //   466 + 2×27 = 520  against  544 of viewport
      //
      // so the stage can never be taller than the screen it is pinned to, and
      // the tightest case still keeps ~12px of air above and below the card.
      // More generally: while the padding tracks svh, the stage outgrows the
      // viewport only if the card passes 0.9×svh, i.e. 490px at this floor —
      // which no band reaches. Do not lower the gate without re-running that
      // inequality; the clearance here is ~24px, not the ~45px the card's
      // best-case height would suggest. Every ordinary laptop window
      // (1366×640, 1280×600, 1440×720) sits comfortably above the gate and
      // gets the pinned, centred version; only landscape phones and
      // devtools-squashed windows fall through to the unpinned path, which is
      // retimed to `center center`.
      //
      // These must cover every viewport between them: the cards wear `reveal`,
      // so a width/height pair matching no branch leaves a permanently
      // `opacity: 0` section. That is why this is one `add` reading booleans
      // rather than four with hand-written complementary queries.
      //
      // `(max-width: 47.999rem)` is *not* the complement of
      // `(min-width: 48rem)`: it leaves 0.016px between them, and the layout
      // viewport is fractional at any page zoom, so a window really can match
      // neither. The same hole sat at 63.999rem and at 33.999rem. Branching on
      // three booleans has no boundaries left to fall through — only `>=` and
      // `<` — and it is the same four scenes as before, in the same order.
      //
      // `always: 'all'` is load-bearing: GSAP runs the callback only if at
      // least one condition matches, so on a small phone — where `grid` and
      // `tall` are both false — nothing would run at all. A query of `all`
      // always matches, which makes "none of the above" a state the callback
      // is still called for. The key must not be spelt `all`: GSAP
      // special-cases that name, skips registering it, and leaves its recorded
      // condition `undefined`, which costs one spurious revert on the first
      // media change.
      //
      // The old `(prefers-reduced-motion: no-preference)` clause is gone for a
      // related reason — it was redundant (the early return above already
      // gates on `motionOK`) and it was a gap of its own, since
      // `no-preference` and `reduce` are not complements where the feature is
      // unsupported.
      mm.add(
        {
          always: 'all',
          grid: '(min-width: 48rem)',
          wide: '(min-width: 64rem)',
          tall: '(min-height: 34rem)',
        },
        (context) => {
          const { grid, wide, tall } = context.conditions ?? {};
          const scene = !grid ? PHONE : !tall ? SHORT_WIDE : wide ? DESKTOP : TABLET;
          return keep(choreograph(stage, scene));
        }
      );

      // `lib/gsap.ts` drops `resize` from `autoRefreshEvents`, so nothing ever
      // delivers the refresh that `invalidateOnRefresh` is waiting for: drag a
      // window from 1600 to 1200 and the measured `gatherX` and the pin bounds
      // stay at their old values until a breakpoint is crossed. Width only —
      // a height-only resize is the mobile URL bar, which is precisely what
      // that config was written to ignore.
      let lastWidth = window.innerWidth;
      const refresh = gsap.delayedCall(0.2, () => ScrollTrigger.refresh()).pause();
      const onResize = () => {
        if (window.innerWidth === lastWidth) return;
        lastWidth = window.innerWidth;
        refresh.restart(true);
      };
      window.addEventListener('resize', onResize);

      return () => {
        window.removeEventListener('resize', onResize);
        refresh.kill();
        mm.revert();
      };
    },
    [motionOK],
    sectionRef
  );

  return (
    // `overflow-x-clip`, never `overflow-hidden`: this is the pinned stage's
    // ancestor, and a hidden overflow here would break the pin.
    <section
      ref={sectionRef}
      id="flavours"
      aria-labelledby="flavours-heading"
      className="group/flv relative isolate overflow-x-clip py-section"
    >
      {/* Head — eyebrow, heading, one line. The old aside restated the 25 g and
          the volume that every card already carries; on a page being cut back
          to its moving parts it was three static blocks earning nothing. */}
      <div className="shell">
        <SectionIntro
          id="flavours-heading"
          eyebrow="The Flavours"
          title="Three flavours. One standard."
          lede="Same 25 g of protein. Only the pleasure changes."
          mode="words-flip"
        />
      </div>

      {/* ---------- The stage ----------
          From `md` up this is what ScrollTrigger pins: one screen-tall room the
          stack flies into — and, before that, what the arrival is measured
          against as it climbs the screen, so the room is never on screen empty.
          On phones it is a plain block, so the track keeps scrolling under a
          thumb.

          The gap above is as small as the head's own rhythm allows: the
          arrival and the head's exit now overlap, and the closer the stage
          follows the words the more of that overlap the reader actually sees. */}
      <div
        ref={stageRef}
        className={cn(
          'flv-stage relative isolate mt-4 md:mt-6',
          // A screen-tall room, only where the pin actually runs. `min-h-svh`
          // plus `items-center` is what puts the row in the middle of the
          // screen for the whole pin; the padding is only a floor for the case
          // where a card somehow outgrows the room, and it is symmetric, so it
          // can never open a band on one side. At the new 34rem gate the worst
          // sum is 466 + 2×27 = 520 against 544 of viewport, so the padding
          // stays inert and the centring does the work.
          //
          // A screen-tall room used to guarantee a screen of nothing: the pin
          // could not start until the room filled the viewport, and the cards
          // inside it did not begin to fade in until it did. It is kept because
          // it is the whole of the centring promise — and it is no longer
          // empty, because the arrival is driven by the room *entering* the
          // screen rather than by the pin (see `choreograph`). By the time this
          // box has climbed to the top of the viewport, the row inside it has
          // been solid for most of a screen of scroll.
          'md:motion-safe:flex md:motion-safe:min-h-svh md:motion-safe:items-center',
          'md:motion-safe:py-[clamp(1rem,5svh,3rem)]'
        )}
      >
        <Ambient orbRef={orbRef} />

        {/* `role="list"` is not redundant: preflight's `list-style: none` drops
            the list role in Safari, and `md:grid` blockifies the items away
            from `display: list-item`, which drops it in Chrome and Firefox too
            — taking the label and the "3 items" count with it. */}
        <ul
          ref={trackRef}
          role="list"
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
            // padding gives the shadows room inside the scroll container's clip.
            'flv-track relative -my-10 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-gutter py-10 scroll-px-gutter',
            '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            // Tablet and up: a three-up row inside the page shell. Capped well
            // short of the shell's 96rem so the cards stay panels, not slabs.
            'md:mx-auto md:my-0 md:grid md:w-full md:max-w-[72rem] md:snap-none md:grid-cols-3 md:gap-4',
            'md:overflow-visible md:py-0 lg:gap-6 xl:max-w-[78rem] xl:gap-8'
          )}
        >
          {FLAVOURS.map((flavour, index) => (
            <li
              key={flavour.id}
              role="listitem"
              style={{
                ...toneVars(flavour),
                // No 3D sorting happens between cards — each has its own
                // camera — so the stack's front-to-back order is paint order.
                // The centre card is the one the deck opens from.
                zIndex: 10 - Math.round(Math.abs(index - (FLAVOURS.length - 1) / 2) * 2),
              }}
              onPointerEnter={(event) => {
                if (event.pointerType !== 'touch') engage(index, event.currentTarget);
              }}
              onFocus={(event) => {
                engage(index, event.currentTarget);
                revealForFocus(event.target as HTMLElement);
              }}
              // Armed by the arrival at its own `fade`, never by CSS: until then
              // the card is transparent and 1300px away, and an `opacity: 0`
              // element is still hovered and still clicked.
              className="flv-slot relative w-[80vw] max-w-[21rem] shrink-0 snap-center motion-safe:pointer-events-none md:w-auto md:max-w-none"
            >
              <div className="flv-travel reveal h-full">
                <div
                  className="flv-card group/card relative h-full"
                  style={{ perspective: `${PERSPECTIVE}px` }}
                >
                  <div className="flv-fly h-full" style={{ transformStyle: 'preserve-3d' }}>
                    <div
                      className={cn(
                        'flv-flip relative h-full [transform:rotateY(0deg)]',
                        canFlip && [
                          'transition-transform duration-[900ms] ease-luxe',
                          'group-hover/card:[transform:rotateY(180deg)]',
                          // A pointer left resting on a card while someone tabs
                          // into it would otherwise turn the focused face out of
                          // paint, taking the focus ring with it — and the face
                          // arriving in its place is `aria-hidden` with nothing
                          // for the ring to land on. The trailing `!` settles it
                          // against the hover rule regardless of utility order.
                          'group-has-[:focus-visible]/card:[transform:rotateY(0deg)]!',
                        ]
                      )}
                      style={{ transformStyle: 'preserve-3d' }}
                    >
                      <Face flavour={flavour} index={index} flips={canFlip} />
                      {/* The twin earns its DOM only where the turn can happen.
                          Without `canFlip` it is unreachable decoration sitting
                          over the card's only two controls, on exactly the
                          devices that can least afford a second image, a second
                          shadow layer and a doubled subtree. */}
                      {canFlip && <Face flavour={flavour} index={index} flips back />}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
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
 * The air behind the cards: a neutral orb at rest, and for each flavour a wash
 * plus an orb tint that crossfade in when that flavour is active. All of it is
 * static gradients — only opacity and the orb's `x` ever change. It lives
 * inside the stage so it stays behind the cards while they are pinned.
 */
function Ambient({ orbRef }: { orbRef: RefObject<HTMLDivElement | null> }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]"
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
              // Pooled on the row's own centre line. The old 58% was aimed at
              // a card half again as tall, whose mass sat lower in the stage.
              backgroundImage: `radial-gradient(46% 44% at ${x} 52%, ${flavour.tone.soft} 0%, transparent 100%), radial-gradient(120% 55% at 50% 100%, ${flavour.tone.soft} 0%, transparent 72%)`,
            }}
          />
        );
      })}

      {/* A zero-height flex line centres the orb without a CSS translate,
          leaving `transform` free for GSAP. */}
      <div className="absolute inset-x-0 top-1/2 flex h-0 items-center justify-center">
        <div ref={orbRef} className="relative size-[min(60rem,130vw)] shrink-0 opacity-60">
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

/* ==========================================================================
   One face of a card
   ========================================================================== */

type FaceProps = {
  flavour: Flavour;
  index: number;
  /**
   * The duplicate face, turned away behind the front one. Identical pixels, so
   * the turn reads as one solid object — but out of the a11y tree and out of
   * the tab order, since the front face already carries both.
   */
  back?: boolean;
  /** Whether this card turns at all — the front face is inert only if it does. */
  flips?: boolean;
};

/**
 * A card, twice over.
 *
 * The face *is* the card surface: no `overflow-hidden` on it, because a
 * grouping property there would flatten the 3D and cost the bands their lift.
 * Instead each band is a direct child with its own small `translateZ` and its
 * own `backface-hidden` — every band is flat inside, so one declaration covers
 * its whole subtree, and the pile turns away together when the card does.
 *
 * The front face is in flow and defines the height; the back is `inset-0` over
 * it, so the two can never disagree and make the turn wobble.
 */
function Face({ flavour, index, back = false, flips = false }: FaceProps) {
  const { id, name, tagline, volume, nutrition } = flavour;
  const nameId = `flv-${id}-name`;

  const stats = [
    { label: 'Protein', value: nutrition.protein, unit: 'g' },
    { label: 'Calories', value: nutrition.calories, unit: 'kcal' },
    { label: 'Sugar', value: nutrition.sugar, unit: 'g' },
  ];

  /** The duplicate adds no keyboard stops; the front face keeps them all. */
  const stop = back ? -1 : undefined;

  return (
    <div
      aria-hidden={back || undefined}
      role={back ? undefined : 'group'}
      aria-labelledby={back ? undefined : nameId}
      className={cn(
        // One padding value for all four sides, and it is the *only* thing
        // between the card edge and either end of the stack: the plate sits
        // straight on the top padding, the CTA pill straight on the bottom
        // one, so the breathing room above and below is the same 16px by
        // construction rather than by two numbers that have to be kept in
        // step. Inside that, the rhythm steps 20 / 8 / 20 / 12 — the two big
        // gaps separate the three bands (plate, name, figures+action), the
        // small ones bind a label to the thing it labels.
        'flv-face card-surface flex flex-col rounded-card p-4',
        // Whichever face has turned away is made inert outright, rather than
        // trusting a hidden backface to be excluded from hit testing inside
        // nested `preserve-3d`. This cannot oscillate: the hover lives on
        // `.flv-card`, which is never `pointer-events: none`, so the state
        // holds while the two faces swap.
        back
          ? [
              'absolute inset-0 pointer-events-none group-hover/card:pointer-events-auto',
              // Focus inside the card cancels the turn (see `.flv-flip`), so the
              // front face is the one on screen again. The inert face has to
              // follow that override or the state goes inside out: the visible
              // button stops answering the pointer while the mirrored twin
              // behind it silently takes the clicks and the hover.
              'group-has-[:focus-visible]/card:pointer-events-none!',
            ]
          : 'relative h-full',
        !back &&
          flips && [
            'group-hover/card:pointer-events-none',
            'group-has-[:focus-visible]/card:pointer-events-auto!',
          ]
      )}
      style={{
        backfaceVisibility: 'hidden',
        transformStyle: 'preserve-3d',
        // The 1px is applied in the rotated frame, so it places the twin 1px
        // *behind* whichever face is toward the viewer — in both states, and
        // invisibly. Two opaque surfaces coplanar at z = 0 are the one thing
        // that makes a partly working `backface-visibility` inside
        // `preserve-3d` z-fight across the whole card at rest.
        transform: back ? 'rotateY(180deg) translateZ(1px)' : undefined,
      }}
    >
      {/* The lifted shadow, pre-rendered; only its opacity moves. */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 rounded-card opacity-0 transition-opacity duration-700 ease-luxe',
          'shadow-[0_6px_14px_rgb(42_27_19/0.06),0_40px_80px_-30px_rgb(42_27_19/0.3),0_80px_120px_-60px_var(--tone-glow)]',
          ENGAGED
        )}
        style={{ backfaceVisibility: 'hidden' }}
      />

      {/* Key light in the flavour's tone, high and soft. */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 rounded-card opacity-0 transition-opacity duration-700 ease-luxe',
          'bg-[radial-gradient(22rem_circle_at_50%_16%,var(--tone-soft),transparent_64%)]',
          ENGAGED
        )}
        style={{
          backfaceVisibility: 'hidden',
          transform: `translateZ(${LIFT.sheen}px)`,
        }}
      />

      {/* ---------- The bottle ----------
          A portrait plate, held well inside the card: the photographs may not
          be framed wider than 4:5 without their baked-in type showing, so the
          only way to a shorter card is a narrower plate. */}
      <div
        className="relative"
        style={{
          backfaceVisibility: 'hidden',
          transform: `translateZ(${LIFT.media}px)`,
        }}
      >
        {/* The flavour's glow, pooled beneath the plate. */}
        <div
          aria-hidden
          className={cn(
            // `inset-x` is pulled in with the plate: the glow pools *under
            // the bottle*, and a plate this much narrower than the card would
            // otherwise leave it spilling out either side of the thing it is
            // meant to be lighting. `scale-x-110` writes the independent
            // `scale` property in Tailwind v4, not `transform` — naming
            // `transform` here would leave the stretch untransitioned and
            // snapping in a single frame.
            'pointer-events-none absolute inset-x-[26%] bottom-[-6%] h-[32%] opacity-45 transition-[opacity,scale] duration-1000 ease-luxe',
            'bg-[radial-gradient(closest-side,var(--tone-glow),transparent)]',
            'motion-safe:group-hover/card:scale-x-110',
            ENGAGED
          )}
        />

        {/* `isolate` stops Safari letting the transformed layer escape the clip. */}
        {/* Two numbers, and which one governs depends on the band. From `lg`
            up the `max-w-42` cap is what holds the card to ~454px; in the
            narrow `md` columns the cap is never reached, so the percentage
            takes over and keeps the bottle a bottle rather than a stamp. */}
        <div className="relative isolate mx-auto aspect-4/5 w-[70%] max-w-42 overflow-hidden rounded-[1.25rem] bg-(--tone-soft)">
          <div className="flv-parallax absolute inset-[-8%]">
            {/* Decorative here: the card is a labelled group whose heading is
                the flavour's name, so the default alt would say it a third
                time before any new information. */}
            <BottleImage
              flavour={flavour}
              alt=""
              // The plate now caps at 10.5rem (168px). Three multipliers, in
              // order: the parallax layer is inset −8% so it is 1.16× the
              // plate (195px), and a 4:5 cover crop of these 16:9 sources
              // draws the photograph ~2.25× its frame — 168 × 1.16 × 2.25 ≈
              // 440. Under-asking here is what made the bottles go soft; the
              // old 470 belonged to the old 13rem plate.
              sizes="440px"
              className="size-full"
              imageClassName="transition-transform duration-[1400ms] ease-luxe motion-safe:group-hover/card:scale-[1.05]"
            />
          </div>

          {/* Flat translucency, not `.glass`: a `backdrop-filter` inside a
              `preserve-3d` subtree samples that subtree as its own backdrop
              root, so it would be re-blurred on every frame of the scrub and
              of the turn — for no gain, since the pill sits on an opaque
              plate rather than on the page. */}
          <p className="absolute top-2 left-2 flex h-7 items-center gap-2 rounded-full border border-white/70 bg-white/75 px-2.5 font-sans text-[0.625rem] tracking-[0.12em] text-ink shadow-glass lining-nums tabular-nums">
            <span aria-hidden>{pad(index + 1)}</span>
            <span aria-hidden className="h-2.5 w-px bg-ink/20" />
            <span>{volume}</span>
          </p>
        </div>
      </div>

      {/* ---------- The copy ----------
          A name and its tagline, and nothing else. The description paragraph
          and the tasting-notes line were the card's two tallest bands of
          small grey type; between them they were ~82px of the old height and
          the least-read words on the page. What the card still has to say —
          which flavour, what it promises, what is in it — is now carried by
          the photograph, one line and three figures. */}
      <div
        className="relative px-1 pt-5"
        style={{
          backfaceVisibility: 'hidden',
          transform: `translateZ(${LIFT.copy}px)`,
        }}
      >
        <h3
          id={back ? undefined : nameId}
          className="flex items-center gap-2.5 font-display text-[clamp(1.1875rem,1rem+0.5vw,1.5rem)] leading-tight font-light tracking-[-0.03em] text-ink"
        >
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full bg-(--tone) shadow-[0_0_0_4px_var(--tone-soft)]"
          />
          {name}
        </h3>

        {/* Bound to the name by the smallest gap in the card, so the two read
            as one block rather than as two competing lines.

            0.12em rather than the 0.18em it wore before, but be honest about
            what that buys: the longest tagline is 37 uppercase characters,
            which measures ~225px of glyphs at 10px and ~269px once the
            tracking is added — and the copy column is only card width less
            40px. So one line is guaranteed from about 1070px up, and below
            that the longer two taglines take a second line (all three do in
            the narrow `md` columns, where no tracking value would fit them).
            That is a deliberate acceptance, not an oversight: every value
            that would squeeze 37 characters into the `lg` column leaves under
            10px of slack, which is a promise the font stack cannot keep.

            It costs nothing structural. `mt-auto` on the block below holds the
            figures and the pill against the card's bottom padding, so a second
            line only eats slack inside the card — the row's bottoms stay
            aligned and only the tallest card sets the height. `text-balance`
            splits that second line evenly instead of stranding one word. */}
        <p className="mt-2 font-sans text-[0.625rem] font-medium tracking-[0.12em] text-balance text-(--tone-deep) uppercase">
          {tagline}
        </p>
      </div>

      {/* ---------- The numbers and the action ---------- */}
      <div
        className="relative mt-auto px-1 pt-5"
        style={{
          backfaceVisibility: 'hidden',
          transform: `translateZ(${LIFT.actions}px)`,
        }}
      >
        {/* Three columns share ~60px each in the md band, so everything in this
            row steps down a size there rather than wrapping. */}
        <dl className="grid grid-cols-3 border-t border-hair">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={cn(
                'flex flex-col-reverse gap-1 py-2',
                i > 0 && 'border-l border-hair pl-2.5 md:max-lg:pl-2'
              )}
            >
              <dt className="font-sans text-[0.6875rem] leading-4 text-mute md:max-lg:text-[0.625rem]">
                {stat.label}
              </dt>
              <dd className="flex items-baseline gap-0.5 font-display text-[clamp(1.0625rem,0.875rem+0.45vw,1.375rem)] leading-none font-light tracking-[-0.03em] text-ink lining-nums tabular-nums md:max-lg:text-[1rem]">
                {stat.value}
                <span className="font-sans text-[0.625rem] tracking-normal text-mute md:max-lg:text-[0.5625rem]">
                  {stat.unit}
                </span>
              </dd>
            </div>
          ))}
        </dl>

        {/* One pill across the card, not two controls.
            The second control pointed at `#nutrition`, and that section is
            being removed from the page — the link would have gone nowhere.
            Rather than re-point it at `#order` and give every card two
            controls to the same destination (six tab stops in this row, all
            landing in the same place), the arrow moves inside the one button
            that was always the card's real action. */}
        <Button asChild variant="primary" size="md" className="mt-3 w-full px-4 tracking-[0.16em]">
          <a href={SHOP_HREF} tabIndex={stop}>
            {/* One span, not a bare text node beside one: the pill is a flex
                container, so "Shop" and the name as siblings would be two
                flex items and the button's own 10px gap would open up inside
                the label. Wrapped, the label is one item and the arrow is the
                other, which is exactly where that gap belongs. */}
            <span>
              {/* Three narrow columns in the md band cannot hold the flavour
                  name inside a nowrap pill, so it goes to assistive tech only
                  there — never anywhere it would actually fit. */}
              Shop <span className="md:max-lg:sr-only">{name}</span>
            </span>
            <ArrowUpRight
              aria-hidden
              strokeWidth={1.5}
              className="size-4 shrink-0 transition-transform duration-500 ease-luxe group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5"
            />
          </a>
        </Button>
      </div>

      {/* Border warmed toward the flavour. */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 rounded-[inherit] border border-(--tone-line) opacity-0 transition-opacity duration-700 ease-luxe',
          ENGAGED
        )}
        style={{
          backfaceVisibility: 'hidden',
          transform: `translateZ(${LIFT.edge}px)`,
        }}
      />
    </div>
  );
}
