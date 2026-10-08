/**
 * Pool Party: the event's progression map.
 *
 * Ten floats drift up a pool, ring one at the bottom, the gold ring and the
 * prize at the top — the same "climb to make progress" reading as the journey
 * map, so a player who knows one knows the other.
 *
 * The floats bob. Each one carries its own phase and period through custom
 * properties, so no two are ever in step: a row of rings moving in unison
 * reads as a sprite sheet, and a row moving independently reads as water.
 * The bob lives on an inner element so the press feedback, the arrival
 * animation and the lean along the trail never fight over `transform`.
 *
 * Clearing the tenth ring opens the celebration, which stays owed until it is
 * collected — closing the app on it replays it rather than losing the trophy.
 */

import { useCallback, useEffect, useRef } from "react";
import TopBar from "../components/TopBar.jsx";
import Stars from "../components/Stars.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import Icon from "../components/Icon.jsx";
import { toast, confetti } from "../lib/overlays.js";
import {
  POOL_LEVELS, POOL_PRIZE_COINS, POOL_PRIZE_XP, poolLevels, leanFor
} from "../lib/pool.js";
import {
  state, useStoreVersion, poolUnlockedThrough, poolRingsCleared, poolStars,
  poolStarsPossible, poolAllCleared, poolTrophyWon, claimPoolTrophy
} from "../lib/store.js";
import { checkAchievements } from "../lib/achievements.js";
import { useCountUp, useOnDeactivate } from "../lib/hooks.js";
import { formatNumber } from "../lib/format.js";
import * as audio from "../lib/audio.js";
import * as haptics from "../lib/haptics.js";

// Highest ring first, so ring one ends up at the bottom of the pool.
const DESCENDING = [...poolLevels()].reverse();

/** Props that drift across the water behind the floats. */
const DRIFTERS = [
  { emoji: "🦆", className: "drifter--duck" },
  { emoji: "🏐", className: "drifter--ball" },
  { emoji: "🩴", className: "drifter--flop" }
];

function RingNode({ level, unlocked, isNext, step, onPlay }) {
  const index = level.poolIndex;
  const stars = state.pool.progress[index]?.stars || 0;

  const label = unlocked
    ? `Ring ${index} of ${POOL_LEVELS}${stars ? `, ${stars} of 3 stars` : ", not yet cleared"}`
    : `Ring ${index}, locked`;

  return (
    <button
      className={[
        "ring",
        unlocked ? "" : "is-locked",
        isNext ? "is-next" : "",
        stars ? "is-done" : "",
        level.isFinalRing ? "is-final" : ""
      ].filter(Boolean).join(" ")}
      type="button"
      disabled={!unlocked}
      aria-label={label}
      style={{
        "--ring": level.ring.color,
        "--ring-2": level.ring.shade,
        "--lean": leanFor(index),
        // Period and phase per float, so the row never swims in formation.
        "--bob-dur": `${3.1 + (index % 4) * 0.37}s`,
        "--bob-delay": `${-(index * 0.73).toFixed(2)}s`,
        // Counted from the bottom, so the floats arrive up the trail.
        "--step": step
      }}
      onClick={() => onPlay(level, unlocked)}
    >
      <span className="ring-wake" aria-hidden="true" />

      <span className="ring-float">
        <span className="ring-body">
          {/* The donut is masked into a ring, so everything that has to stay
              visible through the hole is its sibling, not its child. */}
          <span className={`ring-donut${level.ring.segmented ? " is-segmented" : ""}`} />

          {isNext ? (
            <span className="ring-you">
              <span className="ring-you-face">{state.profile.avatar}</span>
              <span className="ring-you-tag">YOU</span>
            </span>
          ) : (
            <span className="ring-hub">
              {unlocked ? index : <span className="ring-lock">🔒</span>}
            </span>
          )}

          {level.isFinalRing && !stars ? (
            <span className="ring-flag">🏁</span>
          ) : null}
        </span>
      </span>

      {stars ? <Stars filled={stars} size={11} /> : null}
    </button>
  );
}

/** The card at the top of the pool: what all ten rings are worth. */
function PrizeCard({ won }) {
  return (
    <div className={`pool-prize${won ? " is-won" : ""}`}>
      <div className="pool-prize-trophy" aria-hidden="true">🏆</div>
      <div className="pool-prize-main">
        <b>{won ? "Grand prize claimed" : "Grand prize"}</b>
        <small>
          {won ? "Rings stay open for better stars" : `Clear all ${POOL_LEVELS} rings`}
        </small>
      </div>
      <div className="pool-prize-value">
        <span className="chip chip--coin">🪙<b>{formatNumber(POOL_PRIZE_COINS)}</b></span>
      </div>
    </div>
  );
}

