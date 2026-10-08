/**
 * Rewrite the service worker's precache list from the real build output.
 *
 * Vite emits content-hashed filenames, so the list cannot be written by hand.
 * The cache name is derived from the hashes too, which means a redeploy
 * automatically invalidates the old cache and nobody is left on a stale build.
 *
 * Runs as part of `npm run build`.
 */

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

/** Every emitted file, as a path relative to dist. */
function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [relative(dist, full)];
  });
}

const files = walk(dist)
  .filter((f) => f !== "sw.js")
  .map((f) => f.split("\\").join("/"))
  .sort();

// Hash the asset names so the cache key changes whenever the build does.
const hash = createHash("sha256").update(files.join("\n")).digest("hex").slice(0, 10);

const assets = ["./", ...files.map((f) => `./${f}`)];
const swPath = join(dist, "sw.js");
const source = readFileSync(swPath, "utf8");

const updated = source
  .replace(/const CACHE = "[^"]*";/, `const CACHE = "wsj-${hash}";`)
  .replace(
    /\/\* PRECACHE_START \*\/[\s\S]*?\/\* PRECACHE_END \*\//,
    `/* PRECACHE_START */\nconst ASSETS = ${JSON.stringify(assets, null, 2)};\n/* PRECACHE_END */`
  );

if (updated === source) {
  console.error("write-sw-manifest: markers not found in dist/sw.js — precache list not written.");
  process.exit(1);
}

writeFileSync(swPath, updated);
console.log(`Service worker: cache wsj-${hash}, ${assets.length} assets precached.`);
