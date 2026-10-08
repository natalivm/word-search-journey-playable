/**
 * Home screen.
 *
 * One obvious primary action — Continue — sized and coloured so it is the
 * only thing a returning player has to find. Everything else is secondary.
 */

import { el, clear, icon, toast } from "../ui.js";
import {
  state, playerLevel, rankTitle, nextLevelNumber, starsEarned, starsPossible,
  dailyDone, subscribe
} from "../store.js";
import { levelAt, TOTAL_LEVELS, todayKey } from "../levels.js";
import { go } from "../router.js";
import * as audio from "../audio.js";
import * as haptics from "../haptics.js";

const dom = {};

function build() {
  const screen = el("section", { "aria-label": "Home" });

  dom.avatar = el("div", { class: "home-avatar" });
  dom.name = el("b");
  dom.rank = el("span");
  dom.xpBar = el("i");
  dom.xpText = el("small");

  const playerCard = el("button", {
    class: "player-strip",
    type: "button",
    "aria-label": "Open your profile",
    onClick: () => {
      haptics.tapMedium();
      audio.sfxTap();
      go("profile");
    }
  }, [
    dom.avatar,
    el("div", { class: "player-strip-main" }, [
      el("div", { class: "player-strip-row" }, [dom.name, dom.rank]),
      el("div", { class: "bar" }, [dom.xpBar]),
      dom.xpText
    ]),
    icon("user", 20)
  ]);

  dom.coins = el("span", { class: "chip chip--coin" }, ["🪙", el("b", { text: "0" })]);
  dom.streak = el("span", { class: "chip chip--streak" }, ["🔥", el("b", { text: "0" })]);

  dom.heroTitle = el("h1", { class: "home-title", text: "Word Search Journey" });
  dom.heroSub = el("p", { class: "home-sub" });

  dom.playBtn = el("button", {
    class: "btn btn--primary btn--block btn--lg home-play",
    type: "button",
    onClick: () => {
      haptics.tapMedium();
      audio.unlock();
      audio.sfxTap();
      go("play", { n: String(nextLevelNumber()) });
    }
  });

  dom.dailyBtn = el("button", {
    class: "tile-btn tile-btn--daily",
    type: "button",
    onClick: () => {
      haptics.tapMedium();
      audio.unlock();
      audio.sfxTap();
      if (dailyDone()) {
        toast("Today's puzzle is done — come back tomorrow", "good");
        return;
      }
      go("play", { daily: todayKey() });
    }
  });

  const mapBtn = el("button", {
    class: "tile-btn", type: "button",
    onClick: () => { haptics.tapMedium(); audio.sfxTap(); go("map"); }
  }, [icon("map", 24), el("b", { text: "Journey" }), el("small", { text: "Pick a level" })]);

  const profileBtn = el("button", {
    class: "tile-btn", type: "button",
    onClick: () => { haptics.tapMedium(); audio.sfxTap(); go("profile"); }
  }, [icon("trophy", 24), el("b", { text: "Profile" }), el("small", { text: "Stats & badges" })]);

  const settingsBtn = el("button", {
    class: "tile-btn", type: "button",
    onClick: () => { haptics.tapMedium(); audio.sfxTap(); go("settings"); }
  }, [icon("gear", 24), el("b", { text: "Settings" }), el("small", { text: "Sound & display" })]);

  dom.starTotal = el("span");

  screen.append(
    el("div", { class: "home-top" }, [playerCard, el("div", { class: "home-wallet" }, [dom.coins, dom.streak])]),
    el("div", { class: "screen-body home-body" }, [
      el("div", { class: "home-hero" }, [
        el("div", { class: "home-mark", text: "W" }),
        dom.heroTitle,
        dom.heroSub
      ]),
      dom.playBtn,
      el("div", { class: "home-grid" }, [dom.dailyBtn, mapBtn, profileBtn, settingsBtn]),
      el("p", { class: "home-footnote" }, [icon("trophy", 14), dom.starTotal])
    ])
  );

  return screen;
}

function refresh() {
  const level = playerLevel();
  const next = nextLevelNumber();
  const done = state.stats.levelsCompleted;

  dom.avatar.textContent = state.profile.avatar;
  dom.name.textContent = state.profile.name;
  dom.rank.textContent = `Lv ${level.level} · ${rankTitle(level.level)}`;
  dom.xpBar.style.width = `${(level.into / level.need) * 100}%`;
  dom.xpText.textContent = `${level.into} / ${level.need} XP`;

  dom.coins.lastChild.textContent = state.profile.coins.toLocaleString();
  dom.streak.lastChild.textContent = String(state.daily.streak);

  dom.heroSub.textContent = done
    ? `${done} of ${TOTAL_LEVELS} levels explored`
    : "Ten chapters. Eighty puzzles. One journey.";

  const levelInfo = levelAt(next);
  const allDone = done >= TOTAL_LEVELS;
  dom.playBtn.textContent = allDone
    ? "Play again"
    : done === 0 ? "Start journey" : `Continue · ${levelInfo.chapter.name} ${levelInfo.indexInChapter + 1}`;

  clear(dom.dailyBtn);
  const dailyIsDone = dailyDone();
  dom.dailyBtn.classList.toggle("is-done", dailyIsDone);
  dom.dailyBtn.append(
    icon(dailyIsDone ? "check" : "calendar", 24),
    el("b", { text: "Daily" }),
    el("small", { text: dailyIsDone ? "Done today ✓" : "Fresh puzzle" })
  );

  dom.starTotal.textContent = `${starsEarned()} / ${starsPossible()} stars collected`;
}

let unsubscribe = null;

function mount() {
  refresh();
  unsubscribe = subscribe(refresh);
}

function unmount() {
  unsubscribe?.();
  unsubscribe = null;
}

export default { build, mount, unmount };
