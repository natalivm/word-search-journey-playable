/**
 * Render the PWA PNG icons from game/icons/icon.svg.
 *
 * Run after changing the SVG:
 *   node scripts/make-icons.mjs
 *
 * The PNGs are committed so neither the site nor CI needs a build step.
 */

import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

/**
 * Resolve Playwright from the project, or from a global install if someone is
 * running this on a machine that already has the CLI.
 */
async function loadChromium() {
  // A CommonJS build imported from ESM lands on `default`, so check both.
  const pick = (mod) => mod.chromium || mod.default?.chromium;

  try {
    const local = pick(await import("playwright"));
    if (local) return local;
  } catch {
    /* Not a local dependency — try a global install below. */
  }

  let globalRoot = "";
  try {
    globalRoot = execSync("npm root -g", { encoding: "utf8" }).trim();
  } catch {
    globalRoot = "";
  }

  for (const base of [globalRoot, "/opt/node-tools/node_modules"]) {
    const entry = base && join(base, "playwright", "index.js");
    if (entry && existsSync(entry)) {
      const found = pick(await import(pathToFileURL(entry).href));
      if (found) return found;
    }
  }

  throw new Error("Playwright not found. Install it first: npm i -D playwright");
}

const chromium = await loadChromium();

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = join(root, "game", "icons");
const svg = readFileSync(join(iconsDir, "icon.svg"), "utf8");

// A maskable icon must survive the platform cropping it to a circle or
// squircle, so the artwork is inset into the safe zone (80% of the canvas).
const TARGETS = [
  { file: "icon-192.png", size: 192, maskable: false },
  { file: "icon-512.png", size: 512, maskable: false },
  { file: "icon-180.png", size: 180, maskable: false },
  { file: "icon-maskable-512.png", size: 512, maskable: true }
];

const browser = await chromium.launch();

for (const target of TARGETS) {
  const context = await browser.newContext({
    viewport: { width: target.size, height: target.size },
    deviceScaleFactor: 1
  });
  const tab = await context.newPage();

  const inset = target.maskable ? "10%" : "0";
  await tab.setContent(`<!DOCTYPE html>
    <style>
      html, body { margin: 0; width: 100%; height: 100%; }
      body { background: #9de7ec; display: grid; place-items: center; }
      .wrap { width: 100%; height: 100%; padding: ${inset}; box-sizing: border-box; }
      svg { width: 100%; height: 100%; display: block; }
    </style>
    <div class="wrap">${svg}</div>`);

  await tab.screenshot({ path: join(iconsDir, target.file), omitBackground: false });
  await context.close();
  console.log(`wrote ${target.file} (${target.size}x${target.size})`);
}

await browser.close();
