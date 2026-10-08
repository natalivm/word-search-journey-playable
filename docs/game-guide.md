# Word Search Journey — Game Guide

The game is a React app built with Vite. It is installable and plays offline.

```bash
npm install
npm run dev       # dev server with hot reload, http://localhost:5173
npm run build     # production build into dist/
npm run check     # lint + verify levels + build, same as CI
```

Published at `<pages-url>/game/`. CI builds it; `dist/` is not committed.

## What is in it

| Screen | Purpose |
| --- | --- |
| Home | Player strip, wallet, one primary **Continue** action, daily puzzle |
| Journey map | 10 chapters x 8 levels on a winding trail, with stars and locks |
| Play | The puzzle board, word list, timer, hints, pause |
| Profile | Avatar, name, 10 lifetime stats, 12 achievements |
| Settings | Sound, display and accessibility options, reset |

Plus a daily puzzle, seeded by date, that keeps a streak.

## Architecture

```text
index.html               the landing page (plain static, never built)
vite.config.js           root is app/, so the landing page stays untouched
app/
  index.html             app shell + pre-paint theme script
  public/                copied verbatim into the build
    manifest.webmanifest
    sw.js                offline pre-cache (list written at build time)
    icons/
  src/
    main.jsx             mount, styles, service worker registration
    App.jsx              screen stack, lifecycle, install prompt
    components/
      Icon.jsx  Stars.jsx  ProgressBar.jsx  TopBar.jsx  Overlays.jsx
    screens/
      HomeScreen.jsx  MapScreen.jsx  PlayScreen.jsx
      ProfileScreen.jsx  SettingsScreen.jsx
    lib/                 framework-agnostic; no JSX, mostly no React
      router.js          useRouter: hash routing, history, per-screen params
      store.js           save file, derived values, mutations, useStore
      overlays.js        toasts, sheet, confetti, live region
      theme.js           settings -> <html> data-attributes
      format.js          time and number formatting
      rng.js             seeded PRNG (mulberry32)
      words.js           10 themed word packs + filler letter frequencies
      levels.js          difficulty curve, star thresholds, rewards
      generator.js       backtracking word placement
      achievements.js    badge definitions and checks
      audio.js           synthesized SFX and music (no audio files)
      haptics.js         navigator.vibrate wrapper
    styles/              tokens.css base.css screens.css game.css
```

Everything in `lib/` except `router.js` and `store.js` is plain JavaScript with
no React import, so the game rules can be tested in Node — which is exactly
what `scripts/verify-levels.mjs` does.

### Levels are generated, not authored

A level is a *description* — size, word count, allowed directions, par time —
derived from its number by `levelAt(n)` in `lib/levels.js`. The board itself is
built on demand by `lib/generator.js` from a seed string (`wsj-v1-<chapter>-<n>`),
so the same level number always yields the same grid on every device without
shipping 80 hand-made boards.

Placement is a backtracking search. Words go in longest-first, and candidate
placements are sorted to prefer overlapping an already-placed word, which is
what makes a grid feel dense rather than like words scattered on noise. Empty
cells are filled using English letter frequencies — uniform random letters
make the hidden words stand out.

`scripts/verify-levels.mjs` generates all 80 levels plus a year of daily
puzzles and asserts every word actually reads off the board along a straight
line within bounds. CI runs it on every push.

### The difficulty curve

Tuned in one place, in `lib/levels.js`:

| Levels | Grid | Words | Directions |
| --- | --- | --- | --- |
| 1-3 | 7x7 | 4 | → ↓ |
| 4-8 | 7x7 | 4 | → ↓ ↘ |
| 9-16 | 8x8 | 4-5 | + ← ↑ |
| 17-32 | 8-9 | 5-7 | + ↗ ↙ |
| 33-80 | 9-12 | 7-9 | all eight |

Three stars needs no hints *and* a finish inside par. Two stars allows one
hint or a slower run. Finishing always pays at least one star.

### State lives outside React

The save file is a mutable module (`lib/store.js`), not React state: the play
screen writes to it on every found word, and several screens read it at once.
Components subscribe with `useSyncExternalStore` via `useStore` /
`useStoreVersion`, which keeps the store usable from non-React code — the audio
and haptics modules read settings directly.

Toasts, the modal sheet and confetti work the same way (`lib/overlays.js`), so
any module can raise one without being a component or being handed a callback.

### Screens stay mounted

