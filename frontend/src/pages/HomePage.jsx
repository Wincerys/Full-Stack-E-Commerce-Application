import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  getUpcomingEvents,
  getRecommendedEvents,
  isAuthed,
} from "../services/api";
import EventCard from "../components/EventCard.jsx";
import EmptyState from "../components/EmptyState.jsx";

export default function HomePage() {
  const authed = isAuthed();

  const {
    data: upcoming = [],
    isLoading: uLoading,
    error: uErr,
  } = useQuery({
    queryKey: ["events", "upcoming", { limit: 10 }],
    queryFn: () => getUpcomingEvents({ limit: 10 }),
  });

  const {
    data: recs = [],
    isLoading: rLoading,
    error: rErr,
  } = useQuery({
    queryKey: ["events", "recommended"],
    queryFn: getRecommendedEvents,
    enabled: authed, // only when logged in
  });

  return (
    <section className="container">
      {/* Upcoming */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <h2 className="m-0">Upcoming</h2>
        <Link to="/events" className="card__meta">View all</Link>
      </header>

      {uLoading ? (
        <p className="badge">Loading upcoming events…</p>
      ) : uErr ? (
        <p className="badge">Failed to load upcoming events.</p>
      ) : upcoming.length === 0 ? (
        <EmptyState>
          <p>No upcoming events.</p>
        </EmptyState>
      ) : (
        <main className="feed" style={{ marginTop: 12 }}>
          {upcoming.map((ev) => (
            <EventCard key={ev.id} event={ev} />
          ))}
        </main>
      )}

      {/* Recommended */}
      <div style={{ marginTop: 28 }}>
        <h2 className="m-0">Recommended for you</h2>
        {!authed ? (
          <p className="card__meta" style={{ marginTop: 8 }}>
            <Link to="/login">Login</Link> to see personalized recommendations.
          </p>
        ) : rLoading ? (
          <p className="badge" style={{ marginTop: 8 }}>Loading recommendations…</p>
        ) : rErr ? (
          <p className="badge" style={{ marginTop: 8 }}>Failed to load recommendations.</p>
        ) : recs.length === 0 ? (
          <EmptyState>
            <p>No recommendations at this time.</p>
          </EmptyState>
        ) : (
          <main className="feed" style={{ marginTop: 12 }}>
            {recs.map((ev) => (
              <EventCard key={ev.id} event={ev}>
                <div className="card__meta" style={{ marginTop: 6 }}>
                  <strong>{new Date(ev.startTime).toLocaleString()}</strong>
                  {" · "}
                  <span>{ev.location}</span>
                  {" · "}
                  <span className="badge">{ev.category}</span>
                </div>
              </EventCard>
            ))}
          </main>
        )}
      </div>
    </section>
  );
}
