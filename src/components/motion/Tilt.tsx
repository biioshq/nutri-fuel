'use client';

import { useRef, type ReactNode } from 'react';
import { gsap } from '@/lib/gsap';
import { subscribePointer } from '@/lib/pointer';
import { useIsoLayoutEffect } from '@/hooks/useIsoLayoutEffect';
import { useHasFinePointer, useMotionOK } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

type TiltProps = {
  children: ReactNode;
  className?: string;
  /** Maximum rotation on either axis, in degrees. */
  max?: number;
  /** Perspective applied to the wrapper, in pixels. */
  perspective?: number;
};

/**
 * Pointer-driven 3D lean.
 *
 * While the pointer is over the element, the inner plane rotates toward it
 * and two custom properties — `--mx` and `--my`, as percentages — are
 * published on the wrapper so a child can position a spotlight or glow with
 * plain CSS. It settles flat on exit.
 *
 * Like `Magnetic`, it has no listener of its own: rect reads are batched with
 * every other pointer consumer through the site-wide store.
 */
export function Tilt({ children, className, max = 6, perspective = 1200 }: TiltProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const planeRef = useRef<HTMLDivElement>(null);

  const finePointer = useHasFinePointer();
  const motionOK = useMotionOK();
  const enabled = finePointer && motionOK;

  useIsoLayoutEffect(() => {
    if (!enabled) return;

    const shell = shellRef.current;
    const plane = planeRef.current;
    if (!shell || !plane) return;

    const turnX = gsap.quickTo(plane, 'rotationX', { duration: 0.7, ease: 'power3.out' });
    const turnY = gsap.quickTo(plane, 'rotationY', { duration: 0.7, ease: 'power3.out' });

    let rect: DOMRect | null = null;
    let inside = false;

    const release = () => {
      if (!inside) return;
      inside = false;
      turnX(0);
      turnY(0);
    };

    return subscribePointer({
      measure: () => {
        rect = shell.getBoundingClientRect();
      },
      apply: (x, y) => {
        if (!rect) return;

        const over = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        if (!over) {
          release();
          return;
        }

        inside = true;
        const nx = (x - rect.left) / rect.width; // 0 → 1
        const ny = (y - rect.top) / rect.height;

        turnY((nx - 0.5) * 2 * max);
        turnX(-(ny - 0.5) * 2 * max);
        shell.style.setProperty('--mx', `${(nx * 100).toFixed(1)}%`);
        shell.style.setProperty('--my', `${(ny * 100).toFixed(1)}%`);
      },
      reset: release,
    });
  }, [enabled, max]);

  return (
    <div ref={shellRef} className={cn('relative', className)} style={{ perspective }}>
      <div ref={planeRef} className="h-full w-full" style={{ transformStyle: 'preserve-3d' }}>
        {children}
      </div>
    </div>
  );
}
