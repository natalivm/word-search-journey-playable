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
 *
 * Restarting remounts `<Level>` via its key, so there is no reset logic to
 * keep in step with the state it is resetting.
 */

import {
  memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState
} from "react";
import Icon from "../components/Icon.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import { STAR_D } from "../components/Stars.jsx";
import { toast, announce, confetti } from "../lib/overlays.js";
import { generate } from "../lib/generator.js";
import { levelAt, dailyLevel, starsFor, rewardFor, TOTAL_LEVELS } from "../lib/levels.js";
import { poolLevel, poolRewardFor, POOL_LEVELS } from "../lib/pool.js";
import {
  state, addCoins, spendCoins, addXp, recordLevel, recordDaily, recordPoolRing,
  countWordFound, recordHintUsed, isUnlocked, isPoolUnlocked
} from "../lib/store.js";
import { checkAchievements } from "../lib/achievements.js";
import { formatTime } from "../lib/format.js";
import { useCountUp, useOnDeactivate } from "../lib/hooks.js";
import { sparkle, pop as popParticles, toLocal, clearParticles } from "../lib/particles.js";
import * as audio from "../lib/audio.js";
import * as haptics from "../lib/haptics.js";

const HINT_COST = 25;
/** Shared so setting "no cells" twice in a row bails out of a re-render. */
const NO_CELLS = [];
const IDLE_ASSIST_MS = 18000;

/* ---------------------------------------------------------------------- */
/* Board pieces                                                            */
/* ---------------------------------------------------------------------- */

// Memoised on primitives, so a selection change only re-renders the handful
// of cells whose state actually moved, not all 144.
const Tile = memo(function Tile({ hinted, wave }) {
  return <div className={`tile${hinted ? " is-hint" : ""}`} style={{ "--wave": wave }} />;
});

const Cell = memo(function Cell({ letter, row, col, active, found, cursor, popIndex, wave }) {
  const popping = popIndex !== undefined;
  return (
    <button
      className={`cell${active ? " is-active" : ""}${found ? " is-found" : ""}${cursor ? " is-cursor" : ""}${popping ? " is-pop" : ""}`}
      type="button"
      tabIndex={row === 0 && col === 0 ? 0 : -1}
      aria-label={`${letter}, row ${row + 1}, column ${col + 1}`}
      data-row={row}
      data-col={col}
      // --pop orders the flip along the word; --wave orders the board reveal.
      style={{ "--pop": popping ? popIndex : undefined, "--wave": wave }}
    >
      {letter}
    </button>
  );
});

/** The custom property holding the highlight colour for word `index`. */
const wordVar = (index) => `--w${(index % 9) + 1}`;

// Resolving a custom property forces a style recalculation, so the palette is
// read once and reused. Theme, dark mode and the colour-blind palette all
// change it, so the cache is keyed on the attributes that select it.
let paletteKey = "";
const paletteCache = new Map();

function wordColor(index) {
  const root = document.documentElement;
  const key = `${root.dataset.theme}/${root.dataset.cvd}`;
  if (key !== paletteKey) {
    paletteKey = key;
    paletteCache.clear();
  }

  const name = wordVar(index);
  if (!paletteCache.has(name)) {
    paletteCache.set(name, getComputedStyle(root).getPropertyValue(name).trim() || "#ff6b6b");
  }
  return paletteCache.get(name);
}

/**
 * The clock, isolated.
 *
 * It ticks five times a second; if that state lived in <Level> it would
 * re-render all 288 board nodes each time to update three characters. The
 * interval also stops entirely when the player has hidden the timer.
 */
function Timer({ running, parSeconds, accumulatedRef, resumedAtRef, runningRef }) {
  const show = state.settings.showTimer;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running || !show) return undefined;
    const id = setInterval(() => {
      setElapsed(accumulatedRef.current + (performance.now() - resumedAtRef.current));
    }, 200);
    return () => clearInterval(id);
  }, [running, show, accumulatedRef, resumedAtRef]);

  // Settle on the banked total once the clock stops, so a paused or finished
  // level still shows the right time.
  useEffect(() => {
    if (running) return;
    setElapsed(accumulatedRef.current + (runningRef.current ? performance.now() - resumedAtRef.current : 0));
  }, [running, accumulatedRef, resumedAtRef, runningRef]);

  if (!show) return null;

  return (
    <div
      className={`timer${elapsed / 1000 > parSeconds ? " is-over" : ""}`}
      role="timer"
      aria-label="Elapsed time"
    >
      {formatTime(elapsed)}
    </div>
  );
}

