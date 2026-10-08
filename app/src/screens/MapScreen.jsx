/**
 * Journey map.
 *
 * The journey climbs: level 1 sits at the very bottom and the last chapter is
 * at the top, so scrolling up is making progress. That means the DOM is built
 * in reverse — last chapter first, and within each chapter the highest level
 * first — and each chapter's header sits *below* its levels, so climbing past
 * it reads as arriving at that chapter.
 *
 * Levels run along a winding trail, joined by a dashed line measured from the
 * laid-out nodes — so changing the node size, gap or lean can't leave the
 * line pointing at nothing.
 */

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import TopBar from "../components/TopBar.jsx";
import Stars from "../components/Stars.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import { toast } from "../lib/overlays.js";
import { CHAPTERS } from "../lib/words.js";
import { levelsInChapter } from "../lib/levels.js";
import { state, useStoreVersion, unlockedThrough, chapterProgress, starsEarned } from "../lib/store.js";
import * as audio from "../lib/audio.js";
import * as haptics from "../lib/haptics.js";

function LevelNode({ level, unlocked, step, onPlay }) {
  const stars = state.progress[level.n]?.stars || 0;
  const isNext = unlocked && !stars;

  const label = unlocked
    ? `Level ${level.n}, ${level.title}${stars ? `, ${stars} of 3 stars` : ", not yet played"}`
    : `Level ${level.n}, locked`;

  return (
    <button
      className={`node${unlocked ? "" : " is-locked"}${isNext ? " is-next" : ""}${stars ? " is-done" : ""}`}
      type="button"
      disabled={!unlocked}
      aria-label={label}
      style={{
        "--lean": level.indexInChapter % 2 ? 1 : -1,
        // Counted from the bottom, so the arrival animation climbs with the
        // trail rather than running against it.
        "--step": step
      }}
      onClick={() => onPlay(level, unlocked)}
    >
      <span className="node-num">{unlocked ? level.n : ""}</span>
      {unlocked ? <Stars filled={stars} size={11} /> : <span className="node-lock">🔒</span>}
      {isNext ? <span className="node-ping" aria-hidden="true" /> : null}
    </button>
  );
}

function Chapter({ chapter, index, through, onPlay, trailRef }) {
  const progress = chapterProgress(index);
  const levels = levelsInChapter(index);
  const unlocked = levels[0].n <= through;

  // Highest level first in the DOM, so level 1 ends up at the bottom.
  const climbing = [...levels].reverse();

  return (
    <section className="chapter" data-chapter={chapter.id}>
      <div className="chapter-path" ref={trailRef}>
        <svg className="path-line" aria-hidden="true">
          <polyline />
        </svg>
        {climbing.map((level, i) => (
          <LevelNode
            key={level.n}
            level={level}
            unlocked={level.n <= through}
            step={climbing.length - 1 - i}
            onPlay={onPlay}
          />
        ))}
      </div>

      {/* Below its levels: going up, you meet the banner as you enter. */}
      <div className={`chapter-head${unlocked ? "" : " is-locked"}`}>
        <div className="chapter-icon">{chapter.icon}</div>
        <div className="chapter-meta">
          <b>{chapter.name}</b>
          <small>{unlocked ? chapter.blurb : "Locked — keep going to reach it"}</small>
          <ProgressBar value={progress.stars / progress.maxStars} />
        </div>
        <div className="chapter-score">
          <b>{progress.stars}</b>
          <small>{`/ ${progress.maxStars}`}</small>
        </div>
      </div>
    </section>
  );
}

export default function MapScreen({ go }) {
  useStoreVersion();
  const listRef = useRef(null);
  const pathRefs = useRef([]);
  // Scanned once per render, not once per node — it walks the whole
  // progress object, and there are 80 nodes.
  const through = unlockedThrough();

  const onPlay = useCallback((level, unlocked) => {
    if (!unlocked) {
      toast("Finish the level before this one first", "bad");
      haptics.fail();
      return;
    }
    haptics.tapMedium();
    audio.unlock();
    audio.sfxTap();
    go("play", { n: String(level.n) });
  }, [go]);

  /** Join the level nodes with a dashed trail, measured after layout. */
  const drawTrails = useCallback(() => {
    for (const path of pathRefs.current) {
      if (!path) continue;
      const svg = path.querySelector(".path-line");
      const polyline = svg?.querySelector("polyline");
      if (!polyline) continue;

      const base = path.getBoundingClientRect();
      if (!base.width || !base.height) continue;

      svg.setAttribute("viewBox", `0 0 ${base.width} ${base.height}`);

      // Rects, not offsets: the lean is a transform, which offsetLeft ignores.
      polyline.setAttribute(
        "points",
        [...path.querySelectorAll(".node")]
          .map((node) => {
            const r = node.getBoundingClientRect();
            return `${r.left - base.left + r.width / 2},${r.top - base.top + r.height / 2}`;
          })
          .join(" ")
      );
    }
  }, []);

  // Deliberately not keyed on the store version: every found word bumps it,
  // and re-measuring 10 chapters x 9 rects on a hidden screen costs ~88
  // forced layout reads per word. Trails only move when the layout does,
  // which the ResizeObserver below already covers.
  useLayoutEffect(drawTrails, [drawTrails]);

  useEffect(() => {
    const observer = new ResizeObserver(drawTrails);
    if (listRef.current) observer.observe(listRef.current);
    return () => observer.disconnect();
  }, [drawTrails]);

  // Land on the level the player is about to attempt. For a new player that
  // is level 1 at the very bottom; later it is somewhere up the climb.
  useEffect(() => {
    const container = listRef.current;
    const target = container?.querySelector(".node.is-next");
    if (!container || !target) return;

    // Rects, not offsetTop: a node's offsetParent is its .chapter-path (which
    // is positioned), so offsetTop is measured from the chapter, not from the
    // scroll container — it would clamp to 0 and always open at chapter one.
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const top =
      container.scrollTop +
      (targetRect.top - containerRect.top) -
      container.clientHeight / 2 +
      targetRect.height / 2;

    container.scrollTo({ top: Math.max(0, top), behavior: "auto" });
  }, []);

  return (
    <>
      <TopBar
        title="Journey"
        subtitle="Tap a level to play"
        onBack={() => { haptics.tapMedium(); audio.sfxTap(); go("home", {}, "back"); }}
        trailing={<span className="chip">⭐<b>{starsEarned()}</b></span>}
      />

      <div className="screen-body map-body" ref={listRef}>
        {/* Last chapter first, so chapter one lands at the bottom. */}
        {[...CHAPTERS].reverse().map((chapter, i) => {
          const index = CHAPTERS.length - 1 - i;
          return (
            <Chapter
              key={chapter.id}
              chapter={chapter}
              index={index}
              through={through}
              onPlay={onPlay}
              trailRef={(node) => { pathRefs.current[index] = node; }}
            />
          );
        })}
      </div>
    </>
  );
}
