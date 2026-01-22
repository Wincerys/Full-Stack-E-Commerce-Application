import { Link } from "react-router-dom";

function initialLetter(s) {
  return (s?.trim()?.charAt(0) || "E").toUpperCase();
}

function toMonthDay(ts) {
  const d = new Date(ts);
  return {
    month: d.toLocaleString(undefined, { month: "short" }),
    day: d.getDate(),
  };
}

export default function EventCard({ event, children }) {
  const md = toMonthDay(event.startTime);
  return (
    <Link to={`/events/${event.id}`} className="link-quiet">
      <article className="card card--clickable">
        <header style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 6 }}>
          <div className="date-badge" aria-hidden>
            <div className="date-badge__month">{md.month}</div>
            <div className="date-badge__day">{md.day}</div>
          </div>
          <div>
            <h3 className="m-0">{event.title}</h3>
            <div className="card__meta">
              <strong>When:</strong> {new Date(event.startTime).toLocaleString()} ·{" "}
              <strong>Where:</strong> {event.location} ·{" "}
              <span className="chip">{event.category}</span>
            </div>
          </div>
        </header>
        {event.description && <p className="card__desc">{event.description}</p>}
        {children}
      </article>
    </Link>
  );
}