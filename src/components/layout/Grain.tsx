'use client';

/**
 * Paper.
 *
 * Two jobs, one element. First, a very fine woven tooth laid over the whole
 * page in `multiply` at three per cent — enough that the cream reads as stock
 * rather than as #F8F5EF, and enough to kill the banding in the wide warm
 * gradients. Second, a top-light: a soft vertical lift that keeps the page
 * from ever looking evenly lit.
 *
 * The tooth is laid on in normal blending rather than `multiply`. A blend
 * mode on a fixed, full-viewport layer is not a free lens: it forces the
 * browser to rasterise everything painted beneath it into the same buffer and
 * re-blend the whole viewport on every scroll frame, which is exactly the
 * frame budget this page could not spare. At three per cent the grey tile
 * darkens and lifts the cream in roughly equal measure, so the paper reads the
 * same — it simply composites now.
 */

const NOISE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'>" +
  "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' " +
  "stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter>" +
  "<rect width='100%' height='100%' filter='url(%23n)' opacity='0.55'/></svg>";

export function Grain() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-70">
      {/* Tooth */}
      <div
        className="absolute inset-[-6%] opacity-[0.04]"
        style={{ backgroundImage: `url("${NOISE}")`, backgroundSize: '220px 220px' }}
      />

      {/* Top-light — the page is lit from above and slightly to the left, the
          same direction as the light in every photograph on it. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(184deg, rgb(255 255 255 / 0.10) 0%, rgb(255 255 255 / 0) 22%, rgb(255 255 255 / 0) 80%, rgb(237 227 214 / 0.14) 100%)',
        }}
      />
    </div>
  );
}
