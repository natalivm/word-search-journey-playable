/**
 * Transient UI: toasts, the modal sheet, confetti and the live region.
 *
 * Kept as a small external store rather than React context so any module can
 * raise one without being a component or being passed a callback — the play
 * screen fires toasts from inside pointer handlers and timers.
 */

import { celebrate } from "./particles.js";

let snapshot = {
  toasts: [],
  sheet: null,
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
/* Celebration                                                             */
/* ---------------------------------------------------------------------- */

/** Kept here so call sites don't need to know which engine draws it. */
export function confetti(count = 90) {
  celebrate(count);
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
