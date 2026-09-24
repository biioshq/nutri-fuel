'use client';

import { useRef, type CSSProperties } from 'react';
import { ArrowRight } from 'lucide-react';
import { BottleImage } from '@/components/media/BottleImage';
import { Float } from '@/components/motion/Float';
import { GradientLoop } from '@/components/motion/GradientLoop';
import { Magnetic } from '@/components/motion/Magnetic';
import { SplitHeading } from '@/components/motion/SplitHeading';
import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { gsap, ScrollTrigger, useGsap } from '@/hooks/useGsap';
import { useIsoLayoutEffect } from '@/hooks/useIsoLayoutEffect';
import { useHasFinePointer, useMediaQuery, useMotionOK } from '@/hooks/useMediaQuery';
import { FLAVOURS } from '@/lib/flavours';
import { subscribePointer } from '@/lib/pointer';
import { STORE_URL } from '@/lib/site';
import { cn } from '@/lib/utils';

/* ==========================================================================
   The room's geometry. One camera, a handful of planes, two owners of two
   transforms — every number that decides how deep this section feels is here.
   ========================================================================== */

/** The camera, on the stage: the one box in this section that never moves. */
const PERSPECTIVE = 1500;

/**
 * Where the slab starts as it scrolls in — leaned back a few degrees and set
 * back in the room, so it *grows* into the frame. Restrained on purpose: at
 * this focal length 6.5° already keystones the panel into a clear trapezoid.
 *
 * Phones get less of both. The panel is far taller than the screen there, so
 * the visible band sits a long way off the camera's axis and the same angle
 * would shear the heading.
 */
const ARRIVAL = { rotate: 6.5, z: -160 };
const ARRIVAL_COMPACT = { rotate: 4, z: -90 };

/** Maximum pointer lean, per axis, in degrees. */
const LEAN = 3.2;

/** Resting opacity of the two cursor layers. Movement adds to both. */
const LIGHT_REST = 0.55;
const SHEEN_REST = 0.5;

/**
 * The weather inside the slab: one pool of light per flavour, set where its
 * bottle stands — chocolate low left, vanilla overhead, strawberry low right.
 * Each wanders a slow figure of its own (`x` and `y` on periods that never
 * line up, so the path never visibly repeats), breathes on a third, and on a
 * fine pointer is drawn a different distance toward the cursor.
 *
 * Literal values, never random: the server and the client must agree on the
 * first paint, and under reduced motion this table *is* the composition.
 * `x`/`y` place the centre and `w`/`h` size the box, as percentages of the
 * face; `drift` is a percentage of the pool's own box; `period` is seconds
 * per half-cycle for x, y and the breath; `pull` is the share of the slab's
 * size the pool travels toward the cursor.
 */
const POOLS = [
  {
    rgb: '138 90 64',
    alpha: 0.4,
    x: 12,
    y: 88,
    w: 60,
    h: 66,
    drift: [18, 13],
    period: [11, 8.2, 12.6],
    phase: 0.1,
    pull: 0.12,
  },
  {
    rgb: '233 220 196',
    alpha: 0.17,
    x: 50,
    y: 2,
    w: 66,
    h: 58,
    drift: [22, 15],
    period: [13.4, 9.6, 10.4],
    phase: 0.55,
    pull: 0.05,
  },
  {
    rgb: '223 135 149',
    alpha: 0.28,
    x: 88,
    y: 88,
    w: 58,
    h: 66,
    drift: [18, 13],
    period: [9.4, 11.8, 14],
    phase: 0.8,
    pull: 0.1,
  },
] as const;

/**
 * The lamp takes the colour of the flavour it is over. Each owns the third of
 * the slab its bottle stands in, and the light crossfades between them as it
 * moves, so a sweep of the cursor pours it through all three.
 */
const TINTS = [
  { rgb: '154 106 79', alpha: 0.3 },
  { rgb: '233 220 196', alpha: 0.16 },
  { rgb: '223 135 149', alpha: 0.26 },
] as const;

/**
 * How much of each tint the lamp carries at `t` — 0 at the slab's left edge,
 * 1 at its right. A partition of one: the three always sum to a whole, so the
 * light never dims as it crosses from one flavour's ground to the next.
 */
function tintWeights(t: number): [number, number, number] {
  const u = Math.min(Math.max(t, 0), 1) * 2;
  return [Math.max(0, 1 - u), 1 - Math.abs(u - 1), Math.max(0, u - 1)];
}

