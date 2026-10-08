/**
 * Small DOM helpers plus the shared overlays: toasts, modal sheets, confetti.
 */

import { state } from "./store.js";

/** Create an element. `props` sets attributes; `class`/`text`/`html` are special. */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "html") node.innerHTML = value;
    else if (key === "style") {
      for (const [prop, val] of Object.entries(value)) {
        // Custom properties are invisible to style object assignment.
        if (prop.startsWith("--")) node.style.setProperty(prop, val);
        else node.style[prop] = val;
      }
    }
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === "dataset") Object.assign(node.dataset, value);
    else node.setAttribute(key, value === true ? "" : value);
  }

  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }

  return node;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const clear = (node) => {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
};

/* ---------------------------------------------------------------------- */
/* Icons — inline SVG so they theme with currentColor and work offline.     */
/* ---------------------------------------------------------------------- */

const ICON_PATHS = {
  back: "M15 5l-7 7 7 7",
  close: "M6 6l12 12M18 6L6 18",
  gear: "M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z M19.4 13a7.9 7.9 0 000-2l2-1.5-2-3.4-2.4 1a8 8 0 00-1.7-1L15 3.5h-4l-.3 2.6a8 8 0 00-1.7 1l-2.4-1-2 3.4L6.6 11a7.9 7.9 0 000 2l-2 1.5 2 3.4 2.4-1a8 8 0 001.7 1l.3 2.6h4l.3-2.6a8 8 0 001.7-1l2.4 1 2-3.4z",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8z M4.5 20a7.5 7.5 0 0115 0",
  map: "M9 4L3 7v13l6-3 6 3 6-3V4l-6 3-6-3z M9 4v13 M15 7v13",
  pause: "M9 5v14 M15 5v14",
  bulb: "M9.5 18h5 M10 21h4 M12 3a6 6 0 00-3.5 10.9c.6.5.9 1.1 1 1.6h5c.1-.5.4-1.1 1-1.6A6 6 0 0012 3z",
  play: "M8 5l11 7-11 7z",
  check: "M4 12.5l5.5 5.5L20 7",
  trophy: "M8 4h8v5a4 4 0 11-8 0V4z M8 6H5v1a3 3 0 003 3 M16 6h3v1a3 3 0 01-3 3 M10 17h4 M12 13v4 M9 20h6",
  calendar: "M4 8h16 M8 3v4 M16 3v4 M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z",
  restart: "M4 12a8 8 0 1 0 2.6-5.9 M4 4v4h4"
};

export function icon(name, size = 22) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2.4");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");

  for (const d of (ICON_PATHS[name] || "").trim().split(/\s(?=M)/)) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
  }

  return svg;
}

/** A row of 3 stars, `filled` of them lit. */
export function starRow(filled, size = 14) {
  const wrap = el("div", { class: "stars", "aria-label": `${filled} of 3 stars` });

  for (let i = 0; i < 3; i += 1) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.setAttribute("aria-hidden", "true");
    if (i < filled) svg.classList.add("on");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      "M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z"
    );
    svg.appendChild(path);
    wrap.appendChild(svg);
  }

  return wrap;
}

/* ---------------------------------------------------------------------- */
/* Toasts                                                                  */
/* ---------------------------------------------------------------------- */

let toastHost;

export function toast(text, kind = "") {
  toastHost = toastHost || $("#toastHost");
  const node = el("div", { class: `toast ${kind ? `toast--${kind}` : ""}`, text });
  toastHost.appendChild(node);

  // Keep the stack short — a burst of achievements shouldn't fill the screen.
  while (toastHost.children.length > 3) toastHost.firstChild.remove();
  setTimeout(() => node.remove(), 2100);
}

/** Announce to screen readers without showing anything. */
export function announce(text) {
  const live = $("#live");
  if (!live) return;
  live.textContent = "";
  // The reset + rAF forces a re-announcement of identical consecutive text.
  requestAnimationFrame(() => {
    live.textContent = text;
  });
}

/* ---------------------------------------------------------------------- */
/* Modal sheet                                                             */
/* ---------------------------------------------------------------------- */

let modalHost;
let lastFocused = null;
let onEscape = null;

/**
 * Open a bottom sheet.
 * @param {object} opts title, body (string or node), actions [{label, kind, onClick}]
 */
export function openSheet({ title, body, actions = [], dismissible = true }) {
  modalHost = modalHost || $("#modalHost");
  lastFocused = document.activeElement;
  clear(modalHost);

  const sheet = el("div", { class: "sheet", role: "dialog", "aria-modal": "true", "aria-label": title });
  sheet.appendChild(el("h3", { text: title }));
  if (body) sheet.appendChild(typeof body === "string" ? el("p", { text: body }) : body);

  const row = el("div", { class: "sheet-actions" });
  for (const action of actions) {
    row.appendChild(
      el("button", {
        class: `btn ${action.kind === "primary" ? "btn--primary" : ""} btn--block`,
        type: "button",
        text: action.label,
        onClick: () => {
          closeSheet();
          action.onClick?.();
        }
      })
    );
  }
  sheet.appendChild(row);
  modalHost.appendChild(sheet);

  modalHost.onclick = dismissible
    ? (e) => {
        if (e.target === modalHost) closeSheet();
      }
    : null;

  onEscape = dismissible ? closeSheet : null;
  modalHost.classList.add("is-open");
  modalHost.removeAttribute("inert");

  // Focus the primary action so a keyboard or switch user lands on the
  // likeliest choice rather than at the top of the page.
  requestAnimationFrame(() => {
    (sheet.querySelector(".btn--primary") || sheet.querySelector(".btn"))?.focus();
  });
}

export function closeSheet() {
  modalHost = modalHost || $("#modalHost");
  if (!modalHost.classList.contains("is-open")) return;
  modalHost.classList.remove("is-open");
  modalHost.setAttribute("inert", "");
  onEscape = null;
  lastFocused?.focus?.();
}

export const sheetIsOpen = () => Boolean(modalHost?.classList.contains("is-open"));

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && onEscape) {
    e.preventDefault();
    onEscape();
  }
});

/* ---------------------------------------------------------------------- */
/* Confetti                                                                */
/* ---------------------------------------------------------------------- */

export function confetti(count = 40) {
  if (state.settings.reduceMotion) return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const host = $("#fxHost");
  if (!host) return;
  clear(host);

  const colors = ["#ff6b6b", "#ffd166", "#18a999", "#2364aa", "#7c5cde", "#ffffff"];

  for (let i = 0; i < count; i += 1) {
    const piece = el("i", {
      style: {
        left: `${Math.random() * 100}%`,
        background: colors[i % colors.length],
        animationDelay: `${Math.random() * 320}ms`,
        animationDuration: `${1000 + Math.random() * 900}ms`,
        transform: `rotate(${Math.random() * 360}deg)`
      }
    });
    host.appendChild(piece);
  }

  setTimeout(() => clear(host), 2600);
}

/* ---------------------------------------------------------------------- */
/* Formatting                                                              */
/* ---------------------------------------------------------------------- */

export function formatTime(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export const formatNumber = (n) => n.toLocaleString();
