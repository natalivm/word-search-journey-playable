/**
 * Haptic feedback.
 *
 * navigator.vibrate is Android-only in practice (iOS Safari does not expose
 * it), so this is a progressive enhancement — never a required channel. Every
 * cue it gives is also carried by sound and by something visible on screen.
 */

import { state } from "./store.js";

const can = () => state.settings.haptics && typeof navigator.vibrate === "function";

function buzz(pattern) {
  if (!can()) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Some browsers throw when the page is not visible. Nothing to do.
  }
}

/** Crossing into a new letter mid-drag. Must stay very short. */
export const tapLight = () => buzz(8);

/** Button presses and menu taps. */
export const tapMedium = () => buzz(14);

/** A word was found. */
export const success = () => buzz([18, 40, 26]);

/** A selection spelled nothing. */
export const fail = () => buzz([26, 50, 26]);

/** Level complete. */
export const celebrate = () => buzz([24, 50, 24, 50, 60]);
