/**
 * The play screen.
 *
 * Input design notes:
 *  - Drags snap to the nearest of the eight straight lines. Fingers are
 *    imprecise, so the selection follows the *direction* of the gesture
 *    rather than requiring the player to stay on exact cells.
 *  - The board captures the pointer, so a drag that wanders off the grid
 *    still works instead of dying silently.
 *  - Found words are drawn as capsules behind the letters, which is what
 *    players expect from a word search and reads far better than tinting
 *    individual tiles.
 *  - Everything is also reachable from a keyboard: arrows move a cursor,
 *    Enter anchors and commits.
 */

import { el, clear, icon, toast, announce, confetti, formatTime } from "../ui.js";
import { generate } from "../generator.js";
import { levelAt, dailyLevel, starsFor, rewardFor, TOTAL_LEVELS } from "../levels.js";
import {
  state, addCoins, spendCoins, addXp, recordLevel, recordDaily,
  countWordFound, useHint, isUnlocked
} from "../store.js";
import { checkAchievements } from "../achievements.js";
import * as audio from "../audio.js";
import * as haptics from "../haptics.js";
import { go, replace } from "../router.js";

const HINT_COST = 25;
const IDLE_ASSIST_MS = 18000;

/** Live state for the level currently on screen. */
let game = null;

/* ---------------------------------------------------------------------- */
/* DOM                                                                     */
/* ---------------------------------------------------------------------- */

const dom = {};

function build() {
  const screen = el("section", { "aria-label": "Puzzle" });

  dom.pauseBtn = el("button", {
    class: "icon-btn", type: "button", "aria-label": "Pause", onClick: () => pause()
  }, [icon("pause")]);

  dom.title = el("b");
  dom.subtitle = el("span");
  dom.timer = el("div", { class: "timer", role: "timer", "aria-label": "Elapsed time" }, ["0:00"]);

  dom.hud = el("div", { class: "play-hud" }, [
    dom.pauseBtn,
    el("div", { class: "play-title" }, [dom.title, dom.subtitle]),
    el("div", { class: "play-meta" }, [dom.timer])
  ]);

  dom.wordList = el("div", { class: "word-list", role: "list", "aria-label": "Words to find" });

  dom.tiles = el("div", { class: "layer layer--tiles", "aria-hidden": "true" });
  dom.lines = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  dom.lines.setAttribute("class", "layer layer--lines");
  dom.lines.setAttribute("aria-hidden", "true");
  dom.letters = el("div", {
    class: "layer layer--letters",
    role: "grid",
    "aria-label": "Letter grid. Use arrow keys to move, Enter to start and finish a word."
  });

  dom.board = el("div", { class: "board" }, [dom.tiles, dom.lines, dom.letters]);
  dom.boardFrame = el("div", { class: "board-frame" }, [dom.board]);

  dom.progressBar = el("i");
  dom.progressText = el("small", { text: "0 of 0 found" });
  dom.hintBtn = el("button", {
    class: "hint-btn", type: "button", "aria-label": `Hint, costs ${HINT_COST} coins`,
    onClick: () => useHintNow()
  }, [icon("bulb", 20), "Hint", el("b", {}, ["🪙", String(HINT_COST)])]);

  dom.foot = el("div", { class: "play-foot" }, [
    el("div", { class: "foot-progress" }, [
      el("div", { class: "bar" }, [dom.progressBar]),
      dom.progressText
    ]),
    dom.hintBtn
  ]);

  dom.body = el("div", { class: "play-body" }, [dom.wordList, dom.boardFrame]);

  screen.append(dom.hud, dom.body, dom.foot, buildPauseOverlay(), buildWinOverlay());
  return screen;
}

