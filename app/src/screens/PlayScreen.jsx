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
import {
  state, addCoins, spendCoins, addXp, recordLevel, recordDaily,
  countWordFound, recordHintUsed, isUnlocked
} from "../lib/store.js";
import { checkAchievements } from "../lib/achievements.js";
import { formatTime } from "../lib/format.js";
import * as audio from "../lib/audio.js";
import * as haptics from "../lib/haptics.js";

const HINT_COST = 25;
const IDLE_ASSIST_MS = 18000;

/* ---------------------------------------------------------------------- */
/* Board pieces                                                            */
/* ---------------------------------------------------------------------- */

// Memoised on primitives, so a selection change only re-renders the handful
// of cells whose state actually moved, not all 144.
const Tile = memo(function Tile({ hinted }) {
  return <div className={`tile${hinted ? " is-hint" : ""}`} />;
});

const Cell = memo(function Cell({ letter, row, col, active, found, cursor, popped }) {
  return (
    <button
      className={`cell${active ? " is-active" : ""}${found ? " is-found" : ""}${cursor ? " is-cursor" : ""}${popped ? " is-pop" : ""}`}
      type="button"
      tabIndex={row === 0 && col === 0 ? 0 : -1}
      aria-label={`${letter}, row ${row + 1}, column ${col + 1}`}
      data-row={row}
      data-col={col}
    >
      {letter}
    </button>
  );
});

/* ---------------------------------------------------------------------- */
/* One attempt at one level                                                */
/* ---------------------------------------------------------------------- */

