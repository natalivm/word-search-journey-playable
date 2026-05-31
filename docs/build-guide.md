# Word Search Journey Playable Ad Guide

## Goal

Create a short HTML5 playable ad that lets a user finish one real word-search level, celebrates the win, then sends the user to the correct store from the install CTA.

Current links:

- Android: https://play.google.com/store/apps/details?id=com.playvalve.wsjourney&hl=en
- iOS fallback: https://apps.apple.com/us/app/word-search-journey-puzzle/id1549726220

## References

- Google HTML5 playable assets: https://support.google.com/google-ads/answer/9981650
- Unity playable ads and MRAID: https://docs.unity.com/grow/en-us/exchange/playable-ads
- Unity playable structure: https://unity.com/blog/the-what-how-and-why-of-playable-ads/
- ironSource MRAID specs: https://developers.is.com/ironsource-mobile/general/mraid-specifications-guidelines/
- AppLovin creative specs: https://support.axon.ai/en/max/demand-partners/demand-side-platforms/applovin-ortb-specification/creative-types

## Creative Structure

1. Loading screen
2. Brand/title: Word Search Journey
3. Tutorial prompt: drag across letters to find the first word
4. One playable level with four words
5. Progress feedback and found-word chips
6. Completion celebration
7. End card with install CTA

The prototype uses original code-generated visuals because no source assets are available yet. This keeps the file small and avoids depending on app-store screenshots or unapproved images.

## Implementation

The current MVP is a single-file playable:

- `playable-ad/index.html`

For GitHub Pages preview, the repo also includes:

- `index.html`: redirects the repo root to `./playable-ad/`
- `.nojekyll`: tells GitHub Pages to serve files as plain static assets

It includes:

- Responsive portrait layout
- Real pointer/touch drag selection
- Word validation in forward or reverse direction
- Win state and confetti
- CTA redirect through `mraid.open(url)` when available
- Fallback to Google `ExitApi.exit()` when available
- Browser fallback for local testing

## Tools

Minimum toolchain:

- HTML, CSS, JavaScript
- Local browser for preview
- `zip` for packaging
- Optional Playwright for automated mobile screenshots

Optional later:

- Generated or official app icon
- Generated background image
- Network-specific wrappers for Google, Meta, Unity, AppLovin, ironSource
- A/B variants with different words, themes, CTA copy, and difficulty

## Packaging

Run:

```bash
bash scripts/package.sh
```

Output:

```text
dist/word-search-journey-playable.zip
```

The ZIP currently contains only `index.html`.

## GitHub Pages Preview

Push this folder to a GitHub repository, then enable Pages:

1. Open the repository on GitHub.
2. Go to Settings > Pages.
3. Set Source to `Deploy from a branch`.
4. Choose the branch, usually `main`, and folder `/root`.
5. Save and wait for GitHub to publish.

The preview URL will look like:

```text
https://YOUR_USERNAME.github.io/YOUR_REPOSITORY/
```

That root URL redirects to:

```text
https://YOUR_USERNAME.github.io/YOUR_REPOSITORY/playable-ad/
```

The playable uses relative paths only, so it works under a GitHub Pages project path.

## Network Notes

Google App Campaigns generally expect a ZIP with HTML5 assets, portrait orientation metadata, and a final URL configured in the campaign. Google documents a 5 MB ZIP limit and responsive fullscreen behavior.

MRAID networks such as Unity and ironSource generally expect store clicks through `mraid.open(url)`. Some partners require a `mraid.js` script tag or single inline HTML. Before final delivery, export a variant per network and validate it in that network's preview tool.

Avoid:

- Auto-redirecting to the store after level completion
- Fake close buttons
- Audio before first interaction
- Remote image/font dependencies
- Oversized files

## Next Production Steps

1. Confirm the iOS App Store link.
2. Replace the placeholder icon with the official app icon or an approved generated icon.
3. Create 2-3 creative variants:
   - Easy coastal level
   - Harder level with diagonal word
   - More dramatic end-card reward
4. Run network validators.
5. Upload to the selected ad network.
