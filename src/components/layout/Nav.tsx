'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/Logo';
import { FacebookIcon, InstagramIcon, YoutubeIcon } from '@/components/ui/brand-icons';
import { Magnetic } from '@/components/motion/Magnetic';
import { useSmoothScroll } from '@/components/layout/SmoothScroll';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useIsoLayoutEffect } from '@/hooks/useIsoLayoutEffect';
import { useMotionOK } from '@/hooks/useMediaQuery';
import { EASE } from '@/lib/ease';
import { NAV_LINKS, SHOP_HREF, SITE, SOCIALS } from '@/lib/site';
import { cn } from '@/lib/utils';

const ICONS = {
  instagram: InstagramIcon,
  youtube: YoutubeIcon,
  facebook: FacebookIcon,
} as const;

/**
 * NAV
 *
 * A floating pill that reads the page beneath it. Over any section marked
 * `data-nav-theme="dark"` — the hero film and the order panel — it is cream
 * type on nothing, then smoked glass once the page moves. Everywhere else it
 * is white glass with ink type.
 *
 * Nothing that changes on scroll is a transform: a transformed ancestor
 * becomes a backdrop root, and the glass would have nothing left to blur.
 *
 * Every trigger here refreshes *after* the rest of the page
 * (`refreshPriority: -1`), because the showcase pins further down and its
 * spacer moves every section below it — triggers measured before that pin
 * exists would point at the wrong scroll positions.
 */