function buildPauseOverlay() {
  dom.pauseOverlay = el("div", { class: "overlay", role: "dialog", "aria-label": "Paused" }, [
    el("div", { class: "overlay-card" }, [
      el("h3", { text: "Paused" }),
      el("p", { class: "sub", text: "Take your time — the clock is stopped." }),
      el("div", { class: "overlay-actions" }, [
        el("button", {
          class: "btn btn--primary btn--block btn--lg", type: "button",
          text: "Resume", onClick: () => resume()
        }),
        el("div", { class: "row" }, [
          el("button", {
            class: "btn btn--block", type: "button", text: "Restart",
            onClick: () => { resume(); restart(); }
          }),
          el("button", {
            class: "btn btn--block", type: "button", text: "Settings",
            onClick: () => go("settings")
          })
        ]),
        el("button", {
          class: "btn btn--ghost btn--block", type: "button", text: "Quit to map",
          onClick: () => { resume(); go("map"); }
        })
      ])
    ])
  ]);
  return dom.pauseOverlay;
}

function buildWinOverlay() {
  dom.winStars = el("div", { class: "star-burst" });
  for (let i = 0; i < 3; i += 1) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z");
    svg.appendChild(path);
    dom.winStars.appendChild(svg);
  }

  dom.winTitle = el("h3", { text: "Level complete!" });
  dom.winSub = el("p", { class: "sub" });
  dom.winCoins = el("b", { text: "0" });
  dom.winXp = el("b", { text: "0" });
  dom.winTime = el("b", { text: "0:00" });

  dom.winPrimary = el("button", {
    class: "btn btn--primary btn--block btn--lg", type: "button", text: "Next level"
  });
  dom.winReplay = el("button", { class: "btn btn--block", type: "button", text: "Replay" });
  dom.winMap = el("button", { class: "btn btn--block", type: "button", text: "Map" });

  dom.winOverlay = el("div", { class: "overlay", role: "dialog", "aria-label": "Level complete" }, [
    el("div", { class: "overlay-card" }, [
      dom.winTitle,
      dom.winSub,
      dom.winStars,
      el("div", { class: "rewards" }, [
        el("div", { class: "reward" }, [dom.winCoins, el("small", { text: "Coins" })]),
        el("div", { class: "reward" }, [dom.winXp, el("small", { text: "XP" })]),
        el("div", { class: "reward" }, [dom.winTime, el("small", { text: "Time" })])
      ]),
      el("div", { class: "overlay-actions" }, [
        dom.winPrimary,
        el("div", { class: "row" }, [dom.winReplay, dom.winMap])
      ])
    ])
  ]);

  return dom.winOverlay;
}

/* ---------------------------------------------------------------------- */
/* Geometry                                                                */
/* ---------------------------------------------------------------------- */

/**
 * Cache every cell centre in the SVG's coordinate space.
 * Recomputed on resize only — reading offsets per pointermove would thrash
 * layout on exactly the frames that need to stay smooth.
 */
function measure() {
  if (!game) return;
  const first = game.cells[0];
  if (!first) return;

  const w = dom.letters.clientWidth;
  const h = dom.letters.clientHeight;
  if (!w || !h) return;

  dom.lines.setAttribute("viewBox", `0 0 ${w} ${h}`);
  game.geo = {
    cellW: first.offsetWidth,
    cellH: first.offsetHeight,
    pts: game.cells.map((cell) => ({
      x: cell.offsetLeft + cell.offsetWidth / 2,
      y: cell.offsetTop + cell.offsetHeight / 2
    }))
  };

  dom.board.style.setProperty("--cell-font", `${Math.round(Math.min(first.offsetWidth, first.offsetHeight) * 0.52)}px`);
  redrawLines();
}

const centreOf = (row, col) => game.geo.pts[row * game.size + col];

/* ---------------------------------------------------------------------- */
/* Rendering                                                               */
/* ---------------------------------------------------------------------- */

