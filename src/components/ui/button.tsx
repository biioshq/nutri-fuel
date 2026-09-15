'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * The house button.
 *
 * Fully rounded, softly shadowed, and lit rather than filled: a wash rises
 * from the bottom edge on hover while the label stays exactly where it was.
 * The acknowledgement is quick (a control must answer the cursor inside
 * ~150ms); the wash itself takes a little longer, so it reads as light.
 */
const buttonVariants = cva(
  [
    'group/btn relative isolate inline-flex items-center justify-center gap-2.5 overflow-hidden',
    'rounded-full font-sans font-medium uppercase whitespace-nowrap',
    'transition-[color,border-color,box-shadow,transform,background-color] duration-200 ease-luxe',
    'touch-manipulation active:scale-[0.98] active:duration-[80ms]',
    'disabled:pointer-events-none disabled:opacity-40',
    'before:absolute before:inset-0 before:-z-10 before:origin-bottom before:scale-y-0',
    'before:transition-transform before:duration-[380ms] before:ease-luxe',
    'hover:before:scale-y-100 focus-visible:before:scale-y-100',
  ],
  {
    variants: {
      variant: {
        /** Ink pill — the one primary action in any given view. */
        primary: [
          'bg-ink text-canvas shadow-pill',
          'before:bg-linear-to-t before:from-cocoa-deep before:to-cocoa',
          'hover:shadow-[0_2px_4px_rgb(42_27_19/0.08),0_22px_44px_-18px_rgb(107_68_48/0.65)]',
        ],
        /** White pill — the primary action on dark grounds and video. */
        light: [
          'bg-canvas text-ink shadow-pill',
          'before:bg-linear-to-t before:from-beige before:to-cream',
          'hover:shadow-[0_2px_4px_rgb(0_0_0/0.08),0_22px_48px_-18px_rgb(255_255_255/0.45)]',
        ],
        /** Smoked glass — the secondary action on dark grounds and video. */
        glass: [
          'border border-white/35 bg-white/10 text-white backdrop-blur-md',
          'before:bg-canvas',
          'hover:border-white hover:text-ink',
        ],
        /** Hairline pill on white — the quiet, everywhere action. */
        outline: [
          'border border-hair bg-canvas/80 text-ink shadow-soft',
          'before:bg-linear-to-t before:from-cream before:to-canvas',
          'hover:border-sand hover:shadow-float',
        ],
        ghost: ['text-ink-soft before:bg-cream hover:text-ink'],
      },
      size: {
        sm: 'h-10 px-5 text-micro',
        md: 'h-12 px-7 text-micro',
        lg: 'h-14 px-9 text-label tracking-[0.18em]',
        xl: 'h-16 px-11 text-label tracking-[0.18em]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export type ButtonProps = React.ComponentPropsWithoutRef<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, ...props },
  ref
) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
});

export { buttonVariants };
