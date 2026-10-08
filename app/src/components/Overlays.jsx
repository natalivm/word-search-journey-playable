/**
 * Renders everything from the overlay store: toasts, the modal sheet,
 * confetti and the screen-reader live region.
 */

import { useEffect, useRef, useSyncExternalStore } from "react";
import { subscribe, getSnapshot, closeSheet } from "../lib/overlays.js";

function Sheet({ sheet }) {
  const ref = useRef(null);
  const restoreFocus = useRef(null);

  useEffect(() => {
    restoreFocus.current = document.activeElement;

    // Land focus on the likeliest choice rather than at the top of the page.
    const primary = ref.current?.querySelector(".btn--primary") || ref.current?.querySelector(".btn");
    primary?.focus();

    const onKey = (e) => {
      if (e.key === "Escape" && sheet.dismissible) {
        e.preventDefault();
        closeSheet();
        return;
      }

      // Keep Tab inside the dialog while it is open.
      if (e.key !== "Tab" || !ref.current) return;
      const focusable = ref.current.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      restoreFocus.current?.focus?.();
    };
  }, [sheet]);

  return (
    <div
      className="sheet"
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={sheet.title}
    >
      <h3>{sheet.title}</h3>
      {typeof sheet.body === "string" ? <p>{sheet.body}</p> : sheet.body}
      <div className="sheet-actions">
        {sheet.actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className={`btn btn--block${action.kind === "primary" ? " btn--primary" : ""}`}
            onClick={() => {
              closeSheet();
              action.onClick?.();
            }}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Overlays() {
  const { toasts, sheet, confetti, live } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot
  );

  return (
    <>
      <div id="fxHost" aria-hidden="true">
        {confetti?.pieces.map((p) => (
          <i
            key={p.key}
            style={{
              left: p.left,
              background: p.background,
              animationDelay: p.animationDelay,
              animationDuration: p.animationDuration,
              transform: p.transform
            }}
          />
        ))}
      </div>

      <div id="toastHost" aria-hidden="true">
        {toasts.map((t) => (
          <div key={t.id} className={`toast${t.kind ? ` toast--${t.kind}` : ""}`}>
            {t.text}
          </div>
        ))}
      </div>

      <div
        id="modalHost"
        className={sheet ? "is-open" : undefined}
        inert={!sheet}
        onClick={(e) => {
          if (e.target === e.currentTarget && sheet?.dismissible) closeSheet();
        }}
      >
        {sheet ? <Sheet sheet={sheet} /> : null}
      </div>

      <p id="live" className="sr-only" role="status" aria-live="polite">
        <span key={live.seq}>{live.text}</span>
      </p>
    </>
  );
}