function renderBoard() {
  const n = game.size;
  clear(dom.tiles);
  clear(dom.letters);
  clear(dom.lines);

  // Smaller boards get a slightly bigger gap so they don't look cramped.
  const gap = n <= 8 ? 5 : n <= 10 ? 4 : 3;
  for (const layer of [dom.tiles, dom.letters]) {
    layer.style.setProperty("--n", n);
    layer.style.setProperty("--gap", `${gap}px`);
  }

  game.tiles = [];
  game.cells = [];

  for (let row = 0; row < n; row += 1) {
    for (let col = 0; col < n; col += 1) {
      const tile = el("div", { class: "tile" });
      dom.tiles.appendChild(tile);
      game.tiles.push(tile);

      const cell = el("button", {
        class: "cell",
        type: "button",
        tabindex: row === 0 && col === 0 ? "0" : "-1",
        role: "gridcell",
        "aria-label": `${game.puzzle.grid[row * n + col]}, row ${row + 1}, column ${col + 1}`,
        text: game.puzzle.grid[row * n + col],
        dataset: { row, col }
      });
      dom.letters.appendChild(cell);
      game.cells.push(cell);
    }
  }

  requestAnimationFrame(measure);
}

function renderWordList() {
  clear(dom.wordList);
  game.pills = new Map();

  game.puzzle.words.forEach((entry, i) => {
    const pill = el("div", {
      class: "word-pill",
      role: "listitem",
      style: { "--pill": `var(--w${(i % 9) + 1})` },
      text: entry.word
    });
    dom.wordList.appendChild(pill);
    game.pills.set(entry.word, pill);
  });
}

/** Draw every found capsule plus the live selection. */
function redrawLines() {
  if (!game?.geo) return;
  clear(dom.lines);

  const stroke = Math.min(game.geo.cellW, game.geo.cellH) * 0.84;

  const line = (cells, cls, color) => {
    if (!cells.length) return;
    const a = centreOf(cells[0].row, cells[0].col);
    const b = centreOf(cells[cells.length - 1].row, cells[cells.length - 1].col);
    if (!a || !b) return;

    const node = document.createElementNS("http://www.w3.org/2000/svg", "line");
    node.setAttribute("class", cls);
    node.setAttribute("x1", a.x);
    node.setAttribute("y1", a.y);
    node.setAttribute("x2", b.x);
    node.setAttribute("y2", b.y);
    node.setAttribute("stroke-width", stroke);
    if (color) node.setAttribute("stroke", color);
    dom.lines.appendChild(node);
  };

  for (const found of game.found) {
    line(found.cells, "wordline wordline--found", `var(--w${(found.colorIndex % 9) + 1})`);
  }
  if (game.selection.length) line(game.selection, "wordline wordline--active");
}

function syncProgress() {
  const total = game.puzzle.words.length;
  const done = game.found.length;
  dom.progressBar.style.width = `${total ? (done / total) * 100 : 0}%`;
  dom.progressText.textContent = `${done} of ${total} found`;
  dom.hintBtn.disabled = done >= total || state.profile.coins < HINT_COST;
}

/* ---------------------------------------------------------------------- */
/* Selection                                                               */
/* ---------------------------------------------------------------------- */

function cellAt(row, col) {
  if (row < 0 || col < 0 || row >= game.size || col >= game.size) return null;
  return game.cells[row * game.size + col];
}

function cellFromPoint(x, y) {
  const node = document.elementFromPoint(x, y);
  return node?.closest?.(".cell") || null;
}

/**
 * Build the straight path from the anchor toward (row, col), snapped to the
 * nearest of the eight directions and clipped to the board.
 */
function snapPath(anchor, row, col) {
  const ar = anchor.row;
  const ac = anchor.col;
  const dr = row - ar;
  const dc = col - ac;
  if (dr === 0 && dc === 0) return [{ row: ar, col: ac }];

  // Round the gesture angle to the nearest 45 degrees.
  const octant = Math.round(Math.atan2(dr, dc) / (Math.PI / 4));
  const sdr = Math.round(Math.sin((octant * Math.PI) / 4));
  const sdc = Math.round(Math.cos((octant * Math.PI) / 4));

  // Project the drag onto that direction so the length tracks the finger.
  const diagonal = sdr !== 0 && sdc !== 0;
  let len = Math.round((dr * sdr + dc * sdc) / (diagonal ? 2 : 1));
  len = Math.max(0, len);

  // Clip to the board edge rather than letting the path vanish.
  while (len > 0) {
    const endR = ar + sdr * len;
    const endC = ac + sdc * len;
    if (endR >= 0 && endC >= 0 && endR < game.size && endC < game.size) break;
    len -= 1;
  }

  return Array.from({ length: len + 1 }, (_, i) => ({
    row: ar + sdr * i,
    col: ac + sdc * i
  }));
}

