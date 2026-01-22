import { useEffect, useState } from "react";
import { adminCounts } from "../services/api.js";

export default function AdminAnalyticsTab() {
  const [data, setData] = useState(null);
  const [state, setState] = useState({ loading: true, error: "" });

  useEffect(() => {
    (async () => {
      setState({ loading: true, error: "" });
      try {
        const d = await adminCounts();
        setData(d);
        setState({ loading: false, error: "" });
      } catch (e) {
        setState({ loading: false, error: e?.message || "Failed" });
      }
    })();
  }, []);

  if (state.loading) return <p className="badge">Loading analytics…</p>;
  if (state.error) return <p className="badge" style={{ color: "#c00" }}>{state.error}</p>;

  const cards = [
    { label: "Users", value: data?.users ?? 0 },
    { label: "Events (Total)", value: data?.eventsTotal ?? 0 },
    { label: "Approved", value: data?.eventsApproved ?? 0 },
    { label: "Pending", value: data?.eventsPending ?? 0 },
    { label: "RSVPs", value: data?.rsvpsTotal ?? 0 },
  ];

  return (
    <article className="card" style={{ padding: 12 }}>
      <h3 className="m-0" style={{ marginBottom: 8 }}>Analytics</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {cards.map(c => (
          <div key={c.label} className="card" style={{ padding: 16, textAlign: "center" }}>
            <div className="card__meta">{c.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{c.value}</div>
          </div>
        ))}
      </div>
    </article>
  );
}
