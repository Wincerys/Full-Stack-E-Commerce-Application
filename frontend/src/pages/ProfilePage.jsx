import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyProfile,
  updateMyProfile,
  getMyRsvps,
  getEvents,
  getMyEvents,
  isAuthed,
} from "../services/api";
import EventCard from "../components/EventCard.jsx";
import EmptyState from "../components/EmptyState.jsx";
import BadgeSection from "../components/BadgeSection.jsx";

export default function ProfilePage() {
  const qc = useQueryClient();
  const authed = isAuthed();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "" });

  // If not logged in, show friendly prompt
  if (!authed) {
    return (
      <section className="container">
        <article className="card" style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2 className="m-0" style={{ marginBottom: 12 }}>Profile</h2>
          <p className="card__meta">
            Please <Link to="/login">login</Link> to view your profile.
          </p>
        </article>
      </section>
    );
  }

  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery({
    queryKey: ["profile"],
    queryFn: getMyProfile,
  });

  const {
    data: myRsvps = [],
    isLoading: rsvpLoading,
  } = useQuery({
    queryKey: ["my-rsvps"],
    queryFn: getMyRsvps,
  });

  const {
    data: allEvents = [],
    isLoading: eventsLoading,
  } = useQuery({
    queryKey: ["events"],
    queryFn: () => getEvents(),
  });

  const {
    data: myEvents = [],
    isLoading: myEventsLoading,
  } = useQuery({
    queryKey: ["my-events"],
    queryFn: () => getMyEvents(0, 5),
    enabled: profile?.role === "ORGANIZER",
  });

  const updateMutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      setIsEditing(false);
    },
  });

  const handleEdit = () => {
    setIsEditing(true);
    setEditForm({ name: profile?.name || "" });
  };

  const handleSave = () => {
    updateMutation.mutate(editForm);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm({ name: profile?.name || "" });
  };

  if (profileLoading) {
    return (
      <section className="container">
        <p className="badge">Loading profile…</p>
      </section>
    );
  }

  if (profileError) {
    return (
      <section className="container">
        <p className="badge" style={{ color: "#c00" }}>
          Failed to load profile.
        </p>
      </section>
    );
  }

  const isStudent = profile?.role === "STUDENT";
  const isOrganizer = profile?.role === "ORGANIZER" || profile?.role === "ORGANISER";
  const rsvpMap = new Map(myRsvps.map((r) => [r.eventId, r]));
  const myRsvpEvents = allEvents.filter((e) => rsvpMap.has(e.id));

  return (
    <section className="container">
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* Profile Header */}
        <article className="card" style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
            }}
          >
            <div style={{ flex: 1 }}>
              <h1 className="m-0">Profile</h1>
              <div className="card__meta" style={{ marginTop: 8 }}>
                Account Details
              </div>
            </div>
            {!isEditing && (
              <button className="btn" onClick={handleEdit}>
                Edit Profile
              </button>
            )}
          </div>

          <div style={{ marginTop: 16 }}>
            {isEditing ? (
              <div style={{ display: "grid", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 14, color: "#444" }}>Name</span>
                  <input
                    className="input"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    placeholder="Your name"
                  />
                </label>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn--primary"
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? "Saving…" : "Save"}
                  </button>
                  <button className="btn" onClick={handleCancel}>
                    Cancel
                  </button>
                </div>

                {updateMutation.isError && (
                  <div style={{ color: "#c00", fontSize: 14 }}>
                    {updateMutation.error?.message || "Failed to update profile"}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <strong>Name:</strong> {profile?.name || "No name set"}
                </div>
                <div>
                  <strong>Email:</strong> {profile?.email}
                </div>
                <div>
                  <strong>Role:</strong>{" "}
                  <span
                    className={`badge ${
                      isStudent ? "badge--ok" : "badge--warm"
                    }`}
                  >
                    {profile?.role}
                  </span>
                </div>
              </div>
            )}
          </div>
        </article>

        {/* Badge Section */}
        <article className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <h3 className="m-0">🏆 Your Badges</h3>
            <Link to="/badges" className="btn btn--xs">
              View All Badges
            </Link>
          </div>
          <BadgeSection />
        </article>

        {/* Role-specific content */}
        {isStudent ? (
          /* Student View: Show RSVPs */
          <article className="card">
            <h2 className="m-0" style={{ marginBottom: 12 }}>
              My RSVPs
            </h2>
            {rsvpLoading || eventsLoading ? (
              <p className="badge">Loading RSVPs…</p>
            ) : myRsvpEvents.length === 0 ? (
              <EmptyState>
                <p>
                  You have no RSVPs yet. Head to the{" "}
                  <Link to="/" style={{ color: "var(--brand)" }}>
                    Events
                  </Link>{" "}
                  page to RSVP to events.
                </p>
              </EmptyState>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {myRsvpEvents.map((event) => {
                  const rsvp = rsvpMap.get(event.id);
                  return (
                    <EventCard key={event.id} event={event}>
                      <div className="card__meta" style={{ marginTop: 6 }}>
                        <span
                          className={`badge ${
                            rsvp.status === "GOING" ? "badge--ok" : "badge--warm"
                          }`}
                        >
                          {rsvp.status === "GOING" ? "Going" : "Interested"}
                        </span>
                        <span style={{ marginLeft: 8, color: "var(--muted)" }}>
                          RSVP'd on{" "}
                          {new Date(rsvp.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </EventCard>
                  );
                })}
              </div>
            )}
          </article>
        ) : isOrganizer ? (
          /* Organizer View: Show created events + dashboard link */
          <div style={{ display: "grid", gap: 16 }}>
            <article className="card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <h2 className="m-0">My Events</h2>
                <Link to="/organiser-dashboard" className="btn btn--primary">
                  Organizer Dashboard
                </Link>
              </div>

              {myEventsLoading ? (
                <p className="badge">Loading events…</p>
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
                <div style={{ display: "grid", gap: 12 }}>
                  {myEvents.map((event) => (
                    <EventCard key={event.id} event={event}>
                      <div className="card__meta" style={{ marginTop: 6 }}>
                        <span className="badge">
                          Organized by you
                        </span>
                      </div>
                    </EventCard>
                  ))}
                  {myEvents.length === 5 && (
                    <div style={{ textAlign: "center", marginTop: 8 }}>
                      <Link to="/organiser-dashboard" className="btn">
                        View All Events
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </article>

            <article className="card">
              <h3 className="m-0" style={{ marginBottom: 8 }}>
                Organizer Tools
              </h3>
              <div style={{ display: "grid", gap: 8 }}>
                <Link to="/create" className="btn">
                  Create New Event
                </Link>
                <Link to="/organiser-dashboard" className="btn">
                  View Full Dashboard
                </Link>
              </div>
            </article>
          </div>
        ) : null}
      </div>
    </section>
  );
}