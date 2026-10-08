/**
 * Journey map.
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
import { levelsInChapter, LEVELS_PER_CHAPTER } from "../lib/levels.js";
import { state, useStoreVersion, isUnlocked, chapterProgress, starsEarned } from "../lib/store.js";
import * as audio from "../lib/audio.js";
import * as haptics from "../lib/haptics.js";

function LevelNode({ level, onPlay }) {
  const unlocked = isUnlocked(level.n);
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
        "--step": level.indexInChapter
      }}
      onClick={() => onPlay(level, unlocked)}
    >
      <span className="node-num">{unlocked ? level.n : ""}</span>
      {unlocked ? <Stars filled={stars} size={11} /> : <span className="node-lock">🔒</span>}
      {isNext ? <span className="node-ping" aria-hidden="true" /> : null}
    </button>
  );
}

function Chapter({ chapter, index, onPlay, trailRef }) {
  const progress = chapterProgress(index, LEVELS_PER_CHAPTER);
  const levels = levelsInChapter(index);
  const unlocked = isUnlocked(levels[0].n);

  return (
    <section className="chapter" data-chapter={chapter.id}>
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

      <div className="chapter-path" ref={trailRef}>
        <svg className="path-line" aria-hidden="true">
          <polyline />
        </svg>
        {levels.map((level) => (
          <LevelNode key={level.n} level={level} onPlay={onPlay} />
        ))}
      </div>
    </section>
  );
}

export default function MapScreen({ go, back }) {
  const version = useStoreVersion();
  const listRef = useRef(null);
  const pathRefs = useRef([]);

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

  useLayoutEffect(drawTrails, [drawTrails, version]);

  useEffect(() => {
    const observer = new ResizeObserver(drawTrails);
    if (listRef.current) observer.observe(listRef.current);
    return () => observer.disconnect();
  }, [drawTrails]);

  // Land on the level the player is about to attempt, not at the top of a
  // list they have already finished.
  useEffect(() => {
    const target = listRef.current?.querySelector(".node.is-next");
    if (!target || !listRef.current) return;
    const top = target.offsetTop - listRef.current.clientHeight / 2;
    listRef.current.scrollTo({ top: Math.max(0, top), behavior: "auto" });
  }, []);

  return (
    <>
      <TopBar
        title="Journey"
        subtitle="Tap a level to play"
        onBack={() => { haptics.tapMedium(); audio.sfxTap(); back("home"); }}
        trailing={<span className="chip">⭐<b>{starsEarned()}</b></span>}
      />

      <div className="screen-body map-body" ref={listRef}>
        {CHAPTERS.map((chapter, i) => (
          <Chapter
            key={chapter.id}
            chapter={chapter}
            index={i}
            onPlay={onPlay}
            trailRef={(node) => { pathRefs.current[i] = node; }}
          />
        ))}
      </div>
    </>
  );
}
