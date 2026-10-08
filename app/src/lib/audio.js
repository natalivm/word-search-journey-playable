/**
 * Sound, synthesized with the Web Audio API.
 *
 * No audio files: the whole soundtrack is a few oscillators. That keeps the
 * game installable at a few tens of KB and means nothing has to load before
 * the first level is playable.
 *
 * Mobile browsers refuse to start audio outside a user gesture, so the
 * context is created lazily on the first interaction and resumed if the OS
 * suspends it (returning from a phone call, switching tabs, and so on).
 */

import { state } from "./store.js";

let ctx = null;
let master = null;
let musicGain = null;
let musicTimer = 0;
let musicStep = 0;

function ensure() {
  if (ctx) return ctx;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;

  ctx = new Ctx();
  master = ctx.createGain();
  master.gain.value = 0.3;
  master.connect(ctx.destination);

  musicGain = ctx.createGain();
  musicGain.gain.value = 0;
  musicGain.connect(master);

  return ctx;
}

/** Call from a real user gesture before the first sound is needed. */
export function unlock() {
  const c = ensure();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
}

/** One shaped oscillator note. */
function tone({ freq, dur = 0.12, type = "sine", gain = 0.5, slide = 0, delay = 0, dest }) {
  const c = ensure();
  if (!c) return;

  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const env = c.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);

  // Short attack, exponential tail — reads as "plucked" rather than "beep".
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(env);
  env.connect(dest || master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const on = () => state.settings.sound && ensure();

/* ---------------------------------------------------------------------- */
/* Sound effects                                                           */
/* ---------------------------------------------------------------------- */

/** Each letter dragged over — pitch climbs with the selection length. */
export function sfxTick(index = 0) {
  if (!on()) return;
  tone({ freq: 420 + Math.min(index, 9) * 42, dur: 0.055, type: "triangle", gain: 0.18 });
}

/** A word landed. Rising major triad. */
export function sfxFound(streak = 0) {
  if (!on()) return;
  const root = 523.25 * Math.pow(2, Math.min(streak, 5) / 12);
  [0, 4, 7].forEach((semi, i) => {
    tone({
      freq: root * Math.pow(2, semi / 12),
      dur: 0.2,
      type: "triangle",
      gain: 0.3,
      delay: i * 0.055
    });
  });
}

/** Selection didn't spell anything. Soft, low, over quickly. */
export function sfxMiss() {
  if (!on()) return;
  tone({ freq: 196, dur: 0.14, type: "sine", gain: 0.2, slide: -50 });
}

export function sfxTap() {
  if (!on()) return;
  tone({ freq: 660, dur: 0.05, type: "triangle", gain: 0.16 });
}

export function sfxHint() {
  if (!on()) return;
  tone({ freq: 880, dur: 0.1, type: "sine", gain: 0.22 });
  tone({ freq: 1174, dur: 0.14, type: "sine", gain: 0.2, delay: 0.09 });
}

/** Level cleared — a little fanfare. */
export function sfxWin() {
  if (!on()) return;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
    tone({ freq, dur: 0.34, type: "triangle", gain: 0.34, delay: i * 0.1 });
  });
}

export function sfxStar(index = 0) {
  if (!on()) return;
  tone({ freq: 880 * Math.pow(2, index / 12), dur: 0.26, type: "sine", gain: 0.3 });
}

export function sfxLevelUp() {
  if (!on()) return;
  [392, 523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
    tone({ freq, dur: 0.3, type: "sawtooth", gain: 0.16, delay: i * 0.08 });
  });
}

/* ---------------------------------------------------------------------- */
/* Background music — a slow generative arpeggio, deliberately unobtrusive  */
/* ---------------------------------------------------------------------- */

// A pentatonic scale can't produce a wrong note, so a random walk through it
// stays pleasant indefinitely without needing a composed loop.
const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];

function musicTick() {
  if (!ctx || !state.settings.music) return;

  const note = PENTATONIC[(musicStep * 3 + Math.floor(Math.random() * 3)) % PENTATONIC.length];
  tone({ freq: note, dur: 1.5, type: "sine", gain: 0.5, dest: musicGain });
  if (musicStep % 4 === 0) {
    tone({ freq: note / 2, dur: 2.4, type: "sine", gain: 0.35, dest: musicGain });
  }

  musicStep += 1;
}

export function startMusic() {
  if (!state.settings.music) return;
  const c = ensure();
  if (!c || musicTimer) return;

  musicGain.gain.cancelScheduledValues(c.currentTime);
  musicGain.gain.setValueAtTime(musicGain.gain.value, c.currentTime);
  musicGain.gain.linearRampToValueAtTime(0.16, c.currentTime + 1.5);

  musicTick();
  musicTimer = setInterval(musicTick, 1400);
}

export function stopMusic() {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = 0;
  }
  if (ctx && musicGain) {
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setValueAtTime(musicGain.gain.value, ctx.currentTime);
    musicGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
  }
}

export function syncMusic() {
  if (state.settings.music) startMusic();
  else stopMusic();
}

/** Silence everything while the tab is in the background. */
export function suspendAll() {
  stopMusic();
  if (ctx && ctx.state === "running") ctx.suspend().catch(() => {});
}

export function resumeAll() {
  if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
  syncMusic();
}
