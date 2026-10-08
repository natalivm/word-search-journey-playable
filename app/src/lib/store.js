/**
 * Player state: profile, settings, progress, stats.
 *
 * Everything lives in one localStorage key under a schema version so a future
 * format change can migrate instead of wiping someone's journey. Writes are
 * debounced because the play screen touches stats on every found word.
 */

import { useSyncExternalStore } from "react";
import { TOTAL_LEVELS, LEVELS_PER_CHAPTER, todayKey } from "./levels.js";
import { POOL_LEVELS, POOL_PRIZE_COINS, POOL_PRIZE_XP } from "./pool.js";

const KEY = "wsj.save";
const VERSION = 1;

export const AVATARS = [
  "🧭", "⛵", "🦜", "🐬", "🦊", "🌵", "🚀", "🐧",
  "🦉", "🐙", "🍉", "🌴", "🐢", "🦩", "🏔️", "🎒"
];

export const RANKS = [
  { at: 1, title: "Day Tripper" },
  { at: 4, title: "Trail Walker" },
  { at: 8, title: "Pathfinder" },
  { at: 13, title: "Navigator" },
  { at: 19, title: "Explorer" },
  { at: 26, title: "Cartographer" },
  { at: 34, title: "Globetrotter" },
  { at: 45, title: "Word Voyager" }
];

function defaults() {
  return {
    version: VERSION,
    profile: {
      name: "Traveller",
      avatar: "🧭",
      xp: 0,
      coins: 120,
      createdAt: Date.now()
    },
    settings: {
      sound: true,
      music: false,
      haptics: true,
      theme: "auto", // auto | light | dark
      cvd: false, // colour-blind friendly word colours
      contrast: false,
      reduceMotion: false,
      showTimer: true,
      beginnerHints: true // pulse the first letters of the next word
    },
    // levelNumber -> { stars, bestMs, hints, plays }
    progress: {},
    stats: {
      levelsCompleted: 0,
      wordsFound: 0,
      hintsUsed: 0,
      coinsEarned: 0,
      perfectLevels: 0,
      flawlessLevels: 0,
      bestMs: 0,
      totalMs: 0,
      fastestWordMs: 0
    },
    daily: { lastDate: "", streak: 0, best: 0, history: {} },
    // Pool Party event. Ring number -> { stars, bestMs, hints, plays, flawless },
    // and the moment the grand prize was claimed (0 until it is).
    pool: { progress: {}, trophyAt: 0 },
    achievements: {}, // id -> unlockedAt
    meta: { lastPlayed: 0, launches: 0, seenTutorial: false }
  };
}

/** Recursively fill in anything a saved file is missing. */
function merge(base, saved) {
  if (!saved || typeof saved !== "object") return base;
  const out = Array.isArray(base) ? saved : { ...base };
  for (const [k, v] of Object.entries(saved)) {
    if (v && typeof v === "object" && !Array.isArray(v) && base[k] && typeof base[k] === "object") {
      out[k] = merge(base[k], v);
    } else if (v !== undefined) {
      out[k] = v;
    }
  }
  return out;
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw);
    if (parsed.version !== VERSION) {
      // No older versions exist yet; keep what we can and move on.
      return merge(defaults(), { ...parsed, version: VERSION });
    }
    return merge(defaults(), parsed);
  } catch {
    // Private mode, quota, or a corrupt file — play on with a fresh slate.
    return defaults();
  }
}

export const state = read();

const listeners = new Set();
let writeTimer = 0;
let version = 0;

/** Subscribe to any state change. Returns an unsubscribe function. */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function flush() {
  writeTimer = 0;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Out of quota or blocked. The session still works, it just won't persist.
  }
}

/** Persist (debounced) and notify subscribers. */
export function commit() {
  version += 1;
  listeners.forEach((fn) => fn(state));
  if (writeTimer) return;
  writeTimer = setTimeout(flush, 180);
}

/** Write immediately — used when the tab is being hidden or closed. */
export function commitNow() {
  if (writeTimer) clearTimeout(writeTimer);
  flush();
}

/* ---------------------------------------------------------------------- */
/* Derived values                                                          */
/* ---------------------------------------------------------------------- */

