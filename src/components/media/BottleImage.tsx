import Image from 'next/image';
import type { Flavour } from '@/lib/flavours';
import { cn } from '@/lib/utils';

type BottleImageProps = {
  flavour: Flavour;
  /** Only for an above-the-fold instance; everything else lazy-loads. */
  priority?: boolean;
  /** Frame classes. The frame must set a size and stay at or below MAX_FRAME_ASPECT. */
  className?: string;
  imageClassName?: string;
  alt?: string;
};

/**
 * A flavour's photograph, cropped to its bottle.
 *
 * The photographs are full frames with type baked in at both sides, so the
 * crop is the whole job: `object-cover` inside a portrait frame, aimed with
 * the measured focus point. Keep frames at 4:5 or narrower.
 *
 * `sizes` is deliberately not a prop. A cover crop renders the photograph far
 * wider than its frame — a 3:4 frame shows a 16:9 picture at about 2.4× the
 * frame's width — so a `sizes` written from the frame made browsers download a
 * file under half the resolution actually on screen, and every bottle went
 * soft. Asking for the source width always selects the full-resolution file,
 * which next/image still re-encodes to AVIF/WebP, so it stays light.
 */
export function BottleImage({
  flavour,
  priority = false,
  className,
  imageClassName,
  alt,
}: BottleImageProps) {
  const { image } = flavour;

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <Image
        src={image.src}
        alt={alt ?? `${flavour.name} protein shake`}
        fill
        sizes={`${image.width}px`}
        priority={priority}
        quality={90}
        placeholder="blur"
        blurDataURL={image.blurDataURL}
        className={cn('object-cover', imageClassName)}
        style={{ objectPosition: image.focus }}
      />
    </div>
  );
}
