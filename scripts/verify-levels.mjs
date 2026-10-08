/**
 * Generate every level in the journey plus a year of daily puzzles, and
 * assert each one is a solvable, well-formed board.
 *
 * Levels are generated at runtime from a seed rather than authored by hand,
 * so this is the only place a bad word list or a too-tight difficulty curve
 * would be caught before a player hits it.
 *
 *   node scripts/verify-levels.mjs
 */

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { levelAt, dailyLevel, todayKey, TOTAL_LEVELS, DIRS } = await import(
  join(root, "app/src/lib/levels.js")
);
const { generate } = await import(join(root, "app/src/lib/generator.js"));

const failures = [];
let boards = 0;
let words = 0;

function check(level) {
  const puzzle = generate(level);
  boards += 1;
  words += puzzle.words.length;

  const fail = (msg) => failures.push(`${level.id} (${level.title}): ${msg}`);

  if (puzzle.words.length !== level.wordCount) {
    fail(`asked for ${level.wordCount} words, placed ${puzzle.words.length}`);
  }

  if (puzzle.grid.length !== level.size * level.size) {
    fail(`grid should hold ${level.size ** 2} cells, holds ${puzzle.grid.length}`);
  }

  if (puzzle.grid.some((ch) => !/^[A-Z]$/.test(ch))) {
    fail("grid contains a non A-Z character");
  }

  const seen = new Set();
  for (const entry of puzzle.words) {
    if (seen.has(entry.word)) fail(`${entry.word} is hidden twice`);
    seen.add(entry.word);

    if (!level.directions.includes(entry.dir)) {
      fail(`${entry.word} runs ${entry.dir}, which this level should not use`);
    }

    if (entry.cells.length !== entry.word.length) {
      fail(`${entry.word} claims ${entry.cells.length} cells`);
    }

    // The word must actually read off the board along its own cells.
    const read = entry.cells
      .map((c) => puzzle.grid[c.row * level.size + c.col])
      .join("");
    if (read !== entry.word) fail(`${entry.word} reads as "${read}" on the board`);

    for (const cell of entry.cells) {
      if (cell.row < 0 || cell.col < 0 || cell.row >= level.size || cell.col >= level.size) {
        fail(`${entry.word} runs off the board`);
        break;
      }
    }

    // Cells must form one straight, evenly stepped line — that is the only
    // shape the drag input can ever produce.
    if (entry.cells.length > 1) {
      const [dr, dc] = DIRS[entry.dir];
      const start = entry.cells[0];
      const straight = entry.cells.every(
        (c, i) => c.row === start.row + dr * i && c.col === start.col + dc * i
      );
      if (!straight) fail(`${entry.word} is not a straight line`);
    }
  }
}

for (let n = 1; n <= TOTAL_LEVELS; n += 1) check(levelAt(n));

// A year of daily puzzles, which draw from the same packs on a date seed.
const start = new Date(2026, 0, 1);
for (let day = 0; day < 365; day += 1) {
  const date = new Date(start);
  date.setDate(start.getDate() + day);
  // The game's own key function, so the verifier cannot drift from it.
  check(dailyLevel(todayKey(date)));
}

// Generation must be reproducible or saved progress would stop matching the
// board a player left behind.
const a = generate(levelAt(42));
const b = generate(levelAt(42));
if (a.grid.join("") !== b.grid.join("")) {
  failures.push("generation is not deterministic for level 42");
}

if (failures.length) {
  console.error(`${failures.length} problem(s) found:`);
  for (const line of failures) console.error("  " + line);
  process.exit(1);
}

console.log(`OK — ${boards} boards generated, ${words} words placed and verified.`);