Once visited, a screen stays in the tree and is cross-faded by CSS. That keeps
scroll position on the map, and keeps a level in progress alive if the player
dips into Settings from the pause menu. Inactive screens are `inert`, so focus
and screen readers never reach them, and the router remembers the params each
screen was last shown with so an inactive screen never falls back to defaults.

The play screen derives `paused` as `userPaused || !active`, so leaving the
screen stops the clock without any effect having to keep a flag in sync. The
running clock lives in a single effect whose cleanup banks the elapsed time, so
pausing, finishing, navigating away and unmounting all settle through one path.

Restarting a level remounts `<Level>` via its `key` rather than resetting a
dozen pieces of state by hand.

### The board is three stacked layers

```text
.board
  .layer--tiles     tile backgrounds
  svg.layer--lines  found-word capsules      <- drawn between the two
  .layer--letters   letters, and all input
```

Tiles and cells are `memo`ised on primitives, so dragging across the board
re-renders only the handful of cells whose state actually moved, not all 144.

Drawing the highlight *between* the tiles and the letters is what makes a
found word read as a coloured capsule with the letters on top, the way a
printed word search does. All three layers share one grid template, and cell
centres are measured once per resize (`measure()`), never per pointer move.

## Animation

Everything is CSS or canvas — no animation library, and no three.js. The
whole pass costs about 4 KB gzipped.

| Effect | How |
| --- | --- |
| Board reveal | A diagonal wave: `--wave` is `row + col`, scaled to an `animation-delay` |
| Found word | Letters flip in real 3D (`perspective` + `rotateY`), staggered along the word by `--pop` |
| Highlight capsule | The SVG line carries `pathLength="1"`, so one `stroke-dashoffset` keyframe draws any word at any length or angle |
| Word pill | A drawn rule sweeps across instead of `text-decoration` appearing |
| Particles | One shared canvas (`lib/particles.js`) with gravity, drag and tumble |
| Screen changes | The arriving screen slides in from the direction of travel; the leaving one only fades |
| Reward figures | `useCountUp` eases the number up, then kicks when it lands |

Two rules the pass follows:

- **Nothing that moves a tap target loops forever.** The "you are here" node
  on the map pulses its glow and ring, not its position. A control that is
  still drifting when a thumb arrives is harder to hit, and automation and
  assistive tooling both treat a never-settling element as unclickable.
- **The entry cascade is scoped to `.board.is-entering`**, a flag cleared once
  it finishes. Otherwise toggling any class later — a letter flipping — would
  swap the active animation and replay the whole board reveal.

Reduced motion is honoured twice over: `prefers-reduced-motion` and the
in-game setting both collapse every duration and disable the canvas outright,
and `particles.js` refuses to emit rather than drawing into a hidden canvas.

## Mobile UX decisions worth knowing

- **Drags snap to the nearest of eight directions** and track the finger by
  projection, so a sloppy diagonal still selects the word.
- **The board captures the pointer**, so a drag that wanders off the grid
  still completes instead of dying silently.
- `touch-action: none` on the board only; pinch zoom stays available
  everywhere else, because disabling it entirely is an accessibility
  regression.
- **Every cue is carried by at least two channels** — a found word animates,
  plays a chord, vibrates and is announced to screen readers. Haptics are
  Android-only in practice and sound may be muted, so neither is load-bearing.
- **Keyboard play is complete**: arrows move a cursor, Enter anchors and
  commits, Escape cancels.
- **The Android back gesture works** — navigation is mirrored into
  `history.pushState`, so back steps through screens rather than leaving.
- **The timer stops** when the tab is hidden, and the save file is flushed on
  `pagehide` because iOS can discard a backgrounded tab without warning.
- **Audio is synthesized**, so there are no audio files to download and
  nothing to load before the first level is playable. It is unlocked on the
  first gesture, as mobile browsers require.
- **The install prompt is deferred** until the player's second session and
  after at least one finished level.
- The theme is applied by an inline script before first paint, so a dark-mode
  device never flashes white.

## Accessibility

- Light/dark/auto, plus a high-contrast board and a colour-blind-safe word
  palette (Okabe-Ito derived) in Settings.
- Reduce-motion honours `prefers-reduced-motion` and has a manual override;
  it also suppresses confetti.
- All touch targets are at least 44x44 px.
- Live region announces finds, hints and results.
- Inactive screens are `inert`, so focus and screen readers never reach them.

