/**
 * Journey map.
 *
 * Levels run bottom-to-top along a winding path, the way map screens in this
 * genre usually do, so "up" reads as progress. The list is rendered newest
 * chapter last and auto-scrolled to wherever the player left off.
 */

import { el, clear, icon, starRow, toast } from "../ui.js";
import { CHAPTERS } from "../words.js";
import { levelsInChapter, LEVELS_PER_CHAPTER } from "../levels.js";
import { state, isUnlocked, chapterProgress, subscribe } from "../store.js";
import { go, back } from "../router.js";
import * as audio from "../audio.js";
import * as haptics from "../haptics.js";

const dom = {};

function build() {
  const screen = el("section", { "aria-label": "Journey map" });

  dom.list = el("div", { class: "screen-body map-body" });
  dom.starCount = el("span", { class: "chip" }, ["⭐", el("b", { text: "0" })]);

  screen.append(
    el("div", { class: "topbar" }, [
      el("button", {
        class: "icon-btn", type: "button", "aria-label": "Back",
        onClick: () => { haptics.tapMedium(); audio.sfxTap(); back("home"); }
      }, [icon("back")]),
      el("h2", {}, ["Journey", el("span", { class: "sub", text: "Tap a level to play" })]),
      dom.starCount
    ]),
    dom.list
  );

  return screen;
}

function levelNode(level) {
  const unlocked = isUnlocked(level.n);
  const record = state.progress[level.n];
  const stars = record?.stars || 0;
  const isNext = unlocked && !stars;

  const node = el("button", {
    class: `node ${unlocked ? "" : "is-locked"} ${isNext ? "is-next" : ""} ${stars ? "is-done" : ""}`,
    type: "button",
    disabled: !unlocked,
    "aria-label": unlocked
      ? `Level ${level.n}, ${level.title}${stars ? `, ${stars} of 3 stars` : ", not yet played"}`
      : `Level ${level.n}, locked`,
    style: { "--lean": `${level.indexInChapter % 2 ? 1 : -1}` },
    onClick: () => {
      if (!unlocked) {
        toast("Finish the level before this one first", "bad");
        haptics.fail();
        return;
      }
      haptics.tapMedium();
      audio.unlock();
      audio.sfxTap();
      go("play", { n: String(level.n) });
    }
  });

  node.append(
    el("span", { class: "node-num", text: unlocked ? String(level.n) : "" }),
    unlocked ? starRow(stars, 11) : el("span", { class: "node-lock", text: "🔒" })
  );

  if (isNext) node.append(el("span", { class: "node-ping", "aria-hidden": "true" }));
  return node;
}

function chapterNode(chapter, index) {
  const progress = chapterProgress(index, LEVELS_PER_CHAPTER);
  const levels = levelsInChapter(index);
  const unlocked = isUnlocked(levels[0].n);

  const head = el("div", { class: `chapter-head ${unlocked ? "" : "is-locked"}` }, [
    el("div", { class: "chapter-icon", text: chapter.icon }),
    el("div", { class: "chapter-meta" }, [
      el("b", { text: chapter.name }),
      el("small", { text: unlocked ? chapter.blurb : "Locked — keep going to reach it" }),
      el("div", { class: "bar" }, [
        el("i", { style: { width: `${(progress.stars / progress.maxStars) * 100}%` } })
      ])
    ]),
    el("div", { class: "chapter-score" }, [
      el("b", { text: `${progress.stars}` }),
      el("small", { text: `/ ${progress.maxStars}` })
    ])
  ]);

  const trail = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  trail.setAttribute("class", "path-line");
  trail.setAttribute("aria-hidden", "true");
  trail.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "polyline"));

  const path = el("div", { class: "chapter-path" }, [trail, ...levels.map(levelNode)]);
  return el("section", { class: "chapter", dataset: { chapter: chapter.id } }, [head, path]);
}

/**
 * Join the level nodes with a dashed trail.
 *
 * Measured from the laid-out nodes rather than hard-coded, so changing the
 * node size, the gap or the lean can't leave the line pointing at nothing.
 */
function drawTrails() {
  for (const path of dom.list.querySelectorAll(".chapter-path")) {
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
}

function refresh() {
  clear(dom.list);
  CHAPTERS.forEach((chapter, i) => dom.list.appendChild(chapterNode(chapter, i)));
  dom.starCount.lastChild.textContent = String(
    Object.values(state.progress).reduce((sum, p) => sum + (p?.stars || 0), 0)
  );

  requestAnimationFrame(drawTrails);
}

let unsubscribe = null;
let resizeObserver = null;

function mount() {
  refresh();

  resizeObserver = new ResizeObserver(drawTrails);
  resizeObserver.observe(dom.list);

  // Land on the level the player is about to attempt, not at the top of a
  // list they have already finished.
  requestAnimationFrame(() => {
    const target = dom.list.querySelector(".node.is-next") ||
      dom.list.querySelector(`.node:not(.is-locked):nth-last-of-type(1)`);
    if (target) {
      const top = target.offsetTop - dom.list.clientHeight / 2;
      dom.list.scrollTo({ top: Math.max(0, top), behavior: "auto" });
    }
  });

  unsubscribe = subscribe(refresh);
}

function unmount() {
  unsubscribe?.();
  unsubscribe = null;
  resizeObserver?.disconnect();
  resizeObserver = null;
}

export default { build, mount, unmount };