function setSelection(path) {
  const before = game.selection.length;

  for (const cell of game.cells) cell.classList.remove("is-active");
  game.selection = path;

  for (const point of path) {
    cellAt(point.row, point.col)?.classList.add("is-active");
  }

  if (path.length !== before && path.length > 0) {
    audio.sfxTick(path.length - 1);
    if (path.length > before) haptics.tapLight();
  }

  redrawLines();
}

const selectionText = () =>
  game.selection.map((p) => game.puzzle.grid[p.row * game.size + p.col]).join("");

const reverse = (s) => s.split("").reverse().join("");

function commitSelection() {
  const text = selectionText();
  const match = game.puzzle.words.find(
    (entry) =>
      !game.found.some((f) => f.word === entry.word) &&
      (entry.word === text || entry.word === reverse(text))
  );

  if (match) {
    acceptWord(match, game.selection.slice());
  } else if (game.selection.length > 1) {
    rejectSelection();
  }

  setSelection([]);
}

function rejectSelection() {
  game.wrongTries += 1;
  audio.sfxMiss();
  haptics.fail();
  dom.board.classList.add("is-shake");
  setTimeout(() => dom.board.classList.remove("is-shake"), 340);
}

function acceptWord(entry, cells) {
  const colorIndex = game.puzzle.words.findIndex((w) => w.word === entry.word);
  game.found.push({ word: entry.word, cells, colorIndex });
  game.lastFindAt = performance.now();
  clearAssist();

  for (const point of cells) {
    const cell = cellAt(point.row, point.col);
    cell?.classList.add("is-found", "is-pop");
    setTimeout(() => cell?.classList.remove("is-pop"), 440);
  }

  const pill = game.pills.get(entry.word);
  if (pill) {
    pill.classList.add("is-found", "is-pop");
    setTimeout(() => pill.classList.remove("is-pop"), 440);
  }

  audio.sfxFound(game.found.length - 1);
  haptics.success();
  countWordFound(performance.now() - game.lastEventAt);
  game.lastEventAt = performance.now();

  announce(`${entry.word} found. ${game.puzzle.words.length - game.found.length} to go.`);
  syncProgress();
  redrawLines();

  if (game.found.length === game.puzzle.words.length) {
    setTimeout(win, 520);
  }
}

/* ---------------------------------------------------------------------- */
/* Pointer input                                                           */
/* ---------------------------------------------------------------------- */

function onPointerDown(e) {
  if (game.over || game.paused) return;
  const cell = e.target.closest(".cell");
  if (!cell) return;

  e.preventDefault();
  audio.unlock();
  clearAssist();

  game.dragging = true;
  game.anchor = { row: Number(cell.dataset.row), col: Number(cell.dataset.col) };
  game.cursor = { ...game.anchor };

  // Capture so the drag survives leaving the board, and so we keep getting
  // moves even if another element would otherwise take over.
  try {
    dom.letters.setPointerCapture(e.pointerId);
  } catch {
    /* Some browsers reject capture for mouse; the drag still works. */
  }

  setSelection([game.anchor]);
}

function onPointerMove(e) {
  if (!game.dragging) return;
  e.preventDefault();

  const cell = cellFromPoint(e.clientX, e.clientY);
  if (!cell) return;

  const path = snapPath(game.anchor, Number(cell.dataset.row), Number(cell.dataset.col));
  if (path.length !== game.selection.length ||
      path[path.length - 1]?.row !== game.selection[game.selection.length - 1]?.row ||
      path[path.length - 1]?.col !== game.selection[game.selection.length - 1]?.col) {
    setSelection(path);
  }
}

