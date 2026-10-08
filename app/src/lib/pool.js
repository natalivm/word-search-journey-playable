/**
 * Pool Party — a ten-ring challenge event.
 *
 * The journey teaches; this is the exam. Every ring uses all eight
 * directions, draws from a pool with nothing shorter than five letters, runs
 * on a board at least 11 wide and carries a par time that assumes you already
 * know what you are doing. There is no idle nudge either — `assist: false`
 * turns off the beginner pulse the journey leans on.
 *
 * Rings are descriptors of exactly the shape `levels.js` produces, so the
 * generator, the play screen and the verifier need no special case beyond the
 * `isPool` flag. Difficulty is a pure function of the ring number, like the
 * rest of the game, so the curve is retuned in one place.
 */

import { DIRS } from "./levels.js";

export const POOL_LEVELS = 10;

/** The grand prize, paid once when the tenth ring falls. */
export const POOL_PRIZE_COINS = 1000;
export const POOL_PRIZE_XP = 400;

/** Nothing under five letters: the short words are where easy boards hide. */
const MIN_WORD_LENGTH = 5;

/**
 * The event's own word pack. Everything is 5-10 letters, so a word never
 * fails to fit even on the narrowest ring board.
 */
export const POOL_CHAPTER = {
  id: "pool",
  name: "Pool Party",
  icon: "🛟",
  blurb: "Ten rings. No shallow end.",
  words: [
    "SPLASH", "FLOAT", "TOWEL", "SUNSCREEN", "GOGGLES", "SNORKEL", "FLIPPERS",
    "LOUNGER", "PARASOL", "LEMONADE", "POPSICLE", "SANDALS", "CANNONBALL",
    "BACKSTROKE", "BUTTERFLY", "FREESTYLE", "DIVING", "PADDLE", "RIPPLE",
    "BUBBLES", "CHLORINE", "SHALLOW", "POOLSIDE", "SUNHAT", "TRUNKS",
    "INFLATABLE", "BEACHBALL", "WATERSLIDE", "SPRINKLER", "FOUNTAIN",
    "SUMMER", "HEATWAVE", "SUNSHINE", "SHIMMER", "LAGOON", "MERMAID",
    "DOLPHIN", "SEAHORSE", "FLAMINGO", "DUCKLING", "ICECREAM", "SMOOTHIE",
    "COCONUT", "PINEAPPLE", "WATERMELON", "UMBRELLA", "HAMMOCK", "CABANA",
    "JACUZZI", "LADDER", "SWIMSUIT", "POOLPARTY", "DEEPEND", "WHISTLE",
    "LIFEGUARD", "SUNBURN", "SEASHELL", "PELICAN", "STARFISH", "SANDCASTLE"
  ]
};

/**
 * One float per ring, bottom to top. The last is gold: the board can see the
 * prize coming from the moment they open the map.
 */
export const RINGS = [
  { color: "#ffd166", shade: "#dca827", segmented: false },
  { color: "#ff8fb1", shade: "#e06287", segmented: true },
  { color: "#6fd6a0", shade: "#3fae78", segmented: false },
  { color: "#5bb8ff", shade: "#2f8ad6", segmented: true },
  { color: "#b28dff", shade: "#8460d6", segmented: false },
  { color: "#ffa45b", shade: "#d97a2f", segmented: true },
  { color: "#ff6b6b", shade: "#d64545", segmented: false },
  { color: "#4fd1c5", shade: "#23a79b", segmented: true },
  { color: "#9be36b", shade: "#6bb73e", segmented: false },
  { color: "#ffc93c", shade: "#e09a0b", segmented: true }
];

/** Board edge length. Bigger boards mean more to scan, so the ramp is gentle. */
function sizeFor(index) {
  if (index <= 3) return 11;
  if (index <= 7) return 12;
  return 13;
}

/**
 * Seconds to beat for three stars. Roughly two thirds of the journey's
 * allowance for the same shape of board — three stars here is a real result.
 */
const parSecondsFor = (size, wordCount) => Math.round(wordCount * (7 + size * 1.2));

/**
 * Build the descriptor for one ring.
 * @param {number} index 1-based, 1..POOL_LEVELS.
 */
export function poolLevel(index) {
  const i = Math.min(Math.max(1, Math.round(index)), POOL_LEVELS);
  const size = sizeFor(i);
  const wordCount = 9;

  return {
    id: `P${i}`,
    // The journey numbers levels; the event counts rings. `n` stays 0 so a
    // pool level can never be mistaken for a journey level by number.
    n: 0,
    poolIndex: i,
    isPool: true,
    isFinalRing: i === POOL_LEVELS,
    ring: RINGS[i - 1],
    chapter: POOL_CHAPTER,
    chapterIndex: 0,
    indexInChapter: i - 1,
    title: `Ring ${i}`,
    size,
    wordCount,
    minWordLength: MIN_WORD_LENGTH,
    directions: Object.keys(DIRS),
    parSeconds: parSecondsFor(size, wordCount),
    seed: `wsj-pool-v1-${i}`,
    assist: false
  };
}

/** Every ring, bottom to top — for the event map and the verifier. */
export const poolLevels = () =>
  Array.from({ length: POOL_LEVELS }, (_, i) => poolLevel(i + 1));

/** Pays better than the journey, because it asks for more. */
export function poolRewardFor(level, stars) {
  return {
    coins: 30 + stars * 10 + (level.isFinalRing ? 60 : 0),
    xp: 45 + stars * 15 + (level.isFinalRing ? 60 : 0)
  };
}

/**
 * How far along the trail a ring sits, -1 (hard left) to 1 (hard right).
 *
 * A sine rather than a strict zig-zag: the floats drift into an S instead of
 * snapping between two columns, which is what a line of rings on water does.
 */
export const leanFor = (index) => Math.round(Math.sin(index * 1.15) * 100) / 100;
