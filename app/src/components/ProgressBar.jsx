/** Thin progress bar. `value` is 0..1. */
export default function ProgressBar({ value = 0, thin = false }) {
  return (
    <div className={`bar${thin ? " bar--thin" : ""}`}>
      <i style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}