## Built for a GitHub Pages project path

The site is served from `https://<user>.github.io/<repo>/`, which rules out a
few things that would otherwise be the obvious choice:

- **Hash routing, not the History API for routes.** Pages cannot rewrite
  unknown paths to `index.html`, so `/<repo>/game/play/12` would 404 on a
  refresh. The hash keeps every deep link a request for `index.html`.
  `history.pushState` is still used, but only to mirror navigation so the
  Android back gesture works.
- **`base: "./"` in `vite.config.js`.** Relative asset URLs mean the build
  does not need to know the repository name.
- **A relative service worker registration.** `./sw.js` scopes the worker to
  `/<repo>/game/`; registering `/sw.js` would ask to control the whole
  `github.io` domain and be rejected.
- **A relative manifest.** `start_url`, `scope`, `id`, icon paths and
  shortcuts all resolve against wherever the manifest lands.
- **`.nojekyll`.** Without it Jekyll silently drops files whose names start
  with an underscore.

`npm run check:pages` asserts every one of these against the built output, so
the classic "worked locally, 404s in production" regression fails CI instead
of reaching the site.

## Saved data

One `localStorage` key, `wsj.save`, holding a versioned object (profile,
settings, progress, stats, daily streak, achievements). Writes are debounced;
reads tolerate a corrupt or missing file by falling back to defaults, so a
blocked-storage browser still plays — it just will not remember. Nothing is
sent anywhere; there is no network call after load.

## Known follow-ups

Deliberately left alone, with reasons — a review pass surfaced these and they
were judged not worth the churn at the time:

- **`PlayScreen.jsx` is ~850 lines** and holds three cohesive clusters that
  would each extract cleanly into `lib/hooks.js`: the clock (`usePlayClock`),
  the win choreography (`useWinSequence`), and board geometry
  (`useBoardGeometry`). Worth doing next time someone works in that file;
  there is no behaviour change in it, so it was not worth the risk on its own.
- **Drag hit-testing uses `document.elementFromPoint`** on every pointermove,
  which forces a layout flush, even though cell centres are already cached in
  `geoRef`. Arithmetic against the cached rect would be cheaper. Left as-is
  because dragging is the core interaction and the current code is heavily
  tested — a cleanup pass is the wrong place to risk it.
- **`.overlay` (pause/win) and `.sheet` (modal) are two dialog systems** with
  near-identical CSS. The part that actually mattered — closed dialogs keeping
  their buttons in the tab order — is fixed; merging the styles is cosmetic.
- **`lib/store.js` imports React**, so the "framework-free" `lib/` boundary is
  only partly real: six modules depend on React transitively through it.
  Moving `useStoreVersion` into its own module would restore the claim.
- **`lib/store.js` and `lib/overlays.js` each hand-roll subscribe/notify.**
  Only the core is shared; the shapes genuinely differ (mutable singleton vs
  immutable snapshot), so one primitive would likely be worse than two.

## Changing things

- **Words and themes**: `app/src/lib/words.js`. Keep entries A-Z only, 3-10
  letters, with a good spread of lengths — the bigger grids filter out short
  words and will run out of candidates otherwise. Run
  `node scripts/verify-levels.mjs` after editing.
- **Difficulty**: `sizeFor`, `wordCountFor`, `directionsFor`, `parSecondsFor`
  in `app/src/lib/levels.js`.
- **Economy**: `rewardFor` in `lib/levels.js`, `HINT_COST` in
  `screens/PlayScreen.jsx`.
- **Colours**: `app/src/styles/tokens.css` only. Both themes and both palettes
  are defined there.
- **Icons**: edit `app/public/icons/icon.svg`, then
  `node scripts/make-icons.mjs` to re-render the PNGs (needs Playwright).
- **Adding a screen**: create `app/src/screens/<Name>Screen.jsx`, then add it
  to `SCREENS` in `lib/router.js` and to `COMPONENTS` / `LABELS` in `App.jsx`.

The service worker needs no manual upkeep: `scripts/write-sw-manifest.mjs`
rewrites its precache list from the real build output and derives the cache
name from the asset hashes, so every deploy invalidates the previous cache
automatically.

## Relationship to the playable ad

`playable-ad/` is unchanged and still ships independently — it is a single
self-contained HTML file sized for ad networks, with its own hard-coded level
and store CTA. The game does not share code with it; see
[`build-guide.md`](./build-guide.md) for packaging and network delivery.