/** XP needed to go from player level n to n+1. */
export const xpForLevel = (n) => 80 + (n - 1) * 45;

/** Current player level and progress toward the next one. */
export function playerLevel() {
  let level = 1;
  let remaining = state.profile.xp;
  while (remaining >= xpForLevel(level) && level < 99) {
    remaining -= xpForLevel(level);
    level += 1;
  }
  return { level, into: remaining, need: xpForLevel(level) };
}

export function rankTitle(level = playerLevel().level) {
  let title = RANKS[0].title;
  for (const rank of RANKS) if (level >= rank.at) title = rank.title;
  return title;
}

/** Highest level number the player may enter (one past their last finish). */
export function unlockedThrough() {
  let highest = 0;
  for (const key of Object.keys(state.progress)) {
    const n = Number(key);
    if (Number.isFinite(n) && state.progress[key]?.stars > 0 && n > highest) highest = n;
  }
  return Math.min(TOTAL_LEVELS, highest + 1);
}

export const isUnlocked = (n) => n <= unlockedThrough();

/** Where the "Play" button on the home screen should take you. */
export function nextLevelNumber() {
  for (let n = 1; n <= TOTAL_LEVELS; n += 1) {
    if (!state.progress[n]?.stars) return n;
  }
  return TOTAL_LEVELS;
}

export const starsEarned = () =>
  Object.values(state.progress).reduce((sum, p) => sum + (p?.stars || 0), 0);

export const starsPossible = () => TOTAL_LEVELS * 3;

/** Stars earned in one chapter, and how many are on offer. */
export function chapterProgress(chapterIndex) {
  const first = chapterIndex * LEVELS_PER_CHAPTER + 1;
  let stars = 0;
  for (let i = 0; i < LEVELS_PER_CHAPTER; i += 1) {
    stars += state.progress[first + i]?.stars || 0;
  }
  return { stars, maxStars: LEVELS_PER_CHAPTER * 3 };
}

export const dailyDone = () => state.daily.lastDate === todayKey();

/* -- Pool Party ---------------------------------------------------------- */

/** Rings finished at least once. */
export const poolRingsCleared = () =>
  Object.values(state.pool.progress).filter((p) => p?.stars > 0).length;

export const poolStars = () =>
  Object.values(state.pool.progress).reduce((sum, p) => sum + (p?.stars || 0), 0);

export const poolStarsPossible = () => POOL_LEVELS * 3;

/**
 * Highest ring the player may enter. The event is strictly sequential — the
 * point of a challenge ladder is that you cannot skip the rung you are stuck
 * on — so this is the first unfinished ring.
 */
export function poolUnlockedThrough() {
  let n = 1;
  while (n <= POOL_LEVELS && state.pool.progress[n]?.stars > 0) n += 1;
  return Math.min(POOL_LEVELS, n);
}

export const isPoolUnlocked = (n) => n <= poolUnlockedThrough();
export const poolAllCleared = () => poolRingsCleared() >= POOL_LEVELS;
export const poolTrophyWon = () => Boolean(state.pool.trophyAt);

/* ---------------------------------------------------------------------- */
/* Mutations                                                               */
/* ---------------------------------------------------------------------- */

export function addCoins(n) {
  state.profile.coins = Math.max(0, state.profile.coins + n);
  if (n > 0) state.stats.coinsEarned += n;
  commit();
}

export function spendCoins(n) {
  if (state.profile.coins < n) return false;
  state.profile.coins -= n;
  commit();
  return true;
}

export function addXp(n) {
  const before = playerLevel().level;
  state.profile.xp += n;
  commit();
  const after = playerLevel();
  return { leveledUp: after.level > before, level: after.level };
}

export function setSetting(key, value) {
  state.settings[key] = value;
  commit();
}

