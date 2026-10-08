/**
 * Screen router.
 *
 * Screens are registered with optional `mount`/`unmount` hooks and swapped by
 * toggling a class — no re-parenting, so CSS can cross-fade them.
 *
 * Navigation is mirrored into history.pushState purely so the Android system
 * back gesture (and the browser back button) does what a player expects:
 * step back through the app rather than leave it. The hash is the record of
 * where we are; popstate replays it.
 */

const screens = new Map();
let current = null;
let currentParams = {};
let container = null;
let started = false;

export function register(name, def) {
  screens.set(name, def);
}

function parse(hash) {
  const raw = (hash || "").replace(/^#\/?/, "");
  if (!raw) return { name: "home", params: {} };
  const [name, query] = raw.split("?");
  const params = {};
  if (query) {
    for (const [k, v] of new URLSearchParams(query)) params[k] = v;
  }
  return { name: screens.has(name) ? name : "home", params };
}

function toHash(name, params) {
  const query = new URLSearchParams(params).toString();
  return `#/${name}${query ? `?${query}` : ""}`;
}

/** Swap screens. `push` false is used when replaying history. */
function show(name, params = {}, push = true) {
  const next = screens.get(name);
  if (!next) return;

  if (current === name && JSON.stringify(params) === JSON.stringify(currentParams)) return;

  const prev = current ? screens.get(current) : null;
  if (prev) {
    prev.unmount?.(prev.node);
    prev.node.classList.remove("is-active");
    prev.node.setAttribute("inert", "");
    prev.node.setAttribute("aria-hidden", "true");
  }

  if (!next.node) {
    next.node = next.build();
    next.node.classList.add("screen");
    next.node.id = `screen-${name}`;
    next.node.setAttribute("inert", "");
    next.node.setAttribute("aria-hidden", "true");
    container.appendChild(next.node);
  }

  current = name;
  currentParams = params;

  next.node.removeAttribute("inert");
  next.node.removeAttribute("aria-hidden");
  next.mount?.(next.node, params);

  // Force a reflow before adding the class so the enter transition runs even
  // when the node was created in this same frame.
  void next.node.offsetWidth;
  next.node.classList.add("is-active");

  // Each screen scrolls independently; always arrive at the top.
  next.node.querySelector(".screen-body")?.scrollTo?.(0, 0);

  const hash = toHash(name, params);
  if (push && window.location.hash !== hash) {
    window.history.pushState({ name, params }, "", hash);
  }
}

/** Navigate, adding a history entry. */
export const go = (name, params = {}) => show(name, params, true);

/** Navigate without adding a history entry (for redirects). */
export function replace(name, params = {}) {
  show(name, params, false);
  window.history.replaceState({ name, params }, "", toHash(name, params));
}

/** Step back if we can, otherwise fall back to a sensible parent screen. */
export function back(fallback = "home") {
  if (window.history.length > 1 && window.history.state) window.history.back();
  else go(fallback);
}

export function start(root) {
  container = root;
  if (started) return;
  started = true;

  window.addEventListener("popstate", (e) => {
    const target = e.state?.name ? e.state : parse(window.location.hash);
    show(target.name, target.params || {}, false);
  });

  const initial = parse(window.location.hash);
  show(initial.name, initial.params, false);
  window.history.replaceState(initial, "", toHash(initial.name, initial.params));
}