/** Trophy, rays, prize — shown once the tenth ring falls, until collected. */
function Celebration({ open, onCollect }) {
  const coins = useCountUp(open ? POOL_PRIZE_COINS : 0, { delay: 900, duration: 1100 });
  const xp = useCountUp(open ? POOL_PRIZE_XP : 0, { delay: 1050, duration: 1100 });

  return (
    <div
      className={`overlay pool-celebration${open ? " is-open" : ""}`}
      role="dialog"
      aria-label="Pool Party complete"
      aria-hidden={open ? undefined : "true"}
      inert={!open}
    >
      <div className="overlay-card pool-champion-card">
        <div className="trophy-stage" aria-hidden="true">
          <span className="trophy-rays" />
          <span className="trophy-splash" />
          <span className="trophy">🏆</span>
        </div>

        <h3>Pool Party Champion!</h3>
        <p className="sub">{`All ${POOL_LEVELS} rings cleared — the hardest boards in the game.`}</p>

        <div className="rewards">
          <div className="reward"><b>{formatNumber(coins)}</b><small>Coins</small></div>
          <div className="reward"><b>{formatNumber(xp)}</b><small>XP</small></div>
          <div className="reward"><b>🏆</b><small>Trophy</small></div>
        </div>

        <button
          className="btn btn--primary btn--block btn--lg"
          type="button"
          onClick={onCollect}
        >
          Collect the prize
        </button>
      </div>
    </div>
  );
}

export default function PoolScreen({ active, go }) {
  useStoreVersion();
  const bodyRef = useRef(null);

  const through = poolUnlockedThrough();
  const cleared = poolRingsCleared();
  const won = poolTrophyWon();
  // Derived, not stored: the celebration is owed for as long as the trophy is
  // unclaimed, so a player who closes the app on it gets it again rather than
  // losing it. Collecting clears the debt, which closes the overlay by itself.
  // Its entrance waits for the screen to arrive — that delay is in the CSS,
  // where it costs no state and no timer.
  const celebrating = active && poolAllCleared() && !won;

  const onPlay = useCallback((level, unlocked) => {
    if (!unlocked) {
      toast("Clear the ring below this one first", "bad");
      haptics.fail();
      return;
    }
    haptics.tapMedium();
    audio.unlock();
    audio.sfxTap();
    go("play", { pool: String(level.poolIndex) });
  }, [go]);

  // Open on the ring about to be played — the bottom of the pool for a new
  // challenger, somewhere up the water later on.
  useEffect(() => {
    const container = bodyRef.current;
    const target = container?.querySelector(".ring.is-next") || container?.querySelector(".ring.is-final");
    if (!active || !container || !target) return;

    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const top =
      container.scrollTop +
      (targetRect.top - containerRect.top) -
      container.clientHeight / 2 +
      targetRect.height / 2;

    container.scrollTo({ top: Math.max(0, top), behavior: "auto" });
  }, [active, through]);

  // Sound and confetti ride the overlay's own entrance, and leaving the
  // screen mid-celebration cancels them.
  useEffect(() => {
    if (!celebrating) return undefined;

    const id = setTimeout(() => {
      audio.unlock();
      audio.sfxWin();
      haptics.celebrate();
      confetti(110);
    }, 520);

    return () => clearTimeout(id);
  }, [celebrating]);

  // Held so leaving the screen takes the rest of the payout fanfare with it.
  const prizeTimersRef = useRef([]);

  const collect = useCallback(() => {
    const prize = claimPoolTrophy();
    if (!prize) return;

    audio.sfxStar(0);
    haptics.celebrate();
    confetti(70);
    toast(`🏆 Trophy won — ${formatNumber(prize.coins)} coins`, "good");

    const timers = [];
    if (prize.leveledUp) timers.push(setTimeout(() => audio.sfxLevelUp(), 700));
    checkAchievements().forEach((achievement, i) => {
      timers.push(setTimeout(
        () => toast(`${achievement.icon} ${achievement.name}`, "good"),
        900 + i * 700
      ));
    });
    prizeTimersRef.current = timers;
  }, []);

  useOnDeactivate(active, () => {
    prizeTimersRef.current.forEach(clearTimeout);
    prizeTimersRef.current = [];
  });

  return (
    <>
      {/* The surface itself: behind everything, and it does not scroll with
          the floats, because it is the pool rather than the content. */}
      <div className="pool-water" aria-hidden="true">
        <span className="pool-caustic pool-caustic--a" />
        <span className="pool-caustic pool-caustic--b" />
        {DRIFTERS.map((drifter) => (
          <span key={drifter.className} className={`drifter ${drifter.className}`}>
            {drifter.emoji}
          </span>
        ))}
      </div>

      <TopBar
        title="Pool Party"
        subtitle={`${POOL_LEVELS} very hard puzzles`}
        onBack={() => { haptics.tapMedium(); audio.sfxTap(); go("home", {}, "back"); }}
        trailing={
          <span className="chip">
            {won ? "🏆" : "🛟"}<b>{`${cleared}/${POOL_LEVELS}`}</b>
          </span>
        }
      />

      <div className="pool-progress">
        <ProgressBar value={cleared / POOL_LEVELS} />
        <small>
          <Icon name="trophy" size={13} />
          {`${poolStars()} / ${poolStarsPossible()} stars`}
        </small>
      </div>

      <div className="screen-body pool-body" ref={bodyRef}>
        <PrizeCard won={won} />

        <div className="pool-trail">
          {DESCENDING.map((level, i) => (
            <RingNode
              key={level.poolIndex}
              level={level}
              unlocked={level.poolIndex <= through}
              isNext={level.poolIndex === through && !state.pool.progress[level.poolIndex]?.stars}
              step={DESCENDING.length - 1 - i}
              onPlay={onPlay}
            />
          ))}
        </div>

        <div className="pool-deck">
          <p>Every ring uses all eight directions and nothing under five letters.</p>
          <span aria-hidden="true">🌴🍹🩱</span>
        </div>
      </div>

      <Celebration open={celebrating} onCollect={collect} />
    </>
  );
}
