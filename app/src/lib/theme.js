/**
 * Display settings -> document attributes.
 *
 * Theme, palette, contrast and motion are all expressed as data-attributes on
 * <html> so the whole cascade in tokens.css flips at once with no re-render.
 */

import { state } from "./store.js";

const media = window.matchMedia?.("(prefers-color-scheme: dark)");

/** The theme actually in force, resolving "auto" against the OS. */
export function effectiveTheme() {
  if (state.settings.theme === "dark") return "dark";
  if (state.settings.theme === "light") return "light";
  return media?.matches ? "dark" : "light";
}

export function applyDisplaySettings() {
  const root = document.documentElement;
  const theme = effectiveTheme();

  root.dataset.theme = theme;
  root.dataset.cvd = state.settings.cvd ? "on" : "off";
  root.dataset.contrast = state.settings.contrast ? "high" : "normal";
  root.dataset.motion = state.settings.reduceMotion ? "reduced" : "full";

  // Keep the browser/OS chrome (status bar, address bar) in step with the app.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#141c2e" : "#9de7ec");
}

/** React to the OS flipping to dark while the game is open. */
export function watchSystemTheme() {
  const onChange = () => {
    if (state.settings.theme === "auto") applyDisplaySettings();
  };
  media?.addEventListener?.("change", onChange);
}
