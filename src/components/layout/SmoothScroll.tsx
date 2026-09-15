'use client';

import Lenis from 'lenis';
import { usePathname } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useIsoLayoutEffect } from '@/hooks/useIsoLayoutEffect';
import { useMotionOK } from '@/hooks/useMediaQuery';
import { useScrollTriggerRefresh } from '@/hooks/useGsap';

type ScrollTo = (target: string | number | HTMLElement, options?: { offset?: number }) => void;

type SmoothScrollValue = {
  lenis: Lenis | null;
  scrollTo: ScrollTo;
  stop: () => void;
  start: () => void;
};

const SmoothScrollContext = createContext<SmoothScrollValue | null>(null);

export function useSmoothScroll(): SmoothScrollValue {
  const value = useContext(SmoothScrollContext);
  if (!value) {
    throw new Error('useSmoothScroll must be used inside <SmoothScroll>');
  }
  return value;
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const motionOK = useMotionOK();
  const pathname = usePathname();

  // Fonts and images change heights after first paint, and the showcase pins
  // — every trigger below it has to be re-measured once they land.
  useScrollTriggerRefresh();

  useIsoLayoutEffect(() => {
    // Reduced motion means the OS-native scroll, untouched.
    if (!motionOK) return;

    const instance = new Lenis({
      // Lerp rather than duration. A fixed 1.15s exponential settle meant every
      // wheel tick took over a second to finish arriving, and a second tick
      // during that window restarted the clock — which reads as latency, not
      // as luxury. A framerate-independent lerp starts moving on the same
      // frame as the input and still glides to a stop, so the page feels
      // immediate *and* smooth. 0.11 covers ~90% of the distance in ~350ms.
      lerp: 0.11,
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      // 0.95 quietly ate 5% of every scroll gesture, so the page always
      // travelled slightly less far than the hand asked for.
      wheelMultiplier: 1,
      // Native momentum on touch feels better than a simulated one.
      syncTouch: false,
      touchMultiplier: 1.5,
      // In-page `<a href="#section">` links glide instead of jumping. Under
      // reduced motion Lenis never exists and the browser's own jump remains.
      anchors: {
        duration: 1.2,
        easing: (t: number) => 1 - Math.pow(1 - t, 4),
      },
    });

    lenisRef.current = instance;
    setLenis(instance);

    // One RAF loop for the whole site: GSAP drives Lenis, Lenis updates
    // ScrollTrigger. Two independent loops would beat against each other.
    instance.on('scroll', ScrollTrigger.update);

    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      instance.destroy();
      lenisRef.current = null;
      setLenis(null);
    };
  }, [motionOK]);

  // A new route means new content and new geometry. Jump to the top without
  // animating, then let every trigger re-measure once the page has painted.
  //
  // A deep link is the exception: `/#menu` should land on the menu, so the
  // fragment wins over the reset. Without this the browser's own hash scroll
  // happens first and is immediately undone.
  useEffect(() => {
    const hash = window.location.hash;
    const target = hash.length > 1 ? document.querySelector<HTMLElement>(hash) : null;

    if (target) {
      const top = target.getBoundingClientRect().top + window.scrollY;
      lenisRef.current?.scrollTo(top, { immediate: true, force: true });
      window.scrollTo(0, top);
    } else {
      lenisRef.current?.scrollTo(0, { immediate: true, force: true });
      window.scrollTo(0, 0);
    }

    const frame = requestAnimationFrame(() => {
      lenisRef.current?.resize();
      ScrollTrigger.refresh();
    });

    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  const scrollTo = useCallback<ScrollTo>((target, options) => {
    const offset = options?.offset ?? 0;

    if (lenisRef.current) {
      lenisRef.current.scrollTo(target, {
        offset,
        duration: 1.05,
        easing: (t: number) => 1 - Math.pow(1 - t, 4),
      });
      return;
    }

    // Reduced-motion / pre-init fallback.
    if (typeof target === 'number') {
      window.scrollTo({ top: target + offset });
      return;
    }

    const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
    if (el) {
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset });
    }
  }, []);

  const stop = useCallback(() => {
    lenisRef.current?.stop();
    document.documentElement.classList.add('lenis-stopped');
    document.body.style.overflow = 'hidden';
  }, []);

  const start = useCallback(() => {
    lenisRef.current?.start();
    document.documentElement.classList.remove('lenis-stopped');
    document.body.style.overflow = '';
  }, []);

  const value = useMemo<SmoothScrollValue>(
    () => ({ lenis, scrollTo, stop, start }),
    [lenis, scrollTo, stop, start]
  );

  return <SmoothScrollContext.Provider value={value}>{children}</SmoothScrollContext.Provider>;
}
