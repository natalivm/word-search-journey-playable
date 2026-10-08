/**
 * Deterministic pseudo-random numbers.
 *
 * Levels are generated on the fly rather than stored, so the same level id
 * must always produce the same grid — on every device, every session. A
 * seeded generator gives us that for free and keeps the download tiny.
 */

/** Hash an arbitrary string into a 32-bit seed (FNV-1a style avalanche). */
export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, good enough spread for puzzle layout. */
export function makeRng(seed) {
  let a = typeof seed === "string" ? hashSeed(seed) : seed >>> 0;

  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  /** Integer in [0, max). */
  next.int = (max) => Math.floor(next() * max);

  /** Pick one item. */
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];

  /** Copy of `arr` in random order (Fisher-Yates). */
  next.shuffle = (arr) => {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  return next;
}
