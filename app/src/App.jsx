/**
 * App shell: the screen stack, the install prompt and app-level lifecycle.
 *
 * Screens stay mounted once visited so their scroll position survives a trip
 * to another screen and back, and are cross-faded by CSS. Inactive screens
 * are `inert`, so focus and screen readers never reach them.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter, SCREENS } from "./lib/router.js";
import { state, commitNow } from "./lib/store.js";
import { checkAchievements } from "./lib/achievements.js";
import { toast } from "./lib/overlays.js";
import Overlays from "./components/Overlays.jsx";
import * as audio from "./lib/audio.js";
import { clearParticles } from "./lib/particles.js";

import HomeScreen from "./screens/HomeScreen.jsx";
import MapScreen from "./screens/MapScreen.jsx";
import PlayScreen from "./screens/PlayScreen.jsx";
import ProfileScreen from "./screens/ProfileScreen.jsx";
import SettingsScreen from "./screens/SettingsScreen.jsx";

const COMPONENTS = {
  home: HomeScreen,
  map: MapScreen,
  play: PlayScreen,
  profile: ProfileScreen,
  settings: SettingsScreen
};

/** Stable identity, so an inactive screen's params prop never churns. */
const EMPTY_PARAMS = {};

const LABELS = {
  home: "Home",
  map: "Journey map",
  play: "Puzzle",
  profile: "Profile",
  settings: "Settings"
};

function InstallBar({ prompt, onDone }) {
  return (
    <div id="installBar">
      <p>
        Add to home screen
        <small>Play offline, full screen</small>
      </p>
      <button
        type="button"
        data-act="install"
        onClick={async () => {
          onDone();
          prompt.prompt();
          await prompt.userChoice.catch(() => {});
        }}
      >
        Install
      </button>
      <button type="button" data-act="dismiss" aria-label="Dismiss" onClick={onDone}>
        Not now
      </button>
    </div>
  );
}

export default function App() {
  // `visited` and `params` come from the router: a screen stays mounted once
  // visited, so returning to it restores scroll position — and, for the play
  // screen, the level in progress.
  const { route, params, visited, dir, go, replace } = useRouter();
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  /* -- lifecycle ------------------------------------------------------- */

  useEffect(() => {
    state.meta.launches += 1;
    commitNow();
    // Badges can be satisfied by data restored from a previous session.
    checkAchievements();
  }, []);

  useEffect(() => {
    // Audio can only start from a gesture; the first interaction unlocks it.
    const unlock = () => {
      audio.unlock();
      audio.syncMusic();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    const onVisibility = () => {
      if (document.hidden) {
        audio.suspendAll();
        commitNow();
      } else {
        audio.resumeAll();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // iOS can discard a backgrounded tab without ever firing unload.
    window.addEventListener("pagehide", commitNow);

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", commitNow);
    };
  }, []);

  // Particles belong to the screen that raised them. Screens stay mounted
  // once visited, so a per-screen unmount cleanup would never fire — the
  // change of route is the real signal, and it covers every screen at once.
  useEffect(() => {
    clearParticles();
  }, [route.name]);

  /* -- install prompt --------------------------------------------------- */

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      // Don't interrupt the first session with an install nag.
      if (state.meta.launches >= 2 && state.stats.levelsCompleted >= 1) {
        setTimeout(() => setShowInstall(true), 4000);
      }
    };
    const onInstalled = () => {
      setInstallPrompt(null);
      setShowInstall(false);
      toast("Installed — play offline any time", "good");
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismissInstall = useCallback(() => setShowInstall(false), []);

  return (
    <>
      <div id="screens" data-dir={dir}>
        {SCREENS.filter((name) => visited.has(name)).map((name) => {
          const Screen = COMPONENTS[name];
          const active = route.name === name;
          return (
            <section
              key={name}
              id={`screen-${name}`}
              className={`screen${active ? " is-active" : ""}`}
              aria-label={LABELS[name]}
              aria-hidden={active ? undefined : "true"}
              inert={!active}
            >
              <Screen
                active={active}
                params={params[name] || EMPTY_PARAMS}
                go={go}
                replace={replace}
              />
            </section>
          );
        })}
      </div>

      <Overlays />

      {showInstall && installPrompt
        ? <InstallBar prompt={installPrompt} onDone={dismissInstall} />
        : null}
    </>
  );
}
