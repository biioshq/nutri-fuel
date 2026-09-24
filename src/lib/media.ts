/**
 * Every media asset on the site: the film, the three bottle photographs and
 * the brand mark.
 *
 * The bottle photographs are full art-directed frames — background, splash,
 * and a column of type at each side — not cut-outs. `focus` is the
 * `object-position` that centres the bottle, and a frame must stay at or
 * below `MAX_FRAME_ASPECT` (width / height) for the cover crop to keep that
 * type out of shot. Both were measured off the files; re-measure if an image
 * is replaced.
 */

export type BottleAsset = {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  /** CSS `object-position` that centres the bottle. */
  readonly focus: string;
  readonly blurDataURL: string;
};

/** Widest frame (w / h) that still crops the baked-in type out of every photograph. */
export const MAX_FRAME_ASPECT = 0.8;

export const HERO_VIDEO = '/hero.mp4';

/**
 * The brand mark: `logo.png` trimmed to the glyph with its white ground turned
 * into transparency, so it can be used as a mask and take any colour.
 * `logo.png` stays the untouched original; the favicon (app/icon.png) is
 * derived from it too.
 */
export const LOGO_MARK = { src: '/logo-mark.png', width: 358, height: 256 } as const;

export const BOTTLES = {
  chocolate: {
    src: '/chocolate.png',
    width: 1536,
    height: 1024,
    focus: '52% 50%',
    blurDataURL:
      'data:image/webp;base64,UklGRl4AAABXRUJQVlA4IFIAAAAwAgCdASoQAAsAA4BaJYgCdADp9QsxotaqAAD+8WwsYMweob9IHynNsyM94qMYBoaGp2c7gKuId0I4R9ILUMRM+eZOjZpQLxJMnoBt4T1eTiwA',
  },
  vanilla: {
    src: '/vanilla.png',
    width: 1672,
    height: 941,
    focus: '53% 50%',
    blurDataURL:
      'data:image/webp;base64,UklGRmIAAABXRUJQVlA4IFYAAACwAQCdASoQAAkAA4BaJQBOgMW0aRLAAP7yO/F1E396JKaSaYSYFOWCSC4s8R/UjIsJXRaHBOiAlanJUSNHkr5sDjUJF85qTqWeWCmIw1uwng7HtcAAAA==',
  },
  strawberry: {
    src: '/strawberry.png',
    width: 1672,
    height: 941,
    focus: '56% 50%',
    blurDataURL:
      'data:image/webp;base64,UklGRmgAAABXRUJQVlA4IFwAAAAQAgCdASoQAAkAA4BaJbACdAYtpTOIhxNkAP7oYICbSALmu5p57GV/yf3oEg98H9xc85fQiyBW1P+medByUaBi9Al8TvjoqB05B8YFnm73X3muO5Ccc8AgqQAAAA==',
  },
} as const satisfies Record<string, BottleAsset>;
