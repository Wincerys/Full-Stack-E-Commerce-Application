import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getEvents, listCategories, getMyProfile, isAuthed } from "../services/api";
import EventCard from "../components/EventCard.jsx";
import EmptyState from "../components/EmptyState.jsx";
import MonthCalendar from "../components/MonthCalendar.jsx";
import WeekCalendar from "../components/WeekCalendar.jsx";

function useDebouncedValue(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function EventsPage() {
  const [filters, setFilters] = useState({ q: "", category: "" });
  const [view, setView] = useState("list"); // list | month | week
  const debouncedFilters = useDebouncedValue(filters, 300);
  const authed = isAuthed();

  // Get user profile to check role
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: getMyProfile,
    enabled: authed,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(),
  });

  // Fetch all events (we'll split into upcoming/past client-side)
  const {
    data: events = [],
    isFetching,
    error,
  } = useQuery({
    queryKey: ["events", debouncedFilters],
    queryFn: () => getEvents({ q: debouncedFilters.q, category: debouncedFilters.category }),
    keepPreviousData: true,
  });

  const onChange = (e) =>
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value }));

  // === Split into upcoming / past (local timezone) ===
  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const u = [];
    const p = [];
    for (const ev of events) {
      const dt = new Date(ev.startTime);
      if (dt >= now) u.push(ev);
      else p.push(ev);
    }
    u.sort((a, b) => new Date(a.startTime) - new Date(b.startTime)); // soonest first
    p.sort((a, b) => new Date(b.startTime) - new Date(a.startTime)); // most recent past first
    return { upcoming: u, past: p };
  }, [events]);

  const canCreateEvents = authed && profile && profile.role !== "STUDENT";

  return (
    <>
      <section className="container">
        <form className="toolbar" onSubmit={(e) => e.preventDefault()}>
          <input
            className="input grow"
            name="q"
            value={filters.q}
            onChange={onChange}
            placeholder="Search events (title, description, location)…"
          />
          <select
            className="select"
            name="category"
            value={filters.category}
            onChange={onChange}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className={`btn ${view === "list" ? "btn--primary" : ""}`}
              onClick={() => setView("list")}
            >
              List
            </button>
            <button
              type="button"
              className={`btn ${view === "month" ? "btn--primary" : ""}`}
              onClick={() => setView("month")}
            >
              Calendar
            </button>
            <button
              type="button"
              className={`btn ${view === "week" ? "btn--primary" : ""}`}
              onClick={() => setView("week")}
            >
              Week
            </button>
          </div>
          {canCreateEvents && (
            <Link to="/create" className="btn btn--primary">
              + Create Event
            </Link>
          )}
          {isFetching && <span className="badge">Loading…</span>}
        </form>
      </section>

      {error && (
        <section className="container">
          <p className="badge" style={{ color: "#c00" }}>
            {error.message || "Failed to load events"}
          </p>
        </section>
      )}

      {!error && view === "list" && (
        <section className="container" style={{ display: "grid", gap: 18 }}>
          {/* UPCOMING */}
          <div>
            <h2 className="m-0" style={{ marginBottom: 8 }}>Upcoming</h2>
            {upcoming.length === 0 ? (
              <EmptyState>No upcoming events.</EmptyState>
            ) : (
              <main className="feed">
                {upcoming.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </main>
            )}
          </div>

          {/* PAST */}
          <div>
            <h2 className="m-0" style={{ marginBottom: 8, color: "var(--muted)" }}>
              Past
            </h2>
            {past.length === 0 ? (
              <EmptyState>No past events.</EmptyState>
            ) : (
              <main className="feed">
                {past.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </main>
            )}
          </div>
        </section>
      )}

      {!error && view === "month" && (
        <MonthCalendar events={events} initialMonth={new Date()} />
      )}
      {!error && view === "week" && (
        <WeekCalendar events={events} initialDate={new Date()} />
      )}
    </>
  );
}