function onPointerUp(e) {
  if (!game.dragging) return;
  game.dragging = false;
  try {
    dom.letters.releasePointerCapture(e.pointerId);
  } catch {
    /* already released */
  }
  commitSelection();
}

/* ---------------------------------------------------------------------- */
/* Keyboard input                                                          */
/* ---------------------------------------------------------------------- */

function moveCursor(dr, dc) {
  const next = {
    row: Math.min(game.size - 1, Math.max(0, game.cursor.row + dr)),
    col: Math.min(game.size - 1, Math.max(0, game.cursor.col + dc))
  };
  game.cursor = next;

  for (const cell of game.cells) {
    cell.classList.remove("is-cursor");
    cell.tabIndex = -1;
  }

  const cell = cellAt(next.row, next.col);
  if (cell) {
    cell.classList.add("is-cursor");
    cell.tabIndex = 0;
    cell.focus({ preventScroll: true });
  }

  // While anchored, moving the cursor extends the selection.
  if (game.anchor) setSelection(snapPath(game.anchor, next.row, next.col));
}

function onKeyDown(e) {
  if (game.over || game.paused) return;

  const steps = {
    ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1]
  };

  if (steps[e.key]) {
    e.preventDefault();
    moveCursor(...steps[e.key]);
    return;
  }

  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    audio.unlock();
    if (game.anchor) {
      commitSelection();
      game.anchor = null;
    } else {
      const cell = e.target.closest(".cell");
      if (cell) game.cursor = { row: Number(cell.dataset.row), col: Number(cell.dataset.col) };
      game.anchor = { ...game.cursor };
      setSelection([game.anchor]);
      announce("Word started. Use arrow keys to extend, Enter to finish.");
    }
    return;
  }

  if (e.key === "Escape" && game.anchor) {
    e.preventDefault();
    game.anchor = null;
    setSelection([]);
    announce("Selection cancelled.");
  }
}

/* ---------------------------------------------------------------------- */
/* Hints and idle assist                                                   */
/* ---------------------------------------------------------------------- */

function nextUnfound() {
  return game.puzzle.words.find((w) => !game.found.some((f) => f.word === w.word));
}

function clearAssist() {
  for (const tile of game.tiles || []) tile.classList.remove("is-hint");
  if (game.assistTimer) {
    clearTimeout(game.assistTimer);
    game.assistTimer = 0;
  }
  scheduleAssist();
}

/**
 * Free nudge for new players: after a long pause with no progress, pulse the
 * first letter of a word that is still hiding.
 */
function scheduleAssist() {
  if (!state.settings.beginnerHints || game.over) return;
  game.assistTimer = setTimeout(() => {
    if (game.over || game.paused || game.dragging) return;
    const word = nextUnfound();
    if (!word) return;
    const first = word.cells[0];
    game.tiles[first.row * game.size + first.col]?.classList.add("is-hint");
  }, IDLE_ASSIST_MS);
}

function useHintNow() {
  if (game.over) return;
  const word = nextUnfound();
  if (!word) return;

  if (!spendCoins(HINT_COST)) {
    toast("Not enough coins", "bad");
    haptics.fail();
    return;
  }

  game.hintsUsed += 1;
  useHint();
  audio.sfxHint();
  haptics.tapMedium();

  // Reveal the first two letters: one letter alone is often not enough of a
  // foothold on a 12x12 board to feel like value for the coins.
  for (const point of word.cells.slice(0, 2)) {
    const tile = game.tiles[point.row * game.size + point.col];
    tile?.classList.add("is-hint");
  }

  toast(`${word.word} starts here`, "good");
  announce(`Hint: ${word.word} starts at row ${word.cells[0].row + 1}, column ${word.cells[0].col + 1}.`);
  syncProgress();

  setTimeout(() => {
    for (const point of word.cells.slice(0, 2)) {
      game.tiles[point.row * game.size + point.col]?.classList.remove("is-hint");
    }
  }, 6000);
}

