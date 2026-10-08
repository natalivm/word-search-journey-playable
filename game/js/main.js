/**
 * Boot: wire the screens into the router, apply saved settings, and hand off.
 */

import { register, start, go } from "./router.js";
import { applyDisplaySettings, watchSystemTheme } from "./theme.js";
import { state, commitNow } from "./store.js";
import { checkAchievements } from "./achievements.js";
import { $, toast } from "./ui.js";
import * as audio from "./audio.js";

import home from "./screens/home.js";
import map from "./screens/map.js";
import profile from "./screens/profile.js";
import settings from "./screens/settings.js";
import play, { pauseIfPlaying } from "./screens/play.js";

register("home", home);
register("map", map);
register("play", play);
register("profile", profile);
register("settings", settings);

applyDisplaySettings();
watchSystemTheme();

state.meta.launches += 1;
commitNow();

// Badges can be satisfied by data restored from a previous session.
checkAchievements();

start($("#screens"));

/* ---------------------------------------------------------------------- */
/* Lifecycle                                                               */
/* ---------------------------------------------------------------------- */

// Audio can only start from a gesture; the first tap anywhere unlocks it.
const firstGesture = () => {
  audio.unlock();
  audio.syncMusic();
};
window.addEventListener("pointerdown", firstGesture, { once: true });
window.addEventListener("keydown", firstGesture, { once: true });

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pauseIfPlaying();
    audio.suspendAll();
    commitNow();
  } else {
    audio.resumeAll();
  }
});

// iOS can discard a backgrounded tab without ever firing unload.
window.addEventListener("pagehide", commitNow);

/* ---------------------------------------------------------------------- */
/* Install + offline                                                       */
/* ---------------------------------------------------------------------- */

let installPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e;
  // Don't interrupt the first session with an install nag.
  if (state.meta.launches >= 2 && state.stats.levelsCompleted >= 1) {
    setTimeout(() => showInstallOffer(), 4000);
  }
});

function showInstallOffer() {
  if (!installPrompt) return;
  const bar = document.getElementById("installBar");
  if (!bar) return;
  bar.hidden = false;
  bar.querySelector("button[data-act='install']").onclick = async () => {
    bar.hidden = true;
    installPrompt.prompt();
    await installPrompt.userChoice.catch(() => {});
    installPrompt = null;
  };
  bar.querySelector("button[data-act='dismiss']").onclick = () => {
    bar.hidden = true;
    installPrompt = null;
  };
}

window.addEventListener("appinstalled", () => {
  installPrompt = null;
  toast("Installed — play offline any time", "good");
});

if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // Offline play is a bonus, not a requirement.
    });
  });
}

/* ---------------------------------------------------------------------- */
/* Hand over from the boot splash                                          */
/* ---------------------------------------------------------------------- */

const boot = $("#boot");
const reveal = () => {
  boot?.classList.add("is-done");
  setTimeout(() => boot?.remove(), 600);
};

// A splash that flashes is worse than no splash; hold it briefly so the
// transition reads as deliberate, then get out of the way.
if (document.readyState === "complete") setTimeout(reveal, 320);
else window.addEventListener("load", () => setTimeout(reveal, 320));

// Expose a tiny hook for the "play now" deep link from the landing page.
window.addEventListener("hashchange", () => {
  if (!window.location.hash) go("home");
});
