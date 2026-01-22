import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await login(form);
      authLogin(); // Update auth context
      navigate("/"); // Navigate instead of replace
    } catch (e) {
      setErr(e.message || "Login failed");
    }
  };

  return (
    <section className="container">
      <article className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
        <h1 className="m-0">Login</h1>
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Email</span>
            <input className="input" name="email" type="email" value={form.email} onChange={onChange} required />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Password</span>
            <input className="input" name="password" type="password" value={form.password} onChange={onChange} required />
          </label>
          {err && <div style={{ color: "#c00", fontSize: 14 }}>{err}</div>}
          <button className="btn btn--primary" type="submit">Login</button>
          <div className="card__meta">No account? <Link to="/register">Register</Link></div>
        </form>
      </article>
    </section>
  );
}