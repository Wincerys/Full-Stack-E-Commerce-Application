import { useEffect, useState } from "react";
import AdminUsersTab from "./AdminUsersTab.jsx";
import AdminEventsTab from "./AdminEventsTab.jsx";
import AdminAnalyticsTab from "./AdminAnalyticsTab.jsx";
import { isAuthed } from "../services/api.js";
import { getAuthRole } from "../services/api.js";
import { useNavigate } from "react-router-dom";

export default function AdminDashboardPage() {
  const nav = useNavigate();
  const [tab, setTab] = useState("users");
  useEffect(() => {
    const authed = isAuthed();
    const role = getAuthRole();
    if (!authed || role !== "ADMIN") {
      nav("/admin/login");
    }
  }, [nav]);

  return (
    <section className="container" style={{ padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 className="m-0">Admin Dashboard</h2>
        <nav style={{ display: "flex", gap: 8 }}>
          <button className={`btn ${tab === "users" ? "btn--primary" : ""}`} onClick={() => setTab("users")}>Users</button>
          <button className={`btn ${tab === "events" ? "btn--primary" : ""}`} onClick={() => setTab("events")}>Events</button>
          <button className={`btn ${tab === "analytics" ? "btn--primary" : ""}`} onClick={() => setTab("analytics")}>Analytics</button>
        </nav>
      </header>
      {tab === "users" && <AdminUsersTab />}
      {tab === "events" && <AdminEventsTab />}
      {tab === "analytics" && <AdminAnalyticsTab />}
    </section>
  );
}
