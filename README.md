# Word Search Journey

A mobile word search game: 80 levels across 10 themed chapters, a daily
puzzle, player progression, achievements, and offline play. React + Vite, no
runtime dependencies beyond React itself.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173, hot reload
```

Other scripts:

```bash
npm run build       # production build into dist/
npm run preview     # serve the production build
npm run lint        # ESLint, including the React hooks rules
npm run verify      # generate all 80 levels + a year of dailies and check them
npm run check:pages # assert every built path is relative (see below)
npm run check       # lint + verify + build + check:pages, the same gates CI runs
```

## Deployment (GitHub Pages)

`.github/workflows/pages.yml` builds and publishes on every push to `main`,
and runs the same checks on pull requests. `dist/` is not committed — CI
builds it.

One-time repository setup: **Settings → Pages → Source → GitHub Actions**.
(Not "Deploy from a branch" — the site is built, not served from the repo.)

The build output *is* the site, so the Pages URL opens straight into the game.
`/docs/` is published alongside it.

### Project-path safety

Pages serves this repo from `https://<user>.github.io/<repo>/`, not a domain
root, so **every asset path has to be relative**. An absolute `/assets/...`
works perfectly on localhost and 404s in production.

What keeps that working:

- `vite.config.js` sets `base: "./"`, so the bundle emits relative URLs.
- The manifest's `start_url`, `scope`, icons and shortcuts are relative.
- The service worker is registered as `./sw.js`, so its scope is the game's
  own directory rather than the whole `github.io` domain, and it pre-caches
  relative URLs written from the real build output.
- Routing is hash-based, so deep links need no server rewrites — Pages has no
  way to do them.
- `.nojekyll` stops Jekyll dropping paths that begin with an underscore.

`npm run check:pages` asserts all of the above against the built output and
fails CI if any of it regresses.

## Documentation

[`docs/game-guide.md`](docs/game-guide.md) covers the architecture, the level
generator, the difficulty curve, the mobile UX and accessibility decisions,
and what to edit to change words, difficulty, economy or colours.

## History

This repository previously also held a single-file HTML5 playable ad creative
in `playable-ad/`, with its own packaging script and build guide. It was
removed once the game became the product. It remains in git history if it is
ever needed again:

```bash
git log --all --oneline -- playable-ad/
git checkout <commit> -- playable-ad/
```
