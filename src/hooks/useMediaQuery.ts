'use client';

import { useSyncExternalStore } from 'react';

/**
 * One MediaQueryList per distinct query, for the life of the page, behind
 * stable callback identities.
 *
 * The previous version built a fresh `subscribe` closure on every render and
 * allocated a new MediaQueryList inside every `getSnapshot` call — so React
 * tore down and re-established a listener on each of the twenty-odd components
 * that read one of these, on every single render. Caching by query string
 * makes all of that free.
 */
const lists = new Map<string, MediaQueryList>();
const subscribers = new Map<string, (onChange: () => void) => () => void>();
const snapshots = new Map<string, () => boolean>();

function listFor(query: string): MediaQueryList {
  let list = lists.get(query);
  if (!list) {
    list = window.matchMedia(query);
    lists.set(query, list);
  }
  return list;
}

function subscribeTo(query: string) {
  let subscribe = subscribers.get(query);
  if (!subscribe) {
    subscribe = (onChange: () => void) => {
      const list = listFor(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    };
    subscribers.set(query, subscribe);
  }
  return subscribe;
}

function snapshotOf(query: string) {
  let snapshot = snapshots.get(query);
  if (!snapshot) {
    snapshot = () => listFor(query).matches;
    snapshots.set(query, snapshot);
  }
  return snapshot;
}

/** The server has no viewport, so every query is false there. */
const serverSnapshot = () => false;

/**
 * SSR-safe media query. Returns `false` on the server so the first client
 * paint matches the server HTML, then settles on the real value.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(subscribeTo(query), snapshotOf(query), serverSnapshot);
}

/** Motion is allowed unless the user has explicitly asked for less of it. */
export function useMotionOK(): boolean {
  return !useMediaQuery('(prefers-reduced-motion: reduce)');
}

/** Pointer-based devices get cursor effects and hover choreography. */
export function useHasFinePointer(): boolean {
  return useMediaQuery('(hover: hover) and (pointer: fine)');
}
