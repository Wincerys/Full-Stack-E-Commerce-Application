import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function OrganiserDash() {
  const navigate = useNavigate();

  // Check role on page load
  useEffect(() => {
    const role = (localStorage.getItem("role") || "").toUpperCase();
    if (role !== "ORGANIZER" && role !== "ORGANISER") {
      navigate("/login"); // redirect non-organizers to login
    }
  }, [navigate]);

  const handleNavigation = (path) => navigate(path);

  return (
    <section className="container">
      <article className="card" style={{ maxWidth: 600, margin: "0 auto", padding: 20 }}>
  <h1 className="m-0">Organizer Dashboard</h1>
        <p>Welcome, {localStorage.getItem("name")}! Manage your events here.</p>

        <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
          <button className="btn btn--primary" onClick={() => handleNavigation("/events/create")}>
            + Create Event
          </button>
          <button className="btn" onClick={() => handleNavigation("/events/myevents")}>
            My Events (Edit/Delete)
          </button>
          <button className="btn" onClick={() => handleNavigation("/events/uploadphotos")}>
            Upload Photos
          </button>
          <button className="btn" onClick={() => handleNavigation("/events/rsvps")}>
            View RSVPs / Export CSV
          </button>
          <button className="btn" onClick={() => handleNavigation("/events/feedback")}>
            Feedback & Ratings
          </button>
        </div>
      </article>
    </section>
  );
}
