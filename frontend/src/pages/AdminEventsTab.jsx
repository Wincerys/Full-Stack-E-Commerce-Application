import { useEffect, useState } from "react";
import { adminListEvents, adminApproveEvent, adminRejectEvent, adminDeleteEvent } from "../services/api.js";

export default function AdminEventsTab() {
  const [status, setStatus] = useState("PENDING"); // filter
  const [query, setQuery] = useState("");
  const [events, setEvents] = useState([]);
  const [state, setState] = useState({ loading: true, error: "" });

  async function load() {
    setState({ loading: true, error: "" });
    try {
      const data = await adminListEvents({ status, query });
      setEvents(data);
      setState({ loading: false, error: "" });
    } catch (e) {
      setState({ loading: false, error: e?.message || "Failed" });
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  return (
    <article className="card" style={{ padding: 12 }}>
      <h3 className="m-0" style={{ marginBottom: 8 }}>Events Moderation</h3>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option>PENDING</option>
          <option>APPROVED</option>
          <option>REJECTED</option>
          <option>ALL</option>
        </select>
        <input className="input" placeholder="Search title/category…" value={query} onChange={(e)=>setQuery(e.target.value)} />
        <button className="btn" onClick={load}>Search</button>
      </div>
      {state.loading && <p className="badge">Loading events…</p>}
      {state.error && <p className="badge" style={{ color: "#c00" }}>{state.error}</p>}
      {!state.loading && events.length === 0 && <p className="card__meta">No events.</p>}
      <div style={{ display: "grid", gap: 8 }}>
        {events.map(ev => (
          <div key={ev.id} className="card" style={{ padding: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
              <div>
                <div><strong>{ev.title}</strong></div>
                <div className="card__meta">{ev.category} · {new Date(ev.startTime).toLocaleString()}</div>
                <div style={{ marginTop: 6 }}><span className="badge">{ev.approvalStatus}</span>{ev.rejectionReason ? <span className="badge badge--warm" style={{ marginLeft: 6 }}>Reason: {ev.rejectionReason}</span> : null}</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {ev.approvalStatus !== "APPROVED" && <button className="btn btn--ok" onClick={async () => { await adminApproveEvent(ev.id); await load(); }}>Approve</button>}
                {ev.approvalStatus !== "REJECTED" && <button className="btn btn--warm" onClick={async () => {
                  const reason = prompt("Reason for rejection (optional):") || "";
                  await adminRejectEvent(ev.id, reason);
                  await load();
                }}>Reject</button>}
                <button className="btn btn--danger" onClick={async () => {
                  const confirmText = prompt(`Type the event title to confirm delete:\n${ev.title}`);
                  if (confirmText === ev.title) {
                    await adminDeleteEvent(ev.id);
                    await load();
                  }
                }}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