/**
 * The rim: four hairline strips, one per edge, each carrying its own copy of
 * one broad glow. Each copy is offset by its strip's position, so all four
 * sample the same light at the same point on the slab.
 *
 * Plain rectangular clips, not one masked ring: a mask over a moving layer
 * costs a face-sized offscreen pass every frame, which measured 10 to 20 fps
 * on a 2x screen. The face's rounded clip trims the strips at the corners.
 */
const RIM_EDGES = [
  { edge: 'top', className: 'inset-x-0 top-0 h-px' },
  { edge: 'bottom', className: 'inset-x-0 bottom-0 h-px' },
  { edge: 'left', className: 'inset-y-0 left-0 w-px' },
  { edge: 'right', className: 'inset-y-0 right-0 w-px' },
] as const;

const RIM_GLOW =
  'radial-gradient(closest-side, rgb(246 239 228 / 0.85) 0%, rgb(233 220 196 / 0.3) 42%, rgb(233 220 196 / 0) 100%)';

/**
 * The glow's radius (it is `size-240`, 960px across). Past this distance from
 * every edge no strip can be lit, so the rim switches off rather than be
 * composited for nothing; it fades up over the last 120px.
 */
const RIM_REACH = 480;

/**
 * Fan order: chocolate left, vanilla centre and tallest, strawberry right.
 * `z` stands each bottle off the face — the centre one furthest forward — so
 * the lean moves them against the type behind them and they read as objects
 * in the room rather than a photograph printed on it.
 */
const FAN = [
  { width: 'w-[26vw] sm:w-[clamp(7.5rem,15.5vw,14.5rem)]', rotate: -9, lift: '', z: 62 },
  {
    width: 'w-[31vw] sm:w-[clamp(9rem,19vw,17.5rem)]',
    rotate: 0,
    lift: '-translate-y-[8%]',
    z: 108,
  },
  { width: 'w-[26vw] sm:w-[clamp(7.5rem,15.5vw,14.5rem)]', rotate: 9, lift: '', z: 62 },
] as const;

type PlaneProps = {
  className: string;
  'data-rest': number;
  'data-lift': number;
  style: CSSProperties;
};

/**
 * A depth plane inside the slab.
 *
 * `rest` is where the layer lives once the section has arrived and is written
 * into the markup, so the composition keeps its depth with the script asleep
 * and under reduced motion. `lift` is the extra distance it travels in from,
 * read off the DOM by the one scrubbed tween that drives every plane.
 */
function plane(rest: number, lift: number, className?: string): PlaneProps {
  return {
    className: cn('cta-plane', className),
    'data-rest': rest,
    'data-lift': lift,
    style: { transform: `translateZ(${rest}px)` },
  };
}

/**
 * FINAL CTA — "Order Your Favourite Flavour"
 *
 * The page's one dark room, with a slab standing in it. It arrives leaned
 * back and set behind the frame, then turns flat and full-bleed as it scrolls
 * in; the eyebrow, the buttons and the bottles ride in on their own planes
 * and settle onto it. Inside it, three pools of flavour light wander on their
 * own slow cycles, so the room is never still even with nobody in it. On a
 * fine pointer the slab leans toward the cursor; a lamp follows it across the
 * face, taking the colour of whichever flavour's ground it is over; the pools
 * gather toward it; the slab's edge catches it where it passes close; and a
 * specular streak runs ahead of it at the speed a highlight moves on a hard,
 * tilted surface.
 *
 * Decisions worth knowing before editing:
 *
 * - **Three wrappers, and each owns exactly one thing.** `.cta-stage` is the
 *   camera and the clip and is *never* transformed; `.cta-slab` is the scroll
 *   scrub; the panel inside it is the pointer lean. The scrub and the lean can
 *   therefore never fight over one matrix, and either can be switched off on
 *   its own.
 * - **Every trigger measures the stage**, including the nav's dark-zone
 *   trigger, which is why `data-nav-theme` moved onto it. A ScrollTrigger
 *   reading a rotated element refreshes against whatever angle it happened to
 *   be at, and this one is rotating for the whole of its own trigger range.
 * - **The face is a layer, not a background.** An opaque background on the
 *   panel would paint at z = 0 and swallow anything behind it, and — more to
 *   the point — `overflow`, `clip-path`, `filter` and friends force
 *   `preserve-3d` back to flat, so the old clip-path arrival and the depth
 *   inside cannot both exist. The clip that crops the bottles now lives on the
 *   stage, which is the same box and is allowed to be flat.
 * - **The heading rests at z = 0 on purpose.** Everything around it stands
 *   off the face; the largest, thinnest type on the page stays exactly
 *   coplanar with the surface it is printed on, so it is never rasterised at a
 *   fractional scale. It still travels in z on the way in.
 * - **No `will-change` on the slab or the panel.** A will-change on a
 *   `preserve-3d` element is enough to make some engines flatten the subtree
 *   inside it; only the layers inside the face, which move continuously, are
 *   promoted.
 * - **All the light lives inside the face.** The lamp, the sheen, the dot
 *   field and the pools used to stand on planes of their own a few px off
 *   the surface, and Chrome's 3D sort drew them behind it: the lamp showed
 *   only through a hard-edged rectangle the size of the sheen's box and the
 *   dots not at all. The face is one flat element, so nothing in it can be
 *   sorted behind it, and its rounded clip keeps every glow on the slab.
 */
