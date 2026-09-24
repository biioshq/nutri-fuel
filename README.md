# NutriFuel

A single-page site for a premium ready-to-drink protein shake. Next.js 15 (App
Router), TypeScript, Tailwind v4, GSAP + ScrollTrigger, Lenis, and Motion.

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm run build && npm start
```

## The look

White first. Warm beige (`#EDE3D6`) and soft cream (`#F6EFE4`) carry the quiet
surfaces; chocolate, vanilla bean and strawberry pink appear only as accents,
each owned by its flavour. One face throughout: Libre Baskerville, a
transitional serif drawn for screens, which holds at caption sizes as well as
at 10rem. It ships 400 and 700 only, so the tracking on the display sizes is
set for a serif rather than for the geometric sans that came before. Shadows
are warm, never grey.

Copy is written without em dashes: the page should not read as though it was
generated.

All tokens live in [`src/app/globals.css`](src/app/globals.css) under `@theme`.
The tailwind-merge scales in [`src/lib/utils.ts`](src/lib/utils.ts) must be
kept in step with them.

## The page

| Anchor | Section | Signature |
| --- | --- | --- |
| `#top` | Hero | The film, full width on every screen shape, with two buttons and nothing over it |
| `#flavours` | Flavours | Cards arrive stacked out of depth, split into three on a pinned scrub, and flip about their vertical axis on hover |
| `#protein` | The number | A ring of twenty-five ticks closing in step with the counter, on a dark band |
| `#showcase` | Showcase | Pinned, scrubbed scene — the bottles fan out from behind one another |
| `#results` | Results | Two rails of testimonials gliding in opposite directions on scroll |
| `#order` | Order | A dark panel that opens to full bleed as it arrives |

## Assets

All in `public/`: `hero.mp4`, `chocolate.png`, `vanilla.png`, `strawberry.png`
and `logo.png`. [`src/lib/media.ts`](src/lib/media.ts) is the manifest.

`logo-mark.png` and `src/app/icon.png` are derived from `logo.png`: the glyph
trimmed and its white ground made transparent, so `Logo` can paint it as a
mask in `currentColor`. Regenerate both if the logo changes.

The bottle photographs are full art-directed frames with type baked in at both
sides, not cut-outs. `BottleImage` crops them to the bottle with a measured
`object-position`, and any frame must stay at or narrower than 4:5
(`MAX_FRAME_ASPECT`) or that type comes back into shot. Re-measure `focus` if a
photograph is replaced. `next/image` handles format and size negotiation.

## Architecture

```
src/
├─ app/            layout · page · globals.css (all design tokens) · icon.svg
├─ components/
│  ├─ sections/    Hero · Flavours · ProteinStat · Showcase · Results
│  │                FinalCta · Footer
│  ├─ layout/      SmoothScroll · Nav · Loader · Grain
│  ├─ motion/      SplitHeading · Counter · Magnetic · Float · Tilt · Motes
│  ├─ media/       BackgroundVideo · BottleImage
│  └─ ui/          button · SectionIntro · Logo · brand-icons
├─ hooks/          useGsap · useMediaQuery · useIsoLayoutEffect
└─ lib/            site · flavours · content · media · loading · split · gsap · pointer · ease · utils
```

**Data, not markup.** Brand copy lives in `lib/site.ts`, flavours in
`lib/flavours.ts`, and the sister brands in `lib/content.ts`. Components
render it; none of them hard-code marketing text.

**The page is deliberately short.** It is carried by the film, the flavour
stack, the number, the collection, the testimonial rails and the order panel —
the explanatory sections (a benefits grid, a nutrition comparison and an FAQ)
were cut on purpose, and so was a sister-brand block. Keep new copy to a line:
the quotes on the rails are one sentence each by design.

**Motion ownership.** GSAP owns everything scroll-linked and every entrance;
Motion is used only for mount/unmount (the mobile navigation). One element is
never animated by two engines, and nested wrappers keep separate concerns —
entrance, parallax, idle float, pointer tilt, hover — on separate transforms.

**One RAF loop.** `gsap.ticker` drives Lenis, and Lenis updates ScrollTrigger.
Lenis also handles in-page anchors, so every `href="#section"` glides.

**One pointer listener.** Magnetic buttons, tilting cards and the hero parallax
all subscribe to `lib/pointer.ts`, which batches every rect read into one layout
flush per frame. Moving the mouse never triggers a React render.

**The nav reads the page.** Any section marked `data-nav-theme="dark"` (the
hero and the order section) switches the floating nav to its light-on-dark
theme while it sits beneath it.

**`reveal`, not `opacity-0`.** Every scroll-revealed element wears the `reveal`
utility: `opacity: 0`, except under `prefers-reduced-motion`, where the timeline
that would un-hide it never runs.

## Accessibility & performance

- `prefers-reduced-motion` is honoured throughout: timelines no-op, Lenis is
  never created, the pinned showcase becomes a static composition, the film
  does not autoplay, and `reveal` resolves to visible.
- Only the hero bottles load eagerly; every other image lazy-loads with an
  inline blur placeholder.
- The film is paused whenever it is off-screen.
- Animated properties are transforms, opacity and clip-path. Hover shadows
  crossfade a pre-rendered layer rather than interpolating `box-shadow`.

## Known caveats

- **This project sits inside a OneDrive-synced folder.** OneDrive contending
  with Next's writes to `.next` can produce 404s on chunks during development.
  If the page loads unstyled, stop the server, delete `.next`, and restart.
- Never run a plain `next build` while `next dev` is running — they share
  `.next` and corrupt each other, which shows up as sections rendering blank.
  Use `QA_BUILD=1 npx next build` (and `QA_BUILD=1 npx next start -p 3100`) to
  check a production build alongside a live dev server: it writes to
  `.next-qa` instead.
- The storefront is not wired up: the order section links to `STORE_URL` in
  `lib/site.ts`, which is the integration point.
- Testimonials, statistics and the "typical shake" comparison are illustrative
  copy for the design and should be replaced with verified figures before launch.
