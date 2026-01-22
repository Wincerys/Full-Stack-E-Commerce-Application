import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getEvents, getMyRsvps, isAuthed } from "../services/api";
import EventCard from "../components/EventCard.jsx";
import EmptyState from "../components/EmptyState.jsx";

export default function MyRsvpsPage() {
  const authed = isAuthed();

  if (!authed) {
    return (
      <section className="container">
        <article className="card" style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2 className="m-0" style={{ marginBottom: 12 }}>My RSVPs</h2>
          <p className="card__meta">
            Please <Link to="/login">login</Link> to display your RSVP’d events.
          </p>
        </article>
      </section>
    );
  }

  const {
    data: events = [],
    isLoading: eLoading,
    error: eErr,
  } = useQuery({ queryKey: ["events"], queryFn: () => getEvents() });

  const {
    data: myRsvps = [],
    isLoading: rLoading,
    error: rErr,
  } = useQuery({
    queryKey: ["my-rsvps"],
    queryFn: getMyRsvps,
    enabled: authed,
  });

  if (eLoading || rLoading) {
    return (
      <section className="container">
        <p className="badge">Loading your RSVPs…</p>
      </section>
    );
  }
  if (eErr || rErr) {
    return (
      <section className="container">
        <p className="badge">Failed to load.</p>
      </section>
    );
  }

  const rsvpMap = new Map(myRsvps.map((r) => [r.eventId, r.status]));
  const myEvents = events.filter((e) => rsvpMap.has(e.id));

  const now = new Date();
  const upcoming = myEvents.filter((ev) => new Date(ev.startTime) >= now);
  const past = myEvents.filter((ev) => new Date(ev.startTime) < now);

  const renderSection = (title, evs) => (
    <section style={{ marginTop: 20 }}>
      <h3 className="m-0" style={{ marginBottom: 12 }}>{title}</h3>
      {evs.length === 0 ? (
        <p className="card__meta muted">No {title.toLowerCase()} events.</p>
      ) : (
        <main className="feed">
          {evs.map((ev) => (
            <EventCard key={ev.id} event={ev}>
              <div className="card__meta" style={{ marginTop: 6 }}>
                <span
                  className={`badge ${
                    rsvpMap.get(ev.id) === "GOING" ? "badge--ok" : "badge--warm"
                  }`}
                >
                  {rsvpMap.get(ev.id) === "GOING" ? "Going" : "Interested"}
                </span>
              </div>
            </EventCard>
          ))}
        </main>
      )}
    </section>
  );

  return (
    <section className="container">
      <h2 className="m-0" style={{ marginBottom: 12 }}>My RSVPs</h2>
      {myEvents.length === 0 ? (
        <EmptyState>
          <p>
            You have no RSVPs yet. Head back to the{" "}
            <Link to="/" style={{ color: "var(--brand)" }}>Events</Link> page to RSVP.
          </p>
        </EmptyState>
      ) : (
        <>
          {renderSection("Upcoming", upcoming)}
          {renderSection("Past", past)}
        </>
      )}
    </section>
  );
}