/** Record a finished level. Returns whether it beat the previous result. */
export function recordLevel(n, { stars, ms, hints, flawless }) {
  const prev = state.progress[n];
  const isFirst = !prev?.stars;
  const wasFlawless = Boolean(prev?.flawless);

  state.progress[n] = {
    stars: Math.max(stars, prev?.stars || 0),
    bestMs: prev?.bestMs ? Math.min(prev.bestMs, ms) : ms,
    hints: (prev?.hints || 0) + hints,
    plays: (prev?.plays || 0) + 1,
    flawless: wasFlawless || flawless
  };

  if (isFirst) state.stats.levelsCompleted += 1;
  if (stars === 3 && (prev?.stars || 0) < 3) state.stats.perfectLevels += 1;
  // Counts distinct levels, not plays — otherwise replaying one easy level
  // five times unlocks a badge that asks for five levels.
  if (flawless && !wasFlawless) state.stats.flawlessLevels += 1;

  state.stats.totalMs += ms;
  if (!state.stats.bestMs || ms < state.stats.bestMs) state.stats.bestMs = ms;
  state.meta.lastPlayed = Date.now();

  commit();
  return { isFirst, improved: isFirst || stars > (prev?.stars || 0) };
}

/** Record today's daily puzzle and roll the streak forward. */
export function recordDaily(dateKey, { stars, ms }) {
  if (state.daily.lastDate === dateKey) return { already: true, streak: state.daily.streak };

  const yesterday = new Date(`${dateKey}T00:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = todayKey(yesterday);

  state.daily.streak = state.daily.lastDate === yKey ? state.daily.streak + 1 : 1;
  state.daily.lastDate = dateKey;
  state.daily.best = Math.max(state.daily.best, state.daily.streak);
  state.daily.history[dateKey] = { stars, ms };
  commit();

  return { already: false, streak: state.daily.streak };
}

/**
 * Record a finished ring.
 *
 * Deliberately kept out of `stats.levelsCompleted` and the perfect/flawless
 * counters: those drive the journey achievements, and ten event rings should
 * not hand somebody "finish all 80 levels". The honest totals — words, coins,
 * time — still count, because the player really did play them.
 */
export function recordPoolRing(n, { stars, ms, hints, flawless }) {
  const prev = state.pool.progress[n];
  const isFirst = !prev?.stars;

  state.pool.progress[n] = {
    stars: Math.max(stars, prev?.stars || 0),
    bestMs: prev?.bestMs ? Math.min(prev.bestMs, ms) : ms,
    hints: (prev?.hints || 0) + hints,
    plays: (prev?.plays || 0) + 1,
    flawless: Boolean(prev?.flawless) || flawless
  };

  state.stats.totalMs += ms;
  if (!state.stats.bestMs || ms < state.stats.bestMs) state.stats.bestMs = ms;
  state.meta.lastPlayed = Date.now();

  commit();
  return { isFirst, improved: isFirst || stars > (prev?.stars || 0) };
}

/**
 * Claim the Pool Party grand prize. Idempotent: the celebration replays if
 * the player closes the app on it, so the payout must not.
 *
 * @returns {{coins:number, xp:number, leveledUp:boolean}|null} null if already claimed.
 */
export function claimPoolTrophy() {
  if (state.pool.trophyAt || !poolAllCleared()) return null;

  const before = playerLevel().level;
  state.pool.trophyAt = Date.now();
  state.profile.coins += POOL_PRIZE_COINS;
  state.stats.coinsEarned += POOL_PRIZE_COINS;
  state.profile.xp += POOL_PRIZE_XP;
  commit();

  return {
    coins: POOL_PRIZE_COINS,
    xp: POOL_PRIZE_XP,
    leveledUp: playerLevel().level > before
  };
}

export function countWordFound(ms) {
  state.stats.wordsFound += 1;
  if (ms > 0 && (!state.stats.fastestWordMs || ms < state.stats.fastestWordMs)) {
    state.stats.fastestWordMs = ms;
  }
  commit();
}

export function recordHintUsed() {
  state.stats.hintsUsed += 1;
  commit();
}

/** Wipe progress but keep the player's settings — they chose those on purpose. */
export function resetProgress() {
  const keepSettings = { ...state.settings };
  const fresh = defaults();
  Object.assign(state, fresh, { settings: keepSettings });
  commit();
  commitNow();
}

/* ---------------------------------------------------------------------- */
/* React binding                                                           */
/* ---------------------------------------------------------------------- */

/** Bumped on every commit, for components that just need "something changed". */
export function useStoreVersion() {
  return useSyncExternalStore(subscribe, () => version, () => version);
}
