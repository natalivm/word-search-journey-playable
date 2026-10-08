/** Inline SVG icons — they inherit currentColor and need no network. */

const PATHS = {
  back: ["M15 5l-7 7 7 7"],
  gear: [
    "M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z",
    "M19.4 13a7.9 7.9 0 000-2l2-1.5-2-3.4-2.4 1a8 8 0 00-1.7-1L15 3.5h-4l-.3 2.6a8 8 0 00-1.7 1l-2.4-1-2 3.4L6.6 11a7.9 7.9 0 000 2l-2 1.5 2 3.4 2.4-1a8 8 0 001.7 1l.3 2.6h4l.3-2.6a8 8 0 001.7-1l2.4 1 2-3.4z"
  ],
  user: ["M12 12a4 4 0 100-8 4 4 0 000 8z", "M4.5 20a7.5 7.5 0 0115 0"],
  map: ["M9 4L3 7v13l6-3 6 3 6-3V4l-6 3-6-3z", "M9 4v13", "M15 7v13"],
  pause: ["M9 5v14", "M15 5v14"],
  bulb: [
    "M9.5 18h5",
    "M10 21h4",
    "M12 3a6 6 0 00-3.5 10.9c.6.5.9 1.1 1 1.6h5c.1-.5.4-1.1 1-1.6A6 6 0 0012 3z"
  ],
  check: ["M4 12.5l5.5 5.5L20 7"],
  trophy: [
    "M8 4h8v5a4 4 0 11-8 0V4z",
    "M8 6H5v1a3 3 0 003 3",
    "M16 6h3v1a3 3 0 01-3 3",
    "M10 17h4",
    "M12 13v4",
    "M9 20h6"
  ],
  calendar: ["M4 8h16", "M8 3v4", "M16 3v4", "M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z"]
};

export default function Icon({ name, size = 22 }) {
  const paths = PATHS[name];
  if (!paths) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths.map((d) => <path key={d} d={d} />)}
    </svg>
  );
}