export function FinalCta() {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const slabRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);
  const sheenRef = useRef<HTMLDivElement>(null);
  const rimRef = useRef<HTMLDivElement>(null);
  const depthRef = useRef<HTMLDivElement>(null);

  const motionOK = useMotionOK();
  const finePointer = useHasFinePointer();
  const compact = useMediaQuery('(max-width: 767px)');

  /** The cursor rig is drawn only where there is a cursor to follow it. */
  const lit = motionOK && finePointer;

  useGsap(
    () => {
      if (!motionOK) return;
      const stage = stageRef.current;
      if (!stage) return;

      const arrival = compact ? ARRIVAL_COMPACT : ARRIVAL;
      /** Phones get a shallower room, so the planes travel proportionally. */
      const depth = compact ? 0.6 : 1;

      // --- The slab turns into place ------------------------------------
      // One scrub for the slab and every plane inside it, so the layers can
      // never drift out of step with the surface they are settling onto.
      gsap
        .timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: stage, start: 'top 92%', end: 'top 10%', scrub: 1 },
        })
        .fromTo(
          slabRef.current,
          { rotationX: arrival.rotate, z: arrival.z },
          { rotationX: 0, z: 0 },
          0
        )
        .fromTo(
          '.cta-plane',
          {
            z: (_i: number, el: HTMLElement) =>
              Number(el.dataset.rest ?? 0) + Number(el.dataset.lift ?? 0) * depth,
          },
          { z: (_i: number, el: HTMLElement) => Number(el.dataset.rest ?? 0) },
          0
        );

      gsap.fromTo(
        '.cta-bottles',
        { yPercent: 28 },
        {
          yPercent: 0,
          ease: 'none',
          scrollTrigger: { trigger: stage, start: 'top 70%', end: 'bottom bottom', scrub: 1 },
        }
      );

      // --- The copy arrives ----------------------------------------------
      gsap
        .timeline({ scrollTrigger: { trigger: stage, start: 'top 62%', once: true } })
        .fromTo('.cta-eyebrow', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 1 }, 0)
        .fromTo(
          '.cta-mark',
          { scale: 0, rotation: -135 },
          { scale: 1, rotation: 0, duration: 1.3, ease: 'power3.out' },
          0.15
        )
        .fromTo('.cta-lede', { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 1.2 }, 0.55)
        .fromTo(
          '.cta-action',
          { opacity: 0, y: 26 },
          { opacity: 1, y: 0, duration: 1.2, stagger: 0.1 },
          0.7
        )
        .fromTo('.cta-trust', { opacity: 0 }, { opacity: 1, duration: 1.2 }, 1);
    },
    [motionOK, compact],
    rootRef
  );

  /**
   * The weather. Each pool gets three sine yoyos — x, y and a breath of scale
   * and opacity — on its own wrapper inside the pointer's, so the cursor's
   * pull and the drift never touch one transform. They only run while the
   * stage is on screen: weather nobody can see is battery nobody gets back.
   */
  useGsap(
    () => {
      if (!motionOK) return;
      const stage = stageRef.current;
      if (!stage) return;

      const cycle = { ease: 'sine.inOut', repeat: -1, yoyo: true } as const;

      const loops = gsap.utils.toArray<HTMLElement>('.cta-drift').flatMap((pool, i) => {
        const spec = POOLS[i];
        if (!spec) return [];
        const [dx, dy] = spec.drift;
        const [px, py, pb] = spec.period;

        // Each axis starts at its own point in its cycle, so no pool ever
        // moves in a straight line.
        return [
          gsap
            .fromTo(pool, { xPercent: -dx }, { xPercent: dx, duration: px, ...cycle })
            .progress(spec.phase),
          gsap
            .fromTo(pool, { yPercent: -dy }, { yPercent: dy, duration: py, ...cycle })
            .progress((spec.phase + 0.35) % 1),
          gsap
            .fromTo(
              pool,
              { scale: 0.88, opacity: 0.72 },
              { scale: 1.12, opacity: 1, duration: pb, ...cycle }
            )
            .progress((spec.phase + 0.7) % 1),
        ];
      });

      const sync = (self: ScrollTrigger) => loops.forEach((loop) => loop.paused(!self.isActive));
      ScrollTrigger.create({
        trigger: stage,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: sync,
        onRefresh: sync,
      });
    },
    [motionOK],
    rootRef
  );

  /**
   * The light in the room.
   *
   * The panel leans toward the pointer while a lamp follows it, the flavour
   * pools gather toward it, the rim catches it and a specular streak runs
   * ahead of it. Everything is read from the **stage's** rect, not the
   * panel's: the panel is the thing being rotated, so measuring it would feed
   * the lean back into its own input and the tilt would creep.
   */
  useIsoLayoutEffect(() => {
    if (!lit) return;

    const stage = stageRef.current;
    const panel = panelRef.current;
    const light = lightRef.current;
    const sheen = sheenRef.current;
    const rim = rimRef.current;
    if (!stage || !panel || !light || !sheen || !rim) return;

    const leanX = gsap.quickTo(panel, 'rotationX', { duration: 0.9, ease: 'power3.out' });
    const leanY = gsap.quickTo(panel, 'rotationY', { duration: 0.9, ease: 'power3.out' });
    const lightX = gsap.quickTo(light, 'x', { duration: 0.9, ease: 'power3.out' });
    const lightY = gsap.quickTo(light, 'y', { duration: 0.9, ease: 'power3.out' });
    const lightScale = gsap.quickTo(light, 'scale', { duration: 0.6, ease: 'power2.out' });
    const lightFade = gsap.quickTo(light, 'opacity', { duration: 0.6, ease: 'power2.out' });
    const sheenX = gsap.quickTo(sheen, 'x', { duration: 1.1, ease: 'power3.out' });
    const sheenY = gsap.quickTo(sheen, 'y', { duration: 1.1, ease: 'power3.out' });
    const sheenFade = gsap.quickTo(sheen, 'opacity', { duration: 0.7, ease: 'power2.out' });

    // The lamp's colour: one crossfade per flavour, on the same clock as the
    // lamp's travel so the hue arrives with the light rather than after it.
    const tintEls = Array.from(light.querySelectorAll<HTMLElement>('.cta-tint'));
    const tints = tintEls.map((tint) =>
      gsap.quickTo(tint, 'opacity', { duration: 0.9, ease: 'power3.out' })
    );

    // The rim is a tighter clock than the lamp: an edge catching light is a
    // hard surface, and a hard surface answers at once.
    const rimEls = Array.from(rim.querySelectorAll<HTMLElement>('.cta-rim-light'));
    const rimStrips = rimEls.map((el) => ({
      edge: el.dataset.edge,
      x: gsap.quickTo(el, 'x', { duration: 0.55, ease: 'power3.out' }),
      y: gsap.quickTo(el, 'y', { duration: 0.55, ease: 'power3.out' }),
    }));
    const rimFade = gsap.quickTo(rim, 'opacity', { duration: 0.6, ease: 'power2.out' });

    /**
     * Points every strip's glow at the lamp, in that strip's own frame: the
     * bottom and right strips start a face's height or width along, so their
     * copy of the glow is offset by the same distance. `snap` passes the
     * target as the start too, for the same reason as on entry below.
     */
    const aimRim = (lx: number, ly: number, snap: boolean) => {
      for (const strip of rimStrips) {
        const tx = strip.edge === 'right' ? lx - (faceW - 1) : lx;
        const ty = strip.edge === 'bottom' ? ly - (faceH - 1) : ly;
        strip.x(tx, snap ? tx : undefined);
        strip.y(ty, snap ? ty : undefined);
      }
    };

    // The pools answer last and lazily — light in a room, not a cursor.
    const poolEls = Array.from(panel.querySelectorAll<HTMLElement>('.cta-pool'));
    const pools = poolEls.map((pool) => ({
      x: gsap.quickTo(pool, 'x', { duration: 1.8, ease: 'power3.out' }),
      y: gsap.quickTo(pool, 'y', { duration: 1.8, ease: 'power3.out' }),
    }));

    // The far field drifts against the lean, and further than it: the slab
    // turns one way, the room slides the other, and the gap between them is
    // the depth.
    const depth = depthRef.current;
    const depthX = depth ? gsap.quickTo(depth, 'x', { duration: 0.9, ease: 'power3.out' }) : null;
    const depthY = depth ? gsap.quickTo(depth, 'y', { duration: 0.9, ease: 'power3.out' }) : null;

    let rect: DOMRect | null = null;
    /**
     * Where the panel's box begins inside the stage — the stage's side
     * padding. The rig's layers are positioned in the *panel*, the pointer is
     * measured against the *stage*, and without this the lamp and the rim
     * would sit a padding's width off the cursor. Layout offsets, which
     * ignore transforms, so the lean can't feed back into them either.
     */
    let originX = 0;
    let originY = 0;
    /** The face's size, for the far strips of the rim. */
    let faceW = 0;
    let faceH = 0;
    let inside = false;
    let lastX = 0;
    let lastY = 0;
    let tracked = false;
    /** 0 → 1, smoothed: how hard the pointer is moving right now. */
    let speed = 0;

    // A light gets brighter and tighter as it is swept and settles back when
    // it is held still. `apply` only runs while the pointer moves, so the
    // settle has to be scheduled rather than waited for.
    const calm = () => {
      speed = 0;
      lightScale(1);
      lightFade(LIGHT_REST);
      sheenFade(SHEEN_REST);
    };
    const settle = gsap.delayedCall(0.24, calm).pause();

    /** The pointer has left the slab: it stands flat again and the light goes out. */
    const release = () => {
      if (!inside) return;
      inside = false;
      tracked = false;
      speed = 0;
      settle.pause();
      leanX(0);
      leanY(0);
      depthX?.(0);
      depthY?.(0);
      for (const pool of pools) {
        pool.x(0);
        pool.y(0);
      }
      lightScale(1);
      lightFade(0);
      sheenFade(0);
      rimFade(0);
    };

    const unsubscribe = subscribePointer({
      measure: () => {
        rect = stage.getBoundingClientRect();
        // Summed up the chain rather than read off the panel: the preserve-3d
        // slab is a containing block, so in Blink and Gecko *it* is the
        // panel's offsetParent and the panel's own offsets are always 0.
        let ox = 0;
        let oy = 0;
        for (
          let el: HTMLElement | null = panel;
          el && el !== stage;
          el = el.offsetParent as HTMLElement | null
        ) {
          ox += el.offsetLeft;
          oy += el.offsetTop;
        }
        originX = ox;
        originY = oy;
        faceW = panel.offsetWidth;
        faceH = panel.offsetHeight;
      },
      apply: (x, y) => {
        if (!rect) return;

        // The panel is usually taller than the screen, so "where on the slab"
        // means where within the band of it that is actually visible —
        // otherwise the lean is decided by a centre nobody can see.
        const top = Math.max(rect.top, 0);
        const bottom = Math.min(rect.bottom, window.innerHeight);
        const band = bottom - top;

        if (band < 1 || y < top || y > bottom || x < rect.left || x > rect.right) {
          release();
          return;
        }

        const nx = (x - rect.left) / rect.width - 0.5; // −0.5 → 0.5
        const ny = (y - top) / band - 0.5;

        const px = x - rect.left;
        const py = y - rect.top;

        // A specular highlight is a reflection, so it travels further than the
        // light that makes it — sideways especially. That difference is most
        // of what separates a lit slab from a lit sheet of paper. Vertically it
        // is damped instead, around the middle of the visible band, so the
        // streak stays on the part of the slab anyone can see.
        const midY = (top + bottom) / 2 - rect.top;
        const sx = (px - rect.width / 2) * 1.45 + rect.width / 2;
        const sy = (py - midY) * 0.6 + midY;

        // From the stage's frame into the panel's, where the layers live.
        const lx = px - originX;
        const ly = py - originY;
        const hue = tintWeights(nx + 0.5);

        // Entering: put the light where the cursor came in rather than letting
        // it sweep across the whole slab to catch up — and in the colour of
        // the ground it came in over. Passed as each quickTo's *start*: a
        // quickTo resumes from its own last value, not the element's, so a
        // plain `set` here would be undone in the same frame.
        if (!inside) {
          inside = true;
          lightX(lx, lx);
          lightY(ly, ly);
          sheenX(sx - originX, sx - originX);
          sheenY(sy - originY, sy - originY);
          aimRim(lx, ly, true);
          tints.forEach((fade, i) => fade(hue[i] ?? 0, hue[i] ?? 0));
        }

        leanY(nx * 2 * LEAN);
        leanX(-ny * 2 * LEAN);
        // Against the lean, and further: the room slides one way while the
        // card turns the other.
        depthX?.(nx * -84);
        depthY?.(ny * -54);

        lightX(lx);
        lightY(ly);
        sheenX(sx - originX);
        sheenY(sy - originY);
        aimRim(lx, ly, false);
        // Lit only while some edge is within the glow's reach of the lamp.
        const toEdge = Math.min(lx, ly, faceW - lx, faceH - ly);
        rimFade(Math.min(Math.max((RIM_REACH - toEdge) / 120, 0), 1));
        tints.forEach((fade, i) => fade(hue[i] ?? 0));

        // Toward the hand, each pool by its own share of the slab.
        const reachX = rect.width;
        pools.forEach((pool, i) => {
          const pull = POOLS[i]?.pull ?? 0;
          pool.x(nx * reachX * pull);
          pool.y(ny * band * pull);
        });

        if (tracked) {
          const raw = Math.min(Math.hypot(x - lastX, y - lastY) / 46, 1);
          speed += (raw - speed) * 0.25;
        }
        lastX = x;
        lastY = y;
        tracked = true;

        lightScale(1 + speed * 0.4);
        lightFade(LIGHT_REST + speed * 0.45);
        sheenFade(SHEEN_REST + speed * 0.45);
        settle.restart(true);
      },
      reset: release,
    });

    return () => {
      unsubscribe();
      settle.kill();
      gsap.killTweensOf([panel, light, sheen, rim, ...rimEls, ...tintEls, ...poolEls]);
      gsap.set(panel, { rotationX: 0, rotationY: 0 });
      gsap.set(poolEls, { x: 0, y: 0 });
      if (depth) {
        gsap.killTweensOf(depth);
        gsap.set(depth, { clearProps: 'transform' });
      }
    };
  }, [lit]);

  return (
    <section ref={rootRef} id="order" aria-labelledby="order-heading" className="relative pt-section">
      {/* THE ROOM.
          The camera and the clip live here, and nothing ever transforms this
          element — which is precisely what lets the nav's dark-zone trigger
          (and every ScrollTrigger below) measure a box that holds still. The
          section's own top padding stays white, so the nav is light over it. */}
      <div
        ref={stageRef}
        data-nav-theme="dark"
        className="cta-stage relative isolate overflow-hidden bg-pearl px-[clamp(0.5rem,2vw,2.25rem)] pb-[clamp(0.5rem,2vw,2.25rem)]"
        style={{
          perspective: `${PERSPECTIVE}px`,
          perspectiveOrigin: '50% 34%',
          // The page's own paper, not a second dark panel. A dark room behind
          // a dark slab is invisible: the lean had nothing to be seen against,
          // and the two surfaces read as one card sitting on another. Against
          // paper the slab is plainly a single card standing off the page.
          //
          // The band at the top is the room's shadow, not an edge — it is what
          // keeps the cream nav legible in the moment the slab leans back and
          // uncovers the stage behind it.
          backgroundImage:
            'linear-gradient(180deg, rgb(13 8 6 / 0.9) 0px, rgb(13 8 6 / 0.5) 96px, rgb(13 8 6 / 0) 200px)',
        }}
      >
        {/* Scroll owns this transform… */}
        <div ref={slabRef} className="cta-slab" style={{ transformStyle: 'preserve-3d' }}>
          {/* …and the pointer owns this one. */}
          <div
            ref={panelRef}
            className="relative flex min-h-[82svh] flex-col text-canvas"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* The face. A layer rather than a background, so everything else
                can stand in front of it, and lit from its top edge so the slab
                has a lip to catch the room's light. The shadow is painted once
                and never animated.

                Every light in the room lives inside it, back to front: the dot
                field, the flavour pools, the rim, the lamp and the sheen. One
                flat element, so none of them can be sorted behind the surface
                they light, and one rounded clip, so no glow ever spills off
                the slab onto the paper. Everything that moves in here is a
                soft gradient on a promoted layer, moved by transform or
                opacity only; a blur would be re-rasterised every frame. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-[clamp(1.75rem,3vw,3.25rem)]"
              style={{
                background:
                  'linear-gradient(168deg, #23160f 0%, #150e09 46%, #0c0705 100%)',
                boxShadow:
                  'inset 0 1px 0 rgb(246 239 228 / 0.09), inset 0 0 0 1px rgb(246 239 228 / 0.045), 0 70px 130px -50px rgb(0 0 0 / 0.9)',
              }}
            >
              {/* The ground moving under everything else: warm gradient
                  bands sliding against each other, each on its own clock.
                  Kept low so the heading never has to compete with it. */}
              <GradientLoop intensity={0.5} />

              {/* THE ROOM BEHIND THE GLASS.
                  A field of faint points, which the pointer pushes the
                  *opposite* way to the lean. Parallax between the field and
                  the surface is what the eye reads as depth — without
                  something back there, a leaning slab is just a skewed
                  rectangle. Masked to the middle so it never reaches the
                  edges and turns into a visible texture. */}
              <div
                ref={depthRef}
                className="absolute inset-[-14%] will-change-transform"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at center, rgb(246 239 228 / 0.16) 1.1px, transparent 1.1px)',
                  backgroundSize: '54px 54px',
                  WebkitMaskImage: 'radial-gradient(58% 52% at 50% 46%, #000 0%, transparent 76%)',
                  maskImage: 'radial-gradient(58% 52% at 50% 46%, #000 0%, transparent 76%)',
                }}
              />

              {/* The flavour pools. Two wrappers each: the pointer's pull
                  outside, the drift inside. */}
              {POOLS.map((pool) => (
                <div
                  key={pool.rgb}
                  className="cta-pool absolute will-change-transform"
                  style={{
                    left: `${pool.x - pool.w / 2}%`,
                    top: `${pool.y - pool.h / 2}%`,
                    width: `${pool.w}%`,
                    height: `${pool.h}%`,
                  }}
                >
                  <div
                    className="cta-drift size-full will-change-transform"
                    style={{
                      background: `radial-gradient(closest-side, rgb(${pool.rgb} / ${pool.alpha}) 0%, rgb(${pool.rgb} / ${(pool.alpha * 0.45).toFixed(3)}) 45%, rgb(${pool.rgb} / 0) 100%)`,
                    }}
                  />
                </div>
              ))}

              {lit && (
                <>
                  {/* The rim. Four hairlines, one per edge, each with the same
                      broad light moving inside it, so the edge catches the
                      lamp wherever the lamp passes close — the tell of a real
                      edge, which a printed rectangle does not have. It starts
                      dark, like everything below: a lamp that is already on,
                      parked in a corner, is the tell that it is a div. */}
                  <div ref={rimRef} className="absolute inset-0 opacity-0">
                    {RIM_EDGES.map((strip) => (
                      <div
                        key={strip.edge}
                        className={cn('absolute overflow-hidden', strip.className)}
                      >
                        <div
                          data-edge={strip.edge}
                          className="cta-rim-light absolute top-0 left-0 -mt-120 -ml-120 size-240 will-change-transform"
                          style={{ background: RIM_GLOW }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* The lamp the cursor carries: a warm core over three
                      tints, only ever one or two of them lit. GSAP owns its
                      transform entirely, so the offsets that centre it on the
                      pointer are margins, not a transform. Each tint is
                      promoted, so the crossfade is composited rather than
                      repainting a 700px gradient every frame. */}
                  <div
                    ref={lightRef}
                    className="absolute top-0 left-0 -mt-88 -ml-88 size-176 opacity-0 will-change-transform"
                  >
                    {TINTS.map((tint) => (
                      <div
                        key={tint.rgb}
                        className="cta-tint absolute inset-0 opacity-0 will-change-[opacity]"
                        style={{
                          background: `radial-gradient(closest-side, rgb(${tint.rgb} / ${tint.alpha}) 0%, rgb(${tint.rgb} / ${(tint.alpha * 0.4).toFixed(3)}) 45%, rgb(${tint.rgb} / 0) 100%)`,
                        }}
                      />
                    ))}
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          'radial-gradient(closest-side, rgb(246 239 228 / 0.16) 0%, rgb(246 239 228 / 0.05) 32%, rgb(246 239 228 / 0) 70%)',
                      }}
                    />
                  </div>

                  {/* The specular streak. Wide, shallow and almost not there —
                      it is the slab's gloss, not a second lamp. Faded out at
                      top and bottom: the streak is nearly vertical and its box
                      is not, so without the fade it ended in two hard cuts
                      and read as a lit rectangle rather than a gloss. */}
                  <div
                    ref={sheenRef}
                    className="absolute top-0 left-0 -mt-68 -ml-180 h-136 w-360 opacity-0 will-change-transform"
                    style={{
                      background:
                        'linear-gradient(104deg, transparent 38%, rgb(246 239 228 / 0.045) 46%, rgb(246 239 228 / 0.1) 50%, rgb(246 239 228 / 0.04) 54%, transparent 62%)',
                      WebkitMaskImage:
                        'linear-gradient(180deg, transparent 0%, #000 32%, #000 68%, transparent 100%)',
                      maskImage:
                        'linear-gradient(180deg, transparent 0%, #000 32%, #000 68%, transparent 100%)',
                    }}
                  />
                </>
              )}
            </div>

            <div className="cta-copy shell relative flex flex-col items-center pt-[clamp(5.5rem,12vh,8.5rem)] text-center">
              <Eyebrow tone="dark" markClassName="cta-mark" {...plane(10, 34, 'cta-eyebrow reveal')}>
                Order today
              </Eyebrow>

              {/* The heading gets a wrapper of its own: `SplitHeading` sets a
                  perspective and an opacity on the element it is given, and a
                  plane that shares an owner is a plane that loses a fight. */}
              <div {...plane(0, 72, 'mt-8 w-full')}>
                <SplitHeading
                  as="h2"
                  id="order-heading"
                  mode="words-flip"
                  start="top 80%"
                  className="mx-auto max-w-[11em] text-[clamp(3rem,1rem+7.6vw,10rem)] leading-[0.92] tracking-[-0.055em] text-canvas"
                >
                  Order Your Favourite Flavour
                </SplitHeading>
              </div>

              <p
                {...plane(
                  8,
                  44,
                  'cta-lede reveal mt-8 max-w-[44ch] font-sans text-lede text-canvas/60'
                )}
              >
                Free delivery. Pause or cancel any time.
              </p>

              <div
                {...plane(
                  26,
                  70,
                  'mt-11 flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:justify-center sm:gap-4'
                )}
              >
                <span className="cta-action reveal block">
                  <Magnetic className="block w-full sm:w-auto" strength={0.3} padding={36}>
                    <Button asChild size="xl" variant="light" className="w-full sm:w-auto">
                      <a href={STORE_URL}>
                        Shop Now
                        <ArrowRight
                          className="size-4 transition-transform duration-300 ease-luxe group-hover/btn:translate-x-1"
                          strokeWidth={1.5}
                        />
                      </a>
                    </Button>
                  </Magnetic>
                </span>
                <span className="cta-action reveal block">
                  <Magnetic className="block w-full sm:w-auto" strength={0.3} padding={36}>
                    <Button asChild size="xl" variant="glass" className="w-full sm:w-auto">
                      <a href="#flavours">Compare Flavours</a>
                    </Button>
                  </Magnetic>
                </span>
              </div>

              <ul
                {...plane(
                  8,
                  30,
                  'cta-trust reveal mt-9 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-sans text-micro text-canvas/45 uppercase'
                )}
              >
                {['25g protein', '3g sugar', 'Zero artificial flavours'].map((point) => (
                  <li key={point} className="flex items-center gap-5 whitespace-nowrap">
                    <span aria-hidden className="size-1 rounded-full bg-vanilla/50 first:hidden" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* The bottles stand on the floor of the room, in front of the
                slab, cropped by the stage as if the frame simply ended. The
                row has to keep its own 3D context or the three would collapse
                back onto one plane. */}
            <div
              aria-hidden
              className="cta-bottles relative mt-auto flex translate-y-[14%] items-end justify-center gap-[2.5vw] pt-10 sm:gap-[clamp(1rem,3vw,3rem)] sm:pt-14"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {FLAVOURS.map((flavour, index) => {
                const fan = FAN[index]!;
                return (
                  <div
                    key={flavour.id}
                    className={cn('relative', fan.width, fan.lift)}
                    style={{ transform: `translateZ(${fan.z}px)` }}
                  >
                    <Float amplitude={14} rotate={1.6} duration={4.6} phase={index * 0.33}>
                      <div style={{ rotate: `${fan.rotate}deg` } as CSSProperties}>
                        <span
                          className="absolute inset-x-[8%] bottom-[-6%] h-[30%] rounded-[50%] blur-2xl"
                          style={{ background: flavour.tone.glow }}
                        />
                        <BottleImage
                          flavour={flavour}
                          className="aspect-3/4 w-full rounded-t-full rounded-b-[2rem] shadow-[0_50px_90px_-40px_rgb(0_0_0/0.9)] ring-1 ring-white/15"
                          alt=""
                        />
                      </div>
                    </Float>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
