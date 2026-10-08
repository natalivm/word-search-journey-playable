/** A row of three stars, `filled` of them lit. */

const STAR_D = "M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z";

export default function Stars({ filled = 0, size = 14 }) {
  return (
    <div className="stars" aria-label={`${filled} of 3 stars`}>
      {[0, 1, 2].map((i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className={i < filled ? "on" : undefined}
          aria-hidden="true"
        >
          <path d={STAR_D} />
        </svg>
      ))}
    </div>
  );
}

export { STAR_D };
