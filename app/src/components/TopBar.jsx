import Icon from "./Icon.jsx";

/** Back button, centred title, optional trailing slot. */
export default function TopBar({ title, subtitle, onBack, trailing }) {
  return (
    <div className="topbar">
      <button className="icon-btn" type="button" aria-label="Back" onClick={onBack}>
        <Icon name="back" />
      </button>
      <h2>
        {title}
        {subtitle ? <span className="sub">{subtitle}</span> : null}
      </h2>
      {trailing ?? <span />}
    </div>
  );
}