/** A reward figure that counts up once the stars have landed. */
function Reward({ label, value, delay }) {
  const shown = useCountUp(value, { delay });
  return (
    <div className="reward">
      <b className={shown === value && value > 0 ? "is-settled" : undefined}>{`+${shown}`}</b>
      <small>{label}</small>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* One attempt at one level                                                */
/* ---------------------------------------------------------------------- */

function Level({ level, active, go, onRestart }) {
  const puzzle = useMemo(() => generate(level), [level]);
  const size = puzzle.size;

  const [found, setFound] = useState([]);
  const [selection, setSelection] = useState(NO_CELLS);
  // One value, not two kept in step: a hint is either absent or it is a set
  // of cells with a reason. Splitting it meant every call site had to clear
  // both, and the purchased-hint path forgot — leaving the bulb nudging.
  const [hint, setHint] = useState(null);
  const [poppedCells, setPoppedCells] = useState(NO_CELLS);
  const [cursor, setCursor] = useState({ row: 0, col: 0 });
  // The cursor ring is a keyboard affordance; showing it to someone who is
  // dragging with a finger just looks like a stray selected tile.
  const [keyboardMode, setKeyboardMode] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [result, setResult] = useState(null);
  const [shownStars, setShownStars] = useState(0);
  const [geo, setGeo] = useState(null);
  // The reveal animation is scoped to this flag so that later class changes
  // (a letter flipping) can never retrigger a board-wide entry.
  const [entering, setEntering] = useState(true);

  const frameRef = useRef(null);
  const boardRef = useRef(null);
  const lettersRef = useRef(null);
  // Mirror of `geo` for callbacks that should not be rebuilt on every resize.
  const geoRef = useRef(null);

  const anchorRef = useRef(null);
  const draggingRef = useRef(false);
  // Mirrors of state that handlers need to read synchronously. Reading them
  // through a setState updater instead would mean doing work inside the
  // updater, which React may invoke more than once.
  const selectionRef = useRef(NO_CELLS);
  const cursorRef = useRef({ row: 0, col: 0 });
  const accumulatedRef = useRef(0);
  const resumedAtRef = useRef(0);
  // Whether the clock is currently running. Without it, reading the elapsed
  // total after the timer effect has already banked its span double-counts
  // that span — which happens whenever the player pauses or backgrounds the
  // tab inside the short delay between the last word and the win card.
  const runningRef = useRef(false);
  const hintsRef = useRef(0);
  const wrongRef = useRef(0);
  const lastEventRef = useRef(0);
  const assistRef = useRef(0);
  const shakeRef = useRef(null);
  const starsRef = useRef(null);

  const total = puzzle.words.length;
  const isOver = result !== null;
  // Leaving the screen pauses the level by definition, so this is derived
  // rather than stored — no effect has to keep a flag in step with `active`.
  const paused = userPaused || !active;

  // "Already found?" asked once per render instead of a linear scan per word.
  const foundWords = useMemo(() => new Set(found.map((f) => f.word)), [found]);

  /* -- geometry -------------------------------------------------------- */

  // Cell centres are cached per resize; reading offsets on every pointermove
  // would thrash layout on exactly the frames that need to stay smooth.
  const measure = useCallback(() => {
    const letters = lettersRef.current;
    const first = letters?.firstElementChild;
    if (!letters || !first) return;

    const w = letters.clientWidth;
    const h = letters.clientHeight;
    if (!w || !h) return;

    const pts = [...letters.children].map((cell) => ({
      x: cell.offsetLeft + cell.offsetWidth / 2,
      y: cell.offsetTop + cell.offsetHeight / 2
    }));

    const next = { w, h, cellW: first.offsetWidth, cellH: first.offsetHeight, pts };
    geoRef.current = next;
    setGeo(next);
    boardRef.current?.style.setProperty(
      "--cell-font",
      `${Math.round(Math.min(first.offsetWidth, first.offsetHeight) * 0.52)}px`
    );
  }, []);

  useLayoutEffect(measure, [measure, size]);

  // Longest stagger is the far corner: 2*(size-1) steps at 16ms, plus the
  // animation itself.
  useEffect(() => {
    const id = setTimeout(() => setEntering(false), 2 * (size - 1) * 16 + 500);
    return () => clearTimeout(id);
  }, [size]);

  useEffect(() => {
    const observer = new ResizeObserver(measure);
    if (frameRef.current) observer.observe(frameRef.current);
    return () => observer.disconnect();
  }, [measure]);

  /* -- timer ----------------------------------------------------------- */

  // The clock runs only while this effect is alive. Its cleanup banks the
  // time, so pausing, finishing, leaving the screen and unmounting all settle
  // the elapsed total through one path. The visible ticking lives in <Timer>
  // so it cannot re-render the board.
  useEffect(() => {
    if (paused || isOver) return undefined;

    resumedAtRef.current = performance.now();
    runningRef.current = true;
    if (!lastEventRef.current) lastEventRef.current = performance.now();

    return () => {
      accumulatedRef.current += performance.now() - resumedAtRef.current;
      runningRef.current = false;
    };
  }, [paused, isOver]);

  /** Elapsed play time, whether or not the clock is currently running. */
  const elapsedMs = useCallback(
    () => accumulatedRef.current + (runningRef.current ? performance.now() - resumedAtRef.current : 0),
    []
  );

  /**
   * Show `path` as the live selection.
   *
   * State updaters must be pure — React invokes them more than once under
   * StrictMode — so the comparison and the feedback both happen here, and
   * the updater receives a finished value.
   */
  const applySelection = useCallback((path) => {
    const prev = selectionRef.current;
    const last = path[path.length - 1];
    const prevLast = prev[prev.length - 1];
    const lengthChanged = prev.length !== path.length;
    const endMoved = Boolean(
      last && prevLast && (last.row !== prevLast.row || last.col !== prevLast.col)
    );
    if (!lengthChanged && !endMoved) return;

    if (lengthChanged && path.length) audio.sfxTick(path.length - 1);
    if (path.length > prev.length) haptics.tapLight();

    selectionRef.current = path;
    setSelection(path);
  }, []);

  /** Clear the selection and hand back what it was. */
  const takeSelection = useCallback(() => {
    const path = selectionRef.current;
    selectionRef.current = NO_CELLS;
    setSelection(NO_CELLS);
    return path;
  }, []);

  const moveCursor = useCallback((next) => {
    cursorRef.current = next;
    setCursor(next);
  }, []);

  const pause = useCallback(() => {
    if (isOver) return;
    draggingRef.current = false;
    anchorRef.current = null;
    takeSelection();
    setUserPaused(true);
    audio.sfxTap();
  }, [isOver, takeSelection]);

  const resume = useCallback(() => setUserPaused(false), []);

  // Never let the clock run while the player is not looking at it.
  useEffect(() => {
    const onHide = () => { if (document.hidden) setUserPaused(true); };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  /* -- idle assist ----------------------------------------------------- */

  const nextUnfound = useCallback(
    () => puzzle.words.find((w) => !foundWords.has(w.word)),
    [puzzle.words, foundWords]
  );

  useEffect(() => {
    // The Pool Party rings opt out: a nudge is a difficulty setting, and the
    // event's whole premise is that there isn't one.
    if (level.assist === false) return undefined;
    if (!state.settings.beginnerHints || isOver || paused) return undefined;

    assistRef.current = setTimeout(() => {
      const word = puzzle.words.find((w) => !foundWords.has(w.word));
      if (!word) return;
      setHint({ cells: [word.cells[0]], nudge: true });
    }, IDLE_ASSIST_MS);

    return () => clearTimeout(assistRef.current);
  }, [level.assist, puzzle.words, foundWords, isOver, paused]);

  /* -- selection ------------------------------------------------------- */

  const letterAt = useCallback(
    (row, col) => puzzle.grid[row * size + col],
    [puzzle.grid, size]
  );

  /**
   * Build the straight path from the anchor toward (row, col), snapped to the
   * nearest of the eight directions and clipped to the board.
   */
  const snapPath = useCallback((anchor, row, col) => {
    const dr = row - anchor.row;
    const dc = col - anchor.col;
    if (dr === 0 && dc === 0) return [{ ...anchor }];

    // Round the gesture angle to the nearest 45 degrees.
    const octant = Math.round(Math.atan2(dr, dc) / (Math.PI / 4));
    const sdr = Math.round(Math.sin((octant * Math.PI) / 4));
    const sdc = Math.round(Math.cos((octant * Math.PI) / 4));

    // Project the drag onto that direction so length tracks the finger.
    const diagonal = sdr !== 0 && sdc !== 0;
    let len = Math.max(0, Math.round((dr * sdr + dc * sdc) / (diagonal ? 2 : 1)));

    // Clip to the board edge rather than letting the path vanish.
    while (len > 0) {
      const endR = anchor.row + sdr * len;
      const endC = anchor.col + sdc * len;
      if (endR >= 0 && endC >= 0 && endR < size && endC < size) break;
      len -= 1;
    }

    return Array.from({ length: len + 1 }, (_, i) => ({
      row: anchor.row + sdr * i,
      col: anchor.col + sdc * i
    }));
  }, [size]);


  const finishLevel = useCallback(() => {
    // Read, don't bank: setting `result` tears down the timer effect, whose
    // cleanup adds the live span to the accumulated total.
    const ms = elapsedMs();
    const stars = starsFor(level, { seconds: ms / 1000, hintsUsed: hintsRef.current });
    const reward = level.isPool ? poolRewardFor(level, stars) : rewardFor(level, stars);
    const flawless = wrongRef.current === 0 && hintsRef.current === 0;

    let note;
    if (level.isPool) {
      const record = recordPoolRing(level.poolIndex, { stars, ms, hints: hintsRef.current, flawless });
      note = record.isFirst
        ? level.isFinalRing
          ? "The last ring is yours — claim the trophy!"
          : `Ring ${level.poolIndex} cleared. ${POOL_LEVELS - level.poolIndex} to go.`
        : record.improved ? "New personal best on this ring!" : "Nice run — your best stands.";
    } else if (level.isDaily) {
      const daily = recordDaily(level.dateKey, { stars, ms });
      note = daily.already
        ? "Already counted for today — nice replay."
        : `Daily streak: ${daily.streak} day${daily.streak === 1 ? "" : "s"}`;
    } else {
      const record = recordLevel(level.n, { stars, ms, hints: hintsRef.current, flawless });
      note = record.isFirst
        ? level.isChapterFinale ? `${level.chapter.name} complete!` : "Added to your journey."
        : record.improved ? "New personal best!" : "Nice run — your best score stands.";
    }

    addCoins(reward.coins);
    const xp = addXp(reward.xp);

    setResult({ stars, reward, ms, note, leveledUp: xp.leveledUp, playerLevel: xp.level });
  }, [level, elapsedMs]);

  const acceptWord = useCallback((entry, cells) => {
    const colorIndex = puzzle.words.findIndex((w) => w.word === entry.word);

    // Nothing but the new value here: a state updater must be pure, and
    // under StrictMode React invokes it twice — scheduling the win from
    // inside it awarded coins and XP twice on every level in development.
    setFound((prev) => [...prev, { word: entry.word, cells, colorIndex }]);

    setHint(null);
    setPoppedCells(cells);

    audio.sfxFound(found.length);
    haptics.success();
    countWordFound(performance.now() - lastEventRef.current);
    lastEventRef.current = performance.now();

    announce(`${entry.word} found. ${puzzle.words.length - found.length - 1} to go.`);
  }, [puzzle.words, found.length]);

  // The win is triggered here instead, where re-running is harmless and the
  // delay is cancelled if the level is left before it fires.
  useEffect(() => {
    if (isOver || !puzzle.words.length || found.length !== puzzle.words.length) return undefined;
    const id = setTimeout(finishLevel, 520);
    return () => clearTimeout(id);
  }, [found.length, puzzle.words.length, isOver, finishLevel]);

  // Clearing the flip is an effect, not a bare timer: finding a second word
  // inside the first one's ~1s window would otherwise let the stale timer
  // cut the new word's stagger short. Re-running cancels the old timer, and
  // unmounting cancels this one.
  useEffect(() => {
    if (!poppedCells.length) return undefined;
    // Cover the full stagger: the last letter starts at (n-1)*55ms.
    const id = setTimeout(() => setPoppedCells(NO_CELLS), 680 + poppedCells.length * 55);
    return () => clearTimeout(id);
  }, [poppedCells]);

  // Sparks travel along the word with the flip. Also an effect, so quitting
  // or restarting mid-animation cannot draw particles onto the next screen
  // at coordinates from a board that is no longer there.
  useEffect(() => {
    const latest = found[found.length - 1];
    const rect = lettersRef.current?.getBoundingClientRect();
    const points = geoRef.current?.pts;
    if (!latest || !rect || !points) return undefined;

    const color = wordColor(latest.colorIndex);
    const timers = latest.cells.map((cell, i) => {
      const pt = points[cell.row * size + cell.col];
      if (!pt) return 0;
      return setTimeout(() => {
        const local = toLocal(rect.left + pt.x, rect.top + pt.y);
        sparkle(local.x, local.y, color);
      }, i * 55);
    });

    return () => timers.forEach(clearTimeout);
  }, [found, size]);

  const commitSelection = useCallback((path) => {
    const text = path.map((p) => letterAt(p.row, p.col)).join("");
    const reversed = text.split("").reverse().join("");

    const match = puzzle.words.find(
      (entry) => !foundWords.has(entry.word) &&
        (entry.word === text || entry.word === reversed)
    );

    if (match) {
      acceptWord(match, path);
    } else if (path.length > 1) {
      wrongRef.current += 1;
      audio.sfxMiss();
      haptics.fail();
      boardRef.current?.classList.add("is-shake");
      clearTimeout(shakeRef.current);
      shakeRef.current = setTimeout(() => boardRef.current?.classList.remove("is-shake"), 340);
    }

  }, [puzzle.words, foundWords, letterAt, acceptWord]);

  /* -- pointer --------------------------------------------------------- */

  const onPointerDown = useCallback((e) => {
    if (isOver || paused) return;
    const cell = e.target.closest(".cell");
    if (!cell) return;

    e.preventDefault();
    audio.unlock();
    setHint(null);
    setKeyboardMode(false);

    const anchor = { row: Number(cell.dataset.row), col: Number(cell.dataset.col) };
    anchorRef.current = anchor;
    draggingRef.current = true;
    moveCursor(anchor);
    applySelection([anchor]);

    try {
      lettersRef.current?.setPointerCapture(e.pointerId);
    } catch {
      /* Some browsers reject capture for mouse; the drag still works. */
    }
  }, [isOver, paused, applySelection, moveCursor]);

  const onPointerMove = useCallback((e) => {
    if (!draggingRef.current || !anchorRef.current) return;
    e.preventDefault();

    const node = document.elementFromPoint(e.clientX, e.clientY);
    const cell = node?.closest?.(".cell");
    if (!cell) return;

    applySelection(snapPath(anchorRef.current, Number(cell.dataset.row), Number(cell.dataset.col)));
  }, [applySelection, snapPath]);

  const onPointerUp = useCallback((e) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    anchorRef.current = null;

    try {
      lettersRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }

    const path = takeSelection();
    if (path.length) commitSelection(path);
  }, [commitSelection, takeSelection]);

  /* -- keyboard -------------------------------------------------------- */

  const onKeyDown = useCallback((e) => {
    if (isOver || paused) return;

    const steps = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

    if (steps[e.key]) {
      e.preventDefault();
      setKeyboardMode(true);
      // Same as a pointer press: the player is engaged, so stop nudging.
      setHint(null);
      const [dr, dc] = steps[e.key];
      const prev = cursorRef.current;
      const next = {
        row: Math.min(size - 1, Math.max(0, prev.row + dr)),
        col: Math.min(size - 1, Math.max(0, prev.col + dc))
      };

      moveCursor(next);
      lettersRef.current?.children[next.row * size + next.col]?.focus({ preventScroll: true });
      if (anchorRef.current) applySelection(snapPath(anchorRef.current, next.row, next.col));
      return;
    }

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      audio.unlock();
      setKeyboardMode(true);

      if (anchorRef.current) {
        anchorRef.current = null;
        const path = takeSelection();
        if (path.length) commitSelection(path);
      } else {
        const cell = e.target.closest(".cell");
        const anchor = cell
          ? { row: Number(cell.dataset.row), col: Number(cell.dataset.col) }
          : cursorRef.current;
        anchorRef.current = anchor;
        moveCursor(anchor);
        applySelection([anchor]);
        announce("Word started. Use arrow keys to extend, Enter to finish.");
      }
      return;
    }

    if (e.key === "Escape" && anchorRef.current) {
      e.preventDefault();
      anchorRef.current = null;
      takeSelection();
      announce("Selection cancelled.");
    }
  }, [isOver, paused, size, applySelection, snapPath, commitSelection, takeSelection, moveCursor]);

  /* -- hints ----------------------------------------------------------- */

  const useHintNow = useCallback(() => {
    if (isOver) return;
    const word = nextUnfound();
    if (!word) return;

    if (!spendCoins(HINT_COST)) {
      toast("Not enough coins", "bad");
      haptics.fail();
      return;
    }

    hintsRef.current += 1;
    recordHintUsed();
    audio.sfxHint();
    haptics.tapMedium();

    // Two letters, not one: a single letter is not enough of a foothold on a
    // 12x12 board to feel like value for the coins.
    const cells = word.cells.slice(0, 2);
    setHint({ cells, nudge: false });
    toast(`${word.word} starts here`, "good");
    announce(`Hint: ${word.word} starts at row ${cells[0].row + 1}, column ${cells[0].col + 1}.`);
    setTimeout(() => setHint(null), 6000);
  }, [isOver, nextUnfound]);

  /* -- win sequence ---------------------------------------------------- */

  // Held so leaving the screen can cancel a celebration already in flight.
  const winTimersRef = useRef([]);

  useEffect(() => {
    if (!result) return undefined;

    audio.sfxWin();
    haptics.celebrate();
    confetti(result.stars === 3 ? 60 : 40);
    announce(`Level complete. ${result.stars} stars. ${result.reward.coins} coins earned.`);

    // Stars land one at a time — the pause between them is the reward beat.
    const timers = [0, 1, 2].map((i) =>
      setTimeout(() => {
        setShownStars(i + 1);
        if (i >= result.stars) return;

        audio.sfxStar(i * 4);

        // Burst from the star that just landed.
        const node = starsRef.current?.children[i];
        if (node) {
          const r = node.getBoundingClientRect();
          const local = toLocal(r.left + r.width / 2, r.top + r.height / 2);
          popParticles(local.x, local.y);
        }
      }, 380 + i * 260)
    );

    if (result.leveledUp) {
      timers.push(setTimeout(() => {
        audio.sfxLevelUp();
        toast(`Level ${result.playerLevel} reached!`, "good");
      }, 1500));
    }

    checkAchievements().forEach((achievement, i) => {
      timers.push(setTimeout(
        () => toast(`${achievement.icon} ${achievement.name}`, "good"),
        1900 + i * 700
      ));
    });

    winTimersRef.current = timers;
    return () => timers.forEach(clearTimeout);
  }, [result]);

  useEffect(() => {
    announce(`${level.title}. Find ${level.wordCount} words.`);
  }, [level]);

  // Leaving mid-celebration takes the confetti and the rest of the win
  // sequence with it. Restarting remounts <Level>, so that path is covered by
  // the unmount cleanup below.
  useOnDeactivate(active, () => {
    winTimersRef.current.forEach(clearTimeout);
    winTimersRef.current = [];
    clearParticles();
  });

  useEffect(() => clearParticles, []);

  /* -- derived --------------------------------------------------------- */

  const foundCells = useMemo(() => {
    const set = new Set();
    for (const f of found) for (const c of f.cells) set.add(c.row * size + c.col);
    return set;
  }, [found, size]);

  const selectedCells = useMemo(
    () => new Set(selection.map((c) => c.row * size + c.col)),
    [selection, size]
  );

  const hintSet = useMemo(
    () => new Set((hint?.cells ?? []).map((c) => c.row * size + c.col)),
    [hint, size]
  );


  // Cell index -> position in the word, so each letter flips in sequence.
  const poppedOrder = useMemo(() => {
    const map = new Map();
    poppedCells.forEach((c, i) => map.set(c.row * size + c.col, i));
    return map;
  }, [poppedCells, size]);

  const gap = size <= 8 ? 5 : size <= 10 ? 4 : 3;
  const layerStyle = { "--n": size, "--gap": `${gap}px` };
  const stroke = geo ? Math.min(geo.cellW, geo.cellH) * 0.84 : 0;

  const capsule = (cells, key, className, color) => {
    if (!geo) return null;
    const a = geo.pts[cells[0].row * size + cells[0].col];
    const b = geo.pts[cells[cells.length - 1].row * size + cells[cells.length - 1].col];
    if (!a || !b) return null;
    return (
      <line
        key={key}
        className={className}
        x1={a.x} y1={a.y} x2={b.x} y2={b.y}
        strokeWidth={stroke}
        stroke={color}
        pathLength="1"
      />
    );
  };

  // Where this level came from, and where "next" goes — the journey, the
  // event ladder and the daily puzzle each answer differently.
  const quitTo = level.isPool ? "pool" : level.isDaily ? "home" : "map";
  const quitLabel = level.isPool ? "Pool" : level.isDaily ? "Home" : "Map";

  const nextN = level.isPool
    ? (level.isFinalRing ? null : level.poolIndex + 1)
    : level.isDaily ? null : level.n + 1;
  const hasNext = Boolean(nextN && (level.isPool || nextN <= TOTAL_LEVELS));
  const nextParams = level.isPool ? { pool: String(nextN) } : { n: String(nextN) };
  const nextLabel = level.isPool ? "Next ring" : "Next level";
  const finishLabel = level.isPool
    ? (level.isFinalRing ? "Claim your trophy" : "Back to the pool")
    : level.isDaily ? "Back to home" : "Back to map";

  return (
    <>
      <div className="play-hud">
        <button className="icon-btn" type="button" aria-label="Pause" onClick={pause}>
          <Icon name="pause" />
        </button>
        <div className="play-title">
          <b>{level.isDaily ? "Daily Puzzle" : level.title}</b>
          <span>
            {level.isDaily
              ? `${level.chapter.icon} ${level.chapter.name}`
              : level.isPool
                ? `${level.chapter.icon} Ring ${level.poolIndex} of ${POOL_LEVELS}`
                : `${level.chapter.icon} Level ${level.n} of ${TOTAL_LEVELS}`}
          </span>
        </div>
        <div className="play-meta">
          <Timer
            running={!paused && !isOver}
            parSeconds={level.parSeconds}
            accumulatedRef={accumulatedRef}
            resumedAtRef={resumedAtRef}
            runningRef={runningRef}
          />
        </div>
      </div>

      <div className="play-body">
        <div className="word-list" role="list" aria-label="Words to find">
          {puzzle.words.map((entry, i) => (
            <div
              key={entry.word}
              role="listitem"
              className={`word-pill${foundWords.has(entry.word) ? " is-found" : ""}`}
              style={{ "--pill": `var(${wordVar(i)})` }}
            >
              {entry.word}
            </div>
          ))}
        </div>

        <div className="board-frame" ref={frameRef}>
          <div className={`board${entering ? " is-entering" : ""}`} ref={boardRef}>
            <div className="layer layer--tiles" style={layerStyle} aria-hidden="true">
              {puzzle.grid.map((_, i) => (
                <Tile key={i} hinted={hintSet.has(i)} wave={Math.floor(i / size) + (i % size)} />
              ))}
            </div>

            <svg
              className="layer layer--lines"
              viewBox={geo ? `0 0 ${geo.w} ${geo.h}` : undefined}
              aria-hidden="true"
            >
              {found.map((f) =>
                capsule(f.cells, f.word, "wordline wordline--found", `var(${wordVar(f.colorIndex)})`)
              )}
              {selection.length ? capsule(selection, "active", "wordline wordline--active") : null}
            </svg>

            <div
              className="layer layer--letters"
              style={layerStyle}
              ref={lettersRef}
              role="group"
              aria-label="Letter grid. Use arrow keys to move, Enter to start and finish a word."
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onKeyDown={onKeyDown}
            >
              {puzzle.grid.map((letter, i) => (
                <Cell
                  key={i}
                  letter={letter}
                  row={Math.floor(i / size)}
                  col={i % size}
                  active={selectedCells.has(i)}
                  found={foundCells.has(i)}
                  cursor={keyboardMode && cursor.row * size + cursor.col === i}
                  popIndex={poppedOrder.get(i)}
                  wave={Math.floor(i / size) + (i % size)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="play-foot">
        <div className={`foot-progress${found.length ? " is-advanced" : ""}`} key={found.length}>
          <ProgressBar value={total ? found.length / total : 0} />
          <small>{`${found.length} of ${total} found`}</small>
        </div>
        <button
          className={`hint-btn${hint?.nudge ? " is-nudging" : ""}`}
          type="button"
          aria-label={`Hint, costs ${HINT_COST} coins`}
          disabled={found.length >= total || state.profile.coins < HINT_COST}
          onClick={useHintNow}
        >
          <Icon name="bulb" size={20} />
          Hint
          <b>🪙{HINT_COST}</b>
        </button>
      </div>

      {/* Pause */}
      <div
        className={`overlay${paused ? " is-open" : ""}`}
        role="dialog"
        aria-label="Paused"
        aria-hidden={paused ? undefined : "true"}
        inert={!paused}
      >
        <div className="overlay-card">
          <h3>Paused</h3>
          <p className="sub">Take your time — the clock is stopped.</p>
          <div className="overlay-actions">
            <button className="btn btn--primary btn--block btn--lg" type="button" onClick={resume}>
              Resume
            </button>
            <div className="row">
              <button className="btn btn--block" type="button" onClick={() => { resume(); onRestart(); }}>
                Restart
              </button>
              <button className="btn btn--block" type="button" onClick={() => go("settings")}>
                Settings
              </button>
            </div>
            <button
              className="btn btn--ghost btn--block"
              type="button"
              onClick={() => { resume(); go(quitTo); }}
            >
              {`Quit to ${quitLabel.toLowerCase()}`}
            </button>
          </div>
        </div>
      </div>

      {/* Win */}
      <div
        className={`overlay${result ? " is-open" : ""}`}
        role="dialog"
        aria-label="Level complete"
        aria-hidden={result ? undefined : "true"}
        inert={!result}
      >
        <div className="overlay-card">
          <h3>{result?.stars === 3 ? "Perfect!" : "Level complete!"}</h3>
          <p className="sub">{result?.note}</p>

          <div className="star-burst" ref={starsRef}>
            {[0, 1, 2].map((i) => (
              <svg
                key={i}
                viewBox="0 0 24 24"
                aria-hidden="true"
                className={`${i < shownStars ? "shown" : ""} ${result && i < result.stars && i < shownStars ? "lit" : ""}`.trim()}
              >
                <path d={STAR_D} />
              </svg>
            ))}
          </div>

          <div className="rewards">
            <Reward label="Coins" value={result?.reward.coins ?? 0} delay={900} />
            <Reward label="XP" value={result?.reward.xp ?? 0} delay={1050} />
            <div className="reward"><b>{formatTime(result?.ms ?? 0)}</b><small>Time</small></div>
          </div>

          <div className="overlay-actions">
            <button
              className="btn btn--primary btn--block btn--lg"
              type="button"
              onClick={() => (hasNext ? go("play", nextParams) : go(quitTo))}
            >
              {hasNext ? nextLabel : finishLabel}
            </button>
            <div className="row">
              <button className="btn btn--block" type="button" onClick={onRestart}>Replay</button>
              <button className="btn btn--block" type="button" onClick={() => go(quitTo)}>
                {quitLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------------- */
/* Screen wrapper: resolves the level and owns the restart key              */
/* ---------------------------------------------------------------------- */

export default function PlayScreen({ params, active, go, replace }) {
  const [attempt, setAttempt] = useState(0);

  const level = useMemo(() => {
    if (params.pool) return poolLevel(Number(params.pool));
    if (params.daily) return dailyLevel(params.daily);
    return levelAt(Number(params.n) || 1);
  }, [params.daily, params.n, params.pool]);

  // Deep links and the back button can both aim at a level that is still locked.
  const locked = level.isPool
    ? !isPoolUnlocked(level.poolIndex)
    : !level.isDaily && !isUnlocked(level.n);

  useEffect(() => {
    if (!locked || !active) return;
    replace(level.isPool ? "pool" : "map");
    toast(
      level.isPool ? "Clear the ring below this one first" : "That level is still locked",
      "bad"
    );
  }, [locked, active, level.isPool, replace]);

  if (locked) return null;

  return (
    <Level
      key={`${level.id}:${attempt}`}
      level={level}
      active={active}
      go={go}
      onRestart={() => setAttempt((a) => a + 1)}
    />
  );
}
