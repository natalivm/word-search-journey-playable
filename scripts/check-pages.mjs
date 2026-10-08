/**
 * Guard the build against GitHub Pages project-path breakage.
 *
 * Pages serves this repo from https://<user>.github.io/<repo>/, not from a
 * domain root, so every asset reference has to be relative. A single
 * absolute "/assets/..." works perfectly on localhost and 404s in
 * production — exactly the kind of bug that only shows up after deploying.
 *
 * The build output is the whole published site, so everything checked here
 * lands at the Pages URL exactly as it appears in dist/.
 *
 *   node scripts/check-pages.mjs
 */

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const problems = [];

if (!existsSync(dist)) {
  console.error("dist/ not found — run `npm run build` first.");
  process.exit(1);
}

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = walk(dist);
const rel = (f) => relative(root, f);

/** The one rule this whole script exists to enforce. */
const isAbsolute = (value) => value.startsWith("/") || /^https?:/i.test(value);

/* -- 1. The entry HTML must not reference anything from the domain root -- */
const html = readFileSync(join(dist, "index.html"), "utf8");
for (const match of html.matchAll(/\b(?:src|href)="(\/[^/"][^"]*)"/g)) {
  problems.push(`dist/index.html references ${match[1]} from the domain root`);
}

/* -- 2. Nor may the CSS ------------------------------------------------- */
for (const file of files.filter((f) => f.endsWith(".css"))) {
  const css = readFileSync(file, "utf8");
  for (const match of css.matchAll(/url\(\s*["']?(\/[^/"')][^"')]*)/g)) {
    problems.push(`${rel(file)} references ${match[1]} from the domain root`);
  }
}

/* -- 3. The manifest must stay relative to wherever it is served -------- */
const manifestPath = join(dist, "manifest.webmanifest");
if (!existsSync(manifestPath)) {
  problems.push("dist/manifest.webmanifest is missing");
} else {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const relativeField = (value, name) => {
    if (typeof value !== "string") return;
    if (isAbsolute(value)) {
      problems.push(`manifest ${name} is "${value}" — must be relative`);
    }
  };

  relativeField(manifest.start_url, "start_url");
  relativeField(manifest.scope, "scope");
  relativeField(manifest.id, "id");
  (manifest.icons || []).forEach((icon, i) => relativeField(icon.src, `icons[${i}].src`));
  (manifest.shortcuts || []).forEach((s, i) => relativeField(s.url, `shortcuts[${i}].url`));

  // Icons must exist where the manifest says they do.
  for (const icon of manifest.icons || []) {
    const target = join(dist, icon.src.replace(/^\.\//, ""));
    if (!existsSync(target)) problems.push(`manifest icon ${icon.src} does not exist in the build`);
  }
}

/* -- 4. The service worker must pre-cache relative URLs only ------------ */
const swPath = join(dist, "sw.js");
if (!existsSync(swPath)) {
  problems.push("dist/sw.js is missing");
} else {
  const sw = readFileSync(swPath, "utf8");
  const block = sw.match(/PRECACHE_START \*\/([\s\S]*?)\/\* PRECACHE_END/);

  if (!block) {
    problems.push("dist/sw.js has no precache block — did the build postStep run?");
  } else {
    const entries = [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    if (!entries.length) problems.push("the service worker precache list is empty");

    for (const entry of entries) {
      if (isAbsolute(entry)) {
        problems.push(`service worker pre-caches ${entry} — must be relative`);
      }
      const target = join(dist, entry.replace(/^\.\//, ""));
      if (entry !== "./" && !existsSync(target)) {
        problems.push(`service worker pre-caches ${entry}, which does not exist`);
      }
    }
  }

  if (/wsj-dev/.test(sw)) {
    problems.push("the service worker cache name was not stamped by the build");
  }
}

/* -- 4b. The registration itself must be relative ----------------------- */
// This lives in the bundled app code, not in sw.js, so it has to be checked
// there — grepping sw.js for it can never match and the guard would pass
// while `register("/sw.js")` silently claimed the whole github.io domain.
const bundles = files.filter((f) => f.endsWith(".js") && f !== swPath);
const registrations = bundles.flatMap((file) => {
  const src = readFileSync(file, "utf8");
  return [...src.matchAll(/serviceWorker\s*\.\s*register\s*\(\s*(["'`])([^"'`]*)\1/g)]
    .map((m) => ({ file, arg: m[2] }));
});

if (!registrations.length) {
  problems.push("no serviceWorker.register() call found in the build — offline play would not work");
}

for (const { file, arg } of registrations) {
  if (isAbsolute(arg)) {
    problems.push(`${rel(file)} registers the service worker as "${arg}" — must be relative`);
  }
}

/* -- 5. Jekyll must be off, or paths starting with _ get dropped -------- */
if (!existsSync(join(root, ".nojekyll"))) {
  problems.push(".nojekyll is missing from the repo root");
}

if (problems.length) {
  console.error(`GitHub Pages compatibility: ${problems.length} problem(s)\n`);
  for (const p of problems) console.error("  " + p);
  console.error("\nEvery asset path must be relative — Pages serves this repo from /<repo>/.");
  process.exit(1);
}

console.log(`GitHub Pages compatibility OK — ${files.length} built files, all paths relative.`);
