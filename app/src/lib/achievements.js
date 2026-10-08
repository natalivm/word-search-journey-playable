/**
 * Achievements.
 *
 * Each one is a pure predicate over state, checked after any event that could
 * satisfy it. `progress` drives the "7 / 25" line on the profile screen so
 * locked badges still read as goals rather than blanks.
 */

import { state, commit, poolRingsCleared } from "./store.js";
import { TOTAL_LEVELS } from "./levels.js";
import { POOL_LEVELS } from "./pool.js";

export const ACHIEVEMENTS = [
  {
    id: "first-find",
    icon: "🌱",
    name: "First Steps",
    desc: "Finish your first level.",
    progress: () => [state.stats.levelsCompleted, 1]
  },
  {
    id: "ten-levels",
    icon: "🥾",
    name: "Word Wanderer",
    desc: "Finish 10 levels.",
    progress: () => [state.stats.levelsCompleted, 10]
  },
  {
    id: "quarter",
    icon: "🧭",
    name: "Trailblazer",
    desc: "Finish 25 levels.",
    progress: () => [state.stats.levelsCompleted, 25]
  },
  {
    id: "half",
    icon: "🗺️",
    name: "Pathfinder",
    desc: "Finish 50 levels.",
    progress: () => [state.stats.levelsCompleted, 50]
  },
  {
    id: "all-levels",
    icon: "👑",
    name: "Journey Master",
    desc: `Finish all ${TOTAL_LEVELS} levels.`,
    progress: () => [state.stats.levelsCompleted, TOTAL_LEVELS]
  },
  {
    id: "perfect-10",
    icon: "⭐",
    name: "Perfectionist",
    desc: "Earn 3 stars on 10 levels.",
    progress: () => [state.stats.perfectLevels, 10]
  },
  {
    id: "perfect-30",
    icon: "🌟",
    name: "Star Collector",
    desc: "Earn 3 stars on 30 levels.",
    progress: () => [state.stats.perfectLevels, 30]
  },
  {
    id: "flawless",
    icon: "🎯",
    name: "Dead Eye",
    desc: "Finish 5 levels with no wrong selections.",
    progress: () => [state.stats.flawlessLevels, 5]
  },
  {
    id: "speed",
    icon: "⚡",
    name: "Speed Reader",
    desc: "Finish any level in under 45 seconds.",
    progress: () => [
      state.stats.bestMs && state.stats.bestMs < 45000 ? 1 : 0,
      1
    ]
  },
  {
    id: "eagle-eye",
    icon: "🦅",
    name: "Eagle Eye",
    desc: "Find 250 words in total.",
    progress: () => [state.stats.wordsFound, 250]
  },
  {
    id: "streak-7",
    icon: "🔥",
    name: "Daily Devotee",
    desc: "Keep a 7-day daily-puzzle streak.",
    progress: () => [state.daily.best, 7]
  },
  {
    id: "pool-champion",
    icon: "🏆",
    name: "Pool Champion",
    desc: `Clear all ${POOL_LEVELS} Pool Party rings.`,
    progress: () => [poolRingsCleared(), POOL_LEVELS]
  },
  {
    id: "rich",
    icon: "💰",
    name: "Coin Hoarder",
    desc: "Earn 1,000 coins in total.",
    progress: () => [state.stats.coinsEarned, 1000]
  }
];

export const isUnlocked = (id) => Boolean(state.achievements[id]);

/**
 * Check every achievement; unlock any newly satisfied one.
 * @returns {object[]} achievements unlocked by this call, for the toast queue.
 */
export function checkAchievements() {
  const fresh = [];

  for (const achievement of ACHIEVEMENTS) {
    if (isUnlocked(achievement.id)) continue;
    const [have, need] = achievement.progress();
    if (have >= need) {
      state.achievements[achievement.id] = Date.now();
      fresh.push(achievement);
    }
  }

  if (fresh.length) commit();
  return fresh;
}

export const unlockedCount = () =>
  ACHIEVEMENTS.filter((a) => isUnlocked(a.id)).length;