export function Nav() {
  const [dark, setDark] = useState(true);
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const listRef = useRef<HTMLUListElement>(null);
  const markerRef = useRef<HTMLSpanElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  const motionOK = useMotionOK();
  const { scrollTo, stop, start } = useSmoothScroll();

  // --- Entrance -----------------------------------------------------------
  useIsoLayoutEffect(() => {
    const pill = document.querySelector<HTMLElement>('.nav-pill');
    if (!pill) return;

    if (!motionOK) {
      gsap.set(pill, { opacity: 1, clearProps: 'transform' });
      return;
    }

    const tween = gsap.fromTo(
      pill,
      { opacity: 0, y: -22 },
      {
        opacity: 1,
        y: 0,
        duration: 0.9,
        delay: 0.3,
        ease: 'power4.out',
        onComplete: () => gsap.set(pill, { clearProps: 'transform' }),
      }
    );

    return () => {
      tween.kill();
    };
  }, [motionOK]);

  // --- Theme, scrolled state and the active section -----------------------
  useIsoLayoutEffect(() => {
    const triggers: ScrollTrigger[] = [];

    // Declared before any trigger exists: ScrollTrigger may call onRefresh
    // synchronously inside create(), and the callback reads this array.
    const darkZones: ScrollTrigger[] = [];
    const syncTheme = () => setDark(darkZones.some((trigger) => trigger.isActive));

    document.querySelectorAll('[data-nav-theme="dark"]').forEach((zone) => {
      darkZones.push(
        ScrollTrigger.create({
          trigger: zone,
          start: 'top top+=40',
          end: 'bottom top+=40',
          refreshPriority: -1,
          onToggle: syncTheme,
          onRefresh: syncTheme,
        })
      );
    });
    triggers.push(...darkZones);

    for (const link of NAV_LINKS) {
      const target = document.querySelector(link.href);
      if (!target) continue;

      triggers.push(
        ScrollTrigger.create({
          trigger: target,
          start: 'top center',
          end: 'bottom center',
          refreshPriority: -1,
          onToggle: (self) =>
            setActive((current) =>
              self.isActive ? link.href : current === link.href ? null : current
            ),
        })
      );
    }

    syncTheme();

    return () => triggers.forEach((trigger) => trigger.kill());
  }, []);

  // --- The marker glides to whichever link is current ----------------------
  useIsoLayoutEffect(() => {
    const list = listRef.current;
    const marker = markerRef.current;
    if (!list || !marker) return;

    const link = active ? list.querySelector<HTMLElement>(`[data-href="${active}"]`) : null;

    if (!link) {
      gsap.to(marker, { opacity: 0, duration: 0.3, overwrite: 'auto' });
      return;
    }

    gsap.to(marker, {
      x: link.offsetLeft,
      width: link.offsetWidth,
      opacity: 1,
      duration: motionOK ? 0.6 : 0,
      ease: 'power3.out',
      overwrite: 'auto',
    });
  }, [active, motionOK]);

  // --- Mobile overlay: lock scroll, move focus, close on Escape ------------
  useEffect(() => {
    if (open) {
      stop();
      wasOpen.current = true;
      const frame = requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('#mobile-navigation a')?.focus()
      );
      return () => cancelAnimationFrame(frame);
    }

    start();
    if (wasOpen.current) {
      wasOpen.current = false;
      toggleRef.current?.focus();
    }
  }, [open, stop, start]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Lenis ignores scroll requests while stopped, so release it before
  // travelling rather than waiting for the effect above.
  const goFromOverlay = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault();
    start();
    setOpen(false);
    scrollTo(href);
  };

  const onDark = dark && !open;

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
        <div className="shell pt-3 lg:pt-4">
          <div
            className={cn(
              'nav-pill reveal pointer-events-auto relative mx-auto flex h-16 items-center justify-between gap-6 rounded-full border pr-2.5 pl-5 sm:pl-6',
              'transition-[background-color,border-color,box-shadow,color] duration-500 ease-luxe',
              // Over the film the nav is bare type — no surface at all. A soft
              // shadow behind the letters (and the mark) is what keeps white
              // legible on a light, busy frame without boxing anything in.
              onDark
                ? 'border-transparent bg-transparent text-canvas [text-shadow:0_1px_2px_rgb(0_0_0/0.25),0_2px_18px_rgb(0_0_0/0.35)]'
                : 'border-hair/90 bg-canvas/80 text-ink shadow-float backdrop-blur-2xl'
            )}
          >
            <a
              href="#top"
              aria-label={`${SITE.name} — back to top`}
              className={cn(
                '-my-2 py-2 transition-[filter] duration-500',
                onDark && 'drop-shadow-[0_2px_10px_rgb(0_0_0/0.35)]'
              )}
            >
              <Logo />
            </a>

            {/* Desktop links, with one marker that travels between them. */}
            <ul ref={listRef} className="relative hidden items-center lg:flex">
              <span
                ref={markerRef}
                aria-hidden
                className={cn(
                  'absolute inset-y-0 left-0 rounded-full opacity-0 transition-colors duration-500',
                  onDark ? 'bg-white/12' : 'bg-ink/[0.055]'
                )}
              />
              {NAV_LINKS.map((link) => (
                // Not `relative`: the marker is positioned from each link's
                // offsetLeft, which must be measured against the list.
                <li key={link.href}>
                  <a
                    href={link.href}
                    data-href={link.href}
                    aria-current={active === link.href ? 'true' : undefined}
                    className={cn(
                      'block rounded-full px-4 py-2.5 font-sans text-[0.8125rem] font-medium transition-opacity duration-300',
                      active === link.href ? 'opacity-100' : 'opacity-85 hover:opacity-100'
                    )}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-2">
              <Magnetic className="hidden sm:inline-block" strength={0.22} padding={24}>
                <Button asChild size="sm" variant={onDark ? 'light' : 'primary'}>
                  <a href={SHOP_HREF}>Shop Now</a>
                </Button>
              </Magnetic>

              <button
                ref={toggleRef}
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-controls="mobile-navigation"
                aria-label={open ? 'Close navigation' : 'Open navigation'}
                className={cn(
                  'relative grid size-11 touch-manipulation place-items-center rounded-full border transition-[transform,border-color] duration-150 ease-luxe active:scale-90 lg:hidden',
                  onDark ? 'border-white/25' : 'border-hair'
                )}
              >
                <span
                  className={cn(
                    'absolute h-px w-4 bg-current transition-transform duration-300 ease-luxe',
                    open ? 'rotate-45' : '-translate-y-[3px]'
                  )}
                />
                <span
                  className={cn(
                    'absolute h-px w-4 bg-current transition-transform duration-300 ease-luxe',
                    open ? '-rotate-45' : 'translate-y-[3px]'
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-navigation"
            aria-label="Site"
            initial={{ clipPath: 'inset(0% 0% 100% 0%)' }}
            animate={{ clipPath: 'inset(0% 0% 0% 0%)' }}
            exit={{ clipPath: 'inset(0% 0% 100% 0%)' }}
            transition={{ duration: 0.6, ease: EASE.curtain }}
            className="fixed inset-0 z-40 flex flex-col bg-canvas lg:hidden"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(90% 55% at 50% 105%, rgb(246 239 228 / 0.95), transparent 70%)',
              }}
            />

            <ul className="shell relative flex flex-1 flex-col justify-center gap-1 pt-24">
              {NAV_LINKS.map((link, index) => (
                <motion.li
                  key={link.href}
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0, transition: { duration: 0.25 } }}
                  transition={{ duration: 0.7, ease: EASE.luxe, delay: 0.12 + index * 0.05 }}
                >
                  <a
                    href={link.href}
                    onClick={(event) => goFromOverlay(event, link.href)}
                    className="flex items-baseline gap-4 py-2 text-ink"
                  >
                    <span className="font-sans text-micro text-faint tabular-nums">
                      0{index + 1}
                    </span>
                    <span className="display-face text-[clamp(2.5rem,11vw,4.25rem)]">
                      {link.label}
                    </span>
                  </a>
                </motion.li>
              ))}
            </ul>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="shell relative flex items-center justify-between gap-6 pb-10"
            >
              <Button asChild size="lg" variant="primary">
                <a href={SHOP_HREF} onClick={(event) => goFromOverlay(event, SHOP_HREF)}>
                  Shop Now
                </a>
              </Button>

              <ul className="flex gap-2">
                {SOCIALS.map((social) => {
                  const Icon = ICONS[social.icon];
                  return (
                    <li key={social.label}>
                      <a
                        href={social.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        aria-label={social.label}
                        className="grid size-11 place-items-center rounded-full border border-hair text-ink-soft"
                      >
                        <Icon className="size-4" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
