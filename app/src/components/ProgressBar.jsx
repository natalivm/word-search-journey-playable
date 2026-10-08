/** Thin progress bar. `value` is 0..1. */
export default function ProgressBar({ value = 0, thin = false, label }) {
  const pct = `${Math.max(0, Math.min(1, value)) * 100}%`;
  return (
    <div
      className={`bar${thin ? " bar--thin" : ""}`}
      role={label ? "progressbar" : undefined}
      aria-label={label}
      aria-valuenow={label ? Math.round(value * 100) : undefined}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
    >
      <i style={{ width: pct }} />
    </div>
  );
}
