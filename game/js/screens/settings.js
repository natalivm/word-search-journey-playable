/**
 * Settings.
 *
 * Grouped by what the player is trying to change (sound, look, play, data)
 * rather than by how it is implemented. Every toggle takes effect instantly —
 * there is no save button to forget.
 */

import { el, clear, icon, toast, openSheet } from "../ui.js";
import { state, setSetting, resetProgress } from "../store.js";
import { applyDisplaySettings } from "../theme.js";
import { back } from "../router.js";
import * as audio from "../audio.js";
import * as haptics from "../haptics.js";

const dom = {};

const GROUPS = [
  {
    title: "Sound",
    rows: [
      { key: "sound", label: "Sound effects", hint: "Taps, finds and fanfares" },
      { key: "music", label: "Background music", hint: "A quiet generative loop" },
      { key: "haptics", label: "Vibration", hint: "Where the device supports it" }
    ]
  },
  {
    title: "Display",
    rows: [
      {
        key: "theme",
        label: "Theme",
        hint: "Auto follows your device",
        type: "segment",
        options: [
          { value: "auto", label: "Auto" },
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" }
        ]
      },
      { key: "cvd", label: "Colour-blind palette", hint: "High-separation word colours" },
      { key: "contrast", label: "High contrast", hint: "Stronger tile outlines" },
      { key: "reduceMotion", label: "Reduce motion", hint: "Fewer animations and no confetti" }
    ]
  },
  {
    title: "Gameplay",
    rows: [
      { key: "showTimer", label: "Show timer", hint: "Hide it for a relaxed run" },
      { key: "beginnerHints", label: "Idle nudges", hint: "Free pointer after a long pause" }
    ]
  }
];

function build() {
  const screen = el("section", { "aria-label": "Settings" });

  dom.body = el("div", { class: "screen-body settings-body" });

  screen.append(
    el("div", { class: "topbar" }, [
      el("button", {
        class: "icon-btn", type: "button", "aria-label": "Back",
        onClick: () => { haptics.tapMedium(); audio.sfxTap(); back("home"); }
      }, [icon("back")]),
      el("h2", { text: "Settings" }),
      el("span")
    ]),
    dom.body
  );

  return screen;
}

function toggleRow(row) {
  const on = Boolean(state.settings[row.key]);

  return el("button", {
    class: "set-row",
    type: "button",
    role: "switch",
    "aria-checked": on ? "true" : "false",
    onClick: () => {
      const next = !state.settings[row.key];
      setSetting(row.key, next);
      applyDisplaySettings();
      audio.syncMusic();
      if (next) audio.unlock();
      haptics.tapMedium();
      audio.sfxTap();
      refresh();
    }
  }, [
    el("div", { class: "set-text" }, [
      el("b", { text: row.label }),
      el("small", { text: row.hint })
    ]),
    el("span", { class: `switch ${on ? "is-on" : ""}`, "aria-hidden": "true" }, [el("i")])
  ]);
}

function segmentRow(row) {
  const current = state.settings[row.key];

  const group = el("div", {
    class: "segment",
    role: "radiogroup",
    "aria-label": row.label
  }, row.options.map((option) => el("button", {
    class: `segment-opt ${current === option.value ? "is-on" : ""}`,
    type: "button",
    role: "radio",
    "aria-checked": current === option.value ? "true" : "false",
    text: option.label,
    onClick: () => {
      setSetting(row.key, option.value);
      applyDisplaySettings();
      haptics.tapMedium();
      audio.sfxTap();
      refresh();
    }
  })));

  return el("div", { class: "set-row set-row--static" }, [
    el("div", { class: "set-text" }, [
      el("b", { text: row.label }),
      el("small", { text: row.hint })
    ]),
    group
  ]);
}

function refresh() {
  clear(dom.body);

  for (const group of GROUPS) {
    dom.body.append(
      el("h3", { class: "section-title", text: group.title }),
      el("div", { class: "set-group" }, group.rows.map(
        (row) => (row.type === "segment" ? segmentRow(row) : toggleRow(row))
      ))
    );
  }

  dom.body.append(
    el("h3", { class: "section-title", text: "Data" }),
    el("div", { class: "set-group" }, [
      el("button", {
        class: "set-row set-row--danger",
        type: "button",
        onClick: confirmReset
      }, [
        el("div", { class: "set-text" }, [
          el("b", { text: "Reset progress" }),
          el("small", { text: "Clears levels, stars, coins and badges" })
        ]),
        el("span", { class: "set-chevron", text: "›", "aria-hidden": "true" })
      ])
    ]),
    el("h3", { class: "section-title", text: "About" }),
    el("div", { class: "set-group" }, [
      el("div", { class: "set-row set-row--static" }, [
        el("div", { class: "set-text" }, [
          el("b", { text: "Word Search Journey" }),
          el("small", { text: "Plays offline once loaded. Progress is stored on this device only." })
        ])
      ]),
      el("button", {
        class: "set-row",
        type: "button",
        onClick: showHowToPlay
      }, [
        el("div", { class: "set-text" }, [
          el("b", { text: "How to play" }),
          el("small", { text: "Controls, stars and hints" })
        ]),
        el("span", { class: "set-chevron", text: "›", "aria-hidden": "true" })
      ])
    ])
  );
}

function showHowToPlay() {
  audio.sfxTap();
  haptics.tapMedium();

  const list = el("div", { class: "howto" }, [
    ["👆", "Drag across a run of letters to pick a word. Words read in any of eight directions, forwards or backwards."],
    ["⌨️", "On a keyboard: arrow keys move, Enter starts and finishes a word, Escape cancels."],
    ["⭐", "Three stars means no hints and inside the par time. Replay any level to improve it."],
    ["💡", "A hint costs 25 coins and lights up the first two letters of a word you have not found."]
  ].map(([glyph, text]) => el("div", { class: "howto-row" }, [
    el("span", { class: "howto-icon", text: glyph, "aria-hidden": "true" }),
    el("p", { text })
  ])));

  openSheet({ title: "How to play", body: list, actions: [{ label: "Got it", kind: "primary" }] });
}

function confirmReset() {
  haptics.tapMedium();
  openSheet({
    title: "Reset everything?",
    body: "Your levels, stars, coins, streak and badges will be erased. Your settings stay as they are. This cannot be undone.",
    actions: [
      {
        label: "Reset progress",
        onClick: () => {
          resetProgress();
          applyDisplaySettings();
          haptics.fail();
          toast("Progress reset", "bad");
          refresh();
        }
      },
      { label: "Keep my journey", kind: "primary" }
    ]
  });
}

function mount() {
  refresh();
}

export default { build, mount };
