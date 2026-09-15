'use client';

/**
 * One pointer listener for the entire site.
 *
 * Before this existed, every magnetic button, every tilting card and every
 * leaning panel registered its *own* `pointermove` listener and called
 * `getBoundingClientRect()` inside it. On the home page that was eleven
 * listeners and eleven forced layouts — and a 1000Hz mouse fires `pointermove`
 * up to sixteen times per frame, so the browser was recalculating layout well
 * over a hundred times for a single frame of cursor movement. That is the
 * whole of the "laggy" feeling.
 *
 * The fix is the standard read/write split:
 *
 *   1. `pointermove` does nothing but record two numbers and request a frame.
 *   2. Once per frame, every subscriber `measure()`s — all reads together.
 *   3. Then every subscriber `apply()`s — all writes together.
 *
 * Layout is therefore flushed at most **once per frame**, no matter how many
 * subscribers there are or how fast the mouse is polled.
 */

export type PointerSubscriber = {
  /** Read phase. Cache rects here — never in `apply`. */
  measure?: () => void;
  /** Write phase. Viewport coordinates of the pointer. */
  apply: (x: number, y: number) => void;
  /** The pointer left the window entirely. */
  reset?: () => void;
};

const subscribers = new Set<PointerSubscriber>();

let pointerX = 0;
let pointerY = 0;
let queued = false;
let frame = 0;
let listening = false;

function flush() {
  queued = false;

  // Reads first…
  for (const subscriber of subscribers) subscriber.measure?.();
  // …then writes. Never interleave the two.
  for (const subscriber of subscribers) subscriber.apply(pointerX, pointerY);
}

function onMove(event: PointerEvent) {
  // Touch generates pointermove too, and a magnetic pull under a fingertip is
  // just a jump the user did not ask for.
  if (event.pointerType === 'touch') return;

  pointerX = event.clientX;
  pointerY = event.clientY;

  if (queued) return;
  queued = true;
  frame = requestAnimationFrame(flush);
}

function onLeave() {
  for (const subscriber of subscribers) subscriber.reset?.();
}

function start() {
  if (listening) return;
  listening = true;
  window.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerleave', onLeave);
}

function stop() {
  if (!listening) return;
  listening = false;
  window.removeEventListener('pointermove', onMove);
  document.removeEventListener('pointerleave', onLeave);
  cancelAnimationFrame(frame);
  queued = false;
}

/** Returns an unsubscribe function. The listener lives only while used. */
export function subscribePointer(subscriber: PointerSubscriber): () => void {
  subscribers.add(subscriber);
  start();

  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0) stop();
  };
}