function Level({ level, active, go, onRestart }) {
  const puzzle = useMemo(() => generate(level), [level]);
  const size = puzzle.size;

  const [found, setFound] = useState([]);
  const [selection, setSelection] = useState([]);
  const [hintCells, setHintCells] = useState([]);
  const [poppedCells, setPoppedCells] = useState([]);
  const [cursor, setCursor] = useState({ row: 0, col: 0 });
  // The cursor ring is a keyboard affordance; showing it to someone who is
  // dragging with a finger just looks like a stray selected tile.
  const [keyboardMode, setKeyboardMode] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [result, setResult] = useState(null);
  const [shownStars, setShownStars] = useState(0);
  const [geo, setGeo] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  const frameRef = useRef(null);
  const boardRef = useRef(null);
  const lettersRef = useRef(null);

  const anchorRef = useRef(null);
  const draggingRef = useRef(false);
  const accumulatedRef = useRef(0);
  const resumedAtRef = useRef(0);
  const hintsRef = useRef(0);
  const wrongRef = useRef(0);
  const lastEventRef = useRef(0);
  const assistRef = useRef(0);
  const shakeRef = useRef(null);

  const total = puzzle.words.length;
  const isOver = result !== null;
  // Leaving the screen pauses the level by definition, so this is derived
  // rather than stored — no effect has to keep a flag in step with `active`.
  const paused = userPaused || !active;

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

    setGeo({ w, h, cellW: first.offsetWidth, cellH: first.offsetHeight, pts });
    boardRef.current?.style.setProperty(
      "--cell-font",
      `${Math.round(Math.min(first.offsetWidth, first.offsetHeight) * 0.52)}px`
    );
  }, []);

  useLayoutEffect(measure, [measure, size]);

  useEffect(() => {
    const observer = new ResizeObserver(measure);
    if (frameRef.current) observer.observe(frameRef.current);
    return () => observer.disconnect();
  }, [measure]);

  /* -- timer ----------------------------------------------------------- */

  // The clock runs only while this effect is alive. Its cleanup banks the
  // time, so pausing, finishing, leaving the screen and unmounting all settle
  // the elapsed total through one path.
  useEffect(() => {
    if (paused || isOver) return undefined;

    resumedAtRef.current = performance.now();
    if (!lastEventRef.current) lastEventRef.current = performance.now();

    const id = setInterval(() => {
      setElapsed(accumulatedRef.current + (performance.now() - resumedAtRef.current));
    }, 200);

    return () => {
      clearInterval(id);
      accumulatedRef.current += performance.now() - resumedAtRef.current;
    };
  }, [paused, isOver]);

  const pause = useCallback(() => {
    if (isOver) return;
    draggingRef.current = false;
    anchorRef.current = null;
    setSelection([]);
    setUserPaused(true);
    audio.sfxTap();
  }, [isOver]);

  const resume = useCallback(() => setUserPaused(false), []);

  // Never let the clock run while the player is not looking at it.
  useEffect(() => {
    const onHide = () => { if (document.hidden) setUserPaused(true); };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  /* -- idle assist ----------------------------------------------------- */

  const nextUnfound = useCallback(
    () => puzzle.words.find((w) => !found.some((f) => f.word === w.word)),
    [puzzle.words, found]
  );

  useEffect(() => {
    if (!state.settings.beginnerHints || isOver || paused) return undefined;

    assistRef.current = setTimeout(() => {
      const word = puzzle.words.find((w) => !found.some((f) => f.word === w.word));
      if (word) setHintCells([word.cells[0]]);
    }, IDLE_ASSIST_MS);

    return () => clearTimeout(assistRef.current);
  }, [puzzle.words, found, isOver, paused]);

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

  const applySelection = useCallback((path) => {
    setSelection((prev) => {
      if (prev.length !== path.length) {
        if (path.length) audio.sfxTick(path.length - 1);
        if (path.length > prev.length) haptics.tapLight();
        return path;
      }
      const last = path[path.length - 1];
      const prevLast = prev[prev.length - 1];
      if (last && prevLast && (last.row !== prevLast.row || last.col !== prevLast.col)) return path;
      return prev;
    });
  }, []);

  const finishLevel = useCallback((finalFound) => {
    // Read, don't bank: setting `result` tears down the timer effect, whose
    // cleanup adds this same span to the accumulated total.
    const ms = accumulatedRef.current + (performance.now() - resumedAtRef.current);
    const stars = starsFor(level, { seconds: ms / 1000, hintsUsed: hintsRef.current });
    const reward = rewardFor(level, stars);
    const flawless = wrongRef.current === 0 && hintsRef.current === 0;

    let note;
    if (level.isDaily) {
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
    void finalFound;
  }, [level]);

  const acceptWord = useCallback((entry, cells) => {
    const colorIndex = puzzle.words.findIndex((w) => w.word === entry.word);

    setFound((prev) => {
      const next = [...prev, { word: entry.word, cells, colorIndex }];
      if (next.length === puzzle.words.length) setTimeout(() => finishLevel(next), 520);
      return next;
    });

    setHintCells([]);
    setPoppedCells(cells);
    setTimeout(() => setPoppedCells([]), 440);

    audio.sfxFound(found.length);
    haptics.success();
    countWordFound(performance.now() - lastEventRef.current);
    lastEventRef.current = performance.now();

    announce(`${entry.word} found. ${puzzle.words.length - found.length - 1} to go.`);
  }, [puzzle.words, found.length, finishLevel]);

  const commitSelection = useCallback((path) => {
    const text = path.map((p) => letterAt(p.row, p.col)).join("");
    const reversed = text.split("").reverse().join("");

    const match = puzzle.words.find(
      (entry) => !found.some((f) => f.word === entry.word) &&
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

    setSelection([]);
  }, [puzzle.words, found, letterAt, acceptWord]);

  /* -- pointer --------------------------------------------------------- */

  const onPointerDown = useCallback((e) => {
    if (isOver || paused) return;
    const cell = e.target.closest(".cell");
    if (!cell) return;

    e.preventDefault();
    audio.unlock();
    setHintCells([]);
    setKeyboardMode(false);

    const anchor = { row: Number(cell.dataset.row), col: Number(cell.dataset.col) };
    anchorRef.current = anchor;
    draggingRef.current = true;
    setCursor(anchor);
    applySelection([anchor]);

    try {
      lettersRef.current?.setPointerCapture(e.pointerId);
    } catch {
      /* Some browsers reject capture for mouse; the drag still works. */
    }
  }, [isOver, paused, applySelection]);

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

    setSelection((path) => {
      if (path.length) commitSelection(path);
      return [];
    });
  }, [commitSelection]);

  /* -- keyboard -------------------------------------------------------- */

  const onKeyDown = useCallback((e) => {
    if (isOver || paused) return;

    const steps = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

    if (steps[e.key]) {
      e.preventDefault();
      setKeyboardMode(true);
      const [dr, dc] = steps[e.key];
      setCursor((prev) => {
        const next = {
          row: Math.min(size - 1, Math.max(0, prev.row + dr)),
          col: Math.min(size - 1, Math.max(0, prev.col + dc))
        };
        const node = lettersRef.current?.children[next.row * size + next.col];
        node?.focus({ preventScroll: true });
        if (anchorRef.current) applySelection(snapPath(anchorRef.current, next.row, next.col));
        return next;
      });
      return;
    }

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      audio.unlock();
      setKeyboardMode(true);

      if (anchorRef.current) {
        anchorRef.current = null;
        setSelection((path) => {
          if (path.length) commitSelection(path);
          return [];
        });
      } else {
        const cell = e.target.closest(".cell");
        const anchor = cell
          ? { row: Number(cell.dataset.row), col: Number(cell.dataset.col) }
          : cursor;
        anchorRef.current = anchor;
        setCursor(anchor);
        applySelection([anchor]);
        announce("Word started. Use arrow keys to extend, Enter to finish.");
      }
      return;
    }

    if (e.key === "Escape" && anchorRef.current) {
      e.preventDefault();
      anchorRef.current = null;
      setSelection([]);
      announce("Selection cancelled.");
    }
  }, [isOver, paused, size, cursor, applySelection, snapPath, commitSelection]);

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
    setHintCells(cells);
    toast(`${word.word} starts here`, "good");
    announce(`Hint: ${word.word} starts at row ${cells[0].row + 1}, column ${cells[0].col + 1}.`);
    setTimeout(() => setHintCells([]), 6000);
  }, [isOver, nextUnfound]);

  /* -- win sequence ---------------------------------------------------- */

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
        if (i < result.stars) audio.sfxStar(i * 4);
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

    return () => timers.forEach(clearTimeout);
  }, [result]);

  useEffect(() => {
    announce(`${level.title}. Find ${level.wordCount} words.`);
  }, [level]);

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
    () => new Set(hintCells.map((c) => c.row * size + c.col)),
    [hintCells, size]
  );

  const poppedSet = useMemo(
    () => new Set(poppedCells.map((c) => c.row * size + c.col)),
    [poppedCells, size]
  );

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
      />
    );
  };

  const nextN = level.isDaily ? null : level.n + 1;
  const hasNext = Boolean(nextN && nextN <= TOTAL_LEVELS);

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
              : `${level.chapter.icon} Level ${level.n} of ${TOTAL_LEVELS}`}
          </span>
        </div>
        <div className="play-meta">
          <div
            className={`timer${elapsed / 1000 > level.parSeconds ? " is-over" : ""}`}
            role="timer"
            aria-label="Elapsed time"
            hidden={!state.settings.showTimer}
          >
            {formatTime(elapsed)}
          </div>
        </div>
      </div>

      <div className="play-body">
        <div className="word-list" role="list" aria-label="Words to find">
          {puzzle.words.map((entry, i) => (
            <div
              key={entry.word}
              role="listitem"
              className={`word-pill${found.some((f) => f.word === entry.word) ? " is-found" : ""}`}
              style={{ "--pill": `var(--w${(i % 9) + 1})` }}
            >
              {entry.word}
            </div>
          ))}
        </div>

        <div className="board-frame" ref={frameRef}>
          <div className="board" ref={boardRef}>
            <div className="layer layer--tiles" style={layerStyle} aria-hidden="true">
              {puzzle.grid.map((_, i) => <Tile key={i} hinted={hintSet.has(i)} />)}
            </div>

            <svg
              className="layer layer--lines"
              viewBox={geo ? `0 0 ${geo.w} ${geo.h}` : undefined}
              aria-hidden="true"
            >
              {found.map((f) =>
                capsule(f.cells, f.word, "wordline wordline--found", `var(--w${(f.colorIndex % 9) + 1})`)
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
                  popped={poppedSet.has(i)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="play-foot">
        <div className="foot-progress">
          <ProgressBar value={total ? found.length / total : 0} />
          <small>{`${found.length} of ${total} found`}</small>
        </div>
        <button
          className="hint-btn"
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
      <div className={`overlay${paused ? " is-open" : ""}`} role="dialog" aria-label="Paused">
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
            <button className="btn btn--ghost btn--block" type="button" onClick={() => { resume(); go("map"); }}>
              Quit to map
            </button>
          </div>
        </div>
      </div>

      {/* Win */}
      <div className={`overlay${result ? " is-open" : ""}`} role="dialog" aria-label="Level complete">
        <div className="overlay-card">
          <h3>{result?.stars === 3 ? "Perfect!" : "Level complete!"}</h3>
          <p className="sub">{result?.note}</p>

          <div className="star-burst">
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
            <div className="reward"><b>{`+${result?.reward.coins ?? 0}`}</b><small>Coins</small></div>
            <div className="reward"><b>{`+${result?.reward.xp ?? 0}`}</b><small>XP</small></div>
            <div className="reward"><b>{formatTime(result?.ms ?? 0)}</b><small>Time</small></div>
          </div>

          <div className="overlay-actions">
            <button
              className="btn btn--primary btn--block btn--lg"
              type="button"
              onClick={() => (hasNext ? go("play", { n: String(nextN) }) : go(level.isDaily ? "home" : "map"))}
            >
              {hasNext ? "Next level" : level.isDaily ? "Back to home" : "Back to map"}
            </button>
            <div className="row">
              <button className="btn btn--block" type="button" onClick={onRestart}>Replay</button>
              <button className="btn btn--block" type="button" onClick={() => go(level.isDaily ? "home" : "map")}>
                {level.isDaily ? "Home" : "Map"}
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

  const level = useMemo(
    () => (params.daily ? dailyLevel(params.daily) : levelAt(Number(params.n) || 1)),
    [params.daily, params.n]
  );

  // Deep links and the back button can both aim at a level that is still locked.
  const locked = !level.isDaily && !isUnlocked(level.n);

  useEffect(() => {
    if (!locked || !active) return;
    replace("map");
    toast("That level is still locked", "bad");
  }, [locked, active, replace]);

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
