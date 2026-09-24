/**
 * The hand-off from the loading screen to the page.
 *
 * The hero and the nav have entrances of their own, and playing them behind an
 * opaque loader would waste them — by the time the curtain lifted they would
 * already be over. They register here instead and start the moment the loader
 * begins to leave.
 *
 * Deliberately a plain module rather than context: it is read inside GSAP
 * setup callbacks, where a re-render is exactly what we do not want.
 */

let done = false;
const waiting = new Set<() => void>();

/** Called by the loader as its curtain starts to lift. */
export function markLoadingDone() {
  if (done) return;
  done = true;
  for (const run of waiting) run();
  waiting.clear();
}

/**
 * Run `callback` once the loader has finished — immediately if it already has.
 * Returns an unsubscribe function.
 */
export function whenLoadingDone(callback: () => void): () => void {
  if (done) {
    callback();
    return () => {};
  }
  waiting.add(callback);
  return () => waiting.delete(callback);
}