/* ---------------------------------------------------------------------- */
/* Timer, pause, restart                                                   */
/* ---------------------------------------------------------------------- */

function elapsedMs() {
  return game.accumulatedMs + (game.paused || game.over ? 0 : performance.now() - game.resumedAt);
}

function tickTimer() {
  if (!game || game.over) return;
  const ms = elapsedMs();
  const text = formatTime(ms);
  if (text !== dom.timer.textContent) dom.timer.textContent = text;
  dom.timer.classList.toggle("is-over", ms / 1000 > game.level.parSeconds);
}

function pause() {
  if (!game || game.over || game.paused) return;
  game.paused = true;
  game.accumulatedMs += performance.now() - game.resumedAt;
  game.dragging = false;
  setSelection([]);
  dom.pauseOverlay.classList.add("is-open");
  audio.sfxTap();
  requestAnimationFrame(() => dom.pauseOverlay.querySelector(".btn--primary")?.focus());
}

function resume() {
  if (!game || !game.paused) return;
  game.paused = false;
  game.resumedAt = performance.now();
  dom.pauseOverlay.classList.remove("is-open");
}

function restart() {
  if (!game) return;
  startLevel(game.level);
}

/* ---------------------------------------------------------------------- */
/* Win                                                                     */
/* ---------------------------------------------------------------------- */

function win() {
  if (game.over) return;
  game.over = true;
  game.accumulatedMs += performance.now() - game.resumedAt;
  clearAssist();
  if (game.assistTimer) clearTimeout(game.assistTimer);

  const ms = game.accumulatedMs;
  const seconds = ms / 1000;
  const level = game.level;
  const stars = starsFor(level, { seconds, hintsUsed: game.hintsUsed });
  const reward = rewardFor(level, stars);
  const flawless = game.wrongTries === 0 && game.hintsUsed === 0;

  if (level.isDaily) {
    const result = recordDaily(level.dateKey, { stars, ms });
    if (!result.already) {
      dom.winSub.textContent = `Daily streak: ${result.streak} day${result.streak === 1 ? "" : "s"}`;
    } else {
      dom.winSub.textContent = "Already counted for today — nice replay.";
    }
  } else {
    const result = recordLevel(level.n, { stars, ms, hints: game.hintsUsed, flawless });
    dom.winSub.textContent = result.isFirst
      ? level.isChapterFinale ? `${level.chapter.name} complete!` : "Added to your journey."
      : result.improved ? "New personal best!" : "Nice run — your best score stands.";
  }

  addCoins(reward.coins);
  const xp = addXp(reward.xp);

  dom.winTitle.textContent = stars === 3 ? "Perfect!" : "Level complete!";
  dom.winCoins.textContent = `+${reward.coins}`;
  dom.winXp.textContent = `+${reward.xp}`;
  dom.winTime.textContent = formatTime(ms);

  // Next button target depends on where we are in the journey.
  const nextN = level.isDaily ? null : level.n + 1;
  const hasNext = nextN && nextN <= TOTAL_LEVELS;
  dom.winPrimary.textContent = hasNext ? "Next level" : level.isDaily ? "Back to home" : "Back to map";
  dom.winPrimary.onclick = () => {
    closeWin();
    if (hasNext) go("play", { n: String(nextN) });
    else go(level.isDaily ? "home" : "map");
  };
  dom.winReplay.onclick = () => {
    closeWin();
    restart();
  };
  dom.winMap.onclick = () => {
    closeWin();
    go(level.isDaily ? "home" : "map");
  };

  audio.sfxWin();
  haptics.celebrate();
  confetti(stars === 3 ? 60 : 40);
  announce(`Level complete. ${stars} stars. ${reward.coins} coins earned.`);

  dom.winOverlay.classList.add("is-open");

  // Stars land one at a time — the pause between them is the reward beat.
  const nodes = dom.winStars.children;
  for (let i = 0; i < 3; i += 1) {
    setTimeout(() => {
      nodes[i].classList.add("shown");
      if (i < stars) {
        nodes[i].classList.add("lit");
        audio.sfxStar(i * 4);
      }
    }, 380 + i * 260);
  }

  setTimeout(() => dom.winPrimary.focus(), 1400);

  if (xp.leveledUp) {
    setTimeout(() => {
      audio.sfxLevelUp();
      toast(`Level ${xp.level} reached!`, "good");
    }, 1500);
  }

  const unlocked = checkAchievements();
  unlocked.forEach((achievement, i) => {
    setTimeout(() => toast(`${achievement.icon} ${achievement.name}`, "good"), 1900 + i * 700);
  });
}

