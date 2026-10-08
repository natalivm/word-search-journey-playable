/** Shared hooks. */

import { useEffect, useState } from "react";
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
