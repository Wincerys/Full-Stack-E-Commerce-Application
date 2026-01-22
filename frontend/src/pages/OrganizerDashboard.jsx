import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  getMyEvents,
  getEventRsvps,
  getMyProfile,
  isAuthed,
} from "../services/api";
import EmptyState from "../components/EmptyState.jsx";

export default function OrganizerDashboard() {
  const authed = isAuthed();
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Check if user is authenticated and is an organizer
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: getMyProfile,
    enabled: authed,
  });

  const {
    data: myEvents = [],
    isLoading: eventsLoading,
    error: eventsError,
  } = useQuery({
    queryKey: ["my-events", page],
    queryFn: () => getMyEvents(page, pageSize),
    enabled: authed && profile?.role !== "STUDENT",
  });

  const {
    data: eventRsvps = [],
    isLoading: rsvpsLoading,
    error: rsvpsError,
  } = useQuery({
    queryKey: ["event-rsvps", selectedEventId],
    queryFn: () => getEventRsvps(selectedEventId),
    enabled: !!selectedEventId,
  });

  if (!authed) {
    return (
      <section className="container">
        <article className="card" style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2 className="m-0" style={{ marginBottom: 12 }}>
            Organizer Dashboard
          </h2>
          <p className="card__meta">
            Please <Link to="/login">login</Link> to access the organizer dashboard.
          </p>
        </article>
      </section>
    );
  }

  if (profile && profile.role === "STUDENT") {
    return (
      <section className="container">
        <article className="card" style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2 className="m-0" style={{ marginBottom: 12 }}>
            Organizer Dashboard
          </h2>
          <p className="card__meta">
            This dashboard is only available for event organizers. Students can view their
            RSVPs on their <Link to="/profile">profile page</Link>.
          </p>
        </article>
      </section>
    );
  }

  const selectedEvent = myEvents.find(e => e.id === selectedEventId);
  const goingCount = eventRsvps.filter(r => r.status === "GOING").length;
  const interestedCount = eventRsvps.filter(r => r.status === "INTERESTED").length;

  return (
    <section className="container">
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 16 }}>
          <Link to="/profile" style={{ fontSize: 14 }}>
            ← Back to profile
          </Link>
          <h1 style={{ marginTop: 8, marginBottom: 4 }}>Organizer Dashboard</h1>
          <p className="card__meta">
            Manage your events and view RSVP details
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="organizer-dashboard-grid">
          {/* Events List */}
          <article className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 className="m-0">My Events</h2>
              <Link to="/create" className="btn btn--primary">
                Create New
              </Link>
            </div>

            {eventsLoading ? (
              <p className="badge">Loading events…</p>
            ) : eventsError ? (
              <p className="badge" style={{ color: "#c00" }}>
                Failed to load events
              </p>
            ) : myEvents.length === 0 ? (
              <EmptyState>
                <p>
                  You haven't created any events yet.{" "}
                  <Link to="/create" style={{ color: "var(--brand)" }}>
                    Create your first event
                  </Link>
                  .
                </p>
              </EmptyState>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {myEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`card ${selectedEventId === event.id ? "card--selected" : ""}`}
                    style={{
                      padding: 12,
                      cursor: "pointer",
                      border: selectedEventId === event.id ? "2px solid var(--brand)" : "1px solid var(--border)",
                      backgroundColor: selectedEventId === event.id ? "#f8faff" : "var(--white)",
                    }}
                    onClick={() => setSelectedEventId(event.id)}
                  >
                    <h4 className="m-0" style={{ marginBottom: 4 }}>
                      {event.title}
                    </h4>
                    <div className="card__meta" style={{ fontSize: 12 }}>
                      {new Date(event.startTime).toLocaleDateString()} •{" "}
                      {event.location} • {event.category}
                    </div>
                    <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
                      <Link
                        to={`/events/${event.id}`}
                        className="btn btn--xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View
                      </Link>
                      <button
                        className="btn btn--xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEventId(event.id);
                        }}
                      >
                        View RSVPs
                      </button>
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                {myEvents.length === pageSize && (
                  <div style={{ textAlign: "center", marginTop: 12 }}>
                    <button 
                      className="btn"
                      onClick={() => setPage(p => p + 1)}
                    >
                      Load More
                    </button>
                  </div>
                )}
              </div>
            )}
          </article>

          {/* RSVP Details */}
          <article className="card">
            <h2 className="m-0" style={{ marginBottom: 12 }}>
              RSVP Details
            </h2>

            {!selectedEventId ? (
              <EmptyState>
                <p>Select an event to view RSVPs</p>
              </EmptyState>
            ) : (
              <>
                {/* Event Summary */}
                <div style={{ marginBottom: 16, padding: 12, backgroundColor: "#f8faff", borderRadius: 8 }}>
                  <h3 className="m-0" style={{ marginBottom: 4 }}>
                    {selectedEvent?.title}
                  </h3>
                  <div className="card__meta">
                    {selectedEvent && new Date(selectedEvent.startTime).toLocaleString()} •{" "}
                    {selectedEvent?.location}
                  </div>
                  <div style={{ marginTop: 8, display: "flex", gap: 12 }}>
                    <span className="badge badge--ok">
                      {goingCount} Going
                    </span>
                    <span className="badge badge--warm">
                      {interestedCount} Interested
                    </span>
                    <span className="badge">
                      {eventRsvps.length} Total RSVPs
                    </span>
                  </div>
                </div>

                {/* RSVP List */}
                {rsvpsLoading ? (
                  <p className="badge">Loading RSVPs…</p>
                ) : rsvpsError ? (
                  <p className="badge" style={{ color: "#c00" }}>
                    Failed to load RSVPs
                  </p>
                ) : eventRsvps.length === 0 ? (
                  <EmptyState>
                    <p>No RSVPs yet for this event</p>
                  </EmptyState>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {eventRsvps
                      .sort((a, b) => {
                        // Sort by status (Going first), then by name
                        if (a.status !== b.status) {
                          return a.status === "GOING" ? -1 : 1;
                        }
                        return (a.user.name || a.user.email).localeCompare(
                          b.user.name || b.user.email
                        );
                      })
                      .map((rsvp) => (
                        <div
                          key={rsvp.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: 8,
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            backgroundColor: "var(--white)",
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600 }}>
                              {rsvp.user.name || rsvp.user.email}
                            </div>
                            <div className="card__meta" style={{ fontSize: 12 }}>
                              {rsvp.user.email} •{" "}
                              RSVP'd {new Date(rsvp.createdAt).toLocaleDateString()}
                              {rsvp.updatedAt !== rsvp.createdAt && (
                                <span> • Updated {new Date(rsvp.updatedAt).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                          <span
                            className={`badge ${
                              rsvp.status === "GOING" ? "badge--ok" : "badge--warm"
                            }`}
                          >
                            {rsvp.status === "GOING" ? "Going" : "Interested"}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}