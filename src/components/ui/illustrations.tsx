import type { CSSProperties, RefObject } from 'react';
import { cn } from '@/lib/utils';

/**
 * THE HOUSE DRAWINGS
 *
 * A shaker, a dumbbell and a kettlebell, drawn once for the whole site: one
 * stroke width, one cap style, `currentColor` throughout — so they read as a
 * set rather than as three borrowed icons, and so the same three files can be
 * the loading screen's cocoa line art *or* a vast, near-invisible watermark
 * behind a section, decided entirely by the colour and size the caller hands
 * them.
 *
 * They began life inside the loading screen. Nothing here knows about the
 * loader any more:
 *
 * - `drawClass` is opt-in. Pass one and every stroke starts undrawn and is
 *   tagged with that class for the caller's timeline to animate
 *   `strokeDashoffset` on. Leave it off — which is what a background copy
 *   wants — and the drawing is simply there.
 * - `strokeWidth` is a prop rather than a constant, because a 20rem watermark
 *   wants a far finer line than a 7rem icon.
 * - The shaker's fill (liquid, bubbles, mixing ball) is opt-in too, through
 *   `fill`. Only the loading screen asks for it, and only it has to supply the
 *   id prefix that keeps the clip path and gradient unique.
 */

export type LineArtProps = {
  className?: string;
  style?: CSSProperties;
  /**
   * Tag every stroke with this class and start it undrawn, so the caller's
   * timeline can draw the illustration on.
   */
  drawClass?: string;
  /** Stroke weight in viewBox units. Large, faint copies want less. */
  strokeWidth?: number;
};

/** One line vocabulary for all three. Weight is the caller's business. */
const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/**
 * `overflow-visible` so a round cap sitting on the viewBox edge is never
 * shaved; `block` so the drawing never picks up an inline baseline gap.
 */
const SVG_BASE = 'block overflow-visible';

/**
 * Undrawn in the markup itself, not just in the timeline: server-rendered, a
 * finished drawing would flash on and then be wiped back to nothing the moment
 * the timeline took over.
 */
const UNDRAWN: CSSProperties = { strokeDasharray: '1 2', strokeDashoffset: '1.02' };

/**
 * Per-stroke props. `pathLength={1}` normalises every path to a single unit so
 * one timeline value draws strokes of wildly different lengths in step.
 */
function drawProps(drawClass?: string) {
  return drawClass ? { className: drawClass, pathLength: 1, style: UNDRAWN } : {};
}

/* -------------------------------------------------------------------------- */
/* Shaker                                                                      */
/* -------------------------------------------------------------------------- */

/** Authored once: the outline and the clip path must not drift apart. */
const SHAKER_BODY =
  'M28 66 Q28 46 44 41 L76 41 Q92 46 92 66 L92 176 Q92 192 76 192 L44 192 Q28 192 28 176 Z';

export type ShakerFill = {
  /**
   * The liquid block. It is taller than the bottle and starts below it, so the
   * caller raises the level by sliding this group up on Y.
   */
  ref: RefObject<SVGGElement | null>;
  /** Unique per instance: SVG ids are document-global. */
  idPrefix: string;
  /** Classes for the caller's timeline to target. */
  liquidClass?: string;
  bubbleClass?: string;
  ballClass?: string;
};

export type ShakerProps = LineArtProps & {
  /** Fill the bottle. Omitted, the shaker is pure line art. */
  fill?: ShakerFill;
};

/** The shaker — the only one of the three that can hold anything. */
export function Shaker({ className, style, drawClass, strokeWidth = 3, fill }: ShakerProps) {
  const stroke = drawProps(drawClass);
  const clip = fill ? `${fill.idPrefix}-shaker-body` : undefined;
  const liquid = fill ? `${fill.idPrefix}-shaker-liquid` : undefined;

  return (
    <svg viewBox="0 0 120 210" aria-hidden className={cn(SVG_BASE, className)} style={style}>
      {fill && (
        <>
          <defs>
            <clipPath id={clip}>
              <path d={SHAKER_BODY} />
            </clipPath>
            <linearGradient id={liquid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9a6a4f" />
              <stop offset="100%" stopColor="#6b4430" />
            </linearGradient>
          </defs>

          {/* The liquid, clipped to the bottle and slid up from below as it fills. */}
          <g clipPath={`url(#${clip})`}>
            <g
              ref={fill.ref}
              className={fill.liquidClass}
              style={{ transform: 'translateY(150px)', opacity: 0 }}
            >
              <path
                d="M20 24 Q35 14 50 24 T80 24 T110 24 L110 260 L20 260 Z"
                fill={`url(#${liquid})`}
                opacity="0.92"
              />
              <circle className={fill.bubbleClass} cx="48" cy="96" r="4" fill="#f6efe4" opacity="0.5" />
              <circle className={fill.bubbleClass} cx="66" cy="124" r="3" fill="#f6efe4" opacity="0.45" />
              <circle className={fill.bubbleClass} cx="56" cy="152" r="5" fill="#f6efe4" opacity="0.4" />
            </g>
          </g>

          {/* The mixing ball, resting in the foot of the bottle. */}
          <g clipPath={`url(#${clip})`}>
            <circle
              className={fill.ballClass}
              cx="60"
              cy="172"
              r="11"
              fill="none"
              stroke="#f6efe4"
              strokeWidth="3"
              style={{ opacity: 0 }}
            />
          </g>
        </>
      )}

      <g {...STROKE} strokeWidth={strokeWidth}>
        <path {...stroke} d={SHAKER_BODY} />
        <path {...stroke} d="M42 41 L42 20 Q42 12 50 12 L70 12 Q78 12 78 20 L78 41" />
        <path {...stroke} d="M38 26 L82 26" />
        <path {...stroke} d="M78 86 L86 86" />
        <path {...stroke} d="M78 110 L86 110" />
        <path {...stroke} d="M78 134 L86 134" />
      </g>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Weights                                                                     */
/* -------------------------------------------------------------------------- */

export function Dumbbell({ className, style, drawClass, strokeWidth = 3 }: LineArtProps) {
  const stroke = drawProps(drawClass);

  return (
    <svg viewBox="0 0 120 120" aria-hidden className={cn(SVG_BASE, className)} style={style}>
      <g {...STROKE} strokeWidth={strokeWidth}>
        <path {...stroke} d="M40 60 L80 60" />
        <path
          {...stroke}
          d="M34 42 Q28 42 28 50 L28 70 Q28 78 34 78 Q40 78 40 70 L40 50 Q40 42 34 42 Z"
        />
        <path
          {...stroke}
          d="M86 42 Q80 42 80 50 L80 70 Q80 78 86 78 Q92 78 92 70 L92 50 Q92 42 86 42 Z"
        />
        <path {...stroke} d="M20 52 L20 68" />
        <path {...stroke} d="M100 52 L100 68" />
      </g>
    </svg>
  );
}

export function Kettlebell({ className, style, drawClass, strokeWidth = 3 }: LineArtProps) {
  const stroke = drawProps(drawClass);

  return (
    <svg viewBox="0 0 120 130" aria-hidden className={cn(SVG_BASE, className)} style={style}>
      <g {...STROKE} strokeWidth={strokeWidth}>
        {/* Handle: an arc that stops short of the bell, so it reads as a grip. */}
        <path {...stroke} d="M44 50 Q40 22 60 22 Q80 22 76 50" />
        <path {...stroke} d="M54 48 Q30 60 30 86 Q30 112 60 112 Q90 112 90 86 Q90 60 66 48" />
        <path {...stroke} d="M54 48 L66 48" />
      </g>
    </svg>
  );
}
