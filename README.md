# Word Search Journey

Two deliverables in one repository:

| | What | Where |
| --- | --- | --- |
| **Game** | A React word search game — 80 levels across 10 themed chapters, daily puzzles, player profile, offline play | `app/` → built to `dist/`, served at `/game/` |
| **Playable ad** | A single-file HTML5 ad creative for Google, Unity, ironSource and AppLovin | `playable-ad/` |

They share no code on purpose. The ad has to stay one small self-contained
file to survive ad-network size limits and ad webviews; the game is free to
carry a framework and a build step.

## Running the game

```bash
npm install
npm run dev      # http://localhost:5173, hot reload
```

Other scripts:

```bash
npm run build    # production build into dist/
npm run preview  # serve the production build
npm run lint     # ESLint, including the React hooks rules
npm run verify   # generate all 80 levels + a year of dailies and check them
npm run check    # lint + verify + build, the same gates CI runs
```

## Running the playable ad

It has no build step — open `playable-ad/index.html` in a browser, or serve
the repo root and visit `/playable-ad/`.

To package it for upload:

```bash
bash scripts/package.sh   # -> dist-ad/word-search-journey-playable.zip
```

## Deployment

`.github/workflows/pages.yml` builds and publishes to GitHub Pages on every
push to `main`, and runs the same checks on pull requests. The published site:

```text
/                                      landing page
/game/                                 the game
/playable-ad/                          the ad creative
/dist/word-search-journey-playable.zip the packaged ad
/docs/                                 guides
```

Neither `dist/` nor `dist-ad/` is committed — CI builds both.

## Documentation

- [`docs/game-guide.md`](docs/game-guide.md) — game architecture, the level
  generator, the difficulty curve, mobile UX and accessibility decisions, and
  what to edit to change words, difficulty, economy or colours.
- [`docs/build-guide.md`](docs/build-guide.md) — the ad creative: packaging,
  MRAID, network specs and delivery.
