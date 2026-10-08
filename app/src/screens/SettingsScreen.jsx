/**
 * Settings.
 *
 * Grouped by what the player is trying to change rather than by how it is
 * implemented. Every control takes effect instantly — there is no save
 * button to forget.
 */

import TopBar from "../components/TopBar.jsx";
import { toast, openSheet } from "../lib/overlays.js";
import { state, useStoreVersion, setSetting, resetProgress } from "../lib/store.js";
import { applyDisplaySettings } from "../lib/theme.js";
import * as audio from "../lib/audio.js";
import * as haptics from "../lib/haptics.js";

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

const HOW_TO_PLAY = [
  ["👆", "Drag across a run of letters to pick a word. Words read in any of eight directions, forwards or backwards."],
  ["⌨️", "On a keyboard: arrow keys move, Enter starts and finishes a word, Escape cancels."],
  ["⭐", "Three stars means no hints and inside the par time. Replay any level to improve it."],
  ["💡", "A hint costs 25 coins and lights up the first two letters of a word you have not found."]
];

function ToggleRow({ row }) {
  const on = Boolean(state.settings[row.key]);

  return (
    <button
      className="set-row"
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => {
        const next = !state.settings[row.key];
        setSetting(row.key, next);
        applyDisplaySettings();
        audio.syncMusic();
        if (next) audio.unlock();
        haptics.tapMedium();
        audio.sfxTap();
      }}
    >
      <div className="set-text">
        <b>{row.label}</b>
        <small>{row.hint}</small>
      </div>
      <span className={`switch${on ? " is-on" : ""}`} aria-hidden="true"><i /></span>
    </button>
  );
}

function SegmentRow({ row }) {
  const current = state.settings[row.key];

  return (
    <div className="set-row set-row--static">
      <div className="set-text">
        <b>{row.label}</b>
        <small>{row.hint}</small>
      </div>
      <div className="segment" role="radiogroup" aria-label={row.label}>
        {row.options.map((option) => (
          <button
            key={option.value}
            className={`segment-opt${current === option.value ? " is-on" : ""}`}
            type="button"
            role="radio"
            aria-checked={current === option.value}
            onClick={() => {
              setSetting(row.key, option.value);
              applyDisplaySettings();
              haptics.tapMedium();
              audio.sfxTap();
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function showHowToPlay() {
  audio.sfxTap();
  haptics.tapMedium();

  openSheet({
    title: "How to play",
    body: (
      <div className="howto">
        {HOW_TO_PLAY.map(([glyph, text]) => (
          <div className="howto-row" key={glyph}>
            <span className="howto-icon" aria-hidden="true">{glyph}</span>
            <p>{text}</p>
          </div>
        ))}
      </div>
    ),
    actions: [{ label: "Got it", kind: "primary" }]
  });
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
        }
      },
      { label: "Keep my journey", kind: "primary" }
    ]
  });
}

export default function SettingsScreen({ go }) {
  useStoreVersion();

  return (
    <>
      <TopBar
        title="Settings"
        onBack={() => { haptics.tapMedium(); audio.sfxTap(); go("home", {}, "back"); }}
      />

      <div className="screen-body settings-body">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <h3 className="section-title">{group.title}</h3>
            <div className="set-group">
              {group.rows.map((row) =>
                row.type === "segment"
                  ? <SegmentRow key={row.key} row={row} />
                  : <ToggleRow key={row.key} row={row} />
              )}
            </div>
          </div>
        ))}

        <h3 className="section-title">Data</h3>
        <div className="set-group">
          <button className="set-row set-row--danger" type="button" onClick={confirmReset}>
            <div className="set-text">
              <b>Reset progress</b>
              <small>Clears levels, stars, coins and badges</small>
            </div>
            <span className="set-chevron" aria-hidden="true">›</span>
          </button>
        </div>

        <h3 className="section-title">About</h3>
        <div className="set-group">
          <div className="set-row set-row--static">
            <div className="set-text">
              <b>Word Search Journey</b>
              <small>Plays offline once loaded. Progress is stored on this device only.</small>
            </div>
          </div>
          <button className="set-row" type="button" onClick={showHowToPlay}>
            <div className="set-text">
              <b>How to play</b>
              <small>Controls, stars and hints</small>
            </div>
            <span className="set-chevron" aria-hidden="true">›</span>
          </button>
        </div>
      </div>
    </>
  );
}
