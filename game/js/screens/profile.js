/**
 * Player profile: identity, stats, achievements.
 */

import { el, clear, icon, toast, formatTime, formatNumber } from "../ui.js";
import {
  state, AVATARS, playerLevel, rankTitle, starsEarned, starsPossible,
  commit, subscribe
} from "../store.js";
import { ACHIEVEMENTS, unlockedCount } from "../achievements.js";
import { TOTAL_LEVELS } from "../levels.js";
import { back } from "../router.js";
import * as audio from "../audio.js";
import * as haptics from "../haptics.js";

const dom = {};
const MAX_NAME = 16;

function build() {
  const screen = el("section", { "aria-label": "Profile" });

  dom.avatarBig = el("div", { class: "profile-avatar" });
  dom.nameInput = el("input", {
    class: "profile-name",
    type: "text",
    maxlength: String(MAX_NAME),
    "aria-label": "Your name",
    autocomplete: "nickname",
    spellcheck: "false",
    enterkeyhint: "done"
  });
  dom.rank = el("p", { class: "profile-rank" });
  dom.xpBar = el("i");
  dom.xpText = el("small", { class: "profile-xp" });

  dom.nameInput.addEventListener("change", saveName);
  dom.nameInput.addEventListener("blur", saveName);
  dom.nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") dom.nameInput.blur();
  });

  dom.avatarGrid = el("div", { class: "avatar-grid", role: "radiogroup", "aria-label": "Choose an avatar" });
  dom.stats = el("div", { class: "stat-grid" });
  dom.badges = el("div", { class: "badge-grid" });
  dom.badgeCount = el("small");

  dom.body = el("div", { class: "screen-body profile-body" }, [
    el("div", { class: "card profile-card" }, [
      dom.avatarBig,
      dom.nameInput,
      dom.rank,
      el("div", { class: "bar" }, [dom.xpBar]),
      dom.xpText
    ]),
    el("h3", { class: "section-title", text: "Avatar" }),
    dom.avatarGrid,
    el("h3", { class: "section-title", text: "Stats" }),
    dom.stats,
    el("h3", { class: "section-title" }, ["Achievements ", dom.badgeCount]),
    dom.badges
  ]);

  screen.append(
    el("div", { class: "topbar" }, [
      el("button", {
        class: "icon-btn", type: "button", "aria-label": "Back",
        onClick: () => { haptics.tapMedium(); audio.sfxTap(); back("home"); }
      }, [icon("back")]),
      el("h2", { text: "Profile" }),
      el("span")
    ]),
    dom.body
  );

  return screen;
}

function saveName() {
  const clean = dom.nameInput.value.trim().slice(0, MAX_NAME);
  const next = clean || "Traveller";
  if (next === state.profile.name) return;
  state.profile.name = next;
  dom.nameInput.value = next;
  commit();
  toast("Name saved", "good");
}

function statCard(label, value) {
  return el("div", { class: "stat" }, [
    el("b", { text: value }),
    el("small", { text: label })
  ]);
}

function refresh() {
  const level = playerLevel();
  const stats = state.stats;

  dom.avatarBig.textContent = state.profile.avatar;
  if (document.activeElement !== dom.nameInput) dom.nameInput.value = state.profile.name;
  dom.rank.textContent = `Level ${level.level} · ${rankTitle(level.level)}`;
  dom.xpBar.style.width = `${(level.into / level.need) * 100}%`;
  dom.xpText.textContent = `${level.into} / ${level.need} XP to level ${level.level + 1}`;

  clear(dom.avatarGrid);
  for (const avatar of AVATARS) {
    const selected = state.profile.avatar === avatar;
    dom.avatarGrid.appendChild(el("button", {
      class: `avatar-opt ${selected ? "is-on" : ""}`,
      type: "button",
      role: "radio",
      "aria-checked": selected ? "true" : "false",
      "aria-label": `Avatar ${avatar}`,
      text: avatar,
      onClick: () => {
        state.profile.avatar = avatar;
        commit();
        haptics.tapMedium();
        audio.sfxTap();
      }
    }));
  }

  clear(dom.stats);
  dom.stats.append(
    statCard("Levels done", `${stats.levelsCompleted}/${TOTAL_LEVELS}`),
    statCard("Stars", `${starsEarned()}/${starsPossible()}`),
    statCard("Words found", formatNumber(stats.wordsFound)),
    statCard("3-star levels", String(stats.perfectLevels)),
    statCard("Best level time", stats.bestMs ? formatTime(stats.bestMs) : "—"),
    statCard("Time played", stats.totalMs ? formatTime(stats.totalMs) : "—"),
    statCard("Hints used", String(stats.hintsUsed)),
    statCard("Coins earned", formatNumber(stats.coinsEarned)),
    statCard("Daily streak", `${state.daily.streak}d`),
    statCard("Best streak", `${state.daily.best}d`)
  );

  dom.badgeCount.textContent = `${unlockedCount()} / ${ACHIEVEMENTS.length}`;

  clear(dom.badges);
  for (const achievement of ACHIEVEMENTS) {
    const unlocked = Boolean(state.achievements[achievement.id]);
    const [have, need] = achievement.progress();
    const pct = Math.min(100, (have / need) * 100);

    dom.badges.appendChild(el("div", {
      class: `badge ${unlocked ? "is-on" : ""}`,
      role: "listitem",
      "aria-label": `${achievement.name}. ${achievement.desc} ${unlocked ? "Unlocked." : `Progress ${Math.min(have, need)} of ${need}.`}`
    }, [
      el("div", { class: "badge-icon", text: unlocked ? achievement.icon : "🔒" }),
      el("div", { class: "badge-meta" }, [
        el("b", { text: achievement.name }),
        el("small", { text: achievement.desc }),
        unlocked
          ? null
          : el("div", { class: "bar bar--thin" }, [el("i", { style: { width: `${pct}%` } })]),
        unlocked ? null : el("small", { class: "badge-prog", text: `${Math.min(have, need)} / ${need}` })
      ])
    ]));
  }
}

let unsubscribe = null;

function mount() {
  refresh();
  unsubscribe = subscribe(refresh);
}

function unmount() {
  saveName();
  unsubscribe?.();
  unsubscribe = null;
}

export default { build, mount, unmount };
