/**
 * Word-search grid generation.
 *
 * Placement is a backtracking search: words go in longest-first (the hardest
 * to fit), each one trying its candidate placements in a seeded-random order
 * that favours overlapping an already-placed word. Overlaps are what make a
 * grid feel dense and hand-made instead of like words scattered on noise.
 */

import { makeRng } from "./rng.js";
import { DIRS } from "./levels.js";
import { FILLER_POOL } from "./words.js";

/** Candidate words for a level: right length, de-duplicated, seeded order. */
function pickWords(level, rng) {
  const maxLen = level.size;
  // A level can raise the floor — the Pool Party rings do, because short
  // words are where an otherwise hard board gets its easy finds.
  const minLen = level.minWordLength ?? (level.size <= 7 ? 3 : 4);

  const pool = rng.shuffle(
    [...new Set(level.chapter.words)].filter(
      (w) => w.length >= minLen && w.length <= maxLen
    )
  );

  // Longest first: a 9-letter word has very few homes on a 9x9 board, so it
  // must claim its spot before the short words clutter the grid.
  return pool.slice(0, Math.min(level.wordCount + 6, pool.length))
    .sort((a, b) => b.length - a.length);
}

/** Every legal placement of `word`, with an overlap score. */
function placementsFor(grid, size, word, directions, rng) {
  const out = [];

  for (const dirName of directions) {
    const [dr, dc] = DIRS[dirName];

    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        const endR = r + dr * (word.length - 1);
        const endC = c + dc * (word.length - 1);
        if (endR < 0 || endR >= size || endC < 0 || endC >= size) continue;

        let overlap = 0;
        let ok = true;
        for (let i = 0; i < word.length; i += 1) {
          const cur = grid[(r + dr * i) * size + (c + dc * i)];
          if (cur === "") continue;
          if (cur !== word[i]) {
            ok = false;
            break;
          }
          overlap += 1;
        }

        // A word laid entirely on top of existing letters is invisible work:
        // it adds no new letters and tends to read as a bug.
        if (ok && overlap < word.length) {
          out.push({ r, c, dr, dc, dirName, overlap });
        }
      }
    }
  }

  // Shuffle first so equal scores break randomly, then bias toward overlap.
  return rng.shuffle(out).sort((a, b) => b.overlap - a.overlap);
}

function writeWord(grid, size, word, place) {
  const touched = [];
  for (let i = 0; i < word.length; i += 1) {
    const idx = (place.r + place.dr * i) * size + (place.c + place.dc * i);
    touched.push({ idx, prev: grid[idx] });
    grid[idx] = word[i];
  }
  return touched;
}

function undo(grid, touched) {
  for (const t of touched) grid[t.idx] = t.prev;
}

/** Cells a placement occupies, as {row, col} pairs. */
function cellsOf(word, place) {
  return Array.from({ length: word.length }, (_, i) => ({
    row: place.r + place.dr * i,
    col: place.c + place.dc * i
  }));
}

/**
 * Recursive placement. Returns the list of placed words, or null if this
 * branch can't reach `target` words.
 */
function place(grid, size, words, index, target, placed, directions, rng, budget) {
  if (placed.length === target) return placed;
  if (index >= words.length) return null;
  if (budget.tries > 4000) return null;

  const word = words[index];
  // Only the top handful of placements are worth exploring; past that we are
  // just burning budget on near-identical boards.
  const options = placementsFor(grid, size, word, directions, rng).slice(0, 14);

  for (const option of options) {
    budget.tries += 1;
    const touched = writeWord(grid, size, word, option);
    placed.push({ word, cells: cellsOf(word, option), dir: option.dirName });

    const result = place(grid, size, words, index + 1, target, placed, directions, rng, budget);
    if (result) return result;

    placed.pop();
    undo(grid, touched);
  }

  // Skip this word entirely — there are spare candidates in the pool.
  return place(grid, size, words, index + 1, target, placed, directions, rng, budget);
}

/**
 * Build a playable level.
 *
 * @param {object} level descriptor from levels.js
 * @returns {{size:number, grid:string[], words:{word:string,cells:object[],dir:string}[]}}
 */
export function generate(level) {
  const size = level.size;

  // A handful of seed variations: if one word set simply doesn't fit, shift
  // the seed and draw a different set rather than giving up.
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const rng = makeRng(`${level.seed}#${attempt}`);
    const candidates = pickWords(level, rng);
    const target = Math.min(level.wordCount, candidates.length);
    const grid = new Array(size * size).fill("");
    const placed = place(grid, size, candidates, 0, target, [], level.directions, rng, { tries: 0 });

    if (placed && placed.length === target) {
      fill(grid, rng);
      return {
        size,
        grid,
        words: placed.map((p) => ({ ...p })).sort((a, b) => a.word.localeCompare(b.word))
      };
    }
  }

  // Unreachable with the shipped packs, but a board is better than a crash.
  const rng = makeRng(`${level.seed}#fallback`);
  const grid = new Array(size * size).fill("");
  fill(grid, rng);
  return { size, grid, words: [] };
}

/** Fill blanks with English-like noise so placed words don't pop out. */
function fill(grid, rng) {
  for (let i = 0; i < grid.length; i += 1) {
    if (grid[i] === "") grid[i] = rng.pick(FILLER_POOL);
  }
}
