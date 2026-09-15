# Ajay Protein

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
each owned by its flavour. Outfit at weight 200 for the display sizes — a
geometric sans whose thin strokes read as precision at 10rem — with Inter for
everything set small. Shadows are warm, never grey.

All tokens live in [`src/app/globals.css`](src/app/globals.css) under `@theme`.
The tailwind-merge scales in [`src/lib/utils.ts`](src/lib/utils.ts) must be
kept in step with them.

## The page

| Anchor | Section | Signature |
| --- | --- | --- |
| `#top` | Hero | Film background, two-tone headline rising from masks, three floating bottles that tilt toward the pointer and spread apart on scroll |
| `#flavours` | Flavours | Three cards; the section background crossfades to the hovered flavour |
| `#why` | Why Ajay Protein | Bento grid with self-drawing line icons |
| `#nutrition` | Nutrition | Flavour switcher with re-tweening figures; Ajay Protein vs a typical shake |
| `#showcase` | Showcase | Pinned, scrubbed scene — the bottles fan out from behind one another |
| `#results` | Results | Two tracks of testimonials gliding in opposite directions |
| `#faq` | FAQ | Height-animated accordion beside a sticky heading |
| `#order` | Order | A dark panel that opens to full bleed as it arrives |
| `#family` | More from Ajay | Ajay Gym and Ajay Tours and Travels, each card dressed in its poster's own ground |

## Assets

All in `public/`: `hero.mp4`, `chocolate.png`, `vanilla.png`, `strawberry.png`,
`logo.png`, and the sister-brand posters `gym.png` and `travel.png` (shown whole,
never cropped — both have type set in). Note the bottle photographs and the film
still print the previous brand name on their labels. [`src/lib/media.ts`](src/lib/media.ts) is the manifest.

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
│  ├─ sections/    Hero · Flavours · WhyUs · Nutrition · Showcase · Results
│  │                Faq · FinalCta · Footer
│  ├─ layout/      SmoothScroll · Nav · Grain
│  ├─ motion/      SplitHeading · Counter · Magnetic · Float · Tilt · Motes
│  ├─ media/       BackgroundVideo · BottleImage
│  └─ ui/          button · SectionIntro · Logo · brand-icons
├─ hooks/          useGsap · useMediaQuery · useIsoLayoutEffect
└─ lib/            site · flavours · content · media · split · gsap · pointer · ease · utils
```

**Data, not markup.** Brand copy lives in `lib/site.ts`, flavours in
`lib/flavours.ts`, and every other piece of page copy in `lib/content.ts`.
Components render it; none of them hard-code marketing text.

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
- Never run `next build` while `next dev` is running — they share `.next`.
- The storefront is not wired up: the order section links to `STORE_URL` in
  `lib/site.ts`, which is the integration point.
- Testimonials, statistics and the "typical shake" comparison are illustrative
  copy for the design and should be replaced with verified figures before launch.
