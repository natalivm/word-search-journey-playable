# Word Search Journey — Game Guide

The full game lives in `game/`. It is a dependency-free, installable web game
that plays offline: plain ES modules, no build step, no framework, no bundler.

- Play locally: `npx http-server . -p 8099` then open
  <http://127.0.0.1:8099/game/>
- Published at `<pages-url>/game/`

ES modules need a real HTTP origin, so opening `game/index.html` straight from
the filesystem will not work. Any static server will do.

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
game/
  index.html             app shell + pre-paint theme script
  manifest.webmanifest   installability
  sw.js                  offline pre-cache
  css/
    tokens.css           colour, type, spacing, motion; all theming
    base.css             reset, app shell, buttons, toasts, sheets
    screens.css          home, map, profile, settings
    game.css             board, HUD, overlays
  js/
    main.js              boot, lifecycle, install prompt, SW registration
    router.js            screen registry + history/back-button handling
    store.js             save file, derived values, mutations
    theme.js             settings -> <html> data-attributes
    ui.js                DOM helpers, icons, toasts, sheets, confetti
    rng.js               seeded PRNG (mulberry32)
    words.js             10 themed word packs + filler letter frequencies
    levels.js            difficulty curve, star thresholds, rewards
    generator.js         backtracking word placement
    achievements.js      badge definitions and checks
    audio.js             synthesized SFX and music (no audio files)
    haptics.js           navigator.vibrate wrapper
    screens/             one module per screen
```

### Levels are generated, not authored

A level is a *description* — size, word count, allowed directions, par time —
derived from its number by `levelAt(n)` in `levels.js`. The board itself is
built on demand by `generator.js` from a seed string (`wsj-v1-<chapter>-<n>`),
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

Tuned in one place, in `levels.js`:

| Levels | Grid | Words | Directions |
| --- | --- | --- | --- |
| 1-3 | 7x7 | 4 | → ↓ |
| 4-8 | 7x7 | 4 | → ↓ ↘ |
| 9-16 | 8x8 | 4-5 | + ← ↑ |
| 17-32 | 8-9 | 5-7 | + ↗ ↙ |
| 33-80 | 9-12 | 7-9 | all eight |

Three stars needs no hints *and* a finish inside par. Two stars allows one
hint or a slower run. Finishing always pays at least one star.

### The board is three stacked layers

```text
.board
  .layer--tiles     tile backgrounds
  svg.layer--lines  found-word capsules      <- drawn between the two
  .layer--letters   letters, and all input
```

Drawing the highlight *between* the tiles and the letters is what makes a
found word read as a coloured capsule with the letters on top, the way a
printed word search does. All three layers share one grid template, and cell
centres are measured once per resize (`measure()`), never per pointer move.

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

## Saved data

One `localStorage` key, `wsj.save`, holding a versioned object (profile,
settings, progress, stats, daily streak, achievements). Writes are debounced;
reads tolerate a corrupt or missing file by falling back to defaults, so a
blocked-storage browser still plays — it just will not remember. Nothing is
sent anywhere; there is no network call after load.

## Changing things

- **Words and themes**: `game/js/words.js`. Keep entries A-Z only, 3-10
  letters, with a good spread of lengths — the bigger grids filter out short
  words and will run out of candidates otherwise. Run
  `node scripts/verify-levels.mjs` after editing.
- **Difficulty**: `sizeFor`, `wordCountFor`, `directionsFor`, `parSecondsFor`
  in `game/js/levels.js`.
- **Economy**: `rewardFor` in `levels.js`, `HINT_COST` in `screens/play.js`.
- **Colours**: `game/css/tokens.css` only. Both themes and both palettes are
  defined there.
- **Icons**: edit `game/icons/icon.svg`, then
  `node scripts/make-icons.mjs` to re-render the PNGs (needs Playwright).
- **Adding a screen**: create `js/screens/<name>.js` exporting
  `{ build, mount?, unmount? }`, then `register()` it in `main.js` and add
  it to the `ASSETS` list in `sw.js`.

Bump `CACHE` in `game/sw.js` whenever shipped files change, or returning
players will keep the old version until the cache is evicted.

## Relationship to the playable ad

`playable-ad/` is unchanged and still ships independently — it is a single
self-contained HTML file sized for ad networks, with its own hard-coded level
and store CTA. The game does not share code with it; see
[`build-guide.md`](./build-guide.md) for packaging and network delivery.
