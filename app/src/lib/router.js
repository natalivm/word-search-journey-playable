/**
 * Hash router.
 *
 * Five screens and no nested routes, so this is a hook rather than a routing
 * library — it is smaller than the API surface react-router would add here.
 *
 * Navigation is mirrored into history.pushState so the Android system back
 * gesture and the browser back button step through screens instead of
 * leaving the game.
 *
 * The router also remembers the params each screen was last shown with, and
 * which screens have been visited. Both belong here rather than in App: a
 * screen that stays mounted while inactive (the play screen keeps a level in
 * progress) must not see its params fall back to defaults.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export const SCREENS = ["home", "map", "play", "profile", "settings"];

/** "#/play?n=12" -> { name: "play", params: { n: "12" } } */
export function parseHash(hash) {
  const raw = (hash || "").replace(/^#\/?/, "");
  if (!raw) return { name: "home", params: {} };

  const [name, query] = raw.split("?");
  const params = {};
  if (query) for (const [k, v] of new URLSearchParams(query)) params[k] = v;

  return { name: SCREENS.includes(name) ? name : "home", params };
}

export function toHash(name, params = {}) {
  const query = new URLSearchParams(params).toString();
  return `#/${name}${query ? `?${query}` : ""}`;
}

/**
 * @param {"forward"|"back"} dir how this move should read. Every entry point
 *   knows its own direction; only the history listener has to infer one.
 */
function nextState(prev, route, depth, dir) {
  // `popstate` and `hashchange` both fire for a browser back, and the second
  // would otherwise recompute against already-updated state. Returning `prev`
  // unchanged also lets React skip the re-render.
  if (
    prev.depth === depth &&
    toHash(prev.route.name, prev.route.params) === toHash(route.name, route.params)
  ) {
    return prev;
  }

  return {
    route,
    depth,
    dir,
    params: { ...prev.params, [route.name]: route.params },
    visited: prev.visited.has(route.name)
      ? prev.visited
      : new Set(prev.visited).add(route.name)
  };
}

export function useRouter() {
  const [nav, setNav] = useState(() => {
    const route = parseHash(window.location.hash);
    return {
      route,
      depth: 0,
      dir: "forward",
      params: { [route.name]: route.params },
      visited: new Set(["home", route.name])
    };
  });

  // Mirrors nav.depth for the listeners, which are registered once.
  const depthRef = useRef(0);

  useEffect(() => {
    const onPop = () => {
      const route = parseHash(window.location.hash);
      let depth = window.history.state?.depth;

      if (depth === undefined || depth === null) {
        // The hash changed from outside the router (a manual edit, a link).
        // Adopt it as a forward step and stamp the entry so back() can still
        // tell how deep we are.
        depth = depthRef.current + 1;
        window.history.replaceState(
          { name: route.name, params: route.params, depth },
          "",
          window.location.hash
        );
      }

      const dir = depth < depthRef.current ? "back" : "forward";
      depthRef.current = depth;
      setNav((prev) => nextState(prev, route, depth, dir));
    };

    window.addEventListener("popstate", onPop);
    window.addEventListener("hashchange", onPop);

    // Make sure the first entry carries state, so `back()` can tell whether
    // there is anywhere in-app to go back to.
    const initial = parseHash(window.location.hash);
    window.history.replaceState(
      { ...initial, depth: 0 },
      "",
      toHash(initial.name, initial.params)
    );

    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("hashchange", onPop);
    };
  }, []);

  const go = useCallback((name, params = {}) => {
    const hash = toHash(name, params);
    if (window.location.hash === hash) return;
    const depth = (window.history.state?.depth ?? 0) + 1;
    window.history.pushState({ name, params, depth }, "", hash);
    depthRef.current = depth;
    setNav((prev) => nextState(prev, { name, params }, depth, "forward"));
  }, []);

  // Replacing keeps the same depth, so the direction cannot be inferred —
  // the caller says which way it should read.
  const replace = useCallback((name, params = {}, dir = "forward") => {
    const depth = window.history.state?.depth ?? 0;
    window.history.replaceState({ name, params, depth }, "", toHash(name, params));
    depthRef.current = depth;
    setNav((prev) => nextState(prev, { name, params }, depth, dir));
  }, []);

  const back = useCallback((fallback = "home") => {
    // Only step back if this session put something behind us; otherwise a
    // deep link would walk the player out of the game.
    if ((window.history.state?.depth ?? 0) > 0) window.history.back();
    // A deep-linked player has nothing behind them, so this is a replace at
    // the same depth — say explicitly that it should animate as a back step.
    else replace(fallback, {}, "back");
  }, [replace]);

  return {
    route: nav.route,
    params: nav.params,
    visited: nav.visited,
    dir: nav.dir,
    go,
    replace,
    back
  };
}
