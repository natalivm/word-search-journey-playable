# Word Search Journey — Figma file builder

A Figma plugin that builds the design file from the app's real tokens, so the
Figma side and `app/src/styles/*.css` cannot quietly drift apart.

## Why a plugin

Figma's Dev Mode MCP server is read-only — `get_design_context`,
`get_variable_defs`, `get_screenshot` and friends exist to pull a design *out*
of Figma into code. Neither it nor the REST API can create frames, text,
components or variables. A plugin is the supported way to write into a file.

## Running it

1. Open the Figma desktop app (plugin development needs it; the browser app
   can't load a local manifest).
2. Open or create the file you want the design built into.
3. Menu → Plugins → Development → **Import plugin from manifest…**
4. Pick `figma-plugin/manifest.json` from this repo.
5. Menu → Plugins → Development → **Word Search Journey — build design file**.

It runs once and closes itself. Everything lands on the current page.

Nunito must be available to Figma. It is a Google font, so the desktop app
normally has it; if the plugin stops with a message about it, add Nunito from
any text layer's font picker and run again.

## What it creates

- **Variables** — a `WSJ` collection with **Light** and **Dark** modes, one
  colour variable per semantic token (`semantic/*`), the brand ramp
  (`brand/*`) and the nine word-highlight colours (`word/w1…w9`). A second
  `WSJ scale` collection holds the spacing and radius numbers.
- **Text styles** — the Nunito scale the app uses, 9px to 35px, at the three
  weights it ships (SemiBold 600, ExtraBold 800, Black 900).
- **Effect styles** — the four elevations plus the accent glow.
- **Component library** — buttons, chips, progress bars, stars, switch,
  segmented control, level nodes, word pills, board cells.
- **Screens** — currently Home. The rest follow the same pattern.

## Changing it

`code.js` is a small renderer (`F`, `T`, `R`, `icon`, `star`) over data. The
token maps at the top of the file are transcribed from
`app/src/styles/tokens.css`; the component and screen builders below compose
them. To add a screen, write a function that returns a `phone(...)` frame and
call it from `main()`.

Values that came from the CSS rather than from judgement: every colour, the
radius and spacing scales, the four shadows, all type sizes and letter
spacing, the 62px level node with its ±58px lean, and the board's 39px cells
on a 4px grid.
