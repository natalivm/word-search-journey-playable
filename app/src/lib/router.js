/**
 * Hash router.
 *
 * Five screens and no nested routes, so this is a hook rather than a routing
 * library — it is smaller than the API surface react-router would add here.
 *
 * Back is an *up* control, not a history control. Every screen has exactly one
 * parent — home is the root, the map and the daily puzzle hang off it, a level
 * hangs off the map — and both the in-app back buttons and the Android system
 * back gesture walk that chain. To make the system gesture follow it too, the
 * router keeps the browser history at most two entries deep: a home root, plus
 * one entry for the screen on show. A pop therefore always lands on home, and
 * when the screen being left has a parent that is not home, the router rebuilds
 * that parent's entry on top of the root.
 *
 * Without that, the stack would record where the player had been rather than
 * where they are: quitting a level to the map would leave the puzzle *behind*
 * the map, and back from the map would drop the player into the puzzle they
 * just quit instead of the main menu.
 *
 * The router also remembers the params each screen was last shown with, and
 * which screens have been visited. Both belong here rather than in App: a
 * screen that stays mounted while inactive (the play screen keeps a level in
 * progress) must not see its params fall back to defaults.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export const SCREENS = ["home", "map", "play", "profile", "settings"];

const HOME = { name: "home", params: {} };

/** The screen a back press should reach. Home is the root and has none. */
export function parentOf(route) {
  if (route.name === "home") return null;
  // The daily puzzle is launched from home and has no node on the map.
  if (route.name === "play" && !route.params?.daily) return "map";
  return "home";
}

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

const sameRoute = (a, b) => toHash(a.name, a.params) === toHash(b.name, b.params);

/**
 * @param {"forward"|"back"} dir how this move should read. Every entry point
 *   knows its own direction; only the history listener has to infer one.
 */
function nextState(prev, route, dir) {
  // A navigation to the screen already on show changes nothing, and returning
  // `prev` unchanged also lets React skip the re-render.
  if (sameRoute(prev.route, route)) return prev;

  return {
    route,
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
      dir: "forward",
      params: { [route.name]: route.params },
      visited: new Set(["home", route.name])
    };
  });

  // Mirrors for the listeners, which are registered once.
  const routeRef = useRef(nav.route);
  const paramsRef = useRef(nav.params);
  // True while the only history entry is the home root, so the next move to
  // another screen has to push rather than replace.
  const atRootRef = useRef(nav.route.name === "home");
  const readyRef = useRef(false);

  useEffect(() => {
    paramsRef.current = nav.params;
  }, [nav.params]);

  /** Write the entry for `route`, keeping the stack at [home] or [home, route]. */
  const stamp = useCallback((route) => {
    const entry = { name: route.name, params: route.params };
    const hash = toHash(route.name, route.params);

    if (route.name === "home") {
      window.history.replaceState(entry, "", hash);
      atRootRef.current = true;
      return;
    }
    if (atRootRef.current) {
      window.history.pushState(entry, "", hash);
      atRootRef.current = false;
    } else {
      window.history.replaceState(entry, "", hash);
    }
  }, []);

  useEffect(() => {
    // Normalise whatever the page was opened with into [home] or [home, route],
    // so even a deep link has the main menu behind it. The ref guard keeps
    // StrictMode's second mount from stacking the entry twice.
    if (!readyRef.current) {
      readyRef.current = true;
      const initial = parseHash(window.location.hash);
      window.history.replaceState({ ...HOME }, "", toHash("home"));
      atRootRef.current = true;
      if (initial.name !== "home") stamp(initial);
    }

    // `popstate` and `hashchange` can both fire for one move, and which of
    // them fires depends on the browser — so they share a handler that works
    // out what happened from the entry it landed on.
    const onNav = () => {
      const landed = parseHash(window.location.hash);
      // Already handled: the first of the two events did the work.
      if (sameRoute(landed, routeRef.current)) return;

      // An entry the router never stamped means the hash was changed from
      // outside it (a manual edit, a link). The browser has stacked a fresh
      // entry for it, so adopt that entry rather than reading it as a back.
      if (!window.history.state) {
        atRootRef.current = landed.name === "home";
        window.history.replaceState(
          { name: landed.name, params: landed.params },
          "",
          toHash(landed.name, landed.params)
        );
        routeRef.current = landed;
        setNav((prev) => nextState(prev, landed, "forward"));
        return;
      }

      // One of our own entries: a back press. The pop dropped the screen's
      // entry, so we are on the home root again — go up from where we were.
      window.history.replaceState({ ...HOME }, "", toHash("home"));
      atRootRef.current = true;

      const up = parentOf(routeRef.current);
      const target = up && up !== "home"
        ? { name: up, params: paramsRef.current[up] || {} }
        : HOME;
      if (target.name !== "home") stamp(target);

      routeRef.current = target;
      setNav((prev) => nextState(prev, target, "back"));
    };

    window.addEventListener("popstate", onNav);
    window.addEventListener("hashchange", onNav);
    return () => {
      window.removeEventListener("popstate", onNav);
      window.removeEventListener("hashchange", onNav);
    };
  }, [stamp]);

  /**
   * Navigate.
   *
   * `dir` is how the transition should read. It defaults to forward, but an
   * "up" control — the back button on a screen reached from home — passes
   * "back" so the slide matches what the player just asked for.
   */
  const go = useCallback((name, params = {}, dir = "forward") => {
    const route = { name, params };
    if (sameRoute(route, routeRef.current)) return;
    routeRef.current = route;
    setNav((prev) => nextState(prev, route, dir));

    if (name === "home" && !atRootRef.current) {
      // Pop the screen's entry rather than stacking a second home above the
      // root, so one more back press still leaves the game.
      atRootRef.current = true;
      window.history.back();
      return;
    }
    stamp(route);
  }, [stamp]);

  // Replacing keeps the same depth, so the direction cannot be inferred —
  // the caller says which way it should read.
  const replace = useCallback((name, params = {}, dir = "forward") => {
    const route = { name, params };
    routeRef.current = route;
    // `stamp` replaces unless the stack is just the root, where it pushes —
    // which is what keeps home behind a screen replaced into on a deep link.
    stamp(route);
    setNav((prev) => nextState(prev, route, dir));
  }, [stamp]);

  return {
    route: nav.route,
    params: nav.params,
    visited: nav.visited,
    dir: nav.dir,
    go,
    replace
  };
}
