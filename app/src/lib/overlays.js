/**
 * Transient UI: toasts, the modal sheet, confetti and the live region.
 *
 * Kept as a small external store rather than React context so any module can
 * raise one without being a component or being passed a callback — the play
 * screen fires toasts from inside pointer handlers and timers.
 */

import { state as save } from "./store.js";

let snapshot = {
  toasts: [],
  sheet: null,
  confetti: null,
  live: { text: "", seq: 0 }
};

const listeners = new Set();
let nextId = 1;

function emit(patch) {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((fn) => fn());
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const getSnapshot = () => snapshot;

/* ---------------------------------------------------------------------- */
/* Toasts                                                                  */
/* ---------------------------------------------------------------------- */

/** @param {"good"|"bad"|""} kind */
export function toast(text, kind = "") {
  const id = nextId++;
  // Cap the stack: a burst of achievements shouldn't fill the screen.
  const toasts = [...snapshot.toasts, { id, text, kind }].slice(-3);
  emit({ toasts });

  setTimeout(() => {
    emit({ toasts: snapshot.toasts.filter((t) => t.id !== id) });
  }, 2100);
}

/* ---------------------------------------------------------------------- */
/* Sheet                                                                   */
/* ---------------------------------------------------------------------- */

/**
 * @param {{title: string, body?: any, actions?: {label: string, kind?: string, onClick?: Function}[], dismissible?: boolean}} config
 */
export function openSheet(config) {
  emit({ sheet: { dismissible: true, actions: [], ...config } });
}

export function closeSheet() {
  emit({ sheet: null });
}

/* ---------------------------------------------------------------------- */
/* Confetti                                                                */
/* ---------------------------------------------------------------------- */

const COLORS = ["#ff6b6b", "#ffd166", "#18a999", "#2364aa", "#7c5cde", "#ffffff"];

export function confetti(count = 40) {
  if (save.settings.reduceMotion) return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const id = nextId++;
  const pieces = Array.from({ length: count }, (_, i) => ({
    key: i,
    left: `${Math.random() * 100}%`,
    background: COLORS[i % COLORS.length],
    animationDelay: `${Math.random() * 320}ms`,
    animationDuration: `${1000 + Math.random() * 900}ms`,
    transform: `rotate(${Math.random() * 360}deg)`
  }));

  emit({ confetti: { id, pieces } });
  setTimeout(() => {
    if (snapshot.confetti?.id === id) emit({ confetti: null });
  }, 2600);
}

/* ---------------------------------------------------------------------- */
/* Screen-reader announcements                                             */
/* ---------------------------------------------------------------------- */

/**
 * Announce to assistive tech.
 *
 * The sequence number is used as a React key on the live region's contents,
 * so repeating an identical message still replaces the node and gets
 * announced again rather than being treated as unchanged.
 */
export function announce(text) {
  emit({ live: { text, seq: snapshot.live.seq + 1 } });
}
