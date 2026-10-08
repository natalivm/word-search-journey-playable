/**
 * The journey: 10 chapters x 8 levels, plus a rotating daily puzzle.
 *
 * Levels are described, not authored — difficulty is a pure function of the
 * global level number, so the curve is easy to retune in one place.
 */

import { CHAPTERS } from "./words.js";

export const LEVELS_PER_CHAPTER = 8;
export const TOTAL_LEVELS = CHAPTERS.length * LEVELS_PER_CHAPTER;

/** All eight directions, as [rowStep, colStep]. */
export const DIRS = {
  E: [0, 1],
  S: [1, 0],
  W: [0, -1],
  N: [-1, 0],
  SE: [1, 1],
  SW: [1, -1],
  NE: [-1, 1],
  NW: [-1, -1]
};

/**
 * Which directions are in play at a given point in the journey.
 * The ramp is deliberate: left-to-right only for the first few levels so the
 * drag gesture is learned before backwards and diagonal words appear.
 */
function directionsFor(n) {
  if (n <= 3) return ["E", "S"];
  if (n <= 8) return ["E", "S", "SE"];
  if (n <= 16) return ["E", "S", "SE", "W", "N"];
  if (n <= 32) return ["E", "S", "SE", "W", "N", "NE", "SW"];
  return Object.keys(DIRS);
}

/** Grid edge length for level `n` (1-based across the whole journey). */
function sizeFor(n) {
  if (n <= 8) return 7;
  if (n <= 24) return 8;
  if (n <= 40) return 9;
  if (n <= 56) return 10;
  if (n <= 72) return 11;
  return 12;
}

/** How many words to hide. */
function wordCountFor(n) {
  return Math.min(9, 4 + Math.floor((n - 1) / 10));
}

/**
 * Seconds to beat for a three-star finish. Scales with how much board there
 * is to scan and how many words are hidden in it.
 */
function parSecondsFor(size, wordCount) {
  return Math.round(wordCount * (10 + size * 1.6));
}

/**
 * Build the descriptor for one level.
 * @param {number} n 1-based level number across the whole journey.
 */
export function levelAt(n) {
  const clamped = Math.min(Math.max(1, Math.round(n)), TOTAL_LEVELS);
  const chapterIndex = Math.floor((clamped - 1) / LEVELS_PER_CHAPTER);
  const chapter = CHAPTERS[chapterIndex];
  const indexInChapter = (clamped - 1) % LEVELS_PER_CHAPTER;
  const size = sizeFor(clamped);
  const wordCount = wordCountFor(clamped);

  return {
    id: `L${clamped}`,
    n: clamped,
    chapter,
    chapterIndex,
    indexInChapter,
    title: `${chapter.name} ${indexInChapter + 1}`,
    size,
    wordCount,
    directions: directionsFor(clamped),
    parSeconds: parSecondsFor(size, wordCount),
    seed: `wsj-v1-${chapter.id}-${clamped}`,
    isChapterFinale: indexInChapter === LEVELS_PER_CHAPTER - 1
  };
}

/** Every level in a chapter, for the map screen. */
export function levelsInChapter(chapterIndex) {
  const first = chapterIndex * LEVELS_PER_CHAPTER + 1;
  return Array.from({ length: LEVELS_PER_CHAPTER }, (_, i) => levelAt(first + i));
}

/** YYYY-MM-DD in the player's own timezone — the daily puzzle's identity. */
export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * The daily puzzle: same for everyone on a given date, always a fixed shape
 * so the leaderboard-free "did you beat it?" comparison stays fair.
 */
export function dailyLevel(requestedKey = todayKey()) {
  // The key reaches us from the URL, so it can be anything. An unparsable
  // date would index CHAPTERS with NaN and take the whole app down on the
  // first property read; fall back to today instead.
  const parsed = Date.parse(`${requestedKey}T00:00:00`);
  const dateKey = Number.isFinite(parsed) ? requestedKey : todayKey();
  const dayIndex = Math.floor(Date.parse(`${dateKey}T00:00:00`) / 86400000);
  const chapter = CHAPTERS[Math.abs(dayIndex) % CHAPTERS.length];

  return {
    id: `D${dateKey}`,
    n: 0,
    chapter,
    chapterIndex: CHAPTERS.indexOf(chapter),
    indexInChapter: 0,
    title: "Daily Puzzle",
    size: 9,
    wordCount: 6,
    directions: ["E", "S", "SE", "W", "N", "NE", "SW"],
    parSeconds: parSecondsFor(9, 6),
    seed: `wsj-daily-${dateKey}`,
    isDaily: true,
    dateKey
  };
}

/** Award 1-3 stars. Three stars means fast *and* unaided. */
export function starsFor(level, { seconds, hintsUsed }) {
  if (hintsUsed === 0 && seconds <= level.parSeconds) return 3;
  if (hintsUsed <= 1 && seconds <= level.parSeconds * 1.75) return 2;
  return 1;
}

/** Coins and XP paid out for a finish. */
export function rewardFor(level, stars) {
  const base = level.isDaily ? 40 : 12 + level.chapterIndex * 2;
  return {
    coins: base + stars * 6 + (level.isChapterFinale ? 25 : 0),
    xp: 20 + stars * 12 + (level.isDaily ? 20 : 0)
  };
}
