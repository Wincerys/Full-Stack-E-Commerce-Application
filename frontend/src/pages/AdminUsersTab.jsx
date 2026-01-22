import { useEffect, useState } from "react";
import { adminListUsers, adminSetActive, adminSetBan, adminSetRole } from "../services/api.js";

export default function AdminUsersTab() {
  const [users, setUsers] = useState([]);
  const [state, setState] = useState({ loading: true, error: "" });

  async function load() {
    setState({ loading: true, error: "" });
    try {
      const data = await adminListUsers();
      setUsers(data);
      setState({ loading: false, error: "" });
    } catch (e) {
      setState({ loading: false, error: e?.message || "Failed" });
    }
  }

  useEffect(() => { load(); }, []);

  async function onRole(id, role) {
    await adminSetRole(id, role);
    await load();
  }
  async function onActive(id, active) {
    await adminSetActive(id, active);
    await load();
  }
  async function onBan(id, banned) {
    await adminSetBan(id, banned);
    await load();
  }

  if (state.loading) return <p className="badge">Loading users…</p>;
  if (state.error) return <p className="badge" style={{ color: "#c00" }}>{state.error}</p>;

  return (
    <article className="card" style={{ padding: 12 }}>
      <h3 className="m-0" style={{ marginBottom: 8 }}>Users</h3>
      <div style={{ display: "grid", gap: 8 }}>
        {users.map(u => (
          <div key={u.id} className="card" style={{ padding: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
              <div>
                <div><strong>{u.name || u.email}</strong></div>
                <div className="card__meta">{u.email}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <span className={`badge ${u.active ? "badge--ok" : "badge--warm"}`}>{u.active ? "Active" : "Inactive"}</span>
                  <span className={`badge ${u.banned ? "badge--danger" : ""}`}>{u.banned ? "Banned" : "OK"}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <select className="input" value={u.role} onChange={(e) => onRole(u.id, e.target.value)}>
                  <option value="STUDENT">STUDENT</option>
                  <option value="ORGANIZER">ORGANIZER</option>
                  <option value="ORGANISER">ORGANISER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
                <button className={`btn ${u.active ? "btn--danger" : ""}`} onClick={() => onActive(u.id, !u.active)}>
                  {u.active ? "Deactivate" : "Activate"}
                </button>
                <button className={`btn ${u.banned ? "" : "btn--danger"}`} onClick={() => onBan(u.id, !u.banned)}>
                  {u.banned ? "Unban" : "Ban"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