function closeWin() {
  dom.winOverlay.classList.remove("is-open");
  for (const node of dom.winStars.children) node.classList.remove("shown", "lit");
}

/* ---------------------------------------------------------------------- */
/* Lifecycle                                                               */
/* ---------------------------------------------------------------------- */

function startLevel(level) {
  closeWin();
  dom.pauseOverlay.classList.remove("is-open");

  game = {
    level,
    puzzle: generate(level),
    size: level.size,
    found: [],
    selection: [],
    anchor: null,
    cursor: { row: 0, col: 0 },
    dragging: false,
    paused: false,
    over: false,
    hintsUsed: 0,
    wrongTries: 0,
    accumulatedMs: 0,
    resumedAt: performance.now(),
    lastEventAt: performance.now(),
    assistTimer: 0,
    geo: null
  };

  dom.title.textContent = level.isDaily ? "Daily Puzzle" : level.title;
  dom.subtitle.textContent = level.isDaily
    ? `${level.chapter.icon} ${level.chapter.name}`
    : `${level.chapter.icon} Level ${level.n} of ${TOTAL_LEVELS}`;
  dom.timer.textContent = "0:00";
  dom.timer.classList.remove("is-over");
  dom.timer.hidden = !state.settings.showTimer;

  renderBoard();
  renderWordList();
  syncProgress();
  scheduleAssist();
  announce(`${level.title}. Find ${level.wordCount} words.`);
}

let resizeObserver = null;
let timerInterval = 0;

function mount(_node, params) {
  const level = params.daily ? dailyLevel(params.daily) : levelAt(Number(params.n) || 1);

  // Deep links and the back button can both aim at a locked level.
  if (!level.isDaily && !isUnlocked(level.n)) {
    replace("map");
    toast("That level is still locked", "bad");
    return;
  }

  startLevel(level);

  dom.letters.addEventListener("pointerdown", onPointerDown);
  dom.letters.addEventListener("pointermove", onPointerMove);
  dom.letters.addEventListener("pointerup", onPointerUp);
  dom.letters.addEventListener("pointercancel", onPointerUp);
  dom.letters.addEventListener("keydown", onKeyDown);

  resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(dom.boardFrame);

  timerInterval = setInterval(tickTimer, 200);
}

function unmount() {
  dom.letters.removeEventListener("pointerdown", onPointerDown);
  dom.letters.removeEventListener("pointermove", onPointerMove);
  dom.letters.removeEventListener("pointerup", onPointerUp);
  dom.letters.removeEventListener("pointercancel", onPointerUp);
  dom.letters.removeEventListener("keydown", onKeyDown);

  resizeObserver?.disconnect();
  resizeObserver = null;

  clearInterval(timerInterval);
  timerInterval = 0;

  if (game?.assistTimer) clearTimeout(game.assistTimer);
  closeWin();
  dom.pauseOverlay.classList.remove("is-open");
  game = null;
}

/** Pause when the tab goes away, so the clock can't run in the background. */
export function pauseIfPlaying() {
  if (game && !game.over && !game.paused) pause();
}

export default { build, mount, unmount };
