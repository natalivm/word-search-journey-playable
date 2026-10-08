/**
 * Home.
 *
 * One obvious primary action — Continue — sized and coloured so a returning
 * player has only one thing to find. Everything else is secondary.
 */

import Icon from "../components/Icon.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import { toast } from "../lib/overlays.js";
import {
  state, useStoreVersion, playerLevel, rankTitle, nextLevelNumber,
  starsEarned, starsPossible, dailyDone
} from "../lib/store.js";
import { levelAt, TOTAL_LEVELS, todayKey } from "../lib/levels.js";
import * as audio from "../lib/audio.js";
import * as haptics from "../lib/haptics.js";

function TileButton({ icon, title, hint, className = "", onClick }) {
  return (
    <button className={`tile-btn ${className}`} type="button" onClick={onClick}>
      <Icon name={icon} size={24} />
      <b>{title}</b>
      <small>{hint}</small>
    </button>
  );
}

export default function HomeScreen({ go }) {
  useStoreVersion();

  const level = playerLevel();
  const next = nextLevelNumber();
  const done = state.stats.levelsCompleted;
  const nextLevel = levelAt(next);
  const allDone = done >= TOTAL_LEVELS;
  const dailyIsDone = dailyDone();

  const tap = (fn) => () => {
    haptics.tapMedium();
    audio.unlock();
    audio.sfxTap();
    fn();
  };

  const playLabel = allDone
    ? "Play again"
    : done === 0
      ? "Start journey"
      : `Continue · ${nextLevel.chapter.name} ${nextLevel.indexInChapter + 1}`;

  return (
    <>
      <div className="home-top">
        <button
          className="player-strip"
          type="button"
          aria-label="Open your profile"
          onClick={tap(() => go("profile"))}
        >
          <div className="home-avatar">{state.profile.avatar}</div>
          <div className="player-strip-main">
            <div className="player-strip-row">
              <b>{state.profile.name}</b>
              <span>{`Lv ${level.level} · ${rankTitle(level.level)}`}</span>
            </div>
            <ProgressBar value={level.into / level.need} />
            <small>{`${level.into} / ${level.need} XP`}</small>
          </div>
          <Icon name="user" size={20} />
        </button>

        <div className="home-wallet">
          <span className="chip chip--coin">🪙<b>{state.profile.coins.toLocaleString()}</b></span>
          <span className="chip chip--streak">🔥<b>{state.daily.streak}</b></span>
        </div>
      </div>

      <div className="screen-body home-body">
        <div className="home-hero">
          <div className="home-mark">W</div>
          <h1 className="home-title">Word Search Journey</h1>
          <p className="home-sub">
            {done
              ? `${done} of ${TOTAL_LEVELS} levels explored`
              : "Ten chapters. Eighty puzzles. One journey."}
          </p>
        </div>

        <button
          className="btn btn--primary btn--block btn--lg home-play"
          type="button"
          onClick={tap(() => go("play", { n: String(next) }))}
        >
          {playLabel}
        </button>

        <div className="home-grid">
          <TileButton
            className={`tile-btn--daily${dailyIsDone ? " is-done" : ""}`}
            icon={dailyIsDone ? "check" : "calendar"}
            title="Daily"
            hint={dailyIsDone ? "Done today ✓" : "Fresh puzzle"}
            onClick={tap(() => {
              if (dailyIsDone) {
                toast("Today's puzzle is done — come back tomorrow", "good");
                return;
              }
              go("play", { daily: todayKey() });
            })}
          />
          <TileButton icon="map" title="Journey" hint="Pick a level" onClick={tap(() => go("map"))} />
          <TileButton icon="trophy" title="Profile" hint="Stats & badges" onClick={tap(() => go("profile"))} />
          <TileButton icon="gear" title="Settings" hint="Sound & display" onClick={tap(() => go("settings"))} />
        </div>

        <p className="home-footnote">
          <Icon name="trophy" size={14} />
          <span>{`${starsEarned()} / ${starsPossible()} stars collected`}</span>
        </p>
      </div>
    </>
  );
}
