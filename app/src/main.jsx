/** Boot the React app. */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/screens.css";
import "./styles/game.css";

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

if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // Offline play is a bonus, not a requirement.
    });
  });
}
