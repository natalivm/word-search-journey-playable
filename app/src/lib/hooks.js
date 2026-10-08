/** Shared hooks. */

import { useEffect, useRef, useState } from "react";
import { state } from "./store.js";

const prefersReduced = () =>
  state.settings.reduceMotion ||
  Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

/**
 * Count from zero up to `target`, easing out.
 *
 * Reward numbers that tick up read as earned; the same number appearing at
 * once reads as a label. Jumps straight to the target under reduced motion.
 */
export function useCountUp(target, { duration = 800, delay = 0 } = {}) {
  const [value, setValue] = useState(target);

  useEffect(() => {
    if (!target || prefersReduced()) {
      // Async so this never runs synchronously inside the effect body.
      const id = setTimeout(() => setValue(target), 0);
      return () => clearTimeout(id);
    }

    let frame = 0;
    let startedAt = 0;

    const start = setTimeout(() => {
      const step = (now) => {
        if (!startedAt) startedAt = now;
        const p = Math.min(1, (now - startedAt) / duration);
        setValue(Math.round(target * (1 - (1 - p) ** 3)));
        if (p < 1) frame = requestAnimationFrame(step);
      };
      setValue(0);
      frame = requestAnimationFrame(step);
    }, delay);

    return () => {
      clearTimeout(start);
      cancelAnimationFrame(frame);
    };
  }, [target, duration, delay]);

  return value;
}

/**
 * Run `fn` when a screen stops being the active one.
 *
 * Screens stay mounted once visited, so unmount cleanup is the wrong hook for
 * "the player left this screen" — it only fires on a remount (a level
 * restart), never on navigation. This is the signal that actually fires.
 */
export function useOnDeactivate(active, fn) {
  const latest = useRef(fn);

  useEffect(() => {
    latest.current = fn;
  });

  const wasActive = useRef(active);
  useEffect(() => {
    if (wasActive.current && !active) latest.current();
    wasActive.current = active;
  }, [active]);
}
