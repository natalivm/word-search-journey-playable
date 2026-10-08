/** Player profile: identity, stats, achievements. */

import { useState } from "react";
import TopBar from "../components/TopBar.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import { toast } from "../lib/overlays.js";
import {
  state, AVATARS, useStoreVersion, playerLevel, rankTitle,
  starsEarned, starsPossible, commit
} from "../lib/store.js";
import { ACHIEVEMENTS, unlockedCount, isUnlocked } from "../lib/achievements.js";
import { TOTAL_LEVELS } from "../lib/levels.js";
import { formatTime, formatNumber } from "../lib/format.js";
import { useOnDeactivate } from "../lib/hooks.js";
import * as audio from "../lib/audio.js";
import * as haptics from "../lib/haptics.js";

const MAX_NAME = 16;

function Stat({ label, value }) {
  return (
    <div className="stat">
      <b>{value}</b>
      <small>{label}</small>
    </div>
  );
}

function Badge({ achievement }) {
  const unlocked = isUnlocked(achievement.id);
  const [have, need] = achievement.progress();
  const shown = Math.min(have, need);

  return (
    <div
      className={`badge${unlocked ? " is-on" : ""}`}
      aria-label={`${achievement.name}. ${achievement.desc} ${unlocked ? "Unlocked." : `Progress ${shown} of ${need}.`}`}
    >
      <div className="badge-icon">{unlocked ? achievement.icon : "🔒"}</div>
      <div className="badge-meta">
        <b>{achievement.name}</b>
        <small>{achievement.desc}</small>
        {unlocked ? null : <ProgressBar value={have / need} thin />}
        {unlocked ? null : <small className="badge-prog">{`${shown} / ${need}`}</small>}
      </div>
    </div>
  );
}

export default function ProfileScreen({ active, go }) {
  useStoreVersion();
  const [draftName, setDraftName] = useState(state.profile.name);

  const level = playerLevel();
  const stats = state.stats;

  const saveName = () => {
    const next = draftName.trim().slice(0, MAX_NAME) || "Traveller";
    setDraftName(next);
    if (next === state.profile.name) return;
    state.profile.name = next;
    commit();
    toast("Name saved", "good");
  };

  // Commit a half-typed name when the player leaves. Unmount cleanup would
  // never run here — this screen stays mounted once visited.
  useOnDeactivate(active, saveName);

  return (
    <>
      <TopBar
        title="Profile"
        onBack={() => { haptics.tapMedium(); audio.sfxTap(); go("home", {}, "back"); }}
      />

      <div className="screen-body profile-body">
        <div className="card profile-card">
          <div className="profile-avatar">{state.profile.avatar}</div>
          <input
            className="profile-name"
            type="text"
            maxLength={MAX_NAME}
            aria-label="Your name"
            autoComplete="nickname"
            spellCheck="false"
            enterKeyHint="done"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
          />
          <p className="profile-rank">{`Level ${level.level} · ${rankTitle(level.level)}`}</p>
          <ProgressBar value={level.into / level.need} />
          <small className="profile-xp">
            {`${level.into} / ${level.need} XP to level ${level.level + 1}`}
          </small>
        </div>

        <h3 className="section-title">Avatar</h3>
        <div className="avatar-grid" role="radiogroup" aria-label="Choose an avatar">
          {AVATARS.map((avatar) => {
            const selected = state.profile.avatar === avatar;
            return (
              <button
                key={avatar}
                className={`avatar-opt${selected ? " is-on" : ""}`}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`Avatar ${avatar}`}
                onClick={() => {
                  state.profile.avatar = avatar;
                  commit();
                  haptics.tapMedium();
                  audio.sfxTap();
                }}
              >
                {avatar}
              </button>
            );
          })}
        </div>

        <h3 className="section-title">Stats</h3>
        <div className="stat-grid">
          <Stat label="Levels done" value={`${stats.levelsCompleted}/${TOTAL_LEVELS}`} />
          <Stat label="Stars" value={`${starsEarned()}/${starsPossible()}`} />
          <Stat label="Words found" value={formatNumber(stats.wordsFound)} />
          <Stat label="3-star levels" value={String(stats.perfectLevels)} />
          <Stat label="Best level time" value={stats.bestMs ? formatTime(stats.bestMs) : "—"} />
          <Stat label="Time played" value={stats.totalMs ? formatTime(stats.totalMs) : "—"} />
          <Stat label="Hints used" value={String(stats.hintsUsed)} />
          <Stat label="Coins earned" value={formatNumber(stats.coinsEarned)} />
          <Stat label="Daily streak" value={`${state.daily.streak}d`} />
          <Stat label="Best streak" value={`${state.daily.best}d`} />
        </div>

        <h3 className="section-title">
          {"Achievements "}
          <small>{`${unlockedCount()} / ${ACHIEVEMENTS.length}`}</small>
        </h3>
        <div className="badge-grid">
          {ACHIEVEMENTS.map((a) => <Badge key={a.id} achievement={a} />)}
        </div>
      </div>
    </>
  );
}
