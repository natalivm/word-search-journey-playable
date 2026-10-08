/** Boot the React app. */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/screens.css";
import "./styles/game.css";
import "./styles/pool.css";

import App from "./App.jsx";
import { applyDisplaySettings, watchSystemTheme } from "./lib/theme.js";

applyDisplaySettings();
watchSystemTheme();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Hand over from the boot splash. A splash that flashes is worse than no
// splash, so hold it briefly, then get out of the way.
const boot = document.getElementById("boot");
setTimeout(() => {
  boot?.classList.add("is-done");
  setTimeout(() => boot?.remove(), 600);
}, 320);

// Service workers need a secure context. GitHub Pages is HTTPS; localhost
// counts too, which is what makes the offline path testable before deploying.
const secureContext =
  location.protocol === "https:" ||
  ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);

if ("serviceWorker" in navigator && secureContext) {
  window.addEventListener("load", () => {
    // Relative, so the worker's scope is the directory the game is served
    // from — /<repo>/game/ on Pages, not the domain root.
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // Offline play is a bonus, not a requirement.
    });
  });
}
